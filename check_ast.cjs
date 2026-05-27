const fs = require('fs');
const content = fs.readFileSync('src/components/portals/CustomerPortal.tsx', 'utf8').split('\n');

for (let i = 780; i < 960; i++) {
  const line = content[i];
  if (line === undefined) break;
  let b = 0;
  for(let c of line) { if (c==='{') b++; if (c==='}') b--; }
  if (b !== 0) console.log(`${i+1}: ${b}: ${line.trim()}`);
}
