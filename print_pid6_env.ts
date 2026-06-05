import fs from 'fs';

try {
  console.log("=== FULL PID 6 ENVs ===");
  const env = fs.readFileSync('/proc/6/environ', 'utf8').split('\0');
  for (const line of env) {
    if (line) {
      const parts = line.split('=');
      console.log(`  ${parts[0]} = ${parts[1]}`);
    }
  }
} catch (e: any) {
  console.error("Error reading env:", e.message);
}
