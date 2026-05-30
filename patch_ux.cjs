const fs = require('fs');
let content = fs.readFileSync('./src/components/portals/AdminPortal.tsx', 'utf8');

// Map Zoom
content = content.replace(/useState\(12\)/, 'useState(14)');

// Transactions List Patch
const txStart = content.indexOf('<div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">');
// Since there could be a few, let's target by exact regex for the table
if (content.includes('paymentSubTab === "INCOME"')) {
   const tableMatch = content.match(/<table className="w-full text-left hidden sm:table">[\s\S]*?<\/table>/);
   if (tableMatch) {
       content = content.replace(/<table className="w-full text-left hidden sm:table">[\s\S]*?<\/table>/, '');
       // Since I already appended the mobile list in previous attempts, let's remove the "hidden sm:table" wrappers and make the list universal
       content = content.replace(/<div className="sm:hidden divide-y divide-slate-100 p-4 space-y-4 max-h-\[60vh\] overflow-y-auto">/, '<div className="divide-y divide-slate-50 p-4 md:p-8 space-y-4 max-h-[70vh] overflow-y-auto">');
   }
}

// Ensure ChevronRight is imported 
if (!content.includes('ChevronRight')) {
   content = content.replace(/AlertCircle,/, 'AlertCircle, ChevronRight,');
}

fs.writeFileSync('./src/components/portals/AdminPortal.tsx', content);
console.log("Patched UX issues.");
