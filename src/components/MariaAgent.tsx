import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Share2, 
  Copy, 
  Check, 
  MapPin as MapPinIcon,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  RotateCcw,
  Pencil,
  X,
  Sparkles,
  Image as ImageIcon,
  Paperclip,
  MoreVertical,
  AlertCircle,
  Timer,
  RefreshCw,
  Globe,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { copyToClipboard } from '../lib/clipboard';
import { Message, KeywordSetting, UserNotification } from '../types';
import { askMaria } from '../services/geminiService';
import { getTranslation } from '../translations';
import { generateId } from '../lib/utils';
import MapWidget from './MapWidget';
import VTuberAvatar from './VTuberAvatar';
import Typewriter from './Typewriter';
import { useDeviceContext } from '../hooks/useDeviceContext';

interface MariaAgentProps {
  chatId: string;
  language: string;
  userName?: string;
  isFocusMode?: boolean;
  isLiteMode?: boolean;
  isDark?: boolean;
  onExitFocus?: () => void;
  onTitleUpdate?: (title: string) => void;
}

export default function MariaAgent({ chatId, language, userName, isFocusMode = false, isLiteMode = false, isDark = false, onExitFocus, onTitleUpdate }: MariaAgentProps) {
  const t = getTranslation(language);
  const transition = isLiteMode ? { duration: 0.1 } : { duration: 0.5 };
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const deviceContext = useDeviceContext();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [pendingImages, setPendingImages] = useState<{ id: string; url: string; base64: string; type: string }[]>([]);
  const [mapConfig, setMapConfig] = useState<{ isOpen: boolean; location?: { lat: number; lng: number }; title?: string }>({
    isOpen: false
  });
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resetTimestamp, setResetTimestamp] = useState<number | null>(null);
  const [isPlus, setIsPlus] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loadProfile = () => {
      const savedProfile = localStorage.getItem('maria_profile');
      if (savedProfile) {
        try {
          const profile = JSON.parse(savedProfile);
          setIsPlus(profile.isPlus || false);
        } catch (e) {}
      }

      const savedLimit = localStorage.getItem('maria_quota_limit');
      if (savedLimit) {
        const timestamp = parseInt(savedLimit);
        if (timestamp > Date.now()) {
          setQuotaExhausted(true);
          setResetTimestamp(timestamp);
          setCountdown(Math.floor((timestamp - Date.now()) / 1000));
        } else {
          setQuotaExhausted(false);
          localStorage.removeItem('maria_quota_limit');
        }
      }
    };
    loadProfile();
    window.addEventListener('storage', loadProfile);
    window.addEventListener('maria_refresh_system', loadProfile);
    return () => {
      window.removeEventListener('storage', loadProfile);
      window.removeEventListener('maria_refresh_system', loadProfile);
    };
  }, []);

  useEffect(() => {
    let unsubscribeMessages = () => {};

    const loadChat = async () => {
      try {
        // ALWAYS try local cache first for instant UI response (Stale-While-Revalidate)
        const historyStr = localStorage.getItem(`maria_history_${chatId}`);
        if (historyStr && historyStr !== 'null') {
          try {
            const msgs = JSON.parse(historyStr);
            if (Array.isArray(msgs) && msgs.length > 0) {
              setMessages(msgs);
              // don't set initializing to false yet if we want a loader, but we have content
            }
          } catch(e) {}
        }

        const { auth } = await import('../lib/firebase');
        if (auth?.currentUser) {
          const { collection, query, onSnapshot, orderBy, getDocs } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');
          if (db) {
            const messagesRef = collection(db, 'chats', chatId, 'messages');
            const q = query(messagesRef, orderBy('timestamp', 'asc'));
            
            // First check if collection exists/empty via one-time fetch to avoid flicker if it's truly empty
            // GetDocs respects cache too.
            const initialSnap = await getDocs(q).catch(() => null);
            if (initialSnap && !initialSnap.empty) {
               const initialRemoteMsgs = initialSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
               setMessages(initialRemoteMsgs);
               setIsInitializing(false);
            }

            unsubscribeMessages = onSnapshot(q, (snap) => {
              const remoteMsgs: Message[] = [];
              snap.forEach(doc => {
                const data = doc.data();
                remoteMsgs.push({ id: doc.id, ...data } as any);
              });
              
              if (remoteMsgs.length > 0) {
                setMessages(remoteMsgs);
                // PERSIST: Update local cache whenever we get remote messages to prevent "disappearing" on next mount
                localStorage.setItem(`maria_history_${chatId}`, JSON.stringify(remoteMsgs));
              } else if (initialSnap && (initialSnap as any).empty) {
                // Truly a new chat with no messages
                // ONLY set default messages if we don't already have messages from local cache
                setMessages(prev => prev.length > 0 ? prev : [
                  {
                    id: 'welcome',
                    role: 'assistant',
                    content: t.welcome,
                    timestamp: Date.now(),
                  },
                ]);
              }
              setIsInitializing(false);
            }, (err: any) => {
              console.error("Messages snapshot error:", err);
              // Handle Permission Denied gracefully during migration
              if (err.code === 'permission-denied') {
                console.warn("Maria: Permission denied for messages, keeping current state.");
              }
              setIsInitializing(false);
            });
          } else {
            setIsInitializing(false);
          }
        } else {
          // NOT LOGGED IN
          const historyStr = localStorage.getItem(`maria_history_${chatId}`);
          if (historyStr && historyStr !== 'null') {
            try {
              const msgs = JSON.parse(historyStr);
              if (Array.isArray(msgs) && msgs.length > 0) {
                setMessages(msgs);
              } else {
                setMessages([{ id: 'welcome', role: 'assistant', content: t.welcome, timestamp: Date.now() }]);
              }
            } catch(e) {
               setMessages([{ id: 'welcome', role: 'assistant', content: t.welcome, timestamp: Date.now() }]);
            }
          } else {
            setMessages([{ id: 'welcome', role: 'assistant', content: t.welcome, timestamp: Date.now() }]);
          }
          setIsInitializing(false);
        }
      } catch (e) {
        console.error("Failed to load chat history", e);
        setIsInitializing(false);
      }
    };

    loadChat();
    
    // Custom event to handle history updates across components
    const handleHistoryUpdate = (e: any) => {
      if (e.detail?.chatId === chatId) {
        // loadChat(); // Handled by onSnapshot for users
      }
    };

    window.addEventListener('maria_history_update' as any, handleHistoryUpdate);
    return () => {
      window.removeEventListener('maria_history_update' as any, handleHistoryUpdate);
      if (typeof unsubscribeMessages === 'function') unsubscribeMessages();
    };
  }, [chatId, t.welcome]);

  const scrollToBottom = () => {
    if (isLiteMode) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    } else {
      window.requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const saveToStorage = async (updatedMessages: Message[]) => {
    try {
      // 1. Save messages to specific history key
      localStorage.setItem(`maria_history_${chatId}`, JSON.stringify(updatedMessages));

      // 2. Update metadata in maria_chats
      const chatsStr = localStorage.getItem('maria_chats');
      const allChats = (chatsStr && chatsStr !== 'null') ? JSON.parse(chatsStr) : {};
      let title = allChats[chatId]?.title || 'Chat Baru';
    
      if (title === 'Chat Baru' || title === t.newChat) {
        const firstUserMsg = updatedMessages.find(m => m.role === 'user');
        if (firstUserMsg) {
          title = firstUserMsg.content.substring(0, 35) + (firstUserMsg.content.length > 35 ? '...' : '');
          if (onTitleUpdate) onTitleUpdate(title);
        }
      }

      allChats[chatId] = {
        ...(allChats[chatId] || {}),
        id: chatId,
        title: title,
        updatedAt: Date.now()
      };
      
      localStorage.setItem('maria_chats', JSON.stringify(allChats));
      
      window.dispatchEvent(new CustomEvent('maria_history_update', { detail: { chatId } }));
      window.dispatchEvent(new Event('maria_refresh_system'));
      
      // FIREBASE SYNC - metadata + latest message
      const { auth } = await import('../lib/firebase');
      if (auth?.currentUser) {
        const { doc, writeBatch } = await import('firebase/firestore');
        const { db, handleFirestoreError, OperationType } = await import('../lib/firebase');
        if (db) {
          const batch = writeBatch(db);
          const chatRef = doc(db, 'chats', chatId);
          
          batch.set(chatRef, {
            userId: auth.currentUser.uid,
            title: title,
            isPinned: allChats[chatId].isPinned || false,
            isFavorite: allChats[chatId].isFavorite || false,
            updatedAt: Date.now()
          }, { merge: true });

          const latestMsg = updatedMessages[updatedMessages.length - 1];
          if (latestMsg) {
            const { sanitizeForFirestore } = await import('../lib/firebase');
            const sanitizedMsg = sanitizeForFirestore(latestMsg);
            const msgRef = doc(db, 'chats', chatId, 'messages', latestMsg.id);
            batch.set(msgRef, sanitizedMsg);
          }
          
          await batch.commit().catch(err => {
            console.error("Firebase batch sync error:", err);
            handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}`);
          });
        }
      }
    } catch (e) {
      console.error("Failed to save to storage", e);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if ((!input.trim() && pendingImages.length === 0) || isLoading) return;

    // Capture current values
    const currentInput = input;
    const currentImages = [...pendingImages];
    
    // Immediate state reset for responsiveness
    setInput('');
    setPendingImages([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
      // Keep focus on desktop, but might blur on mobile to hide keyboard if desired
      if (window.innerWidth >= 640) {
        textareaRef.current.focus();
      }
    }

    const userMsg: Message = {
      id: generateId('msg-user'),
      chatId: chatId,
      role: 'user',
      content: currentInput,
      timestamp: Date.now(),
      ...(currentImages.length > 0 ? {
        images: currentImages.map(img => ({
          data: img.base64,
          mimeType: img.type
        }))
      } : {})
    };

    const nextMessages = [...messages.filter(m => m.id !== 'welcome' || messages.length > 1), userMsg];
    
    // Trigger sync and then process
    processMessage(nextMessages, currentInput, currentImages);
  };

  useEffect(() => {
    // Check for existing quota limit on load
    const savedLimit = localStorage.getItem('maria_quota_limit');
    if (savedLimit) {
      const timestamp = parseInt(savedLimit);
      if (timestamp > Date.now()) {
        setQuotaExhausted(true);
        setResetTimestamp(timestamp);
        setCountdown(Math.floor((timestamp - Date.now()) / 1000));
      } else {
        localStorage.removeItem('maria_quota_limit');
      }
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0 && quotaExhausted) {
      interval = setInterval(() => {
        const remaining = resetTimestamp ? Math.max(0, Math.floor((resetTimestamp - Date.now()) / 1000)) : countdown - 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          setQuotaExhausted(false);
          localStorage.removeItem('maria_quota_limit');
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown, quotaExhausted, resetTimestamp]);

  const formatCountdown = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) return `${h} ${language === 'en' ? 'hours' : 'jam'} ${m} ${language === 'en' ? 'minutes' : 'menit'} ${s} ${language === 'en' ? 'seconds' : 'detik'}`;
    if (m > 0) return `${m} ${language === 'en' ? 'minutes' : 'menit'} ${s} ${language === 'en' ? 'seconds' : 'detik'}`;
    return `${s} ${language === 'en' ? 'seconds' : 'detik'}`;
  };

  const processMessage = async (currentMessages: Message[], text: string, images?: { base64: string; type: string }[] | null) => {
    // Check if we are still in quota cooldown (Skip for Plus users)
    const savedLimit = localStorage.getItem('maria_quota_limit');
    if (!isPlus && savedLimit && parseInt(savedLimit) > Date.now()) {
      setQuotaExhausted(true);
      setCountdown(Math.floor((parseInt(savedLimit) - Date.now()) / 1000));
      return;
    }

    setMessages(currentMessages);
    // Non-blocking storage save
    setTimeout(() => saveToStorage(currentMessages), 0);

    setIsLoading(true);

    // Get preferences for personality
    let preferences: { personality: string; useMemory: boolean; guardrailsEnabled: boolean; customApiKey?: string } = { 
      personality: 'default', 
      useMemory: true, 
      guardrailsEnabled: true 
    };
    const savedProfile = localStorage.getItem('maria_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        if (parsed.preferences) {
          preferences = {
            personality: parsed.preferences.personality || 'default',
            useMemory: parsed.preferences.useMemory !== undefined ? parsed.preferences.useMemory : true,
            guardrailsEnabled: parsed.preferences.guardrailsEnabled !== undefined ? parsed.preferences.guardrailsEnabled : true,
            customApiKey: parsed.isPlus ? parsed.preferences.paidApiKey : undefined
          };
        }
      } catch (e) {}
    }

    // Get weather data from localStorage
    let weatherContext = null;
    try {
      const savedWeather = localStorage.getItem('weather_data');
      if (savedWeather) {
        weatherContext = JSON.parse(savedWeather);
      }
    } catch (e) {}

    try {
      const responseData = await askMaria(
        text, 
        language, 
        images ? images.map(img => ({ data: img.base64, mimeType: img.type })) : undefined,
        preferences,
        { ...deviceContext, weather: weatherContext },
        userName,
        currentMessages.slice(0, -1)
      );
      const assistantMsg: Message = {
        id: generateId('msg-assistant'),
        chatId: chatId,
        role: 'assistant',
        content: responseData.text,
        groundingMetadata: responseData.groundingMetadata,
        timestamp: Date.now(),
      };
      
      const finalMessages = [...currentMessages, assistantMsg];
      setMessages(finalMessages);
      saveToStorage(finalMessages);

      // --- SMART AUTOMATION LOGIC ---
      const response = responseData.text;
      const autoEnabled = localStorage.getItem('maria_profile') ? JSON.parse(localStorage.getItem('maria_profile')!).preferences?.autoNotify : false;
      if (autoEnabled) {
          const lowerResponse = response.toLowerCase();
          const isWorking = lowerResponse.includes('mulai kerja') || lowerResponse.includes('mode kerja') || lowerResponse.includes('semangat bekerja');
          const isHome = lowerResponse.includes('sudah pulang') || lowerResponse.includes('selamat istirahat') || lowerResponse.includes('pulang kerja');
          
          if (isWorking || isHome) {
              const status = isWorking ? 'WORKING' : 'HOME';
              const newNotif: UserNotification = {
                  id: generateId('notif-auto'),
                  type: 'system',
                  title: isWorking ? 'Mode Kerja Aktif' : 'Mode Istirahat Aktif',
                  content: isWorking ? 'Maria telah mengoptimalkan dashboard untuk fokus bekerja.' : 'Maria telah menyesuaikan dashboard untuk waktu istirahat.',
                  timestamp: Date.now(),
                  isRead: false,
                  metadata: { automation: status }
              };
              const existingNotifs = JSON.parse(localStorage.getItem('maria_notifications') || '[]');
              existingNotifs.unshift(newNotif);
              localStorage.setItem('maria_notifications', JSON.stringify(existingNotifs.slice(0, 50)));
              window.dispatchEvent(new Event('maria_new_notification'));
              
              // Effect: Trigger profile update or dashboard changes
              if (isWorking) {
                  window.dispatchEvent(new CustomEvent('maria_automation', { detail: { type: 'WORK_START' } }));
                  console.log("Maria Automation: Working Mode");
              } else if (isHome) {
                  window.dispatchEvent(new CustomEvent('maria_automation', { detail: { type: 'WORK_END' } }));
              }
          }
      }
      // -------------------------------
      const savedKeywords = localStorage.getItem('maria_keywords');
      if (savedKeywords) {
        try {
          const kws: KeywordSetting[] = JSON.parse(savedKeywords);
          const lowerResponse = response.toLowerCase();
          const foundKeywords = kws.filter(k => k.isEnabled && lowerResponse.includes(k.keyword.toLowerCase()));
          
          if (foundKeywords.length > 0) {
            const newNotif: UserNotification = {
              id: generateId('notif-keyword'),
              type: 'keyword',
              title: t.topicDetected,
              content: `${t.topicFound}: ${foundKeywords.map(k => k.keyword).join(', ')}`,
              timestamp: Date.now(),
              isRead: false
            };
            const existingNotifs = JSON.parse(localStorage.getItem('maria_notifications') || '[]');
            existingNotifs.unshift(newNotif);
            localStorage.setItem('maria_notifications', JSON.stringify(existingNotifs.slice(0, 50)));
            window.dispatchEvent(new Event('maria_new_notification'));
          }
        } catch (e) {
          console.error("Error detecting keywords", e);
        }
      }
    } catch (error: any) {
      console.error(error);
      
    const isQuotaExceeded = error?.message?.toLowerCase().includes("429") || 
                            error?.message?.toLowerCase().includes("quota") || 
                            error?.message?.toLowerCase().includes("kuota") || 
                            error?.message?.toLowerCase().includes("resource_exhausted") ||
                            error?.status === "RESOURCE_EXHAUSTED" ||
                            error?.error?.status === "RESOURCE_EXHAUSTED" ||
                            error?.error?.code === 429 ||
                            (error instanceof Error && error.message.toLowerCase().includes("resource_exhausted"));

      if (isQuotaExceeded) {
        // Calculate reset time (until next midnight)
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const limitTimestamp = midnight.getTime();
        
        localStorage.setItem('maria_quota_limit', limitTimestamp.toString());
        setResetTimestamp(limitTimestamp);
        setQuotaExhausted(true);
        setCountdown(Math.floor((limitTimestamp - Date.now()) / 1000));

        // Sync quota limit to Firebase Profile
        const { auth } = await import('../lib/firebase');
        if (auth?.currentUser) {
          const { doc, updateDoc } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');
          if (db) {
             await updateDoc(doc(db, 'users', auth.currentUser.uid), { quotaResetAt: limitTimestamp });
          }
        }
        
        // Remove the failing user message from state so it doesn't stay in the UI
        setMessages(currentMessages.slice(0, -1));
        // Also update storage to remove the failing message
        saveToStorage(currentMessages.slice(0, -1));
        return;
      }

      const errorMsg: Message = {
        id: generateId('msg-error'),
        role: 'assistant',
        content: error.message || 'Maria sedang mengalami kendala teknis. Mohon coba lagi nanti.',
        timestamp: Date.now(),
      };
      const finalMessages = [...currentMessages, errorMsg];
      setMessages(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (msg: Message) => {
    setEditingId(msg.id);
    setEditInput(msg.content);
  };

  const handleUpdateMessage = async (msgId: string) => {
    if (!editInput.trim() || isLoading) return;

    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    const updatedMessages = [...messages];
    updatedMessages[msgIndex] = {
      ...updatedMessages[msgIndex],
      content: editInput,
      timestamp: Date.now()
    };

    if (updatedMessages[msgIndex].role === 'user') {
      const finalMessages = updatedMessages.slice(0, msgIndex + 1);
      setEditingId(null);
      processMessage(finalMessages, editInput);
    } else {
      setMessages(updatedMessages);
      saveToStorage(updatedMessages);
      setEditingId(null);
    }
  };

  const detectLocation = (text: string) => {
    const places = [
      { name: 'Jakarta', lat: -6.2088, lng: 106.8456 },
      { name: 'Surabaya', lat: -7.2575, lng: 112.7521 },
      { name: 'Bandung', lat: -6.9175, lng: 107.6191 }
    ];
    return places.find(p => text.toLowerCase().includes(p.name.toLowerCase()));
  };

  const handleCopy = async (text: string, id: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleShare = async (text: string, id: string) => {
    const fallbackCopy = async () => {
      const success = await copyToClipboard(text);
      if (success) {
        setSharedId(id);
        setTimeout(() => setSharedId(null), 2000);
      }
    };

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Maria AI Chat',
          text: text,
          url: window.location.href,
        });
      } catch (err) {
        // If it's not a user cancelation, or even if it is, providing feedback is good
        if ((err as Error).name !== 'AbortError') {
          fallbackCopy();
        } else {
          // Even if canceled, we could still copy to be helpful, or just do nothing
          // Let's copy to clipboard as fallback always if the user intent was to share
          fallbackCopy();
        }
      }
    } else {
      fallbackCopy();
    }
  };

  const handleRegenerate = (msgId: string) => {
    if (isLoading) return;
    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    // Find the nearest preceding user message
    let userMsgIndex = -1;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMsgIndex = i;
        break;
      }
    }

    if (userMsgIndex !== -1) {
      const historyUntilUser = messages.slice(0, userMsgIndex + 1);
      processMessage(historyUntilUser, messages[userMsgIndex].content);
    }
  };

  const handleFeedback = (msgId: string) => {
    setFeedbackId(msgId);
    setTimeout(() => setFeedbackId(null), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const newImages: { id: string; url: string; base64: string; type: string }[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;

      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
              const MAX_SIZE = isLiteMode ? 512 : 1024;
              if (width > height) {
                if (width > MAX_SIZE) {
                  height *= MAX_SIZE / width;
                  width = MAX_SIZE;
                }
              } else {
                if (height > MAX_SIZE) {
                  width *= MAX_SIZE / height;
                  height = MAX_SIZE;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', isLiteMode ? 0.5 : 0.7).split(',')[1]);
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      });

      newImages.push({
        id: Math.random().toString(36).substr(2, 9),
        url: URL.createObjectURL(file),
        base64: base64Data,
        type: 'image/jpeg'
      });
    }

    setPendingImages(prev => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingImage = (id: string) => {
    setPendingImages(prev => prev.filter(img => img.id !== id));
  };

  // Memoized location detection to avoid heavy regex on every render
  const memoizedLocationResults = useRef<Record<string, any>>({});
  const getDetectedLocation = (content: string) => {
    if (memoizedLocationResults.current[content]) return memoizedLocationResults.current[content];
    const loc = detectLocation(content);
    memoizedLocationResults.current[content] = loc;
    return loc;
  };

  const handleDeleteMessage = (id: string) => {
    const updatedMessages = messages.filter(m => m.id !== id);
    setMessages(updatedMessages);
    saveToStorage(updatedMessages);
  };

  return (
    <div className={`flex flex-col h-full bg-transparent overflow-hidden transition-all duration-700 ${isDark || isFocusMode ? 'text-white' : 'text-slate-900'}`}>
      {/* Floating Focus Mode Exit */}
      <AnimatePresence>
        {isFocusMode && (
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-[100]"
          >
            <button 
              onClick={onExitFocus}
              className="px-6 py-2 bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-full flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white hover:bg-slate-700 transition-all shadow-2xl"
            >
              <X size={14} /> {t.focusExit}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Messages Container */}
      <div className={`flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 lg:px-20 py-6 sm:py-10 space-y-8 sm:space-y-12 custom-scrollbar transition-all duration-700 ${isFocusMode ? 'pt-24' : ''}`}>
        <AnimatePresence initial={false}>
          {isInitializing && messages.length <= 1 && messages[0]?.id === 'welcome' && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="flex flex-col items-center justify-center py-20 opacity-30 gap-3"
            >
              <RefreshCw className="animate-spin text-brand-blue" size={24} />
              <p className="text-[10px] font-black uppercase tracking-widest">{language === 'en' ? 'Synchronizing History...' : 'Menyelaraskan Riwayat...'}</p>
            </motion.div>
          )}
          {messages.map((msg) => (
            <MessageItem 
              key={msg.id}
              msg={msg}
              isLiteMode={isLiteMode}
              isDark={isDark}
              isFocusMode={isFocusMode}
              isPlus={isPlus}
              language={language}
              t={t}
              editingId={editingId}
              editInput={editInput}
              setEditInput={setEditInput}
              copiedId={copiedId}
              sharedId={sharedId}
              feedbackId={feedbackId}
              onCopy={handleCopy}
              onShare={handleShare}
              onFeedback={handleFeedback}
              onRegenerate={handleRegenerate}
              onEdit={startEditing}
              onDelete={handleDeleteMessage}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={handleUpdateMessage}
              onSetMapConfig={setMapConfig}
              onScrollToBottom={scrollToBottom}
              isLast={msg.id === messages[messages.length - 1]?.id}
            />
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className={`border px-6 py-4 rounded-3xl rounded-tl-none flex items-center gap-4 shadow-sm ${isDark || isFocusMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce" />
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-widest ${isDark || isFocusMode ? 'text-slate-500' : 'text-slate-400'}`}>{t.typing}</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} className="h-20" />
      </div>

      {/* Quota Exhausted Alert - Grok Style */}
      <AnimatePresence>
        {quotaExhausted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className={`max-w-[400px] w-full p-6 rounded-[32px] border shadow-2xl ${
                isDark || isFocusMode 
                ? 'bg-slate-900 border-slate-800' 
                : 'bg-white border-slate-100'
              }`}
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-xl ${isDark || isFocusMode ? 'bg-brand-blue/20 text-brand-blue' : 'bg-brand-blue/10 text-brand-blue'}`}>
                    <Sparkles size={20} />
                  </div>
                  <h3 className="text-lg font-black tracking-tight">{t.limitReached}</h3>
                </div>
                
                <p className={`text-sm font-bold leading-relaxed mb-6 ${isDark || isFocusMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t.limitDesc} <span className="text-brand-blue font-black">{formatCountdown(countdown)}</span>.
                </p>

                <div className="flex flex-col gap-2 w-full">
                  {!isPlus && (
                    <button 
                      onClick={() => {
                        // Logic for upgrade
                        setQuotaExhausted(false);
                      }}
                      className="w-full py-3.5 rounded-xl bg-brand-blue text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-blue/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      {t.upgrade}
                    </button>
                  )}
                  
                  <button 
                    disabled={countdown > 0}
                    onClick={() => {
                      setQuotaExhausted(false);
                      setCountdown(0);
                      localStorage.removeItem('maria_quota_limit');
                    }}
                    className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${
                      countdown > 0 
                      ? (isDark || isFocusMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400')
                      : (isDark || isFocusMode ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100')
                    }`}
                  >
                    {countdown > 0 ? (
                      <>
                        <Timer size={14} />
                        {t.wait} ({formatCountdown(countdown)})
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        {t.tryAgain}
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => setQuotaExhausted(false)}
                    className={`mt-2 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                      isDark || isFocusMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'
                    }`}
                  >
                    {t.close}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MapWidget 
        isOpen={mapConfig.isOpen} 
        onClose={() => setMapConfig({ ...mapConfig, isOpen: false })}
        location={mapConfig.location}
        title={mapConfig.title}
      />

      {/* Modern Input Dock */}
      <div className={`p-4 sm:p-6 md:p-10 pointer-events-none transition-all duration-700 ${isFocusMode ? 'pb-20' : ''}`}>
          <div className="max-w-4xl mx-auto w-full pointer-events-auto">
              <form onSubmit={handleSubmit} className="relative group">
                <AnimatePresence>
                  {pendingImages.length > 0 && (
                    <motion.div 
                      initial={isLiteMode ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
                      animate={isLiteMode ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                      exit={isLiteMode ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
                      className={`absolute -top-32 left-0 right-0 z-50 p-3 rounded-2xl border shadow-xl flex items-center gap-3 overflow-x-auto custom-scrollbar ${
                        isLiteMode 
                        ? (isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200')
                        : 'bg-white/80 backdrop-blur-xl border-slate-200'
                      }`}
                    >
                      {pendingImages.map((img) => (
                        <div key={img.id} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden shadow-inner group/img">
                          <img src={img.url} alt="Pending" className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={() => removePendingImage(img.id)}
                            className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black transition-colors opacity-0 group-hover/img:opacity-100"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      <div className="flex-shrink-0 pr-4">
                        <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-1">{pendingImages.length} Image{pendingImages.length > 1 ? 's' : ''} Attached</p>
                        <p className="text-[11px] text-slate-500 max-w-[120px] truncate">Ready for Maria</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="relative flex items-center gap-2">
                    <div className="flex-1 relative flex items-center">
                        <Sparkles size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-blue/30 group-focus-within:text-brand-blue transition-colors hidden sm:block" />
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                              // Comprehensive Enter key handling
                              if ((e.key === 'Enter' || e.keyCode === 13) && !e.shiftKey) {
                                e.preventDefault();
                                if (input.trim() || pendingImages.length > 0) {
                                  handleSubmit(e);
                                  // Mobile optimizations
                                  if (window.innerWidth < 640) {
                                    (e.target as HTMLTextAreaElement).blur();
                                  }
                                }
                              }
                            }}
                            disabled={isLoading}
                            placeholder={t.chatInputPlaceholder}
                            rows={1}
                            inputMode="text"
                            enterKeyHint="send"
                            className={`w-full py-4 sm:py-5 transition-all outline-none rounded-[24px] sm:rounded-[28px] pl-6 sm:pl-16 pr-14 text-sm sm:text-base shadow-xl resize-none overflow-hidden custom-scrollbar ${
                                isDark || isFocusMode 
                                ? 'bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:border-brand-blue/50 focus:ring-8 focus:ring-brand-blue/10' 
                                : 'bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-brand-blue focus:ring-8 focus:ring-brand-blue/5'
                            } ${isLiteMode ? 'shadow-none' : 'shadow-slate-200/40'}`}
                            style={{ minHeight: '48px', maxHeight: '200px', height: 'auto' }}
                            onInput={(e: any) => {
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                        />
                        <div className="absolute right-3 flex items-center gap-0.5">
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="image/*" 
                            multiple
                            className="hidden" 
                          />
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={`p-2 rounded-full transition-all ${isDark || isFocusMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-400'} hover:text-brand-blue`}
                            title="Upload Image"
                          >
                            <ImageIcon size={18} />
                          </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={(!input.trim() && pendingImages.length === 0) || isLoading}
                        className={`w-12 h-12 sm:w-16 sm:h-16 shrink-0 border rounded-[20px] sm:rounded-[26px] transition-all disabled:opacity-20 flex items-center justify-center shadow-xl active:scale-95 group ${
                          isDark || isFocusMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-900 border-slate-800 text-white'
                        } hover:bg-brand-blue hover:border-brand-blue`}
                    >
                        <Send size={18} className="sm:w-5 sm:h-5 ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </button>
                </div>
              </form>
              <div className="mt-3 text-center">
                  <p className={`text-[9px] font-bold tracking-[0.1em] px-4 ${isDark || isFocusMode ? 'text-slate-600' : 'text-slate-400'}`}>{t.professionalAsst}</p>
              </div>
          </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, isFocusMode = false, isDark = false }: { icon: React.ReactNode, label: string, onClick?: () => void, isFocusMode?: boolean, isDark?: boolean }) {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-2 transition-all group/btn ${isDark || isFocusMode ? 'text-slate-400' : 'text-slate-500'} hover:text-brand-blue`}
            title={label}
        >
            <span className={`p-1.5 border rounded-lg group-hover/btn:bg-slate-50 group-hover/btn:border-brand-blue/20 shadow-sm transition-all ${
                isDark || isFocusMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
            }`}>{icon}</span>
        </button>
    );
}

const MessageItem = React.memo(({ 
  msg, isLiteMode, isDark, isFocusMode, isPlus, language, t,
  editingId, editInput, setEditInput, copiedId, sharedId, feedbackId,
  onCopy, onShare, onFeedback, onRegenerate, onEdit, onDelete, onCancelEdit, onSaveEdit,
  onSetMapConfig, onScrollToBottom, isLast
}: any) => {
  const detectLocation = (text: string) => {
    const places = [
      { name: 'Jakarta', lat: -6.2088, lng: 106.8456 },
      { name: 'Surabaya', lat: -7.2575, lng: 112.7521 },
      { name: 'Bandung', lat: -6.9175, lng: 107.6191 }
    ];
    return places.find(p => text.toLowerCase().includes(p.name.toLowerCase()));
  };

  const loc = msg.role === 'assistant' ? detectLocation(msg.content) : null;

  return (
    <motion.div
      initial={isLiteMode ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={isLiteMode ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={isLiteMode ? { duration: 0.1 } : { duration: 0.5 }}
      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[92%] sm:max-w-[85%] md:max-w-[75%] group flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
        {msg.role === 'assistant' && (
          <div className="flex items-center gap-2 mb-2 ml-1">
            <div className={`w-5 h-5 rounded-md flex items-center justify-center text-white shadow-sm border border-white/10 ${isPlus ? 'bg-gradient-to-tr from-brand-blue to-blue-900' : 'bg-gradient-to-br from-[#021B2B] via-[#0E4D54] to-[#14BCB2]'}`}>
              <span className="text-[10px] font-serif italic drop-shadow-sm">{isPlus ? <Sparkles size={10} /> : 'M'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-black uppercase tracking-widest ${isDark || isFocusMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Maria {isPlus ? 'Plus' : ''}
              </span>
              {isPlus && (
                <div className="flex items-center gap-1 px-1 py-0.5 bg-brand-blue/10 border border-brand-blue/20 rounded-md">
                  <span className="text-[6px] font-black text-brand-blue uppercase tracking-widest">Plus</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div 
          className={`px-6 py-4 relative w-full overflow-hidden ${
            isLiteMode ? '' : 'transition-all duration-500'
          } ${
            msg.role === 'user' 
            ? (isDark || isFocusMode ? 'chat-bubble-user bg-brand-blue/90 shadow-2xl shadow-brand-blue/20' : 'chat-bubble-user') 
            : (isDark || isFocusMode ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-[24px] rounded-tl-none' : 'chat-bubble-ai')
          } ${editingId === msg.id ? 'ring-4 ring-brand-blue/10 border-brand-blue' : ''}`}
        >
          {(msg.image || (msg.images && msg.images.length > 0)) && (
            <div className="mb-4 flex flex-wrap gap-2">
              {msg.image && (
                 <div className={`rounded-xl overflow-hidden border border-white/10 shadow-lg max-w-sm ${isLiteMode ? 'shadow-none' : ''}`}>
                   <img 
                     src={msg.image.data ? `data:${msg.image.mimeType};base64,${msg.image.data}` : msg.image.url} 
                     alt="Shared with Maria" 
                     className="w-full h-auto object-cover max-h-[300px]" 
                     loading="lazy"
                   />
                 </div>
              )}
              {msg.images?.map((img: any, idx: number) => (
                <div key={idx} className={`rounded-xl overflow-hidden border border-white/10 shadow-lg max-w-sm ${isLiteMode ? 'shadow-none' : ''}`}>
                   <img 
                     src={img.data ? `data:${img.mimeType};base64,${img.data}` : img.url} 
                     alt={`Shared ${idx + 1}`} 
                     className="w-full h-auto object-cover max-h-[300px]" 
                     loading="lazy"
                   />
                </div>
              ))}
            </div>
          )}
          {editingId === msg.id ? (
            <div className="flex flex-col gap-3">
              <textarea
                value={editInput}
                onChange={(e) => setEditInput(e.target.value)}
                className={`bg-transparent text-[15px] leading-relaxed whitespace-pre-wrap outline-none w-full resize-none min-h-[80px] ${isDark || isFocusMode ? 'text-white' : 'text-slate-700'}`}
                autoFocus
              />
              <div className={`flex justify-end gap-3 pt-3 border-t ${isDark || isFocusMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <button onClick={onCancelEdit} className="px-4 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600">{t.cancel}</button>
                <button onClick={() => onSaveEdit(msg.id)} className="px-4 py-1.5 bg-brand-blue text-white rounded-lg text-xs font-bold shadow-md shadow-brand-blue/20">{t.saveChanges}</button>
              </div>
            </div>
          ) : (
            <div className="markdown-body">
              {msg.role === 'assistant' && !isLiteMode && isLast && (Date.now() - msg.timestamp) < 5000 ? (
                <Typewriter 
                  text={msg.content}
                  speed={10}
                  onUpdate={onScrollToBottom}
                  renderMarkdown={(content) => (
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                      {content}
                    </ReactMarkdown>
                  )}
                />
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {msg.content}
                </ReactMarkdown>
              )}

              {msg.role === 'assistant' && msg.groundingMetadata?.groundingChunks && (
                <div className={`mt-5 pt-4 border-t ${isDark || isFocusMode ? 'border-slate-800' : 'border-slate-50'}`}>
                  <div className="flex items-center gap-2 mb-3">
                     <Globe size={12} className="text-brand-blue" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                       {language === 'en' ? 'Sources' : 'Sumber Informasi'}
                     </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                     {msg.groundingMetadata.groundingChunks.filter((chunk: any) => chunk.web).map((chunk: any, chunkIdx: number) => {
                       const domain = new URL(chunk.web.uri).hostname;
                       return (
                         <a 
                           key={chunkIdx}
                           href={chunk.web.uri}
                           target="_blank"
                           rel="noopener noreferrer"
                           className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all shadow-sm ${
                             isDark || isFocusMode 
                             ? 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white' 
                             : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100 hover:text-brand-blue'
                           } ${isLiteMode ? 'shadow-none' : ''}`}
                         >
                           <img 
                             src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} 
                             alt="" 
                             className="w-3 h-3 rounded-sm"
                             referrerPolicy="no-referrer"
                             loading="lazy"
                           />
                           <span className="max-w-[150px] truncate">{chunk.web.title || domain}</span>
                         </a>
                       );
                     })}
                  </div>
                </div>
              )}
                
              {msg.role === 'assistant' && loc && (
                <div className={`mt-6 pt-5 border-t flex items-center justify-between ${isDark || isFocusMode ? 'border-slate-800' : 'border-slate-50'}`}>
                   <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 bg-brand-blue rounded-full" />
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{language === 'en' ? 'Geo-Intelligence Detected' : 'Geo-Intel Terdeteksi'}</span>
                   </div>
                   <button 
                    onClick={() => onSetMapConfig({ isOpen: true, location: { lat: loc.lat, lng: loc.lng }, title: loc.name })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${isDark || isFocusMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-brand-blue hover:text-white' : 'bg-slate-50 border-slate-100 hover:bg-brand-blue hover:text-white'}`}
                   >
                     <MapPinIcon size={14} /> {t.viewMap}
                   </button>
                </div>
              )}
            </div>
          )}
          </div>
          
          {/* Premium Action Bar */}
          {!editingId && (
            <div className={`mt-3 flex items-center gap-3 px-2 transition-all duration-300 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            } opacity-100 lg:opacity-0 lg:group-hover:opacity-100`}>
              {msg.role === 'assistant' ? (
                <>
                  <ActionButton isDark={isDark} isFocusMode={isFocusMode} onClick={() => onCopy(msg.content, msg.id)} icon={copiedId === msg.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />} label={t.copy} />
                  <ActionButton isDark={isDark} isFocusMode={isFocusMode} onClick={() => onShare(msg.content, msg.id)} icon={sharedId === msg.id ? <Check size={14} className="text-green-500" /> : <Share2 size={14} />} label={t.share} />
                  <div className="flex items-center gap-1">
                    <ActionButton isDark={isDark} isFocusMode={isFocusMode} onClick={() => onFeedback(msg.id)} icon={feedbackId === msg.id ? <Check size={14} className="text-green-500" /> : <ThumbsUp size={14} />} label={t.like} />
                    <ActionButton isDark={isDark} isFocusMode={isFocusMode} onClick={() => onFeedback(msg.id)} icon={<ThumbsDown size={14} />} label={t.dislike} />
                  </div>
                  <ActionButton isDark={isDark} isFocusMode={isFocusMode} onClick={() => onRegenerate(msg.id)} icon={<RotateCcw size={14} />} label={t.regenerate} />
                  <ActionButton isDark={isDark} isFocusMode={isFocusMode} onClick={() => onDelete(msg.id)} icon={<Trash2 size={14} />} label={t.delete || 'Delete'} />
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <ActionButton isDark={isDark} isFocusMode={isFocusMode} onClick={() => onEdit(msg)} icon={<Pencil size={14} />} label={t.edit} />
                  <ActionButton isDark={isDark} isFocusMode={isFocusMode} onClick={() => onCopy(msg.content, msg.id)} icon={copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />} label={t.copy} />
                  <ActionButton isDark={isDark} isFocusMode={isFocusMode} onClick={() => onDelete(msg.id)} icon={<Trash2 size={14} />} label={t.delete || 'Delete'} />
                </div>
              )}
            </div>
          )}
        </div>
    </motion.div>
  );
});
