import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { DriverQuote } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { Quote, MessageSquare, Plus, CheckCircle, AlertTriangle, X, Clock, HelpCircle, Heart } from 'lucide-react';
import { firebaseService } from '@/services/firebaseService';

export default function DriverQuotesExtension() {
  const [isOpen, setIsOpen] = useState(false);
  const [quotes, setQuotes] = useState<DriverQuote[]>([]);
  const [quoteText, setQuoteText] = useState('');
  const [driverName, setDriverName] = useState('Driver');
  const [terminalId, setTerminalId] = useState('TRM-UNKNOWN');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  // Generate current YYYY-MM
  const getTodayMonthString = () => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  };

  const currentMonthStr = getTodayMonthString();

  // Submissions count this month
  const monthlyQuotes = quotes.filter(q => q.month === currentMonthStr);
  const monthlyUsed = monthlyQuotes.length;
  const isLimitReached = monthlyUsed >= 3;

  const [footerEl, setFooterEl] = useState<Element | null>(null);

  useEffect(() => {
    const locateFooter = () => {
      const footer = document.querySelector('footer');
      if (footer) {
        setFooterEl(footer);
      } else {
        setFooterEl(null);
      }
    };

    locateFooter();

    // Watch the DOM for mutations (like switching views or slow mounts) to bind the button
    const observer = new MutationObserver(locateFooter);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Fetch precise driver profile to populate name/terminal fields
    firebaseService.getDriverProfile(user.uid).then((prof) => {
      if (prof) {
        setDriverName(prof.name || 'Demo Driver');
        setTerminalId(prof.terminalId || 'TRM-DEMO');
      }
    }).catch(err => console.error("Error securing profile details:", err));

    // Listen to real-time quotes updates for this driver without index requirements
    const qCol = collection(db, 'driverQuotes');
    const qQuery = query(
      qCol,
      where('driverId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(qQuery, (snapshot) => {
      const fetched: DriverQuote[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        fetched.push({
          id: doc.id,
          ...d,
          submittedAt: d.submittedAt?.toDate?.()?.toISOString() || d.submittedAt || new Date().toISOString(),
          approvedAt: d.approvedAt?.toDate?.()?.toISOString() || d.approvedAt
        } as DriverQuote);
      });
      // Perform stable sorting on the client side to bypass Firestore index constraint
      fetched.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setQuotes(fetched);
    }, (error) => {
      console.error("Error reading live community quotes:", error);
    });

    return () => unsubscribe();
  }, []);

  const validateQuote = (text: string): string | null => {
    const trimmed = text.trim();
    if (trimmed.length < 10) {
      return "Your quote is too short. Minimum required length is 10 characters.";
    }
    if (trimmed.length > 150) {
      return "Your quote is too long! Maximum allowed length is 150 characters.";
    }

    // RegEx checking for URLs
    const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+|\b\w+\.(?:com|in|org|net|co|app|xyz|club|live|info)\b/i;
    if (urlPattern.test(trimmed)) {
      return "Inspirational quotes cannot contain links, URLs, or web addresses.";
    }

    // RegEx checking for phone numbers (6+ sequential digits)
    const phonePattern = /\b\d{10}\b|(?:\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}|\b\d{6,}\b/;
    if (phonePattern.test(trimmed)) {
      return "Quotes cannot contain personal phone numbers or contact digits.";
    }

    // Rough check for banned campaign/religious/profane/hate/political phrases
    const bannedWords = [
      'vote for', 'buddha', 'jesus', 'allah', 'ram mandir', 'mosque', 'church', 'bjp', 'congress',
      'party', 'election', 'fuck', 'shit', 'scam', 'cheat', 'bastard', 'asshole', 'kill', 'hate',
      'muslim', 'hindu', 'christian', 'sikh', 'religion'
    ];
    const lowerText = trimmed.toLowerCase();
    for (const word of bannedWords) {
      if (lowerText.includes(word)) {
        return `Quotes cannot contain profanity, political, sectarian, or religious campaigning phrases. Checked element: "${word}"`;
      }
    }

    return null;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const user = auth.currentUser;
    if (!user) {
      setSubmitError("Session expired. Please log in again.");
      return;
    }

    if (isLimitReached) {
      setSubmitError("Monthly limit reached (3 submissions per calendar month).");
      return;
    }

    const validationMsg = validateQuote(quoteText);
    if (validationMsg) {
      setSubmitError(validationMsg);
      return;
    }

    setLoading(true);

    try {
      const quotePayload = {
        driverId: user.uid,
        driverName: driverName,
        terminalId: terminalId,
        quote: quoteText.trim(),
        status: 'PENDING',
        submittedAt: Timestamp.now(),
        month: currentMonthStr,
        rejectedReason: '',
        approvedBy: '',
        approvedAt: null
      };

      await addDoc(collection(db, 'driverQuotes'), quotePayload);
      setQuoteText('');
      setSubmitSuccess("Inspirational quote submitted successfully! It is now pending review by the operations team.");
    } catch (err: any) {
      console.error("Failed to submit quote:", err);
      setSubmitError("System failure while registering quote: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button overlay OR Navigation Bar (Footer) Integration */}
      {footerEl ? (
        createPortal(
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all font-sans text-xs shrink-0 select-none outline-none ${
              isOpen 
                ? "bg-slate-900 text-amber-500 font-extrabold shadow-md scale-105" 
                : "text-slate-400 hover:text-slate-600"
            }`}
            id="quotes-footer-nav-btn"
            title="Inspirational Quotes Program"
          >
            <div className="relative">
              <Quote size={20} className={isOpen ? "text-amber-500" : "text-slate-400"} />
              {monthlyUsed < 3 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              )}
            </div>
            {isOpen ? (
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">Quotes</span>
            ) : (
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest leading-none">Quotes</span>
            )}
          </button>,
          footerEl
        )
      ) : (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 text-amber-500 rounded-full px-5 py-3.5 shadow-2xl hover:bg-slate-800 hover:-translate-y-0.5 transition-all outline-none"
            id="quotes-community-btn"
          >
            <div className="relative">
              <Quote size={18} className="text-amber-500" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
            </div>
            <span className="font-bold text-[11px] tracking-wider uppercase font-sans">Quotes Community</span>
            <span className="bg-slate-800 text-slate-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
              {monthlyUsed}/3 used
            </span>
          </button>
        </div>
      )}

      {/* Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100] flex justify-end">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl"
              id="quotes-drawer-panel"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-xl">
                    <Quote size={20} className="text-amber-500 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-100 font-sans tracking-tight">Driver community quotes</h3>
                    <p className="text-[10px] text-slate-400">Share positivity with daily passengers</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Content wrapper */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                
                {/* Limits Banner Card */}
                <div className="bg-slate-950/60 p-4 border border-slate-800/80 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                    <Heart size={72} className="text-amber-500" />
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-black tracking-widest text-amber-500 uppercase">MONTHLY PROGRAM LIMITS</span>
                      <h4 className="text-lg font-extrabold text-slate-50 font-sans mt-0.5">
                        {monthlyUsed} <span className="text-slate-400 font-normal">of</span> 3 utilized
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[280px]">
                        Submit up to 3 motivational quotes each calendar month to play on AutoAds terminal systems.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-300 font-mono uppercase bg-slate-800 px-2.5 py-1 rounded-full">
                        {currentMonthStr}
                      </span>
                    </div>
                  </div>

                  {/* Progressive Bar */}
                  <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${isLimitReached ? 'bg-rose-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min((monthlyUsed / 3) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Submissions Form */}
                <div className="bg-slate-950/40 p-5 border border-slate-800/50 rounded-2xl">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Plus size={14} className="text-amber-500" /> Submit Inspiration
                  </h4>

                  <form onSubmit={handleCreateSubmit} className="space-y-4">
                    <div>
                      <textarea
                        value={quoteText}
                        onChange={(e) => setQuoteText(e.target.value)}
                        placeholder="Write something inspirational... (e.g., 'Success comes from consistency, not luck.')"
                        rows={3}
                        disabled={isLimitReached}
                        className="w-full text-xs font-medium text-slate-200 placeholder-slate-500 bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-colors"
                      />
                      <div className="flex justify-between items-center mt-1.5 px-0.5">
                        <span className="text-[10px] text-slate-500 font-sans">Min 10, Max 150 chars</span>
                        <span className={`text-[10px] font-mono font-bold ${quoteText.length > 150 ? 'text-rose-500' : 'text-slate-500'}`}>
                          {quoteText.length} / 150
                        </span>
                      </div>
                    </div>

                    {submitError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10.5px] font-semibold rounded-xl flex items-start gap-2">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    {submitSuccess && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10.5px] font-semibold rounded-xl flex items-start gap-2">
                        <CheckCircle size={14} className="shrink-0 mt-0.5" />
                        <span>{submitSuccess}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || isLimitReached || quoteText.trim().length === 0}
                      className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold text-[11px] uppercase tracking-wider py-3.5 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 shadow-lg"
                    >
                      {loading ? 'Registering...' : isLimitReached ? 'Submit limit reached' : 'Submit community quote'}
                    </button>
                  </form>
                </div>

                {/* Submissions List Tabs */}
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">Your Submissions</h4>
                  
                  {/* Tab bar */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {(['PENDING', 'APPROVED', 'REJECTED'] as const).map(tab => {
                      const count = quotes.filter(q => q.status === tab).length;
                      const isActive = activeTab === tab;
                      return (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`text-[9px] font-bold tracking-wider uppercase py-2 px-1 rounded-lg transition-colors ${
                            isActive 
                              ? 'bg-slate-800 text-amber-500 font-extrabold shadow-sm' 
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {tab} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* List */}
                  <div className="space-y-2 mt-3">
                    {quotes.filter(q => q.status === activeTab).length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                        <MessageSquare size={24} className="text-slate-600 mx-auto mb-2" />
                        <p className="text-[10px] text-slate-500">No {activeTab.toLowerCase()} quotes registered</p>
                      </div>
                    ) : (
                      quotes.filter(q => q.status === activeTab).map(q => (
                        <div 
                          key={q.id} 
                          className="bg-slate-950/50 p-4 border border-slate-800 rounded-xl relative overflow-hidden space-y-2"
                        >
                          <p className="text-slate-200 font-medium text-xs italic">
                            "{q.quote}"
                          </p>

                          <div className="flex items-center justify-between text-[9px] font-mono font-semibold text-slate-500 border-t border-slate-800/80 pt-2">
                            <span className="flex items-center gap-1.5 uppercase font-sans tracking-wide">
                              {activeTab === 'PENDING' && <Clock size={10} className="text-amber-500" />}
                              {activeTab === 'APPROVED' && <CheckCircle size={10} className="text-emerald-500" />}
                              {activeTab === 'REJECTED' && <AlertTriangle size={10} className="text-rose-500" />}
                              {q.status}
                            </span>
                            <span>
                              {new Date(q.submittedAt).toLocaleDateString()}
                            </span>
                          </div>

                          {q.status === 'REJECTED' && q.rejectedReason && (
                            <div className="p-2.5 bg-rose-500/5 border border-rose-500/15 rounded-lg text-[9.5px] font-semibold text-rose-400/90 leading-relaxed font-sans mt-2">
                              Reason: {q.rejectedReason}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
