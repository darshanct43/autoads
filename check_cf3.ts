async function run() {
  const urls = [
    'https://d1kv1t85g7l7mp.cloudfront.net/uploads/qr_showcase.mp4',
    'https://d1kv1t85g7l7mp.cloudfront.net/uploads/couples_showcase.mp4'
  ];
  for (const u of urls) {
     const res = await fetch(u);
     console.log(u, res.status);
  }
}
run();
