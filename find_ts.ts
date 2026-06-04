import { execSync } from 'child_process';

try {
  console.log(execSync('find / -name "*.tsx" 2>/dev/null', { encoding: 'utf8' }));
} catch (e: any) {
  console.log(e.message);
}
