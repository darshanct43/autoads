import crypto from 'crypto';

const key_secret = 'rzp_live_secret_key_from_dashboard'; // REPLACE THIS WITH ACTUAL LIVE SECRET
const order_id = 'order_example_id';
const payment_id = 'pay_example_id';

const generated_signature = crypto
    .createHmac("sha256", key_secret)
    .update(`${order_id}|${payment_id}`)
    .digest("hex");

console.log("GEN_SIG:", generated_signature);
