import fs from 'fs';

const data = JSON.parse(fs.readFileSync('/parsed_results.json', 'utf8'));

console.log('=== TOTAL ABSENT FILES ===');
console.log(data.absentFiles.length);

const categories: { [prefix: string]: string[] } = {};
data.absentFiles.forEach((file: string) => {
  const parts = file.split('/');
  const prefix = parts.length > 1 ? parts[0] : 'root';
  if (!categories[prefix]) {
    categories[prefix] = [];
  }
  categories[prefix].push(file);
});

Object.keys(categories).forEach(cat => {
  console.log(`- Folder "${cat}": ${categories[cat].length} files`);
  console.log('  Samples:', categories[cat].slice(0, 10));
});
