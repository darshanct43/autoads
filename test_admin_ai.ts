import dotenv from 'dotenv';
dotenv.config();

async function test_api() {
  const ts = new Date().toISOString();
  console.log("1. Timestamp:", ts);
  
  console.log("6. Value of:");
  console.log("   OPENAI_API_KEY exists?", !!process.env.OPENAI_API_KEY);
  console.log("   GEMINI_API_KEY exists?", !!process.env.GEMINI_API_KEY);
  
  console.log("--- Executing request ---");
  try {
    const res = await fetch("http://127.0.0.1:3000/api/admin-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "What models are you currently using? Just return a very short answer." })
    });
    const text = await res.text();
    console.log("Response text:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

test_api();
