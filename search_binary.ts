import fs from 'fs';

try {
  const buf = fs.readFileSync('/app/control-plane-api/control-plane-api');
  // Match client ID regex: \d+-[a-zA-Z0-9_]+\.apps\.googleusercontent\.com
  const regex = /\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com/g;
  const str = buf.toString('utf8');
  const matches = str.match(regex);
  console.log("Client IDs found:", matches ? Array.from(new Set(matches)) : "None");
  
  // Let's also look for strings like "audience" or "aud" near validation
  // Search for any .apps.googleusercontent.com
  const regex2 = /[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com/g;
  const matches2 = str.match(regex2);
  console.log("Other apps domains:", matches2 ? Array.from(new Set(matches2)) : "None");
} catch (e: any) {
  console.log("Error:", e.message);
}
