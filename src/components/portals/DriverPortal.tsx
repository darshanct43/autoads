import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DollarSign, MapPin, Settings, AlertTriangle, Globe, ChevronRight, BarChart2, Bell, Wallet, ArrowDownCircle, Info, X, Landmark, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DriverPortal() {
  const languages = [
    { code: 'EN', name: 'English' },
    { code: 'HI', name: 'हिंदी (Hindi)' },
    { code: 'KN', name: 'ಕನ್ನಡ (Kannada)' },
    { code: 'TA', name: 'தமிழ் (Tamil)' },
    { code: 'TE', name: 'తెలుగు (Telugu)' },
    { code: 'MR', name: 'मराठी (Marathi)' },
    { code: 'ML', name: 'മലയാളം (Malayalam)' },
    { code: 'BN', name: 'বাংলা (Bengali)' },
    { code: 'GU', name: 'ગુજરાતી (Gujarati)' },
    { code: 'PA', name: 'ਪੰਜਾਬੀ (Punjabi)' }
  ] as const;

  type LangCode = typeof languages[number]['code'];

  const [lang, setLang] = useState<LangCode>('EN');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [status, setStatus] = useState<'ACTIVE' | 'OFFLINE'>('ACTIVE');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showDevice, setShowDevice] = useState(false);

  const t: Record<LangCode, any> = {
    EN: {
      earnings: 'Earnings',
      today: 'Today',
      rides: 'Live Ads Run',
      repair: 'Report issue',
      status: 'Current Status',
      active: 'Online',
      offline: 'Offline',
      welcome: 'Welcome, Manju',
      news: 'New Ad: National Brand campaign starts tomorrow!',
      map: 'Ad Hotspots',
      withdraw: 'Withdraw Cash',
      balance: 'Available Balance',
      stopSession: 'STOP SESSION',
      startSession: 'START SESSION',
      trending: '↑ Trending Up',
      cap: "Today's Cap",
      supportDesc: "Requests processed within 48 hours directly to your linked bank account.",
      instantSupport: "Instant Support Connect",
      hwDiagnostics: "Hardware diagnostics",
      devManager: "Device Manager",
      raiseWithdraw: "Raise Withdrawal",
      enterAmount: "Enter Amount",
      linkedPayout: "Linked Payout Method",
      confirmOtp: "Confirm via OTP",
      bankNote: "Payment will hit your bank account within 48 hours.",
      reportIssue: "Report Issue",
      issueDesc: "Please describe the problem you are facing with the device or mapping.",
      submitTicket: "Submit Support Ticket",
      hwStatus: "Hardware Status",
      diagnostics: "Run Self-Diagnostics",
      selectLanguage: "Select Language"
    },
    HI: {
      earnings: 'कमाई',
      today: 'आज',
      rides: 'चल रहे विज्ञापन',
      repair: 'समस्या की रिपोर्ट करें',
      status: 'वर्तमान स्थिति',
      active: 'ऑनलाइन',
      offline: 'ऑफलाइन',
      welcome: 'स्वागत है, मंजू',
      news: 'नया विज्ञापन: राष्ट्रीय ब्रांड अभियान कल से शुरू होगा!',
      withdraw: 'नकद निकालें',
      balance: 'कुल राशि',
      stopSession: 'सत्र रोकें',
      startSession: 'सत्र शुरू करें',
      trending: '↑ ऊपर जा रहा है',
      cap: 'आज की सीमा',
      instantSupport: 'त्वरित सहायता',
      devManager: 'डिवाइस मैनेजर',
      hwStatus: 'हार्डवेयर स्थिति',
      diagnostics: 'स्वयं-जांच चलाएं',
      selectLanguage: 'भाषा चुनें'
    },
    KN: {
      earnings: 'ಸಂಪಾದನೆ (Earnings)',
      today: 'ಇಂದು',
      rides: 'ಚಾಲನೆಯಲ್ಲಿರುವ ಜಾಹೀರಾತುಗಳು',
      repair: 'ದೂರು ಸಲ್ಲಿಸಿ (Report issue)',
      status: 'ಪ್ರಸ್ತುತ ಸ್ಥಿತಿ',
      active: 'ಆನ್‌ಲೈನ್',
      offline: 'ಆಫ್‌ಲೈನ್',
      welcome: 'ನಮಸ್ಕಾರ, ಮಂಜು',
      news: 'ಹೊಸ ಜಾಹೀರಾತು: ಹಾಸನ ಕಾಫಿ ಹಬ್ಬ ನಾಳೆಯಿಂದ!',
      withdraw: 'ಹಣ ಹಿಂಪಡೆಯಿರಿ',
      balance: 'ಲಭ್ಯವಿರುವ ಹಣ',
      stopSession: 'ಸೆಷನ್ ನಿಲ್ಲಿಸಿ',
      startSession: 'ಸೆಷನ್ ಪ್ರಾರಂಬಿಸಿ',
      trending: '↑ ಏರಿಕೆ ಪ್ರವೃತ್ತಿ',
      cap: 'ಇಂದಿನ ಮಿತಿ',
      instantSupport: 'ತ್ವರಿತ ಬೆಂಬಲ',
      devManager: 'ಸಾಧನ ನಿರ್ವಾಹಕ',
      hwStatus: 'ಹಾರ್ಡ್ವೇರ್ ಸ್ಥಿತಿ',
      diagnostics: 'ಸ್ವಯಂ-ರೋಗನಿರ್ಣಯ ಚಲಾಯಿಸಿ',
      selectLanguage: 'ಭಾಷೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿ'
    },
    TA: {
      earnings: 'வருமானம்',
      today: 'இன்று',
      rides: 'நேரடி விளம்பரங்கள்',
      repair: 'சிக்கலைப் புகாரளிக்கவும்',
      status: 'தற்போதைய நிலை',
      active: 'ஆன்லைன்',
      offline: 'ஆஃப்லைன்',
      welcome: 'வரவேற்கிறோம், மஞ்சு',
      news: 'புதிய விளம்பரம்: தேசிய பிராண்ட் பிரச்சாரம் நாளை தொடங்குகிறது!',
      withdraw: 'பணம் எடு',
      balance: 'இருப்பு',
      stopSession: 'அமர்வை நிறுத்து',
      startSession: 'அமர்வைத் தொடங்கு',
      trending: '↑ டிரெண்டிங்',
      cap: 'இன்றைய வரம்பு',
      instantSupport: 'உடனடி ஆதரவு',
      devManager: 'சாதன மேலாளர்',
      hwStatus: 'வன்பொருள் நிலை',
      diagnostics: 'சுய-கண்டறிதலை இயக்கு',
      selectLanguage: 'மொழியைத் தேர்ந்தெடுக்கவும்'
    },
    TE: {
      earnings: 'సంపాదన',
      today: 'నేడు',
      rides: 'లైవ్ ప్రకటనలు',
      repair: 'సమస్యను నివేదించండి',
      status: 'ప్రస్తుత స్థితి',
      active: 'ఆన్‌లైన్',
      offline: 'ఆఫ్‌లైన్',
      welcome: 'స్వాగతం, మంజు',
      news: 'కొత్త ప్రకటన: జాతీయ బ్రాండ్ ప్రచారం రేపు ప్రారంభమవుతుంది!',
      withdraw: 'నగదు విత్‌డ్రా',
      balance: 'అందుబాటులో ఉన్న నిల్వ',
      stopSession: 'సెషన్ ఆపు',
      startSession: 'సెషన్ ప్రారంభించు',
      trending: '↑ ట్రెండింగ్',
      cap: 'నేటి క్యాప్',
      instantSupport: 'తక్షణ మద్దతు',
      devManager: 'పరికర నిర్వాహకుడు',
      hwStatus: 'హార్డ్‌వేర్ స్థితి',
      diagnostics: 'స్వీయ నిర్ధారణను రన్ చేయండి',
      selectLanguage: 'భాషను ఎంచుకోండి'
    },
    MR: {
      earnings: 'कमाई',
      today: 'आज',
      rides: 'लाइव्ह जाहिराती',
      repair: 'समस्या नोंदवा',
      status: 'सध्याची स्थिती',
      active: 'ऑनलाइन',
      offline: 'ऑफलाइन',
      welcome: 'स्वागत आहे, मंजू',
      news: 'नवीन जाहिरात: राष्ट्रीय ब्रँड मोहीम उद्यापासून सुरू होईल!',
      withdraw: 'पैसे काढा',
      balance: 'उपलब्ध शिल्लक',
      stopSession: 'सत्र थांबवा',
      startSession: 'सत्र सुरू करा',
      trending: '↑ ट्रेंडिंग',
      cap: 'आजची मर्यादा',
      instantSupport: 'त्वरित समर्थन',
      devManager: 'डिव्हाइस व्यवस्थापक',
      hwStatus: 'हार्डवेअर स्थिती',
      diagnostics: 'स्वयं-निदान चालवा',
      selectLanguage: 'भाषा निवडा'
    },
    ML: {
      earnings: 'സമ്പാദ്യം',
      today: 'ഇന്ന്',
      rides: 'തത്സമയ പരസ്യങ്ങൾ',
      repair: 'പ്രശ്നം റിപ്പോർട്ട് ചെയ്യുക',
      status: 'നിലവിലെ നില',
      active: 'ഓൺലൈൻ',
      offline: 'ഓഫ്‌ലൈൻ',
      welcome: 'സ്വാഗതം, മഞ്ജു',
      news: 'പുതിയ പരസ്യം: ദേശീയ ബ്രാൻഡ് കാമ്പയിൻ നാളെ ആരംഭിക്കുന്നു!',
      withdraw: 'പണം പിൻവലിക്കുക',
      balance: 'ലഭ്യമായ ബാലൻസ്',
      stopSession: 'സെഷൻ നിർത്തുക',
      startSession: 'സെഷൻ തുടങ്ങുക',
      trending: '↑ മുകളിലേക്ക്',
      cap: 'ഇന്നത്തെ പരിധി',
      instantSupport: 'ഉടനടി പിന്തുണ',
      devManager: 'ഉപകരണ മാനേജർ',
      hwStatus: 'ഹാർഡ്‌വെയർ നില',
      diagnostics: 'സ്വയം രോഗനിർണ്ണയം നടത്തുക',
      selectLanguage: 'ഭാഷ തിരഞ്ഞെടുക്കുക'
    },
    BN: {
      earnings: 'উপার্জন',
      today: 'আজ',
      rides: 'লাইভ বিজ্ঞাপন',
      repair: 'সমস্যা রিপোর্ট করুন',
      status: 'বর্তমান অবস্থা',
      active: 'অনলাইন',
      offline: 'অফলাইন',
      welcome: 'স্বাগতম, মঞ্জু',
      news: 'নতুন বিজ্ঞাপন: জাতীয় ব্র্যান্ড অভিযান আগামীকাল শুরু হবে!',
      withdraw: 'টাকা উত্তোলন',
      balance: 'উপলব্ধ ব্যালেন্স',
      stopSession: 'সেশন বন্ধ করুন',
      startSession: 'সেশন শুরু করুন',
      trending: '↑ ঊর্ধ্বমুখী',
      cap: 'আজকের সীমা',
      instantSupport: 'তাত্ক্ষণিক সমর্থন',
      devManager: 'ডিভাইস ম্যানেজার',
      hwStatus: 'হার্ডওয়্যার স্থিতি',
      diagnostics: 'সেলফ-ডায়াগনস্টিক চালান',
      selectLanguage: 'ভাষা নির্বাচন করুন'
    },
    GU: {
      earnings: 'કમાણી',
      today: 'આજે',
      rides: 'લાઇવ જાહેરાતો',
      repair: 'સમસ્યાની જાણ કરો',
      status: 'વર્તમાન સ્થિતિ',
      active: 'ઓનલાઇન',
      offline: 'ઓફલાઇન',
      welcome: 'સ્વાગત છે, મંજુ',
      news: 'નવી જાહેરાત: રાષ્ટ્રીય બ્રાન્ડ અભિયાન આવતીકાલથી શરૂ થશે!',
      withdraw: 'રોકડ ઉપાડો',
      balance: 'ઉપલબ્ધ બેલેન્સ',
      stopSession: 'સત્ર બંધ કરો',
      startSession: 'સત્ર શરૂ કરો',
      trending: '↑ ઉપર જાય છે',
      cap: 'આજની મર્યાદા',
      instantSupport: 'ત્વરિત સપોર્ટ',
      devManager: 'ડિવાઇસ મેનેજર',
      hwStatus: 'હાર્ડવેર સ્થિતિ',
      diagnostics: 'સેલ્ફ-ડાયગ્નોસ્ટિક ચલાવો',
      selectLanguage: 'ભાષા પસંદ કરો'
    },
    PA: {
      earnings: 'ਕਮਾਈ',
      today: 'ਅੱਜ',
      rides: 'ਲਾਈਵ ਵਿਗਿਆਪਨ',
      repair: 'ਸਮੱਸਿਆ ਦੀ ਰਿਪੋਰਟ ਕਰੋ',
      status: 'ਮੌਜੂਦਾ ਸਥਿਤੀ',
      active: 'ਆਨਲਾਈਨ',
      offline: 'ਆਫਲਾਈਨ',
      welcome: 'ਜੀ ਆਇਆਂ ਨੂੰ, ਮੰਜੂ',
      news: 'ਨਵਾਂ ਵਿਗਿਆਪਨ: ਰਾਸ਼ਟਰੀ ਬ੍ਰਾਂਡ ਮੁਹਿੰਮ ਕੱਲ੍ਹ ਤੋਂ ਸ਼ੁਰੂ ਹੋਵੇਗੀ!',
      withdraw: 'ਨਕਦ ਕਢਵਾਓ',
      balance: 'ਉਪਲਬਧ ਬਕਾਇਆ',
      stopSession: 'ਸੈਸ਼ਨ ਰੋਕੋ',
      startSession: 'ਸੈਸ਼ਨ ਸ਼ੁਰੂ ਕਰੋ',
      trending: '↑ ਉੱਪਰ ਜਾ ਰਿਹਾ ਹੈ',
      cap: 'ਅੱਜ ਦੀ ਸੀਮਾ',
      instantSupport: 'ਤੁਰੰਤ ਸਹਾਇਤਾ',
      devManager: 'ਡਿਵਾਈਸ ਮੈਨੇਜਰ',
      hwStatus: 'ਹਾਰਡਵੇਅਰ ਸਥਿતી',
      diagnostics: 'ਸਵੈ-ਜਾਂਚ ਚਲਾਓ',
      selectLanguage: 'ਭਾਸ਼ਾ ਚੁਣੋ'
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans">
      {/* Driver Header */}
      <header className="bg-white border-b border-slate-100 p-5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold overflow-hidden border border-slate-200">
             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Manju" alt="Avatar" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-900 leading-tight">{t[lang].welcome}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">HSA-RICK-4822</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowLangPicker(true)}
            className="px-3 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-all border border-slate-100 gap-2"
          >
            <Globe size={16} />
            {languages.find(l => l.code === lang)?.name.split(' ')[0]}
          </button>
          <button className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 border border-slate-100 relative">
             <Bell size={18} />
             <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-amber-500 rounded-full border border-white" />
          </button>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Status Hub */}
        <div className="glass-card p-6 rounded-3xl flex items-center justify-between shadow-sm">
           <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t[lang].status}</p>
              <div className="flex items-center gap-2">
                 <div className={cn("w-2 h-2 rounded-full", status === 'ACTIVE' ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-slate-400")} />
                 <span className="font-bold text-slate-900 text-sm tracking-tight">{status === 'ACTIVE' ? t[lang].active : t[lang].offline}</span>
              </div>
           </div>
           <button 
            onClick={() => setStatus(status === 'ACTIVE' ? 'OFFLINE' : 'ACTIVE')}
            className={cn("px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border", 
              status === 'ACTIVE' ? "bg-slate-50 text-slate-400 border-slate-100" : "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200"
            )}
           >
              {status === 'ACTIVE' ? t[lang].stopSession : t[lang].startSession}
           </button>
        </div>

        {/* Real-time Earnings Meter */}
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-amber-500">
                 <DollarSign size={20} />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{t[lang].earnings}</p>
                 <h3 className="text-2xl font-bold tracking-tight leading-none mb-1">₹842</h3>
                 <p className="text-[8px] text-green-400 font-bold tracking-widest uppercase">{t[lang].trending}</p>
              </div>
           </div>
           <div className="glass-card p-6 rounded-3xl space-y-4 shadow-sm">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-900 border border-slate-100">
                 <BarChart2 size={20} />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{t[lang].rides}</p>
                 <h3 className="text-2xl font-bold tracking-tight leading-none mb-1">12</h3>
                 <p className="text-[8px] text-slate-400 font-bold tracking-widest uppercase">{t[lang].cap}</p>
              </div>
           </div>
        </div>

        {/* Wallet & Withdrawal Section */}
        <div className="glass-card p-6 rounded-3xl border border-amber-100 bg-amber-50/30 space-y-5">
           <div className="flex items-center justify-between">
              <div>
                 <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">{t[lang].balance}</p>
                 <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">₹3,450.00</h3>
              </div>
              <button 
                onClick={() => setShowWithdraw(true)}
                className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              >
                 <ArrowDownCircle size={24} />
              </button>
           </div>
           <div className="flex items-center gap-2 p-3 bg-white/50 rounded-xl border border-amber-100">
              <Info size={14} className="text-amber-500 shrink-0" />
              <p className="text-[9px] font-bold uppercase text-slate-500 leading-tight">{t[lang].supportDesc}</p>
           </div>
        </div>

        {/* Maintenance / Support */}
        <div className="space-y-4">
           <button 
            onClick={() => setShowSupport(true)}
            className="w-full group glass-card p-5 rounded-3xl flex items-center justify-between hover:bg-slate-50 transition-all shadow-sm"
           >
              <div className="flex items-center gap-4">
                 <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center text-red-500 border border-red-100">
                    <AlertTriangle size={20} />
                 </div>
                 <div className="text-left">
                    <h4 className="font-bold text-slate-900 text-sm italic">{t[lang].repair}</h4>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{t[lang].instantSupport}</p>
                 </div>
              </div>
              <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
           </button>
           
           <button 
            onClick={() => setShowDevice(true)}
            className="w-full glass-card p-5 rounded-3xl flex items-center justify-between hover:bg-slate-50 transition-all shadow-sm"
           >
              <div className="flex items-center gap-4">
                 <div className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-slate-900 border border-slate-100">
                    <Settings size={20} />
                 </div>
                 <div className="text-left">
                    <h4 className="font-bold text-slate-900 text-sm italic">{t[lang].devManager}</h4>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{t[lang].hwDiagnostics}</p>
                 </div>
              </div>
              <ChevronRight size={18} className="text-slate-200" />
           </button>
        </div>
      </main>

      {/* Withdrawal Modal */}
      <AnimatePresence>
        {showWithdraw && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowWithdraw(false)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ y: '100%' }}
               animate={{ y: 0 }}
               exit={{ y: '100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl space-y-8"
             >
                <div className="flex justify-between items-start">
                   <div>
                      <h3 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">{t[lang].raiseWithdraw}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t[lang].balance}: ₹3,450</p>
                   </div>
                   <button onClick={() => setShowWithdraw(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors">
                      <X size={20} />
                   </button>
                </div>

                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t[lang].enterAmount}</label>
                      <div className="relative">
                         <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                         <input 
                           type="number" 
                           placeholder="0.00" 
                           className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-8 pr-4 font-bold text-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                         />
                      </div>
                   </div>

                   <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t[lang].linkedPayout}</p>
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-900 border border-slate-200">
                               <Landmark size={20} />
                            </div>
                            <div>
                               <p className="text-xs font-bold text-slate-900">SBI Commercial Bank</p>
                               <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">XXXX-XXXX-4822</p>
                            </div>
                         </div>
                         <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white">
                            <CheckIcon size={12} strokeWidth={4} />
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4 pt-4">
                      <button className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                         <Smartphone size={18} /> {t[lang].confirmOtp}
                      </button>
                      <p className="text-center text-[10px] text-amber-600 font-bold uppercase tracking-tight italic">
                         {t[lang].bankNote}
                      </p>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Support Issue Modal */}
      <AnimatePresence>
        {showSupport && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setShowSupport(false)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl space-y-8"
             >
                <div className="flex justify-between items-start">
                   <h3 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">{t[lang].reportIssue}</h3>
                   <button onClick={() => setShowSupport(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20}/></button>
                </div>
                <div className="space-y-4">
                   <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">{t[lang].issueDesc}</p>
                   <textarea 
                     className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold focus:ring-1 focus:ring-amber-500 min-h-[120px]"
                     placeholder="Hardware issue, Ad not playing, etc."
                   />
                   <button className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.2em]">{t[lang].submitTicket}</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Device Manager Modal */}
      <AnimatePresence>
        {showDevice && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setShowDevice(false)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl space-y-6"
             >
                <div className="flex justify-between items-start">
                   <h3 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">{t[lang].hwStatus}</h3>
                   <button onClick={() => setShowDevice(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20}/></button>
                </div>
                <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Main Display</span>
                      <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Connected</span>
                   </div>
                   <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">GPS Module</span>
                      <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Active (4 Sat)</span>
                   </div>
                   <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">LTE Signal</span>
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Weak Signal</span>
                   </div>
                   <button className="w-full py-4 bg-amber-500 text-slate-900 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-amber-500/10 hover:bg-amber-600 transition-all">{t[lang].diagnostics}</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Language Picker Modal */}
      <AnimatePresence>
        {showLangPicker && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLangPicker(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                 <h3 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter">{t[lang].selectLanguage}</h3>
                 <button onClick={() => setShowLangPicker(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 group hover:text-slate-900 transition-colors">
                    <X size={20} />
                 </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 {languages.map((l) => (
                   <button 
                    key={l.code}
                    onClick={() => {
                      setLang(l.code);
                      setShowLangPicker(false);
                    }}
                    className={cn(
                      "p-4 rounded-2xl border text-sm font-bold tracking-tight transition-all text-left",
                      lang === l.code ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200" : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                    )}
                   >
                      {l.name}
                   </button>
                 ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-32 -right-4 pointer-events-none opacity-20">
        <motion.div
           animate={{ x: [-20, 20, -20] }}
           transition={{ duration: 10, repeat: Infinity }}
        >
          🛺
        </motion.div>
      </div>

    </div>
  );
}

const CheckIcon = ({ size, strokeWidth }: { size: number, strokeWidth: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
