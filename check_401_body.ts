import fs from 'fs';

const aud = "https://ais-dev-ekg3akgeks2b33ctivvphe-141352367606.asia-southeast1.run.app";

async function main() {
  const headers = { "Metadata-Flavor": "Google" };
  try {
    const tokenRes = await fetch(
      `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(aud)}`,
      { headers }
    );
    if (!tokenRes.ok) return;
    const token = await tokenRes.text();
    
    // Decode JWT payload
    const parts = token.split('.');
    if (parts.length > 1) {
      const payload = Buffer.from(parts[1], 'base64').toString('utf8');
      console.log("OIDC Decoded Payload:", JSON.parse(payload));
    }

    const res = await fetch(`http://127.0.0.1:8000/status`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());

  } catch (e: any) {
    console.log(e.message);
  }
}

main();
