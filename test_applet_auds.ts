const candidates = [
  "2d7c0ec8-7f5b-426d-8e1a-dc77926ec5fb",
  "ais-dev-ekg3akgeks2b33ctivvphe"
];

async function main() {
  const headers = { "Metadata-Flavor": "Google" };
  for (const aud of candidates) {
    try {
      const tokenRes = await fetch(
        `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(aud)}`,
        { headers }
      );
      if (!tokenRes.ok) continue;
      const token = await tokenRes.text();
      
      const res = await fetch(`http://127.0.0.1:8000/status`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      console.log(`Audience: "${aud}" -> Status: ${res.status}`);
      if (res.status === 200) {
        console.log("SUCCESS FOR AUDIENCE:", aud);
        const txt = await res.text();
        console.log("Body:", txt);
        break;
      }
    } catch (e: any) {
      console.log(`Error for ${aud}:`, e.message);
    }
  }
}

main();
