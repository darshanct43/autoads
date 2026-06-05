import { execSync } from 'child_process';

try {
  console.log("=== GCLOUD CLI CHECK ===");
  const out = execSync('gcloud --version', { encoding: 'utf8' });
  console.log(out);
  
  const auth = execSync('gcloud auth list', { encoding: 'utf8' });
  console.log(auth);
} catch (e: any) {
  console.log("gcloud not available or failed:", e.message);
}
