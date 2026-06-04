const routes = [
  '/',
  '/health',
  '/logs',
  '/api',
  '/files',
  '/git',
  '/config',
  '/routes',
  '/status',
  '/system',
  '/debug'
];

async function main() {
  for (const r of routes) {
    try {
      const res = await fetch(`http://127.0.0.1:8000${r}`);
      console.log(`GET ${r} - Status: ${res.status}`);
      const text = await res.text();
      console.log(`Response length: ${text.length}`);
      if (text.length < 500) {
        console.log(`Content:`, text);
      }
    } catch (e: any) {
      console.log(`GET ${r} - Error: ${e.message}`);
    }
  }
}

main();
