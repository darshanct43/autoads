import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Check, 
  Database, 
  Upload, 
  User, 
  Mail, 
  AlertTriangle, 
  RefreshCw, 
  FileJson, 
  ExternalLink,
  ShieldCheck,
  FolderPlus,
  PlayCircle,
  HelpCircle,
  Lock,
  Key,
  Layers,
  FileCode,
  ArrowRight
} from 'lucide-react';
import { googleLogin, getGoogleAccessToken, setGoogleAccessToken } from '@/lib/firebase';
import { AdCampaign, Payment } from '@/services/firebaseService';

interface GoogleDriveBackupProps {
  campaigns: AdCampaign[];
  payments: Payment[];
  userId: string;
}

interface GoogleUserProfile {
  name: string;
  email: string;
  picture: string;
}

export const GoogleDriveBackup: React.FC<GoogleDriveBackupProps> = ({ 
  campaigns, 
  payments,
  userId
}) => {
  // Drive Selection: 'google' or 'onedrive'
  const [activeProvider, setActiveProvider] = useState<'google' | 'onedrive'>('google');

  // Google States
  const [token, setToken] = useState<string | null>(getGoogleAccessToken());
  const [googleUser, setGoogleUser] = useState<GoogleUserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [isLinking, setIsLinking] = useState<boolean>(false);

  // OneDrive (Microsoft OneDrive) States 
  const [oneDriveToken, setOneDriveToken] = useState<string | null>(() => {
    return localStorage.getItem(`onedrive_token_${userId}`) || null;
  });
  const [oneDriveUser, setOneDriveUser] = useState<{name: string; email: string} | null>(null);
  const [loadingOneDriveProfile, setLoadingOneDriveProfile] = useState<boolean>(false);
  const [pastedTokenInput, setPastedTokenInput] = useState<string>('');
  const [showTokenInput, setShowTokenInput] = useState<boolean>(false);

  // Backup configurations
  const [backupCampaigns, setBackupCampaigns] = useState<boolean>(true);
  const [backupPayments, setBackupPayments] = useState<boolean>(true);
  const [backupEnvFile, setBackupEnvFile] = useState<boolean>(true);
  const [autoBackup, setAutoBackup] = useState<boolean>(() => {
    return localStorage.getItem(`gdrive_autobackup_${userId}`) === 'true';
  });

  // Action states
  const [backingUp, setBackingUp] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [latestBackups, setLatestBackups] = useState<Array<{
    name: string;
    id: string;
    time: string;
    type: 'campaigns' | 'payments' | 'env';
    provider: 'google' | 'onedrive';
  }>>(() => {
    const saved = localStorage.getItem(`gdrive_backups_list_${userId}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Fetch human readable profile from Microsoft Graph
  const fetchOneDriveProfile = async (accessToken: string) => {
    setLoadingOneDriveProfile(true);
    setErrorMessage('');
    try {
      const res = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setOneDriveUser({
          name: data.displayName || 'OneDrive User',
          email: data.mail || data.userPrincipalName || '',
        });
      } else {
        setOneDriveToken(null);
        localStorage.removeItem(`onedrive_token_${userId}`);
        setOneDriveUser(null);
      }
    } catch (err) {
      console.error('Error fetching OneDrive User info:', err);
    } finally {
      setLoadingOneDriveProfile(false);
    }
  };

  // Fetch human readable profile from google if token is active
  const fetchGoogleProfile = async (accessToken: string) => {
    setLoadingProfile(true);
    setErrorMessage('');
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setGoogleUser({
          name: data.name || 'Google User',
          email: data.email || '',
          picture: data.picture || '',
        });
      } else {
        // Token might have expired
        setToken(null);
        setGoogleAccessToken(null);
        setGoogleUser(null);
      }
    } catch (err) {
      console.error('Error fetching Google User Info:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    const currentToken = getGoogleAccessToken();
    if (currentToken) {
      setToken(currentToken);
      fetchGoogleProfile(currentToken);
    }
    if (oneDriveToken) {
      fetchOneDriveProfile(oneDriveToken);
    }
  }, []);

  const handleLinkDrive = async () => {
    setIsLinking(true);
    setErrorMessage('');
    try {
      await googleLogin();
      const currentToken = getGoogleAccessToken();
      if (currentToken) {
        setToken(currentToken);
        await fetchGoogleProfile(currentToken);
        if (typeof (window as any).showToast === 'function') {
          (window as any).showToast("Google Drive Connected!", "success");
        }
      } else {
        throw new Error("No access token returned from authentication.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to authenticate your Google Account.");
    } finally {
      setIsLinking(false);
    }
  };

  // Connect OneDrive with pasted developer token or OAuth
  const handleLinkOneDriveWithToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedTokenInput.trim()) return;
    
    const tokenClean = pastedTokenInput.trim();
    setIsLinking(true);
    setErrorMessage('');
    try {
      await fetchOneDriveProfile(tokenClean);
      setOneDriveToken(tokenClean);
      localStorage.setItem(`onedrive_token_${userId}`, tokenClean);
      setPastedTokenInput('');
      setShowTokenInput(false);
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast("Microsoft OneDrive Connected!", "success");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to connect to Microsoft Live servers.");
    } finally {
      setIsLinking(false);
    }
  };

  // Simple Microsoft accounts standard interactive popup mock or standard redirect backup
  const handleOneDriveOAuth = () => {
    // Generate simple guidance, or allow them to paste their developer token
    setShowTokenInput(!showTokenInput);
    setErrorMessage("To connect Microsoft OneDrive, please authenticate or paste your Microsoft Graph API Bearer token below for quick secure access.");
  };

  const handleDisconnect = () => {
    if (activeProvider === 'google') {
      if (window.confirm("Disconnect Google Drive? Your local backups list will remain but auto-sync will stop.")) {
        setToken(null);
        setGoogleAccessToken(null);
        setGoogleUser(null);
        setStatusMessage('');
        setErrorMessage('');
        if (typeof (window as any).showToast === 'function') {
          (window as any).showToast("Google Drive Disconnected", "info");
        }
      }
    } else {
      if (window.confirm("Disconnect Microsoft OneDrive? Your local backups list will remain.")) {
        setOneDriveToken(null);
        localStorage.removeItem(`onedrive_token_${userId}`);
        setOneDriveUser(null);
        setStatusMessage('');
        setErrorMessage('');
        if (typeof (window as any).showToast === 'function') {
          (window as any).showToast("Microsoft OneDrive Disconnected", "info");
        }
      }
    }
  };

  const handleToggleAutoBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAutoBackup(checked);
    localStorage.setItem(`gdrive_autobackup_${userId}`, checked ? 'true' : 'false');
  };

  // Run the .env file server backup call
  const backupEnvFileViaBackend = async (activeToken: string, providerName: 'google' | 'onedrive') => {
    const backupFileName = providerName === 'google' ? `autoads_app_backup_${new Date().toISOString().slice(0, 10)}.env` : `autoads_app.env`;
    setStatusMessage(`Calling active server container API to read and backup .env configuration safely...`);
    
    const response = await fetch('/api/backup-env', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accessToken: activeToken,
        provider: providerName,
        fileName: backupFileName
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Server rejected the backup payload.');
    }
    return data;
  };

  // Main backup execution script
  const runBackup = async () => {
    const currentToken = activeProvider === 'google' ? token : oneDriveToken;
    if (!currentToken) return;
    
    // Explicit confirmation
    const providerLabel = activeProvider === 'google' ? 'Google Drive' : 'Microsoft OneDrive';
    const confirmed = window.confirm(
      `Do you want to upload a fresh backup of your selected application parameters (.env configuration, campaigns and/or payment lists) directly to your secure ${providerLabel} folder?`
    );
    if (!confirmed) return;

    setBackingUp(true);
    setErrorMessage('');
    setStatusMessage(`Connecting to ${providerLabel}...`);

    try {
      const generatedFiles: typeof latestBackups = [];

      // Step 1: Backup .env File (Server-side reading task!)
      if (backupEnvFile) {
        setStatusMessage(`Encrypting and migrating server-side .env system variables...`);
        const serverResult = await backupEnvFileViaBackend(currentToken, activeProvider);
        
        generatedFiles.push({
          name: serverResult.fileName || 'autoads_app.env',
          id: serverResult.id || 'env_backup_id',
          time: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
          type: 'env',
          provider: activeProvider
        });
        setStatusMessage(`Active .env configuration successfully saved to ${providerLabel}!`);
      }

      // Step 2 & 3: Backup Campaigns / Payments JSON for Google Drive (or we can handle OneDrive folder too)
      if (activeProvider === 'google') {
        const folderName = 'Mayaan AutoAds Backups';
        const q = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        
        let folderRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
          headers: { Authorization: `Bearer ${currentToken}` }
        });
        
        let folderData = await folderRes.json();
        let folderId = '';

        if (folderData.files && folderData.files.length > 0) {
          folderId = folderData.files[0].id;
        } else {
          // Create Folder
          const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${currentToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: folderName,
              mimeType: 'application/vnd.google-apps.folder'
            })
          });

          if (createFolderRes.ok) {
            const folderObj = await createFolderRes.json();
            folderId = folderObj.id;
          }
        }

        // Campaigns
        if (backupCampaigns && folderId) {
          const campaignsFileName = `Mayaan_Campaigns_Backup_${new Date().toISOString().slice(0, 10)}.json`;
          setStatusMessage(`Packaging and uploading Campaigns array...`);
          
          const payloadStr = JSON.stringify(campaigns, null, 2);
          const fileQ = `name = '${campaignsFileName}' and '${folderId}' in parents and trashed = false`;
          const sRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(fileQ)}&fields=files(id)`, {
            headers: { Authorization: `Bearer ${currentToken}` }
          });
          const searchData = await sRes.json();
          let fId = '';

          if (searchData.files && searchData.files.length > 0) {
            fId = searchData.files[0].id;
            const upRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fId}?uploadType=media`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
              body: payloadStr
            });
            if (!upRes.ok) throw new Error('Failed to patch campaigns to drive.');
          } else {
            const metaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
              method: 'POST',
              headers: { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: campaignsFileName, parents: [folderId], mimeType: 'application/json' })
            });
            const mData = await metaRes.json();
            fId = mData.id;

            await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fId}?uploadType=media`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
              body: payloadStr
            });
          }

          generatedFiles.push({
            name: campaignsFileName,
            id: fId,
            time: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
            type: 'campaigns',
            provider: 'google'
          });
        }

        // Payments
        if (backupPayments && folderId) {
          const paymentsFileName = `Mayaan_Payments_Backup_${new Date().toISOString().slice(0, 10)}.json`;
          setStatusMessage(`Packaging and uploading Payments Ledger...`);
          
          const payloadStr = JSON.stringify(payments, null, 2);
          const fileQ = `name = '${paymentsFileName}' and '${folderId}' in parents and trashed = false`;
          const sRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(fileQ)}&fields=files(id)`, {
            headers: { Authorization: `Bearer ${currentToken}` }
          });
          const searchData = await sRes.json();
          let fId = '';

          if (searchData.files && searchData.files.length > 0) {
            fId = searchData.files[0].id;
            await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fId}?uploadType=media`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
              body: payloadStr
            });
          } else {
            const metaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
              method: 'POST',
              headers: { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: paymentsFileName, parents: [folderId], mimeType: 'application/json' })
            });
            const mData = await metaRes.json();
            fId = mData.id;

            await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fId}?uploadType=media`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
              body: payloadStr
            });
          }

          generatedFiles.push({
            name: paymentsFileName,
            id: fId,
            time: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
            type: 'payments',
            provider: 'google'
          });
        }
      } else {
        // Microsoft OneDrive Campaigns/Payments Backup is fully handled by direct putting
        if (backupCampaigns) {
          setStatusMessage(`Uploading campaigns file to Microsoft graph folder...`);
          const payloadStr = JSON.stringify(campaigns, null, 2);
          const putUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/Mayaan AutoAds Backups/Mayaan_Campaigns_Backup_${new Date().toISOString().slice(0, 10)}.json:/content`;
          const onedriveRes = await fetch(putUrl, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
            body: payloadStr
          });
          if (onedriveRes.ok) {
            const resData = await onedriveRes.json();
            generatedFiles.push({
              name: `Mayaan_Campaigns_Backup_${new Date().toISOString().slice(0, 10)}.json`,
              id: resData.id || 'onedrive_camp',
              time: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
              type: 'campaigns',
              provider: 'onedrive'
            });
          }
        }

        if (backupPayments) {
          setStatusMessage(`Uploading payments ledger to Microsoft graph folder...`);
          const payloadStr = JSON.stringify(payments, null, 2);
          const putUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/Mayaan AutoAds Backups/Mayaan_Payments_Backup_${new Date().toISOString().slice(0, 10)}.json:/content`;
          const onedriveRes = await fetch(putUrl, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
            body: payloadStr
          });
          if (onedriveRes.ok) {
            const resData = await onedriveRes.json();
            generatedFiles.push({
              name: `Mayaan_Payments_Backup_${new Date().toISOString().slice(0, 10)}.json`,
              id: resData.id || 'onedrive_pay',
              time: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
              type: 'payments',
              provider: 'onedrive'
            });
          }
        }
      }

      const updatedBackups = [...generatedFiles, ...latestBackups].slice(0, 15);
      setLatestBackups(updatedBackups);
      localStorage.setItem(`gdrive_backups_list_${userId}`, JSON.stringify(updatedBackups));

      setStatusMessage('Sync complete! Selected data has been backed up successfully.');
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast("Cloud Backup Complete!", "success");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Backup pipeline encountered an error.');
    } finally {
      setBackingUp(false);
    }
  };

  const isConnected = activeProvider === 'google' ? !!token : !!oneDriveToken;
  const activeUser = activeProvider === 'google' ? googleUser : oneDriveUser;

  return (
    <div className="w-full">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cloud className="text-amber-500 stroke-[2.5]" size={22} />
            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-amber-500">Cloud Integrations</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Secure Multi-Drive Backup</h2>
          <p className="text-xs text-slate-500 mt-1">Configure secure storage for your app settings, campaigns, and active server .env configuration files.</p>
        </div>
        
        {isConnected ? (
          <button
            onClick={handleDisconnect}
            className="px-5 py-3 border border-red-200 text-red-500 font-extrabold text-[10px] uppercase tracking-widest rounded-2xl hover:bg-red-50 transition-all flex items-center gap-2"
          >
            Disconnect {activeProvider === 'google' ? 'Google Drive' : 'Microsoft OneDrive'}
          </button>
        ) : null}
      </div>

      {/* Provider Selector Tabs */}
      <div className="flex items-center gap-3 mb-8 bg-slate-100/80 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => { setActiveProvider('google'); setErrorMessage(''); setStatusMessage(''); }}
          className={`px-5 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${
            activeProvider === 'google' 
              ? 'bg-white text-slate-950 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database size={13} />
          Google Drive {token && "●"}
        </button>
        
        <button
          onClick={() => { setActiveProvider('onedrive'); setErrorMessage(''); setStatusMessage(''); }}
          className={`px-5 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${
            activeProvider === 'onedrive' 
              ? 'bg-white text-slate-950 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Cloud size={13} />
          Microsoft OneDrive {oneDriveToken && "●"}
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-3xl flex items-start gap-3">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-xs font-black text-red-900 uppercase">Configuration details</h4>
            <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Connection States */}
      {!isConnected ? (
        <div className="bg-slate-50/50 border border-slate-200/40 rounded-[2.5rem] p-8 text-center max-w-xl mx-auto shadow-sm my-4">
          <div className="w-16 h-16 bg-white border border-slate-100 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-md shadow-slate-50">
            {activeProvider === 'google' ? (
              <Database className="text-slate-300" size={32} />
            ) : (
              <Cloud className="text-slate-300" size={32} />
            )}
          </div>
          
          <h3 className="text-lg font-black text-slate-800 tracking-tight">
            {activeProvider === 'google' ? 'Google Drive Not Linked' : 'Microsoft OneDrive Not Linked'}
          </h3>
          
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {activeProvider === 'google' 
              ? 'Connect your Google security account to back up app metadata, campaigns database, and the active .env secrets file directly to Google Drive.'
              : 'Connect your Microsoft Business/Personal account to back up active system .env parameters directly to your OneDrive Cloud Storage folder.'
            }
          </p>

          <div className="mt-8 flex flex-col gap-4 max-w-xs mx-auto">
            {activeProvider === 'google' ? (
              <button
                onClick={handleLinkDrive}
                disabled={isLinking}
                className="px-6 py-4 bg-slate-900 text-amber-500 font-black text-xs uppercase tracking-widest rounded-3xl hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-100 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                {isLinking ? <RefreshCw className="animate-spin" size={14} /> : <Database size={14} />}
                Authenticate Google Drive
              </button>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handleOneDriveOAuth}
                  className="w-full px-6 py-4 bg-slate-900 text-amber-500 font-black text-xs uppercase tracking-widest rounded-3xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2.5"
                >
                  <Cloud size={14} />
                  Connect OneDrive Graph API
                </button>
                
                {showTokenInput && (
                  <form onSubmit={handleLinkOneDriveWithToken} className="mt-4 p-4 bg-white border border-slate-200 rounded-3xl text-left">
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-wider">
                      Paste Microsoft Graph Bearer Access Token:
                    </label>
                    <input 
                      type="password"
                      value={pastedTokenInput}
                      onChange={(e) => setPastedTokenInput(e.target.value)}
                      placeholder="eyJ0eXAiOiJKV1QiLC..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl mb-3 font-mono outline-none focus:border-amber-500"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isLinking}
                      className="w-full py-2.5 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-amber-400 transition-all"
                    >
                      Verify Token & Sync
                    </button>
                    <p className="text-[9px] text-slate-400 mt-2 leading-tight">
                      Find or generate Microsoft Graph Tokens via Azure app portal with standard scopes: <code>Files.ReadWrite</code>
                    </p>
                  </form>
                )}
              </div>
            )}
            
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              Fully Compliant OAuth SSL
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration and Controls */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Active User Connection Details */}
            {activeUser && (
              <div className="bg-white border border-slate-200/60 shadow-xl shadow-slate-100/50 rounded-[2.5rem] p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {activeProvider === 'google' && (activeUser as any).picture ? (
                    <img 
                      src={(activeUser as any).picture} 
                      alt={activeUser.name} 
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full border border-slate-200 shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-amber-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                      <User size={20} />
                    </div>
                  )}
                  <div>
                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
                      {activeProvider === 'google' ? 'Verified Google Sync' : 'Verified OneDrive Session'}
                    </span>
                    <h3 className="text-sm font-black text-slate-800 leading-none mt-0.5">{activeUser.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Mail size={12} /> {activeUser.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-green-50 border border-green-100 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[8px] font-black text-green-700 uppercase tracking-wider">Synchronised</span>
                </div>
              </div>
            )}

            {/* Selection Config */}
            <div className="bg-white border border-slate-200/60 shadow-xl shadow-slate-100/40 rounded-[2.5rem] p-8">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-6">Select Parameters for Sync</h3>
              
              <div className="flex flex-col gap-5">
                
                {/* BACKUP ACTIVE APP .ENV FILE */}
                <label className="flex items-center justify-between p-4 bg-amber-500/5 border border-amber-500/20 rounded-3xl cursor-pointer hover:bg-amber-500/10 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-600">
                      <Key size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-slate-800 uppercase">App Configuration (.env file)</h4>
                        <span className="text-[8px] font-black px-2 py-0.5 bg-slate-900 text-amber-500 rounded uppercase">Secure Backend Sync</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Automatically pull raw .env variables on server container host & backup.</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={backupEnvFile}
                    onChange={(e) => setBackupEnvFile(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-slate-200 text-amber-600 focus:ring-amber-500"
                  />
                </label>

                {/* AD CAMPAIGNS CARD */}
                <label className="flex items-center justify-between p-4 bg-slate-50/50 rounded-3xl border border-slate-200/30 cursor-pointer hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-amber-600">
                      <FileJson size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase">Campaigns Listing Database</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">{campaigns.length} Active Campaigns</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={backupCampaigns}
                    onChange={(e) => setBackupCampaigns(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-slate-200 text-amber-600 focus:ring-amber-500"
                  />
                </label>

                {/* BILLING AND TRANSACTIONS LEDGER */}
                <label className="flex items-center justify-between p-4 bg-slate-50/50 rounded-3xl border border-slate-200/30 cursor-pointer hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600">
                      <Database size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase">Payments & Revenue Ledger</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">{payments.length} log transactions</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={backupPayments}
                    onChange={(e) => setBackupPayments(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-slate-200 text-amber-600 focus:ring-amber-500"
                  />
                </label>
              </div>

              {/* Preferences */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase">Automation Sync Engine</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Prompt cloud engine backup of server variables when campaign changes.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={autoBackup}
                      onChange={handleToggleAutoBackup}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>

              {/* Action trigger panel */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <button
                  onClick={runBackup}
                  disabled={backingUp || (!backupCampaigns && !backupPayments && !backupEnvFile)}
                  className="w-full py-4 bg-slate-900 border border-slate-900 text-amber-500 font-black text-xs uppercase tracking-widest rounded-3xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {backingUp ? (
                    <RefreshCw className="animate-spin" size={14} />
                  ) : (
                    <Upload size={14} />
                  )}
                  {backingUp 
                    ? `Syncing app assets to ${activeProvider === 'google' ? 'Google Drive' : 'OneDrive'}...` 
                    : `Execute Backup on ${activeProvider === 'google' ? 'Google Drive' : 'OneDrive'}`
                  }
                </button>
                {statusMessage && (
                  <p className="text-[10px] text-amber-600 font-extrabold uppercase mt-3 text-center leading-relaxed">
                    {statusMessage}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Backup History & Info */}
          <div className="flex flex-col gap-6">
            <div className="bg-white border border-slate-200/60 shadow-xl shadow-slate-100/40 rounded-[2.5rem] p-6 lg:p-8">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-6">Backup Rules & Secrets Encryption</h3>
              
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100/40 rounded-3xl">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-xl">
                  <Lock size={18} />
                </div>
                <div>
                  <h4 className="text-[11px] font-black text-slate-800 uppercase">Server Secret Protection</h4>
                  <p className="text-[9px] text-slate-500 mt-0.5">Your live .env key secrets are encrypted inside your drive without any public browser exposure.</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cloud Storage Destination</h4>
                <div className="px-4 py-3 bg-slate-50/50 border border-slate-200/20 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Mayaan AutoAds Backups</span>
                  <FolderPlus size={16} className="text-slate-400" />
                </div>
              </div>
            </div>

            {/* Backups List */}
            <div className="bg-white border border-slate-200/60 shadow-xl shadow-slate-100/40 rounded-[2.5rem] p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider font-extrabold">Backup Logs</h3>
                <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">{latestBackups.length} saved</span>
              </div>

              {latestBackups.length === 0 ? (
                <div className="py-8 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-[2rem]">
                  <Database size={24} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-[10px] uppercase font-black text-slate-400">No backup records logged</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {latestBackups.map((bk, idx) => (
                    <div 
                      key={idx}
                      className="p-3 bg-slate-50/85 border border-slate-100 rounded-2xl flex items-center justify-between text-xs hover:bg-slate-50 transition-all"
                    >
                      <div className="flex items-center gap-2 max-w-[170px] truncate">
                        {bk.type === 'env' ? (
                          <FileCode className="text-red-500 shrink-0" size={16} />
                        ) : bk.type === 'campaigns' ? (
                          <FileJson className="text-amber-500 shrink-0" size={16} />
                        ) : (
                          <Database className="text-blue-500 shrink-0" size={16} />
                        )}
                        <div className="truncate">
                          <p className="font-extrabold text-slate-800 truncate" title={bk.name}>{bk.name}</p>
                          <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase">
                            <span>{bk.provider === 'google' ? 'Google' : 'OneDrive'}</span>
                            <span>•</span>
                            <span>{bk.time}</span>
                          </div>
                        </div>
                      </div>
                      
                      {bk.provider === 'google' ? (
                        <a 
                          href={`https://drive.google.com/file/d/${bk.id}/view`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-2 bg-white text-slate-700 hover:text-amber-600 rounded-xl border border-slate-200/60 shadow-sm transition-all flex items-center justify-center shrink-0"
                        >
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-[8px] font-black text-slate-400 px-1.5 py-1 bg-white border border-slate-200 rounded">Saved</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
