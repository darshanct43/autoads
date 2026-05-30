const fs = require('fs');
let content = fs.readFileSync('./src/components/portals/AdminPortal.tsx', 'utf8');

// Hide table on mobile
content = content.replace(/<table className="w-full text-left sm:table">/, '<table className="w-full text-left hidden sm:table">');

// Remove Network UUID column header
content = content.replace(/<th className="px-8 py-5 text-\[9px\] font-black uppercase text-slate-400 tracking-widest text-center">\s*Network UUID\s*<\/th>/, '');

// Remove Network UUID column cell
content = content.replace(/<td className="px-8 py-5 text-center font-mono text-\[9px\] font-black text-slate-500 uppercase">\s*\{d\.uid\}\s*<\/td>/g, '');

// Replace the Mobile Card Layout
const mobileLayoutRegex = /\{\/\* Mobile Card Layout \*\/\}\s*<div className="sm:hidden divide-y divide-slate-100 p-4 space-y-4">[\s\S]*?(?=<\/div>\s*<\/div>\s*<\/div>\s*\) : activeTab === "USERS" \? \()/;

const newMobileLayout = `
                  {/* Mobile Accordion Layout */}
                  <div className="sm:hidden divide-y divide-slate-100 p-4 space-y-4">
                    {filteredDrivers.map((d) => (
                      <details
                        key={d.uid}
                        className="bg-slate-50 rounded-[1.5rem] border border-slate-100 group [&_summary::-webkit-details-marker]:hidden"
                      >
                        <summary className="p-5 cursor-pointer list-none flex justify-between items-center outline-none">
                          <div className="flex flex-col">
                            <h4 className="text-sm font-black text-slate-900 italic tracking-tighter leading-none">
                              {d.name}
                            </h4>
                            <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">
                               {d.vNo || "Unspecified Unit"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className={\`w-2 h-2 rounded-full \${d.status === "active" ? "bg-green-500" : "bg-red-500"}\`} />
                             <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
                          </div>
                        </summary>
                        <div className="px-5 pb-5 pt-2 border-t border-slate-100/50 space-y-4">
                          {d.phone && (
                            <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-slate-50">
                               <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Phone</p>
                               <p className="text-[10px] font-mono font-bold text-slate-700">{d.phone}</p>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-50 flex flex-col items-center">
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">GPS Tracking ID</p>
                              <p className="text-[10px] font-mono font-black text-amber-600">{d.gpsId || "UNLINKED"}</p>
                            </div>
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-50 flex flex-col items-center">
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Tier</p>
                              <p className="text-[10px] font-black text-amber-600">{d.subscriptionTier || "FREE"}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 pt-2">
                            <button
                              onClick={() => {
                                setSelectedDriverForEarning(d);
                                setShowEarningModal(true);
                              }}
                              className="w-full py-3 bg-amber-500 text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"
                            >
                              <Wallet size={12} /> Make Payment
                            </button>
                            {d.status !== "active" && !d.accessKey && (
                              <button
                                onClick={() => {
                                  setSelectedDriverForProvision(d);
                                  setShowProvisionModal(true);
                                }}
                                className="w-full py-3 bg-slate-900 text-amber-500 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"
                              >
                                <Smartphone size={12} /> Provision Device
                              </button>
                            )}
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
`;

if (mobileLayoutRegex.test(content)) {
   content = content.replace(mobileLayoutRegex, newMobileLayout.trim());
   fs.writeFileSync('./src/components/portals/AdminPortal.tsx', content);
   console.log("Successfully patched mobile card layout and table.");
} else {
   console.log("Regex did not match.");
   fs.writeFileSync('./debug_mobile.txt', content);
}
