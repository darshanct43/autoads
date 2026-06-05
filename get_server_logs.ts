import fs from 'fs';

const aud = "https://ais-dev-ekg3akgeks2b33ctivvphe-141352367606.asia-southeast1.run.app";

async function main() {
  const headers = { "Metadata-Flavor": "Google" };
  console.log("Fetching Google OIDC Token with Aud:", aud);
  try {
    const tokenRes = await fetch(
      `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(aud)}`,
      { headers }
    );
    if (!tokenRes.ok) {
      console.log("Token request failed:", tokenRes.status, await tokenRes.text());
      return;
    }
    const token = await tokenRes.text();
    console.log("Successfully acquired OIDC token! Length:", token.length);

    // Try a few possible control plane endpoints
    const endpoints = [
      'status',
      'logs',
      'stdout',
      'stderr'
    ];

    for (const ep of endpoints) {
      try {
        const url = `http://127.0.0.1:8000/${ep}`;
        const res = await fetch(url, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const txt = await res.text();
        console.log(`Endpoint /${ep} -> Status: ${res.status} (Length: ${txt.length})`);
        if (res.status === 200 && txt.length > 0) {
          console.log(`=== CONTENT OF /${ep} ===`);
          console.log(txt.substring(0, 10000)); // Show up to 10k chars
          fs.writeFileSync(`/tmp/control_plane_${ep}.log`, txt);
        }
      } catch (err: any) {
        console.log(`Failed to fetch /${ep}:`, err.message);
      }
    }

  } catch (e: any) {
    console.log("Error in fetching:", e.message);
  }
}

main();
