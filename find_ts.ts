import { execSync } from 'child_process';

try {
  console.log(execSync('find . -name "*.tsx"', { encoding: 'utf8' }));
} catch (e: any) {
  console.log('Error searching workspace TSX:', e.message);
}

try {
  console.log(execSync('find /app -name "*.tsx"', { encoding: 'utf8' }));
} catch (e: any) {
  console.log('Error searching /app TSX:', e.message);
}
