import fs from 'fs';
import path from 'path';

function listRecursive(dir: string, depth = 0) {
  if (depth > 2) return;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const isDir = fs.statSync(fullPath).isDirectory();
      console.log(' '.repeat(depth * 2) + (isDir ? '[DIR] ' : '[FILE] ') + file);
      if (isDir && !file.startsWith('.') && file !== 'node_modules') {
        listRecursive(fullPath, depth + 1);
      }
    }
  } catch (error) {
    console.error('Error reading dir', dir, error);
  }
}

console.log('--- ALL FILES IN ROOT (INCLUDING HIDDEN) ---');
try {
  const files = fs.readdirSync('.');
  for (const file of files) {
    const isDir = fs.statSync(file).isDirectory();
    console.log((isDir ? '[DIR] ' : '[FILE] ') + file);
  }
} catch (e: any) {
  console.error(e);
}
