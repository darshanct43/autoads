import fs from 'fs';

function inspectPid(pid: number) {
  try {
    const env = fs.readFileSync(`/proc/${pid}/environ`, 'utf8').split('\0');
    console.log(`\nPID ${pid} environ keys:`);
    for (const line of env) {
      const parts = line.split('=');
      if (parts[0]) {
        console.log(`  ${parts[0]}`);
      }
    }
  } catch (err: any) {
    console.log(`Failed to inspect PID ${pid}:`, err.message);
  }
}

inspectPid(6);
