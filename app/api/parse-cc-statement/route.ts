import { NextRequest, NextResponse } from 'next/server'
import { ccStatementSchema } from '@/lib/schemas'
import { extractDocumentText } from '@/lib/document/extract-text'
import { extractStructuredData } from '@/lib/ai/gemini'
import { getFileHash, getCachedResult, setCachedResult } from '@/lib/cache'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('file') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY || ''
    if (!apiKey) {
      return NextResponse.json({ error: 'API anahtarı bulunamadı. Lütfen GEMINI_API_KEY ortam değişkenini ayarlayın.' }, { status: 400 })
    }

    const ccPrompt = `
      Sen uzman bir kredi kartı hesap ekstresi analizörü yapay zekasın. 
      Sana bir "Kredi Kartı Hesap Ekstresi" metin verisi veriyorum.
      
      GÖREVİN:
      1. Ekstreden Kart Toplam Limitini (card_limit) ve Ekstre Dönem Borcunu (statement_debt) tespit edebiliyorsan TL cinsinden yaz (bulamazsan null ver).
      2. Ekstredaki tüm kart harcamalarını (alışverişleri) ve ödemeleri/iadeleri çıkar.
      
      ÖNEMLİ KURALLAR:
      - Tutarları metinde nasıl görüyorsan (nokta ve virgülleriyle beraber) TAM OLARAK AYNI formatta (string) "amount_raw" alanına yaz.
      - HARCAMA/ALIŞVERİŞ ise tutarı POZİTİF bir değer yap (örn: "250,50").
      - ÖDEME/İADE/ALACAK ise tutarı NEGATİF yap (örn: "-1.500,00").
      - Tarih formatını her zaman YYYY-MM-DD olarak ver.
    `

    let allTransactions: any[] = []
    let detectedLimit: number | null = null
    let detectedDebt: number | null = null

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Hash check
      const hash = getFileHash(buffer)
      const cached = getCachedResult(hash)
      if (cached) {
        console.log('Returning cached CC result for', hash)
        allTransactions = [...allTransactions, ...cached.transactions]
        if (cached.limit && !detectedLimit) detectedLimit = cached.limit
        if (cached.debt && !detectedDebt) detectedDebt = cached.debt
        continue
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const extracted = await extractDocumentText(buffer, ext)
      
      if (extracted.error) {
        if (extracted.requiresOCR) {
          return NextResponse.json({ requiresOCR: true, error: extracted.error }, { status: 422 })
        }
        return NextResponse.json({ error: extracted.error }, { status: 422 })
      }

      const parsedData = await extractStructuredData(extracted.text, ccPrompt, apiKey)
      
      // Validate
      const validationResult = ccStatementSchema.safeParse(parsedData)
      if (!validationResult.success) {
        console.error('Zod validation failed for CC:', validationResult.error)
        return NextResponse.json({ 
          error: `${file.name} dosyasının verileri çözümlenirken format hatası oluştu.`,
          details: validationResult.error.issues
        }, { status: 422 })
      }

      const validatedData = validationResult.data
      const rawTransactions = validatedData.transactions

      if (validatedData.card_limit && !detectedLimit) {
        detectedLimit = parseFloat(validatedData.card_limit)
      }
      if (validatedData.statement_debt && !detectedDebt) {
        detectedDebt = parseFloat(validatedData.statement_debt)
      }

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

      const transactions = rawTransactions.map((t: any) => {
        const amount = parseAmount(t.amount_raw);
        return {
          transaction_date: t.date,
          description: t.description,
          amount
        }
      })

      // Cache this file's result
      setCachedResult(hash, {
        transactions,
        limit: detectedLimit,
        debt: detectedDebt
      })

      allTransactions = [...allTransactions, ...transactions]
    }

    // Sort all transactions by date descending
    allTransactions.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())

    return NextResponse.json({ 
      transactions: allTransactions,
      extracted_limit: detectedLimit,
      extracted_debt: detectedDebt
    })
  } catch (error: any) {
    console.error('PDF CC Parsing Error:', error)
    if (error.status === 429 || (error.message && error.message.includes('429'))) {
      return NextResponse.json({ error: 'Yapay zeka kullanım limiti aşıldı. Lütfen 1 dakika bekleyip tekrar deneyin.' }, { status: 429 })
    }
    return NextResponse.json(
      { error: `Yapay Zeka veya Sistem Hatası: ${error.message || 'Bilinmeyen hata'}` },
      { status: 500 }
    )
  }
}
