import React, { useState } from 'react';
import { Lock, Eye, EyeOff, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';

interface LockScreenProps {
  correctPassword?: string;
  onUnlock: () => void;
  householdName?: string;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  correctPassword = '1234',
  onUnlock,
  householdName = 'บ้านของเรา 🏡 (Our Nest)',
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (password === correctPassword) {
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const handleKeypadPress = (num: string) => {
    setError(false);
    if (password.length < 12) {
      const next = password + num;
      setPassword(next);
      if (next === correctPassword) {
        setTimeout(() => onUnlock(), 150);
      }
    }
  };

  const handleBackspace = () => {
    setError(false);
    setPassword(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError(false);
    setPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-[#E6EFEA] via-[#F0F5F2] to-[#DDEAE1] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors">
      <div
        className={`w-full max-w-sm bg-white/95 dark:bg-slate-900/90 border border-emerald-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-md transition-all ${
          shake ? 'animate-bounce' : ''
        }`}
      >
        {/* Top Icon & Household Info */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30 mb-3">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            {householdName}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ระบบติดตามเงินออมและบัญชีกองกลาง 2 คน
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                placeholder="กรอกรหัสผ่าน / PIN"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                className={`w-full bg-slate-50 dark:bg-slate-950/80 border ${
                  error
                    ? 'border-rose-500 ring-1 ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                } text-center font-mono text-xl tracking-widest text-slate-900 dark:text-white font-bold rounded-2xl px-10 py-3 focus:outline-none transition`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center justify-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-medium mt-2 animate-in fade-in duration-150">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง</span>
              </div>
            )}
          </div>

          {/* Quick PIN Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1 select-none">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                className="h-11 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-emerald-100/70 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-lg transition active:scale-95 shadow-2xs"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-11 rounded-xl bg-slate-100/50 dark:bg-slate-800/40 hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium text-xs transition active:scale-95"
            >
              ล้างค่า
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="h-11 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-emerald-100/70 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-lg transition active:scale-95 shadow-2xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-11 rounded-xl bg-slate-100/50 dark:bg-slate-800/40 hover:bg-rose-100/50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-xs transition active:scale-95"
            >
              ⌫
            </button>
          </div>

          {/* Unlock Submit Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition active:scale-98 flex items-center justify-center gap-2 mt-2"
          >
            <span>ปลดล็อกเข้าสู่ระบบ</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Security & Default Hint Note */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold">
            <KeyRound className="w-3 h-3 text-emerald-600" />
            <span>รหัสผ่านเริ่มต้น: <code className="bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded font-mono font-bold">1234</code></span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            สามารถแก้ไขหรือเปิด/ปิดรหัสผ่านได้ในเมนูการตั้งค่า ⚙️
          </p>
        </div>

      </div>
    </div>
  );
};
