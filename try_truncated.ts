const aud = "https://ais-dev-ekg3akgeks2b33ctivvphe-141352367606.asia-southeas";

async function main() {
  const headers = { "Metadata-Flavor": "Google" };
  try {
    const tokenRes = await fetch(
      `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(aud)}`,
      { headers }
    );
    if (!tokenRes.ok) return;
    const token = await tokenRes.text();
    
    const res = await fetch(`http://127.0.0.1:8000/status`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    console.log(`Audience: "${aud}" -> Status: ${res.status}`);
    if (res.status === 200) {
      console.log("Success! Response:", await res.text());
    }
  } catch (e: any) {
    console.log(e.message);
  }
}

main();
