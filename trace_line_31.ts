import fs from 'fs';

const code = fs.readFileSync('dist/server.cjs', 'utf8');
const lines = code.split('\n');

console.log('=== Lines 25 to 35 of dist/server.cjs ===');
for (let i = 24; i < Math.min(35, lines.length); i++) {
  console.log(`Line ${i+1}: ${lines[i]}`);
}
