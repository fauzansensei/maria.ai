import { useState, useEffect, useRef } from 'react';
import { Settings, LogOut, Globe, Shield, ShieldCheck, CreditCard, ChevronRight, Sparkles, RotateCcw, X, User as UserIcon, MessageSquare, Info, Brain, Bell, Plus, Calendar, Trash2, Clock, Camera, MessageCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { loginWithGoogle, logout } from '../lib/firebase';
import { ReminderSetting, KeywordSetting, SUPPORTED_LANGUAGES } from '../types';
import { getTranslation } from '../translations';
import { generateId } from '../lib/utils';
import LegalDocs, { LegalDocType } from './LegalDocs';

interface UserProfileData {
  name: string;
  email: string;
  birthday?: string;
  avatar?: string;
  joinedDate: string;
  isPlus: boolean;
  keywords?: KeywordSetting[];
  reminders?: ReminderSetting[];
  quotaResetAt?: number;
  preferences: {
    theme: 'dark' | 'light' | 'system';
    language: string;
    personality: string;
    accentColor: string;
    safeMode: boolean;
    autoSave: boolean;
    useMemory: boolean;
    performanceMode: boolean;
    guardrailsEnabled: boolean;
    // New fields for personalization
    style_tone: 'default' | 'professional' | 'friendly' | 'honest' | 'eccentric' | 'efficient' | 'sinister';
    warmth: 'more' | 'default' | 'less';
    enthusiasm: 'more' | 'default' | 'less';
    titles_lists: 'more' | 'default' | 'less';
    emoji: 'more' | 'default' | 'less';
    quick_answer: boolean;
    nickname: string;
    job: string;
    bio: string;
    use_history: boolean;
    web_search: boolean;
    canvas: boolean;
    voice: boolean;
    advanced_voice: boolean;
    connector_search: boolean;
    // Automation fields
    workStartTime: string; 
    workEndTime: string;   
    homeStartTime: string;
    autoNotify: boolean;
    customInstructions: string;
  };
  notifications: {
    codex: 'push' | 'email' | 'both' | 'none';
    group_chat: 'push' | 'email' | 'both' | 'none';
    usage: 'push' | 'email' | 'both' | 'none';
    project: 'push' | 'email' | 'both' | 'none';
    recommendation: 'push' | 'email' | 'both' | 'none';
    response: 'push' | 'email' | 'both' | 'none';
    tasks: 'push' | 'email' | 'both' | 'none';
  };
}

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  onLanguageChange: (lang: string) => void;
  isLiteMode?: boolean;
  isDark?: boolean;
  user?: User | null;
}

export default function UserProfile({ isOpen, onClose, onLanguageChange, isLiteMode = false, isDark = false, user = null }: UserProfileProps) {
  const [profile, setProfile] = useState<UserProfileData>({
    name: 'Maria User',
    email: 'premium@maria.ai',
    joinedDate: new Date().toLocaleDateString('id-ID'),
    isPlus: false,
    preferences: {
      theme: 'light',
      language: 'id',
      personality: 'ramah',
      accentColor: 'blue',
      safeMode: true,
      autoSave: true,
      useMemory: true,
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
      bio: '',
      use_history: true,
      web_search: true,
      canvas: true,
      voice: true,
      advanced_voice: true,
      connector_search: true,
      workStartTime: '08:00',
      workEndTime: '17:00',
      homeStartTime: '18:00',
      autoNotify: true,
      customInstructions: ''
    },
    notifications: {
      codex: 'push',
      group_chat: 'push',
      usage: 'both',
      project: 'email',
      recommendation: 'push',
      response: 'push',
      tasks: 'both'
    }
  });

  const t = getTranslation(profile.preferences.language || 'id');
  const [reminders, setReminders] = useState<ReminderSetting[]>([]);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType>(null);
  const [keywords, setKeywords] = useState<KeywordSetting[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDateTime, setNewReminderDateTime] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<'umum' | 'profil' | 'privasi' | 'personalisasi' | 'memory' | 'notifikasi' | 'jadwal'>('umum');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { auth } = await import('../lib/firebase');
        if (auth?.currentUser) {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');
          if (db) {
            const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (snap.exists()) {
              const data = snap.data();
              setProfile(prev => ({
                ...prev,
                ...data,
                preferences: { ...(prev.preferences || {}), ...(data.preferences || {}) },
                notifications: { ...(prev.notifications || {}), ...(data.notifications || {}) }
              }));
              if (data.keywords) setKeywords(data.keywords);
              if (data.reminders) setReminders(data.reminders);
            }
          }
        } else {
          // Reset profile when logged out
          setProfile({
            name: 'Maria User',
            email: 'premium@maria.ai',
            joinedDate: new Date().toLocaleDateString('id-ID'),
            isPlus: false,
            preferences: {
              theme: 'light',
              language: 'id',
              personality: 'ramah',
              accentColor: 'blue',
              safeMode: true,
              autoSave: true,
              useMemory: true,
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
              bio: '',
              use_history: true,
              web_search: true,
              canvas: true,
              voice: true,
              advanced_voice: true,
              connector_search: true,
              workStartTime: '08:00',
              workEndTime: '17:00',
              homeStartTime: '18:00',
              autoNotify: true,
              customInstructions: ''
            },
            notifications: {
              codex: 'push',
              group_chat: 'push',
              usage: 'both',
              project: 'email',
              recommendation: 'push',
              response: 'push',
              tasks: 'both'
            }
          });
          setKeywords([]);
          setReminders([]);
        }
      } catch (e) {
        console.error("Maria: Failed to load settings from cloud", e);
      }
    };

    loadSettings();
    window.addEventListener('maria_refresh_system', loadSettings);

    const handleRepair = async () => {
      if (!user) return;
      alert('Proses perbaikan dimulai. Mohon tunggu beberapa saat agar data tersinkronisasi kembali.');
      loadSettings();
    };

    window.addEventListener('maria_repair_sync', handleRepair);

    return () => {
      window.removeEventListener('maria_refresh_system', loadSettings);
      window.removeEventListener('maria_repair_sync', handleRepair);
    };
  }, [user]);

  const saveProfile = async (nextProfile: UserProfileData) => {
    setProfile(nextProfile);
    // Explicitly NO localStorage per user request
    
    if (user) {
      try {
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db, handleFirestoreError, OperationType } = await import('../lib/firebase');
        if (db) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            name: nextProfile.name,
            avatar: nextProfile.avatar || null,
            preferences: nextProfile.preferences,
            notifications: nextProfile.notifications,
            keywords: keywords,
            reminders: reminders
          } as any).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`));
        }
      } catch (e) {
        console.error("Maria: Firestore sync error", e);
      }
    }
    window.dispatchEvent(new Event('maria_refresh_system'));
  };

  const handleUpdateNotification = (key: keyof UserProfileData['notifications'], value: any) => {
    const nextProfile = {
      ...profile,
      notifications: { ...profile.notifications, [key]: value }
    };
    saveProfile(nextProfile);
  };

  const handleUpdatePreference = (key: keyof UserProfileData['preferences'], value: any) => {
    const nextProfile = {
      ...profile,
      preferences: { ...profile.preferences, [key]: value }
    };
    saveProfile(nextProfile);
    
    if (key === 'language') {
      onLanguageChange(value);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file terlalu besar. Maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const nextProfile = { ...profile, avatar: base64String };
      saveProfile(nextProfile);
    };
    reader.readAsDataURL(file);
  };

  const handleClearChat = async () => {
    if (window.confirm(t.confirmDeleteHistory)) {
        if (user) {
          try {
            const { db } = await import('../lib/firebase');
            const { collection, query, where, getDocs, writeBatch } = await import('firebase/firestore');
            if (db) {
               const q = query(collection(db, 'chats'), where('userId', '==', user.uid));
               const snap = await getDocs(q);
               const batch = writeBatch(db);
               snap.forEach(d => batch.delete(d.ref));
               await batch.commit();
            }
          } catch(e) {}
        }
        window.dispatchEvent(new Event('maria_refresh_system'));
        onClose();
    }
  };

  // Profile data and hooks above

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[200] flex items-center justify-end">
          <motion.div 
            key="profile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
        <motion.div 
          initial={isLiteMode ? { opacity: 0 } : { x: '100%', opacity: 0 }}
          animate={isLiteMode ? { opacity: 1 } : { x: 0, opacity: 1 }}
          exit={isLiteMode ? { opacity: 0 } : { x: '100%', opacity: 0 }}
          transition={isLiteMode ? { duration: 0.1 } : { type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-5xl h-[100dvh] sm:h-[85vh] sm:rounded-[24px] sm:my-auto sm:mx-6 flex flex-col shadow-2xl overflow-hidden self-center transition-all duration-500 ${
            isDark ? 'bg-[#0a0a0f] border-slate-900 text-[#e0e0ff]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Dashboard Container */}
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* Header */}
            <header className={`flex flex-col items-center justify-center px-6 sm:px-10 py-6 sm:py-10 border-b transition-colors duration-500 shrink-0 ${
              isDark ? 'bg-[#111118] border-slate-800' : 'bg-white border-slate-100'
            }`}>
              <div className="flex flex-col items-center gap-2 sm:gap-4 text-center">
                {profile.avatar ? (
                  <img 
                    src={profile.avatar} 
                    alt="Profile" 
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl object-cover border-2 border-teal-500/20 shadow-xl"
                  />
                ) : (
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#021B2B] via-[#0E4D54] to-[#14BCB2] flex items-center justify-center text-white border border-white/10 shadow-xl">
                    <span className="font-serif italic text-xl sm:text-2xl">M</span>
                  </div>
                )}
                <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-[#e0e0ff]' : 'text-slate-900'}`}>{t.settings}</h2>
              </div>
              <button 
                onClick={onClose}
                className={`absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-xl transition-all ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </header>

            {/* Horizontal Navigation Tabs */}
            <nav className={`px-4 sm:px-10 py-1 flex items-center justify-start sm:justify-center gap-1 overflow-x-auto no-scrollbar border-b shrink-0 ${
              isDark ? 'bg-[#111118]/80 border-slate-800' : 'bg-slate-50/50 border-slate-100'
            }`}>
              {[
                { id: 'umum', label: t.general, icon: <Settings size={14} /> },
                { id: 'profil', label: t.profile, icon: <UserIcon size={14} /> },
                { id: 'notifikasi', label: t.notifications, icon: <Bell size={14} /> },
                { id: 'personalisasi', label: t.personalization, icon: <Sparkles size={14} /> },
                { id: 'memory', label: t.memory, icon: <Brain size={14} /> },
                { id: 'privasi', label: t.privacy, icon: <Shield size={14} /> },
                { id: 'jadwal', label: t.eventReminders, icon: <Calendar size={14} /> },
              ].map((item) => (
                <button
                  key={`tab-${item.id}`}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-[10px] sm:text-xs font-black transition-all border-b-2 shrink-0 ${
                    activeTab === item.id
                    ? 'border-brand-blue text-brand-blue'
                    : `border-transparent text-slate-500 hover:text-slate-400 ${isDark ? 'hover:text-slate-200' : ''}`
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-10 custom-scrollbar">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-3xl mx-auto space-y-10"
                >

                    {activeTab === 'umum' && (
                      <div className="space-y-12 py-4">
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-black tracking-tight">{t.general}</h3>
                        </div>

                        <div className="space-y-10 max-w-2xl mx-auto">
                          {/* Maria Plus Card */}
                          <div className={`relative p-8 rounded-[20px] border flex flex-col sm:flex-row items-center gap-6 overflow-hidden group transition-all duration-500 ${
                            profile.isPlus 
                            ? 'bg-gradient-to-br from-[#111118] to-brand-blue/20 border-brand-blue/30 text-white shadow-2xl' 
                            : `${isDark ? 'bg-slate-900/10 border-slate-800' : 'bg-slate-50 border-slate-100 shadow-sm'}`
                          }`}>
                             <div className={`p-4 rounded-3xl shrink-0 transition-transform duration-700 group-hover:scale-110 ${profile.isPlus ? 'bg-brand-blue/20' : 'bg-brand-blue/10 text-brand-blue'}`}>
                              <Sparkles size={32} className={profile.isPlus ? 'text-teal-300 animate-pulse' : ''} />
                            </div>
                            <div className="flex-1 text-center sm:text-left space-y-2">
                              <div className="flex items-center justify-center sm:justify-start gap-3">
                                <h4 className={`text-xl font-black ${isDark ? 'text-[#e0e0ff]' : 'text-slate-900'}`}>Maria Plus</h4>
                                {profile.isPlus && <span className="bg-teal-400 text-[#001B3D] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Active</span>}
                              </div>
                              <p className={`text-xs font-bold leading-relaxed max-w-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {profile.isPlus 
                                  ? 'Nikmati akses tanpa batas, model AI yang lebih cerdas, dan fitur memory premium.' 
                                  : 'Buka potensi penuh Maria dengan model AI tercanggih dan akses eksklusif fitur premium.'}
                              </p>
                            </div>
                            <button 
                              onClick={() => {
                                const next = { ...profile, isPlus: !profile.isPlus };
                                saveProfile(next);
                              }}
                              className={`px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all shrink-0 ${
                                profile.isPlus 
                                ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' 
                                : 'bg-brand-blue text-white shadow-xl shadow-brand-blue/20 hover:scale-[1.02] active:scale-95'
                              }`}
                            >
                              {profile.isPlus ? 'Manage Account' : 'Upgrade Now'}
                            </button>
                          </div>
                          
                          <div className="space-y-8">
                            <div className="flex items-center gap-3 border-b border-slate-200/5 pb-2">
                               <Settings size={14} className="text-brand-blue" />
                               <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Preferensi Dasar</span>
                            </div>

                            <div className="space-y-6">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t.theme}</label>
                                  <select 
                                    value={profile.preferences.theme}
                                    onChange={(e) => handleUpdatePreference('theme', e.target.value)}
                                    className={`w-full border rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer ${
                                      isDark 
                                      ? 'bg-slate-900/40 border-slate-800 text-white' 
                                      : 'bg-slate-50 border-slate-100 text-slate-900'
                                    }`}
                                  >
                                    <option value="system">{t.themeSettings?.system || 'System Default'}</option>
                                    <option value="dark">{t.themeSettings?.dark || 'Dark Mode'}</option>
                                    <option value="light">{t.themeSettings?.light || 'Light Mode'}</option>
                                  </select>
                                </div>

                                <div className="space-y-2">
                                  <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t.language}</label>
                                  <select 
                                    value={profile.preferences.language}
                                    onChange={(e) => handleUpdatePreference('language', e.target.value)}
                                    className={`w-full border rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer ${
                                      isDark 
                                      ? 'bg-slate-900/40 border-slate-800 text-white' 
                                      : 'bg-slate-50 border-slate-100 text-slate-900'
                                    }`}
                                  >
                                    {SUPPORTED_LANGUAGES.map(lang => (
                                      <option key={`lang-${lang.code}`} value={lang.code}>{lang.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t.accentColor}</label>
                                <div className="flex flex-wrap gap-4">
                                  {[
                                    { id: 'blue', color: '#001B3D', label: 'Navy' },
                                    { id: 'teal', color: '#14B8A6', label: 'Teal' },
                                    { id: 'gold', color: '#FBBF24', label: 'Gold' },
                                    { id: 'purple', color: '#7E22CE', label: 'Purple' },
                                    { id: 'green', color: '#22c55e', label: 'Green' },
                                    { id: 'red', color: '#ef4444', label: 'Red' },
                                  ].map((item) => (
                                    <button
                                      key={`color-${item.id}`}
                                      onClick={() => handleUpdatePreference('accentColor', item.id)}
                                      className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center p-1 border-2 ${
                                        profile.preferences.accentColor === item.id 
                                        ? 'border-brand-blue scale-110' 
                                        : 'border-transparent opacity-60 hover:opacity-100'
                                      }`}
                                      title={item.label}
                                    >
                                      <div className="w-full h-full rounded-lg" style={{ backgroundColor: item.color }} />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-6 pt-6">
                               <div className="flex items-center gap-3 border-b border-slate-200/5 pb-2">
                                  <Sparkles size={14} className="text-amber-500" />
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Fitur Cerdas Maria</span>
                               </div>

                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className={`flex items-center justify-between p-5 rounded-2xl border ${isDark ? 'bg-slate-900/20 border-slate-800/50' : 'bg-white border-slate-100 shadow-sm'}`}>
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-blue-50'}`}><Globe size={16} className="text-brand-blue" /></div>
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-black truncate">{t.personalization_settings.web_search}</p>
                                        <p className="text-[9px] font-bold text-slate-500 truncate">Cloud Data</p>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => handleUpdatePreference('connector_search', !profile.preferences.connector_search)}
                                      className={`w-10 h-5 rounded-full relative transition-all ${profile.preferences.connector_search ? 'bg-brand-blue' : (isDark ? 'bg-slate-800' : 'bg-slate-200')}`}
                                    >
                                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all ${profile.preferences.connector_search ? 'right-0.5' : 'left-0.5'}`} />
                                    </button>
                                  </div>

                                  <div className={`flex items-center justify-between p-5 rounded-2xl border ${isDark ? 'bg-slate-900/20 border-slate-800/50' : 'bg-white border-slate-100 shadow-sm'}`}>
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-amber-50'}`}><Brain size={16} className="text-amber-500" /></div>
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-black truncate">{t.autoMemory}</p>
                                        <p className="text-[9px] font-bold text-slate-500 truncate">Local Memory</p>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => handleUpdatePreference('useMemory', !profile.preferences.useMemory)}
                                      className={`w-10 h-5 rounded-full relative transition-all ${profile.preferences.useMemory ? 'bg-amber-500' : (isDark ? 'bg-slate-800' : 'bg-slate-200')}`}
                                    >
                                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all ${profile.preferences.useMemory ? 'right-0.5' : 'left-0.5'}`} />
                                    </button>
                                  </div>

                                 <div className={`flex items-center justify-between p-5 rounded-2xl border ${isDark ? 'bg-slate-900/20 border-slate-800/50' : 'bg-white border-slate-100 shadow-sm'}`}>
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-teal-50'}`}><Zap size={16} className="text-teal-500" /></div>
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-black truncate">Mode Performa</p>
                                        <p className="text-[9px] font-bold text-slate-500 truncate">Lite Mode for Old Devices</p>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => handleUpdatePreference('performanceMode', !profile.preferences.performanceMode)}
                                      className={`w-10 h-5 rounded-full relative transition-all ${profile.preferences.performanceMode ? 'bg-teal-500' : (isDark ? 'bg-slate-800' : 'bg-slate-200')}`}
                                    >
                                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all ${profile.preferences.performanceMode ? 'right-0.5' : 'left-0.5'}`} />
                                    </button>
                                  </div>

                                  <div className={`flex items-center justify-between p-5 rounded-2xl border ${isDark ? 'bg-slate-900/20 border-slate-800/50' : 'bg-white border-slate-100 shadow-sm'}`}>
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-teal-50'}`}><MessageCircle size={16} className="text-teal-500" /></div>
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-black truncate">{t.personalization_settings.voice}</p>
                                        <p className="text-[9px] font-bold text-slate-500 truncate">Vocal System</p>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => handleUpdatePreference('advanced_voice', !profile.preferences.advanced_voice)}
                                      className={`w-10 h-5 rounded-full relative transition-all ${profile.preferences.advanced_voice ? 'bg-teal-500' : (isDark ? 'bg-slate-800' : 'bg-slate-200')}`}
                                    >
                                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all ${profile.preferences.advanced_voice ? 'right-0.5' : 'left-0.5'}`} />
                                    </button>
                                  </div>
                               </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'profil' && (
                      <div className="space-y-10">
                        <h3 className="text-2xl font-black tracking-tight">{t.profile}</h3>
                        
                        <div className="flex flex-col items-center sm:items-start gap-8">
                          {/* Avatar Display */}
                          <div className="relative group">
                            <div className={`w-32 h-32 rounded-[40px] overflow-hidden border-2 transition-all duration-500 ${
                              isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'
                            }`}>
                              {profile.avatar ? (
                                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <UserIcon size={48} />
                                </div>
                              )}
                            </div>
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="absolute -bottom-2 -right-2 p-3 bg-brand-blue text-white rounded-2xl shadow-xl shadow-brand-blue/30 hover:scale-110 active:scale-95 transition-all"
                            >
                              <Camera size={20} />
                            </button>
                            <input 
                              type="file"
                              ref={fileInputRef}
                              onChange={handleImageUpload}
                              accept="image/*"
                              className="hidden"
                            />
                          </div>

                            <div className="w-full space-y-6">
                            <div className="flex flex-col gap-2">
                              <label className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.userName}</label>
                              <input 
                                type="text" 
                                value={profile.name}
                                onChange={(e) => {
                                  const next = {...profile, name: e.target.value};
                                  saveProfile(next);
                                }}
                                placeholder={`${t.enterName}...`}
                                className={`w-full border rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-4 transition-all ${
                                  isDark 
                                  ? 'bg-slate-900 border-slate-800 text-white focus:ring-brand-blue/20' 
                                  : 'bg-slate-50 border-slate-100 text-slate-900 focus:ring-brand-blue/5'
                                }`}
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                               <label className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.dateTime || 'Tanggal Lahir'}</label>
                               <input 
                                 type="date" 
                                 value={profile.birthday || ''}
                                 onChange={(e) => {
                                   const next = {...profile, birthday: e.target.value};
                                   setProfile(next);
                                   saveProfile(next);
                                 }}
                                 className={`w-full border rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-4 transition-all ${
                                   isDark 
                                   ? 'bg-slate-900 border-slate-800 text-white focus:ring-brand-blue/20' 
                                   : 'bg-slate-50 border-slate-100 text-slate-900 focus:ring-brand-blue/5'
                                 }`}
                               />
                             </div>

                             <div className="flex flex-col gap-2">
                               <label className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Email</label>
                              <input 
                                type="email" 
                                value={profile.email}
                                disabled
                                className={`w-full border rounded-xl px-4 py-3.5 text-sm font-bold opacity-60 cursor-not-allowed ${
                                  isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'privasi' && (
                      <div className="space-y-12 py-4">
                        <div className="text-center space-y-2">
                          <h3 className="text-2xl font-black tracking-tight">{t.privacy}</h3>
                          <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {t.securityStatus}: <span className={profile.preferences.guardrailsEnabled ? 'text-emerald-500' : 'text-amber-500'}>{profile.preferences.guardrailsEnabled ? 'Shielded' : 'Vulnerable'}</span>
                          </p>
                        </div>
                        
                        <div className="space-y-10 max-w-2xl mx-auto">
                          {/* Maria Shield Section */}
                          <div className="space-y-6">
                             <div className="flex items-center gap-3 border-b border-slate-200/5 pb-2">
                                <ShieldCheck size={14} className="text-emerald-500" />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Keamanan Inti</span>
                             </div>

                             <div className={`flex items-center justify-between p-6 rounded-2xl border transition-all duration-500 ${profile.preferences.guardrailsEnabled ? (isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200') : (isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-100')}`}>
                                <div className="space-y-1">
                                  <p className="text-sm font-black">Maria Core Shield</p>
                                  <p className={`text-[10px] font-bold leading-relaxed max-w-[320px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Proteksi real-time yang memfilter input dan output untuk mencegah manipulasi data.
                                  </p>
                                </div>
                                <button 
                                  onClick={() => handleUpdatePreference('guardrailsEnabled', !profile.preferences.guardrailsEnabled)}
                                  className={`w-12 h-6 rounded-full relative transition-all duration-500 shrink-0 ${profile.preferences.guardrailsEnabled ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : (isDark ? 'bg-slate-800' : 'bg-slate-300')}`}
                                >
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-500 ${profile.preferences.guardrailsEnabled ? 'right-1' : 'left-1'}`} />
                                </button>
                             </div>
                          </div>

                          {/* Data Management Section (Following Screenshot) */}
                          <div className="space-y-6">
                             <div className="flex items-center gap-3 border-b border-slate-200/5 pb-2">
                                <MessageSquare size={14} className="text-brand-blue" />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Pengelolaan Data</span>
                             </div>

                             <div className="space-y-4">
                               {/* Auto Save Item */}
                               <div className={`flex items-center justify-between p-6 rounded-2xl border ${isDark ? 'bg-slate-900/20 border-slate-800/50' : 'bg-slate-50/50 border-slate-100'}`}>
                                  <div className="space-y-1">
                                    <p className="text-sm font-black">{t.saveHistory}</p>
                                    <p className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                      {t.saveHistoryDesc}
                                    </p>
                                  </div>
                                  <button 
                                    onClick={() => handleUpdatePreference('autoSave', !profile.preferences.autoSave)}
                                    className={`w-12 h-6 rounded-full relative transition-all duration-500 shrink-0 ${profile.preferences.autoSave ? 'bg-brand-blue shadow-lg shadow-brand-blue/30' : (isDark ? 'bg-slate-800' : 'bg-slate-300')}`}
                                  >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-500 ${profile.preferences.autoSave ? 'right-1' : 'left-1'}`} />
                                  </button>
                               </div>

                                {/* Delete History Item */}
                               <div className={`flex items-center justify-between p-6 rounded-2xl border ${isDark ? 'bg-slate-900/20 border-slate-800/50' : 'bg-slate-50/50 border-slate-100'}`}>
                                  <div className="space-y-1">
                                    <p className="text-sm font-black text-red-500">{t.deleteAll}</p>
                                    <p className={`text-[10px] font-bold ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                      Tindakan ini tidak dapat dibatalkan.
                                    </p>
                                  </div>
                                  <button 
                                    onClick={handleClearChat}
                                    className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                  >
                                    Hapus
                                  </button>
                               </div>
                            </div>
                         </div>
                      </div>
                    </div>
                  )}

                    {activeTab === 'personalisasi' && (
                      <div className="space-y-8">
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-black tracking-tight">{t.personalization}</h3>
                        </div>
                        
                        <div className="space-y-8">
                          {/* Tone Setting */}
                          <div className="flex flex-col gap-2">
                             <div className="flex items-start justify-between">
                               <div>
                                 <label className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.personalization_settings.style_tone}</label>
                                 <p className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.personalization_settings.style_tone_desc}</p>
                               </div>
                               <select 
                                 value={profile.preferences.style_tone}
                                 onChange={(e) => handleUpdatePreference('style_tone', e.target.value)}
                                 className={`px-3 py-1.5 rounded-lg text-xs font-black border outline-none cursor-pointer ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}
                               >
                                 <option value="default">Default</option>
                                 <option value="professional">Professional</option>
                                 <option value="friendly">Friendly</option>
                                 <option value="honest">Honest</option>
                                 <option value="eccentric">Eccentric</option>
                                 <option value="efficient">Efficient</option>
                                 <option value="sinister">Sinister</option>
                               </select>
                             </div>
                          </div>

                          <div className="space-y-4">
                            <label className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t.personalization_settings.characteristics}</label>
                            {[
                              { key: 'warmth', label: t.personalization_settings.warmth },
                              { key: 'enthusiasm', label: t.personalization_settings.enthusiasm },
                              { key: 'titles_lists', label: t.personalization_settings.titles_lists },
                              { key: 'emoji', label: t.personalization_settings.emoji }
                            ].map((item) => (
                              <div key={`char-${item.key}`} className="flex items-center justify-between">
                                <span className="text-sm font-bold">{item.label}</span>
                                <select 
                                  value={profile.preferences[item.key as keyof UserProfileData['preferences']] as string}
                                  onChange={(e) => handleUpdatePreference(item.key as any, e.target.value)}
                                  className={`px-3 py-1 rounded-lg text-xs font-black border outline-none cursor-pointer ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}
                                >
                                  <option value="more">{t.personalization_settings.more}</option>
                                  <option value="default">{t.personalization_settings.default}</option>
                                  <option value="less">{t.personalization_settings.less}</option>
                                </select>
                              </div>
                            ))}
                          </div>

                          <div className={`p-5 rounded-2xl border flex items-start gap-4 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex-1">
                              <p className="text-base font-black">{t.personalization_settings.quick_answer}</p>
                              <p className={`text-xs font-bold leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {t.personalization_settings.quick_answer_desc}
                              </p>
                            </div>
                            <button 
                              onClick={() => handleUpdatePreference('quick_answer', !profile.preferences.quick_answer)}
                              className={`w-12 h-6 rounded-full relative transition-all duration-300 shrink-0 ${profile.preferences.quick_answer ? 'bg-brand-blue' : (isDark ? 'bg-slate-800' : 'bg-slate-200')}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${profile.preferences.quick_answer ? 'right-1' : 'left-1'}`} />
                            </button>
                          </div>

                          <div className="space-y-4">
                             <label className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.customInst}</label>
                             <textarea 
                               value={profile.preferences.customInstructions}
                               onChange={(e) => handleUpdatePreference('customInstructions', e.target.value)}
                               placeholder={t.customInstPlaceholder}
                               className={`w-full border rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-4 transition-all min-h-[120px] resize-none ${
                                 isDark 
                                 ? 'bg-slate-900 border-slate-800 text-white focus:ring-brand-blue/20' 
                                 : 'bg-slate-50 border-slate-100 text-slate-900 focus:ring-brand-blue/5'
                               }`}
                             />
                          </div>

                          <div className="space-y-4 pt-4 border-t border-slate-200/10">
                            <h4 className="text-lg font-black tracking-tight">{t.personalization_settings.about_you}</h4>
                            
                            <div className="space-y-4">
                              <div className="flex flex-col gap-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.personalization_settings.nickname}</label>
                                <input 
                                  type="text"
                                  value={profile.preferences.nickname}
                                  onChange={(e) => handleUpdatePreference('nickname', e.target.value)}
                                  placeholder={t.personalization_settings.nickname_placeholder}
                                  className={`w-full border rounded-xl px-4 py-3 text-sm font-bold outline-none ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
                                />
                              </div>
                              <div className="flex flex-col gap-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.personalization_settings.job}</label>
                                <input 
                                  type="text"
                                  value={profile.preferences.job}
                                  onChange={(e) => handleUpdatePreference('job', e.target.value)}
                                  placeholder={t.personalization_settings.job_placeholder}
                                  className={`w-full border rounded-xl px-4 py-3 text-sm font-bold outline-none ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
                                />
                              </div>
                              <div className="flex flex-col gap-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.personalization_settings.bio}</label>
                                <textarea 
                                  value={profile.preferences.bio}
                                  onChange={(e) => handleUpdatePreference('bio', e.target.value)}
                                  placeholder={t.personalization_settings.bio_placeholder}
                                  className={`w-full border rounded-xl px-4 py-3 text-sm font-bold outline-none min-h-[100px] resize-none ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4 pt-4 border-t border-slate-200/10">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-black tracking-tight">{t.memory}</h4>
                              <button className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{t.personalization_settings.manage}</button>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="flex items-start justify-between">
                                <div className="max-w-[280px]">
                                  <p className="text-sm font-black">{t.personalization_settings.use_memory}</p>
                                  <p className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t.personalization_settings.use_memory_desc}</p>
                                </div>
                                <button 
                                  onClick={() => handleUpdatePreference('useMemory', !profile.preferences.useMemory)}
                                  className={`w-12 h-6 rounded-full relative transition-all duration-300 shrink-0 ${profile.preferences.useMemory ? 'bg-brand-blue' : (isDark ? 'bg-slate-800' : 'bg-slate-200')}`}
                                >
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${profile.preferences.useMemory ? 'right-1' : 'left-1'}`} />
                                </button>
                              </div>
                              <div className="flex items-start justify-between">
                                <div className="max-w-[280px]">
                                  <p className="text-sm font-black">{t.personalization_settings.use_history}</p>
                                  <p className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t.personalization_settings.use_history_desc}</p>
                                </div>
                                <button 
                                  onClick={() => handleUpdatePreference('use_history', !profile.preferences.use_history)}
                                  className={`w-12 h-6 rounded-full relative transition-all duration-300 shrink-0 ${profile.preferences.use_history ? 'bg-brand-blue' : (isDark ? 'bg-slate-800' : 'bg-slate-200')}`}
                                >
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${profile.preferences.use_history ? 'right-1' : 'left-1'}`} />
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4 pt-4 border-t border-slate-200/10">
                            <button 
                                onClick={() => {
                                  const el = document.getElementById('advanced-settings');
                                  if (el) el.classList.toggle('hidden');
                                }}
                                className="flex items-center gap-2 text-sm font-black"
                            >
                                {t.personalization_settings.advanced} <ChevronRight size={16} />
                            </button>
                            
                            <div id="advanced-settings" className="space-y-4 hidden">
                                {[
                                    { key: 'web_search', label: t.personalization_settings.web_search, desc: t.personalization_settings.web_search_desc },
                                    { key: 'canvas', label: t.personalization_settings.canvas, desc: 'Berkolaborasi dengan Maria di teks dan kode.' },
                                    { key: 'voice', label: t.personalization_settings.voice, desc: 'Aktifkan Suara di Maria.' },
                                    { key: 'advanced_voice', label: t.personalization_settings.advanced_voice, desc: 'Lakukan percakapan lebih natural dalam Suara.' },
                                    { key: 'connector_search', label: t.personalization_settings.connector_search, desc: 'Izinkan Maria mencari sumber terhubung untuk jawaban.' },
                                ].map((item) => (
                                    <div key={`adv-${item.key}`} className="flex items-start justify-between">
                                        <div className="max-w-[280px]">
                                            <p className="text-sm font-black">{item.label}</p>
                                            <p className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.desc}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleUpdatePreference(item.key as any, !profile.preferences[item.key as keyof UserProfileData['preferences']])}
                                            className={`w-12 h-6 rounded-full relative transition-all duration-300 shrink-0 ${profile.preferences[item.key as keyof UserProfileData['preferences']] ? 'bg-brand-blue' : (isDark ? 'bg-slate-800' : 'bg-slate-200')}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${profile.preferences[item.key as keyof UserProfileData['preferences']] ? 'right-1' : 'left-1'}`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'memory' && (
                      <div className="space-y-8">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl ${isDark ? 'bg-brand-blue/20 text-brand-blue' : 'bg-brand-blue/10 text-brand-blue'}`}>
                            <Brain size={24} />
                          </div>
                          <div>
                            <h3 className="text-2xl font-black tracking-tight">{t.memory}</h3>
                            <p className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{profile.preferences.language === 'en' ? 'Manage how Maria remembers your conversations' : 'Kelola bagaimana Maria mengingat percakapanmu'}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-6">
                          <div className={`flex items-center gap-4 p-6 rounded-[24px] border transition-all ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
                            <div className="flex-1">
                              <p className="text-base font-black">{t.autoMemory}</p>
                              <p className={`text-xs font-bold leading-relaxed mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {t.autoMemoryDesc}
                              </p>
                            </div>
                            <button 
                              onClick={() => handleUpdatePreference('useMemory', !profile.preferences.useMemory)}
                              className={`w-14 h-7 rounded-full relative transition-all duration-300 shrink-0 ${profile.preferences.useMemory ? 'bg-brand-blue shadow-lg shadow-brand-blue/30' : (isDark ? 'bg-slate-800' : 'bg-slate-200')}`}
                            >
                              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${profile.preferences.useMemory ? 'right-1' : 'left-1'}`} />
                            </button>
                          </div>

                          <div className={`p-6 rounded-[24px] border border-dashed ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <div className="flex items-start gap-4">
                              <div className={`mt-1 p-2 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                <Info size={16} className="text-brand-blue" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-black">{t.aboutMemory}</p>
                                <p className={`text-xs font-bold leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {t.aboutMemoryDesc}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 space-y-6">
                            <div className="flex items-center gap-3 border-b border-slate-200/5 pb-2">
                               <Zap size={14} className="text-brand-blue" />
                               <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Kata Kunci & Fakta (Memory)</span>
                            </div>

                            <div className="flex gap-2">
                              <input 
                                type="text"
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && newKeyword.trim()) {
                                    const updated = [...keywords, { id: generateId('key'), keyword: newKeyword.trim(), isEnabled: true }];
                                    setKeywords(updated);
                                    setNewKeyword('');
                                    if (user) {
                                      import('firebase/firestore').then(async ({ doc, updateDoc }) => {
                                        const { db } = await import('../lib/firebase');
                                        if (db) {
                                          await updateDoc(doc(db, 'users', user.uid), { keywords: updated });
                                        }
                                      });
                                    }
                                  }
                                }}
                                placeholder="Tambahkan fakta tentang Anda..."
                                className={`flex-1 border rounded-xl px-4 py-3 text-sm font-bold outline-none ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
                              />
                              <button 
                                onClick={() => {
                                  if (newKeyword.trim()) {
                                    const updated = [...keywords, { id: generateId('key'), keyword: newKeyword.trim(), isEnabled: true }];
                                    setKeywords(updated);
                                    setNewKeyword('');
                                    if (user) {
                                      import('firebase/firestore').then(async ({ doc, updateDoc }) => {
                                        const { db } = await import('../lib/firebase');
                                        if (db) {
                                          await updateDoc(doc(db, 'users', user.uid), { keywords: updated });
                                        }
                                      });
                                    }
                                  }
                                }}
                                className="p-3 bg-brand-blue text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-blue/20"
                              >
                                <Plus size={20} />
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {keywords.map((kw) => (
                                <div 
                                  key={kw.id} 
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                                    isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-100 shadow-sm hover:border-brand-blue/20'
                                  }`}
                                >
                                  <span>{kw.keyword}</span>
                                  <button 
                                    onClick={() => {
                                      const updated = keywords.filter(k => k.id !== kw.id);
                                      setKeywords(updated);
                                      if (user) {
                                        import('firebase/firestore').then(async ({ doc, updateDoc }) => {
                                          const { db } = await import('../lib/firebase');
                                          if (db) {
                                            await updateDoc(doc(db, 'users', user.uid), { keywords: updated });
                                          }
                                        });
                                      }
                                    }}
                                    className="p-1 hover:text-red-500 transition-colors"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>

                            <button 
                              onClick={() => {
                                if (confirm('Apakah Anda yakin ingin menghapus semua memory Maria?')) {
                                  setKeywords([]);
                                  if (user) {
                                    import('firebase/firestore').then(async ({ doc, updateDoc }) => {
                                      const { db } = await import('../lib/firebase');
                                      if (db) {
                                        await updateDoc(doc(db, 'users', user.uid), { keywords: [] });
                                      }
                                    });
                                  }
                                }
                              }}
                              className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                isDark 
                                ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white' 
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              {t.clearMemory}
                            </button>
                            <p className="text-[9px] text-center mt-3 font-bold text-slate-400">Maria menggunakan data di atas untuk mengenal Anda lebih baik.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'notifikasi' && (
                      <div className="space-y-12 py-4">
                        <div className="text-center space-y-2">
                          <h3 className="text-2xl font-black tracking-tight">{t.notifications}</h3>
                        </div>
                        
                        <div className="space-y-10 max-w-2xl mx-auto">
                          <div className="space-y-6">
                             <div className="flex items-center gap-3 border-b border-slate-200/5 pb-2">
                                <Bell size={14} className="text-brand-blue" />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Pengaturan Notifikasi</span>
                             </div>

                             <div className="space-y-4">
                                {[
                                  { key: 'codex', label: t.notifications_settings.codex, desc: t.notifications_settings.codex_desc },
                                  { key: 'group_chat', label: t.notifications_settings.group_chat, desc: t.notifications_settings.group_chat_desc },
                                  { key: 'usage', label: t.notifications_settings.usage, desc: t.notifications_settings.usage_desc },
                                  { key: 'project', label: t.notifications_settings.project, desc: t.notifications_settings.project_desc },
                                  { key: 'recommendation', label: t.notifications_settings.recommendation, desc: t.notifications_settings.recommendation_desc },
                                  { key: 'response', label: t.notifications_settings.response, desc: t.notifications_settings.response_desc },
                                  { key: 'tasks', label: t.notifications_settings.tasks, desc: t.notifications_settings.tasks_desc },
                                ].map((item) => (
                                  <div key={`notif-${item.key}`} className={`flex items-center justify-between p-6 rounded-2xl border ${isDark ? 'bg-slate-900/20 border-slate-800/50' : 'bg-slate-50/50 border-slate-100'}`}>
                                    <div className="max-w-[70%]">
                                      <p className="text-sm font-black">{item.label}</p>
                                      <p className={`text-[10px] font-bold leading-tight mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.desc}</p>
                                    </div>
                                    <select 
                                      value={profile.notifications[item.key as keyof UserProfileData['notifications']]}
                                      onChange={(e) => handleUpdateNotification(item.key as any, e.target.value)}
                                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black border outline-none cursor-pointer transition-all ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}
                                    >
                                      <option value="push">{t.notifications_settings.push}</option>
                                      <option value="email">{t.notifications_settings.email}</option>
                                      <option value="both">{t.notifications_settings.push_email}</option>
                                      <option value="none">{t.notifications_settings.none}</option>
                                    </select>
                                  </div>
                                ))}
                             </div>
                          </div>

                          <div className="space-y-6">
                             <div className="flex items-center gap-3 border-b border-slate-200/5 pb-2">
                                <Sparkles size={14} className="text-amber-500" />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Smart Automation</span>
                             </div>

                             <div className={`flex items-center justify-between p-6 rounded-2xl border transition-all duration-500 ${profile.preferences.autoNotify ? (isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200') : (isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-100')}`}>
                                <div className="space-y-1">
                                  <p className="text-sm font-black">{t.automation.smart_active}</p>
                                  <p className={`text-[10px] font-bold leading-relaxed max-w-[320px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {t.automation.smart_active_desc}
                                  </p>
                                </div>
                                <button 
                                  onClick={() => handleUpdatePreference('autoNotify', !profile.preferences.autoNotify)}
                                  className={`w-12 h-6 rounded-full relative transition-all duration-500 shrink-0 ${profile.preferences.autoNotify ? 'bg-amber-500 shadow-lg shadow-amber-500/30' : (isDark ? 'bg-slate-800' : 'bg-slate-300')}`}
                                >
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-500 ${profile.preferences.autoNotify ? 'right-1' : 'left-1'}`} />
                                </button>
                             </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'jadwal' && (
                        <div className="space-y-6 pt-6 border-t border-slate-200/5">
                          <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-black tracking-tight">{t.eventReminders}</h3>
                            <button 
                              onClick={() => {
                                // Just a visual state reset if needed
                              }}
                              className={`p-2 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}
                            >
                              <Calendar size={18} className="text-brand-blue" />
                            </button>
                          </div>

                          <div className={`p-6 rounded-[28px] border ${
                            isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-100'
                          }`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="space-y-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t.eventName}</label>
                                <input 
                                  type="text"
                                  value={newReminderTitle}
                                  onChange={(e) => setNewReminderTitle(e.target.value)}
                                  placeholder={profile.preferences.language === 'en' ? 'Study AI, Meeting, etc...' : 'Belajar AI, Meeting, dll...'}
                                  className={`w-full border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 transition-all ${
                                    isDark 
                                    ? 'bg-slate-950 border-slate-800 text-white focus:ring-brand-blue/20' 
                                    : 'bg-white border-slate-100 text-slate-900 focus:ring-brand-blue/5'
                                  }`}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t.dateTime}</label>
                                <input 
                                  type="datetime-local"
                                  value={newReminderDateTime}
                                  onChange={(e) => setNewReminderDateTime(e.target.value)}
                                  className={`w-full border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 transition-all ${
                                    isDark 
                                    ? 'bg-slate-950 border-slate-800 text-white focus:ring-brand-blue/20' 
                                    : 'bg-white border-slate-100 text-slate-900 focus:ring-brand-blue/5'
                                  }`}
                                />
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                if (!newReminderTitle.trim() || !newReminderDateTime) return;
                                const updated = [...reminders, { 
                                  id: generateId('rem'), 
                                  title: newReminderTitle.trim(), 
                                  dateTime: newReminderDateTime,
                                  isCompleted: false 
                                }];
                                setReminders(updated);
                                setNewReminderTitle('');
                                setNewReminderDateTime('');
                                window.dispatchEvent(new Event('maria_refresh_system'));
                                
                                // Sync to Firebase profile
                                if (user) {
                                  import('firebase/firestore').then(async ({ doc, updateDoc }) => {
                                    const { db } = await import('../lib/firebase');
                                    if (db) {
                                      await updateDoc(doc(db, 'users', user.uid), { reminders: updated });
                                    }
                                  });
                                }
                              }}
                              className="w-full flex items-center justify-center gap-2 py-4 bg-brand-blue text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-blue/20 hover:scale-[1.01] active:scale-95 transition-all"
                            >
                              <Plus size={16} />
                              {t.saveReminder}
                            </button>
                          </div>

                          <div className="space-y-3">
                            {reminders.filter(r => !r.isCompleted).length > 0 && (
                            <h4 className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t.upcoming}</h4>
                            )}
                            {reminders.filter(r => !r.isCompleted).map((rem) => (
                              <div 
                                key={`rem-${rem.id}`}
                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                  isDark ? 'bg-slate-950 border-slate-900/50' : 'bg-white border-slate-100 shadow-sm'
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-900 text-blue-400' : 'bg-blue-50 text-blue-500'}`}>
                                    <Clock size={16} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-black">{rem.title}</p>
                                    <p className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                      {new Date(rem.dateTime).toLocaleString(profile.preferences.language === 'en' ? 'en-US' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => {
                                    const updated = reminders.filter(r => r.id !== rem.id);
                                    setReminders(updated);
                                    window.dispatchEvent(new Event('maria_refresh_system'));
                                    
                                    // Sync to Firebase profile
                                    if (user) {
                                      import('firebase/firestore').then(async ({ doc, updateDoc }) => {
                                        const { db } = await import('../lib/firebase');
                                        if (db) {
                                          await updateDoc(doc(db, 'users', user.uid), { reminders: updated });
                                        }
                                      });
                                    }
                                  }}
                                  className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-red-500/10 text-slate-700 hover:text-red-500' : 'hover:bg-red-50 text-slate-300 hover:text-red-500'}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                            {reminders.length === 0 && (
                              <div className="py-10 text-center opacity-30">
                                <Calendar size={40} className="mx-auto mb-3" />
                                <p className="text-xs font-black uppercase tracking-widest">{t.noReminders}</p>
                              </div>
                            )}
                          </div>
                        </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

            {/* Action Buttons Footer */}
            <footer className="px-6 sm:px-10 py-6 border-t border-slate-200/10 flex flex-col sm:flex-row items-center justify-between gap-6 shrink-0">
              <div className="flex flex-col gap-4 w-full sm:w-auto">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Maria AI</span>
                      <span className="text-[10px] font-bold text-slate-400">v0.0.1 • Stable</span>
                  </div>
                  <button 
                    onClick={handleClearChat}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-all"
                  >
                    <RotateCcw size={14} />
                    {t.resetMaria}
                  </button>
                </div>
                
                {/* Legal Links */}
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                   {[
                     { id: 'privacy', label: t.legal?.privacy || 'Privacy' },
                     { id: 'terms', label: t.legal?.terms || 'Terms' },
                     { id: 'help', label: t.legal?.help || 'Help' },
                     { id: 'cookies', label: t.legal?.cookies || 'Cookies' }
                   ].map((link) => (
                     <button 
                       key={`legal-link-${link.id}`}
                       onClick={() => setActiveLegalDoc(link.id as LegalDocType)}
                       className={`text-[9px] font-black uppercase tracking-[0.1em] transition-colors ${
                         isDark ? 'text-slate-700 hover:text-slate-500' : 'text-slate-300 hover:text-slate-500'
                       }`}
                     >
                       {link.label}
                     </button>
                   ))}
                </div>
              </div>

              {user ? (
                <button 
                  disabled={isLoggingIn}
                  onClick={async () => {
                    await logout();
                    onClose();
                  }}
                  className="w-full sm:w-auto px-10 py-4 bg-red-500/10 text-red-500 rounded-2xl text-sm font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogOut size={18} />
                  {t.logout}
                </button>
              ) : (
                <button 
                  disabled={isLoggingIn}
                  onClick={async () => {
                    if (isLoggingIn) return;
                    setIsLoggingIn(true);
                    try {
                      await loginWithGoogle();
                      onClose();
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setIsLoggingIn(false);
                    }
                  }}
                  className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-[#021B2B] to-[#0E4D54] text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-teal-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingIn ? (
                    <RotateCcw className="w-5 h-5 animate-spin" />
                  ) : (
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  )}
                  {isLoggingIn ? 'Logging in...' : t.loginGoogle}
                </button>
              )}
            </footer>
          </div>
        </motion.div>
      </div>

      <LegalDocs 
        type={activeLegalDoc} 
        onClose={() => setActiveLegalDoc(null)} 
        isDark={isDark} 
      />
        </>
      )}
    </AnimatePresence>
  );
}

function SettingItem({ icon, label, value, onClick }: { icon: any, label: string, value: string, onClick: () => void }) {
    return (
        <div onClick={onClick} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-[24px] hover:border-brand-blue/20 hover:shadow-lg hover:shadow-slate-200/40 transition-all cursor-pointer group">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-50 border border-slate-50 rounded-xl text-slate-400 group-hover:text-brand-blue group-hover:bg-brand-blue/5 transition-colors">{icon}</div>
                <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</span>
                    <span className="text-sm font-bold text-slate-900">{value}</span>
                </div>
            </div>
            <ChevronRight size={18} className="text-slate-200 group-hover:text-brand-blue transition-colors" />
        </div>
    );
}
