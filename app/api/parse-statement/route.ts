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
      
      Eğer tutar "Borç" (Debit) sütunundaysa "debit" değerine, "Alacak" (Credit) sütunundaysa "credit" değerine kuruş cinsinden tamsayı olarak yaz. 
      Örnek: 1.500,00 TL -> 150000, 23.223,67 -> 2322367.
      (Tipik Türkiye muhasebe kayıtlarında Borç, müşterinin bize borçlandığı tutardır, Alacak müşterinin bize ödediği tutardır.)
      
      Tarih formatını her zaman YYYY-MM-DD olarak ver.
      Belge numarası, fiş türü (örn: Toptan Satış Faturası, Nakit Ödeme, vb.) ve açıklamayı çıkar.
      
      Döndürmen gereken JSON yapısı:
      [
        {
          "date": "2025-01-01",
          "document_no": "0000000000000001",
          "document_type": "Açılış Fişi",
          "description": "Önceki Dönemden Devir",
          "debit": 348600000,
          "credit": 0
        }
      ]
    `

    const bankPrompt = `
      Sen uzman bir banka hesap ekstresi analizörü yapay zekasın. 
      Sana bir "Banka Hesap Ekstresi" (Bank Statement) PDF'i veriyorum.
      Bu PDF'teki tüm işlemleri (hesap hareketleri satırlarını) analiz et ve aşağıdaki JSON şemasına birebir uyacak şekilde, SADECE geçerli bir JSON array olarak döndür. Başka hiçbir açıklama yazma.
      
      Eğer hesaba para GİRDİYSE (Yatan/Alacak/Credit) "credit" alanına yaz, "debit" alanını 0 yap.
      Eğer hesaptan para ÇIKTIYSA (Çekilen/Borç/Debit) "debit" alanına yaz, "credit" alanını 0 yap.
      Tutar kuruş cinsinden tamsayı olmalıdır. Örnek: 1.500,00 TL -> 150000, 23.223,67 -> 2322367.
      
      Tarih formatını her zaman YYYY-MM-DD olarak ver.
      Belge/dekont numarasını (varsa), işlem türünü (Havale, EFT, POS, vb.) ve tüm açıklamayı (karşı tarafın adı veya IBAN'ı vs.) çıkar. Açıklamayı detaylı tut ki sonradan hangi firmaya/kişiye ait olduğu anlaşılabilsin.
      
      Döndürmen gereken JSON yapısı:
      [
        {
          "date": "2025-01-01",
          "document_no": "12345678",
          "document_type": "Gelen Havale",
          "description": "Ahmet Yılmaz - Kira Ödemesi",
          "debit": 0,
          "credit": 1500000
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

    const transactions = JSON.parse(cleanJson)

    return NextResponse.json({ transactions })
  } catch (error: any) {
    console.error('PDF Parsing Error:', error)
    return NextResponse.json(
      { error: 'PDF işlenirken bir hata oluştu', details: error.message },
      { status: 500 }
    )
  }
}
