import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { firebaseService } from '@/services/firebaseService';

function ThreeDStar({ active, type }: { active: boolean; type: 'brass' | 'silver' | 'gold' }) {
  if (!active) {
    return (
      <svg className="w-8 h-8 opacity-20 filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#94a3b8" />
      </svg>
    );
  }

  // Create highly-polished metallic 3D chiseled star styles
  const gradientId = `three-d-star-${type}`;
  let baseColor1 = '';
  let baseColor2 = '';
  let shadowColor = '';
  let bevelLight = '';
  let bevelDark = '';

  if (type === 'brass') {
    baseColor1 = '#D97706'; // rich bronze / brass amber-700 tones
    baseColor2 = '#78350F';
    shadowColor = '#451A03';
    bevelLight = '#FED7AA';
    bevelDark = '#7C2D12';
  } else if (type === 'silver') {
    baseColor1 = '#E2E8F0'; // shiny metallic silver
    baseColor2 = '#64748B';
    shadowColor = '#334155';
    bevelLight = '#FFFFFF';
    bevelDark = '#1E293B';
  } else { // gold
    baseColor1 = '#FBBF24'; // gleaming 3D gold
    baseColor2 = '#92400E';
    shadowColor = '#451A03';
    bevelLight = '#FEF9C3';
    bevelDark = '#78350F';
  }

  return (
    <div className="relative group/star">
      <svg 
        className="w-9 h-9 transform transition-all duration-300 hover:scale-110 hover:rotate-12 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.35)] select-none" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={baseColor1} />
            <stop offset="45%" stopColor={baseColor1} />
            <stop offset="55%" stopColor={baseColor2} />
            <stop offset="100%" stopColor={baseColor2} />
          </linearGradient>
        </defs>

        {/* Realistic drop-shadow layer of the star displaced slightly downward */}
        <path 
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
          fill={shadowColor} 
          transform="translate(1.2, 1.2)"
          opacity="0.45"
        />

        {/* Base Beveled Star Body */}
        <path 
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
          fill={`url(#${gradientId})`}
          stroke={shadowColor}
          strokeWidth="0.5"
          strokeLinejoin="round"
        />

        {/* Chiseled depth: Facet shading (Left half gets light opacity, right half shadow skew) */}
        <path d="M12 2L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" opacity="0.22" />
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L12 2Z" fill="black" opacity="0.15" />

        {/* Accentuate the chiseled ridges for the premium 3D look */}
        <line x1="12" y1="2" x2="12" y2="17.77" stroke={bevelLight} strokeWidth="0.5" opacity="0.5" />
        <line x1="5.82" y1="21.02" x2="12" y2="12" stroke={bevelLight} strokeWidth="0.5" opacity="0.45" />
        <line x1="18.18" y1="21.02" x2="12" y2="12" stroke={bevelDark} strokeWidth="0.5" opacity="0.4" />
        <line x1="22" y1="9.27" x2="12" y2="12" stroke={bevelDark} strokeWidth="0.5" opacity="0.4" />
        <line x1="2" y1="9.27" x2="12" y2="12" stroke={bevelLight} strokeWidth="0.5" opacity="0.5" />

        {/* Super-delicate bright outline overlay for glass/metal shine */}
        <path 
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
          stroke={bevelLight}
          strokeWidth="0.25"
          opacity="0.7"
        />
      </svg>
    </div>
  );
}

export function SubscriptionManager() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [phone, setPhone] = useState<string>("");

  React.useEffect(() => {
    const u = auth.currentUser;
    if (u) {
      if (u.phoneNumber) {
        setPhone(u.phoneNumber.replace('+91', ''));
      }
      firebaseService.getUserProfile(u.uid).then((prof) => {
        if (prof?.mobile) {
          setPhone(prof.mobile.replace('+91', ''));
        } else if (prof?.phone) {
          setPhone(prof.phone.replace('+91', ''));
        }
      }).catch(console.error);
    }
  }, []);

  const plans = [
    {
      id: 'brass',
      name: 'Brass',
      price: '₹999',
      features: ['Basic templates', 'Standard exports', '2 to 3 poster edits'],
      color: 'text-amber-700',
      stars: 1,
      amount: 999,
      highlight: false
    },
    {
      id: 'silver',
      name: 'Silver',
      price: '₹1999',
      features: ['All Premium Templates', 'Priority HD rendering', 'No watermark', 'Video editor access', 'Templates access'],
      color: 'text-slate-400',
      stars: 2,
      amount: 1999,
      highlight: false
    },
    {
      id: 'gold',
      name: 'Gold',
      price: '₹3999',
      features: ['Unlimited AI Auto-Fit', 'Canva feature access', 'AI tools access', 'Priority HD rendering', 'No export limits', 'All Premium Templates'],
      color: 'text-amber-400',
      stars: 3,
      amount: 3999,
      highlight: true
    }
  ];

  const handlePurchase = async (plan: any) => {
    if (loadingPlan) return;
    setLoadingPlan(plan.id);
    try {
      if (!(window as any).Razorpay) {
        throw new Error("Razorpay SDK not loaded");
      }

      // Create actual order in backend
      const orderRes = await fetch('/api/create-order', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: plan.amount })
      });

      const rawData = await orderRes.json();
      console.log("SERVER RESPONSE:", rawData);
      console.log("CREATE ORDER RESPONSE:", rawData);

      if (!orderRes.ok) {
        throw new Error(
          rawData?.description ||
          rawData?.message ||
          "Payment failed"
        );
      }

      const order = rawData.order || rawData;
      const keyId = rawData.key_id || order.key_id || rawData.key || order.key;
      const orderData = {
        ...order,
        key_id: keyId
      };

      console.log(orderData.id);

      const options = {
        key: orderData.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID, 
        amount: orderData.amount, 
        currency: orderData.currency,
        name: "AutoAds Studio",
        description: `${plan.name} Subscription`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
             // Verify
             const verifyRes = await fetch('/api/verify-payment', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...response,
                  uid: auth.currentUser?.uid,
                  planData: {
                    amount: orderData.amount / 100,
                    planId: plan.id
                  }
                })
             });
             const verifyText = await verifyRes.text();
             if (verifyRes.status === 429 || verifyText.toLowerCase().includes('rate exceeded') || verifyText.toLowerCase().includes('too many requests')) {
               throw new Error("Rate limit exceeded. Please wait a moment and try again.");
             }
             let verifyData;
             try {
               verifyData = JSON.parse(verifyText);
             } catch (e) {
               throw new Error("Local verification check recommended");
             }
             if (!verifyRes.ok || !verifyData.success) throw new Error(verifyData.error || "Verification failed");

             if (auth.currentUser) {
                await firebaseService.updateUserProfile(auth.currentUser.uid, {
                   studioPlan: plan.id.toUpperCase()
                });
             }
             if (typeof (window as any).showToast === 'function') {
                (window as any).showToast(`Welcome to ${plan.name} Plan!`, 'success');
             } else {
                alert(`Successfully purchased ${plan.name}!`);
             }
          } catch(e: any) {
             console.error("Verification error:", e);
             alert(`Payment verification failed: ${e.message}`);
          }
        },
        prefill: {
          name: auth.currentUser?.displayName || "Studio User",
          email: auth.currentUser?.email || "user@example.com",
          contact: phone || ""
        },
        theme: {
          color: "#0f172a"
        }
      };

      const razor = new (window as any).Razorpay(options);
      razor.on('modal.closed', function() {
        setLoadingPlan(null);
      });
      razor.open();
    } catch (e: any) {
       console.error("Purchase error:", e);
       alert(`Failed to start purchase: ${e.message}`);
       setLoadingPlan(null);
    }
  };

  console.log("[DEBUG] Render Subscription plans:", plans.length);
  return (
    <div className="space-y-8 bg-slate-50 min-h-[500px] p-6 rounded-[2rem] border border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black italic uppercase text-slate-900 tracking-tight leading-none flex items-center gap-2">
            <Zap className="text-amber-500" /> Studio Plans
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">Upgrade Your Subscription</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <div key={plan.id} className={cn("p-8 rounded-[2rem] border shadow-sm transition-all space-y-6", plan.highlight ? "bg-slate-900 text-white border-slate-800 shadow-xl" : "bg-white border-slate-100 hover:shadow-lg text-slate-900")}>
            <div className="flex gap-1.5 items-center">
              {Array.from({ length: 3 }).map((_, i) => (
                <ThreeDStar key={`${plan.id}-${i}`} active={i < plan.stars} type={plan.id as 'brass' | 'silver' | 'gold'} />
              ))}
            </div>
            <div className="space-y-1">
              <h3 className={cn("font-black text-lg uppercase tracking-widest", plan.highlight ? "text-amber-500" : "text-slate-950")}>{plan.name}</h3>
              <p className="text-xl font-bold">{plan.price} {plan.amount > 0 && <span className={cn("text-xs uppercase tracking-widest ml-1", plan.highlight ? "text-slate-400" : "text-slate-400")}>/ month</span>}</p>
            </div>
            <ul className="space-y-3">
              {plan.features.map(f => (
                <li key={f} className={cn("text-sm font-medium flex items-center gap-3", plan.highlight ? "text-slate-300" : "text-slate-600")}>
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", plan.highlight ? "bg-amber-500" : "bg-slate-300")} />
                  {f}
                </li>
              ))}
            </ul>
            <button 
              onClick={() => handlePurchase(plan)}
              disabled={loadingPlan === plan.id}
              className={cn("w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-2 disabled:opacity-50", plan.highlight ? "bg-amber-500 text-slate-900 hover:bg-amber-400" : "bg-slate-950 text-white hover:bg-slate-800")}
            >
              {loadingPlan === plan.id ? <Loader2 size={16} className="animate-spin" /> : (plan.amount === 0 ? 'Current Plan' : 'Upgrade Now')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Minimal utility if not importing utils
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
