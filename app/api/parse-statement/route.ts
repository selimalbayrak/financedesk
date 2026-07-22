import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import * as XLSX from 'xlsx'

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
      return NextResponse.json({ error: 'API anahtarı bulunamadı. Lütfen GEMINI_API_KEY ortam değişkenini ayarlayın.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    })

    const ledgerPrompt = `
      Sen uzman bir muhasebeci ve veri çıkarıcı yapay zekasın. 
      Sana bir "Cari Hesap Ekstresi" (Ledger/Account Statement) verisi/dosyası veriyorum.
      Bu verideki tüm işlemleri (satırları) analiz et ve aşağıdaki JSON şemasına birebir uyacak şekilde, SADECE geçerli bir JSON array olarak döndür. Başka hiçbir açıklama yazma.
      
      ÇOK ÖNEMLİ: Tutarları veride nasıl görüyorsan (nokta ve virgülleriyle beraber) TAM OLARAK AYNI METİN (string) formatında "debit_raw" ve "credit_raw" alanlarına yaz. KESİNLİKLE sayıyı dönüştürmeye veya hesaplamaya çalışma!
      Eğer veride '3.486.000,00' yazıyorsa, JSON'a '3.486' YAZMA, eksiksiz olarak '3.486.000,00' yaz. Sondaki veya aradaki hiçbir sıfırı yutma.
      
      Eğer tutar "Borç" (Debit) sütunundaysa "debit_raw" değerine, "Alacak" (Credit) sütunundaysa "credit_raw" değerine yaz. Boşsa veya çizgi varsa "0" yaz.
      
      Tarih formatını her zaman YYYY-MM-DD olarak ver.
      Belge numarası, fiş türü (örn: Toptan Satış Faturası, Nakit Ödeme, vb.) ve açıklamayı çıkar.
      
      Döndürmen gereken JSON yapısı (değerler örnektir):
      [
        {
          "date": "2025-01-01",
          "document_no": "0000000000000001",
          "document_type": "Açılış Fişi",
          "description": "Örnek İşlem Açıklaması",
          "debit_raw": "1.234.567,89",
          "credit_raw": "0"
        }
      ]
    `

    const bankPrompt = `
      Sen uzman bir banka hesap ekstresi analizörü yapay zekasın. 
      Sana bir "Banka Hesap Ekstresi" (Bank Statement) verisi/dosyası veriyorum.
      Bu verideki tüm işlemleri (hesap hareketleri satırlarını) analiz et ve aşağıdaki JSON şemasına birebir uyacak şekilde, SADECE geçerli bir JSON array olarak döndür. Başka hiçbir açıklama yazma.
      
      ÇOK ÖNEMLİ: Tutarları veride nasıl görüyorsan (nokta ve virgülleriyle beraber) TAM OLARAK AYNI METİN (string) formatında "debit_raw" ve "credit_raw" alanlarına yaz. KESİNLİKLE sayıyı dönüştürmeye veya hesaplamaya çalışma!
      Eğer veride '3.486.000,00' yazıyorsa, JSON'a '3.486' YAZMA, eksiksiz olarak '3.486.000,00' yaz. Sondaki veya aradaki hiçbir sıfırı yutma.
      
      Eğer hesaba para GİRDİYSE (Yatan/Alacak/Credit) "credit_raw" alanına yaz, "debit_raw" alanını "0" yap.
      Eğer hesaptan para ÇIKTIYSA (Çekilen/Borç/Debit) "debit_raw" alanına yaz, "credit_raw" alanını "0" yap.
      
      Tarih formatını her zaman YYYY-MM-DD olarak ver.
      Belge/dekont numarasını (varsa), işlem türünü (Havale, EFT, POS, vb.) ve tüm açıklamayı (karşı tarafın adı veya IBAN'ı vs.) çıkar. Açıklamayı detaylı tut ki sonradan hangi firmaya/kişiye ait olduğu anlaşılabilsin.
      
      Döndürmen gereken JSON yapısı (değerler örnektir):
      [
        {
          "date": "2025-01-01",
          "document_no": "12345678",
          "document_type": "Gelen Havale",
          "description": "Örnek Şirket A.Ş. - Fatura Ödemesi",
          "debit_raw": "0",
          "credit_raw": "9.876.543,21"
        }
      ]
    `

    const promptText = statementType === 'bank' ? bankPrompt : ledgerPrompt
    const ext = file.name.split('.').pop()?.toLowerCase() || ''

    let result
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      // Parse spreadsheet to CSV using sheetjs
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const csvData = XLSX.utils.sheet_to_csv(worksheet)

      // Send the spreadsheet content directly as text context
      result = await model.generateContent([
        promptText + `\n\nAnaliz Edilecek Excel Verisi (CSV formatında):\n${csvData}`
      ])
    } else if (['txt', 'text'].includes(ext)) {
      const textContent = buffer.toString('utf-8')
      result = await model.generateContent([
        promptText + `\n\nAnaliz Edilecek Metin Verisi:\n${textContent}`
      ])
    } else {
      // PDF or Image
      result = await model.generateContent([
        promptText,
        {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: file.type || 'application/pdf',
          },
        },
      ])
    }

    const responseText = result.response.text()
    
    // Clean up markdown json blocks if model added them
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
      console.error('Gemini output is not valid JSON. Raw output:', responseText)
      return NextResponse.json({ 
        error: 'Ekstre verileri çözümlenirken geçersiz format oluştu. Lütfen dosyanın net ve okunaklı olduğundan emin olun.',
        details: err.message 
      }, { status: 422 })
    }

    if (!Array.isArray(rawTransactions)) {
      return NextResponse.json({ error: 'Ekstre çözümlenirken liste formatı alınamadı.' }, { status: 422 })
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
      let debit = 0;
      let credit = 0;
      
      if ('debit_raw' in t) debit = parseAmount(t.debit_raw);
      else if ('debit' in t) debit = parseAmount(t.debit);

      if ('credit_raw' in t) credit = parseAmount(t.credit_raw);
      else if ('credit' in t) credit = parseAmount(t.credit);

      return {
        ...t,
        debit,
        credit
      }
    })

    return NextResponse.json({ transactions })
  } catch (error: any) {
    console.error('PDF/Excel Parsing Error:', error)
    return NextResponse.json(
      { error: 'Dosya işlenirken sistemsel bir hata oluştu', details: error.message },
      { status: 500 }
    )
  }
}
