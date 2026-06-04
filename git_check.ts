import { execSync } from 'child_process';

function run(cmd: string) {
  console.log(`\n$ ${cmd}`);
  try {
    const out = execSync(cmd, { encoding: 'utf-8' });
    console.log(out);
  } catch (err: any) {
    console.log(`Failed (code ${err.status}): ${err.stderr || err.message}`);
  }
}

run('git rev-parse --show-toplevel');
run('git status');
run('git log -n 5 --oneline');
run('git reflog -n 5');
run('pwd');
