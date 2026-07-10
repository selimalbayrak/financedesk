import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

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
      return NextResponse.json({ error: 'API anahtarı bulunamadı. Lütfen Vercel üzerinden GEMINI_API_KEY ortam değişkenini ayarlayıp Redeploy edin.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const ledgerPrompt = `
      Sen uzman bir muhasebeci ve veri çıkarıcı yapay zekasın. 
      Sana bir "Cari Hesap Ekstresi" (Ledger/Account Statement) PDF'i veriyorum.
      Bu PDF'teki tüm işlemleri (satırları) analiz et ve aşağıdaki JSON şemasına birebir uyacak şekilde, SADECE geçerli bir JSON array olarak döndür. Başka hiçbir açıklama yazma.
      
      ÇOK ÖNEMLİ: Tutarları PDF'te nasıl görüyorsan (nokta ve virgülleriyle beraber) TAM OLARAK AYNI METİN (string) formatında "debit_raw" ve "credit_raw" alanlarına yaz. KESİNLİKLE sayıyı dönüştürmeye veya hesaplamaya çalışma!
      
      Eğer tutar "Borç" (Debit) sütunundaysa "debit_raw" değerine, "Alacak" (Credit) sütunundaysa "credit_raw" değerine yaz. Boşsa veya çizgi varsa "0" yaz.
      
      Tarih formatını her zaman YYYY-MM-DD olarak ver.
      Belge numarası, fiş türü (örn: Toptan Satış Faturası, Nakit Ödeme, vb.) ve açıklamayı çıkar.
      
      Döndürmen gereken JSON yapısı:
      [
        {
          "date": "2025-01-01",
          "document_no": "0000000000000001",
          "document_type": "Açılış Fişi",
          "description": "Önceki Dönemden Devir",
          "debit_raw": "3.486,00",
          "credit_raw": "0"
        }
      ]
    `

    const bankPrompt = `
      Sen uzman bir banka hesap ekstresi analizörü yapay zekasın. 
      Sana bir "Banka Hesap Ekstresi" (Bank Statement) PDF'i veriyorum.
      Bu PDF'teki tüm işlemleri (hesap hareketleri satırlarını) analiz et ve aşağıdaki JSON şemasına birebir uyacak şekilde, SADECE geçerli bir JSON array olarak döndür. Başka hiçbir açıklama yazma.
      
      ÇOK ÖNEMLİ: Tutarları PDF'te nasıl görüyorsan (nokta ve virgülleriyle beraber) TAM OLARAK AYNI METİN (string) formatında "debit_raw" ve "credit_raw" alanlarına yaz. KESİNLİKLE sayıyı dönüştürmeye veya hesaplamaya çalışma!
      
      Eğer hesaba para GİRDİYSE (Yatan/Alacak/Credit) "credit_raw" alanına yaz, "debit_raw" alanını "0" yap.
      Eğer hesaptan para ÇIKTIYSA (Çekilen/Borç/Debit) "debit_raw" alanına yaz, "credit_raw" alanını "0" yap.
      
      Tarih formatını her zaman YYYY-MM-DD olarak ver.
      Belge/dekont numarasını (varsa), işlem türünü (Havale, EFT, POS, vb.) ve tüm açıklamayı (karşı tarafın adı veya IBAN'ı vs.) çıkar. Açıklamayı detaylı tut ki sonradan hangi firmaya/kişiye ait olduğu anlaşılabilsin.
      
      Döndürmen gereken JSON yapısı:
      [
        {
          "date": "2025-01-01",
          "document_no": "12345678",
          "document_type": "Gelen Havale",
          "description": "Ahmet Yılmaz - Kira Ödemesi",
          "debit_raw": "0",
          "credit_raw": "1.500,00"
        }
      ]
    `

    const prompt = statementType === 'bank' ? bankPrompt : ledgerPrompt;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: file.type || 'application/pdf',
        },
      },
    ])

    const responseText = result.response.text()
    
    // Clean up markdown json blocks if model added them
    let cleanJson = responseText.trim()
    if (cleanJson.startsWith('\`\`\`json')) {
      cleanJson = cleanJson.replace(/\`\`\`json\n?/, '').replace(/\n?\`\`\`$/, '')
    } else if (cleanJson.startsWith('\`\`\`')) {
      cleanJson = cleanJson.replace(/\`\`\`\n?/, '').replace(/\n?\`\`\`$/, '')
    }

    const rawTransactions = JSON.parse(cleanJson)

    // Robust parsing function for TR number formats
    function parseAmount(raw: string | number | null | undefined): number {
      if (!raw) return 0;
      if (typeof raw === 'number') return raw; // Just in case AI returned a number
      let str = raw.toString().trim();
      if (str === '-' || str === '') return 0;
      
      const lastDot = str.lastIndexOf('.');
      const lastComma = str.lastIndexOf(',');
      
      if (lastComma > lastDot) {
        str = str.replace(/\\./g, '').replace(',', '.');
      } else if (lastDot > lastComma) {
        str = str.replace(/,/g, '');
      } else {
        if (lastComma !== -1) {
           if (str.length - lastComma <= 3) {
               str = str.replace(',', '.');
           } else {
               str = str.replace(',', '');
           }
        }
      }

      const num = parseFloat(str);
      if (isNaN(num)) return 0;
      return Math.round(num * 100);
    }

    const transactions = rawTransactions.map((t: any) => {
      let debit = 0;
      let credit = 0;
      
      if ('debit_raw' in t) debit = parseAmount(t.debit_raw);
      else if ('debit' in t) debit = parseAmount(t.debit); // fallback

      if ('credit_raw' in t) credit = parseAmount(t.credit_raw);
      else if ('credit' in t) credit = parseAmount(t.credit); // fallback

      return {
        ...t,
        debit,
        credit
      }
    })

    return NextResponse.json({ transactions })
  } catch (error: any) {
    console.error('PDF Parsing Error:', error)
    return NextResponse.json(
      { error: 'PDF işlenirken bir hata oluştu', details: error.message },
      { status: 500 }
    )
  }
}
