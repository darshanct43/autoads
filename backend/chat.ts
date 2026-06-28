import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history, language } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const { getCredential } = await import('../lib/env.js');
  const apiKey = getCredential('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('[CHAT] GEMINI_API_KEY is not defined in the backend environment.');
    return res.status(500).json({ 
      error: 'Gemini API Key is missing. Please configure it in Settings.' 
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const systemInstruction = `You are the AutoAds AI Platform Assistant, a highly helpful, professional customer service agent and administrative helper. You assist drivers, franchises, and advertisers on our smart auto-rickshaw advertising network. Answer in ${language || 'English'} clearly and concisely.`;

    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        if (h.role && h.parts && Array.isArray(h.parts)) {
          contents.push({
            role: h.role === 'model' ? 'model' : 'user',
            parts: h.parts.map((p: any) => ({ text: p.text }))
          });
        }
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    const replyText = response.text || "I'm sorry, I couldn't generate a reply.";
    return res.status(200).json({ text: replyText });
  } catch (error: any) {
    console.error("[CHAT] Gemini API Error:", error);
    return res.status(500).json({ 
      error: 'Error during chat model execution', 
      details: error.message 
    });
  }
}
