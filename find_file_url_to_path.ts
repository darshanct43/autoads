import fs from 'fs';

const configs = JSON.parse(fs.readFileSync('/configs_extracted.json', 'utf8'));

Object.keys(configs).forEach(path => {
  const code = configs[path];
  if (code.includes('fileURLToPath')) {
    console.log(`- fileURLToPath found in GitHub file: ${path}`);
    const lines = code.split('\n');
    lines.forEach((line: string, i: number) => {
      if (line.includes('fileURLToPath')) {
        console.log(`  Line ${i+1}: ${line.trim()}`);
      }
    });
  }
  if (code.includes('import.meta.url')) {
    console.log(`- import.meta.url found in GitHub file: ${path}`);
    const lines = code.split('\n');
    lines.forEach((line: string, i: number) => {
      if (line.includes('import.meta.url')) {
        console.log(`  Line ${i+1}: ${line.trim()}`);
      }
    });
  }
});
