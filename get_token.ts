const audiences = [
  "https://aistudio.google.com",
  "https://aistudio.corp.google.com",
  "https://aistudio-dev.corp.google.com",
  "https://aistudio-staging.corp.google.com",
  "https://aistudio-preprod.corp.google.com",
  "https://aistudio-autopush.corp.google.com"
];

async function tryAudience(aud: string) {
  try {
    const tokenRes = await fetch(
      `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(aud)}`,
      { headers: { "Metadata-Flavor": "Google" } }
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
    // ignore
  }
}

async function main() {
  for (const aud of audiences) {
    await tryAudience(aud);
  }
}

main();
