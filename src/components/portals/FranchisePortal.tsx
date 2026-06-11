import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { firebaseService } from '@/services/firebaseService';
import { onSnapshot, collection, query, where, doc, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { SupportTicket, UserRole } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Settings, Users, Truck, MessageSquare, Monitor, LayoutDashboard, MoreVertical, LogOut, Target } from 'lucide-react';

import FranchiseOverview from '../franchise/FranchiseOverview';
import FranchiseDrivers from '../franchise/FranchiseDrivers';
import FranchiseCampaigns from '../franchise/FranchiseCampaigns';
import FranchiseTickets from '../franchise/FranchiseTickets';
import FranchiseTerminals from '../franchise/FranchiseTerminals';
import FranchisePersonnel from '../franchise/FranchisePersonnel';
import FranchiseSettings from '../franchise/FranchiseSettings';

interface FranchisePortalProps {
  onLogout: () => void;
  onRoleJump?: (role: UserRole) => void;
}

export default function FranchisePortal({ onLogout }: FranchisePortalProps) {
  const [activeTab, setActiveTab] = useState<'METRICS' | 'DRIVERS' | 'CAMPAIGNS' | 'TICKETS' | 'TERMINALS' | 'STAFF' | 'SETTINGS'>('METRICS');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [franchiseId, setFranchiseId] = useState<string | null>(null);
  const [territoryId, setTerritoryId] = useState<string | null>(null);
  const [franchiseDoc, setFranchiseDoc] = useState<any>(null);

  const [drivers, setDrivers] = useState<any[]>([]);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const fetchProfile = async () => {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        setUserProfile(data);
        if (data.franchiseId) setFranchiseId(data.franchiseId);
        if (data.territoryId) setTerritoryId(data.territoryId);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!franchiseId || !territoryId) return;

    const unsubFranchise = onSnapshot(doc(db, 'franchises', franchiseId), (snap) => {
      if (snap.exists()) setFranchiseDoc({ id: snap.id, ...snap.data() });
    });

    const drQuery = query(collection(db, 'drivers'), where('franchiseId', '==', franchiseId), where('territoryId', '==', territoryId));
    const unsubDrivers = onSnapshot(drQuery, (snap) => {
      setDrivers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const termQuery = query(collection(db, 'terminals'), where('franchiseId', '==', franchiseId), where('territoryId', '==', territoryId));
    const unsubTerms = onSnapshot(termQuery, (snap) => {
      setTerminals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const campQuery = query(collection(db, 'campaigns'), where('franchiseId', '==', franchiseId), where('territoryId', '==', territoryId));
    const unsubCamps = onSnapshot(campQuery, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubTickets = firebaseService.subscribeToSupportTickets(setTickets, { franchiseId, territoryId });

    const staffQuery = query(collection(db, 'users'), where('franchiseId', '==', franchiseId), where('role', '==', 'FRANCHISE_STAFF'));
    const unsubStaff = onSnapshot(staffQuery, (snap) => {
      setPersonnel(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubFranchise();
      unsubDrivers();
      unsubTerms();
      unsubCamps();
      unsubTickets();
      unsubStaff();
    };
  }, [franchiseId, territoryId]);

  const handleCreateTicket = async (ticket: any) => {
    if (!franchiseId) return;
    try {
      await firebaseService.createSupportTicket({
        ...ticket,
        userId: auth.currentUser?.uid || 'anonymous',
        franchiseId,
        cityId: userProfile?.cityId || 'Bangalore',
        stateId: userProfile?.stateId || 'KA',
        territoryId: userProfile?.territoryId || 'T-UNASSIGNED'
      });
    } catch (e) {
      console.error("Ticket Creation Failure", e);
    }
  };

  const handleInviteStaff = async (data: any) => {
    if (!franchiseId) return;
    const codeSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `INV-${franchiseId.substring(0, 4)}-${codeSuffix}`;
    try {
      await setDoc(doc(db, 'invitations', code), {
        id: code,
        franchiseId,
        role: 'FRANCHISE_STAFF',
        specialization: data.specialization || 'Support Staff',
        ownerName: data.name,
        ownerEmail: data.email?.toLowerCase(),
        status: 'PENDING',
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Failed to invite staff", e);
    }
  };

  const isOwner = userProfile?.role === 'FRANCHISE_OWNER';

  const menuItems = [
    { id: 'METRICS', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'DRIVERS', label: 'Drivers', icon: Truck },
    { id: 'CAMPAIGNS', label: 'Campaigns', icon: Target },
    { id: 'TICKETS', label: 'Support Tickets', icon: MessageSquare },
    { id: 'TERMINALS', label: 'Terminals', icon: Monitor },
    { id: 'STAFF', label: 'Personnel', icon: Users },
    { id: 'SETTINGS', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                F
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">Franchise Portal</h1>
                {userProfile?.territoryId && (
                  <span className="text-xs text-gray-500 mt-1 block">Territory: {userProfile.territoryId}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-sm text-gray-600">
                {userProfile?.name || userProfile?.email}
              </div>
               {franchiseDoc?.status === 'ACTIVE' && (
                 <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                   Live
                 </span>
               )}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors border border-gray-200"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Slide Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-72 bg-white shadow-2xl z-[70] flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <span className="font-semibold text-gray-900">Menu</span>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-2 text-gray-400 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-gray-50 space-y-3">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-50 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'METRICS' && (
              <FranchiseOverview 
                drivers={drivers}
                campaigns={campaigns}
                terminals={terminals}
                tickets={tickets}
              />
            )}
            {activeTab === 'DRIVERS' && <FranchiseDrivers drivers={drivers} />}
            {activeTab === 'CAMPAIGNS' && <FranchiseCampaigns campaigns={campaigns} />}
            {activeTab === 'TICKETS' && (
              <FranchiseTickets 
                tickets={tickets} 
                onCreateTicket={handleCreateTicket}
                onUpdateStatus={(id, status) => updateDoc(doc(db, 'supportTickets', id), { status, updatedAt: serverTimestamp() })}
              />
            )}
            {activeTab === 'TERMINALS' && <FranchiseTerminals terminals={terminals} />}
            {activeTab === 'STAFF' && (
              <FranchisePersonnel 
                staff={personnel} 
                isOwner={isOwner}
                onInvite={handleInviteStaff}
                onUpdateStatus={(id, status) => updateDoc(doc(db, 'users', id), { status, updatedAt: serverTimestamp() })}
              />
            )}
            {activeTab === 'SETTINGS' && (
              <FranchiseSettings 
                franchiseDoc={franchiseDoc} 
                userProfile={userProfile}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
