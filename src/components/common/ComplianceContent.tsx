import { motion } from 'motion/react';
import { X, Shield, FileText, RefreshCcw, Info, MessageSquare, ExternalLink, Mail, Phone, MapPin } from 'lucide-react';

export type CompliancePage = 'ABOUT' | 'PRIVACY' | 'TERMS' | 'CONTACT';

interface ComplianceContentProps {
  page: CompliancePage;
  onClose?: () => void;
  isEmbed?: boolean;
}

export default function ComplianceContent({ page, onClose, isEmbed = false }: ComplianceContentProps) {
  const renderContent = () => {
    switch (page) {
      case 'ABOUT':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-black italic uppercase text-slate-900 tracking-tight">About AutoAds / Mayaan</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              AutoAds (by Mayaan Group) is a revolutionary AI-powered transit advertising network. We bridge the gap between local businesses and high-visibility transit assets, turning everyday vehicles into smart, geo-targeted digital billboards.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">For Advertisers</h4>
                <p className="text-[11px] text-slate-600">Hyper-local targeting, real-time impression analytics, and programmatic campaign management.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">For Drivers</h4>
                <p className="text-[11px] text-slate-600">Passive income through hardware-verified ad displays, with instant payouts and performance tracking.</p>
              </div>
            </div>
          </div>
        );
      case 'PRIVACY':
        return (
          <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-2xl font-black italic uppercase text-slate-900 tracking-tight">Privacy Policy</h2>
            <div className="space-y-4">
              <section>
                <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-widest mb-1">1. DATA COLLECTION</h4>
                <p>We collect device location (GPS), hardware IDs, and driver-uploaded documentation to verify ad impressions and account eligibility.</p>
              </section>
              <section>
                <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-widest mb-1">2. LIVE TRACKING</h4>
                <p>Real-time location data is used exclusively for campaign validation and is never shared with third parties for marketing purposes.</p>
              </section>
              <section>
                <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-widest mb-1">3. FIREBASE & CLOUD</h4>
                <p>All media (images/videos) and documents are stored securely in Google Firebase and cloud-verified storage buckets.</p>
              </section>
            </div>
          </div>
        );
      case 'TERMS':
        return (
          <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-2xl font-black italic uppercase text-slate-900 tracking-tight">Terms & Conditions</h2>
            <div className="space-y-4">
              <section>
                <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-widest mb-1">1. CAMPAIGN APPROVAL</h4>
                <p>All advertisements are subject to manual moderation. We reserve the right to reject content that violates regional laws or community standards.</p>
              </section>
              <section>
                <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-widest mb-1">2. DRIVER COMPLIANCE</h4>
                <p>Drivers must maintain hardware connectivity and GPS uptime. Tampering with the display terminal will result in immediate account suspension.</p>
              </section>
            </div>
          </div>
        );
      case 'CONTACT':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-black italic uppercase text-slate-900 tracking-tight">Contact Support</h2>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 group">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <Mail size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Support</p>
                  <p className="text-sm font-bold text-slate-900">serviceprovider43@outlook.com</p>
                </div>
              </div>
              <a 
                href="https://wa.me/919481027833" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-green-500 transition-all"
              >
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-green-500 group-hover:text-white transition-all">
                  <MessageSquare size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp Business</p>
                  <p className="text-sm font-bold text-slate-900">Contact Support Team</p>
                </div>
                <ExternalLink size={14} className="text-slate-300 group-hover:text-green-500" />
              </a>
              <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 italic opacity-60">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Corporate HQ</p>
                  <p className="text-sm font-bold text-slate-900 tracking-tight">Mayaan Group, Bangalore, India</p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  if (isEmbed) return <div className="p-4">{renderContent()}</div>;

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full mx-auto overflow-hidden flex flex-col max-h-[85vh]">
      <div className="p-6 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 text-amber-500 rounded-xl flex items-center justify-center">
            <Shield size={20} />
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Compliance & Safety</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-10">
        {renderContent()}
      </div>
      <div className="p-6 bg-slate-50 text-center border-t border-slate-100 flex items-center justify-center gap-4">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">© 2026 AUTOADS NETWORK LIVE</p>
        <div className="w-1 h-1 bg-slate-300 rounded-full" />
        <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">MAYAAN GROUP</p>
      </div>
    </div>
  );
}
