console.log({
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? process.env.AWS_ACCESS_KEY_ID.substring(0, 6) + '...' : 'MISSING',
  AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
});
