const https = require('https');

function check(url) {
  https.get(url, (res) => {
    console.log(url, res.statusCode);
  });
}

check('https://d1kv1t85g7l7mp.cloudfront.net/qr_showcase.mp4');
check('https://d1kv1t85g7l7mp.cloudfront.net/showcases/qr_showcase.mp4');
check('https://d1kv1t85g7l7mp.cloudfront.net/showcase_qr_showcase.mp4');
check('https://d1kv1t85g7l7mp.cloudfront.net/showcase/qr_showcase.mp4');
check('https://d1kv1t85g7l7mp.cloudfront.net/assets/qr_showcase.mp4');
check('https://d1kv1t85g7l7mp.cloudfront.net/videos/qr_showcase.mp4');
