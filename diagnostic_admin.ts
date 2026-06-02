
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

console.log("1. FIREBASE_SERVICE_ACCOUNT present:", !!serviceAccountRaw);

if (serviceAccountRaw) {
  console.log("2. Length of FIREBASE_SERVICE_ACCOUNT:", serviceAccountRaw.length);
  try {
    const sa = JSON.parse(serviceAccountRaw);
    console.log("3. JSON.parse successful : YES");
    console.log("4. Contains project_id:", !!sa.project_id);
    console.log("4. Contains private_key:", !!sa.private_key);
    console.log("4. Contains client_email:", !!sa.client_email);
    console.log("5. private_key starts with -----BEGIN PRIVATE KEY-----:", sa.private_key && sa.private_key.startsWith("-----BEGIN PRIVATE KEY-----"));
  } catch (e) {
    console.log("3. JSON.parse successful : NO", e);
  }
} else {
    console.log("Deployment environment lacks FIREBASE_SERVICE_ACCOUNT variable.");
}
