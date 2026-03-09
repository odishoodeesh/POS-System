import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getSalesInsights(stats: any, dailyData: any[]) {
  try {
    const model = "gemini-3-flash-preview";
    const prompt = `
      Analyze the following sales data for a POS system and provide 3-4 concise, actionable business insights or recommendations.
      
      Current Stats:
      - Total Revenue: ${stats.totalRevenue}
      - Total Orders: ${stats.totalOrders}
      - Avg. Order Value: ${stats.avgOrderValue}
      - Revenue Trend: ${stats.revenueTrend}
      
      Daily Data (Last 7 days):
      ${JSON.stringify(dailyData)}
      
      Format the response as a JSON array of strings.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    return ["No insights available at the moment."];
  } catch (error) {
    console.error("Gemini Insights Error:", error);
    return ["Unable to generate AI insights. Please check your connection or API key."];
  }
}

export async function generateProductImage(productName: string) {
  try {
    const model = "gemini-2.5-flash-image";
    const prompt = `A professional, high-quality studio product photograph of ${productName} on a clean, minimalist white background. Soft lighting, commercial photography style.`;

    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from Gemini");
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
}
