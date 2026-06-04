import fs from 'fs';

if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.includes('AWS') || line.includes('S3') || line.includes('CLOUDFRONT')) {
      const parts = line.split('=');
      const key = parts[0];
      const val = parts.slice(1).join('=');
      const safeVal = val.length > 5 ? val.substring(0, 4) + '...' + val.substring(val.length - 2) : '***';
      console.log(`${key}=${safeVal}`);
    }
  });
} else {
  console.log(".env file not found");
}
