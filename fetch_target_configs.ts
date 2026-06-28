import http from 'https';
import fs from 'fs';

const targetPaths = [
  'firebase-applet-config.json',
  'firebase-blueprint.json',
  'firestore.rules',
  'vercel.json',
  'package.json',
  'server.ts',
  'api/create-order.ts',
  'api/verify-payment.ts',
  'backend/razorpay-webhook.ts',
  'lib/firebase.ts',
  'src/lib/firebase.ts',
  'src/services/firebaseService.ts',
  'src/types.ts',
  'docs/PHASE10_ARCHITECTURE.md'
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
  console.log('Fetching configs...');
  const configs: { [path: string]: string } = {};
  for (const path of targetPaths) {
    const content = await fetchRaw(path);
    if (content) {
      configs[path] = content;
      console.log(`- Fetched: ${path} (${content.length} characters)`);
    } else {
      console.log(`- Failed to fetch: ${path}`);
    }
  }
  fs.writeFileSync('/configs_extracted.json', JSON.stringify(configs, null, 2));
  console.log('Configs written to /configs_extracted.json');
}

run();
