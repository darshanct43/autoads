import React, { useState, useEffect } from 'react';
import { firebaseService } from '@/services/firebaseService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

export default function SupportThoughtManager({ showToast }: { showToast: (msg: string, type: 'success' | 'error' | 'info') => void }) {
  const [thoughts, setThoughts] = useState<any[]>([]);
  const [newThought, setNewThought] = useState({ title: '', quote: '', author: '', language: 'EN', imageUrl: '', isActive: false });

  useEffect(() => {
    return firebaseService.subscribeToThoughts(setThoughts);
  }, []);

  const handleCreate = async () => {
    if (!newThought.quote || !newThought.author) {
      showToast('Quote and Author required', 'error');
      return;
    }
    try {
      await firebaseService.createThoughtOfTheDay(newThought);
      setNewThought({ title: '', quote: '', author: '', language: 'EN', imageUrl: '', isActive: false });
      showToast('Thought created', 'success');
    } catch (e) {
      showToast('Failed to create thought', 'error');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await firebaseService.updateThoughtOfTheDay(id, { isActive: !currentStatus });
      showToast('Status updated', 'success');
    } catch (e) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await firebaseService.deleteThoughtOfTheDay(id);
      showToast('Thought deleted', 'success');
    } catch (e) {
      showToast('Failed to delete', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Thought of the Day Manager</h2>
      
      <div className="grid gap-4 p-4 border rounded">
        <Label>New Quote</Label>
        <Input placeholder="Title" value={newThought.title} onChange={e => setNewThought({...newThought, title: e.target.value})} />
        <Textarea placeholder="Quote" value={newThought.quote} onChange={e => setNewThought({...newThought, quote: e.target.value})} />
        <Input placeholder="Author" value={newThought.author} onChange={e => setNewThought({...newThought, author: e.target.value})} />
        <div className="flex items-center gap-2">
            <Switch checked={newThought.isActive} onCheckedChange={val => setNewThought({...newThought, isActive: val})} />
            <span>Active</span>
        </div>
        <Button onClick={handleCreate}>Save Quote</Button>
      </div>

      <div className="space-y-4">
        {thoughts.map(t => (
          <div key={t.id} className="p-4 border rounded flex justify-between items-center">
            <div>
              <p className="font-bold">{t.quote}</p>
              <p className="text-sm text-gray-500">- {t.author}</p>
            </div>
            <div className="flex items-center gap-2">
                {t.isActive ? (
                    <Button size="sm" onClick={() => toggleActive(t.id, true)}>Pause</Button>
                ) : (
                    <Button size="sm" onClick={() => toggleActive(t.id, false)}>Start</Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => handleDelete(t.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
