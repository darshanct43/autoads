import { S3Client } from "@aws-sdk/client-s3";

const accessKeyId = process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;

if (!accessKeyId || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
  console.error("AWS credentials missing");
}

export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export const BUCKET_NAME = process.env.AWS_BUCKET_NAME;
