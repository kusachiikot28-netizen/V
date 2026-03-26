import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI features may not work.");
}

export const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export const getRouteDescription = async (routeData: any) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Опиши этот велосипедный маршрут на основе данных: ${JSON.stringify(routeData)}. 
      Укажи сложность, интересные места и советы для велосипедистов. Ответ на русском языке.`,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating route description:", error);
    return "Не удалось сгенерировать описание.";
  }
};
