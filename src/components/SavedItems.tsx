import { Message } from '../types';
import { X, Trash2, Copy, ExternalLink, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { copyToClipboard } from '../lib/clipboard';

interface SavedItemsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SavedItems({ isOpen, onClose }: SavedItemsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedItems, setSavedItems] = useState<Message[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    let unsub = () => {};
    const setupListener = async () => {
      const { auth } = await import('../lib/firebase');
      if (auth?.currentUser) {
        const { doc, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        if (db) {
          unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
            if (snap.exists()) {
              setSavedItems(snap.data().savedInfo || []);
            }
          });
        }
      }
    };
    setupListener();
    return () => unsub();
  }, [isOpen]);

  const removeSaved = async (id: string) => {
    const { auth } = await import('../lib/firebase');
    if (auth?.currentUser) {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      if (db) {
        const updated = savedItems.filter(m => m.id !== id);
        await updateDoc(doc(db, 'users', auth.currentUser.uid), { savedInfo: updated });
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-slate-200 shadow-2xl z-[101] flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Informasi Tersimpan</h3>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-0.5">Arsip Laporan Maria</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/50">
              {savedItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                   <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4 border border-slate-200 border-dashed">
                      <Trash2 size={24} />
                   </div>
                   <p className="text-sm font-medium text-slate-400 italic font-sans uppercase text-[10px] tracking-widest">Belum ada informasi tersimpan.</p>
                </div>
              ) : (
                savedItems.map((item) => (
                  <div key={item.id} className="p-5 bg-white rounded-2xl border border-slate-200/60 shadow-sm group relative hover:border-blue-200 transition-all">
                    <div className="flex justify-between items-start mb-3">
                       <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-lg">Report</span>
                       <div className="flex items-center gap-1">
                         <button 
                          onClick={async () => {
                            const success = await copyToClipboard(item.content);
                            if (success) {
                              setCopiedId(item.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }
                          }}
                          className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                         >
                           {copiedId === item.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                         </button>
                         <button 
                          onClick={() => {
                            removeSaved(item.id);
                          }}
                          className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                         >
                           <Trash2 size={16} />
                         </button>
                       </div>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">{item.content}</p>
                    <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Maria AI Services</span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {new Date(item.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-white">
               <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                  <ExternalLink size={16} /> Ekspor Data
               </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
