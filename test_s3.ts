
import { s3Service } from './src/services/s3Service';
import { Buffer } from 'buffer';

async function testS3() {
    console.log("Starting S3 test...");
    try {
        const state = "test-" + Date.now();
        const data = JSON.stringify({ test: "data" });
        await s3Service.uploadFile(`canva/pendingAuth/${state}.json`, Buffer.from(data), 'application/json');
        console.log(`Successfully wrote to canva/pendingAuth/${state}.json`);
        
        const content = await s3Service.getFile(`canva/pendingAuth/${state}.json`);
        console.log("Successfully read back:", content.toString());
        
        await s3Service.deleteFile(`canva/pendingAuth/${state}.json`);
        console.log("Successfully deleted test file");
    } catch (e) {
        console.error("Test failed:", e);
    }
}

testS3();
