export async function extractTextWithOCR(buffer: Buffer): Promise<{ text: string, requiresOCR: boolean, error?: string }> {
  // OCR abstraction.
  // In the future, this can be implemented using Tesseract.js, Google Document AI, etc.
  // Currently, we return a controlled response indicating OCR is required.
  return {
    text: '',
    requiresOCR: true,
    error: 'Metin bulunamadı. Lütfen fatura/ekstre fotoğrafı yerine orijinal PDF belgesini yükleyin.'
  }
}
