const fs = require('fs');
let content = fs.readFileSync('./src/components/portals/AdminPortal.tsx', 'utf8');

content = content.split('Payment\\n                              </button>').join(\`Payment
                              </button>
                              {d.status === 'pending_verification' && (
                                <button
                                  onClick={() => {
                                    setSelectedDriverForAgreement(d);
                                  }}
                                  className="text-[8px] font-black bg-amber-500 text-slate-950 px-3 py-2 rounded-lg uppercase tracking-[0.2em] shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                                >
                                  REVIEW 
                                </button>
                              )}\`);

content = content.split('Make Payment\\n                            </button>').join(\`Make Payment
                            </button>
                            {d.status === 'pending_verification' && (
                              <button
                                onClick={() => {
                                  setSelectedDriverForAgreement(d);
                                }}
                                className="w-full py-3 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm flex justify-center items-center gap-2"
                              >
                                REVIEW DOCS
                              </button>
                            )}\`);

fs.writeFileSync('./src/components/portals/AdminPortal.tsx', content);
