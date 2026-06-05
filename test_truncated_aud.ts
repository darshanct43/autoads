const aud = "https://ais-dev-ekg3akgeks2b33ctivvphe-141352367606.asia-southeas";

async function main() {
  const headers = { "Metadata-Flavor": "Google" };
  try {
    console.log("Requesting token for truncated audience:", aud);
    const tokenRes = await fetch(
      `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(aud)}`,
      { headers }
    );
    if (!tokenRes.ok) {
      console.log("Token request failed:", tokenRes.status, await tokenRes.text());
      return;
    }
    const token = await tokenRes.text();
    console.log("Successfully acquired token!");

    const res = await fetch(`http://127.0.0.1:8000/status`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    console.log(`Status for truncated audience: ${res.status}`);
    const body = await res.text();
    console.log(`Response length: ${body.length}`);
    console.log("Response Body:", body);

  } catch (e: any) {
    console.log("Error:", e.message);
  }
}

main();
