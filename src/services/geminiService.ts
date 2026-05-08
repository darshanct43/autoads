import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY
})

export const geminiService = {
  async chat(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = [], language = 'English') {
    try {
      const systemInstruction = `You are AutoAd AI, a helpful support assistant for AutoAd Pro, an Indian vehicle advertising platform. 
      The user's preferred language is ${language}.
      Unless explicitly asked for a specific format (like JSON), you must respond ONLY in ${language}.
      If the language is Kannada, Hindi, Tamil, or Telugu, ensure the script is correct (not just transliteration).
      If you don't know the answer, politely suggest connecting with the support team.
      Keep responses brief, professional, and helpful for drivers.
      
      Context:
      - AutoAd Pro helps drivers earn by placing ads on their vehicles.
      - Devices must be active and connected to show ads.
      - Payments are processed within 48 hours.
      - Safety on road is top priority.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...history.map(h => ({ role: h.role, parts: h.parts })),
          { role: 'user', parts: [{ text: message }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      return response.text || "I'm having trouble connecting right now. Please try again or use the buttons below.";
    } catch (error) {
      console.error("[GeminiService] Error:", error);
      return "I apologize, but I encountered an error. Please connect with our support team using the options below.";
    }
  }
};
