import * as dotenv from 'dotenv';

// Initialize dotenv to load environment variables from the .env file
dotenv.config();

export function loadEnvConfig(): Record<string, string> {
  return (process.env as Record<string, string>) || {};
}

export function getCredential(key: string): string {
  return process.env[key] || '';
}

// Audit helpers
export function printAudit() {
  console.log("RAZORPAY_KEY_SOURCE = process.env");
  console.log("FIREBASE_KEY_SOURCE = process.env");
  console.log("GEMINI_KEY_SOURCE = process.env");
  console.log("SOURCE_OF_TRUTH = process.env");
}
