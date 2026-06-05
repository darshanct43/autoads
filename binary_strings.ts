import fs from 'fs';

try {
  const buf = fs.readFileSync('/app/control-plane-api/control-plane-api');
  console.log("Binary size:", buf.length);
  
  // Find URL-like strings
  const str = buf.toString('ascii');
  const matched = str.match(/(https?:\/\/[a-zA-Z0-9_./-]*)/g);
  
  if (matched) {
    const unique = Array.from(new Set(matched));
    console.log(`Found ${unique.length} unique URLs in binary:`);
    const relevant = unique.filter(u => u.includes('run.app') || u.includes('google') || u.includes('audience') || u.includes('authorized'));
    console.log("Relevant URLs:");
    relevant.forEach(u => console.log("  ", u));
  } else {
    console.log("No URLs matched");
  }

  // Also query word matches
  const runAppMatches = str.match(/([a-zA-Z0-9_./-]*run.app)/g);
  if (runAppMatches) {
    console.log("Found run.app sub-matches:", Array.from(new Set(runAppMatches)).slice(0, 20));
  }
} catch (e: any) {
  console.error("Error reading binary:", e.message);
}
