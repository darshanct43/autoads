import { execSync } from 'child_process';

async function main() {
  try {
    const res = await fetch('http://127.0.0.1:8000/health');
    const txt = await res.text();
    console.log('Health:', txt);
  } catch (err: any) {
    console.log('Health err:', err.message);
  }
}

main();
