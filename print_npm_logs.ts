import fs from 'fs';
import path from 'path';

try {
  const dir = '/root/.npm/_logs';
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).sort();
    console.log("NPM Log Files:", files);
    if (files.length > 0) {
      const latest = files[files.length - 1];
      console.log("=== LATEST COMPLETED LOG:", latest, "===");
      console.log(fs.readFileSync(path.join(dir, latest), 'utf8'));
    }
  } else {
    console.log("NPM directory doesn't exist");
  }
} catch (e: any) {
  console.log("Error:", e.message);
}
