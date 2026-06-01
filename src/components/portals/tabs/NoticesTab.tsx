import React from "react";
import { Zap, X, Download, Trash2 } from "lucide-react";
import { getSafeUrl } from "../AdminPortal";

interface NoticesTabProps {
  setActiveTab: (tab: string) => void;
  handleCreateNotice: (e: React.FormEvent) => void;
  newNotice: { offer: string; targetRegion: string; message: string; imageUrl: string };
  setNewNotice: React.Dispatch<React.SetStateAction<{ offer: string; targetRegion: string; message: string; imageUrl: string }>>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  notices: any[];
  handleDeleteNotice: (id: string) => void;
}

export const NoticesTab: React.FC<NoticesTabProps> = ({
  setActiveTab,
  handleCreateNotice,
  newNotice,
  setNewNotice,
  handleFileUpload,
  isUploading,
  notices,
  handleDeleteNotice,
}) => {
  return (
    <div className="fixed inset-0 left-0 md:left-20 z-20 bg-slate-50 p-6 md:p-10 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-slate-900 p-6 md:p-8 rounded-2xl text-white flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Zap size={120} />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black italic uppercase text-amber-500">
              Offer Hub
            </h2>
            <p className="text-[10px] font-black uppercase text-slate-400">
              Manage Global Customer Signal Offers
            </p>
          </div>
          <button
            onClick={() => setActiveTab("DASHBOARD")}
            className="p-3 bg-white/10 rounded-2xl relative z-10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
          <h3 className="text-sm font-black uppercase italic tracking-widest text-slate-900">
            Broadcast New Signal
          </h3>
          <form
            onSubmit={handleCreateNotice}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Offer Headline
              </label>
              <input
                type="text"
                placeholder="e.g. PLATINUM REBATE 20%"
                value={newNotice.offer}
                onChange={(e) =>
                  setNewNotice({
                    ...newNotice,
                    offer: e.target.value.toUpperCase(),
                  })
                }
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Target Region
              </label>
              <input
                type="text"
                placeholder="e.g. PAN-INDIA / BENGALURU"
                value={newNotice.targetRegion}
                onChange={(e) =>
                  setNewNotice({
                    ...newNotice,
                    targetRegion: e.target.value.toUpperCase(),
                  })
                }
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Detailed Message
              </label>
              <textarea
                placeholder="Write a compelling call to action..."
                rows={3}
                value={newNotice.message}
                onChange={(e) =>
                  setNewNotice({ ...newNotice, message: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
              />
            </div>
            <div className="md:col-span-2 space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Offer Visual (Flex/Poster)
              </label>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    placeholder="https://... (Direct Image URL)"
                    value={newNotice.imageUrl}
                    onChange={(e) =>
                      setNewNotice({
                        ...newNotice,
                        imageUrl: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  />
                </div>

                <div className="flex items-center">
                  <span className="text-[8px] font-black text-slate-300 uppercase px-2">
                    OR
                  </span>
                  <label className="cursor-pointer flex flex-col items-center justify-center px-6 py-4 bg-amber-500 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-600 transition-all border-2 border-transparent relative">
                    <div className="flex items-center gap-2">
                      <Download size={16} className="rotate-180" />
                      {isUploading ? "Uploading..." : "Upload File"}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>

              {newNotice.imageUrl && (
                <div className="mt-2 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 aspect-video relative group max-w-sm">
                  <img
                    src={getSafeUrl(newNotice.imageUrl)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setNewNotice((prev) => ({ ...prev, imageUrl: "" }))
                    }
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button className="px-8 py-4 bg-slate-950 text-amber-500 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all">
                Publish Hub Offer
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic">
            Active Signal Pool ({notices.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative group overflow-hidden"
              >
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded uppercase tracking-widest border border-amber-500/20">
                      {notice.targetRegion || "ALL SIGNALS"}
                    </span>
                    <h4 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 leading-tight">
                      {notice.offer}
                    </h4>
                  </div>
                  <button
                    onClick={() => handleDeleteNotice(notice.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {notice.imageUrl && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 aspect-video relative z-10">
                    <img
                      src={getSafeUrl(notice.imageUrl)}
                      alt={notice.offer}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed mt-4 relative z-10">
                  {notice.message}
                </p>
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-slate-50 rounded-full translate-x-12 translate-y-12 group-hover:scale-150 transition-transform" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
