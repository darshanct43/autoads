import http from 'https';
import fs from 'fs';

const filesToFetch = [
  'lib/firebase-admin.ts',
  'backend/_lib/firebase-admin.ts',
  'lib/firebase.ts',
  'lib/upload.ts',
  'api/backup-env.ts'
];

function fetchRaw(filePath: string): Promise<string> {
  return new Promise((resolve) => {
    const url = `https://raw.githubusercontent.com/darshanct43/autoads/main/${encodeURIComponent(filePath)}`;
    http.get(url, (res) => {
      if (res.statusCode !== 200) {
        resolve('');
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

async function run() {
  console.log('Fetching extra configs...');
  const results: any = {};
  for (const file of filesToFetch) {
    const content = await fetchRaw(file);
    if (content) {
      results[file] = content;
      console.log(`- Fetched: ${file} (${content.length} characters)`);
    } else {
      console.log(`- Failed: ${file}`);
    }
  }
  fs.writeFileSync('/extra_extracted.json', JSON.stringify(results, null, 2));
}

run();
