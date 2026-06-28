import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';

// Helper to follow redirect and download fully as binary
function downloadUrl(url: string, dest: string, redirectsRemaining = 5): Promise<boolean> {
  return new Promise((resolve) => {
    if (redirectsRemaining <= 0) {
      console.error(`Too many redirects for ${url}`);
      resolve(false);
      return;
    }

    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      // Handle redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const parsedUrl = new URL(url);
          redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`;
        }
        console.log(`Redirecting to: ${redirectUrl}`);
        resolve(downloadUrl(redirectUrl, dest, redirectsRemaining - 1));
        return;
      }

      if (res.statusCode !== 200) {
        console.error(`Received status ${res.statusCode} for ${url}`);
        resolve(false);
        return;
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const totalBuffer = Buffer.concat(chunks);
        try {
          const dirname = path.dirname(dest);
          if (!fs.existsSync(dirname)) {
            fs.mkdirSync(dirname, { recursive: true });
          }
          fs.writeFileSync(dest, totalBuffer);
          console.log(`Successfully downloaded ${url} to ${dest}. Size: ${totalBuffer.length} bytes`);
          resolve(true);
        } catch (err: any) {
          console.error(`Failed to write to file ${dest}: ${err.message}`);
          resolve(false);
        }
      });

      res.on('error', (err) => {
         console.error(`Stream error during download of ${url}:`, err.message);
         resolve(false);
      });
    });

    req.on('error', (err) => {
      console.error(`Request error for ${url}:`, err.message);
      resolve(false);
    });

    req.end();
  });
}

// A simple zip checker that reads the ZIP file tail and checks if the End of Central Directory (EOCD) signature exists
function verifyZipIntegrity(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File does not exist: ${filePath}`);
      return false;
    }
    const buffer = fs.readFileSync(filePath);
    if (buffer.length < 22) {
      console.log(`File too small to be a zip archive: ${filePath}`);
      return false;
    }

    // Search for End of Central Directory (EOCD) signature: 0x06054b50 (little endian: 50 4b 05 06) in the last 65536 + 22 bytes of the file
    let found = false;
    const searchLimit = Math.min(buffer.length, 65536 + 22);
    for (let i = buffer.length - 22; i >= buffer.length - searchLimit; i--) {
      if (buffer[i] === 0x50 && buffer[i + 1] === 0x4b && buffer[i + 2] === 0x05 && buffer[i + 3] === 0x06) {
        found = true;
        console.log(`Found EOCD signature at byte offset: ${i}`);
        
        // Grab values from EOCD
        const diskNumber = buffer.readUInt16LE(i + 4);
        const diskWithCD = buffer.readUInt16LE(i + 6);
        const diskEntriesCount = buffer.readUInt16LE(i + 8);
        const totalEntriesCount = buffer.readUInt16LE(i + 10);
        const cdSize = buffer.readUInt32LE(i + 12);
        const cdOffset = buffer.readUInt32LE(i + 16);
        
        console.log(`EOCD Info:`);
        console.log(`  Disk Number: ${diskNumber}`);
        console.log(`  Disk with CD: ${diskWithCD}`);
        console.log(`  Disk Entries: ${diskEntriesCount}`);
        console.log(`  Total Entries: ${totalEntriesCount}`);
        console.log(`  Central Directory Size: ${cdSize} bytes`);
        console.log(`  Central Directory Offset: ${cdOffset}`);
        break;
      }
    }

    if (!found) {
      console.error(`❌ ZIP validation failed: End of Central Directory signature (0x06054b50) not found in ${filePath}`);
      return false;
    }

    console.log(`✅ ZIP validation succeeded for ${filePath}. It is a structurally valid ZIP file!`);
    return true;
  } catch (err: any) {
    console.error(`Error validating zip file: ${err.message}`);
    return false;
  }
}

async function run() {
  const destPath = 'android/gradle/wrapper/gradle-wrapper.jar';
  
  // Clean up existing file if any
  if (fs.existsSync(destPath)) {
    console.log('Removing current potentially corrupt jar...');
    fs.unlinkSync(destPath);
  }

  // Source list of stable Gradle Wrapper JAR mirrors or distributions
  const sources = [
    // 1. Direct official source from Github gradle/gradle repo (pointing to a specific release tag)
    'https://raw.githubusercontent.com/gradle/gradle/v8.2.0/gradle/wrapper/gradle-wrapper.jar',
    // 2. Direct jar from raw github mirror from an active release or project
    'https://github.com/gradle/gradle/raw/master/gradle/wrapper/gradle-wrapper.jar',
    // 3. Alternative standard releases
    'https://raw.githubusercontent.com/gradle/gradle/v8.2.1/gradle/wrapper/gradle-wrapper.jar'
  ];

  let success = false;
  for (const src of sources) {
    console.log(`\n--- Attempting download from: ${src} ---`);
    const downloaded = await downloadUrl(src, destPath);
    if (downloaded) {
      const valid = verifyZipIntegrity(destPath);
      if (valid) {
        console.log(`\n🎉 PERFECT: Gradle Wrapper JAR downloaded and verified structurally valid!`);
        success = true;
        break;
      } else {
        console.log(`⚠️ Downloaded file from ${src} wasn't a valid ZIP archive. Trying next mirror...`);
      }
    }
  }

  if (!success) {
    console.error(`\n❌ Error: Failed to retrieve a valid gradle-wrapper.jar from any source.`);
    process.exit(1);
  }
}

run();
