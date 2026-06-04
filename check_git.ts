import { execSync } from 'child_process';
console.log(execSync('git log -n 5 -p src/services/firebaseService.ts | grep "showcase" -A 10').toString());
