const candidates = [
  "https://ais-pre-ekg3akgeks2b33ctivvphe-141352367606.asia-southeast1.run.app",
  "https://ais-dev-ekg3akgeks2b33ctivvphe-141352367606.asia-southeast1.run.app",
  "ais-pre-ekg3akgeks2b33ctivvphe-141352367606.asia-southeast1.run.app",
  "ais-dev-ekg3akgeks2b33ctivvphe-141352367606.asia-southeast1.run.app",
  "http://ais-pre-ekg3akgeks2b33ctivvphe-141352367606.asia-southeast1.run.app",
  "http://ais-dev-ekg3akgeks2b33ctivvphe-141352367606.asia-southeast1.run.app",
  "https://ais-pre-ekg3akgeks2b33ctivvphe-141352367606.run.app",
  "https://ais-dev-ekg3akgeks2b33ctivvphe-141352367606.run.app",
  "https://ais-dev-ekg3akgeks2b33ctivvphe",
  "https://ais-pre-ekg3akgeks2b33ctivvphe",
  "ais-dev-ekg3akgeks2b33ctivvphe",
  "ais-pre-ekg3akgeks2b33ctivvphe",
  "https://autoads.in",
  "https://autoads-nine.vercel.app"
];

async function main() {
  const headers = { "Metadata-Flavor": "Google" };
  for (const aud of candidates) {
    try {
      const tokenRes = await fetch(
        `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(aud)}`,
        { headers }
      );
      if (!tokenRes.ok) {
        console.log(`Failed to get token for ${aud}: ${tokenRes.status}`);
        continue;
      }
      const token = await tokenRes.text();
      
      const res = await fetch(`http://127.0.0.1:8000/status`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      console.log(`Audience: "${aud}" -> Status: ${res.status}`);
      if (res.status === 200) {
        console.log("SUCCESS FOR AUDIENCE:", aud);
        console.log("Body:", await res.text());
        break;
      }
    } catch (e: any) {
      console.log(`Error for ${aud}:`, e.message);
    }
  }
}

main();
