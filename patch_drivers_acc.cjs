const fs = require('fs');
let content = fs.readFileSync('./src/components/portals/AdminPortal.tsx', 'utf8');

const tableStart = content.indexOf('<div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">');
const usersTabLocation = content.indexOf('activeTab === "USERS"');
// Find the exact closing parenthesis before users tab to replace everything
const endSegment = content.substring(tableStart, usersTabLocation);
const endOfDriversIndex = endSegment.lastIndexOf(')') + tableStart;

if (tableStart !== -1 && endOfDriversIndex > tableStart) {
  const newAccordion = `
              <div className="bg-transparent">
                  <div className="space-y-4">
                    {filteredDrivers.map((d) => (
                      <details
                        key={d.uid}
                        className="bg-white rounded-[2rem] border border-slate-100 group [&_summary::-webkit-details-marker]:hidden shadow-sm overflow-hidden"
                      >
                        <summary className="p-6 md:p-8 cursor-pointer list-none flex flex-col md:flex-row justify-between items-start md:items-center outline-none gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-950 rounded-[1.5rem] overflow-hidden relative border border-slate-100 shadow-sm shrink-0">
                                <img src={d.profileImage || \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${d.uid}\`} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col">
                              <h4 className="text-sm md:text-xl font-black text-slate-900 italic tracking-tighter leading-none">
                                {d.name}
                              </h4>
                              <span className="text-[10px] md:text-xs font-bold text-slate-500 mt-1.5 uppercase tracking-[0.2em]">
                                 {d.vNo || "Unspecified Unit"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 w-full md:w-auto mt-2 md:mt-0 justify-between md:justify-end">
                             <div className="flex items-center gap-2 bg-slate-50 p-2 md:p-3 rounded-2xl border border-slate-100">
                               <div className={\`w-2.5 h-2.5 rounded-full \${d.status === "active" ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"}\`} />
                               <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-700">{d.status}</span>
                             </div>
                             <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform" />
                          </div>
                        </summary>
                        <div className="px-6 md:px-8 pb-6 md:pb-8 pt-0 space-y-4">
                          <div className="w-full border-t border-slate-50 mb-4" />
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-50 p-5 rounded-[1.5rem] flex flex-col justify-center">
                               <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Phone Contact</p>
                               <p className="text-xs font-mono font-black text-slate-700">{d.phone || "UNSPECIFIED"}</p>
                            </div>
                            <div className="bg-slate-50 p-5 rounded-[1.5rem] flex flex-col justify-center">
                              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">GPS Tracking ID</p>
                              <p className="text-xs font-mono font-black text-amber-600">{d.gpsId || "UNLINKED"}</p>
                            </div>
                            <div className="bg-slate-50 p-5 rounded-[1.5rem] flex flex-col justify-center">
                              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Subscription / Tier</p>
                              <p className="text-xs font-black text-slate-700 uppercase tracking-widest">{d.subscriptionTier || "FREE"}</p>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-50">
                            <button
                              onClick={() => {
                                setSelectedDriverForEarning(d);
                                setShowEarningModal(true);
                              }}
                              className="flex-1 md:flex-none px-6 py-4 bg-amber-500 text-slate-950 rounded-[1.2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-amber-500/20 hover:scale-105 transition-all text-center"
                            >
                              Make Payment
                            </button>
                            {d.status === 'pending_verification' && (
                              <button
                                onClick={() => {
                                  setSelectedDriverForAgreement(d);
                                }}
                                className="flex-1 md:flex-none px-6 py-4 bg-slate-900 text-amber-500 rounded-[1.2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all text-center flex items-center justify-center gap-2"
                              >
                                <Shield size={14} /> REVIEW DOCS
                              </button>
                            )}
                            {d.status !== "active" && !d.accessKey && (
                              <button
                                onClick={() => {
                                  setSelectedDriverForProvision(d);
                                  setShowProvisionModal(true);
                                }}
                                className="flex-1 md:flex-none px-6 py-4 bg-white border-2 border-slate-100 text-slate-500 rounded-[1.2rem] text-[10px] font-black uppercase tracking-[0.2em] hover:border-amber-500 hover:text-slate-900 transition-all text-center flex items-center justify-center gap-2"
                              >
                                <DeviceIcon size={14} /> Provision Device
                              </button>
                            )}
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
              </div>\n`;
  content = content.substring(0, tableStart) + newAccordion + content.substring(endOfDriversIndex);
  fs.writeFileSync('./src/components/portals/AdminPortal.tsx', content);
  console.log("Replaced Drivers Table with Desktop/Mobile Accordion");
} else {
  console.log("Could not find table start relative to USERS tab");
}
