import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  CheckCircle, 
  CreditCard, 
  Play, 
  Sparkles, 
  Ticket, 
  X, 
  Check,
  Layout
} from 'lucide-react';
import { firebaseService, AppNotification } from '../../services/firebaseService';

interface NotificationCenterProps {
  userId?: string;
  role: 'ADMIN' | 'SUPPORT' | 'CUSTOMER' | 'DRIVER' | 'ALL' | string;
  onNavigateToTab?: (tabName: string) => void;
  shouldSubscribe?: boolean;
}

export default function NotificationCenter({ userId, role, onNavigateToTab, shouldSubscribe = true }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [liveToast, setLiveToast] = useState<AppNotification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mountTimeRef = useRef<number>(Date.now());

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!shouldSubscribe) return;
    const unsubscribe = firebaseService.subscribeToNotifications(userId, role, (notifs) => {
      // Check for incoming brand new unread notifications since component mount
      if (notifs.length > 0) {
        const unreadNew = notifs.filter(n => {
          if (n.read) return false;
          const createdTime = n.createdAt?.toMillis?.() || 
                              (n.createdAt?.seconds ? n.createdAt.seconds * 1000 : new Date(n.createdAt || 0).getTime());
          return createdTime > mountTimeRef.current;
        });

        // Show the latest new unread item as a temporary non-intrusive toast
        if (unreadNew.length > 0) {
          const newest = unreadNew[0];
          // Check if it's already shown to prevent duplicate triggers
          setLiveToast((prev) => {
            if (prev?.id === newest.id) return prev;
            return newest;
          });
          // Update mount time so we don't trigger again on snapshot refresh
          mountTimeRef.current = Date.now();
        }
      }
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [userId, role, shouldSubscribe]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Duration dismiss of live toast
  useEffect(() => {
    if (liveToast) {
      const timer = setTimeout(() => {
        setLiveToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [liveToast]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await firebaseService.markAllNotificationsRead(userId, role);
    } catch (e) {
      console.error("Failed to mark all read:", e);
    }
  };

  const handleMarkItemRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await firebaseService.markNotificationRead(id);
    } catch (e) {
      console.error("Failed to mark read:", e);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT_RECEIVED':
        return <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><CreditCard className="w-4 h-4" /></div>;
      case 'CAMPAIGN_STARTED':
        return <div className="p-2 rounded-xl bg-sky-50 text-sky-600"><Play className="w-4 h-4" /></div>;
      case 'CAMPAIGN_RECEIVED':
        return <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600"><CheckCircle className="w-4 h-4" /></div>;
      case 'DESIGNER_ASSIGNED':
        return <div className="p-2 rounded-xl bg-purple-50 text-purple-600"><Layout className="w-4 h-4" /></div>;
      case 'STUDIO_PLAN_UNLOCKED':
        return <div className="p-2 rounded-xl bg-amber-50 text-amber-500"><Sparkles className="w-4 h-4" /></div>;
      case 'SUPPORT_TICKET':
        return <div className="p-2 rounded-xl bg-rose-50 text-rose-600"><Ticket className="w-4 h-4" /></div>;
      default:
        return <div className="p-2 rounded-xl bg-slate-50 text-slate-600"><Bell className="w-4 h-4" /></div>;
    }
  };

  const handleNotifClick = async (notif: AppNotification) => {
    if (notif.id) {
      await firebaseService.markNotificationRead(notif.id);
    }
    
    // Navigate if link or tab callback is provided
    if (onNavigateToTab) {
      if (notif.type === 'SUPPORT_TICKET') {
        onNavigateToTab('TICKETS');
      } else if (notif.type === 'PAYMENT_RECEIVED' && role === 'DRIVER') {
        onNavigateToTab('PAYOUTS');
      } else if (notif.type === 'CAMPAIGN_STARTED' || notif.type === 'CAMPAIGN_RECEIVED') {
        if (role === 'CUSTOMER') onNavigateToTab('CAMPAIGNS');
        else if (role === 'DRIVER') onNavigateToTab('CAMPAIGNS');
        else onNavigateToTab('CAMPAIGNS');
      } else if (notif.type === 'STUDIO_PLAN_UNLOCKED') {
        onNavigateToTab('STUDIO');
      }
    }
    setIsOpen(false);
  };

  // Helper to format timestamps relative
  const formatTimeRelative = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toMillis ? timestamp.toMillis() : (timestamp.seconds ? timestamp.seconds * 1000 : new Date(timestamp).getTime());
    if (isNaN(date)) return 'Just now';
    
    const secDiff = Math.floor((Date.now() - date) / 1000);
    if (secDiff < 10) return 'Just now';
    if (secDiff < 60) return `${secDiff}s ago`;
    
    const minDiff = Math.floor(secDiff / 60);
    if (minDiff < 60) return `${minDiff}m ago`;
    
    const hrDiff = Math.floor(minDiff / 60);
    if (hrDiff < 24) return `${hrDiff}h ago`;
    
    return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative inline-block" id="autoads-notif-center" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-700 hover:text-slate-900 transition-all focus:outline-none"
        title="Notifications"
        type="button"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-[8px] font-black leading-none text-white ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-3 w-80 max-w-xs md:w-96 rounded-3xl bg-white border border-slate-100 shadow-[0_20px_50px_rgba(15,23,42,0.06)] overflow-hidden z-[9999]"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Activity Feed</h3>
                <p className="text-[10px] text-slate-500 font-medium">Important alerts relevant to your account</p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-black text-amber-600 hover:text-amber-700 transition-colors uppercase tracking-wider flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Clear All
                </button>
              )}
            </div>

            {/* List */}
            <div className="divide-y divide-slate-55 max-h-[360px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mb-2.5">
                    <Bell className="w-5 h-5 text-slate-300" />
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Silence is golden</h4>
                  <p className="text-[10px] text-slate-400">You do not have any notification alerts at this moment.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`flex gap-3 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors ${!notif.read ? 'bg-amber-50/20' : ''}`}
                  >
                    {getNotifIcon(notif.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1.5 mb-1">
                        <h4 className={`text-xs font-bold leading-tight truncate ${!notif.read ? 'text-slate-950' : 'text-slate-700'}`}>
                          {notif.title}
                        </h4>
                        <span className="text-[9px] font-mono whitespace-nowrap text-slate-400 mt-0.5">
                          {formatTimeRelative(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-500 break-words font-medium">
                        {notif.message}
                      </p>
                    </div>
                    
                    {!notif.read && (
                      <div className="self-center">
                        <button
                          onClick={(e) => handleMarkItemRead(notif.id!, e)}
                          className="p-1 rounded-full text-slate-300 hover:text-amber-500 hover:bg-slate-100 transition-all"
                          title="Mark as read"
                          type="button"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Non-intrusive Brand Live Toast Overlay */}
      <AnimatePresence>
        {liveToast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50, x: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20, x: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-6 right-6 w-80 md:w-96 rounded-3xl bg-slate-900 text-white shadow-[0_25px_60px_rgba(0,0,0,0.3)] border border-slate-800 p-5 z-[10000] flex gap-3.5 overflow-hidden"
          >
            {/* Ambient Background glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full filter blur-2xl" />

            <div className="self-start text-amber-400 mt-0.5 bg-slate-800 p-2 rounded-xl">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Important Notification</span>
                <span className="text-[8px] font-mono text-slate-400">Just now</span>
              </div>
              <h5 className="text-xs font-black tracking-tight text-white uppercase mb-1">{liveToast.title}</h5>
              <p className="text-[11px] leading-relaxed text-slate-400 font-medium">
                {liveToast.message}
              </p>
              {onNavigateToTab && (
                <button
                  onClick={() => {
                    handleNotifClick(liveToast);
                    setLiveToast(null);
                  }}
                  className="mt-2.5 text-[10px] font-black text-amber-400 hover:text-amber-300 uppercase tracking-wider flex items-center gap-1 transition-all"
                >
                  View Details &rarr;
                </button>
              )}
            </div>

            <button
              onClick={() => setLiveToast(null)}
              className="self-start p-1 rounded-full text-slate-500 hover:text-slate-300 hover:bg-slate-800/80 transition-colors"
              type="button"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
