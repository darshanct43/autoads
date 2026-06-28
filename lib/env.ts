import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env');

if (!fs.existsSync(envPath)) {
  console.error("FATAL ERROR: .env file is missing. The application requires a .env file as the ONLY source of truth for credentials.");
  process.exit(1);
}

// Manually parse .env
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^=#\s]+)\s*=\s*(.*)?$/);
  if (match) {
    let value = (match[2] || '').trim();
    // Remove quotes if present
    value = value.replace(/^['"]|['"]$/g, '');
    envVars[match[1]] = value;
  }
});

export function loadEnvConfig(): Record<string, string> {
  return envVars;
}

export function getCredential(key: string): string {
  // STRICT: Return only from parsed .env content
  return envVars[key] || '';
}

// Audit helpers
export function printAudit() {
  const dotEnvKey = envVars['RAZORPAY_KEY_ID'] || '';
  const processKey = process.env['RAZORPAY_KEY_ID'] || '';
  
  console.log("ENV_SOURCE=.env");
  console.log(`PROCESS_ENV_RAZORPAY_KEY_ID=${processKey}`);
  console.log(`DOT_ENV_RAZORPAY_KEY_ID=${dotEnvKey}`);
  console.log(`ACTIVE_RAZORPAY_KEY_ID=${dotEnvKey}`);

  // Startup verification
  if (dotEnvKey && processKey && dotEnvKey !== processKey) {
      // Expected discrepancy due to platform injection
      console.log("VERIFICATION: Runtime using .env override");
  }
}
