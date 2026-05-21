import React from 'react';
import { motion } from 'motion/react';
import { Star, ShieldCheck, Zap } from 'lucide-react';

export function SubscriptionManager() {
  const plans = [
    {
      id: 'brass',
      name: 'Single Star Brass',
      price: '₹99',
      features: ['2 to 3 poster edits', 'Basic templates', 'Limited exports'],
      color: 'text-amber-700',
      icon: Star
    },
    {
      id: 'silver',
      name: 'Double Star Silver',
      price: '₹199/month',
      features: ['8 to 10 poster edits', 'Premium templates', 'Better exports', 'Remove watermark'],
      color: 'text-slate-500',
      icon: ShieldCheck
    },
    {
      id: 'gold',
      name: 'Triple Star Gold',
      price: '₹399/month',
      features: ['Unlimited poster editing', 'All templates', 'Premium AI tools', 'Priority rendering'],
      color: 'text-amber-500',
      icon: Zap
    }
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-slate-950 uppercase tracking-widest">Upgrade Your Plan</h2>
        <p className="text-slate-500 font-medium italic">Unlock professional features with our Pro subscriptions.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all space-y-6">
            <plan.icon className={cn("w-10 h-10", plan.color)} />
            <div className="space-y-1">
              <h3 className="font-black text-lg text-slate-950 uppercase tracking-widest">{plan.name}</h3>
              <p className="text-xl font-bold">{plan.price}</p>
            </div>
            <ul className="space-y-3">
              {plan.features.map(f => (
                <li key={f} className="text-slate-600 text-sm font-medium flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {f}
                </li>
              ))}
            </ul>
            <button className="w-full py-3 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
              Upgrade Now
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
