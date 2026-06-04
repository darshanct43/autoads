import { execSync } from 'child_process';
import fs from 'fs';

function run(cmd: string) {
  console.log(`\n$ ${cmd}`);
  try {
    const out = execSync(cmd, { encoding: 'utf-8' });
    console.log(out);
  } catch (err: any) {
    console.log(`Failed: ${err.stderr || err.message}`);
  }
}

console.log("Files in `/app`:");
try {
  console.log(fs.readdirSync('/app'));
} catch (e: any) {
  console.log(e);
}

run('cat /app/start.sh');
run('git reflog');
run('git log --all --graph --oneline');
