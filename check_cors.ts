async function ping() {
  const url = 'https://d1kv1t85g7l7mp.cloudfront.net/qr_showcase.mp4';
  const res = await fetch(url, {
    headers: {
      'Origin': 'https://ais-dev-ekg3akgeks2b33ctivvphe-141352367606.asia-southeast1.run.app',
      'User-Agent': 'Mozilla/5.0'
    }
  });
  console.log(res.status, res.headers);
}
ping();
