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

    const hosts = [
      "127.0.0.1:8000",
      "ais-dev-ekg3akgeks2b33ctivvphe-141352367606.asia-southeast1.run.app"
    ];

    for (const host of hosts) {
      const res = await fetch(`http://127.0.0.1:8000/status`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Host": host
        }
      });
      console.log(`Host: "${host}" -> Status: ${res.status}`);
      console.log(`Body:`, await res.text());
    }

  } catch (e: any) {
    console.log(e.message);
  }
}

main();
