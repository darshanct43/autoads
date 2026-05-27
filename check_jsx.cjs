const fs = require('fs');
const content = fs.readFileSync('src/components/portals/CustomerPortal.tsx', 'utf8');

const targetTags = ['div', 'main', 'nav', 'button', 'form', 'label', 'p', 'span', 'AnimatePresence', 'motion.div', 'table', 'tbody', 'tr', 'td', 'textarea'];
const tags = [];
// Capture tags. Avoid anything matching <T> like generic types
const regex = /<\/?([a-zA-Z0-9_.-]+)[^>]*>/g;
let match;
let lines = content.split('\n');
function getLine(index) {
  let len = 0;
  for (let i = 0; i < lines.length; i++) {
    len += lines[i].length + 1;
    if (len > index) return i + 1;
  }
  return -1;
}

while ((match = regex.exec(content)) !== null) {
  const full = match[0];
  const tag = match[1];
  
  if (!targetTags.includes(tag)) continue;
  
  if (full.endsWith('/>')) {
     continue;
  }
  
  if (full.startsWith('</')) {
     if (tags.length > 0 && tags[tags.length - 1].tag === tag) {
        tags.pop();
     } else {
        console.log(`Mismatch at line ${getLine(match.index)}: Expected ${tags.length > 0 ? tags[tags.length - 1].tag : 'NOTHING'} but got </${tag}>. Full match: ${full}`);
     }
  } else {
     tags.push({ tag, line: getLine(match.index), full });
  }
}
console.log('Unclosed tags remaining:', tags.map(t => `${t.tag} at ${t.line}`));
