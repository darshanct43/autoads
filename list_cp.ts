import fs from 'fs';
try {
  console.log(fs.readdirSync('/app/control-plane-api'));
} catch (e: any) {
  console.log(e.message);
}
