/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, testFirestoreConnection } from './lib/firebase';
import MariaAgent from './components/MariaAgent';

// Lazy load non-critical UI components for performance
const UserProfile = React.lazy(() => import('./components/UserProfile'));
const NotificationCenter = React.lazy(() => import('./components/NotificationCenter'));
const SavedItems = React.lazy(() => import('./components/SavedItems'));
const MultiUtilityWidget = React.lazy(() => import('./components/MultiUtilityWidget'));
const DeviceStatusWidget = React.lazy(() => import('./components/DeviceStatusWidget'));
const Onboarding = React.lazy(() => import('./components/Onboarding'));
import { 
  Search, Info, Settings, User as UserIcon, Star,
  Menu, X, Clock, Globe, Plus, MoreVertical, ChevronRight, Sparkles,
  Share2, MessageCircle, MessageSquare, Edit2, Pin, PinOff, Trash2, Bell, AlertTriangle,
  RotateCcw, Shield, Brain, Bookmark
} from 'lucide-react';
import { ChatSession, UserNotification, SUPPORTED_LANGUAGES } from './types';
import { getTranslation } from './translations';
import { generateId } from './lib/utils';

// Simple Error Boundary component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Maria App Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[100dvh] w-full flex items-center justify-center bg-slate-950 text-white p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mb-6">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-xl font-black mb-4">Waduh, Maria lagi kendala!</h1>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">Terjadi kesalahan sistem yang tidak terduga. Silakan muat ulang halaman atau hapus cache browser jika masalah berlanjut.</p>
            <div className="w-full space-y-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-brand-blue text-white rounded-xl font-bold hover:bg-blue-600 transition-all"
              >
                Muat Ulang
              </button>
              <button 
                onClick={() => {
                  window.location.reload();
                }}
                className="w-full py-3 border border-slate-800 text-slate-500 rounded-xl font-bold hover:text-white transition-all text-xs"
              >
                Muat Ulang Paksa
              </button>
            </div>
            {this.state.error && (
              <pre className="mt-8 p-4 bg-black/50 rounded-xl text-[10px] text-slate-600 text-left w-full overflow-auto max-h-32">
                {String(this.state.error)}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function MainApp() {
  const [language, setLanguage] = useState('id');
  const t = getTranslation(language);
  const [user, setUser] = useState<User | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSavedItemsOpen, setIsSavedItemsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const updateUnreadCount = useCallback(async () => {
    try {
      const { auth } = await import('./lib/firebase');
      if (auth?.currentUser) {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('./lib/firebase');
        if (db) {
          const q = query(
            collection(db, 'notifications'),
            where('userId', '==', auth.currentUser.uid),
            where('isRead', '==', false)
          );
          const snap = await getDocs(q);
          setUnreadNotifications(snap.size);
        }
      } else {
        setUnreadNotifications(0);
      }
    } catch (e) {
      console.error("Maria: Failed to update unread count", e);
      setUnreadNotifications(0);
    }
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isLiteMode, setIsLiteMode] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isPlus, setIsPlus] = useState(false);
  const [userName, setUserName] = useState('Pengguna');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [isMigrationFinished, setIsMigrationFinished] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      const { auth } = await import('./lib/firebase');
      if (auth?.currentUser) {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('./lib/firebase');
        if (db) {
          const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (snap.exists()) {
            const profile = snap.data();
            setUserName(profile.name || 'Pengguna');
            setUserAvatar(profile.avatar || null);
            setIsPlus(profile.isPlus || false);
            setLanguage(profile.preferences?.language || 'id');
            
            const accentColor = profile.preferences?.accentColor || 'blue';
            const theme = profile.preferences?.theme || 'light';
            
            const colors: Record<string, string> = {
              blue: '#001B3D', teal: '#14B8A6', gold: '#FBBF24',
              purple: '#7E22CE', green: '#22c55e', red: '#ef4444',
              pink: '#db2777', amber: '#d97706', slate: '#475569', yellow: '#eab308'
            };
            document.documentElement.style.setProperty('--maria-accent', colors[accentColor] || colors.blue);
            setIsLiteMode(profile.preferences?.performanceMode || false);

            if (theme === 'system') {
              setIsDark(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
            } else {
              setIsDark(theme === 'dark');
            }
          }
        }
      } else {
        setUserName('Pengguna');
        setUserAvatar(null);
        setIsPlus(false);
      }
    } catch (e) {
      console.error("Maria: Failed to load profile", e);
    }
  }, []);

  const activeChatIdRef = useRef<string | null>(null);
  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);

  const isLoadingChatsRef = useRef(false);

  const loadChats = useCallback(async (forceId?: string) => {
    const { auth } = await import('./lib/firebase');
    if (!auth?.currentUser) {
      setChatSessions([]);
      return;
    }

    try {
      const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
      const { db } = await import('./lib/firebase');
      if (db) {
        const q = query(
          collection(db, 'chats'), 
          where('userId', '==', auth.currentUser.uid),
          orderBy('updatedAt', 'desc')
        );
        const snap = await getDocs(q);
        const sessions: ChatSession[] = [];
        snap.forEach(doc => sessions.push({ id: doc.id, ...doc.data() } as any));
        
        setChatSessions(sessions);
        
        if (forceId) {
          setActiveChatId(forceId);
        } else if (!activeChatIdRef.current && sessions.length > 0) {
          setActiveChatId(sessions[0].id);
        } else if (sessions.length === 0) {
          // Auto-create first chat if empty
          const newId = generateId('chat');
          const { doc, setDoc } = await import('firebase/firestore');
          await setDoc(doc(db, 'chats', newId), {
            userId: auth.currentUser.uid,
            title: 'Chat Baru',
            updatedAt: Date.now()
          });
          setActiveChatId(newId);
          setChatSessions([{ id: newId, title: 'Chat Baru', updatedAt: Date.now(), userId: auth.currentUser.uid }]);
        }
      }
    } catch (e) {
      console.error("Maria: Failed to load chats", e);
    }
  }, []); // Remove activeChatId from dependencies to prevent loops



  const refreshAll = useCallback(() => {
    loadProfile();
    loadChats();
    updateUnreadCount();
  }, [loadProfile, loadChats, updateUnreadCount]);

  useEffect(() => {
    testFirestoreConnection();
    if (window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }

    refreshAll();

    // Auto-detect performance mode for older Android devices
    const ua = navigator.userAgent;
    if (/Android/.test(ua)) {
      const match = ua.match(/Android\s([0-9\.]+)/);
      if (match && match[1]) {
        const version = parseFloat(match[1]);
        if (version < 13) {
           setIsLiteMode(true);
           console.log("Maria: Performance mode auto-enabled for Android " + version);
        }
      }
    }

    const handleStorage = (e: StorageEvent | Event) => {
      // Standard storage event only for other tabs. 
      // Manual dispatch for same tab should use different logic if needed.
      if (e instanceof StorageEvent && e.key && !e.key.startsWith('maria_')) return;
      
      loadProfile();
      loadChats();
      updateUnreadCount();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('maria_refresh_system', refreshAll);
    window.addEventListener('maria_new_notification', updateUnreadCount);
    
    // Check for persisted user status if needed, but avoiding localStorage
    
    let unsubscribe = () => {};
    let unsubscribeUser = () => {};
    let unsubscribeChats = () => {};

    if (auth) {
      try {
        unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          // Cleanup previous snapshots
          unsubscribeUser();
          unsubscribeChats();
          setIsMigrationFinished(false);

          if (!currentUser) {
            // Reset all state
            setUser(null);
            setUserName('Pengguna');
            setUserAvatar(null);
            setIsPlus(false);
            setChatSessions([]);
            setActiveChatId('initial-chat');
            setIsMigrationFinished(true);
            
            // Re-load chats as anonymous
            setTimeout(() => {
              loadChats();
              updateUnreadCount();
            }, 100);
            
            window.dispatchEvent(new Event('maria_refresh_system'));
            return;
          }
          
          setIsMigrationFinished(true);
          
          // Now it's safe to set user and trigger dependent components
          setUser(currentUser);

          // 3. Real-time Profile Listener
          try {
            const { doc, onSnapshot, setDoc } = await import('firebase/firestore');
            const { db } = await import('./lib/firebase');
            if (db) {
              const userRef = doc(db, 'users', currentUser.uid);
              unsubscribeUser = onSnapshot(userRef, async (snap) => {

                if (snap.exists()) {
                  const profile = snap.data();
                  setUserName(profile.name || currentUser.displayName || 'Pengguna');
                  setUserAvatar(profile.avatar || currentUser.photoURL || null);
                  setIsPlus(profile.isPlus || false);
                  if (profile.preferences?.language) {
                    setLanguage(profile.preferences.language);
                  }
                  
                  if (profile.onboardingCompleted !== true) {
                    setShowOnboarding(true);
                  } else {
                    setShowOnboarding(false);
                  }

                  window.dispatchEvent(new Event('maria_refresh_system'));
                } else {
                  // Initialize profile
                  const defaultProfile = {
                    name: currentUser.displayName || 'Pengguna',
                    email: currentUser.email || '',
                    avatar: currentUser.photoURL || null,
                    joinedDate: new Date().toLocaleDateString('id-ID'),
                    birthday: '',
                    isPlus: false,
                    quotaResetAt: 0,
                    onboardingCompleted: false,
                    preferences: { 
                      theme: 'light', 
                      language: 'id', 
                      personality: 'ramah', 
                      accentColor: 'blue', 
                      performanceMode: false, 
                      guardrailsEnabled: true,
                      style_tone: 'default',
                      warmth: 'default',
                      enthusiasm: 'default',
                      titles_lists: 'default',
                      emoji: 'default',
                      quick_answer: true,
                      nickname: '',
                      job: '',
                      use_history: true,
                      web_search: true
                    },
                    notifications: { response: 'both', tasks: 'both' }
                  };
                  await setDoc(userRef, defaultProfile).catch(console.error);
                }
              }, (err) => {
                if (err.code !== 'permission-denied') {
                  console.error("Profile snapshot error:", err);
                }
              });

              // 3. Real-time Chats Metadata Listener
              const { collection, query, where } = await import('firebase/firestore');
              const q = query(collection(db, 'chats'), where('userId', '==', currentUser.uid));
              
              let isFirstSnapshot = true;

              unsubscribeChats = onSnapshot(q, (snap) => {
                const firebaseSessions: ChatSession[] = [];
                snap.forEach(doc => {
                  firebaseSessions.push({ id: doc.id, ...doc.data() } as any);
                });

                setChatSessions(firebaseSessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
                
                if (!activeChatIdRef.current && firebaseSessions.length > 0) {
                  setActiveChatId(firebaseSessions[0].id);
                }
              }, (err) => {
                if (err.code !== 'permission-denied') {
                  console.error("Chats snapshot error:", err);
                }
              });
            }
          } catch (e) {
            console.error("Maria: Failed to initialize Firebase listeners", e);
          }
        });
      } catch (e) {
        console.error("Maria: Auth listener setup failed", e);
      }
    }

    const handleMockLogin = (e: any) => {
      const data = e.detail;
      if (data) {
        setUser(data);
        setUserName(data.displayName || 'Pengguna');
        setUserAvatar(data.photoURL || null);
      }
    };

    const handleMockLogout = () => {
      setUser(null);
      setUserName('Pengguna');
      setUserAvatar(null);
    };

    const handleAutomation = (e: any) => {
      const type = e.detail?.type;
      if (type === 'WORK_START') {
        setIsFocusMode(true);
      } else if (type === 'WORK_END') {
        setIsFocusMode(false);
      }
    };

    window.addEventListener('maria_mock_login', handleMockLogin);
    window.addEventListener('maria_mock_logout', handleMockLogout);
    window.addEventListener('maria_automation' as any, handleAutomation);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('maria_refresh_system', refreshAll);
      window.removeEventListener('maria_new_notification', updateUnreadCount);
      window.removeEventListener('maria_mock_login', handleMockLogin);
      window.removeEventListener('maria_mock_logout', handleMockLogout);
      window.removeEventListener('maria_automation' as any, handleAutomation);
      if (typeof unsubscribe === 'function') unsubscribe();
      unsubscribeUser();
      unsubscribeChats();
    };
  }, [updateUnreadCount, loadProfile, loadChats, refreshAll]);

  const handleNewChat = async () => {
    const { auth } = await import('./lib/firebase');
    if (!auth?.currentUser) return;

    const newId = generateId('chat');
    const chatTitle = 'Chat Baru';
    
    // Sync to Firebase FIRST to avoid race condition in messages listener
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('./lib/firebase');
    if (db) {
      try {
        await setDoc(doc(db, 'chats', newId), {
          id: newId,
          userId: auth.currentUser.uid,
          title: chatTitle,
          updatedAt: Date.now(),
          isPinned: false,
          isFavorite: false
        });
        
        // Wait a tiny bit for Firestore to propagate
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setActiveChatId(newId);
        loadChats(newId); // Force load this specific one
      } catch (e) {
        console.error("Maria: Failed to create chat doc", e);
        setActiveChatId(newId);
      }
    } else {
      setActiveChatId(newId);
    }
    
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const deleteChat = async (id: string) => {
    const { auth } = await import('./lib/firebase');
    if (!auth?.currentUser) return;

    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
      if (db) {
        await deleteDoc(doc(db, 'chats', id)).catch(err => {
          handleFirestoreError(err, OperationType.DELETE, `chats/${id}`);
        });
      }
    } catch (e) {
      console.error("Maria: Remote delete failed", e);
    }

    const remaining = chatSessions.filter(c => c.id !== id);
    if (activeChatId === id) {
      const nextId = remaining.length > 0 ? remaining[0].id : '';
      setActiveChatId(nextId);
    }
    
    refreshAll();
  };

  const clearChat = (id: string) => {
    // History is managed in Firestore now
    window.dispatchEvent(new CustomEvent('maria_history_update', { detail: { chatId: id } }));
    setMenuOpenId(null);
  };

  const togglePin = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { auth } = await import('./lib/firebase');
    if (auth?.currentUser) {
      const { doc, updateDoc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./lib/firebase');
      if (db) {
        const chatSnap = await getDoc(doc(db, 'chats', id));
        if (chatSnap.exists()) {
          const isPinned = !chatSnap.data().isPinned;
          await updateDoc(doc(db, 'chats', id), { isPinned });
          refreshAll();
        }
      }
    }
    setMenuOpenId(null);
  };

  const toggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (auth?.currentUser) {
      const { doc, updateDoc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./lib/firebase');
      if (db) {
         const snap = await getDoc(doc(db, 'chats', id));
         if (snap.exists()) {
           await updateDoc(doc(db, 'chats', id), { isFavorite: !snap.data().isFavorite });
           refreshAll();
         }
      }
    }
    setMenuOpenId(null);
  };

  const startRename = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setRenamingId(session.id);
    setRenamingTitle(session.title);
    setMenuOpenId(null);
  };

  const submitRename = async () => {
    if (!renamingId || !renamingTitle.trim()) {
      setRenamingId(null);
      return;
    }

    if (auth?.currentUser) {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('./lib/firebase');
      if (db) {
        await updateDoc(doc(db, 'chats', renamingId), { title: renamingTitle.trim() });
        refreshAll();
      }
    }
    setRenamingId(null);
  };

  const getChatGroup = (session: ChatSession) => {
    if (session.isPinned) return t.chatGroups?.pinned || 'Pinned';
    
    const date = new Date(session.updatedAt);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return t.chatGroups?.today || 'Today';
    if (date.toDateString() === yesterday.toDateString()) return t.chatGroups?.yesterday || 'Yesterday';
    return t.chatGroups?.previous || 'Previous';
  };

  const filteredSessions = chatSessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const groupedSessions = filteredSessions.reduce((acc, session) => {
    const group = getChatGroup(session);
    if (!acc[group]) acc[group] = [];
    acc[group].push(session);
    return acc;
  }, {} as Record<string, ChatSession[]>);

  // Custom sort for sections
  const sortedGroupKeys = Object.keys(groupedSessions).sort((a, b) => {
    const order: Record<string, number> = { [t.chatGroups?.pinned || 'Pinned']: 0, [t.chatGroups?.today || 'Today']: 1, [t.chatGroups?.yesterday || 'Yesterday']: 2, [t.chatGroups?.previous || 'Previous']: 3 };
    return (order[a] ?? 10) - (order[b] ?? 10);
  });

  const transition = isLiteMode 
    ? { duration: 0.1 } 
    : ({ type: 'spring', damping: 25, stiffness: 200 } as any);

  return (
    <div className={`h-[100dvh] w-full flex flex-col font-sans overflow-hidden transition-all ${isLiteMode ? 'duration-75 is-lite' : 'duration-700'} ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
    {/* Background optimization for performance */}
    {!isLiteMode && (
      <div className={`fixed inset-0 pointer-events-none z-0 overflow-hidden transition-opacity duration-1000 ${isFocusMode ? 'opacity-20' : 'opacity-100'}`}>
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] transition-colors duration-1000 ${isDark ? 'bg-brand-blue/10' : 'bg-brand-blue/[0.03]'}`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] transition-colors duration-1000 ${isDark ? 'bg-indigo-900/10' : 'bg-indigo-500/[0.02]'}`} />
      </div>
    )}
    
    {/* Premium Header */}
    <AnimatePresence mode={isLiteMode ? 'popLayout' : 'wait'}>
      {!isFocusMode && (
        <motion.header 
          initial={isLiteMode ? { opacity: 0 } : { y: -64, opacity: 0 }}
          animate={isLiteMode ? { opacity: 1 } : { y: 0, opacity: 1 }}
          exit={isLiteMode ? { opacity: 0 } : { y: -64, opacity: 0 }}
          className={`h-16 shrink-0 border-b backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-30 transition-colors ${
            isLiteMode ? 'duration-100' : 'duration-500'
          } ${
            isDark ? 'bg-slate-950/80 border-slate-900' : 'bg-white/80 border-slate-200'
          }`}
        >
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-2 rounded-xl transition-all ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-500 hover:text-brand-blue hover:bg-slate-100'
                }`}
              >
                <Menu size={24} />
              </button>
              
              <a 
                href="/maria_logo_humanist.svg" 
                download="maria_logo_humanist.svg"
                className="flex items-center gap-3 group px-1 cursor-pointer"
                title={`Download Maria ${isPlus ? 'Plus' : ''} Logo`}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#021B2B] via-[#0E4D54] to-[#14BCB2] flex items-center justify-center text-white shadow-lg group-hover:scale-105 group-hover:rotate-3 transition-all duration-500 overflow-hidden border border-white/10">
                    <motion.div
                      animate={{ opacity: [0.1, 0.4, 0.1] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/10"
                    />
                    <span className="text-2xl font-serif text-white/95 drop-shadow-md relative z-10 italic tracking-tighter">M</span>
                    <Sparkles size={12} className="absolute top-1.5 right-1.5 text-white/80 animate-pulse" />
                  </div>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-white dark:bg-slate-950 rounded-full flex items-center justify-center shadow-sm"
                  >
                    <div className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-pulse" />
                  </motion.div>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h1 className={`text-base font-black tracking-tight leading-none ${isDark ? 'text-white' : 'text-[#021B2B]'}`}>Maria {isPlus ? 'Plus' : ''}</h1>
                    {!isPlus && (
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${isDark ? 'bg-teal-500/10 border border-teal-500/20' : 'bg-teal-50/50 border border-teal-100'}`}>
                        <span className="text-[7px] text-teal-600 font-black uppercase tracking-[0.2em]">Free</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{isPlus ? 'Professional Assistant' : 'Modern Intelligence'}</span>
                </div>
              </a>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={() => setIsNotificationsOpen(true)}
                className={`relative p-2 rounded-xl transition-all ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-500 hover:text-brand-blue hover:bg-slate-100'
                }`}
              >
                <Bell size={20} />
                {unreadNotifications > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-slate-950 rounded-full animate-pulse" />
                )}
              </button>

              <button 
                onClick={() => setIsFocusMode(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  isDark ? 'hover:bg-brand-blue/10 text-brand-blue' : 'hover:bg-brand-blue/5 text-brand-blue'
                }`}
              >
                <Sparkles size={14} />
                <span className="hidden lg:inline">{t.focusMode}</span>
              </button>

              <button 
                onClick={() => setIsProfileOpen(true)}
                className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                isDark ? 'bg-slate-900/50 hover:bg-slate-800 text-slate-400' : 'bg-slate-100/50 hover:bg-slate-100 text-slate-600'
              }`}>
                  <Globe size={14} className="text-brand-blue" /> 
                  <span>{language.toUpperCase()}</span>
              </button>
              
              <div 
                onClick={() => setIsProfileOpen(true)}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-all overflow-hidden shadow-lg shadow-teal-500/10 ${
                  isDark 
                  ? 'bg-slate-900 border-slate-800 text-slate-500 hover:border-teal-500/50 hover:text-white' 
                  : 'bg-gradient-to-br from-[#021B2B] via-[#0E4D54] to-[#14BCB2] border-white/10 text-white hover:scale-105 shadow-teal-500/10'
                }`}
              >
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-black">{userName[0] || 'P'}</span>
                )}
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 relative flex overflow-hidden">
        {/* Mobile Backdrop */}
        <AnimatePresence>
          {(isSidebarOpen && !isFocusMode) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[45]"
            />
          )}
        </AnimatePresence>

        {/* Sidebar History */}
        <AnimatePresence mode="wait">
          {(isSidebarOpen && !isFocusMode) && (
            <motion.aside 
              initial={isLiteMode ? { opacity: 0 } : { x: -300, opacity: 0 }}
              animate={isLiteMode ? { opacity: 1 } : { x: 0, opacity: 1 }}
              exit={isLiteMode ? { opacity: 0 } : { x: -300, opacity: 0 }}
              transition={transition}
              className={`fixed lg:relative inset-y-0 left-0 z-50 flex flex-col shadow-2xl lg:shadow-none border-r transition-colors duration-500 overflow-hidden w-[300px] ${
                isDark ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-100'
              }`}
            >
              <div className="w-[300px] flex flex-col h-full">
                <div className="p-5 pb-2 space-y-4">
                  <div className="flex items-center justify-between">
                    {!isPlus && (
                      <div 
                        onClick={() => setIsProfileOpen(true)}
                        className={`px-3 py-1 rounded-full shadow-lg flex items-center gap-2 group cursor-pointer hover:scale-105 transition-all bg-gradient-to-r from-[#021B2B] via-[#0E4D54] to-[#14BCB2] border border-white/10`}
                      >
                        <Sparkles size={10} className="text-amber-400 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-teal-400">
                          Maria Plus
                        </span>
                      </div>
                    )}
                    <button onClick={() => setIsSidebarOpen(false)} className={`lg:hidden p-2 transition-all ${isDark ? 'text-slate-600 hover:text-white' : 'text-slate-400 hover:text-red-500'} ${isPlus ? 'ml-auto' : ''}`}>
                      <X size={18} />
                    </button>
                  </div>
                  
                  <button 
                    onClick={handleNewChat}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-blue hover:bg-blue-600 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95 shadow-lg shadow-brand-blue/20"
                  >
                    <Plus size={16} />
                    <span>{t.newChat}</span>
                  </button>

                  <div className="relative group">
                    <Search size={14} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-slate-700' : 'text-slate-300'} group-focus-within:text-brand-blue`} />
                    <input 
                      type="text" 
                      placeholder={t.searchPlaceholder}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full border rounded-xl py-2 pl-10 pr-4 text-[13px] outline-none transition-all ${
                        isDark 
                        ? 'bg-slate-900/50 border-slate-800 text-slate-200 placeholder:text-slate-600 focus:border-brand-blue/30' 
                        : 'bg-slate-50 border-slate-100 text-slate-700 placeholder:text-slate-400 focus:border-brand-blue/30'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-6" onClick={() => setMenuOpenId(null)}>
                  {sortedGroupKeys.map((group) => (
                    <div key={`group-${group}`} className="space-y-1">
                      <div className="flex items-center gap-2 px-3 mb-2">
                        {group === 'Disematkan' && <Pin size={10} className="text-brand-blue" />}
                        <h4 className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{group}</h4>
                      </div>
                      <div className="space-y-0.5">
                        {groupedSessions[group].map((session) => (
                          <SidebarChatItem 
                            key={session.id}
                            session={session}
                            activeChatId={activeChatId}
                            isDark={isDark}
                            t={t}
                            renamingId={renamingId}
                            renamingTitle={renamingTitle}
                            setRenamingTitle={setRenamingTitle}
                            submitRename={submitRename}
                            setRenamingId={setRenamingId}
                            menuOpenId={menuOpenId}
                            setMenuOpenId={setMenuOpenId}
                            onSelectChat={() => {
                              setActiveChatId(session.id);
                              if (window.innerWidth < 1024) setIsSidebarOpen(false);
                            }}
                            onTogglePin={togglePin}
                            onToggleFavorite={toggleFavorite}
                            onStartRename={startRename}
                            onDeleteChat={deleteChat}
                            onClearChat={clearChat}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`p-5 border-t mt-auto space-y-3 transition-colors duration-500 ${isDark ? 'border-slate-900 bg-slate-900/10' : 'border-slate-50 bg-slate-50/20'}`}>
                    <React.Suspense fallback={null}>
                      <DeviceStatusWidget isDark={isDark} />
                      <MultiUtilityWidget isDark={isDark} language={language} />
                    </React.Suspense>

                    <div className="space-y-3">
                      <div className={`flex items-center gap-3 p-3 border rounded-2xl shadow-sm transition-colors ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
                      }`}>
                          <div 
                            onClick={() => setIsProfileOpen(true)}
                            className="w-10 h-10 rounded-xl bg-[#021B2B] flex items-center justify-center text-teal-400 font-bold text-sm shadow-lg shadow-teal-500/10 cursor-pointer overflow-hidden border border-white/10"
                          >
                              {userAvatar ? (
                                <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                              ) : (
                                <span>{userName[0] || 'P'}</span>
                              )}
                          </div>
                          <div className="flex-1 min-w-0">
                              <p className={`text-[13px] font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{userName}</p>
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                <span className="text-[9px] font-bold text-brand-blue uppercase tracking-widest">{t.online}</span>
                              </div>
                          </div>
                          <button 
                            onClick={() => setIsProfileOpen(true)}
                            className={`p-2 transition-colors ${isDark ? 'text-slate-600 hover:text-white' : 'text-slate-400 hover:text-brand-blue'}`}
                          >
                            <Settings size={18} />
                          </button>
                      </div>
                    </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <section className={`flex-1 h-full min-w-0 relative transition-all duration-700 ${isFocusMode ? 'max-w-4xl mx-auto' : ''}`}>
          {activeChatId && (
            <MariaAgent 
              chatId={activeChatId}
              language={language} 
              userName={userName}
              user={user}
              isFocusMode={isFocusMode} 
              isLiteMode={isLiteMode}
              isDark={isDark}
              onExitFocus={() => setIsFocusMode(false)}
              onTitleUpdate={() => {
                // Refresh list locally if needed, but storage listener handles it
              }}
            />
          )}
        </section>
      </main>

      <React.Suspense fallback={null}>
        <UserProfile 
          isOpen={isProfileOpen} 
          onClose={() => setIsProfileOpen(false)} 
          onLanguageChange={setLanguage} 
          isLiteMode={isLiteMode}
          isDark={isDark}
          user={user}
        />

        <NotificationCenter 
          isDark={isDark}
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
        />

        <SavedItems 
          isOpen={isSavedItemsOpen}
          onClose={() => setIsSavedItemsOpen(false)}
        />

        {showOnboarding && user && (
          <Onboarding 
            user={user} 
            isDark={isDark} 
            onComplete={(name) => {
              setUserName(name);
              setShowOnboarding(false);
              loadChats();
            }} 
          />
        )}
      </React.Suspense>
    </div>
  );
}

const SidebarChatItem = React.memo(({ 
  session, activeChatId, isDark, t, renamingId, renamingTitle, 
  setRenamingTitle, submitRename, setRenamingId, menuOpenId, setMenuOpenId,
  onSelectChat, onTogglePin, onToggleFavorite, onStartRename, onDeleteChat, onClearChat
}: any) => {
  return (
    <div 
      onClick={onSelectChat}
      className={`group relative flex items-center justify-between px-3 py-3 rounded-xl transition-all cursor-pointer border ${
        activeChatId === session.id 
        ? (isDark ? 'bg-brand-blue/10 border-brand-blue/20' : 'bg-brand-blue/5 border-brand-blue/10') 
        : `border-transparent ${isDark ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'}`
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <MessageSquare size={14} className={activeChatId === session.id ? 'text-brand-blue' : (isDark ? 'text-slate-700' : 'text-slate-300')} />
        {renamingId === session.id ? (
          <input
            autoFocus
            className={`text-xs font-bold bg-transparent outline-none border-b border-brand-blue w-full ${isDark ? 'text-white' : 'text-slate-900'}`}
            value={renamingTitle}
            onChange={(e) => setRenamingTitle(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitRename();
              if (e.key === 'Escape') setRenamingId(null);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`text-xs font-bold truncate transition-colors ${
            activeChatId === session.id 
            ? (isDark ? 'text-white' : 'text-slate-900') 
            : `group-hover:text-slate-900 ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500'}`
          }`}>
            {session.title}
          </span>
        )}
      </div>
      <div className="flex items-center relative">
        {session.isFavorite && (
          <Star size={10} className="text-amber-400 fill-amber-400 mr-1" />
        )}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpenId(menuOpenId === session.id ? null : session.id);
          }}
          className={`p-1.5 rounded-lg transition-all ${
            menuOpenId === session.id 
            ? (isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-brand-blue')
            : `opacity-0 group-hover:opacity-100 lg:group-hover:opacity-100 ${isDark ? 'text-slate-600 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-brand-blue hover:bg-slate-100'}`
          }`}
        >
          <MoreVertical size={14} />
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {menuOpenId === session.id && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className={`absolute right-0 top-10 w-40 rounded-xl border shadow-xl z-[60] overflow-hidden ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={(e) => onStartRename(e, session)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium transition-colors ${
                  isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-blue'
                }`}
              >
                <Edit2 size={14} />
                <span>{t.rename}</span>
              </button>
              <button 
                onClick={(e) => onTogglePin(e, session.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium transition-colors ${
                  isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-blue'
                }`}
              >
                {session.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                <span>{session.isPinned ? t.unpin : t.pin}</span>
              </button>
              <button 
                onClick={(e) => onToggleFavorite(e, session.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium transition-colors ${
                  isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-blue'
                }`}
              >
                <Star size={14} className={session.isFavorite ? 'text-amber-400 fill-amber-400' : ''} />
                <span>{session.isFavorite ? 'Unfavorite' : 'Favorite'}</span>
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClearChat(session.id);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium transition-colors ${
                  isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-blue'
                }`}
              >
                <RotateCcw size={14} />
                <span>{t.clearChat || 'Clear Chat'}</span>
              </button>
              <div className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-50'}`} />
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(session.id);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
                <span>{t.delete}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

function SidebarGroupItem({ icon, label, count }: { icon: ReactNode, label: string, count: number }) {
  return (
    <div className="flex items-center justify-between px-3 py-3 text-slate-500 hover:text-brand-blue hover:bg-slate-50 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-slate-100">
      <div className="flex items-center gap-3">
        <span className="p-1.5 rounded-lg group-hover:bg-brand-blue/5 transition-colors">{icon}</span>
        <span className="text-[14px] font-semibold">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-1.5 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-400 rounded-md group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-colors">{count}</span>
        <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
}
