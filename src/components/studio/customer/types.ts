export type SubscriptionPlan = 'FREE' | 'BRASS' | 'SILVER' | 'GOLD';

export interface PlanDetails {
  id: SubscriptionPlan;
  name: string;
  price: string;
  badge: string;
  color: string;
  features: string[];
  limits: {
    edits: number;
    premiumTemplates: boolean;
    videoEditor: 'none' | 'basic' | 'full';
    exports: string[];
    watermark: boolean;
    aiTools: boolean;
    hdRendering: boolean;
  };
}

export const PLANS: Record<SubscriptionPlan, PlanDetails> = {
  FREE: {
    id: 'FREE',
    name: 'Free Viewer',
    price: '₹0',
    badge: 'Viewer',
    color: 'slate-400',
    features: [
      'View all tools',
      'Cannot save or export',
      'Read-only mode'
    ],
    limits: {
      edits: 0,
      premiumTemplates: false,
      videoEditor: 'none',
      exports: [],
      watermark: true,
      aiTools: false,
      hdRendering: false
    }
  },
  BRASS: {
    id: 'BRASS',
    name: 'Single Star Brass',
    price: '₹99',
    badge: '🥉 Brass',
    color: 'amber-600',
    features: [
      '2 to 3 poster edits',
      'Basic templates only',
      'PNG export only',
      'Watermark enabled'
    ],
    limits: {
      edits: 3,
      premiumTemplates: false,
      videoEditor: 'none',
      exports: ['PNG'],
      watermark: true,
      aiTools: false,
      hdRendering: false
    }
  },
  SILVER: {
    id: 'SILVER',
    name: 'Double Star Silver',
    price: '₹199/month',
    badge: '🥈 Silver',
    color: 'slate-400',
    features: [
      '8 to 10 poster edits',
      'Premium templates',
      'JPG/PNG export',
      'Remove watermark',
      'Limited animations',
      'Basic video editing'
    ],
    limits: {
      edits: 10,
      premiumTemplates: true,
      videoEditor: 'basic',
      exports: ['PNG', 'JPG'],
      watermark: false,
      aiTools: false,
      hdRendering: false
    }
  },
  GOLD: {
    id: 'GOLD',
    name: 'Triple Star Gold',
    price: '₹399/month',
    badge: '🥇 Gold',
    color: 'amber-400',
    features: [
      'Unlimited editing',
      'All premium templates',
      'Advanced effects',
      'AI tools',
      'Full video editor',
      'Unlimited exports',
      'HD rendering',
      'Motion graphics'
    ],
    limits: {
      edits: Infinity,
      premiumTemplates: true,
      videoEditor: 'full',
      exports: ['PNG', 'JPG', 'PDF', 'MP4'],
      watermark: false,
      aiTools: true,
      hdRendering: true
    }
  }
};

export type AspectRatio = '16:9' | '9:16' | '1:1' | '19-INCH';

export interface EditorState {
  plan: SubscriptionPlan;
  editsUsed: number;
  activeCanvas: 'DESIGN' | 'VIDEO';
  aspectRatio: AspectRatio;
  safeZone: boolean;
  brightness: number;
  outdoorMode: boolean;
}
