import { execSync } from 'child_process';
try {
  console.log(execSync('ps aux', { encoding: 'utf8' }));
} catch (e: any) {
  console.log(e.message);
}
