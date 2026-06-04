async function main() {
  try {
    const headers = { "Metadata-Flavor": "Google" };
    console.log("Fetching Access Token...");
    const resToken = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
      { headers }
    );
    if (!resToken.ok) {
      console.log("Failed to get access token:", resToken.status, await resToken.text());
      return;
    }
    const data = await resToken.json();
    console.log("Got access token! Type:", data.token_type, "Expires:", data.expires_in);
    
    const res = await fetch(`http://127.0.0.1:8000/status`, {
      headers: { "Authorization": `Bearer ${data.access_token}` }
    });
    console.log(`Access Token -> Status: ${res.status}`);
    const text = await res.text();
    console.log(`Response length: ${text.length}`);
    if (text.length < 500) {
      console.log(`Content:`, text);
    }
  } catch (err: any) {
    console.log("Error:", err.message);
  }
}

main();
