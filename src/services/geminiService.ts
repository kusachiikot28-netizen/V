import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI features may not work.");
}

export const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export const getRouteDescription = async (routeData: { points: [number, number][] }) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Проанализируй этот велосипедный маршрут: ${JSON.stringify(routeData.points)}. 
      Опиши ландшафт, примерное время прохождения при средней скорости 20 км/ч, и дай 3 совета по безопасности. 
      Ответ должен быть кратким, вдохновляющим и на русском языке.`,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating route description:", error);
    return "Не удалось сгенерировать описание.";
  }
};

export const calculateComplexity = async (routeData: { points: [number, number][] }) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Оцени сложность этого велосипедного маршрута по шкале от 1 до 10: ${JSON.stringify(routeData.points)}.
      Учитывай только геометрию и длину (набор высоты считай пропорциональным извилистости).
      Верни ТОЛЬКО число от 1 до 10.`,
    });
    const score = parseInt(response.text.trim());
    return isNaN(score) ? 5 : score;
  } catch (error) {
    console.error("Error calculating complexity:", error);
    return 5;
  }
};
