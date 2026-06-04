import fs from 'fs';
import { execSync } from 'child_process';

const files = [
  '/root/.gitconfig',
  '/etc/gitconfig',
  '/root/.config/git/config'
];

for (const f of files) {
  try {
    console.log(`\nContent of ${f}:`);
    console.log(fs.readFileSync(f, 'utf8'));
  } catch (e: any) {
    console.log(`${f} - ${e.message}`);
  }
}

try {
  console.log('\nGit config list:');
  console.log(execSync('git config --global --list', { encoding: 'utf8' }));
} catch (e: any) {
  console.log('git config err:', e.message);
}
