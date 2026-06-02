import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getEffectiveBucketName(): string {
  const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || 'darshan-autoads-storage';
  return bucket;
}

function validateAWS() {
  const bucket = getEffectiveBucketName();
  if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('MISSING_AWS_CREDENTIALS: AWS configuration incomplete');
  }
  console.log(`[S3] Running with Bucket: ${bucket}, Region: ${process.env.AWS_REGION}`);
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const s3Service = {
  async uploadFile(fileName: string, buffer: Buffer, contentType: string) {
    validateAWS();
    const bucket = getEffectiveBucketName();
    console.log(`[S3 FORENSIC] Uploading to Bucket: ${bucket}, Key: ${fileName}`);
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
    });
    await s3Client.send(command);
    
    return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  },

  async getFile(fileName: string): Promise<Buffer> {
    validateAWS();
    const bucket = getEffectiveBucketName();
    console.log(`[S3 FORENSIC] Getting from Bucket: ${bucket}, Key: ${fileName}`);
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: fileName,
    });
    const response = await s3Client.send(command);
    const streamToBuffer = (stream: any) =>
      new Promise<Buffer>((resolve, reject) => {
        const chunks: any[] = [];
        stream.on('data', (chunk: any) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    return await streamToBuffer(response.Body);
  },

  async deleteFile(fileName: string) {
    validateAWS();
    const bucket = getEffectiveBucketName();
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: fileName,
    });
    await s3Client.send(command);
  },

  async generateSignedUrl(fileName: string) {
    validateAWS();
    const bucket = getEffectiveBucketName();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: fileName,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  }
};
