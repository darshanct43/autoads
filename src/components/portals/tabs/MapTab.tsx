// @ts-nocheck
import React, { useEffect, useRef } from "react";
import { Radio, AlertTriangle, AlertCircle, Activity, X, MapPin, Truck, Check } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Driver } from "@/services/firebaseService";
import { getSafeUrl } from "../AdminPortal";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

interface MapTabProps {
  [key: string]: any;
}

// InvalidateMap component to fix leaflet gray tiles issue
function InvalidateMap() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 500);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// ChangeView component to fly map focus smoothly
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const lastCenter = useRef(center);

  useEffect(() => {
    if (center[0] !== lastCenter.current[0] || center[1] !== lastCenter.current[1]) {
      map.flyTo(center, zoom, { duration: 1.5 });
      lastCenter.current = center;
    }
  }, [center, zoom, map]);
  return null;
}

export const MapTab: React.FC<MapTabProps> = ({
  activeTab,
  mapCenter,
  mapZoom,
  searchTerm,
  setSearchTerm,
  driverLocations,
  showCoverage,
  setShowCoverage,
  showIssues,
  setShowIssues,
  campaigns,
  selectedDriverHistory,
  setSelectedDriverHistory,
  tickets,
  drivers,
  selectedLocation,
  setSelectedLocation,
  handleFetchDriverHistory,
  ticketNotifications,
  setTicketNotifications,
  setActiveTab,
  liveUnitsCount,
  setMapCenter,
  setMapZoom,
}) => {
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
  };

  const getComplianceStatus = (loc: any) => {
    const activeCampaign = campaigns.find(
      (c) => c.assignedDrivers?.includes(loc.id) && c.status === "ACTIVE"
    );
    if (!activeCampaign || !activeCampaign.targetLat) return { status: "idle", distance: 0 };

    const dist = calculateDistance(
      loc.lat,
      loc.lng,
      activeCampaign.targetLat,
      activeCampaign.targetLng
    );
    const isCompliant = dist <= (activeCampaign.coverageRadius || 5000);

    return {
      status: isCompliant ? "compliant" : "off-course",
      distance: Math.round(dist),
      campaign: activeCampaign.title,
      limit: activeCampaign.coverageRadius || 5000,
    };
  };

  return (
    <div className="flex flex-col space-y-4 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4 shrink-0 px-1 font-sans">
        <div>
          <h2 className="text-base md:text-2xl font-black italic uppercase text-slate-900 leading-none">
            Active Network Overview
          </h2>
          <p className="text-[8px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic mt-1 md:mt-2">
            Live Fleet Telemetry Cluster
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="flex-1 md:flex-none relative">
            <Radio className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="SEARCH GPS ID..."
              className="w-full md:w-48 pl-10 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl shadow-sm text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-amber-500"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">
              Online: {driverLocations.filter((l) => l.isOnline).length}
            </span>
          </div>
          <div className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none">
              Inactive: {driverLocations.filter((l) => !l.isOnline).length}
            </span>
          </div>
          <button
            onClick={() => setShowCoverage(!showCoverage)}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all shadow-sm",
              showCoverage ? "bg-amber-500 text-slate-950 border-amber-600" : "bg-white text-slate-400 border-slate-100"
            )}
          >
            <div className={cn("w-1.5 h-1.5 rounded-full", showCoverage ? "bg-slate-950" : "bg-slate-300")} />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">
              Coverage: {showCoverage ? "ON" : "OFF"}
            </span>
          </button>

          <button
            onClick={() => setShowIssues(!showIssues)}
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-2xl transition-all shadow-lg active:scale-95 group",
              showIssues ? "bg-red-500 text-white shadow-red-500/20" : "bg-white text-slate-400 border border-slate-100"
            )}
          >
            <div className={cn("w-1.5 h-1.5 rounded-full", showIssues ? "bg-white" : "bg-slate-300")} />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">
              Issues: {showIssues ? "VISIBLE" : "HIDDEN"}
            </span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 relative">
        <div className="bg-slate-100 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden border border-slate-100 shadow-xl h-[500px] md:h-[650px] lg:h-[750px] md:flex-1 z-10 font-sans">
          <MapContainer
            key={activeTab}
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full outline-none"
            style={{ height: "100%", width: "100%", background: "#f8fafc" }}
            zoomControl={true}
            dragging={true}
            touchZoom={true}
            scrollWheelZoom={false}
            doubleClickZoom={true}
            boxZoom={true}
            keyboard={true}
          >
            <InvalidateMap />
            <div className="absolute top-2 right-12 z-[1000] bg-white/80 backdrop-blur-md px-2 py-1 rounded text-[7px] font-black uppercase text-slate-400 font-mono">
              Map Engine: Leaflet 1.9.4
            </div>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <ChangeView center={mapCenter} zoom={mapZoom} />

            {campaigns
              .filter((c) => c.status === "ACTIVE" && showCoverage)
              .map((camp: any) => (
                <Circle
                  key={camp.id}
                  center={
                    camp.targetLat && camp.targetLng
                      ? [camp.targetLat, camp.targetLng]
                      : [mapCenter[0], mapCenter[1]]
                  }
                  radius={camp.coverageRadius || 5000}
                  pathOptions={{
                    color: "#f59e0b",
                    fillColor: "#f59e0b",
                    fillOpacity: 0.1,
                    weight: 1,
                    dashArray: "5, 10",
                  }}
                >
                  <Popup className="ad-popup font-sans">
                    <div className="p-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">
                        Ad Campaign
                      </p>
                      <h4 className="text-xs font-black text-slate-900">{camp.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">
                        {camp.clientName}
                      </p>
                    </div>
                  </Popup>
                </Circle>
              ))}

            {selectedDriverHistory.length > 1 && (
              <Polyline
                positions={
                  selectedDriverHistory
                    .filter((h) => h.lat && h.lng)
                    .map((h) => [h.lat, h.lng]) as [number, number][]
                }
                pathOptions={{
                  color: "#3b82f6",
                  weight: 4,
                  opacity: 0.6,
                  dashArray: "10, 10",
                  lineJoin: "round",
                }}
              />
            )}

            {showIssues &&
              tickets
                .filter((t) => t.type === "DEVICE" && t.lat && t.lng)
                .map((ticket) => (
                  <Marker
                    key={ticket.id}
                    position={[ticket.lat!, ticket.lng!]}
                    icon={L.divIcon({
                      className: "custom-issue-icon",
                      html: `
                        <div class="relative bg-red-600 w-8 h-8 rounded-lg flex items-center justify-center text-white border-2 border-white shadow-xl animate-bounce">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        </div>
                      `,
                      iconSize: [32, 32],
                      iconAnchor: [16, 16],
                    })}
                  >
                    <Popup className="font-sans">
                      <div className="p-2">
                        <h4 className="text-xs font-black text-red-600 uppercase mb-1">Issue Reported</h4>
                        <p className="text-[10px] font-bold text-slate-900">{ticket.title}</p>
                        <p className="text-[8px] text-slate-400 mt-1">{ticket.status} • {ticket.priority}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

            {driverLocations
                .filter(
                  (loc) =>
                    typeof loc.lat === "number" &&
                    typeof loc.lng === "number" &&
                    loc.lat !== 0 &&
                    loc.lng !== 0
                )
                .map((loc) => {
                  const compliance = getComplianceStatus(loc);
                  const driverObj = drivers.find((d) => d.uid === loc.driverId);
                  return (
                    <Marker
                      key={loc.id}
                      position={[loc.lat, loc.lng]}
                      icon={L.divIcon({
                        className: "custom-div-icon",
                        html: `
                          <div class="relative group">
                            <div class="w-10 h-10 ${loc.isOnline ? "bg-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.4)]" : "bg-slate-800 border-slate-700 opacity-60"} rounded-xl flex items-center justify-center text-white transition-all duration-300 border-2 ${compliance.status === "compliant" ? "border-emerald-500" : compliance.status === "off-course" ? "border-red-500" : "border-amber-500"} transform group-hover:scale-110 active:scale-95 shadow-2xl">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.6 2 11.8 2 12v4c0 .6.4 1 1 1h2"/>
                                <circle cx="7" cy="17" r="2"/>
                                <path d="M9 17h6"/>
                                <circle cx="17" cy="17" r="2"/>
                              </svg>
                            </div>
                            ${loc.isOnline ? `<div class="absolute -top-1.5 -right-1.5 flex h-4 w-4"><span class="animate-ping absolute inline-flex h-full w-full rounded-full ${compliance.status === "compliant" ? "bg-emerald-400" : "bg-green-400"} opacity-75"></span><span class="relative inline-flex rounded-full h-4 w-4 ${compliance.status === "compliant" ? "bg-emerald-500" : "bg-green-500"} border-2 border-white"></span></div>` : ""}
                            ${loc.gpsId ? `
                              <div class="absolute -bottom-1 -left-1 w-4 h-4 bg-blue-600 rounded-lg flex items-center justify-center border-2 border-white shadow-xl z-50 overflow-hidden" title="HARDWARE GPS ACTIVE: ${loc.gpsId}">
                                <div class="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                <div class="absolute inset-0 bg-blue-400/20 animate-ping"></div>
                              </div>
                            ` : ""}
                          </div>
                        `,
                        iconSize: [40, 40],
                        iconAnchor: [20, 20],
                      })}
                      eventHandlers={{
                        click: () => {
                          setSelectedLocation({ ...loc, compliance });
                          setMapCenter([loc.lat, loc.lng]);
                          setMapZoom(16);
                          handleFetchDriverHistory(loc.driverId);
                        },
                      }}
                    >
                      <Popup closeButton={false} className="font-sans">
                        <div className="p-4 w-64 bg-white">
                          <div className="flex items-center gap-3 mb-4">
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-xl relative overflow-hidden", loc.isOnline ? "bg-slate-900 border border-white/10" : "bg-slate-200")}>
                              {driverObj?.profileImage ? (
                                <img src={getSafeUrl(driverObj.profileImage)} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                              ) : (
                                <Truck size={24} className={loc.isOnline ? "text-amber-500" : "text-slate-400"} />
                              )}
                              <div className={cn("absolute top-1 right-1 w-2 h-2 rounded-full border border-white", loc.isOnline ? "bg-green-500" : "bg-red-500")} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-black italic text-slate-900 uppercase truncate">
                                {driverObj?.fullName || `Node [${loc.id?.slice(-6) || "N/A"}]`}
                              </p>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                                ID: {driverObj?.driverCode || "AUTH_REQD"}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2 border-t border-slate-50 pt-3">
                            {compliance.status !== "idle" ? (
                              <>
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Stack</span>
                                  <span className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[120px]">{compliance.campaign}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Proximity</span>
                                  <span className={cn("text-[11px] font-black", compliance.status === "compliant" ? "text-emerald-500" : "text-red-500")}>
                                    {(compliance.distance / 1000).toFixed(2)} KM
                                  </span>
                                </div>

                                <div className={cn(
                                  "p-2 rounded-xl border flex items-center justify-center gap-2 mt-2",
                                  compliance.status === "compliant"
                                    ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                                    : "bg-red-50 border-red-100 text-red-600"
                                )}>
                                  {compliance.status === "compliant" ? <Check size={12} className="shrink-0" /> : <AlertTriangle size={12} className="shrink-0" />}
                                  <span className="text-[9px] font-black uppercase tracking-widest">
                                    {compliance.status === "compliant" ? "Network Compliant" : "Range Violation"}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                                  STANDBY MODE<br /><span className="text-slate-300 font-sans">NO ACTIVE PAYLOAD</span>
                                </p>
                              </div>
                            )}

                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 pt-1">
                              <span className="uppercase tracking-widest">Velocity</span>
                              <span className="text-slate-900">{loc.speed || 0} KM/H</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-4">
                            <button
                              onClick={() => handleFetchDriverHistory(loc.driverId)}
                              className="px-3 py-2.5 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-600 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                            >
                              TRAIL <MapPin size={10} />
                            </button>
                            <button
                              onClick={() => {
                                setMapCenter([loc.lat, loc.lng]);
                                setMapZoom(18);
                              }}
                              className="px-3 py-2.5 bg-slate-950 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95"
                            >
                              FOCUS
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

            {driverLocations.filter((loc) => loc.isOnline && (!loc.lat || loc.lat === 0)).length > 0 && (
              <div className="absolute bottom-6 right-6 z-[1000] bg-red-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest animate-bounce shadow-2xl flex items-center gap-2">
                <AlertTriangle size={14} />
                {driverLocations.filter((loc) => loc.isOnline && (!loc.lat || loc.lat === 0)).length} Units Missing GPS Fix
              </div>
            )}

            <div className="absolute top-6 right-16 z-[1000] space-y-4 font-sans">
              <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-xl space-y-2 hidden md:block w-48">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase text-slate-900 italic">Map Legend</span>
                  <Activity size={10} className="text-amber-500" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                  <span className="text-[8px] font-black uppercase text-slate-600">Online Unit</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-slate-300 rounded-full" />
                  <span className="text-[8px] font-black uppercase text-slate-600">Offline/Syncing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-500/20 border border-amber-500/50 rounded-full" />
                  <span className="text-[8px] font-black uppercase text-slate-600">Ad Coverage Area</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 mt-1">
                  <div className="w-3 h-3 bg-blue-600 rounded-sm flex items-center justify-center">
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                  </div>
                  <span className="text-[8px] font-black uppercase text-slate-600">Hardware GPS</span>
                </div>
              </div>

              {driverLocations.filter((loc) => loc.isOnline && (!loc.lat || loc.lat === 0)).length > 0 && (
                <div className="bg-red-500/90 backdrop-blur-md p-4 rounded-2xl border border-red-400 shadow-xl space-y-3 w-48 text-white font-sans">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest">GPS Fix Alert</span>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                    {driverLocations
                      .filter((loc) => loc.isOnline && (!loc.lat || loc.lat === 0))
                      .map((loc) => {
                        const driver = drivers.find((d) => d.uid === loc.driverId);
                        return (
                          <div key={loc.driverId || Math.random().toString()} className="flex flex-col bg-white/10 p-2 rounded-lg border border-white/10">
                            <span className="text-[8px] font-black uppercase truncate">{driver?.fullName || "Unknown Unit"}</span>
                            <span className="text-[6px] font-bold opacity-70 uppercase">ID: {loc.terminalId || "N/A"}</span>
                          </div>
                        );
                      })}
                  </div>
                  <p className="text-[7px] font-bold uppercase tracking-tighter leading-tight opacity-80">
                    These units are connected but missing location telemetry.
                  </p>
                </div>
              )}
            </div>
          </MapContainer>

          {selectedDriverHistory.length > 0 && (
            <div className="absolute top-6 left-6 z-[1000] w-72 bg-white/95 backdrop-blur-md rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 space-y-6 font-sans">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none mb-1">
                    Node History
                  </h4>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    Live Movement Segment
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDriverHistory([])}
                  className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4 max-h-64 overflow-y-auto pr-3 custom-scrollbar">
                {selectedDriverHistory.slice(0, 20).map((log, i) => (
                  <div
                    key={log.timestamp?.seconds ? `${log.timestamp.seconds}-${i}` : `log-${i}`}
                    className="flex gap-4 relative pb-4 last:pb-0"
                  >
                    {i < selectedDriverHistory.length - 1 && (
                      <div className="absolute left-2 top-4 bottom-0 w-px bg-slate-100" />
                    )}
                    <div className="w-4 h-4 rounded-full bg-amber-500 border-4 border-white shadow-sm mt-0.5 relative z-10" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-black text-slate-900">
                          {new Date(
                            log.timestamp?.toDate?.() || log.timestamp
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </p>
                        <span className="text-[8px] font-black text-amber-500 italic">
                          {Math.round(log.speed || 0)} KPH
                        </span>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                        {log.activeCampaignId === "idle" ? "No Ad Pulse" : "Campaign Active"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-2xl text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Data Nodes
                  </p>
                  <p className="text-sm font-black text-slate-900 italic">
                    {selectedDriverHistory.length}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Exp Core
                  </p>
                  <p className="text-sm font-black text-amber-500 italic font-sans">High</p>
                </div>
              </div>
            </div>
          )}

          <div className="absolute top-2 left-2 md:top-6 md:left-6 z-[400] flex flex-col gap-2 md:gap-3 pointer-events-none scale-90 md:scale-100 origin-top-left font-sans">
            {ticketNotifications.length > 0 && (
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-red-500 text-white p-4 rounded-2xl shadow-2xl border border-red-400 flex items-center gap-4 pointer-events-auto cursor-pointer"
                onClick={() => {
                  setActiveTab("TICKETS");
                  setTicketNotifications([]);
                }}
              >
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">
                    Issue Reported
                  </p>
                  <p className="text-[9px] font-bold opacity-80 uppercase leading-none">
                    {ticketNotifications.length} Active Driver Tickets
                  </p>
                </div>
              </motion.div>
            )}

            <div className="bg-slate-950/90 backdrop-blur-xl p-3 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl flex items-center gap-3 md:gap-4 pointer-events-auto group hover:scale-[1.03] transition-all">
              <div className="w-8 h-8 md:w-12 md:h-12 bg-amber-500 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] shrink-0">
                <Activity size={24} />
              </div>
              <div className="font-sans">
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 opacity-60">
                  Avg Velocity
                </p>
                <div className="flex items-baseline gap-0.5 md:gap-1">
                  <h4 className="text-lg md:text-2xl font-black text-white italic leading-none font-sans">
                    {(
                      driverLocations.reduce((acc, curr) => acc + (curr.speed || 0), 0) /
                      (driverLocations.length || 1)
                    ).toFixed(1)}
                  </h4>
                  <span className="text-[10px] font-black text-amber-500 uppercase leading-none font-sans">
                    km/h
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-80 space-y-4 shrink-0 overflow-y-auto max-h-[300px] md:max-h-none font-sans">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl space-y-6">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-tighter italic">
              Selection Focus
            </h3>
            {selectedLocation ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="text-center p-6 bg-slate-50 rounded-3xl border border-slate-100 italic relative">
                  <div className="absolute top-4 right-4 text-green-500">
                    <div className="w-2 h-2 rounded-full bg-current animate-ping" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Assigned Unit
                  </p>
                  <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                    {drivers.find((d) => d.uid === selectedLocation.driverId)?.name || "Fleet Node"}
                  </h4>
                  <p className="text-[9px] font-bold text-slate-500 font-mono mt-2 uppercase tracking-widest">
                    REF: {selectedLocation.driverId?.slice(0, 12) || "REF_PENDING"}
                  </p>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      label: "Current Latitude",
                      value: selectedLocation.lat?.toFixed(6) || "0.0",
                    },
                    {
                      label: "Current Longitude",
                      value: selectedLocation.lng?.toFixed(6) || "0.0",
                    },
                    {
                      label: "Transmission",
                      value: selectedLocation.isOnline ? "ENCRYPTED" : "OFFLINE",
                      highlight: true,
                    },
                    { label: "Last Sync", value: "Active" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-50"
                    >
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          "text-[9px] font-bold italic",
                          item.highlight ? "text-amber-600" : "text-slate-900"
                        )}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  className="w-full py-4 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl font-sans"
                  onClick={() => setSelectedLocation(null)}
                >
                  CLEAR FOCUS
                </button>
              </motion.div>
            ) : (
              <div className="text-center py-12 px-6">
                <MapPin size={32} className="text-slate-200 mx-auto mb-4" />
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                  Select a live node from the mesh to monitor real-time telemetry
                </p>
              </div>
            )}
          </div>

          <div className="bg-amber-500 p-6 rounded-[2rem] shadow-xl shadow-amber-500/10 text-slate-950 relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer font-sans">
            <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform">
              <Truck size={120} />
            </div>
            <div className="relative z-10 font-sans">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">
                Network Capacity
              </p>
              <h4 className="text-2xl font-black italic">UPTIME SECURED</h4>
            </div>
            <div className="mt-8 flex items-center justify-between relative z-10">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => {
                  const driver = drivers[i % drivers.length];
                  return (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full bg-slate-900 border-2 border-amber-500 overflow-hidden flex items-center justify-center"
                    >
                      <img
                        src={getSafeUrl(
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver?.uid || "fleet" + i}`
                        )}
                        alt="Unit"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="text-right">
                <p className="text-[14px] font-black leading-none font-sans">
                  {drivers.length > 0 ? ((liveUnitsCount / drivers.length) * 100).toFixed(1) : "100"}
                  %
                </p>
                <p className="text-[8px] font-bold uppercase tracking-widest opacity-60 font-sans">
                  SLA Pulse
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
