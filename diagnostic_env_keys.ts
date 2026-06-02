const firebaseKeys = Object.keys(process.env)
  .filter(k => k.includes('FIREBASE'));

console.log("FIREBASE_ENV_KEYS:", firebaseKeys);
console.log("FIREBASE_SERVICE_ACCOUNT_LENGTH:", process.env.FIREBASE_SERVICE_ACCOUNT?.length);
