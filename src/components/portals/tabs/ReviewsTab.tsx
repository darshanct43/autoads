import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, X, Video, Monitor, Trash2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Driver } from "@/services/firebaseService";
import { getSafeUrl } from "../AdminPortal";

interface ReviewsTabProps {
  drivers: Driver[];
  campaigns: any[];
  firebaseService: any;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  handleRejectCampaign: (id: string) => void;
  handleApproveCampaign: (id: string) => void;
  handleDeleteCampaign: (id: string) => void;
}

export const ReviewsTab: React.FC<ReviewsTabProps> = ({
  drivers,
  campaigns,
  firebaseService,
  showToast,
  handleRejectCampaign,
  handleApproveCampaign,
  handleDeleteCampaign,
}) => {
  const [previewDoc, setPreviewDoc] = React.useState<{ url: string, label: string } | null>(null);

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] p-8 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none">{previewDoc.label}</h3>
                <button onClick={() => setPreviewDoc(null)} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                  <X size={20} className="text-slate-900" />
                </button>
              </div>
              <div className="flex-1 bg-slate-50 rounded-2xl overflow-auto border border-slate-200 flex items-center justify-center p-4">
                 <img src={previewDoc.url} alt={previewDoc.label} className="max-w-full h-auto rounded-lg shadow-lg" referrerPolicy="no-referrer" />
              </div>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="mt-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
              >
                Close Preview
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-amber-500 p-6 md:p-8 rounded-[2rem] shadow-xl shadow-amber-500/10 text-slate-950 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />
        <div className="relative z-10 font-sans">
          <h2 className="text-2xl md:text-5xl font-bold tracking-tight">
            Quality Control
          </h2>
          <p className="text-[10px] md:text-[12px] font-bold uppercase tracking-[0.3em] mt-3 opacity-60">
            Pending Campaign Review Queue
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-8">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 ml-2">Campaign Submissions ({campaigns.filter(c => c.status === "PENDING" || (c.status === "AWAITING_PAYPORTAL" && c.paymentStatus === "PAYMENT_LINK_SENT")).length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 font-sans">
          {campaigns.filter((c) => c.status === "PENDING" || (c.status === "AWAITING_PAYPORTAL" && c.paymentStatus === "PAYMENT_LINK_SENT")).length > 0 ? (
            campaigns
              .filter((c) => c.status === "PENDING" || (c.status === "AWAITING_PAYPORTAL" && c.paymentStatus === "PAYMENT_LINK_SENT"))
              .map((c) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all flex flex-col h-full group font-sans"
                >
                  <div className="h-56 bg-slate-950 relative overflow-hidden shrink-0 italic">
                    {c?.mediaType === "IMAGE" ? (
                      <img
                        src={getSafeUrl(c.mediaUrl)}
                        alt=""
                        className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-all duration-1000"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900">
                        <Video className="text-slate-700 w-16 h-16 mb-4" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                          Video Stream Initialization
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                    <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
                      <span className="bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-500 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-2xl">
                        {(() => {
                          if (c.paymentStatus === 'PAYMENT_LINK_SENT') return "Payment Link Sent";
                          if (!c.paymentReceived) return "Awaiting Payment";
                          if ((c as any).needDesigner && !(c as any).designerApproved) return "Waiting for Designer/User Satisfaction";
                          if (c.mediaReceived || c.mediaUrl || c.assetUrl) return "Admin: Recv Payment & Media Ready";
                          return "Awaiting Final Review";
                        })()}
                      </span>
                      {(c as any).needDesigner && (
                        <span className="bg-blue-500/20 backdrop-blur-md border border-blue-500/30 text-blue-500 px-3 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest">
                          Designer Selected
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 md:p-6 flex flex-col flex-1 font-sans">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-slate-900 tracking-tight truncate">
                          {c.title}
                        </h4>
                        {c.uid && (
                          <span className="text-[8px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-200">
                            {c.uid}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 font-mono flex items-center gap-2">
                        ID: {c.id?.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                        Requested Lifespan: <span className="text-slate-900 font-extrabold">{c.durationDays || 30} Days</span>
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <div className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest border",
                          c.paymentReceived ? "bg-green-50 text-green-500 border-green-100" : "bg-red-50 text-red-500 border-red-100"
                        )}>
                          {c.paymentReceived ? "PAID" : "UNPAID"}
                        </div>
                        <div className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest border",
                          (c.mediaReceived || c.mediaUrl || c.assetUrl) ? "bg-green-50 text-green-500 border-green-100" : "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          {(c.mediaReceived || c.mediaUrl || c.assetUrl) ? "READY" : "PENDING"}
                        </div>
                      </div>
                    </div>
                      <div className="grid grid-cols-2 gap-3 mt-8">
                        <button
                          onClick={() => handleRejectCampaign(c.id!)}
                          className="py-4 border border-slate-100 text-red-500 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 hover:border-red-100 transition-all"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveCampaign(c.id!)}
                          className="py-4 bg-slate-900 text-amber-500 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                        >
                          Approve
                        </button>
                      </div>
                    <button
                      onClick={() => handleDeleteCampaign(c.id!)}
                      className="w-full mt-3 py-3 text-slate-400 hover:text-red-500 transition-colors text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 font-sans"
                    >
                      <Trash2 size={12} />
                      Purge Submission
                    </button>
                  </div>
                </motion.div>
              ))
          ) : (
            <div className="col-span-full py-24 bg-white border border-slate-50 border-dashed rounded-[3rem] flex flex-col items-center justify-center text-slate-200 gap-6 grayscale">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center">
                <Monitor size={40} className="opacity-20" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-sm font-black text-slate-400 uppercase italic">
                  Queue Equilibrium Reached
                </h4>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  All pending submissions have been processed.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
