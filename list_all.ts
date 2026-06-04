import fs from 'fs';
import path from 'path';

function walk(dir: string, depth: number = 0) {
  if (depth > 5) return;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.next') continue;
      const fullPath = path.join(dir, file);
      const isDir = fs.statSync(fullPath).isDirectory();
      console.log(' '.repeat(depth * 2) + (isDir ? '[D] ' : '[F] ') + file);
      if (isDir) {
        walk(fullPath, depth + 1);
      }
    }
  } catch (err: any) {
    console.log("Error walking", dir, err.message);
  }
}

console.log("--- Scanning current working directory ---");
walk('.');
