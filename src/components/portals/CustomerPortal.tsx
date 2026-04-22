import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Target, Users, Zap, Image as ImageIcon, Video, ArrowUpRight, BarChart3, Clock, Wallet, Settings, Check, CreditCard, Sparkles, X, Gift, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const plans = [
  { id: 'BASIC', name: 'Starter', price: '₹4,999', reach: '500+ Autos', color: 'bg-emerald-500' },
  { id: 'PRO', name: 'Standard', price: '₹12,499', reach: '1,500+ Autos', color: 'bg-indigo-500' },
  { id: 'ULTRA', name: 'Premium', price: '₹24,999', reach: '5,000+ Autos', color: 'bg-slate-900' },
];

export default function CustomerPortal() {
  const [activePlan, setActivePlan] = useState('PRO');
  const [showPayment, setShowPayment] = useState(false);
  const [needDesigner, setNeedDesigner] = useState<boolean | null>(null);
  const [selectedState, setSelectedState] = useState('Karnataka');
  const [selectedCity, setSelectedCity] = useState('Bangalore');
  const [customCity, setCustomCity] = useState('');
  const [targetArea, setTargetArea] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'CARD' | 'PHONEPE' | 'GPAY' | 'UPI'>('RAZORPAY');

  const states = {
    'Karnataka': ['Bangalore', 'Mysore', 'Hassan', 'Hubli', 'Mangalore', 'Belgaum', 'Shimoga', 'Tumkur', 'Other'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Solapur', 'Other'],
    'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'West Delhi', 'East Delhi', 'Other'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Trichy', 'Tiruppur', 'Other'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Other'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Other'],
    'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Other'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Noida', 'Other'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Other'],
    'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Other'],
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati', 'Other'],
    'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam', 'Other'],
    'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Other'],
    'Haryana': ['Faridabad', 'Gurugram', 'Panipat', 'Ambala', 'Yamunanagar', 'Other'],
    'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Other'],
    'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Other'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Sambalpur', 'Other'],
    'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Other'],
    'Jharkhand': ['Jamshedpur', 'Ranchi', 'Dhanbad', 'Bokaro', 'Other'],
    'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Other'],
    'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Other'],
    'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Solan', 'Other'],
    'Jammu & Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Other'],
    'Others': ['Select "Other" below and specify city', 'Other']
  };

  const [selectedPlan, setSelectedPlan] = useState<any>(plans[1]);
  const [promotions, setPromotions] = useState<any[]>([]);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('autoAd_promotions') || '[]');
    setPromotions(data);
  }, []);

  const handleActivePlanChange = (planId: string) => {
    setActivePlan(planId);
    setSelectedPlan(plans.find(p => p.id === planId));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Navigation */}
      <nav className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-slate-900 font-bold">A</div>
          <span className="font-bold text-slate-900 tracking-tight text-sm uppercase tracking-widest leading-none">AutoAd Pro</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <a href="#" className="text-amber-600">Dashboard</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Campaigns</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Design Help</a>
          </div>
          <button 
            onClick={() => setShowPayment(true)}
            className="bg-slate-900 text-white px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
          >
            <Plus size={14} />
            New Campaign
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 space-y-12">
        {/* Hero Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Enterprise Analytics</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real-time performance metrics</p>
              </div>
              <button className="text-amber-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:underline">
                Full Insights <ArrowUpRight size={14} />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Network Reach', value: '1.2M', icon: <Target className="text-amber-600" /> },
                { label: 'Active Devices', value: '452', icon: <Users className="text-slate-600" /> },
                { label: 'CTR Index', value: '84%', icon: <Zap className="text-orange-600" /> },
              ].map((stat, i) => (
                <div key={i} className="glass-card p-6 rounded-3xl flex flex-col items-center text-center gap-2 shadow-sm">
                  <div className="p-2.5 bg-slate-50 rounded-xl mb-2">{stat.icon}</div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{stat.label}</p>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{stat.value}</h3>
                </div>
              ))}
            </div>

            {/* Promotions / Offers Section */}
            {promotions.length > 0 && (
              <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2 leading-none">
                      <Gift size={16} className="text-amber-500" /> Today's Exclusive Offers & Live Updates
                    </h3>
                    <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest animate-pulse">New Broadcasts</span>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {promotions.slice(0, 2).map((promo, i) => (
                      <div key={promo.id} className="relative overflow-hidden group bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all">
                        <div className="absolute top-0 right-0 p-4">
                           <div className="bg-amber-500 text-slate-900 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] shadow-lg shadow-amber-200">
                             {promo.offer || 'LIMITED OFFER'}
                           </div>
                        </div>
                        
                        <div className="flex gap-6 items-center">
                           <div className="w-24 h-24 bg-slate-900 rounded-3xl shrink-0 flex flex-col items-center justify-center border border-slate-800 shadow-xl relative overflow-hidden group-hover:scale-105 transition-transform">
                              {promo.mediaType === 'VIDEO' ? <PlayCircle className="text-amber-500" size={32} /> : <ImageIcon className="text-amber-500" size={32} />}
                              <p className="text-[7px] font-black text-amber-500/50 uppercase tracking-widest mt-2">HD QUALITY</p>
                              <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                 <span className="text-[8px] font-bold text-slate-900 bg-white px-2 py-1 rounded shadow-sm">VIEW</span>
                              </div>
                           </div>
                           
                           <div className="flex-1 space-y-3">
                              <h4 className="text-xl font-black italic tracking-tighter text-slate-900 leading-none">
                                {promo.price} <span className="text-[10px] text-slate-400 not-italic uppercase font-bold tracking-tight">/ PACKAGE</span>
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Scale</p>
                                    <p className="text-xs font-bold text-slate-900">{promo.autoCount} AUTOS</p>
                                 </div>
                                 <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Exposure</p>
                                    <p className="text-xs font-bold text-slate-900">{promo.adCount} ADS / DAY</p>
                                 </div>
                              </div>
                              <button className="w-full py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-extrabold uppercase tracking-widest text-slate-900 hover:bg-amber-500 hover:border-amber-500 transition-all">
                                Claim This Offer
                              </button>
                           </div>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {/* Campaign Placeholder */}
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden h-60 border border-slate-800">
               <div className="relative z-10 space-y-4">
                  <span className="px-3 py-1 bg-amber-500 text-slate-900 rounded-full text-[9px] font-bold uppercase tracking-widest">Active Live Session</span>
                      <h2 className="text-3xl font-bold tracking-tight text-white">Grand National Sale '26</h2>
                      <div className="flex gap-8">
                         <div>
                            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-1">Current Reach</p>
                            <p className="text-white font-bold text-lg">1,240 Units</p>
                         </div>
                         <div>
                            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-1">Target Geography</p>
                            <div className="flex items-center gap-2">
                               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                               <p className="text-white font-bold text-lg uppercase">{selectedCity}, {selectedState}</p>
                            </div>
                         </div>
                      </div>
                  <div className="pt-2 flex items-center gap-2 text-[9px] font-bold text-amber-500 uppercase tracking-widest bg-white/5 w-fit px-3 py-1.5 rounded-lg border border-white/10">
                     <Zap size={10} fill="currentColor" /> Cloud Synced: All units updated locally
                  </div>
               </div>
               <div className="absolute top-1/2 -right-12 -translate-y-1/2 opacity-10 rotate-12">
                  <BarChart3 size={300} />
               </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Subscription Tier</h3>
            <div className="space-y-4">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => handleActivePlanChange(plan.id)}
                  className={cn(
                    "w-full p-6 bg-white rounded-2xl border transition-all text-left relative overflow-hidden group",
                    activePlan === plan.id ? "border-amber-500 ring-2 ring-amber-50 shadow-md" : "border-slate-200 hover:border-slate-300 shadow-sm"
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">{plan.name}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{plan.reach}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-lg font-black text-slate-900 italic tracking-tighter">{plan.price}</p>
                       <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">per month</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="px-2 py-1 bg-slate-50 rounded text-[9px] font-bold text-slate-500 uppercase tracking-widest border border-slate-100 italic">
                      30s Slot
                    </div>
                    <div className="px-2 py-1 bg-slate-50 rounded text-[9px] font-bold text-slate-500 uppercase tracking-widest border border-slate-100 italic">
                      HQ Video
                    </div>
                  </div>
                  {activePlan === plan.id && (
                    <motion.div layoutId="plan-check" className="absolute top-0 right-0 p-3 text-amber-500">
                      <Zap size={14} fill="currentColor" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowPayment(true)}
              className="w-full bg-amber-500 text-slate-900 rounded-xl py-4 font-bold text-[11px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-sm"
            >
              Continue to Payment
            </button>
          </div>
        </div>

        {/* My Ads Management */}
        <section className="space-y-6 pb-20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest leading-none">Creative Assets Library</h3>
            <div className="flex gap-4">
              <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"><BarChart3 size={16} /></button>
              <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"><Settings size={16} /></button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <div className="aspect-[4/3] bg-white border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 group transition-all">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform shadow-lg shadow-slate-200">
                   <Plus size={20} />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Upload Asset</p>
             </div>
             {[
               { title: 'Festival Video', type: 'VIDEO', views: '245k', date: 'Oct 14' },
               { title: 'Summer Offer', type: 'IMAGE', views: '12k', date: 'Sep 22' },
               { title: 'Nation Pride', type: 'VIDEO', views: '89k', date: 'Aug 05' },
             ].map((ad, i) => (
                <div key={i} className="aspect-[4/3] glass-card rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                   <div className="h-[65%] bg-slate-100 relative overflow-hidden">
                      <div className="absolute inset-0 bg-slate-900/5 group-hover:bg-slate-900/20 transition-all" />
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest text-slate-900 border border-slate-100 italic">
                         {ad.type}
                      </div>
                   </div>
                   <div className="p-4 bg-white border-t border-slate-50 space-y-2">
                      <div className="flex justify-between items-start">
                         <h4 className="font-bold text-slate-900 text-xs truncate pr-2 uppercase tracking-tight">{ad.title}</h4>
                         <span className="text-[9px] font-bold text-slate-400 uppercase">{ad.date}</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            <ArrowUpRight size={10} className="text-amber-500" /> {ad.views} Views
                         </div>
                         <button className="text-[10px] font-bold text-slate-900 hover:text-amber-600 uppercase tracking-widest transition-colors">Edit</button>
                      </div>
                   </div>
                </div>
             ))}
          </div>
        </section>
      </main>

      {/* Payment & Designer Portal Modal */}
      <AnimatePresence>
        {showPayment && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPayment(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className={cn("p-8 text-white flex items-center justify-between", selectedPlan?.color)}>
                <div>
                  <h3 className="text-2xl font-black italic tracking-tighter uppercase">Order Summary</h3>
                  <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Plan: {selectedPlan?.name}</p>
                </div>
                <button onClick={() => setShowPayment(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Area Targeting Section */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    Target Geography
                    <span className="text-amber-600 italic">Network Config</span>
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select State</label>
                      <select 
                        value={selectedState}
                        onChange={(e) => {
                          setSelectedState(e.target.value);
                          setSelectedCity(states[e.target.value as keyof typeof states][0]);
                        }}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-tight focus:ring-1 focus:ring-amber-500 outline-none"
                      >
                        {Object.keys(states).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select City</label>
                      <select 
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-tight focus:ring-1 focus:ring-amber-500 outline-none"
                      >
                        {states[selectedState as keyof typeof states].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {selectedCity === 'Other' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 text-amber-600">Specify City Name</label>
                      <input 
                        type="text"
                        value={customCity}
                        onChange={(e) => setCustomCity(e.target.value)}
                        placeholder="Type city name here..."
                        className="w-full bg-amber-50/50 border border-amber-100 rounded-xl px-4 py-3 text-[10px] font-bold tracking-tight focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Pinpoint Specific Area/Address</label>
                    <input 
                      type="text"
                      value={targetArea}
                      onChange={(e) => setTargetArea(e.target.value)}
                      placeholder="e.g. Indiranagar 80ft Road, Sector 4..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-4 text-[10px] font-bold tracking-tight focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* Designer Help Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Custom Creative Strategy</h4>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">Need a Professional Designer?</p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">We help create your campaign story</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setNeedDesigner(true)}
                          className={cn("px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all", needDesigner === true ? "bg-slate-900 text-white" : "bg-white text-slate-400 border border-slate-200")}
                        >
                          Yes
                        </button>
                        <button 
                          onClick={() => setNeedDesigner(false)}
                          className={cn("px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all", needDesigner === false ? "bg-slate-900 text-white" : "bg-white text-slate-400 border border-slate-200")}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {needDesigner && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="overflow-hidden space-y-3 pt-3 border-t border-slate-200"
                      >
                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tight italic">
                          * NOTE: Designer services are separate charges (approx ₹1,499 - ₹4,999) based on complexity.
                        </p>
                        <div className="space-y-2">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Requirements for Design Request:</p>
                          <ul className="text-[10px] space-y-1.5 text-slate-700 font-medium">
                            <li className="flex items-center gap-2"><div className="w-1 h-1 bg-amber-500 rounded-full" /> Business Story/Concept details</li>
                            <li className="flex items-center gap-2"><div className="w-1 h-1 bg-amber-500 rounded-full" /> High-Resolution Product Images</li>
                            <li className="flex items-center gap-2"><div className="w-1 h-1 bg-amber-500 rounded-full" /> Brand Guidelines & Logo Assets</li>
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Final Checkout */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Payment Method</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'RAZORPAY', name: 'Razorpay', icon: <Zap size={14} /> },
                        { id: 'CARD', name: 'Cards', icon: <CreditCard size={14} /> },
                        { id: 'PHONEPE', name: 'PhonePe', icon: <Wallet size={14} /> },
                        { id: 'GPAY', name: 'GooglePay', icon: <Zap size={14} /> },
                        { id: 'UPI', name: 'Other UPI', icon: <Plus size={14} /> },
                      ].map(method => (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id as any)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-3 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-all",
                            paymentMethod === method.id ? "bg-slate-900 text-white border-slate-900 shadow-md" : "bg-white text-slate-500 border-slate-200 hover:border-amber-200"
                          )}
                        >
                          {method.icon}
                          {method.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100 flex-col sm:flex-row gap-4">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500 text-slate-900 rounded-xl flex items-center justify-center font-bold italic tracking-tighter">10%</div>
                        <div>
                           <p className="text-[10px] font-bold text-slate-900 uppercase tracking-tight leading-none">New Launch Offer</p>
                           <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Applied on First Month</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-lg font-black text-slate-900 tracking-tighter italic leading-none">{selectedPlan?.price}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Total Payable</p>
                     </div>
                  </div>

                  <button className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95">
                    <Check size={18} />
                    Complete {paymentMethod} Payment
                  </button>
                  <p className="text-center text-[9px] text-slate-400 font-medium italic">Secure 256-bit SSL encrypted transaction via {paymentMethod}.</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action for Designer Help */}
      <div className="fixed bottom-8 right-28 z-40">
        <button 
          onClick={() => setShowPayment(true)}
          className="bg-slate-900 text-white pl-4 pr-6 py-4 rounded-3xl flex items-center gap-3 shadow-2xl hover:-translate-y-1 transition-all group border border-slate-800"
        >
           <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-slate-900 font-bold group-hover:rotate-12 transition-transform shadow-lg shadow-amber-500/20">D</div>
           <div className="text-left">
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none mb-1">Internal Support</p>
              <h4 className="text-sm font-bold tracking-tight uppercase">AI Designer</h4>
           </div>
        </button>
      </div>
    </div>
  );
}
