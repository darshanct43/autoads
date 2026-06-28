
import fs from "fs";
import path from "path";

const filesToCheck = [
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
    "dist/.env",
    ".env.test"
];

console.log("------------------------------------------");
console.log("GHOST SOURCE DISCOVERY:");

filesToCheck.forEach(f => {
    const p = path.resolve(process.cwd(), f);
    if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf-8");
        const matchId = content.match(/RAZORPAY_KEY_ID=["']?([^"'\s]+)["']?/);
        if (matchId) {
            console.log(`FOUND IN ${f}:`);
            console.log(`- Prefix: ${matchId[1].substring(0, 12)}...`);
            console.log(`- Suffix: ...${matchId[1].substring(matchId[1].length - 6)}`);
        } else {
            console.log(`FOUND FILE ${f} but no Razorpay key inside.`);
        }
    } else {
        console.log(`FILE ${f}: NOT FOUND`);
    }
});

console.log("\nSHELL ENVIRONMENT STATE:");
console.log(`- process.env.RAZORPAY_KEY_ID exists: ${!!process.env.RAZORPAY_KEY_ID}`);
if (process.env.RAZORPAY_KEY_ID) {
    console.log(`- Prefix: ${process.env.RAZORPAY_KEY_ID.substring(0, 12)}...`);
    console.log(`- Suffix: ...${process.env.RAZORPAY_KEY_ID.substring(process.env.RAZORPAY_KEY_ID.length - 6)}`);
}

console.log("------------------------------------------");
