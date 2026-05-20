import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bot, 
  Send, 
  X, 
  MessageCircle, 
  Loader2, 
  Maximize2, 
  Minimize2,
  AlertCircle
} from "lucide-react";
import { cn } from "../lib/utils";

// Remove legacy client-side initialization
// const genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });

interface Message {
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

const SYSTEM_INSTRUCTION = `
You are the "Fleet AI Assistant" for FleetOps Auto-Ads. 
Your goal is to help administrators and support agents manage a network of digital screens mounted on taxis and ride-share vehicles.

Key topics you know about:
1. Monitoring: Live tracking of driver locations and screen health.
2. Campaigns: Managing ad content, scheduling, and budget allocation across the fleet.
3. Fleet: Driver registration, vehicle assignments, and hardware status.
4. Support: Handling technical tickets from drivers or advertisers.

Tone: Professional, efficient, and helpful. 
Response style: Concise bullet points for technical info, clear instructions for system actions.

If asked about something outside FleetOps, politely redirect them to how IT relates to fleet-based advertising or logistics.
`;

export function AiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Hello! I'm your Fleet AI Assistant. How can I help you manage your fleet today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      text: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      // Use the server-side proxy
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.text,
          history: messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          })),
          language: 'English',
          role: 'admin' // Using admin role as context for this assistant
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get a response from AI server.");
      }

      const data = await response.json();
      const modelText = data.text;
      if (!modelText) throw new Error("No response from AI");

      setMessages(prev => [...prev, {
        role: "model",
        text: modelText,
        timestamp: new Date()
      }]);
    } catch (err: any) {
      console.error("AI Chat Error:", err);
      setError(err.message || "Failed to get a response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden mb-4 flex flex-col",
              isMaximized ? "w-[600px] h-[700px]" : "w-96 h-[500px]"
            )}
          >
            {/* Header */}
            <div className="bg-slate-900 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Fleet AI Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Online & Thinking</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isMaximized ? <Minimize2 className="w-4 h-4 text-slate-400" /> : <Maximize2 className="w-4 h-4 text-slate-400" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
            >
              {messages.map((m, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    m.role === "user" ? "ml-auto items-end" : "items-start"
                  )}
                >
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                    m.role === "user" 
                      ? "bg-slate-900 text-white rounded-tr-none" 
                      : "bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none"
                  )}>
                    {m.text}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 font-medium px-1">
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-2">
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  </div>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type your question..."
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1.5 p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-400 mt-2">
                Powered by Gemini AI • FleetOps Intelligence
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300",
          isOpen ? "bg-slate-900 rotate-90" : "bg-blue-600 hover:bg-blue-700"
        )}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </motion.button>
    </div>
  );
}
