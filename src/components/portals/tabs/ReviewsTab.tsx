import React from "react";
import { motion } from "motion/react";
import { Check, X, Video, Monitor, Trash2 } from "lucide-react";
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
  return (
    <div className="space-y-8">
      <div className="bg-amber-500 p-6 md:p-8 rounded-[2rem] shadow-xl shadow-amber-500/10 text-slate-950 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />
        <div className="relative z-10 font-sans">
          <h2 className="text-2xl md:text-5xl font-black italic uppercase leading-none">
            Quality Control
          </h2>
          <p className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] mt-3 opacity-60">
            Pending Global Verification Queue
          </p>
        </div>
      </div>

      <div className="space-y-4 pb-12 font-sans">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Pending Driver Onboarding ({drivers.filter(d => d.status === "pending_verification").length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 font-sans">
          {drivers.filter(d => d.status === "pending_verification").map((d) => (
            <motion.div
              key={d.uid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all flex flex-col group font-sans"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-950 rounded-2xl overflow-hidden relative border border-slate-800">
                    <img
                      src={getSafeUrl(d.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.uid}`)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 uppercase leading-none mb-1">{d.name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{d.city || "Unknown Location"}</p>
                    {d.phone && <p className="text-[10px] font-bold font-mono text-slate-500 mt-1 uppercase">Phone: {d.phone}</p>}
                    {d.email && <p className="text-[9px] font-medium font-mono text-slate-400 truncate max-w-[150px]">{d.email}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    { label: "Aadhaar", key: "aadharPhoto" },
                    { label: "RC", key: "rcPhoto" },
                    { label: "License", key: "dlPhoto" },
                    { label: "PAN", key: "panPhoto" },
                    { label: "Insurance", key: "insurancePhoto" },
                    { label: "Selfie", key: "profileImage" }
                  ].map(doc => (
                    <div key={doc.key} className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col items-center justify-center gap-1">
                      <span className="text-[7px] font-black uppercase text-slate-400">{doc.label}</span>
                      {((d as any)[doc.key] || (doc.key === "aadharPhoto" && (d as any).documents?.aadhaar) || (doc.key === "dlPhoto" && (d as any).documents?.drivingLicense) || (doc.key === "profileImage" && (d as any).documents?.selfie)) ? (
                        <Check size={12} className="text-green-500" />
                      ) : (
                        <X size={12} className="text-slate-300" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => {
                      const newId = d.terminalId || `DEVICE-${Math.floor(1000 + Math.random() * 9000)}`;
                      const newKey = d.accessKey || Math.floor(1000 + Math.random() * 9000).toString();
                      firebaseService.updateDriverProfile(d.id, {
                        status: "active",
                        isVerified: true,
                        kycStatus: "APPROVED",
                        payoutEnabled: true,
                        adminApproved: true,
                        terminalId: newId,
                        accessKey: newKey,
                        provisionStatus: "PROVISIONED"
                      });

                      // Auto-approve the agreement if they are being quick approved
                      firebaseService.updateDriverAgreement(d.id, {
                        agreementAccepted: true,
                        acceptedAt: new Date().toISOString(),
                        version: "1.0",
                        ipAddress: "admin-provisioned"
                      });
                      showToast("Driver Approved & Terminal Provisioned", "success");
                    }}
                    className="py-4 bg-slate-900 text-amber-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 font-sans"
                  >
                    Quick Approve
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {drivers.filter(d => d.status === "pending_verification").length === 0 && (
            <div className="col-span-full py-12 bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">No pending driver verifications</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 pt-8">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Campaign Submissions ({campaigns.filter(c => c.status === "PENDING" || (c.status === "AWAITING_PAYPORTAL" && c.paymentStatus === "PAYMENT_LINK_SENT")).length})</h3>
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
                      <h4 className="text-lg font-black text-slate-900 uppercase leading-none truncate">
                        {c.title}
                      </h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
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
                        className="py-4 border border-slate-100 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:border-red-100 transition-all font-sans"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveCampaign(c.id!)}
                        className="py-4 bg-slate-900 text-amber-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 font-sans"
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
