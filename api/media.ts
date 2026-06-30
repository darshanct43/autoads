import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getEffectiveBucketName(): string {
  return process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || 'darshan-autoads-storage';
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: (process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID)!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export default async function handler(req: any, res: any) {
  try {
    const keyOrUrl = (req.query.key || req.query.url || '') as string;
    if (!keyOrUrl) {
      return res.status(400).send("Missing key or url parameter");
    }

    let key = keyOrUrl;
    if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
      try {
        const urlObj = new URL(keyOrUrl);
        key = decodeURIComponent(urlObj.pathname.slice(1));
      } catch (e) {}
    }

    const bucket = getEffectiveBucketName();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    res.redirect(signedUrl);
  } catch (err: any) {
    console.error("Error generating signed URL for preview:", err);
    res.status(500).send(err.message);
  }
}
