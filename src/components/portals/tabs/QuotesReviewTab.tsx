import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { DriverQuote } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, X, Edit, MessageSquare, Sparkles, Filter, 
  Search, CheckCircle2, AlertTriangle, Clock, TrendingUp, Users, Heart 
} from 'lucide-react';

export default function QuotesReviewTab() {
  const [quotes, setQuotes] = useState<DriverQuote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  
  // Modals state
  const [editQuote, setEditQuote] = useState<DriverQuote | null>(null);
  const [editText, setEditText] = useState('');
  const [rejectQuote, setRejectQuote] = useState<DriverQuote | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    const qCol = collection(db, 'driverQuotes');
    
    // Set up live real-time observer of all driver quotes
    const unsubscribe = onSnapshot(qCol, (snapshot) => {
      const fetched: DriverQuote[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        fetched.push({
          id: docSnap.id,
          ...d,
          submittedAt: d.submittedAt?.toDate?.()?.toISOString() || d.submittedAt || new Date().toISOString(),
          approvedAt: d.approvedAt?.toDate?.()?.toISOString() || d.approvedAt || null
        } as DriverQuote);
      });
      // Sort: Pending first, then newest
      fetched.sort((a,b) => {
        if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
        if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      });
      setQuotes(fetched);
    }, (error) => {
      console.error("Error subscribing to community quotes for review:", error);
    });

    return () => unsubscribe();
  }, []);

  // Actions
  const handleApprove = async (quote: DriverQuote) => {
    setIsActionLoading(true);
    try {
      const qRef = doc(db, 'driverQuotes', quote.id);
      await updateDoc(qRef, {
        status: 'APPROVED',
        approvedAt: Timestamp.now(),
        approvedBy: auth.currentUser?.uid || 'SUPPORT_AGENT'
      });
    } catch (err) {
      console.error("Failed to approve quote:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectQuote || !rejectReasonText.trim()) return;
    setIsActionLoading(true);
    try {
      const qRef = doc(db, 'driverQuotes', rejectQuote.id);
      await updateDoc(qRef, {
        status: 'REJECTED',
        rejectedReason: rejectReasonText.trim(),
        approvedBy: auth.currentUser?.uid || 'SUPPORT_AGENT'
      });
      setRejectQuote(null);
      setRejectReasonText('');
    } catch (err) {
      console.error("Failed to reject quote:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEditApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editQuote || !editText.trim()) return;
    setIsActionLoading(true);
    try {
      const qRef = doc(db, 'driverQuotes', editQuote.id);
      await updateDoc(qRef, {
        quote: editText.trim(),
        status: 'APPROVED',
        approvedAt: Timestamp.now(),
        approvedBy: auth.currentUser?.uid || 'SUPPORT_AGENT'
      });
      setEditQuote(null);
      setEditText('');
    } catch (err) {
      console.error("Failed to edit and approve quote:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Helper Stats calculations
  const statsTotal = quotes.length;
  const statsApproved = quotes.filter(q => q.status === 'APPROVED').length;
  const statsRejected = quotes.filter(q => q.status === 'REJECTED').length;
  const statsPending = quotes.filter(q => q.status === 'PENDING').length;

  // Top Contributing Drivers
  const getTopDrivers = () => {
    const driverMap: Record<string, { name: string; count: number }> = {};
    quotes.forEach(q => {
      if (!q.driverName) return;
      if (!driverMap[q.driverId]) {
        driverMap[q.driverId] = { name: q.driverName, count: 0 };
      }
      driverMap[q.driverId].count += 1;
    });
    return Object.values(driverMap)
      .sort((a,b) => b.count - a.count)
      .slice(0, 3);
  };

  const topDrivers = getTopDrivers();

  // Filter and Search logic
  const filteredQuotes = quotes.filter(q => {
    const matchesFilter = activeFilter === 'ALL' || q.status === activeFilter;
    const matchesSearch = 
      q.quote.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.terminalId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6" id="quotes-review-tab-root">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">REGISTRY DEP</span>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="text-amber-500 shrink-0" size={20} /> Driver Community Quotes
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage and audit positive motivational statements submitted by verified fleet drivers.</p>
        </div>
      </div>

      {/* Statistics section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Quotes Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quotes Submitted</span>
            <h3 className="text-2xl font-extrabold text-slate-850 mt-1">{statsTotal}</h3>
            <span className="text-[10px] font-medium text-amber-600 mt-0.5 block">{statsPending} outstanding review</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <MessageSquare size={20} className="text-slate-600" />
          </div>
        </div>

        {/* Approved Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quotes Approved</span>
            <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{statsApproved}</h3>
            <span className="text-[10px] font-medium text-slate-500 mt-0.5 block">Playing across terminal fleet</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
        </div>

        {/* Rejected Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quotes Rejected</span>
            <h3 className="text-2xl font-extrabold text-rose-600 mt-1">{statsRejected}</h3>
            <span className="text-[10px] font-medium text-slate-400 mt-0.5 block">Failed program validation rules</span>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl">
            <AlertTriangle size={20} className="text-rose-500" />
          </div>
        </div>

        {/* Top Contributors */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl text-white shadow-md">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp size={12} /> Top Contributors
          </span>
          <div className="space-y-2 mt-2">
            {topDrivers.length === 0 ? (
              <p className="text-[10.5px] text-slate-400">No submissions tracked yet.</p>
            ) : (
              topDrivers.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[10px] bg-slate-800/60 p-1.5 px-2.5 rounded-lg">
                  <span className="font-semibold truncate max-w-[130px]">{item.name}</span>
                  <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 rounded-md">
                    {item.count} items
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Database Filters & Search panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Toggle buttons */}
        <div className="flex gap-1.5 p-1 bg-slate-50 border border-slate-100 rounded-xl w-full md:w-auto">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`text-[10px] font-bold tracking-wider uppercase py-2 px-3.5 rounded-lg transition-all w-full md:w-auto ${
                activeFilter === f 
                  ? 'bg-slate-900 text-amber-500 shadow-md font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search Input bar */}
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quotes, drivers or terminals..."
            className="w-full text-xs font-medium text-slate-700 placeholder-slate-400 bg-slate-50 border border-slate-150 pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:bg-white focus:border-slate-400 transition-all"
          />
        </div>

      </div>

      {/* Main Reviews Grid / Deck list */}
      <div className="space-y-3">
        {filteredQuotes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center shadow-sm">
            <MessageSquare size={36} className="text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-sm text-slate-800">Clear Deck</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">There are no {activeFilter.toLowerCase()} community quotes matching your active query parameters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredQuotes.map(q => (
                <motion.div
                  key={q.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-3">
                    
                    {/* Top Driver and ID Label info */}
                    <div className="flex justify-between items-start.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700">
                          {q.driverName?.charAt(0) || 'D'}
                        </div>
                        <div>
                          <h4 className="font-bold text-[11.5px] text-slate-800 tracking-tight leading-none">{q.driverName || 'Verified Driver'}</h4>
                          <span className="text-[9px] font-mono font-bold text-slate-400 mt-0.5 block">{q.terminalId || 'TRM-DEMO'}</span>
                        </div>
                      </div>
                      
                      {/* Active Status pill */}
                      <span className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-full ${
                        q.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                        q.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {q.status}
                      </span>
                    </div>

                    {/* Quote Bubble Text area */}
                    <div className="p-3.5 bg-slate-50/80 border border-slate-100 rounded-2xl">
                      <p className="text-xs text-slate-700 italic font-medium leading-relaxed">
                        "{q.quote}"
                      </p>
                    </div>

                    {/* Display Reason if Rejected */}
                    {q.status === 'REJECTED' && q.rejectedReason && (
                      <div className="p-2.5 px-3 bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-semibold rounded-xl flex items-start gap-1.5">
                        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                        <span>Reason: {q.rejectedReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions & Metadata Footer info bar */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-5 text-[10px] font-mono text-slate-400">
                    <span>
                      Sub: {new Date(q.submittedAt).toLocaleDateString()}
                    </span>
                    
                    {q.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditText(q.quote);
                            setEditQuote(q);
                          }}
                          className="flex items-center gap-1.5 p-1.5 px-3 text-[10px] bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all font-sans font-bold"
                        >
                          <Edit size={11} className="text-slate-500" /> Edit & Approve
                        </button>
                        <button
                          onClick={() => setRejectQuote(q)}
                          className="flex items-center gap-1.5 p-1.5 px-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all font-sans font-bold"
                        >
                          <X size={11} /> Reject
                        </button>
                        <button
                          onClick={() => handleApprove(q)}
                          disabled={isActionLoading}
                          className="flex items-center gap-1.5 p-1.5 px-3 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 font-sans font-bold transition-all"
                        >
                          <Check size={11} /> Approve
                        </button>
                      </div>
                    )}

                    {q.status !== 'PENDING' && (
                      <div className="flex items-center gap-1">
                        <Clock size={10} />
                        <span>Reviewed: {q.approvedAt ? new Date(q.approvedAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    )}

                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* EDIT & APPROVE INLINE MODAL */}
      <AnimatePresence>
        {editQuote && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-800">Edit and Approve Quote</h3>
                <button 
                  onClick={() => setEditQuote(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form body */}
              <form onSubmit={handleEditApproveSubmit} className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configure Driver Quote Content</label>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-500 resize-none"
                    maxLength={150}
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                    <span>Clean phrasing and check grammar rules</span>
                    <span>{editText.length} / 150 chars</span>
                  </div>
                </div>

                <div className="flex gap-2.5 justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setEditQuote(null)}
                    className="text-[10px] font-bold uppercase tracking-wider py-2.5 px-4 text-slate-500 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editText.trim().length < 10 || editText.trim().length > 150}
                    className="text-[10px] font-bold uppercase tracking-wider py-2.5 px-5 bg-slate-900 text-amber-500 rounded-xl hover:bg-slate-850 shadow-md transition disabled:opacity-50"
                  >
                    Apply & Approve
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REJECT MODAL with Reason required */}
      <AnimatePresence>
        {rejectQuote && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-850">Reject Submittal</h3>
                <button 
                  onClick={() => setRejectQuote(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form body */}
              <form onSubmit={handleRejectSubmit} className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Provide rejection reason</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setRejectReasonText(e.target.value);
                      }
                    }}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                  >
                    <option value="">Select standard rejection template...</option>
                    <option value="Contains promotional/commercial URLs or website references.">Promotional URLs/Links</option>
                    <option value="Contains personal contact details or phone digits.">Contact Details / Phone</option>
                    <option value="Contains religious campaigning, political symbols, or sectarian references.">Religious/Political content</option>
                    <option value="Statement length is inappropriate (must be 10-150 characters).">Length Inappropriate</option>
                    <option value="Quote language or imagery is flagged for program safety rules.">Safety / Quality guidelines</option>
                  </select>
                  <textarea
                    value={rejectReasonText}
                    onChange={(e) => setRejectReasonText(e.target.value)}
                    placeholder="Or type a custom reason here..."
                    rows={3}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-rose-500 mt-2"
                  />
                </div>

                <div className="flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setRejectQuote(null)}
                    className="text-[10px] font-bold uppercase tracking-wider py-2.5 px-4 text-slate-500 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rejectReasonText.trim().length === 0}
                    className="text-[10px] font-bold uppercase tracking-wider py-2.5 px-5 bg-rose-600 text-white rounded-xl hover:bg-rose-500 shadow-md transition disabled:opacity-50"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
