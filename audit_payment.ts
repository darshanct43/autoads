import Razorpay from 'razorpay';
import { getCredential } from './lib/env.js';

async function runAudit() {
    try {
        const key_id = getCredential('RAZORPAY_KEY_ID');
        const key_secret = getCredential('RAZORPAY_KEY_SECRET');
        console.log('ACTIVE_RAZORPAY_KEY_ID=' + key_id);

        const r = new Razorpay({ key_id, key_secret });
        const order = await r.orders.create({ amount: 100, currency: 'INR', receipt: 'audit_test_real' });

        console.log('ORDER_CREATE_ATTEMPTED=YES');
        console.log('ORDER_CREATE_SUCCESS=YES');
        console.log('ORDER_ID=' + order.id);
        console.log('RAW_RAZORPAY_RESPONSE=' + JSON.stringify(order));
        console.log('REAL_RAZORPAY_READY=YES');
    } catch (err: any) {
        console.log('ORDER_CREATE_ATTEMPTED=YES');
        console.log('ORDER_CREATE_SUCCESS=NO');
        console.log('RAW_RAZORPAY_RESPONSE=' + JSON.stringify(err));
        console.log('ERROR_CODE=' + (err.error?.code || 'UNKNOWN'));
        console.log('ERROR_DESCRIPTION=' + (err.error?.description || 'UNKNOWN'));
    }
}
runAudit();
