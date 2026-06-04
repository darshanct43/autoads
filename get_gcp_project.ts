async function main() {
  try {
    const headers = { "Metadata-Flavor": "Google" };
    const pidRes = await fetch("http://metadata.google.internal/computeMetadata/v1/project/project-id", { headers });
    const pid = await pidRes.text();
    console.log("Project ID:", pid);

    const pnumRes = await fetch("http://metadata.google.internal/computeMetadata/v1/project/numeric-project-id", { headers });
    const pnum = await pnumRes.text();
    console.log("Numeric Project ID:", pnum);

    const extraAuds = [
      pid,
      pnum,
      `https://iam.googleapis.com/projects/${pid}/serviceAccounts/ais-sandbox@${pid}.iam.gserviceaccount.com`,
      `https://iam.googleapis.com/projects/${pnum}/serviceAccounts/ais-sandbox@${pid}.iam.gserviceaccount.com`,
    ];

    for (const aud of extraAuds) {
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
        console.log("Success! Response:", await res.text());
      }
    }
  } catch (err: any) {
    console.log("Error:", err.message);
  }
}

main();
