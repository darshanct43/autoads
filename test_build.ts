import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function printDir(dir: string) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory does not exist: ${dir}`);
    return;
  }
  const files = fs.readdirSync(dir);
  console.log(`Contents of ${dir}:`);
  files.forEach(f => {
    const fullPath = path.join(dir, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      console.log(`  [DIR]  ${f}`);
    } else {
      console.log(`  [FILE] ${f} (${stat.size} bytes)`);
    }
  });
}

try {
  console.log("=== RUNNING VITE BUILD ===");
  const buildOutput = execSync('npm run build', { encoding: 'utf-8', env: { ...process.env, NODE_ENV: 'production' } });
  console.log("Build output stdout/stderr:");
  console.log(buildOutput);
  
  console.log("\n=== INSPECTING DIST DIRECTORY ===");
  printDir('./dist');
  
  if (fs.existsSync('./dist/assets')) {
    printDir('./dist/assets');
  }
} catch (e: any) {
  console.error("Build failed with error:", e.message);
  if (e.stdout) console.log("STDOUT:", e.stdout.toString());
  if (e.stderr) console.log("STDERR:", e.stderr.toString());
}
