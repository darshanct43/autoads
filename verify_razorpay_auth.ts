
import Razorpay from "razorpay";
import path from "path";
import fs from "fs";
import * as dotenv from "dotenv";

// Load from .env if it exists, otherwise use platform env
if (fs.existsSync(".env")) {
    dotenv.config({ path: ".env", override: true });
}

async function verifyAuth() {
    const key_id = (process.env.RAZORPAY_KEY_ID || "").trim();
    const key_secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

    console.log("------------------------------------------");
    console.log("RAZORPAY AUTH PROBE:");
    console.log(`KEY_ID_PREFIX = ${key_id ? key_id.substring(0, 12) : "NONE"}`);
    console.log(`KEY_ID_SUFFIX = ${key_id ? key_id.substring(key_id.length - 6) : "NONE"}`);
    console.log(`SECRET_LENGTH = ${key_secret ? key_secret.length : 0}`);

    if (!key_id || !key_secret) {
        console.log("AUTH_SUCCESS = NO");
        console.log("ROOT_CAUSE = Missing credentials in environment.");
        return;
    }

    try {
        const razorpay = new Razorpay({ key_id, key_secret });
        // Attempt a simple list orders call or create order
        await razorpay.orders.create({
            amount: 100,
            currency: "INR",
            receipt: "audit_" + Date.now()
        });
        console.log("AUTH_SUCCESS = YES");
    } catch (error: any) {
        console.log("AUTH_SUCCESS = NO");
        console.log("ERROR_BODY:", JSON.stringify(error, null, 2));
        
        const desc = error?.error?.description || "";
        if (desc.toLowerCase().includes("authentication failed")) {
            console.log("ROOT_CAUSE = PAIR_MISMATCH (Key and Secret do not match)");
        } else {
            console.log("ROOT_CAUSE = " + (desc || error.message));
        }
    }
    console.log("------------------------------------------");
}

verifyAuth();
