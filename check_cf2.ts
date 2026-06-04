async function check(url: string) {
  const res = await fetch(url);
  console.log(url, res.status);
}

async function run() {
  await check('https://d1kv1t85g7l7mp.cloudfront.net/uploads/showcase_qr_showcase.mp4');
  await check('https://d1kv1t85g7l7mp.cloudfront.net/assets/showcase_qr_showcase.mp4');
  await check('https://d1kv1t85g7l7mp.cloudfront.net/public/uploads/showcase_qr_showcase.mp4');
}
run();
