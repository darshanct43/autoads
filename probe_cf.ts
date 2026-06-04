async function ping(path) {
  const url = `https://d1kv1t85g7l7mp.cloudfront.net/${path}`;
  const res = await fetch(url, { method: 'HEAD' });
  if (res.status === 200) console.log('FOUND:', url);
}

async function run() {
  const paths = [
    'qr.mp4', 'qr_showcase.mp4', 'showcase_qr_showcase.mp4',
    'showcases/qr.mp4', 'showcases/qr_showcase.mp4',
    'videos/qr.mp4', 'videos/qr_showcase.mp4',
    'impact/qr.mp4', 'impact/qr_showcase.mp4',
    'uploads/qr.mp4', 'uploads/qr_showcase.mp4',
    'uploads/showcase_qr_showcase.mp4',
    'awareness_showcase.mp4', 'food_showcase.mp4'
  ];
  for (const p of paths) {
    await ping(p);
  }
}
run();
