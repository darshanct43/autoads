const fs = require('fs');
let content = fs.readFileSync('./src/components/portals/AdminPortal.tsx', 'utf8');

// 1. In Desktop table, add REVIEW button for pending drivers
content = content.replace(
  /<button\s+onClick=\{\(\) => \{\s*setSelectedDriverForEarning\(d\);\s*setShowEarningModal\(true\);\s*\}\}\s+className="text-\[8px\] font-black bg-amber-50 text-amber-600 px-3 py-2 rounded-lg uppercase tracking-widest hover:bg-amber-100 transition-all shadow-sm flex items-center gap-1"\s*>\s*Payment\s*<\/button>/g,
  (match) => {
     return `
                              {d.status === 'pending_verification' && (
                                <button
                                  onClick={() => {
                                    setSelectedDriverForAgreement(d);
                                  }}
                                  className="text-[8px] font-black bg-amber-500 text-slate-950 px-3 py-2 rounded-lg uppercase tracking-[0.2em] shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                                >
                                  <Shield size={12} className="text-slate-900" /> REVIEW 
                                </button>
                              )}
                              ${match}
     `;
  }
);

// 2. In Mobile accordion, add REVIEW button for pending drivers
content = content.replace(
  /<button\s+onClick=\{\(\) => \{\s*setSelectedDriverForEarning\(d\);\s*setShowEarningModal\(true\);\s*\}\}\s+className="w-full py-3 bg-amber-500 text-slate-950 rounded-xl text-\[9px\] font-black uppercase tracking-widest shadow-sm"\s*>\s*Make Payment\s*<\/button>/g,
  (match) => {
     return `
                            {d.status === 'pending_verification' && (
                              <button
                                onClick={() => {
                                  setSelectedDriverForAgreement(d);
                                }}
                                className="w-full py-3 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm flex justify-center items-center gap-2"
                              >
                                <Shield size={12} /> REVIEW DOCS
                              </button>
                            )}
                            ${match}
     `;
  }
);


// 3. Remove activeTab === "REVIEWS" entirely
const reviewsTabRegex = /\s*:\s*activeTab === "REVIEWS" \? \([\s\S]*?(?=\)\s*:\s*activeTab === "DASHBOARD" \? \()/;
if (reviewsTabRegex.test(content)) {
   content = content.replace(reviewsTabRegex, '');
}

fs.writeFileSync('./src/components/portals/AdminPortal.tsx', content);
console.log("Combined drivers/reviews correctly.");
