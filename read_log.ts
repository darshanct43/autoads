import fs from 'fs';
try {
  console.log(fs.readFileSync('/root/.npm/_logs/2026-06-03T13_39_11_091Z-debug-0.log', 'utf8'));
} catch (e: any) {
  console.log(e.message);
}
