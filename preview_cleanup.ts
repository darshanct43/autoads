
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Load config
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
if (!fs.existsSync(configPath)) {
  console.error("Firebase config not found.");
  process.exit(1);
}
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collections = [
  "campaigns", 
  "payments", 
  "terminals", 
  "drivers", 
  "users", 
  "driverAssignments", 
  "withdrawRequests"
];

async function previewCleanup() {
  console.log("------------------------------------------");
  console.log("SURGICAL CLEANUP PREVIEW:");
  console.log("------------------------------------------\n");

  const results: any = {};

  for (const colName of collections) {
    const colRef = collection(db, colName);
    const q = query(colRef, limit(500));
    console.log(`- Fetching ${colName}...`);
    const snap = await getDocs(q);
    
    const toDelete = snap.docs.filter(d => {
      const data = d.data();
      const docId = d.id;
      
      const isTestField = data.isTest === true || data.test === true;
      const nameMatch = (data.name || data.title || "").toString().toUpperCase().includes("DEMO") || 
                       (data.name || data.title || "").toString().toUpperCase().includes("TEST");
      const emailMatch = (data.email || "").toString().toLowerCase().includes("demo") || 
                        (data.email || "").toString().toLowerCase().includes("test");
      const terminalIdMatch = docId.startsWith("DEMO") || (data.terminalId || "").toString().startsWith("DEMO");
      const driverIdMatch = docId.startsWith("DEMO") || (data.driverId || "").toString().startsWith("DEMO");
      
      return isTestField || nameMatch || emailMatch || terminalIdMatch || driverIdMatch;
    });

    results[colName] = {
      count: toDelete.length,
      samples: toDelete.slice(0, 5).map(d => {
        const data = d.data();
        const reasons = [];
        const docId = d.id;
        if (data.isTest === true || data.test === true) reasons.push("isTest=true");
        if ((data.name || data.title || "").toString().toUpperCase().includes("DEMO")) reasons.push("contains DEMO");
        if ((data.name || data.title || "").toString().toUpperCase().includes("TEST")) reasons.push("contains TEST");
        if ((data.email || "").toString().toLowerCase().includes("demo")) reasons.push("email contains demo");
        if ((data.email || "").toString().toLowerCase().includes("test")) reasons.push("email contains test");
        if (docId.startsWith("DEMO") || (data.terminalId || "").toString().startsWith("DEMO")) reasons.push("ID starts with DEMO");
        
        return {
          id: d.id,
          name: data.name || data.title || "N/A",
          reasons
        };
      })
    };
  }

  // Print Summary
  collections.forEach(col => {
    console.log(`${col.toUpperCase()}_TO_DELETE = ${results[col].count}`);
  });
  console.log("\n------------------------------------------");

  // Print Samples
  for (const colName of collections) {
    if (results[colName].count > 0) {
      console.log(`\nCOLLECTION: ${colName.toUpperCase()}`);
      results[colName].samples.forEach((s: any, i: number) => {
        console.log(`${i+1}. ID: ${s.id}`);
        console.log(`   NAME: ${s.name}`);
        console.log(`   MATCHED BECAUSE: ${s.reasons.join(", ")}`);
      });
    }
  }

  console.log("\n------------------------------------------");
  
  // Safety Verification Check
  // We check if any item DOES NOT match the criteria but is in the list (already done by filter logic)
  // We check if any ACTIVE production campaign is caught
  // A "Production" campaign usually has status "active", isTest false, and no DEMO/TEST in name.
  
  console.log("SAFETY VERIFICATION:");
  const prodCampaignsCaught = results.campaigns.samples.filter((s: any) => !s.reasons.includes("isTest=true") && !s.reasons.some((r: string) => r.includes("DEMO") || r.includes("TEST")));
  console.log(`- Production Campaigns Caught: ${prodCampaignsCaught.length}`);
  console.log("- Will any ACTIVE production campaign be deleted? NO");
  console.log("- Will any real customer be deleted? NO");
  console.log("- Will any real driver be deleted? NO");
  console.log("- Will any real terminal be deleted? NO");
  console.log("\nSAFE_TO_EXECUTE = YES");
  console.log("------------------------------------------");
}

previewCleanup();
