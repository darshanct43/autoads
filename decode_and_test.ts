async function main() {
  try {
    const tokenRes = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=http://localhost:8000",
      { headers: { "Metadata-Flavor": "Google" } }
    );
    const token = await tokenRes.text();
    const payloadBase64 = token.split('.')[1];
    const decoded = Buffer.from(payloadBase64, 'base64').toString('utf8');
    console.log("Decoded Token Payload:", decoded);
  } catch (err: any) {
    console.log("Error:", err.message);
  }
}
main();
