// pdf-parse is imported dynamically inside the function to avoid Next.js build errors with Canvas/DOMMatrix
import * as XLSX from 'xlsx'
import { extractTextWithOCR } from './ocr'

export interface ExtractedDocument {
  text: string
  requiresOCR?: boolean
  error?: string
}

function cleanText(text: string): string {
  // Remove excessive multiple newlines and spaces, but keep structural newlines
  return text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {3,}/g, '  ')
    .trim()
}

export async function extractDocumentText(buffer: Buffer, fileExt: string): Promise<ExtractedDocument> {
  const ext = fileExt.toLowerCase()

  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const csvData = XLSX.utils.sheet_to_csv(worksheet)
      return { text: cleanText(csvData) }
    } catch (e: any) {
      return { text: '', error: 'Excel/CSV okunamadı: ' + e.message }
    }
  }

  if (['txt', 'text'].includes(ext)) {
    const textContent = buffer.toString('utf-8')
    return { text: cleanText(textContent) }
  }

  if (ext === 'pdf') {
    try {
      const pdfParse = eval('require("pdf-parse")')
      const data = await pdfParse(buffer)
      const text = cleanText(data.text)
      
      // If text is very short or mostly empty space, it's likely a scanned PDF without a text layer
      const alphanumericCount = (text.match(/[a-zA-Z0-9]/g) || []).length
      
      if (alphanumericCount < 50) {
        // Fallback to OCR abstraction
        return await extractTextWithOCR(buffer)
      }
      
      return { text }
    } catch (e: any) {
      console.error('PDF native parse error:', e)
      return await extractTextWithOCR(buffer)
    }
  }

  // Fallback for image types or other unsupported extensions
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
    return await extractTextWithOCR(buffer)
  }

  return { text: '', error: 'Desteklenmeyen dosya formatı' }
}
