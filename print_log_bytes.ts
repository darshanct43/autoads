import fs from 'fs';

try {
  const buf = fs.readFileSync('/var/log/nginx/access.log');
  console.log("Buffer length:", buf.length);
  
  // Count non-zero bytes
  let nonZeroCount = 0;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0) {
      nonZeroCount++;
    }
  }
  console.log("Non-zero bytes count:", nonZeroCount);
  
  // Find index of first non-zero byte
  const firstNonZero = buf.findIndex(b => b !== 0);
  console.log("First non-zero byte index:", firstNonZero);
  
  if (firstNonZero !== -1) {
    const end = Math.min(firstNonZero + 500, buf.length);
    console.log("Snippet at first non-zero index:");
    console.log(buf.slice(firstNonZero, end).toString('utf8'));
  }
} catch (e: any) {
  console.error("Error reading log:", e.message);
}
