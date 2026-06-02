const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
console.log(raw ? raw.substring(0, 50) : "UNDEFINED");
