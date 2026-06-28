import http from 'https';
import fs from 'fs';
import path from 'path';

const filesToRestore = [
  'android/build.gradle',
  'android/settings.gradle',
  'android/app/build.gradle',
  'android/app/src/main/AndroidManifest.xml',
  'android/app/src/main/java/com/autoads/app/MainActivity.java',
  'android/app/src/main/res/values/colors.xml',
  'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
  'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml'
];

function fetchFile(filePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const url = `https://raw.githubusercontent.com/darshanct43/autoads/main/${encodeURIComponent(filePath)}`;
    const req = http.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      let chunks: any[] = [];
      res.on('data', (chunk) => { chunks.push(chunk); });
      res.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf8'));
      });
    });
    req.on('error', () => {
      resolve(null);
    });
    req.on('timeout', () => {
      req.destroy();
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
  console.log(`Starting restoration of ${filesToRestore.length} deleted files...`);
  let successCount = 0;
  
  for (const file of filesToRestore) {
    try {
      console.log(`Fetching ${file}...`);
      const content = await fetchFile(file);
      if (content !== null) {
        const destPath = path.join(process.cwd(), file);
        ensureDir(path.dirname(destPath));
        fs.writeFileSync(destPath, content);
        console.log(`✅ Restored: ${file} (${content.length} bytes)`);
        successCount++;
      } else {
        console.error(`❌ Failed to fetch file: ${file}`);
      }
    } catch (err: any) {
      console.error(`❌ Error for ${file}:`, err.message);
    }
  }
  
  console.log(`Restoration finished. Success: ${successCount}/${filesToRestore.length}`);
}

run();
