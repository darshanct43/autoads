import { execSync } from 'child_process';

function run(cmd: string) {
  console.log(`\n$ ${cmd}`);
  try {
    const out = execSync(cmd, { encoding: 'utf-8' });
    console.log(out);
  } catch (err: any) {
    console.log(`Failed: ${err.stderr || err.message}`);
  }
}

run('git log -n 5 --oneline');
run('git status');
run('git diff HEAD~1');
