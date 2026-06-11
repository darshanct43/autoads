import fs from 'fs';
import path from 'path';

function listAllHidden(dir: string) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item.startsWith('.')) {
      console.log(path.join(dir, item));
    }
  }
}

listAllHidden('/app/applet');
listAllHidden('/app');
listAllHidden('/');
