import { GoogleGenerativeAI } from '@google/generative-ai'

export async function extractStructuredData(
  text: string, 
  prompt: string, 
  apiKey: string,
  inlineData?: { data: string, mimeType: string }
) {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1
    }
  })

  let content: any[] = []
  if (inlineData) {
    content = [prompt, { inlineData }]
  } else {
    content = [`${prompt}\n\nAnaliz Edilecek Metin Verisi:\n${text}`]
  }
  
  const result = await model.generateContent(content)
  const responseText = result.response.text()

  let cleanJson = responseText.trim()
  if (cleanJson.startsWith('```json')) {
    cleanJson = cleanJson.replace(/```json\n?/, '').replace(/\n?```$/, '')
  } else if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/```\n?/, '').replace(/\n?```$/, '')
  }

  return JSON.parse(cleanJson)
}
