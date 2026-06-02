
import { s3Service } from './src/services/s3Service';
import { Buffer } from 'buffer';

async function forensicTrace() {
    console.log("--- FORENSIC TRACE START ---");
    const state = "test-" + Date.now();
    const key = `canva/pendingAuth/${state}.json`;
    const bucket = process.env.AWS_S3_BUCKET_NAME || 'darshan-autoads-storage';
    
    console.log("Generated State:", state);
    console.log("Key to write:", key);
    console.log("Bucket:", bucket);

    try {
        // Upload (Step 1)
        const data = JSON.stringify({ code_verifier: "xyz" });
        await s3Service.uploadFile(key, Buffer.from(data), 'application/json');
        console.log("Upload succeeded.");

        // Check existence (Step 1)
        console.log("Checking existence (head)...");
        // Using getFile as a proxy as we don't have headObject in s3Service
        await s3Service.getFile(key);
        console.log("EXISTS: YES");

        // Simulate Callback retrieval (Step 3)
        console.log("Reading (simulated callback)...");
        const buffer = await s3Service.getFile(key);
        console.log("Key read:", key);
        console.log("Bucket read:", bucket);
        console.log("Data read:", buffer.toString());

        console.log("--- FORENSIC TRACE PASS ---");
    } catch (e: any) {
        console.error("--- FORENSIC TRACE FAIL ---");
        console.error("Error:", e.message);
        console.error("AWS Error Code:", e.Code);
    }
}

forensicTrace();
