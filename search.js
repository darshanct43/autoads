import fs from 'fs';
import path from 'path';

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.next') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      search(fullPath);
    } else {
      if (file.endsWith('.mp4')) {
        console.log(`FOUND: ${fullPath} - size: ${stat.size} bytes`);
      }
    }
  }
}

console.log('Searching for MP4 files...');
search(process.cwd());
