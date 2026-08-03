import { NextRequest, NextResponse } from 'next/server'
import { loanStatementSchema } from '@/lib/schemas'
import { extractDocumentText } from '@/lib/document/extract-text'
import { extractStructuredData } from '@/lib/ai/gemini'
import { getFileHash, getCachedResult, setCachedResult } from '@/lib/cache'

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
    
    // Hash check
    const hash = getFileHash(buffer)
    const cached = getCachedResult(hash)
    if (cached) {
      console.log('Returning cached loan result for', hash)
      return NextResponse.json({ loan: cached })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const extracted = await extractDocumentText(buffer, ext)
    let inlineData = undefined
    
    if (extracted.error) {
      if (extracted.requiresOCR) {
        // Fallback to Gemini Multimodal OCR
        inlineData = {
          data: buffer.toString('base64'),
          mimeType: ext === 'pdf' ? 'application/pdf' : (file.type || 'application/pdf')
        }
      } else {
        return NextResponse.json({ error: extracted.error }, { status: 422 })
      }
    }

    const prompt = `
      Sen banka kredi ödeme planlarını (Loan Repayment Plans) analiz eden uzman bir yapay zekasın.
      Sana bir kredi ödeme planı belgesinin metnini veriyorum.
      Lütfen bu metinden aşağıdaki bilgileri çıkar ve SADECE geçerli bir JSON objesi döndür. Başka hiçbir açıklama yazma.

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
    `

    const parsedData = await extractStructuredData(extracted.text || '', prompt, apiKey, inlineData)
    
    // Validate
    const validationResult = loanStatementSchema.safeParse(parsedData)
    if (!validationResult.success) {
      console.error('Zod validation failed for loan:', validationResult.error)
      return NextResponse.json({ 
        error: 'Kredi belgesi çözümlenirken format hatası oluştu.',
        details: validationResult.error.issues
      }, { status: 422 })
    }

    const loanData = validationResult.data

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

    setCachedResult(hash, loanData)

    return NextResponse.json({ loan: loanData })
  } catch (error: any) {
    console.error('PDF parsing error:', error)
    if (error.status === 429 || (error.message && error.message.includes('429'))) {
      return NextResponse.json({ error: 'Yapay zeka kullanım limiti aşıldı. Lütfen 1 dakika bekleyip tekrar deneyin.' }, { status: 429 })
    }
    return NextResponse.json(
      { error: `Yapay Zeka veya Sistem Hatası: ${error.message || 'Bilinmeyen hata'}` },
      { status: 500 }
    )
  }
}
