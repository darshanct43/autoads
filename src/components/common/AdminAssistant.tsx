import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bot, 
  X, 
  Send, 
  MessageSquare, 
  Terminal, 
  Sparkles,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { cn } from "@/lib/utils";

interface AdminAssistantProps {
  activeTab: string;
  systemContext: {
    driversCount: number;
    campaignsCount: number;
    liveUnitsCount: number;
    pendingWithdrawals: number;
    activeTickets: number;
    totalRevenue: number;
    transactions: any[];
    fleetHealth: string;
  };
}

export default function AdminAssistant({ activeTab, systemContext }: AdminAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { 
      role: "assistant", 
      content: `System online. I've synced with the latest network telemetry. How can I assist you today?` 
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleQuickAction = (text: string) => {
    handleSend(text);
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage = textToSend.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    if (!overrideText) setInput("");
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: (process.env as any).GEMINI_API_KEY });
      
      const transactionsBrief = systemContext.transactions
        .slice(0, 8)
        .map(t => `- ₹${t.amount} (${t.type}) by ${t.userName || 'Unknown'} on ${new Date(t.timestamp?.seconds * 1000).toLocaleDateString()}`)
        .join("\n");

      const systemInstruction = `
        You are "Darshan's AI Secretary". You managed the Auto Ads Global Network.
        
        CURRENT LOCATION: Admin is at ${activeTab}.
        
        LIVE DATA:
        - Fleet: ${systemContext.driversCount} (${systemContext.liveUnitsCount} Live)
        - Revenue: ₹${systemContext.totalRevenue}
        - Payouts: ${systemContext.pendingWithdrawals} Pending
        - Status: ${systemContext.fleetHealth}
        
        LOGS:
        ${transactionsBrief || "Activity is standard."}
        
        RULES:
        1. Be CASUAL but EFFICIENT. Address him as "Darshan" frequently.
        2. EXTREMELY SHORT ANSWERS. One sentence if possible.
        3. If you don't have data, just say "Don't know" or "No data found".
        4. "Extract/Report"? Rapid fire summary of LIVE DATA.
        5. "Payment"? Show latest 3 from LOGS in 1 row.
        6. Tone: Sharp, professional, loyal.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: "user", parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.1,
        }
      });

      const aiText = response.text || "I encountered a processing interrupt. Please retry.";
      setMessages(prev => [...prev, { role: "assistant", content: aiText }]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "Communication uplink failed. Please check your network connection." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-8 z-[1000] w-16 h-16 bg-slate-900 text-amber-500 rounded-full shadow-2xl flex items-center justify-center border-2 border-amber-500/30 hover:border-amber-500 transition-all group"
      >
        <div className="absolute inset-0 bg-amber-500 opacity-20 rounded-full animate-ping group-hover:block hidden" />
        <Bot size={28} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-4 right-4 md:bottom-28 md:right-8 z-[1001] w-[calc(100%-2rem)] md:w-full max-w-[400px] h-[80vh] md:h-[600px] bg-slate-950 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                  <Terminal size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest italic leading-none">System Secretary</h3>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Neural Link Active</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              >
                <X size={20} />
              </button>
            </div>

            {/* System Status Banner */}
            <div className="px-6 py-3 bg-amber-500/5 flex items-center justify-between border-b border-slate-800/50">
               <div className="flex items-center gap-2">
                 <RefreshCw size={10} className="text-amber-500 animate-spin [animation-duration:3s]" />
                 <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest leading-none">Scanning Network</span>
               </div>
               <div className="flex gap-4">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                    Units: <span className="text-white">{systemContext.driversCount}</span>
                  </div>
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                    Live: <span className="text-amber-500">{systemContext.liveUnitsCount}</span>
                  </div>
               </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.03),transparent)]">
              {messages.map((m, i) => (
                <div key={i} className={cn(
                  "flex flex-col max-w-[92%]",
                  m.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                )}>
                  <div className={cn(
                    "p-4 rounded-[1.5rem] text-[11px] leading-relaxed font-medium transition-all shadow-lg",
                    m.role === "user" 
                      ? "bg-amber-500 text-slate-950 rounded-br-none shadow-amber-500/10" 
                      : "bg-slate-900 text-slate-200 rounded-bl-none border border-slate-800/50 shadow-black/20"
                  )}>
                    {m.content}
                  </div>
                  <span className="text-[7px] font-black uppercase text-slate-600 mt-2 tracking-[0.2em] px-2 opacity-60">
                    {m.role === "user" ? "Primary Administrator" : "AI Secretary Agent"}
                  </span>
                </div>
              ))}
              {isLoading && (
                <div className="flex flex-col items-start gap-2 max-w-[85%]">
                  <div className="bg-slate-900 p-5 rounded-2xl rounded-bl-none border border-slate-800/50 flex gap-1.5 shadow-xl">
                    <div className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1 h-1 bg-amber-500 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="px-6 py-4 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth bg-slate-900/30 border-t border-slate-800/30">
               {[
                 { label: "Fleet Report", prompt: "Extract latest fleet data and revenue report." },
                 { label: "Revenue Ledger", prompt: "Show latest 5 transactions and pending payouts." },
                 { label: "Systems Health", prompt: "Status report on unit online telemetry." }
               ].map((action, idx) => (
                 <button
                   key={idx}
                   onClick={() => handleQuickAction(action.prompt)}
                   className="whitespace-nowrap px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[8px] font-black uppercase tracking-widest text-amber-500 hover:bg-amber-500 hover:text-slate-950 hover:border-amber-500 transition-all shadow-xl active:scale-95"
                 >
                   {action.label}
                 </button>
               ))}
            </div>

            {/* Input */}
            <div className="p-6 bg-slate-900 border-t border-slate-800">
              <div className="relative group/input">
                <input
                  type="text"
                  placeholder="Query system protocols..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-[11px] text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none pr-14 font-medium transition-all group-hover/input:border-slate-700 shadow-inner"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-amber-500 text-slate-950 rounded-xl flex items-center justify-center hover:bg-amber-400 transition-all disabled:opacity-30 disabled:grayscale active:scale-90 shadow-lg shadow-amber-500/10"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="text-[7px] text-slate-600 font-black uppercase tracking-[0.3em] mt-5 text-center opacity-40">
                Neural Network Interface • Powered by Gemini
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
