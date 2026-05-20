import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history, language = 'English', role = 'user', systemContext = {} } = req.body;
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Gemini AI not configured" });
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  try {
    let systemInstruction = `You are AutoAd AI, a helpful support assistant for AutoAd Pro, an Indian vehicle advertising platform. 
    The user's preferred language is ${language}.
    Context:
    - AutoAd Pro helps drivers earn by placing ads on their vehicles.
    - Devices must be active and connected to show ads.
    - Payments are processed within 48 hours.
    - Safety on road is top priority.
    
    CURRENT SYSTEM DATA:
    ${JSON.stringify(systemContext, null, 2)}`;

    if (role === 'admin') {
      systemInstruction += `\nYou are currently acting as the "Admin's AI Secretary". 
      Rules:
      1. Be CASUAL but EFFICIENT. Address them as "Admin" frequently.
      2. EXTREMELY SHORT ANSWERS. One sentence if possible.
      3. Tone: Sharp, professional, loyal.
      4. Use the CURRENT SYSTEM DATA provided above to answer specific questions about fleet performance.`;
    } else if (role === 'customer') {
      systemInstruction += `\nYou are the "Ads Expert" for customers.
      Rules:
      1. Be helpful and encouraging.
      2. EXTREMELY SHORT ANSWERS.
      3. Remind them to complete payment for pending campaigns or upload media for approved ones.
      4. Refer to their balance or campaigns if present in the data.`;
    } else if (role === 'driver') {
      systemInstruction += `\nYou are the "Fleet Support" for drivers.
      Rules:
      1. Be helpful and encouraging.
      2. EXTREMELY SHORT ANSWERS.
      3. Encourage them to stay online to maximize earnings.
      4. Use their current stats (earnings, hours) to motivate them.`;
    }

    const chat = ai.chats.create({ 
      model: "gemini-3.5-flash", 
      config: {
        systemInstruction: systemInstruction 
      }
    });

    const result = await chat.sendMessage({
      message: message
    });
    
    const text = result.text;
    
    res.status(200).json({ text });
  } catch (error: any) {
    console.error("[SERVERLESS] Gemini Chat Error:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
}
