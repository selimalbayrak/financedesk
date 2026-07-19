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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const ccPrompt = `
      Sen uzman bir kredi kartı hesap ekstresi analizörü yapay zekasın. 
      Sana bir "Kredi Kartı Hesap Ekstresi" (Credit Card Statement) verisi/dosyası veriyorum.
      Bu verideki tüm kart harcamalarını (alışverişleri) ve ödemeleri analiz et ve aşağıdaki JSON şemasına birebir uyacak şekilde, SADECE geçerli bir JSON array olarak döndür. Başka hiçbir açıklama yazma.
      
      ÇOK ÖNEMLİ: Tutarları veride nasıl görüyorsan (nokta ve virgülleriyle beraber) TAM OLARAK AYNI METİN (string) formatında "amount_raw" alanına yaz. KESİNLİKLE sayıyı dönüştürmeye veya hesaplamaya çalışma!
      
      Eğer satır bir HARCAMA/ALIŞVERİŞ/ÜYE İŞYERİ HARCAMASI ise tutarı POZİTİF bir değer olarak belirle (örn: "250,50").
      Eğer satır bir ÖDEME/İADE/ALACAK ise tutarı NEGATİF (önüne eksi koyarak) yap (örn: "-1.500,00" veya "-350").
      
      Tarih formatını her zaman YYYY-MM-DD olarak ver.
      İşlem açıklamasını eksiksiz çıkar.
      
      Döndürmen gereken JSON yapısı (değerler örnektir):
      [
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
    `

    let allTransactions: any[] = []

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const ext = file.name.split('.').pop()?.toLowerCase() || ''

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
              mimeType: file.type || 'application/pdf',
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

      let rawTransactions
      try {
        rawTransactions = JSON.parse(cleanJson)
      } catch (err: any) {
        console.error(`Gemini output for file ${file.name} is not valid JSON. Raw output:`, responseText)
        return NextResponse.json({ 
          error: `${file.name} dosyasının ekstre verileri çözümlenirken geçersiz format oluştu. Lütfen dosyanın net ve okunaklı olduğundan emin olun.`,
          details: err.message 
        }, { status: 422 })
      }

      if (!Array.isArray(rawTransactions)) {
        return NextResponse.json({ error: `${file.name} dosyasından liste formatı alınamadı.` }, { status: 422 })
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

      allTransactions = [...allTransactions, ...transactions]
    }

    // Sort all transactions by date descending
    allTransactions.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())

    return NextResponse.json({ transactions: allTransactions })
  } catch (error: any) {
    console.error('PDF CC Parsing Error:', error)
    return NextResponse.json(
      { error: 'Dosya işlenirken bir hata oluştu', details: error.message },
      { status: 500 }
    )
  }
}
