import fs from 'fs';

const pid = 6;
try {
  console.log(`=== FILE DESCRIPTORS OF PID ${pid} ===`);
  const fds = fs.readdirSync(`/proc/${pid}/fd`);
  for (const fd of fds) {
    try {
      const link = fs.readlinkSync(`/proc/${pid}/fd/${fd}`);
      console.log(`  fd ${fd} -> ${link}`);
    } catch (e: any) {
      console.log(`  fd ${fd} lookup failed:`, e.message);
    }
  }
} catch (e: any) {
  console.log("Failed to inspect fds:", e.message);
}
