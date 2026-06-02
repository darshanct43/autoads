

const rawSA = process.env.FIREBASE_SERVICE_ACCOUNT || "";

let jsonParseSuccess = false;
let privateKeyPresent = false;
let clientEmailPresent = false;
let isAdminAuthReady = false;

try {
    const sa = JSON.parse(rawSA);
    jsonParseSuccess = true;
    privateKeyPresent = !!sa.private_key;
    clientEmailPresent = !!sa.client_email;
    isAdminAuthReady = privateKeyPresent && clientEmailPresent;
} catch (e: any) {
    jsonParseSuccess = false;
}

console.log('JSON_PARSE_SUCCESS=' + jsonParseSuccess);
console.log('PRIVATE_KEY_PRESENT=' + privateKeyPresent);
console.log('CLIENT_EMAIL_PRESENT=' + clientEmailPresent);
console.log('IS_ADMIN_AUTH_READY=' + isAdminAuthReady);
