import fs from 'fs';
import path from 'path';

try {
  console.log("=== READING LOCAL .env ===");
  if (fs.existsSync('.env')) {
    console.log(".env exists!");
    console.log("Content:");
    console.log(fs.readFileSync('.env', 'utf8'));
  } else {
    console.log(".env does not exist at", path.resolve('.env'));
  }
} catch (e: any) {
  console.error("Error reading .env:", e.message);
}
