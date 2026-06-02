console.log("EXISTS:", typeof process.env.FIREBASE_SERVICE_ACCOUNT !== 'undefined');
console.log("TYPE:", typeof process.env.FIREBASE_SERVICE_ACCOUNT);
console.log("LENGTH:", process.env.FIREBASE_SERVICE_ACCOUNT ? process.env.FIREBASE_SERVICE_ACCOUNT.length : 0);
console.log("VALUE_STARTS_WITH:", process.env.FIREBASE_SERVICE_ACCOUNT?.startsWith("mayaan_webhook_secure_2026") ? "mayaan_webhook_secure_2026" : (typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'undefined' ? "undefined" : "other"));
console.log("DEPLOYMENT_ID:", process.env.K_SERVICE);
