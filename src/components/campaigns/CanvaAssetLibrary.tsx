import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Image as ImageIcon, Calendar, FileType } from 'lucide-react';

export const CanvaAssetLibrary: React.FC<{ onSelect: (asset: any) => void }> = ({ onSelect }) => {
  const [assets, setAssets] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'mediaAssets'),
      where('source', '==', 'CANVA'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAssets(data);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4">
      {assets.map(asset => (
        <button 
          key={asset.id} 
          onClick={() => onSelect(asset)}
          className="border rounded-xl p-3 hover:border-amber-500 transition-all flex flex-col items-start gap-2 text-left"
        >
          <img src={asset.thumbnailUrl} alt={asset.name} className="w-full h-24 object-cover rounded-lg" />
          <div className="w-full">
            <p className="text-xs font-bold truncate">{asset.name}</p>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
              <Calendar size={10} />
              {asset.createdAt?.toDate?.().toLocaleDateString()}
              <FileType size={10} className="ml-2" />
              {asset.fileType}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};
