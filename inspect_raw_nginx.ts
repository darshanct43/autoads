import fs from 'fs';

try {
  const content = fs.readFileSync('/var/log/nginx/access.log', 'utf8');
  console.log("LENGTH IN CHARS:", content.length);
  console.log("FIRST 500 CHARACTERS:");
  console.log(content.substring(0, 500));
} catch (e: any) {
  console.error(e.message);
}
