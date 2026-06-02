import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Bot, User, Sparkles, Globe, AlertCircle, CreditCard, MonitorOff, ExternalLink, Mail, Phone, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { firebaseService } from '@/services/firebaseService';
import { auth } from '@/lib/firebase';

import { geminiService } from '@/services/geminiService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  options?: string[];
  type?: 'text' | 'options' | 'escalation';
}

const LANGUAGES = ['ENGLISH', 'HINDI', 'KANNADA', 'TAMIL', 'TELUGU'];
const CATEGORIES = ['GENERAL HELP', 'DEVICE ISSUE', 'PAYMENT ISSUE', 'NO ADS DISPLAYED'];

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'LANG' | 'CAT' | 'ANS' | 'ESCALATE'>('LANG');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'WELCOME TO AUTOAD PRO SUPPORT. PLEASE SELECT YOUR LANGUAGE TO CONTINUE.', options: LANGUAGES, type: 'options' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLang, setSelectedLang] = useState('ENGLISH');
  const [uiLabels, setUiLabels] = useState({
    live: 'LIVE SUPPORT',
    placeholder: 'TYPE QUERY...',
    ticket: 'RAISE PRIORITY TICKET',
    whatsapp: 'CHAT ON WHATSAPP',
    email: 'EMAIL SUPPORT'
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (role: 'user' | 'assistant', content: string, options?: string[], type: 'text' | 'options' | 'escalation' = 'text') => {
    setMessages(prev => [...prev, { role, content, options, type }]);
  };

  const handleOptionClick = async (option: string) => {
    if (step === 'LANG') {
      setSelectedLang(option);
      addMessage('user', option);
      setStep('CAT');
      setLoading(true);
      
      const res = await geminiService.chat(`The user selected ${option}. 
      1. Say "How can I help you today?" in ${option}.
      2. Translate these 4 categories into ${option} (UPPERCASE): "GENERAL HELP", "DEVICE ISSUE", "PAYMENT ISSUE", "NO ADS DISPLAYED".
      3. Translate common UI labels into ${option} (UPPERCASE): "LIVE SUPPORT", "TYPE QUERY...", "RAISE PRIORITY TICKET", "CHAT ON WHATSAPP", "EMAIL SUPPORT".
      Return as JSON: { 
        "welcome": "...", 
        "categories": ["cat1", "cat2", "cat3", "cat4"],
        "ui": {
          "live": "...",
          "placeholder": "...",
          "ticket": "...",
          "whatsapp": "...",
          "email": "..."
        }
      }`, [], option);
      
      let welcome = "How can I help you today?";
      let translatedCats = CATEGORIES;
      
      try {
        const data = JSON.parse(res.replace(/```json|```/g, ''));
        welcome = data.welcome;
        translatedCats = data.categories;
        if (data.ui) {
          setUiLabels(data.ui);
        }
      } catch (e) {
        welcome = res;
      }
      
      setLoading(false);
      addMessage('assistant', welcome, translatedCats, 'options');
      
    } else if (step === 'CAT') {
      addMessage('user', option);
      setStep('ANS');
      setLoading(true);
      
      const answer = await geminiService.chat(`User has a ${option} issue. Provide a helpful response in ${selectedLang}. Keep it brief.`, [], selectedLang);
      setLoading(false);
      
      addMessage('assistant', answer);
      
      setTimeout(async () => {
        setLoading(true);
        const res = await geminiService.chat(`
          1. Ask "Was this helpful?" in ${selectedLang}.
          2. Translate "YES" and "NO" into ${selectedLang}.
          Return as JSON: { "prompt": "...", "yes": "...", "no": "..." }`, [], selectedLang);
        
        let prompt = "Was this helpful?";
        let yesLabel = "YES";
        let noLabel = "NO";
        
        try {
          const data = JSON.parse(res.replace(/```json|```/g, ''));
          prompt = data.prompt;
          yesLabel = data.yes;
          noLabel = data.no;
        } catch (e) {
          prompt = res;
        }

        setLoading(false);
        addMessage('assistant', prompt, [yesLabel, noLabel], 'options');
      }, 800);
    } else if (step === 'ANS') {
      addMessage('user', option);
      // Determine if it was "No" by comparing with translated "No" or just simple English check
      if (option.toUpperCase().includes('NO') || option.includes('ಅಲ್ಲ') || option.includes('नहीं') || option.includes('இல்லை')) {
        setStep('ESCALATE');
        setLoading(true);
        const sorryMsg = await geminiService.chat(`User said no. Say "I apologize. Would you like to connect with our team?" in ${selectedLang}.`, [], selectedLang);
        setLoading(false);
        addMessage('assistant', sorryMsg, [], 'escalation');
      } else {
        setLoading(true);
        const thanksMsg = await geminiService.chat(`User said yes. Say "Great! Stay safe on the road. Jai Hind!" in ${selectedLang}.`, [], selectedLang);
        setLoading(false);
        addMessage('assistant', thanksMsg);
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    addMessage('user', msg);
    setLoading(true);

    const history = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model' as 'user' | 'model',
      parts: [{ text: m.content }]
    }));

    const response = await geminiService.chat(msg, history, selectedLang);
    setLoading(false);
    addMessage('assistant', response);
    
    // Check if we should offer escalation
    if (response.toLowerCase().includes('support') || response.toLowerCase().includes('team')) {
      setStep('ESCALATE');
      addMessage('assistant', selectedLang === 'KANNADA' ? 'ನಮ್ಮ ತಂಡವನ್ನು ಸಂಪರ್ಕಿಸಿ:' : 'CONNECT WITH US:', [], 'escalation');
    }
  };

  const handleRaiseTicket = async () => {
    const user = auth.currentUser;
    try {
      await firebaseService.createSupportTicket({
        driverId: user?.uid || 'anonymous',
        driverName: user?.displayName || 'Unknown',
        title: 'Chat Escalation',
        subject: 'Chat Escalation',
        description: 'User requested human assistance via AI ChatBot',
        priority: 'MEDIUM',
        category: 'SUPPORT_CHAT'
      });
      
      setLoading(true);
      const successMsg = await geminiService.chat(`Support ticket raised successfully. Tell the user "Ticket raised! Our team will contact you soon." in ${selectedLang}.`, [], selectedLang);
      setLoading(false);
      addMessage('assistant', successMsg);
    } catch (err) {
      addMessage('assistant', selectedLang === 'KANNADA' ? 'ಟಿಕೆಟ್ ರಚಿಸಲು ವಿಫಲವಾಗಿದೆ. ದಯವಿಟ್ಟು ವಾಟ್ಸಾಪ್ ಬಳಸಿ.' : 'Failed to raise ticket. Please use WhatsApp.');
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-[100] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-80 sm:w-96 max-h-[500px] h-[70vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          >
            <div className="bg-slate-950 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900">
                   <Bot size={22} />
                </div>
                <div>
                   <h4 className="text-[10px] font-black tracking-widest uppercase">AutoAd AI</h4>
                   <div className="flex items-center gap-1.5 opacity-60">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-widest italic">{uiLabels.live}</span>
                   </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                <X size={18} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 custom-scrollbar">
              {messages.map((m, i) => (
                <div key={`${m.role}-${i}`} className="space-y-3">
                  <div className={cn("flex gap-2", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border", 
                      m.role === 'user' ? "bg-slate-900 border-slate-800 text-amber-500" : "bg-white border-slate-200 text-slate-400"
                    )}>
                      {m.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                    </div>
                    <div className={cn("max-w-[85%] p-3.5 rounded-2xl text-[10px] font-bold uppercase tracking-tight leading-relaxed shadow-sm", 
                      m.role === 'user' ? "bg-slate-900 text-white rounded-tr-none" : "bg-white border border-slate-200 text-slate-700 rounded-tl-none"
                    )}>
                      {m.content}
                    </div>
                  </div>
                  
                  {m.type === 'options' && m.options && (
                    <div className="flex flex-wrap gap-2 pl-9">
                      {m.options.map((opt, j) => (
                        <button
                          key={`${opt}-${j}`}
                          onClick={() => handleOptionClick(opt)}
                          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 hover:border-amber-500 hover:text-amber-500 transition-all shadow-sm"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {m.type === 'escalation' && (
                    <div className="space-y-2 pl-9">
                      <button 
                        onClick={handleRaiseTicket}
                        className="w-full p-4 bg-slate-900 text-amber-500 rounded-2xl flex items-center justify-between group"
                      >
                         <div className="flex items-center gap-3">
                            <AlertCircle size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{uiLabels.ticket}</span>
                         </div>
                         <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                      
                      <a 
                        href="https://wa.me/910000000000" 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full p-4 bg-emerald-500 text-white rounded-2xl flex items-center justify-between group"
                      >
                         <div className="flex items-center gap-3">
                            <Phone size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{uiLabels.whatsapp}</span>
                         </div>
                         <ExternalLink size={14} />
                      </a>

                      <a 
                        href="mailto:support@autoads.in" 
                        className="w-full p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl flex items-center justify-between group"
                      >
                         <div className="flex items-center gap-3">
                            <Mail size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{uiLabels.email}</span>
                         </div>
                         <ChevronRight size={14} />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={uiLabels.placeholder}
                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button type="submit" className="w-12 h-12 bg-slate-950 text-amber-500 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all">
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center text-slate-950 shadow-2xl transition-all hover:scale-105 active:scale-95 z-50 border-4 border-white",
          isOpen ? "bg-slate-950 text-amber-500 rotate-90" : "bg-amber-500 shadow-amber-500/20"
        )}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
}