import { NextRequest, NextResponse } from 'next/server'
import { statementArraySchema } from '@/lib/schemas'
import { extractDocumentText } from '@/lib/document/extract-text'
import { extractStructuredData } from '@/lib/ai/gemini'
import { getFileHash, getCachedResult, setCachedResult } from '@/lib/cache'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const statementType = formData.get('statementType') as string // 'bank' or 'ledger'

    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })
    }

    if (!statementType || !['bank', 'ledger'].includes(statementType)) {
      return NextResponse.json({ error: 'Geçersiz ekstre tipi' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY || ''
    if (!apiKey) {
      return NextResponse.json({ error: 'API anahtarı bulunamadı. Lütfen GEMINI_API_KEY ortam değişkenini ayarlayın.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Hash check for cache
    const hash = getFileHash(buffer)
    const cached = getCachedResult(hash)
    if (cached) {
      console.log('Returning cached result for', hash)
      return NextResponse.json({ transactions: cached })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    
    // Extract text
    const extracted = await extractDocumentText(buffer, ext)
    if (extracted.error) {
      if (extracted.requiresOCR) {
        return NextResponse.json({ requiresOCR: true, error: extracted.error }, { status: 422 })
      }
      return NextResponse.json({ error: extracted.error }, { status: 422 })
    }

    const ledgerPrompt = `
      Sen uzman bir muhasebeci ve veri çıkarıcı yapay zekasın. 
      Sana bir "Cari Hesap Ekstresi" (Ledger/Account Statement) metin verisi veriyorum.
      Bu metindeki işlemleri (satırları) analiz et ve JSON array olarak döndür.
      
      ÇOK ÖNEMLİ: Tutarları metinde nasıl görüyorsan (nokta ve virgülleriyle beraber) TAM OLARAK AYNI formatta (string) "debit_raw" ve "credit_raw" alanlarına yaz. Dönüştürme/hesaplama yapma. Boşsa veya çizgi varsa "0" yaz.
      
      Tarih formatını YYYY-MM-DD olarak ver.
      Belge numarası, fiş türü ve açıklamayı çıkar.
    `

    const bankPrompt = `
      Sen uzman bir banka hesap ekstresi analizörü yapay zekasın. 
      Sana bir "Banka Hesap Ekstresi" (Bank Statement) metin verisi veriyorum.
      Bu metindeki işlemleri (hesap hareketleri) analiz et ve JSON array olarak döndür.
      
      ÇOK ÖNEMLİ: Tutarları metinde nasıl görüyorsan (nokta ve virgülleriyle beraber) TAM OLARAK AYNI formatta (string) "debit_raw" ve "credit_raw" alanlarına yaz. Dönüştürme/hesaplama yapma. Boşsa veya çizgi varsa "0" yaz.
      
      Eğer hesaba para GİRDİYSE (Yatan/Alacak/Credit) "credit_raw" alanına, hesaptan para ÇIKTIYSA (Çekilen/Borç/Debit) "debit_raw" alanına yaz (diğeri "0" olsun).
      
      Tarih formatını YYYY-MM-DD olarak ver. Belge/dekont numarasını (varsa), işlem türünü ve tüm açıklamayı çıkar.
    `

    const promptText = statementType === 'bank' ? bankPrompt : ledgerPrompt

    // Call Gemini
    const rawTransactions = await extractStructuredData(extracted.text, promptText, apiKey)

    // Validate with Zod
    const validationResult = statementArraySchema.safeParse(rawTransactions)
    if (!validationResult.success) {
      console.error('Zod validation failed:', validationResult.error)
      return NextResponse.json({ 
        error: 'Yapay zeka geçerli bir format döndüremedi.',
        details: validationResult.error.issues
      }, { status: 422 })
    }

    const validatedData = validationResult.data

    function parseAmount(raw: string | number | null | undefined): number {
      if (!raw) return 0;
      if (typeof raw === 'number') return Math.round(raw * 100);
      let str = raw.toString().trim();
      const isNegative = str.startsWith('-');
      if (isNegative) {
        str = str.replace('-', '');
      }
      if (str === '-' || str === '') return 0;
      
      const dotCount = (str.match(/\./g) || []).length;
      const commaCount = (str.match(/,/g) || []).length;
      const lastDot = str.lastIndexOf('.');
      const lastComma = str.lastIndexOf(',');

      if (commaCount === 1 && dotCount >= 1 && lastComma > lastDot) {
        str = str.replace(/\./g, '').replace(',', '.');
      } else if (dotCount === 1 && commaCount >= 1 && lastDot > lastComma) {
        str = str.replace(/,/g, '');
      } else if (commaCount === 1 && dotCount === 0) {
        if (str.length - lastComma <= 3) {
          str = str.replace(',', '.');
        } else {
          str = str.replace(',', '');
        }
      } else if (dotCount >= 1 && commaCount === 0) {
        if (dotCount > 1) {
          str = str.replace(/\./g, '');
        } else {
          if (str.length - lastDot === 4) {
            str = str.replace(/\./g, '');
          }
        }
      }

      str = str.replace(/\s/g, '');
      const num = parseFloat(str);
      if (isNaN(num)) return 0;
      const cents = Math.round(num * 100);
      return isNegative ? -cents : cents;
    }

    const transactions = validatedData.map((t: any) => {
      let debit = 0;
      let credit = 0;
      
      if ('debit_raw' in t) debit = parseAmount(t.debit_raw);
      if ('credit_raw' in t) credit = parseAmount(t.credit_raw);

      return {
        ...t,
        debit,
        credit
      }
    })

    // Cache the result
    setCachedResult(hash, transactions)

    return NextResponse.json({ transactions })
  } catch (error: any) {
    console.error('Statement Parsing Error:', error)
    if (error.status === 429 || (error.message && error.message.includes('429'))) {
      return NextResponse.json({ error: 'Yapay zeka kullanım limiti aşıldı. Lütfen 1 dakika bekleyip tekrar deneyin.' }, { status: 429 })
    }
    return NextResponse.json(
      { error: `Yapay Zeka veya Sistem Hatası: ${error.message || 'Bilinmeyen hata'}` },
      { status: 500 }
    )
  }
}
