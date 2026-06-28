import fs from 'fs';

const data = JSON.parse(fs.readFileSync('/parsed_results.json', 'utf8'));

console.log('Keys in parsed_results:', Object.keys(data));
console.log('allFiles count:', data.allFiles.length);
console.log('absentFiles count:', data.absentFiles.length);
console.log('results keys:', Object.keys(data.results));
Object.keys(data.results).forEach(k => {
  console.log(`- result "${k}" count:`, data.results[k].length);
});
