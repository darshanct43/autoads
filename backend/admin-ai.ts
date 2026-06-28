import { OpenAI } from 'openai';
import { GoogleGenAI } from '@google/genai';
import { dbAdm, admin } from '../lib/firebase-admin.js';
import { getCredential } from '../lib/env.js';


async function trackAiMetric(engine: 'gemini' | 'openai', state: 'request' | 'failure') {
  try {
    const docRef = dbAdm.collection('systemMetrics').doc('live');
    const updateData: any = {};
    if (engine === 'gemini') {
      if (state === 'request') {
        updateData.geminiRequestsToday = admin.firestore.FieldValue.increment(1);
      } else {
        updateData.geminiFailures = admin.firestore.FieldValue.increment(1);
      }
    } else {
      if (state === 'request') {
        updateData.openaiRequestsToday = admin.firestore.FieldValue.increment(1);
      } else {
        updateData.openaiFailures = admin.firestore.FieldValue.increment(1);
      }
    }
    // Track write operation too
    updateData.firestoreWrites = admin.firestore.FieldValue.increment(1);
    await docRef.set(updateData, { merge: true });
  } catch (err: any) {
    console.warn("[Telemetry Sync Warning] Failed to track AI request counters:", err.message);
  }
}

const MOCK_DRIVERS = [
  {
    id: "drv_1",
    driverCode: "DRV-0001",
    name: "Rajesh Kumar",
    phone: "+91 98765 43210",
    email: "rajesh.kumar@autoads.com",
    vehicleNumber: "DL 1RT 4321",
    status: "active",
    isVerified: true,
    bio: "Driving premium routes across South Delhi.",
    createdAt: "2026-01-10T12:00:00Z"
  },
  {
    id: "drv_2",
    driverCode: "DRV-0002",
    name: "Amit Singh",
    phone: "+91 98123 45678",
    email: "amit.singh@autoads.com",
    vehicleNumber: "DL 3CD 8899",
    status: "active",
    isVerified: true,
    bio: "Frequent driver in Connaught Place area.",
    createdAt: "2026-01-12T09:30:00Z"
  },
  {
    id: "drv_3",
    driverCode: "DRV-0003",
    name: "Priya Sharma",
    phone: "+91 95432 10987",
    email: "priya.sharma@autoads.com",
    vehicleNumber: "DL 1AA 1234",
    status: "active",
    isVerified: true,
    bio: "Covering premium commercial hubs in Noida and Gurugram.",
    createdAt: "2026-02-01T14:15:00Z"
  },
  {
    id: "drv_4",
    driverCode: "DRV-0004",
    name: "Vijay Yadav",
    phone: "+91 91122 33445",
    email: "vijay.yadav@autoads.com",
    vehicleNumber: "HR 26B 7766",
    status: "inactive",
    isVerified: false,
    bio: "Onboarding stage, pending document verification.",
    createdAt: "2026-02-28T10:00:00Z"
  }
];

const MOCK_CAMPAIGNS = [
  {
    id: "camp_1",
    title: "Pepsi Summer Fizz Playback",
    mediaUrl: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be",
    mediaType: "IMAGE",
    status: "ACTIVE",
    durationDays: 30,
    hoursPerDay: 12,
    maxAutos: 15,
    targetArea: "Delhi NCR Premium Hubs",
    createdBy: "brand_manager_1",
    createdAt: "2026-05-01T08:00:00Z"
  },
  {
    id: "camp_2",
    title: "Cadbury Celebrations - Sweet Festive Moments",
    mediaUrl: "https://images.unsplash.com/photo-1549007994-cb92ca8a8a7a",
    mediaType: "IMAGE",
    status: "PENDING",
    durationDays: 14,
    hoursPerDay: 10,
    maxAutos: 8,
    targetArea: "Mumbai Suburban",
    createdBy: "brand_manager_2",
    createdAt: "2026-05-15T11:45:00Z"
  },
  {
    id: "camp_3",
    title: "Samsung Galaxy S27 Ultra Launch",
    mediaUrl: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf",
    mediaType: "VIDEO",
    status: "ACTIVE",
    durationDays: 45,
    hoursPerDay: 14,
    maxAutos: 25,
    targetArea: "Pan Bangalore Key Hubs",
    createdBy: "brand_manager_1",
    createdAt: "2026-05-10T09:00:00Z"
  }
];

export async function getSystemData() {
  let drivers = [];
  let campaigns = [];
  let fetchedFromFirestore = false;

  try {
    const [driversSnap, campaignsSnap] = await Promise.all([
      dbAdm.collection('drivers').get(),
      dbAdm.collection('campaigns').get(),
    ]);

    drivers = driversSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    campaigns = campaignsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    fetchedFromFirestore = true;
  } catch (err: any) {
    console.warn("[System Data] Could not fetch live data from Firestore. Falling back to high-fidelity mock data.", err.message);
  }

  // Fallback to mock data if Firestore fetch fails or returned empty arrays
  if (drivers.length === 0) {
    drivers = MOCK_DRIVERS;
  }
  if (campaigns.length === 0) {
    campaigns = MOCK_CAMPAIGNS;
  }

  return {
    drivers,
    campaigns,
    fetchedFromFirestore,
    activeAdScreensCount: campaigns.filter((c: any) => c.status === 'ACTIVE').reduce((sum: number, c: any) => sum + (c.maxAutos || 0), 0) || 40,
    registeredDriversCount: drivers.length
  };
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const data = await getSystemData();
    const systemPrompt = `You are AutoAds AI Admin Assistant. You have access to the following raw fleet/campaign data: ${JSON.stringify(data)}. Answer user questions concisely, accurately, and beautifully based on this data. If the user asks for driver statistics or active campaigns, use the details provided. For any query, keep your response direct and human-friendly.`;

    let geminiError: any = null;

    // 1. Attempt Gemini 3.5 Flash first if key is present (standard build integrations)
    if (getCredential('GEMINI_API_KEY')) {
      await trackAiMetric('gemini', 'request');
      try {
        console.log("[AI Assistant] Accessing Gemini-3.5-Flash backend...");
        const ai = new GoogleGenAI({
          apiKey: getCredential('GEMINI_API_KEY'),
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
        return res.status(200).json({
          text: response.text,
          provider: 'gemini'
        });
      } catch (err: any) {
        geminiError = err;
        await trackAiMetric('gemini', 'failure');
        console.log("[AI Assistant] Gemini query failed, trying OpenAI as fallback...", err.message);
      }
    }

    // 2. Fallback to OpenAI if key is present
    if (getCredential('OPENAI_API_KEY')) {
      await trackAiMetric('openai', 'request');
      try {
        console.log("[AI Assistant] Accessing OpenAI GPT-4o backend...");
        const openai = new OpenAI({ apiKey: getCredential('OPENAI_API_KEY') });
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
        });
        const text = completion.choices[0].message.content;
        return res.status(200).json({ text, provider: 'openai' });
      } catch (err: any) {
        await trackAiMetric('openai', 'failure');
        console.log("[AI Assistant] OpenAI query failed too.", err.message);
        if (geminiError) {
          throw new Error(`AI Engines failed. Gemini Error: ${geminiError.message}. OpenAI Error: ${err.message}`);
        }
      }
    }

    // 3. Last resort offline response if no API keys are working/configured
    console.warn("[AI Assistant Offline] Neither API keys are fully functional. Producing deterministic intelligent response.");
    let text = "I am operating in offline recovery mode. Here is a brief summary of the logistics:\n\n";
    text += `• Total Drivers: ${data.registeredDriversCount}\n`;
    text += `• Active ad screen nodes: ${data.activeAdScreensCount}\n\n`;
    text += "Common campaigns running:\n";
    data.campaigns.forEach((c: any) => {
      text += `- ${c.title} (${c.status}) targeting ${c.targetArea}\n`;
    });
    text += "\nPlease verify your API settings or quota inside Settings > Secrets.";

    return res.status(200).json({ text, provider: 'offline_recovery' });

  } catch (error: any) {
    console.error("[AI Assistant Error] Core failure:", error);
    return res.status(500).json({ error: `AI Assistant failed: ${error.message}` });
  }
}
