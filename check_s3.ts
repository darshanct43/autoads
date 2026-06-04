async function check(url: string) {
  const res = await fetch(url);
  console.log(url, res.status);
}

async function run() {
  await check('https://darshan-autoads-storage.s3.amazonaws.com/qr_showcase.mp4');
  await check('https://darshan-autoads-storage.s3.amazonaws.com/showcases/qr_showcase.mp4');
  await check('https://darshan-autoads-storage.s3.amazonaws.com/showcase_qr_showcase.mp4');
  await check('https://darshan-autoads-storage.s3.amazonaws.com/showcase/qr_showcase.mp4');
}
run();
