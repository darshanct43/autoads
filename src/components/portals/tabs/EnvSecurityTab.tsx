import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, ShieldAlert, Lock, Unlock, Eye, EyeOff, Save, 
  RotateCcw, Upload, FileCode, Clock, User, AlertTriangle, ShieldCheck as ShieldIcon,
  RefreshCw
} from "lucide-react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface EnvSecurityTabProps {
  user: any;
  activeRole: string;
}

export function EnvSecurityTab({ user, activeRole }: EnvSecurityTabProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [currentView, setCurrentView] = useState<"ACTIVE" | "EXAMPLE" | "BACKUP" | "LOGS">("ACTIVE");

  // File states
  const [envContent, setEnvContent] = useState("");
  const [exampleContent, setExampleContent] = useState("");
  const [backupContent, setBackupContent] = useState("");
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Password confirmation state for specific sensitive actions
  const [confirmingAction, setConfirmingAction] = useState<string | null>(null);
  const [confirmationPassword, setConfirmationPassword] = useState("");
  const [confirmationError, setConfirmationError] = useState("");
  const [uploadFileContent, setUploadFileContent] = useState<string | null>(null);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(true);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const isAdmin = activeRole === "ADMIN" || activeRole === "HQ_ADMIN";

  // Trigger Toast Notification
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Fetch Audit Logs from Firestore
  useEffect(() => {
    if (!isAdmin) return;

    const qLogs = query(
      collection(db, "environmentAuditLogs"),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      qLogs,
      (snapshot) => {
        const logs: any[] = [];
        snapshot.forEach((doc) => {
          logs.push({ id: doc.id, ...doc.data() });
        });
        setAuditLogs(logs);
        setIsLogsLoading(false);
      },
      (error) => {
        console.error("Error reading audit logs:", error);
        setIsLogsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  // If role is NOT Admin, deny access completely
  if (!isAdmin) {
    return (
      <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-[2.5rem] max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Access Restricted</h2>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider leading-relaxed">
            The Environment Security tab is isolated and strictly restricted. Support teams, managers, and non-admin users have:
          </p>
          <div className="grid grid-cols-2 gap-3 text-left pt-2 font-mono text-[10px]">
            <div className="bg-white/50 border border-slate-100 p-2.5 rounded-xl flex justify-between items-center text-red-600 font-bold">
              <span>VIEW CREDENTIALS</span>
              <span>NO</span>
            </div>
            <div className="bg-white/50 border border-slate-100 p-2.5 rounded-xl flex justify-between items-center text-red-600 font-bold">
              <span>EDIT SETTINGS</span>
              <span>NO</span>
            </div>
            <div className="bg-white/50 border border-slate-100 p-2.5 rounded-xl flex justify-between items-center text-red-600 font-bold">
              <span>RESTORE BACKUP</span>
              <span>NO</span>
            </div>
            <div className="bg-white/50 border border-slate-100 p-2.5 rounded-xl flex justify-between items-center text-red-600 font-bold">
              <span>EXPORT CONFIG</span>
              <span>NO</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Load configuration files from API
  const loadFiles = async (passwordValue: string) => {
    setIsLoadingFiles(true);
    try {
      const res = await fetch("/api/env-security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid,
          email: user?.email,
          activeRole,
          password: passwordValue,
          action: "GET_FILES",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEnvContent(data.env || "");
        setExampleContent(data.example || "");
        setBackupContent(data.backup || "");
        setIsAuthenticated(true);
        setAuthError("");
      } else {
        setAuthError(data.error || "Authentication failed.");
      }
    } catch (err: any) {
      setAuthError(err.message || "An error occurred connecting to server.");
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Check initial password confirmation
  const handleInitialAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setAuthError("Confirmation password is required.");
      return;
    }
    loadFiles(passwordInput);
  };

  // Perform a secure backend file operation
  const executeAction = async (action: string, extraBody = {}) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/env-security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid,
          email: user?.email,
          activeRole,
          password: confirmationPassword,
          action,
          ...extraBody,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Operation completed successfully.", "success");
        setConfirmingAction(null);
        setConfirmationPassword("");
        setConfirmationError("");
        setUploadFileContent(null);
        // Refresh values
        loadFiles(passwordInput || confirmationPassword);
      } else {
        setConfirmationError(data.error || "Operation rejected.");
      }
    } catch (err: any) {
      setConfirmationError(err.message || "Failed to contact the server.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleActionConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmationPassword !== "Hospital.Env") {
      setConfirmationError("Invalid password confirmation. Access Denied.");
      return;
    }

    if (confirmingAction === "SAVE_ENV") {
      executeAction("SAVE_ENV", { envContent });
    } else if (confirmingAction === "UPLOAD_ENV" && uploadFileContent) {
      executeAction("UPLOAD_ENV", { envContent: uploadFileContent });
    } else if (confirmingAction === "RESTORE_BACKUP") {
      executeAction("RESTORE_BACKUP");
    }
  };

  // Handle local file drop or upload
  const handleFileUploadLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadFileContent(content);
      setConfirmingAction("UPLOAD_ENV");
      setConfirmationPassword("");
      setConfirmationError("");
    };
    reader.readAsText(file);
  };

  // Unlocked Admin Panel View
  if (!isAuthenticated) {
    return (
      <div className="p-6 md:p-10 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <form 
          onSubmit={handleInitialAuth}
          className="w-full bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6 text-center"
        >
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500">
            <Lock size={30} />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight leading-none mb-1">
              Admin Identity Verification
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-2">
              System Environment Security Guard
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <div className="text-left space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Hospital.Env
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password to verify..."
                className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-slate-800"
              />
            </div>

            {authError && (
              <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider bg-red-50 border border-red-100 p-2.5 rounded-xl">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoadingFiles}
              className="w-full py-4 bg-amber-500 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {isLoadingFiles ? "Decrypting Matrix Keys..." : "Verify & Unlock Credentials"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-6xl mx-auto text-slate-800">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[80] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border text-[10px] font-black uppercase tracking-widest ${
          toast.type === "success" ? "bg-white border-emerald-100 text-emerald-600" : "bg-white border-red-100 text-red-600"
        }`}>
          {toast.type === "success" ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
          {toast.message}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <ShieldIcon size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1">
                Admin Environment Guard
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                Crypto-Key Storage & Compliance Protocol Active
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button 
            onClick={() => loadFiles(passwordInput)}
            className="p-3 bg-slate-50 border border-slate-100 text-slate-500 rounded-2xl hover:bg-slate-100 active:scale-95 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
            title="Refresh Files"
          >
            <RefreshCw size={14} className={isLoadingFiles ? "animate-spin" : ""} />
            Sync
          </button>

          <button 
            onClick={() => {
              setIsAuthenticated(false);
              setPasswordInput("");
              setConfirmationPassword("");
            }}
            className="px-4 py-3.5 bg-red-50 text-red-500 border border-red-100 rounded-2xl hover:bg-red-100 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
          >
            <Lock size={14} /> Lock Dashboard
          </button>
        </div>
      </div>

      {/* Main Container Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation Rail */}
        <div className="lg:col-span-1 space-y-3">
          {[
            { id: "ACTIVE", label: "Active .env", icon: FileCode, desc: "Active system variables" },
            { id: "EXAMPLE", label: ".env.example", icon: FileCode, desc: "Reference blueprint" },
            { id: "BACKUP", label: "Local Backups", icon: RotateCcw, desc: "Restore & recovery options" },
            { id: "LOGS", label: "Audit Logs", icon: Clock, desc: "Live Firestore registry" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentView(tab.id as any)}
              className={`w-full p-4 rounded-3xl border text-left transition-all ${
                currentView === tab.id
                  ? "bg-slate-900 border-slate-900 text-white shadow-xl"
                  : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  currentView === tab.id ? "bg-amber-500 text-slate-950" : "bg-slate-50 text-slate-400"
                }`}>
                  <tab.icon size={16} />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider">{tab.label}</h4>
                  <p className="text-[9px] text-slate-400 mt-0.5">{tab.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* View Content Card */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm p-6 md:p-8 min-h-[50vh] flex flex-col justify-between">
            
            {/* Upper Work Space */}
            <div className="space-y-6">
              
              {currentView === "ACTIVE" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                    <div>
                      <h3 className="text-base font-black text-slate-900 uppercase italic">
                        Active Node Credentials (.env)
                      </h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Workspace active variables configured on server runtime. Use with caution.
                      </p>
                    </div>

                    <div className="text-[8px] font-black px-2.5 py-1 bg-emerald-50 text-emerald-600 uppercase border border-emerald-100 rounded-lg">
                      ACTIVE & SECURED
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      value={envContent}
                      onChange={(e) => setEnvContent(e.target.value)}
                      className="w-full h-80 px-5 py-4 bg-slate-950 text-emerald-400 font-mono text-[10px] rounded-3xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed overflow-y-auto"
                      placeholder="# Server configuration variables..."
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <label className="p-3 bg-slate-50 border border-slate-100 text-slate-500 rounded-2xl hover:bg-slate-100 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer flex items-center gap-2">
                        <Upload size={14} /> Upload Custom File
                        <input
                          type="file"
                          accept=".env,.txt"
                          onChange={handleFileUploadLocal}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        Overwrite active (.env) config
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setConfirmingAction("SAVE_ENV");
                        setConfirmationPassword("");
                        setConfirmationError("");
                      }}
                      className="px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-slate-900/10 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <Save size={14} /> Save Active Config
                    </button>
                  </div>
                </div>
              )}

              {currentView === "EXAMPLE" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                    <div>
                      <h3 className="text-base font-black text-slate-900 uppercase italic">
                        Reference Blueprint Blueprint (.env.example)
                      </h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        The structural configuration blueprint for the workspace environment.
                      </p>
                    </div>

                    <div className="text-[8px] font-black px-2.5 py-1 bg-amber-50 text-amber-600 uppercase border border-amber-100 rounded-lg">
                      REFERENCE BLUEPRINT
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      value={exampleContent}
                      readOnly
                      className="w-full h-80 px-5 py-4 bg-slate-900 text-slate-400 font-mono text-[10px] rounded-3xl border border-slate-800 focus:outline-none leading-relaxed overflow-y-auto"
                      placeholder="No reference blueprint available."
                    />
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] text-slate-400 font-medium italic">
                      Note: .env.example contains configuration blueprint templates with safe placeholder values. Real credentials must never be committed to git source repositories.
                    </p>
                  </div>
                </div>
              )}

              {currentView === "BACKUP" && (
                <div className="space-y-6">
                  <div className="border-b border-slate-50 pb-4">
                    <h3 className="text-base font-black text-slate-900 uppercase italic">
                      Local Config Backups (.env.backup)
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Recover previous stable environment states safely during runtime incident responses.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="p-2 w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
                          <RotateCcw size={20} />
                        </div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                          Emergency Restore
                        </h4>
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                          Overwrite the active environment configuration (.env) instantly with stored variables from your local workspace backup.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setConfirmingAction("RESTORE_BACKUP");
                          setConfirmationPassword("");
                          setConfirmationError("");
                        }}
                        disabled={!backupContent}
                        className="w-full py-4 bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                      >
                        Restore From Backup
                      </button>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="p-2 w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
                          <FileCode size={20} />
                        </div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                          Backup Existence
                        </h4>
                        <div className="font-mono text-[9px] text-slate-500 space-y-1.5 pt-1 bg-white p-3 border border-slate-100 rounded-xl">
                          <div className="flex justify-between border-b border-slate-50 pb-1">
                            <span>FILENAME:</span>
                            <span className="font-bold">.env.backup</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-50 pb-1">
                            <span>STATUS:</span>
                            <span className={backupContent ? "text-emerald-500 font-bold" : "text-red-500 font-bold"}>
                              {backupContent ? "AVAILABLE" : "NO BACKUP FOUND"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>SIZE:</span>
                            <span className="font-bold">{backupContent ? `${backupContent.length} bytes` : "0 bytes"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 text-center">
                        Backups updated automatically on save
                      </div>
                    </div>
                  </div>

                  {backupContent && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Backup File Blueprint Review
                      </h4>
                      <pre className="w-full max-h-48 p-4 bg-slate-900 text-slate-500 font-mono text-[9px] rounded-2xl border border-slate-800 overflow-y-auto leading-relaxed">
                        {backupContent}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {currentView === "LOGS" && (
                <div className="space-y-4">
                  <div className="border-b border-slate-50 pb-4">
                    <h3 className="text-base font-black text-slate-900 uppercase italic">
                      Live Environment Security Audit Registry
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Every single attempt to read, write, upload, or restore environment files is logged to your immutable database registry.
                    </p>
                  </div>

                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="p-4">Timestamp</th>
                            <th className="p-4">User Email / ID</th>
                            <th className="p-4">Action</th>
                            <th className="p-4">Target File</th>
                            <th className="p-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-mono text-[9px]">
                          {isLogsLoading ? (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-slate-400">
                                Synchronizing security vault streams...
                              </td>
                            </tr>
                          ) : auditLogs.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-slate-400">
                                No logged security events found.
                              </td>
                            </tr>
                          ) : (
                            auditLogs.map((log) => {
                              const tDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                              const displayTime = isNaN(tDate.getTime()) ? "N/A" : tDate.toLocaleString();
                              const isSuccess = log.status === "SUCCESS";
                              return (
                                <tr key={log.id} className="hover:bg-slate-50/50">
                                  <td className="p-4 text-slate-500">{displayTime}</td>
                                  <td className="p-4">
                                    <span className="font-bold text-slate-800 block">{log.email || "System"}</span>
                                    <span className="text-[8px] text-slate-400 block">{log.userId}</span>
                                  </td>
                                  <td className="p-4 font-black text-slate-700">{log.action}</td>
                                  <td className="p-4 text-slate-500">{log.fileName}</td>
                                  <td className="p-4">
                                    <span className={`px-2 py-1 rounded-[6px] text-[8px] font-black uppercase ${
                                      isSuccess ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
                                    }`}>
                                      {log.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>

      {/* ADMIN PASSWORD CONFIRMATION MODAL OVERLAY */}
      {confirmingAction && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
          <form 
            onSubmit={handleActionConfirm}
            className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-slate-100 text-center space-y-6"
          >
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 animate-pulse">
              <ShieldAlert size={32} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase text-slate-900 italic">
                Authentication Challenge Required
              </h3>
              <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest leading-relaxed">
                You are executing a critical configuration modifier. Stated action:{" "}
                <span className="text-red-500 font-mono font-black">{confirmingAction}</span>. Confirm your administrator privilege status to apply.
              </p>
            </div>

            <div className="space-y-4">
              <div className="text-left space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Hospital.Env
                </label>
                <input
                  type="password"
                  value={confirmationPassword}
                  onChange={(e) => setConfirmationPassword(e.target.value)}
                  placeholder="Verify password..."
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-slate-800"
                />
              </div>

              {confirmationError && (
                <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider bg-red-50 border border-red-100 p-2.5 rounded-xl">
                  {confirmationError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingAction(null);
                    setConfirmationPassword("");
                    setConfirmationError("");
                    setUploadFileContent(null);
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSaving ? "Locking Stream..." : "Authorize Action"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
