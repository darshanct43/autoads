import fs from 'fs';
try {
  console.log(fs.readFileSync('/app/.dev.env.json', 'utf8'));
} catch (e: any) {
  console.log(e.message);
}
