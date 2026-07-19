import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY || ''
    if (!apiKey) {
      return NextResponse.json({ error: 'API anahtarı bulunamadı. Lütfen GEMINI_API_KEY ortam değişkenini ayarlayın.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const ccPrompt = `
      Sen uzman bir kredi kartı hesap ekstresi analizörü yapay zekasın. 
      Sana bir "Kredi Kartı Hesap Ekstresi" (Credit Card Statement) PDF'i veriyorum.
      Bu PDF'teki tüm kart harcamalarını (alışverişleri) ve ödemeleri analiz et ve aşağıdaki JSON şemasına birebir uyacak şekilde, SADECE geçerli bir JSON array olarak döndür. Başka hiçbir açıklama yazma.
      
      ÇOK ÖNEMLİ: Tutarları PDF'te nasıl görüyorsan (nokta ve virgülleriyle beraber) TAM OLARAK AYNI METİN (string) formatında "amount_raw" alanına yaz. KESİNLİKLE sayıyı dönüştürmeye veya hesaplamaya çalışma!
      
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

    const result = await model.generateContent([
      ccPrompt,
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: file.type || 'application/pdf',
        },
      },
    ])

    const responseText = result.response.text()
    
    let cleanJson = responseText.trim()
    if (cleanJson.startsWith('\`\`\`json')) {
      cleanJson = cleanJson.replace(/\`\`\`json\n?/, '').replace(/\n?\`\`\`$/, '')
    } else if (cleanJson.startsWith('\`\`\`')) {
      cleanJson = cleanJson.replace(/\`\`\`\n?/, '').replace(/\n?\`\`\`$/, '')
    }

    const rawTransactions = JSON.parse(cleanJson)

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

    return NextResponse.json({ transactions })
  } catch (error: any) {
    console.error('PDF CC Parsing Error:', error)
    return NextResponse.json(
      { error: 'PDF işlenirken bir hata oluştu', details: error.message },
      { status: 500 }
    )
  }
}
