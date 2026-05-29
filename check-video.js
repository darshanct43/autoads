import { request } from 'http';

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = request(url, { method: 'GET' }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      
      // Read small chunk of body for printing if it is HTML
      res.on('data', (chunk) => {
        if (data.length < 200) {
          data += chunk;
        }
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          bodySnippet: data.substring(0, 150)
        });
      });
    });
    
    req.on('error', (e) => {
      resolve({ error: e.message });
    });
    req.end();
  });
}

const urls = [
  'http://localhost:3000/videos/qr_showcase.mp4',
  'http://localhost:3000/videos/couples_showcase.mp4'
];

console.log('--- STARTING VERIFICATION ---');
for (const url of urls) {
  console.log(`\nTesting URL: ${url}`);
  const result = await checkUrl(url);
  console.log('Result:', JSON.stringify(result, null, 2));
}
console.log('\n--- VERIFICATION COMPLETED ---');
