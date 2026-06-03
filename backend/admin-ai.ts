import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { dbAdm } from './_lib/firebase-admin';

async function getSystemData() {
  try {
    const [driversSnap, campaignsSnap] = await Promise.all([
      dbAdm.collection('drivers').get(),
      dbAdm.collection('campaigns').get(),
    ]);

    return {
      drivers: driversSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      campaigns: campaignsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    };
  } catch (err: any) {
    console.error("[System Data Error] Could not fetch data from Firestore via Admin SDK. Falling back to empty system data.", err);
    return {
      drivers: [],
      campaigns: [],
      error: "Could not retrieve live data due to missing or insufficient permissions. Please check FIREBASE_SERVICE_ACCOUNT configuration."
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body;
  
  try {
    const data = await getSystemData();
    const systemPrompt = `You are AutoAds AI Admin Assistant. You have access to the following raw system data: ${JSON.stringify(data)}. Answer user questions concisely based purely on this data.`;

    // 1. Check if OpenAI API Key is configured. If so, prioritize OpenAI.
    if (process.env.OPENAI_API_KEY) {
      console.log("[AI Assistant] Using OpenAI API for response processing.");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
      });
      return res.status(200).json({ text: completion.choices[0].message.content });
    }

    // 2. If OpenAI API Key is missing, fallback to native Gemini API via @google/genai
    if (process.env.GEMINI_API_KEY) {
      console.log("[AI Assistant] OpenAI API Key not detected. Falling back to native Gemini-3.5-Flash.");
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: message,
        config: {
          systemInstruction: systemPrompt
        }
      });

      return res.status(200).json({ text: response.text });
    }

    // 3. Fallback error if both are missing
    throw new Error("Neither OPENAI_API_KEY nor GEMINI_API_KEY is configured in the environment variables.");
  } catch (error: any) {
    console.error('[AI Assistant Error]', error);
    res.status(500).json({ error: 'AI Assistant failed: ' + (error.message || 'Unknown error') });
  }
}
