import fs from 'fs';
import path from 'path';

try {
  const dir = '/var/log/nginx';
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    console.log(`Files in ${dir}:`, files);
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      console.log(`${f} -> size: ${stat.size} bytes, modified: ${stat.mtime}`);
      if (stat.size > 0) {
        const text = fs.readFileSync(full, 'utf8');
        console.log(`FIRST 100 char of ${f}:`, text.substring(0, 100));
      }
    }
  } else {
    console.log(`${dir} does not exist`);
  }
} catch (e: any) {
  console.log("Error:", e.message);
}
