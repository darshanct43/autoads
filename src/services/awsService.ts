import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

// Lazy initialize the S3 client to prevent startup crashes if variables are missing
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials are not configured');
    }

    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return s3Client;
}

export async function uploadToS3(
  fileStream: ReadableStream | Buffer | Uint8Array | Blob | string,
  fileName: string,
  contentType: string
): Promise<string> {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('AWS_S3_BUCKET_NAME is not configured');
  }

  const client = getS3Client();

  const parallelUploadS3 = new Upload({
    client,
    params: {
      Bucket: bucketName,
      Key: fileName,
      Body: fileStream,
      ContentType: contentType,
    },
    // Optional: Add queueSize, partSize for large file optimization
  });

  await parallelUploadS3.done();

  // Return the public CloudFront URL
  const cloudFrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  if (!cloudFrontDomain) {
    throw new Error('AWS_CLOUDFRONT_DOMAIN is not configured');
  }

  const cleanDomain = cloudFrontDomain.replace(/^https?:\/\//, '');
  return `https://${cleanDomain}/${encodeURI(fileName)}`;
}

export async function deleteFromS3(fileName: string): Promise<void> {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('AWS_S3_BUCKET_NAME is not configured');
  }

  const client = getS3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileName,
    })
  );
}
