import fs from 'fs';
import path from 'path';

function searchInFiles(dir: string, keyword: string, depth = 0) {
  if (depth > 8) return;
  try {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      if (item === 'node_modules' || item === '.git' || item === 'dist') continue;
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        searchInFiles(full, keyword, depth + 1);
      } else {
        if (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.js')) {
          const content = fs.readFileSync(full, 'utf8');
          if (content.includes(keyword)) {
            console.log(`Found "${keyword}" in: ${full}`);
          }
        }
      }
    }
  } catch (e: any) {
    // ignore
  }
}

console.log("Searching for OTP api usages in src...");
searchInFiles('src', 'otp');
searchInFiles('src', '/api/');
