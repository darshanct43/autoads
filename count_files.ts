import fs from 'fs';
import path from 'path';

function getFilesCount(dir: string): number {
  let count = 0;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const resPath = path.resolve(dir, item.name);
    if (resPath.includes('node_modules') || resPath.includes('.git') || resPath.includes('dist')) continue;
    if (item.isDirectory()) {
      count += getFilesCount(resPath);
    } else {
      count++;
    }
  }
  return count;
}

try {
  console.log('Total local files (excluding node_modules/dist):', getFilesCount(process.cwd()));
} catch (e: any) {
  console.error(e.message);
}
