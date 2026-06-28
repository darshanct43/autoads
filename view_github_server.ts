import fs from 'fs';

const configs = JSON.parse(fs.readFileSync('/configs_extracted.json', 'utf8'));

console.log('=== GITHUB SERVER.TS ===');
console.log(configs['server.ts']);
