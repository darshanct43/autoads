import http from 'https';
import fs from 'fs';
import path from 'path';

const data = JSON.parse(fs.readFileSync('/parsed_results.json', 'utf8'));
const files = data.absentFiles;

function fetchFile(filePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const url = `https://raw.githubusercontent.com/darshanct43/autoads/main/${encodeURIComponent(filePath)}`;
    http.get(url, (res) => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      let chunks: any[] = [];
      res.on('data', (chunk) => { chunks.push(chunk); });
      res.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf8'));
      });
    }).on('error', () => {
      resolve(null);
    });
  });
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function run() {
  console.log(`Starting recovery of ${files.length} missing files...`);
  let successCount = 0;
  let failCount = 0;
  
  // Restore in batches of 15 to avoid network congestion
  const batchSize = 15;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await Promise.all(batch.map(async (file: string) => {
      try {
        const content = await fetchFile(file);
        if (content !== null) {
          const destPath = path.join(process.cwd(), file);
          ensureDir(path.dirname(destPath));
          fs.writeFileSync(destPath, content);
          successCount++;
        } else {
          failCount++;
          console.error(`- Failed to fetch file (status !== 200): ${file}`);
        }
      } catch (err: any) {
        failCount++;
        console.error(`- Error downloading ${file}:`, err.message);
      }
    }));
    console.log(`Progress: ${successCount}/${files.length} restored...`);
  }
  
  console.log(`Recovery finished. Success: ${successCount}, Failed: ${failCount}`);
}

run();
