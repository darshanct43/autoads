import { s3Service } from './src/services/s3Service';

async function main() {
  console.log("=== LISTING S3 BUCKET FILES ===");
  try {
    const files = await s3Service.listFiles("");
    console.log(`Total files in S3: ${files.length}`);
    
    // Group files by prefix/folder or show the newest 30 files
    console.log("\nNewest or matching files:");
    const sortedFiles = files.sort();
    sortedFiles.slice(-50).forEach(file => {
      console.log(`- ${file}`);
    });
  } catch (err: any) {
    console.error("Failed to list S3 files:", err.message || err);
  }
  process.exit(0);
}

main();
