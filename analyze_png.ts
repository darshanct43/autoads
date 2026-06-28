import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/modules/rbac/ChatGPT Image Jun 10, 2026, 08_19_26 PM.png');
if (!fs.existsSync(filePath)) {
  console.log('File does not exist');
  process.exit(1);
}

const buf = fs.readFileSync(filePath);
console.log('Total file size:', buf.length);

// Count occurrences of EF BF BD
let patternCount = 0;
for (let i = 0; i < buf.length - 2; i++) {
  if (buf[i] === 0xEF && buf[i+1] === 0xBF && buf[i+2] === 0xBD) {
    patternCount++;
  }
}
console.log('Total sequences of EF BF BD:', patternCount);
