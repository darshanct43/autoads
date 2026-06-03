console.log("OPENAI_API_KEY in process.env:", "OPENAI_API_KEY" in process.env);
console.log("Environment keys:", Object.keys(process.env).filter(k => k.includes("VERCEL") || k.includes("OPENAI") || k.includes("AI_STUDIO")));
