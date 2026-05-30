const fs = require('fs');
let content = fs.readFileSync('./src/components/portals/AdminPortal.tsx', 'utf8');

const txTableRegex = /<table className="w-full text-left">[\s\S]*?<\/table>/;
if (txTableRegex.test(content)) {
   const updatedTable = content.match(txTableRegex)[0].replace(/<table className="w-full text-left">/, '<table className="w-full text-left hidden sm:table">');
   
   const newMobileLayout = `
                  {/* Mobile vertical layout */}
                  <div className="sm:hidden divide-y divide-slate-100 p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                     {(paymentSubTab === "INCOME" 
                        ? payments.slice((paymentsPage - 1) * itemsPerPage, paymentsPage * itemsPerPage)
                        : driverPayments.slice((driverPaymentsPage - 1) * itemsPerPage, driverPaymentsPage * itemsPerPage)
                     ).map((p) => (
                        <div key={p.id} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-3 flex flex-col">
                           <div className="flex justify-between items-start">
                              <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                    {paymentSubTab === "INCOME" ? 'Transaction' : 'Payout'}
                                 </p>
                                 <p className="text-xl font-black text-slate-900 italic leading-none mt-1">₹{p.amount?.toLocaleString()}</p>
                              </div>
                              <span className={\`px-2 py-1 flex items-center rounded text-[8px] font-black uppercase tracking-widest border \${
                                  ["SUCCESS", "success", "PAID", "paid", "COMPLETED"].includes(p.status) 
                                    ? "bg-green-50 text-green-600 border-green-100" 
                                    : ["PENDING", "pending", "PROCESSING"].includes(p.status)
                                    ? "bg-amber-50 text-amber-600 border-amber-100"
                                    : "bg-red-50 text-red-600 border-red-100"
                                }\`}>
                                  {p.status}
                              </span>
                           </div>
                           <div className="flex gap-4 items-center bg-white p-3 rounded-2xl border border-slate-50">
                              <div className="flex-1 overflow-hidden">
                                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Entity</p>
                                 <p className="text-[10px] font-black text-slate-700 uppercase truncate text-ellipsis">{paymentSubTab === "INCOME" ? (p.customerId || p.customerPhone || "Guest") : \`Driver: \${p.driverId?.slice(0, 8)}\`}</p>
                              </div>
                              <div className="h-8 w-px bg-slate-100" />
                              <div className="flex-1 text-right overflow-hidden">
                                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Auth ID</p>
                                 <p className="text-[10px] font-mono text-slate-500 uppercase truncate text-ellipsis">{p.transactionId || p.id?.slice(0, 8)}</p>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
   `;
   
   content = content.replace(txTableRegex, updatedTable + '\\n' + newMobileLayout);
   fs.writeFileSync('./src/components/portals/AdminPortal.tsx', content);
   console.log('Successfully patched transactions UI');
} else {
   console.log('Tx Regex failed');
}
