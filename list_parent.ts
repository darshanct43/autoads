import { execSync } from 'child_process';
import fs from 'fs';

function run(cmd: string) {
  console.log(`\n$ ${cmd}`);
  try {
    const out = execSync(cmd, { encoding: 'utf-8' });
    console.log(out);
  } catch (err: any) {
    console.log(`Failed (code ${err.status}): ${err.stderr || err.message}`);
  }
}

console.log("Parent directory listing (/app):");
try {
  console.log(fs.readdirSync('/app'));
} catch (e: any) {
  console.log(e.message);
}

run('df -h');
run('env');
run('find / -name "package.json" -not -path "*/node_modules/*" 2>/dev/null');
