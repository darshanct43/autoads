import http from 'https';
import fs from 'fs';

function getGithub(urlPath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: urlPath,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    };
    http.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Fetching Github metadata...');
  try {
    const branches = await getGithub('/repos/darshanct43/autoads/branches');
    console.log(`- Branches loaded: ${branches.length}`);
    
    const commits = await getGithub('/repos/darshanct43/autoads/commits?per_page=100');
    console.log(`- Commits loaded: ${commits.length}`);
    
    const tree = await getGithub('/repos/darshanct43/autoads/git/trees/main?recursive=1');
    console.log(`- Tree nodes loaded: ${tree.tree.length}`);
    
    fs.writeFileSync('/git_raw_data.json', JSON.stringify({
      branches,
      commits,
      tree: tree.tree
    }, null, 2));
    
    console.log('Github raw data written to /git_raw_data.json');
  } catch (e: any) {
    console.error('Failed to fetch from Github API:', e.message);
  }
}

run();
