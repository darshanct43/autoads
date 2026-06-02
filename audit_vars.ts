
console.log("--- AWS VARIABLE AUDIT ---");
console.log("AWS_S3_BUCKET exists:", !!process.env.AWS_S3_BUCKET);
console.log("Value:", process.env.AWS_S3_BUCKET);
console.log("Length:", process.env.AWS_S3_BUCKET?.length || 0);

console.log("AWS_S3_BUCKET_NAME exists:", !!process.env.AWS_S3_BUCKET_NAME);
console.log("Value:", process.env.AWS_S3_BUCKET_NAME);
console.log("Length:", process.env.AWS_S3_BUCKET_NAME?.length || 0);
