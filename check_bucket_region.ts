import { S3Client, GetBucketLocationCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: 'us-east-2', // Try checking from here
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function checkBucketRegion() {
  try {
    const command = new GetBucketLocationCommand({ Bucket: 'darshan-autoads-storage' });
    const response = await s3Client.send(command);
    console.log("Bucket Location Response:", response.LocationConstraint);
  } catch (err) {
    console.error("Error checking bucket region:", err);
  }
}

checkBucketRegion();
