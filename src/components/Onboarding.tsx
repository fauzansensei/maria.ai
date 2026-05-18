import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ChevronRight, User as UserIcon, Calendar, CheckCircle2 } from 'lucide-react';
import { User } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface OnboardingProps {
  user: User;
  onComplete: (username: string) => void;
  isDark: boolean;
}

export default function Onboarding({ user, onComplete, isDark }: OnboardingProps) {
  const [step, setStep] = useState<'username' | 'birthday' | 'done'>('username');
  const [username, setUsername] = useState(user.displayName || '');
  const [birthday, setBirthday] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    if (step === 'username') {
      if (username.trim().length < 3) return;
      setStep('birthday');
    } else if (step === 'birthday') {
      if (!birthday) return;
      setIsLoading(true);
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          name: username.trim(),
          birthday: birthday,
          onboardingCompleted: true
        });
        setStep('done');
        setTimeout(() => {
          onComplete(username.trim());
        }, 1500);
      } catch (error) {
        console.error("Onboarding Error:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const containerClasses = `max-w-md w-full p-8 rounded-[40px] border shadow-2xl ${
    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
  }`;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
      <AnimatePresence mode="wait">
        {step === 'username' && (
          <motion.div 
            key="username"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={containerClasses}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-brand-blue/10 text-brand-blue rounded-3xl flex items-center justify-center mb-6">
                <UserIcon size={32} />
              </div>
              <h2 className="text-2xl font-black tracking-tight mb-2">Halo! Nama kamu siapa?</h2>
              <p className={`text-sm font-medium mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Maria ingin mengenal kamu lebih dekat. Masukkan username yang kamu inginkan.
              </p>
              
              <div className="w-full relative group mb-8">
                <input 
                  autoFocus
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username kamu..."
                  className={`w-full px-6 py-4 rounded-2xl border text-base font-bold outline-none transition-all ${
                    isDark 
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-brand-blue' 
                    : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-brand-blue'
                  }`}
                />
              </div>

              <button 
                disabled={username.trim().length < 3}
                onClick={handleNext}
                className="w-full py-4 bg-brand-blue text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-brand-blue/20"
              >
                Lanjutkan <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 'birthday' && (
          <motion.div 
            key="birthday"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={containerClasses}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-brand-blue/10 text-brand-blue rounded-3xl flex items-center justify-center mb-6">
                <Calendar size={32} />
              </div>
              <h2 className="text-2xl font-black tracking-tight mb-2">Sejak kapan kamu di bumi?</h2>
              <p className={`text-sm font-medium mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Masukkan tanggal lahir kamu biar Maria bisa kasih kejutan spesial!
              </p>
              
              <div className="w-full relative group mb-8">
                <input 
                  autoFocus
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className={`w-full px-6 py-4 rounded-2xl border text-base font-bold outline-none transition-all ${
                    isDark 
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-brand-blue' 
                    : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-brand-blue'
                  }`}
                />
              </div>

              <button 
                disabled={!birthday || isLoading}
                onClick={handleNext}
                className="w-full py-4 bg-brand-blue text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-brand-blue/20"
              >
                {isLoading ? 'Menyimpan...' : 'Lanjutkan'} <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div 
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={containerClasses}
          >
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-2xl font-black tracking-tight mb-2">Selesai!</h2>
              <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Terima kasih, {username}! Selamat datang di dunia Maria.
              </p>
              <div className="mt-8 flex items-center gap-2 text-brand-blue animate-pulse">
                <Sparkles size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Menyiapkan Dashboard...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
