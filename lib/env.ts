import fs from 'fs';
import path from 'path';

let _envConfig: Record<string, string> | null = null;

export function loadEnvConfig(): Record<string, string> {
  if (_envConfig) return _envConfig;

  _envConfig = {};
  const envPath = path.join(process.cwd(), '.env.example');

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        value = value.trim().replace(/^["']|["']$/g, '');
        _envConfig![key] = value;
      }
    });
  } else {
    console.warn("[EnvLoader] .env.example not found");
  }

  return _envConfig;
}

export function getCredential(key: string): string {
  const config = loadEnvConfig();
  return config[key] || '';
}

// Audit helpers
export function printAudit() {
  console.log("RAZORPAY_KEY_SOURCE = .env.example");
  console.log("FIREBASE_KEY_SOURCE = .env.example");
  console.log("GEMINI_KEY_SOURCE = .env.example");
  console.log("SOURCE_OF_TRUTH = .env.example");
}
