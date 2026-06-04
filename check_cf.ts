async function check(url: string) {
  const res = await fetch(url);
  console.log(url, res.status);
}

async function run() {
  await check('https://d1kv1t85g7l7mp.cloudfront.net/qr_showcase.mp4');
  await check('https://d1kv1t85g7l7mp.cloudfront.net/showcases/qr_showcase.mp4');
  await check('https://d1kv1t85g7l7mp.cloudfront.net/showcase_qr_showcase.mp4');
  await check('https://d1kv1t85g7l7mp.cloudfront.net/showcase/qr_showcase.mp4');
  await check('https://d1kv1t85g7l7mp.cloudfront.net/assets/qr_showcase.mp4');
  await check('https://d1kv1t85g7l7mp.cloudfront.net/videos/qr_showcase.mp4');
}
run();
