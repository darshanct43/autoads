import fs from 'fs';
import path from 'path';

function listAll(dir: string) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
     console.log(path.join(dir, item));
  }
}

listAll('/');
listAll('/app');
listAll('/app/applet');
