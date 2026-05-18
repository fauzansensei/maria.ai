import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, BellOff, X, Calendar, MessageSquare, 
  Trash2, CheckCircle2, Clock, Sparkles, AlertCircle
} from 'lucide-react';
import { UserNotification, ReminderSetting, KeywordSetting } from '../types';

interface NotificationCenterProps {
  isDark: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ isDark, isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [reminders, setReminders] = useState<ReminderSetting[]>([]);
  const [keywords, setKeywords] = useState<KeywordSetting[]>([]);

  const loadData = useCallback(async () => {
    try {
      const { auth } = await import('../lib/firebase');
      if (auth?.currentUser) {
        // Data is handled by Firebase listeners
        return;
      }
      // Non-logged in: show nothing or limited state
      setNotifications([]);
      setReminders([]);
      setKeywords([]);
    } catch (e) {
      console.error("Maria: Failed to load notification data", e);
    }
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('maria_new_notification', loadData);
    
    // Auth-based Listener
    let unsubs: (() => void)[] = [];
    
    const setupFirebaseListeners = async () => {
      const { auth } = await import('../lib/firebase');
      if (auth?.currentUser) {
        const { collection, query, where, onSnapshot, orderBy } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        if (db) {
          // Notifications
          const qNotifs = query(
            collection(db, 'notifications'), 
            where('userId', '==', auth.currentUser.uid),
            orderBy('timestamp', 'desc')
          );
          const unsubNotifs = onSnapshot(qNotifs, (snap) => {
            const notifs: UserNotification[] = [];
            snap.forEach(doc => notifs.push({ id: doc.id, ...doc.data() } as any));
            setNotifications(notifs);
          }, (err) => {
            if (err.code !== 'permission-denied') {
              console.error("Notifications snapshot error:", err);
            }
          });
          unsubs.push(unsubNotifs);

          // keywords/reminders stored in user profile - already handled in App.tsx
          // but we can listen directly if needed for UI responsiveness
          const { doc } = await import('firebase/firestore');
          const unsubUser = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              if (data.reminders) setReminders(data.reminders);
              if (data.keywords) setKeywords(data.keywords);
            }
          }, (err) => {
            if (err.code !== 'permission-denied') {
              console.error("User profile snapshot error:", err);
            }
          });
          unsubs.push(unsubUser);
        }
      }
    };

    setupFirebaseListeners();

    return () => {
      window.removeEventListener('maria_new_notification', loadData);
      unsubs.forEach(fn => fn());
    };
  }, [loadData]);

  // Reminder check logic (Modified for Firestore)
  useEffect(() => {
    const interval = setInterval(async () => {
      const { auth } = await import('../lib/firebase');
      const now = new Date();
      
      // We only run client-side checker for non-logged in users 
      // or to trigger notifications for logged in users locally
      const currentReminders = reminders; 
      let hasChange = false;

      const triggerNotification = async (notifData: any) => {
        const { db } = await import('../lib/firebase');
        if (auth?.currentUser && db) {
          const { doc, setDoc } = await import('firebase/firestore');
          await setDoc(doc(db, 'notifications', notifData.id), {
            ...notifData,
            userId: auth.currentUser.uid
          });
        }
        window.dispatchEvent(new Event('maria_new_notification'));
      };

      const updatedReminders = await Promise.all(currentReminders.map(async (rem: ReminderSetting) => {
        if (!rem.isCompleted && new Date(rem.dateTime) <= now) {
          const newNotif: UserNotification = {
            id: 'reminder-' + Date.now() + '-' + rem.id,
            type: 'reminder',
            title: 'Pengingat Acara',
            content: `Waktunya untuk: ${rem.title}`,
            timestamp: Date.now(),
            isRead: false
          };

          // Avoid duplicate triggers
          const alreadyNotified = notifications.some((n: UserNotification) => n.content.includes(rem.title) && Date.now() - n.timestamp < 60000);
          
          if (!alreadyNotified) {
            await triggerNotification(newNotif);
            hasChange = true;
          }
          
          return { ...rem, isCompleted: true };
        }
        return rem;
      }));

      if (hasChange) {
        if (auth?.currentUser) {
          const { db } = await import('../lib/firebase');
          const { doc, updateDoc } = await import('firebase/firestore');
          if (db) {
            await updateDoc(doc(db, 'users', auth.currentUser.uid), { reminders: updatedReminders });
          }
        }
        setReminders(updatedReminders);
      }
    }, 15000); 

    return () => clearInterval(interval);
  }, [reminders, notifications]);

  const markAsRead = async (id: string) => {
    const { auth } = await import('../lib/firebase');
    if (auth?.currentUser) {
      const { db } = await import('../lib/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      if (db) {
        await updateDoc(doc(db, 'notifications', id), { isRead: true });
      }
    }
  };

  const deleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { auth } = await import('../lib/firebase');
    if (auth?.currentUser) {
      const { db } = await import('../lib/firebase');
      const { doc, deleteDoc } = await import('firebase/firestore');
      if (db) {
        await deleteDoc(doc(db, 'notifications', id));
      }
    }
  };

  const clearAll = async () => {
    const { auth } = await import('../lib/firebase');
    if (auth?.currentUser) {
      const { db } = await import('../lib/firebase');
      const { collection, query, where, getDocs, writeBatch } = await import('firebase/firestore');
      if (db) {
        const q = query(collection(db, 'notifications'), where('userId', '==', auth.currentUser.uid));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[210] flex items-center justify-end" onClick={onClose}>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px]"
        />
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-md h-full shadow-2xl flex flex-col transition-colors duration-500 ${
            isDark ? 'bg-slate-950 border-l border-slate-900 text-white' : 'bg-white border-l border-slate-100 text-slate-900'
          }`}
        >
          <header className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-slate-900' : 'border-slate-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl scale-95 ${isDark ? 'bg-brand-blue/20 text-brand-blue' : 'bg-brand-blue/10 text-brand-blue'}`}>
                <Bell size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Notifikasi</h2>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {notifications.length} Pesan
                  </span>
                  {unreadCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button 
                  onClick={clearAll}
                  className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${
                    isDark ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-brand-blue'
                  }`}
                >
                  Hapus Semua
                </button>
              )}
              <button 
                onClick={onClose}
                className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-slate-900 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
              >
                <X size={20} />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-40 py-20 text-center">
                <BellOff size={48} className="mb-4" />
                <p className="text-sm font-bold uppercase tracking-[0.2em] mb-1">Belum ada notifikasi</p>
                <p className="text-[10px] uppercase font-black tracking-widest max-w-[200px]">Maria akan memberi tahumu saat ada yang baru.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <motion.div
                    layout
                    key={`notif-center-${notif.id}`}
                    onClick={() => markAsRead(notif.id)}
                    className={`group relative p-5 rounded-[24px] border transition-all cursor-pointer ${
                      !notif.isRead 
                      ? (isDark ? 'bg-brand-blue/10 border-brand-blue/30 shadow-lg shadow-brand-blue/5' : 'bg-brand-blue/5 border-brand-blue/10 shadow-sm')
                      : (isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-100 opacity-80')
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 p-2 rounded-xl ${
                        notif.type === 'reminder' ? 'bg-purple-500/10 text-purple-500' :
                        notif.type === 'keyword' ? 'bg-orange-500/10 text-orange-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {notif.type === 'reminder' ? <Calendar size={18} /> : 
                         notif.type === 'keyword' ? <Sparkles size={18} /> : 
                         <Bell size={18} />}
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <h3 className="text-sm font-black truncate mb-1">{notif.title}</h3>
                        <p className={`text-xs font-bold leading-relaxed line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {notif.content}
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${
                            notif.type === 'reminder' ? 'text-purple-500' : 'text-brand-blue'
                          }`}>
                            <div className={`w-1 h-1 rounded-full ${notif.type === 'reminder' ? 'bg-purple-500' : 'bg-brand-blue'}`} />
                            {notif.type === 'reminder' ? 'Reminder' : 'Topik'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => deleteNotification(e, notif.id)}
                      className="absolute top-4 right-4 p-2 opacity-0 group-hover:opacity-100 scale-90 hover:scale-100 bg-red-500/10 text-red-500 rounded-xl transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                    {!notif.isRead && (
                      <div className="absolute top-4 right-4 w-2 h-2 bg-brand-blue rounded-full group-hover:opacity-0 transition-opacity" />
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <footer className={`p-6 border-t ${isDark ? 'border-slate-900 bg-slate-950' : 'border-slate-100 bg-slate-50/50'}`}>
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-xl ${isDark ? 'bg-slate-900' : 'bg-white shadow-sm border border-slate-100'}`}>
                <Sparkles size={16} className="text-brand-blue" />
              </div>
              <p className={`text-[10px] font-bold leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Atur kata kunci atau pengingat di Pengaturan Maria untuk mendapatkan informasi yang lebih relevan dan tepat waktu.
              </p>
            </div>
          </footer>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
