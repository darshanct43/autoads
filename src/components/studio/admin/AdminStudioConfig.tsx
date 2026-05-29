import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, Edit2, Wand2, Type, Image as ImageIcon, Check, Link, Globe, RefreshCw } from 'lucide-react';
import { studioConfigService, StudioConfigItem } from '../../../services/studioConfigService';
import { cn } from '../../../lib/utils';
import { auth, db } from '../../../lib/firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';

export const AdminStudioConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'THEMES' | 'TEMPLATES' | 'AI_MODELS' | 'EDITING_TOOLS' | 'CATEGORIES' | 'INTEGRATIONS'>('THEMES');
  
  const [items, setItems] = useState<StudioConfigItem[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<StudioConfigItem> | null>(null);

  // Canva OAuth integration state
  const [canvaConnected, setCanvaConnected] = useState(false);
  const [canvaTokenInfo, setCanvaTokenInfo] = useState<any>(null);
  const [loadingCanva, setLoadingCanva] = useState(true);

  const fetchCanvaStatus = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoadingCanva(false);
      return;
    }
    try {
      const tokenDoc = await getDoc(doc(db, 'canvaTokens', user.uid));
      if (tokenDoc.exists()) {
        setCanvaConnected(true);
        setCanvaTokenInfo(tokenDoc.data());
      } else {
        setCanvaConnected(false);
        setCanvaTokenInfo(null);
      }
    } catch (e) {
      console.error('Error fetching Canva token status:', e);
    } finally {
      setLoadingCanva(false);
    }
  };

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchCanvaStatus();
      } else {
        setCanvaConnected(false);
        setCanvaTokenInfo(null);
        setLoadingCanva(false);
      }
    });

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CANVA_OAUTH_SUCCESS') {
        console.log('[CANVA OAUTH] Received success message from popup');
        fetchCanvaStatus();
      } else if (event.data?.type === 'CANVA_OAUTH_FAILED') {
        console.error('[CANVA OAUTH] Received failure message:', event.data.error);
        alert('Canva connection failed: ' + (event.data.error || 'Unknown error'));
        fetchCanvaStatus();
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      unsubAuth();
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleConnectCanva = () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in as an authorized user to connect Canva.");
      return;
    }
    
    const width = 600;
    const height = 750;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    console.log(`[CANVA OAUTH] Opening connection popup inside viewport for ${user.uid}`);
    const popup = window.open(
      `/api/canva/login?uid=${user.uid}`,
      'ConnectCanva',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );
    
    if (!popup) {
      alert("The connection pop-up was blocked. Please enable pop-ups for this website to configure Canva Integration.");
    }
  };

  const handleDisconnectCanva = async () => {
    if (!confirm('Are you sure you want to disconnect Canva? This will remove all linked authentication tokens and creative asset feeds.')) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
      setLoadingCanva(true);
      await deleteDoc(doc(db, 'canvaTokens', user.uid));
      setCanvaConnected(false);
      setCanvaTokenInfo(null);
    } catch (e: any) {
      alert('Failed to disconnect Canva: ' + e.message);
    } finally {
      setLoadingCanva(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'INTEGRATIONS') {
      fetchCanvaStatus();
      return;
    }
    let unsub = () => {};
    if (activeTab === 'THEMES') unsub = studioConfigService.subscribeToThemes(setItems);
    if (activeTab === 'TEMPLATES') unsub = studioConfigService.subscribeToTemplates(setItems);
    if (activeTab === 'AI_MODELS') unsub = studioConfigService.subscribeToAIModels(setItems);
    if (activeTab === 'EDITING_TOOLS') unsub = studioConfigService.subscribeToEditingTools(setItems);
    if (activeTab === 'CATEGORIES') unsub = studioConfigService.subscribeToCategories(setItems);
    return () => unsub();
  }, [activeTab]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    // Default to enabled if not set
    const itemToSave = { ...editingItem, isEnabled: editingItem.isEnabled ?? true };

    if (activeTab === 'THEMES') await studioConfigService.saveTheme(itemToSave);
    if (activeTab === 'TEMPLATES') await studioConfigService.saveTemplate(itemToSave);
    if (activeTab === 'AI_MODELS') await studioConfigService.saveAIModel(itemToSave);
    if (activeTab === 'EDITING_TOOLS') await studioConfigService.saveEditingTool(itemToSave);
    if (activeTab === 'CATEGORIES') await studioConfigService.saveCategory(itemToSave);
    
    setShowEditor(false);
    setEditingItem(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    if (activeTab === 'THEMES') await studioConfigService.deleteTheme(id);
    if (activeTab === 'TEMPLATES') await studioConfigService.deleteTemplate(id);
    if (activeTab === 'AI_MODELS') await studioConfigService.deleteAIModel(id);
    if (activeTab === 'EDITING_TOOLS') await studioConfigService.deleteEditingTool(id);
    if (activeTab === 'CATEGORIES') await studioConfigService.deleteCategory(id);
  };

  const openEditor = (item?: StudioConfigItem) => {
    setEditingItem(item || { name: '', description: '', isEnabled: true });
    setShowEditor(true);
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col h-full overflow-hidden text-slate-900">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-8 shrink-0">
        <h1 className="text-3xl font-black italic uppercase text-white tracking-widest shrink-0">Studio Core Matrix</h1>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">Dynamic Config Engine</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900 border-b border-slate-800 px-8 shrink-0 overflow-x-auto select-none no-scrollbar">
        {[
          { id: 'CATEGORIES', label: 'Campaign Categories', icon: Layers },
          { id: 'THEMES', label: 'Theme Marketplace', icon: ImageIcon },
          { id: 'TEMPLATES', label: 'Templates', icon: Layers },
          { id: 'AI_MODELS', label: 'AI Model Manager', icon: Wand2 },
          { id: 'EDITING_TOOLS', label: 'Editing Tools', icon: Type },
          { id: 'INTEGRATIONS', label: 'Integrations Hub', icon: Globe }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-6 py-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all whitespace-nowrap shrink-0",
              activeTab === tab.id ? "border-amber-500 text-amber-500 bg-white/5" : "border-transparent text-slate-500 hover:text-slate-300"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
        {activeTab !== 'INTEGRATIONS' ? (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">
                Manage {activeTab.replace('_', ' ')}
              </h2>
              <button
                onClick={() => openEditor()}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
              >
                <Plus size={16} /> Add New
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map(item => (
                <div key={item.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", item.isEnabled ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-red-500")} />
                      <h3 className="font-bold text-slate-900 truncate pr-2" title={item.name}>{item.name}</h3>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditor(item)} className="p-1.5 text-slate-400 hover:text-blue-500 bg-slate-50 rounded-lg"><Edit2 size={14}/></button>
                      <button onClick={() => handleDelete(item.id!)} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-50 rounded-lg"><Trash2 size={14}/></button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{item.description || "No description provided."}</p>
                  
                  {activeTab === 'TEMPLATES' && item.category && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Category: {item.category}</span>
                    </div>
                  )}
                </div>
              ))}
              {items.length === 0 && (
                <div className="col-span-full py-20 text-center flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-[2rem]">
                  <Layers size={48} className="mb-4 opacity-50" />
                  <p className="text-sm font-black uppercase tracking-widest">No Items Configured</p>
                  <p className="text-xs mt-2">Click 'Add New' to insert an item into the database.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="max-w-3xl space-y-8">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Globe size={22} className="text-slate-900" />
                  Cloud Integrations Hub
                </h2>
                <p className="text-xs text-slate-500">
                  Connect third-party web tools and design software suites with your AutoAds profile to smoothly export campaigns and sync creative assets.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-6">
                {/* Canva Block */}
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                  <div className="space-y-2 max-w-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#00c4cc] text-white font-black text-lg rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/10">
                        C
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm tracking-tight">Canva Direct Import</h4>
                        <span className="text-[9px] font-black uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                          Active Syncing Available
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed pt-1">
                      Directly access your templates, premium designs, and custom banners created inside Canva inside the AutoAds ad creation wizard. Use single-click importing.
                    </p>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {loadingCanva ? (
                      <div className="flex items-center gap-2 px-4 py-3 text-slate-400 font-bold text-xs">
                        <RefreshCw size={14} className="animate-spin" /> Checking Sync...
                      </div>
                    ) : canvaConnected ? (
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100 text-[10px] font-black uppercase tracking-wider">
                          <Check size={12} /> Connected
                        </div>
                        <button
                          onClick={handleDisconnectCanva}
                          className="px-4 py-2.5 border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50/50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Disconnect Canva
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleConnectCanva}
                        className="px-6 py-3 bg-[#00c4cc] hover:bg-[#00b4bc] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-teal-500/15 flex items-center gap-2 active:scale-95"
                      >
                        <Link size={14} />
                        Connect Canva
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-black italic uppercase tracking-widest text-slate-900">
                {editingItem?.id ? 'Edit Configuration' : 'New Configuration'}
              </h3>
              <button onClick={() => setShowEditor(false)} className="text-slate-400 hover:text-slate-900"><Trash2 size={18} className="opacity-0 hidden" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Display Name</label>
                <input 
                  type="text" 
                  value={editingItem?.name || ''} 
                  onChange={(e) => setEditingItem(prev => ({...prev, name: e.target.value}))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Description</label>
                <textarea 
                  value={editingItem?.description || ''} 
                  onChange={(e) => setEditingItem(prev => ({...prev, description: e.target.value}))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 resize-none h-24"
                />
              </div>

              {activeTab === 'TEMPLATES' && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Category Mapping</label>
                  <input 
                    type="text" 
                    value={editingItem?.category || ''} 
                    onChange={(e) => setEditingItem(prev => ({...prev, category: e.target.value}))}
                    placeholder="e.g. Food & Restaurants"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editingItem?.isEnabled ?? true}
                    onChange={(e) => setEditingItem(prev => ({...prev, isEnabled: e.target.checked}))}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                  Enable Configuration
                </span>
              </div>

              <div className="pt-6 border-t border-slate-100 flex gap-4">
                <button type="button" onClick={() => setShowEditor(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-200">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-800 shadow-xl shadow-slate-900/10">
                  Save Config
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
