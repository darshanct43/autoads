import fs from 'fs';

try {
  const fd = fs.openSync('/var/log/nginx/access.log', 'r');
  const buffer = Buffer.alloc(1000000); // 1MB buffer
  const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
  console.log("Bytes read via descriptor:", bytesRead);
  if (bytesRead > 0) {
    const text = buffer.slice(0, bytesRead).toString('utf8');
    const lines = text.split('\n');
    console.log("TOTAL LINES BYTESREAD:", lines.length);
    console.log("LAST 10 SUFFICIENT LINES:");
    const lastTen = lines.slice(-20);
    lastTen.forEach(l => console.log(l));
  }
} catch (e: any) {
  console.error("Error reading descriptor:", e.message);
}
