import { execSync } from 'child_process';
import fs from 'fs';

function run(cmd: string) {
  console.log(`\n$ ${cmd}`);
  try {
    const out = execSync(cmd, { encoding: 'utf-8' });
    console.log(out);
  } catch (err: any) {
    console.log(`Failed: ${err.message}`);
  }
}

run('find / -name ".git" 2>/dev/null');
run('find / -name "vite.config.ts" 2>/dev/null');
