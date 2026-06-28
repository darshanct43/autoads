import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env');
const envVars: Record<string, string> = {};

// Parse .env if it exists
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([^=#\s]+)\s*=\s*(.*)?$/);
    if (match) {
      let value = (match[2] || '').trim();
      // Remove quotes if present
      value = value.replace(/^['"]|['"]$/g, '');
      envVars[match[1]] = value;
    }
  });
}

export function loadEnvConfig(): Record<string, string> {
  return { ...envVars, ...process.env as Record<string, string> };
}

export function getCredential(key: string): string {
  // Priority: process.env (platform), then .env (local)
  return process.env[key] || envVars[key] || '';
}

// Audit helpers
export function printAudit() {
  const dotEnvKey = envVars['RAZORPAY_KEY_ID'] || 'MISSING';
  const processKey = process.env['RAZORPAY_KEY_ID'] || 'MISSING';
  
  console.log("ENV_SOURCE=Hybrid (process.env priority)");
  console.log(`PROCESS_ENV_RAZORPAY_KEY_ID=${processKey}`);
  console.log(`DOT_ENV_RAZORPAY_KEY_ID=${dotEnvKey}`);
}
