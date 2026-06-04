import fs from 'fs';

try {
  const buf = fs.readFileSync('/app/control-plane-api/control-plane-api');
  const str = buf.toString('utf8');
  
  // Search for anything like "run.app" or "ais-"
  const matches1 = str.match(/[a-zA-Z0-9_\-\.]+\.run\.app/g);
  console.log("run.app matches:", matches1 ? Array.from(new Set(matches1)) : "None");

  const matches2 = str.match(/ais-[a-zA-Z0-9_\-]+/g);
  console.log("ais- matches:", matches2 ? Array.from(new Set(matches2)) : "None");
} catch (e: any) {
  console.log("Error:", e.message);
}
