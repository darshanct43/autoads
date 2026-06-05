import fs from 'fs';

async function probe() {
  const paths = [
    'health',
    'logs',
    'dev/logs',
    'logs/dev',
    'stdout',
    'stderr',
    'status',
    'api/logs',
    'api/status'
  ];
  for (const p of paths) {
    try {
      const url = `http://127.0.0.1:8000/${p}`;
      const res = await fetch(url);
      const txt = await res.text();
      console.log(`PATH: /${p} -> HTTP ${res.status} (Length: ${txt.length})`);
      if (res.status === 200 && txt.length > 0) {
        console.log("PREVIEW:", txt.substring(0, 500));
      }
    } catch (e: any) {
      console.log(`PATH: /${p} -> Failed:`, e.message);
    }
  }
}

probe();
