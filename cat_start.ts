import fs from 'fs';

try {
  if (fs.existsSync('/app/start.sh')) {
    console.log("=== /app/start.sh ===");
    console.log(fs.readFileSync('/app/start.sh', 'utf8'));
  } else if (fs.existsSync('../start.sh')) {
    console.log("=== ../start.sh ===");
    console.log(fs.readFileSync('../start.sh', 'utf8'));
  } else {
    console.log("start.sh not found");
  }
} catch (e: any) {
  console.log("Error:", e.message);
}
