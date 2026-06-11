import React from "react";
import { Download, RefreshCw, Zap, MousePointer2, ArrowLeft, Video, Search, Truck, Send, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Driver } from "@/services/firebaseService";
import { getSafeUrl } from "../AdminPortal";

interface CampaignsTabProps {
  [key: string]: any;
}

export const CampaignsTab: React.FC<CampaignsTabProps> = ({
  campaigns,
  selectedCampaign,
  setSelectedCampaign,
  drivers,
  isExtracting,
  handleExtractionClick,
  isEditingMedia,
  setIsEditingMedia,
  editMediaUrl,
  setEditMediaUrl,
  editMediaType,
  setEditMediaType,
  editMediaFile,
  setEditMediaFile,
  editUploadProgress,
  handleUpdateMedia,
  isUpdatingMedia,
  searchTerm,
  setSearchTerm,
  selectedArea,
  setSelectedArea,
  selectedDriverIds,
  setSelectedDriverIds,
  handleBulkAssign,
  isAssigning,
  filteredDrivers,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-4 md:p-6 rounded-2xl text-white relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-amber-500 tracking-tight">
              Campaign Matrix
            </h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">
              Fleet Deployment Control
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => handleExtractionClick(e, campaigns, "Campaign_Deployment_Records")}
              disabled={isExtracting}
              className="bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-xl border border-white/10 text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isExtracting ? <RefreshCw size={14} className="animate-spin text-amber-500" /> : <Download size={14} className="text-amber-500" />}
              {isExtracting ? "Extracting..." : "Extract Matrix"}
            </button>
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] font-bold text-white uppercase tracking-widest">
                  {campaigns.filter((c) => c.status === "ACTIVE").length}
                </p>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                  Active nodes
                </p>
              </div>
              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-amber-500">
                <Zap size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Deployment Inventory
            </h3>
            <span className="text-[11px] font-bold text-slate-400">
              {campaigns.filter((c) => c.status === "ACTIVE" && !c.title.toLowerCase().includes("showcase")).length}{" "}
              Active
            </span>
          </div>
          <div className="divide-y divide-slate-50 overflow-y-auto">
            {campaigns
              .filter((c) => c.status === "ACTIVE" && !c.title.toLowerCase().includes("showcase"))
              .map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "p-6 flex items-center justify-between hover:bg-slate-50 transition-all cursor-pointer group",
                    selectedCampaign?.id === c.id &&
                      "bg-amber-50 border-r-4 border-amber-500"
                  )}
                  onClick={() => setSelectedCampaign(c)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all overflow-hidden border border-slate-200 shadow-sm">
                      {c.mediaType === "IMAGE" ? (
                        <img src={getSafeUrl(c.mediaUrl)} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <Video size={20} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-xs font-bold text-slate-900 leading-none truncate">
                          {c.title}
                        </p>
                        {c.uid && (
                          <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-tighter">
                            {c.uid}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-bold bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-widest text-slate-600">
                          {c.planId || "PRO"}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                          {c.assignedDrivers?.length || 0} Nodes Linked
                        </span>
                      </div>
                    </div>
                  </div>
                  <Zap size={16} className={cn("text-slate-200 group-hover:text-amber-500 transition-all duration-300", selectedCampaign?.id === c.id && "text-amber-500")} />
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col relative min-h-[400px]">
          {!selectedCampaign ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-slate-50/50 backdrop-blur-[2px] z-10 text-center">
              <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-4 border border-slate-200/50 animate-bounce">
                <MousePointer2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase">
                  Selection Required
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] max-w-[200px]">
                  Select a campaign from the deployment inventory to configure node targeting.
                </p>
              </div>
            </div>
          ) : null}

          <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedCampaign(null)}
                className="p-2 bg-white text-slate-400 hover:text-slate-900 rounded-xl border border-slate-200 transition-all flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest hidden xs:inline">Back</span>
              </button>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Node Activation Control
              </h3>
            </div>
            {selectedCampaign?.uid && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[9px] font-bold uppercase rounded-lg border border-amber-200">
                REF: {selectedCampaign.uid}
              </span>
            )}
          </div>

          <div className="p-4 border-b border-slate-50 bg-slate-50/10 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em]">Media Content & Type</h4>
                {!isEditingMedia ? (
                  <button
                    onClick={() => {
                      setEditMediaUrl(selectedCampaign?.mediaUrl || selectedCampaign?.assetUrl || "");
                      setEditMediaType(selectedCampaign?.mediaType || "IMAGE");
                      setIsEditingMedia(true);
                    }}
                    className="text-[8px] font-bold text-amber-600 uppercase hover:underline"
                  >
                    Edit Media link
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingMedia(false)}
                    className="text-[8px] font-bold text-slate-400 uppercase hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {isEditingMedia ? (
                <div className="space-y-3">
                  <div className="relative group/edit">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => setEditMediaFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={cn(
                      "p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all",
                      editMediaFile ? "border-amber-500 bg-amber-50/10" : "border-slate-100 bg-slate-50/50"
                    )}>
                      {editMediaFile ? (
                        <>
                          <Check size={20} className="text-amber-500" />
                          <p className="text-[9px] font-black uppercase text-slate-900 truncate max-w-full px-4">{editMediaFile.name}</p>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={20} className="text-slate-300" />
                          <p className="text-[9px] font-black uppercase text-slate-400 font-sans">Swap with New File</p>
                        </>
                      )}
                    </div>
                  </div>

                  {!editMediaFile && (
                    <>
                      <div className="flex items-center gap-4 py-1">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-[7px] font-black text-slate-300 uppercase">OR</span>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>
                      <input
                        type="text"
                        value={editMediaUrl}
                        onChange={(e) => setEditMediaUrl(e.target.value)}
                        placeholder="External Asset URL..."
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-[10px] font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
                      />
                    </>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditMediaType("IMAGE")}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all",
                        editMediaType === "IMAGE" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-100"
                      )}
                    >
                      Image
                    </button>
                    <button
                      onClick={() => setEditMediaType("VIDEO")}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all",
                        editMediaType === "VIDEO" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-100"
                      )}
                    >
                      Video
                    </button>
                  </div>

                  {editUploadProgress > 0 && editUploadProgress < 100 && (
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${editUploadProgress}%` }} />
                    </div>
                  )}

                  <button
                    onClick={handleUpdateMedia}
                    disabled={isUpdatingMedia}
                    className="w-full py-3 bg-amber-500 text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isUpdatingMedia ? "Processing..." : "Secure Node Asset"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-10 bg-slate-900 rounded-lg overflow-hidden border border-slate-200">
                    {selectedCampaign?.mediaType === "IMAGE" ? (
                      <img src={getSafeUrl(selectedCampaign?.mediaUrl)} className="w-full h-full object-cover opacity-60" alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video size={14} className="text-slate-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-tight truncate font-sans">
                      {selectedCampaign?.mediaUrl || "NOT LINKED"}
                    </p>
                    <p className="text-[7px] font-bold text-amber-600 uppercase mt-0.5">{selectedCampaign?.mediaType || "NO"} ASSET ACTIVE</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1 font-sans">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search nodes by name, number, city..."
                  className="w-full bg-white border border-slate-200 p-4 pl-12 rounded-2xl text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all shadow-sm h-14"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="bg-white border border-slate-200 px-4 rounded-2xl text-[9px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-amber-500/20 h-14"
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
              >
                <option value="ALL">All Areas</option>
                {Array.from(new Set(drivers.map(d => d.city).filter(Boolean))).map((city: any) => (
                  <option key={city} value={city}>{city?.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-2">
            {filteredDrivers.map((d) => (
              <label
                key={d.uid}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border",
                  selectedDriverIds.includes(d.uid)
                    ? "bg-amber-50 border-amber-200"
                    : "bg-white border-transparent hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                    checked={selectedDriverIds.includes(d.uid)}
                    onChange={(e) =>
                      e.target.checked
                        ? setSelectedDriverIds([...selectedDriverIds, d.uid])
                        : setSelectedDriverIds(selectedDriverIds.filter((id) => id !== d.uid))
                    }
                  />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-amber-500 group-hover:text-white transition-all">
                      <Truck size={20} />
                    </div>
                    <div>
                      <span className="text-[11px] font-black uppercase text-slate-900 block leading-none">
                        {d.name}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-widest font-sans">
                          AUTO NO: {d.vNo || "NOT SET"}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                          {d.city || "GLOBAL"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    d.status === "active" ? "bg-green-500" : "bg-slate-300"
                  )}
                />
              </label>
            ))}
          </div>

          <div className="p-8 bg-slate-950 border-t border-slate-800 mt-auto">
            <button
              onClick={handleBulkAssign}
              disabled={isAssigning || selectedDriverIds.length === 0}
              className="w-full py-5 bg-amber-500 text-slate-950 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-amber-500/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isAssigning
                ? "Synchronizing Cluster..."
                : `Deploy to ${selectedDriverIds.length} Selective Units`}
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
