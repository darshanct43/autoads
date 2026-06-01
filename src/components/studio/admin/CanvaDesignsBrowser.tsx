import React, { useState, useEffect } from 'react';
import { canvaService } from '../../../services/canvaService';
import { auth } from '../../../lib/firebase';
import { RefreshCw, Download, Image as ImageIcon, Check } from 'lucide-react';

export const CanvaDesignsBrowser: React.FC = () => {
  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importedAsset, setImportedAsset] = useState<any>(null);

  useEffect(() => {
    const fetchDesigns = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const tokenInfo = await canvaService.getCanvaToken(user.uid);
        const data = await canvaService.listDesigns(tokenInfo.access_token);
        setDesigns(data.designs || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDesigns();
  }, []);

  const handleImport = async (designId: string) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
        const tokenInfo = await canvaService.getCanvaToken(user.uid);
        const asset = await canvaService.importToAutoAds(tokenInfo.access_token, designId);
        setImportedAsset(asset);
        alert('Design imported successfully');
    } catch(e) {
        console.error(e);
        alert('Import failed');
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
    {importedAsset && (
        <div className="bg-green-100 p-4 rounded-xl border border-green-200">
            <h3 className="font-extrabold text-green-900 text-sm">Design Imported Successfully</h3>
            <div className="text-xs text-green-800 space-y-1 mt-2">
                <p>Name: {importedAsset.name}</p>
                <p>Asset ID: {importedAsset.id}</p>
                <p className="break-all">Storage URL: {importedAsset.s3Url}</p>
            </div>
        </div>
    )}
    <div className="grid grid-cols-3 gap-4">
      {designs.map(design => (
        <div key={design.id} className="border p-4 rounded-xl">
          <img src={design.thumbnail?.url} alt={design.title} className="w-full h-32 object-cover" />
          <p className="text-xs font-bold mt-2">{design.title}</p>
          <button onClick={() => handleImport(design.id)} className="mt-2 text-[10px] bg-amber-500 p-2 rounded flex items-center gap-1">
            <Download size={10}/> Import
          </button>
        </div>
      ))}
    </div>
    </div>
  );
};
