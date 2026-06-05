import fs from 'fs';
import path from 'path';

console.log("CWD:", process.cwd());
console.log("Checking path of ./lib/firebase-admin.ts:");
try {
  const resolved = path.resolve('./lib/firebase-admin.ts');
  console.log("Resolved path:", resolved);
  console.log("Exists?", fs.existsSync(resolved));
} catch (e: any) {
  console.log(e.message);
}
