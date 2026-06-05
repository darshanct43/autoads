import fs from 'fs';

function run() {
  console.log("=== EXAMINING NGINX ACCESS LOGS ===");
  try {
    const content = fs.readFileSync('/var/log/nginx/access.log', 'utf8');
    const lines = content.split('\n');
    console.log(`Total log lines: ${lines.length}`);
    
    // Look for payments related endpoints
    const relevant = lines.filter(l => l.includes('/api/verify-payment') || l.includes('/api/create-order') || l.includes('payment') || l.includes('verification'));
    console.log(`Found ${relevant.length} relevant lines:`);
    relevant.forEach(l => console.log(l));
  } catch (e: any) {
    console.error("Error reading nginx log:", e.message);
  }
}

run();
