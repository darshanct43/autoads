import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Bot, User, Sparkles } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { cn } from '@/lib/utils';

const getAI = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'undefined') {
    throw new Error('GEMINI_API_KEY is missing. Please configure it in the Secrets panel.');
  }
  return new GoogleGenAI({ apiKey: key });
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I am the AutoAd AI Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        })).concat([{ role: 'user', parts: [{ text: userMessage }] }]),
        config: {
          systemInstruction: "You are a professional support assistant for AutoAd Pro, a digital advertisement network for auto-rickshaws across India. You help Drivers with tech issues, Customers with ad plans, and provide general info. Be helpful, concise, and professional. Use emojis sparingly."
        }
      });

      const responseText = response.text;
      setMessages(prev => [...prev, { role: 'assistant', content: responseText || "I'm sorry, I couldn't process that." }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Our AI is currently busy. Please contact the staff via the query tab." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-96 max-h-[500px] h-[70vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900 shadow-lg shadow-amber-500/20">
                   <Bot size={22} />
                </div>
                <div>
                   <h4 className="text-xs font-bold tracking-widest uppercase">AutoAd AI</h4>
                   <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Encrypted</span>
                   </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#f8fafc]">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex gap-3", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm border", m.role === 'user' ? "bg-slate-900 text-amber-500 border-slate-800" : "bg-white text-slate-400 border-slate-200")}>
                    {m.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                  </div>
                  <div className={cn("max-w-[85%] p-3.5 rounded-2xl text-[11px] font-bold uppercase tracking-tight leading-relaxed shadow-sm", 
                    m.role === 'user' ? "bg-slate-900 text-white rounded-tr-none" : "bg-white border border-slate-200 text-slate-700 rounded-tl-none"
                  )}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 p-3 bg-white border border-slate-200 rounded-xl w-max shadow-sm">
                  <div className="w-1.5 h-1.5 bg-slate-900/10 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-slate-900/30 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-slate-900/60 rounded-full animate-bounce" />
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Query system..."
                  className="w-full bg-[#f8fafc] border border-slate-100 rounded-xl py-3.5 pl-5 pr-12 text-[10px] font-bold uppercase tracking-widest focus:ring-1 focus:ring-amber-500 focus:outline-none placeholder:text-slate-300"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-900 text-amber-500 rounded-lg hover:bg-slate-800 transition-all disabled:opacity-50 shadow-md"
                >
                  <Send size={14} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 rounded-3xl flex items-center justify-center text-slate-900 shadow-2xl transition-all hover:scale-105 active:scale-95 z-50 border-4 border-white",
          isOpen ? "bg-slate-900 text-amber-500 rotate-90" : "bg-amber-500 shadow-amber-200/50"
        )}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
}
