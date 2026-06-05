import fs from 'fs';
import path from 'path';

const now = Date.now();
const threshold = 2 * 60 * 60 * 1000; // 2 hours

function walk(dir: string) {
  try {
    const list = fs.readdirSync(dir);
    for (const f of list) {
      const full = path.join(dir, f);
      try {
        const stat = fs.lstatSync(full);
        if (stat.isDirectory()) {
          if (f === 'node_modules' || f === 'dist' || f === '.git' || f === '.next') continue;
          walk(full);
        } else if (stat.isFile()) {
          const age = now - stat.mtimeMs;
          if (age < threshold) {
            console.log(`MODIFIED FILE: ${full} (${(age / 1000 / 60).toFixed(1)} mins ago, size: ${stat.size} bytes)`);
          }
        }
      } catch (e: any) {
        // ignore
      }
    }
  } catch (e: any) {
    // ignore
  }
}

console.log("=== SEARCHING MODIFIED FILES ===");
walk('/app');
walk('/tmp');
walk('/root');
walk('/var/log');
