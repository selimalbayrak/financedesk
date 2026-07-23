import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import * as XLSX from 'xlsx'

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

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    })

    const ccPrompt = `
      Sen uzman bir kredi kartı hesap ekstresi analizörü yapay zekasın. 
      Sana bir veya daha fazla "Kredi Kartı Hesap Ekstresi" (Credit Card Statement) dosyası veriyorum.
      
      GÖREVİN:
      1. Ekstreden Kart Toplam Limitini (card_limit) ve Ekstre Dönem Borcunu (statement_debt) tespit edebiliyorsan TL cinsinden yaz (bulamazsan null ver).
      2. Ekstredaki tüm kart harcamalarını (alışverişleri) ve ödemeleri/iadeleri çıkar.
      
      ÖNEMLİ KURALLAR:
      - Tutarları veride nasıl görüyorsan (nokta ve virgülleriyle beraber) TAM OLARAK AYNI METİN (string) formatında "amount_raw" alanına yaz.
      - HARCAMA/ALIŞVERİŞ ise tutarı POZİTİF bir değer yap (örn: "250,50").
      - ÖDEME/İADE/ALACAK ise tutarı NEGATİF yap (örn: "-1.500,00").
      - Tarih formatını her zaman YYYY-MM-DD olarak ver.
      
      Döndürmen gereken JSON formatı:
      {
        "card_limit": "150000.00",
        "statement_debt": "12345.50",
        "transactions": [
          {
            "date": "2025-01-01",
            "description": "MIGROS TURK T.A.S.",
            "amount_raw": "123,45"
          },
          {
            "date": "2025-01-05",
            "description": "KART ODEMESI - EFT/HAVALE",
            "amount_raw": "-2.500,00"
          }
        ]
      }
    `

    let allTransactions: any[] = []
    let detectedLimit: number | null = null
    let detectedDebt: number | null = null

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const ext = file.name.split('.').pop()?.toLowerCase() || ''

      let mimeType = 'application/pdf'
      if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
        mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`
      } else if (ext === 'pdf') {
        mimeType = 'application/pdf'
      }

      let result
      if (['xlsx', 'xls', 'csv'].includes(ext)) {
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const csvData = XLSX.utils.sheet_to_csv(worksheet)

        result = await model.generateContent([
          ccPrompt + `\n\nAnaliz Edilecek Excel Verisi (CSV formatında):\n${csvData}`
        ])
      } else if (['txt', 'text'].includes(ext)) {
        const textContent = buffer.toString('utf-8')
        result = await model.generateContent([
          ccPrompt + `\n\nAnaliz Edilecek Metin Verisi:\n${textContent}`
        ])
      } else {
        result = await model.generateContent([
          ccPrompt,
          {
            inlineData: {
              data: buffer.toString('base64'),
              mimeType: ext === 'pdf' ? 'application/pdf' : (file.type || 'application/pdf'),
            },
          },
        ])
      }

      const responseText = result.response.text()
      let cleanJson = responseText.trim()
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/```json\n?/, '').replace(/\n?```$/, '')
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/```\n?/, '').replace(/\n?```$/, '')
      }

      let parsedData: any
      try {
        parsedData = JSON.parse(cleanJson)
      } catch (err: any) {
        console.error(`Gemini output for file ${file.name} is not valid JSON:`, responseText)
        return NextResponse.json({ 
          error: `${file.name} dosyasının ekstre verileri çözümlenirken format hatası oluştu.`,
          details: err.message 
        }, { status: 422 })
      }

      const rawTransactions = Array.isArray(parsedData) 
        ? parsedData 
        : (parsedData.transactions || parsedData.data || [])

      if (parsedData.card_limit && !detectedLimit) {
        detectedLimit = parseFloat(parsedData.card_limit)
      }
      if (parsedData.statement_debt && !detectedDebt) {
        detectedDebt = parseFloat(parsedData.statement_debt)
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
        const amount = parseAmount(t.amount_raw || t.amount);
        return {
          transaction_date: t.date || t.transaction_date,
          description: t.description,
          amount
        }
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
    return NextResponse.json(
      { error: `Yapay Zeka veya Sistem Hatası: ${error.message || 'Bilinmeyen hata'}` },
      { status: 500 }
    )
  }
}
