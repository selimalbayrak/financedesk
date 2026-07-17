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
    // Using gemini-2.5-flash which supports multimodality (PDF parsing)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `
      Sen banka kredi ödeme planlarını (Loan Repayment Plans) analiz eden uzman bir yapay zekasın.
      Sana bir kredi ödeme planı belgesi (PDF veya Görsel) veriyorum.
      Lütfen bu belgeden aşağıdaki bilgileri çıkar ve SADECE geçerli bir JSON objesi döndür. Başka hiçbir açıklama veya markdown bloğu yazma.

      Çıkarman gereken bilgiler:
      1. bank_name: Krediyi veren bankanın adı (Örn: "QNB Finansbank", "Akbank", "Garanti BBVA" vs. Metin olarak)
      2. loan_amount: Kredi tutarı (Ana para). Nokta/virgülleri temizleyip float olarak döndür. (Örn: 5000000.00)
      3. total_repayment: Toplam geri ödeme tutarı (Tüm taksitlerin toplamı). Float döndür. (Örn: 7251959.64)
      4. interest_rate: Aylık veya Yıllık faiz oranı (Hangisi net belirtildiyse, % sembolü olmadan float döndür, örn: 3.06)
      5. start_date: Kredi başlangıç/valör tarihi. Her zaman YYYY-MM-DD formatında string. (Örn: "2026-02-17")
      6. end_date: Son taksit veya bitiş tarihi. YYYY-MM-DD formatında string. (Örn: "2028-02-17")
      7. monthly_installment: Standart aylık taksit tutarı. Float döndür. (Örn: 302164.98)
      8. installments: Tüm taksit planı satırlarını listeleyen bir array. Her satır şu alanları içermelidir:
         - due_date: Taksit vade tarihi (YYYY-MM-DD formatında)
         - amount_due: Ödenecek taksit tutarı (Float olarak)

      Örnek Dönüş Formatı:
      {
        "bank_name": "QNB Finansbank",
        "loan_amount": 5000000.00,
        "total_repayment": 7251959.64,
        "interest_rate": 3.06,
        "start_date": "2026-02-17",
        "end_date": "2028-02-17",
        "monthly_installment": 302164.98,
        "installments": [
          { "due_date": "2026-03-17", "amount_due": 302164.98 },
          { "due_date": "2026-04-17", "amount_due": 302164.98 }
        ]
      }
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
    
    // Clean up markdown code blocks if present
    let cleanJson = responseText.trim()
    if (cleanJson.startsWith('\`\`\`json')) {
      cleanJson = cleanJson.replace(/\`\`\`json\n?/, '').replace(/\n?\`\`\`$/, '')
    } else if (cleanJson.startsWith('\`\`\`')) {
      cleanJson = cleanJson.replace(/\`\`\`\n?/, '').replace(/\n?\`\`\`$/, '')
    }

    const loanData = JSON.parse(cleanJson)

    // Helper to format/parse dates
    function normalizeDate(rawDateStr: string): string {
      // If date is like "17/02/2026" convert to YYYY-MM-DD
      if (rawDateStr.includes('/')) {
        const parts = rawDateStr.split('/')
        if (parts.length === 3) {
          // Check if year is first or last
          if (parts[2].length === 4) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
          }
        }
      }
      return rawDateStr
    }

    if (loanData.start_date) loanData.start_date = normalizeDate(loanData.start_date)
    if (loanData.end_date) loanData.end_date = normalizeDate(loanData.end_date)
    if (loanData.installments) {
      loanData.installments = loanData.installments.map((inst: any) => ({
        ...inst,
        due_date: normalizeDate(inst.due_date)
      }))
    }

    return NextResponse.json({ loan: loanData })
  } catch (error: any) {
    console.error('PDF parsing error:', error)
    return NextResponse.json(
      { error: 'PDF işlenirken bir hata oluştu', details: error.message },
      { status: 500 }
    )
  }
}
