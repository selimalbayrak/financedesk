import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// We rely entirely on the environment variable for security
const apiKey = process.env.GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Using Gemini 1.5 Flash as it's fast and supports multimodal including PDF
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
      Sen uzman bir muhasebeci ve veri çıkarıcı yapay zekasın. 
      Sana bir "Cari Hesap Ekstresi" (Ledger/Account Statement) PDF'i veriyorum.
      Bu PDF'teki tüm işlemleri (satırları) analiz et ve aşağıdaki JSON şemasına birebir uyacak şekilde, SADECE geçerli bir JSON array olarak döndür. Başka hiçbir açıklama yazma.
      
      Eğer tutar "Borç" (Debit) sütunundaysa "debit" değerine, "Alacak" (Credit) sütunundaysa "credit" değerine kuruş cinsinden tamsayı olarak yaz. 
      Örnek: 1.500,00 TL -> 150000, 23.223,67 -> 2322367.
      (Tipik Türkiye muhasebe kayıtlarında Borç, müşterinin bize borçlandığı tutardır, Alacak müşterinin bize ödediği tutardır.)
      
      Tarih formatını her zaman YYYY-MM-DD olarak ver.
      Belge numarası, fiş türü (örn: Toptan Satış Faturası, Nakit Ödeme, vb.) ve açıklamayı çıkar.
      Eğer işlem satırının altında "Mal", "Kart Kodu", "Açıklama", "Miktar", "Birim Fiyat" gibi detay satırları (kalemler) varsa, bunları "lines" array'inin içine ekle. Eğer detay yoksa boş array bırak. Miktarları sayı (number) olarak ver.

      Döndürmen gereken JSON yapısı:
      [
        {
          "date": "2025-01-01",
          "document_no": "0000000000000001",
          "document_type": "Açılış Fişi",
          "description": "Önceki Dönemden Devir",
          "debit": 348600000,
          "credit": 0,
          "lines": []
        },
        {
          "date": "2025-01-06",
          "document_no": "0000000000000002",
          "document_type": "Toptan Satış Faturası",
          "description": "",
          "debit": 435000000,
          "credit": 0,
          "lines": [
            {
              "item_code": "222 075 063 045",
              "description": "ARABA",
              "quantity": 1,
              "unit_price": 4350000,
              "amount": 435000000
            }
          ]
        }
      ]
    `

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
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/```json\n?/, '').replace(/\n?```$/, '')
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/```\n?/, '').replace(/\n?```$/, '')
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
