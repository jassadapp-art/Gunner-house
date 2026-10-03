import React, { useState, useEffect } from 'react';
import type { HouseholdSettings, ActivePage } from '../types';
import {
  Settings,
  PiggyBank,
  Receipt,
  Sun,
  Moon,
  Lock,
  Cloud,
  LayoutDashboard,
  TrendingUp,
  Edit2,
  Check,
  X,
} from 'lucide-react';

interface NavbarProps {
  settings: HouseholdSettings;
  activePage: ActivePage;
  onSelectPage: (page: ActivePage) => void;
  onOpenAddModal: () => void;
  onOpenSettingsModal: () => void;
  onToggleTheme: () => void;
  onLockScreen?: () => void;
  cloudStatus?: 'connected' | 'syncing' | 'offline' | 'error';
  onOpenCloudModal?: () => void;
  onUpdateHouseholdTitle?: (name: string, subtitle?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  activePage,
  onSelectPage,
  onOpenSettingsModal,
  onToggleTheme,
  onLockScreen,
  cloudStatus = 'offline',
  onOpenCloudModal,
  onUpdateHouseholdTitle,
}) => {
  const isLight = (settings.theme ?? 'light') === 'light';

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(settings.householdName);
  const [tempSubtitle, setTempSubtitle] = useState(
    settings.householdSubtitle || 'ระบบบริหารการเงินครัวเรือน 4 หน้า (Dashboard, บัญชีรายเดือน, เงินออม, ลงทุน&ภาษี)'
  );

  useEffect(() => {
    setTempTitle(settings.householdName);
    setTempSubtitle(
      settings.householdSubtitle || 'ระบบบริหารการเงินครัวเรือน 4 หน้า (Dashboard, บัญชีรายเดือน, เงินออม, ลงทุน&ภาษี)'
    );
  }, [settings.householdName, settings.householdSubtitle]);

  const handleSaveTitle = () => {
    if (onUpdateHouseholdTitle) {
      onUpdateHouseholdTitle(tempTitle.trim() || settings.householdName, tempSubtitle.trim());
    }
    setIsEditingTitle(false);
  };

  const navItems: { id: ActivePage; label: string; number: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      number: '1',
      label: 'แดชบอร์ดสรุป',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'monthly_ledger',
      number: '2',
      label: 'รายละเอียดรายเดือน',
      icon: <Receipt className="w-4 h-4" />,
    },
    {
      id: 'savings',
      number: '3',
      label: 'เงินออม',
      icon: <PiggyBank className="w-4 h-4" />,
    },
    {
      id: 'investment_tax',
      number: '4',
      label: 'แผนลงทุนและภาษี',
      icon: <TrendingUp className="w-4 h-4" />,
    },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 transition-colors shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Logo & Household Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center shadow-md shadow-emerald-600/20 ring-1 ring-emerald-300/40 flex-shrink-0">
                <PiggyBank className="w-6 h-6 text-white" />
              </div>
              <div>
                {isEditingTitle ? (
                  <div className="flex flex-col gap-1.5 p-2 bg-white dark:bg-slate-900 border border-emerald-500 rounded-2xl shadow-lg">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={tempTitle}
                        onChange={e => setTempTitle(e.target.value)}
                        placeholder="ชื่อบ้าน..."
                        className="px-2 py-0.5 text-xs sm:text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 min-w-[180px]"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveTitle();
                          if (e.key === 'Escape') setIsEditingTitle(false);
                        }}
                      />
                      <button
                        onClick={handleSaveTitle}
                        className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer transition shadow-2xs"
                        title="บันทึก"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setIsEditingTitle(false)}
                        className="p-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 cursor-pointer transition"
                        title="ยกเลิก"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={tempSubtitle}
                      onChange={e => setTempSubtitle(e.target.value)}
                      placeholder="คำอธิบาย..."
                      className="px-2 py-0.5 text-[10px] rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500"
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveTitle();
                        if (e.key === 'Escape') setIsEditingTitle(false);
                      }}
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingTitle(true)}
                    className="group cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/60 rounded-xl p-1 -m-1 transition"
                    title="คลิกเพื่อแก้ไขชื่อบ้านหรือคำอธิบาย"
                  >
                    <div className="flex items-center gap-1.5">
                      <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-xs">
                        {settings.householdName}
                      </h1>
                      <Edit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                      {settings.householdSubtitle || 'ระบบบริหารการเงินครัวเรือน 4 หน้า (Dashboard, บัญชีรายเดือน, เงินออม, ลงทุน&ภาษี)'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions & Utilities */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Theme Toggle Button */}
              <button
                onClick={onToggleTheme}
                title={isLight ? 'สลับเป็นโหมดมืด' : 'สลับเป็นโทนเขียวอ่อนสบายตา'}
                className="p-2 sm:px-2.5 sm:py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 rounded-xl transition flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-slate-700 shadow-2xs"
              >
                {isLight ? (
                  <>
                    <Sun className="w-4 h-4 text-emerald-600" />
                    <span className="hidden xl:inline text-emerald-800 font-semibold">เขียวอ่อนสบายตา</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span className="hidden xl:inline text-slate-300">โหมดมืด</span>
                  </>
                )}
              </button>

              {/* Cloud Sync Status Badge Button */}
              <button
                onClick={onOpenCloudModal || onOpenSettingsModal}
                title={
                  cloudStatus === 'connected'
                    ? '🟢 Cloud ซิงค์สดเชื่อมต่อแล้ว (คลิกเพื่อดูการตั้งค่า)'
                    : cloudStatus === 'syncing'
                    ? '🟡 กำลังรับส่งข้อมูลกับ Cloud...'
                    : cloudStatus === 'error'
                    ? '🔴 การเชื่อมต่อ Cloud ขัดข้อง (คลิกเพื่อตรวจสอบ)'
                    : '⚪ ตั้งค่าเชื่อมต่อฐานข้อมูล Cloud'
                }
                className={`p-2 sm:px-2.5 sm:py-2 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 shadow-2xs ${
                  cloudStatus === 'connected'
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-100'
                    : cloudStatus === 'syncing'
                    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
                    : cloudStatus === 'error'
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                }`}
              >
                <Cloud className={`w-4 h-4 ${cloudStatus === 'syncing' ? 'animate-bounce text-amber-500' : ''}`} />
                <span className="hidden sm:inline">
                  {cloudStatus === 'connected'
                    ? 'Realtime สด'
                    : cloudStatus === 'syncing'
                    ? 'กำลังซิงค์'
                    : cloudStatus === 'error'
                    ? 'Cloud Error'
                    : 'ซิงค์มือถือ'}
                </span>
                <span className={`w-2 h-2 rounded-full ${
                  cloudStatus === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : cloudStatus === 'syncing'
                    ? 'bg-amber-500 animate-spin'
                    : cloudStatus === 'error'
                    ? 'bg-rose-500'
                    : 'bg-slate-400'
                }`}></span>
              </button>

              {/* Settings Button */}
              <button
                onClick={onOpenSettingsModal}
                title="ตั้งค่าสมาชิกและระบบ"
                className="p-2 sm:px-2.5 sm:py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
              >
                <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="hidden md:inline">ตั้งค่า</span>
              </button>

              {/* Lock Button */}
              {settings.isPasswordProtected !== false && onLockScreen && (
                <button
                  onClick={onLockScreen}
                  title="ล็อกหน้าจอทันที (Lock Screen)"
                  className="p-2 sm:px-2.5 sm:py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 border border-amber-200 dark:border-amber-500/30 rounded-xl transition flex items-center gap-1 shadow-2xs"
                >
                  <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </button>
              )}


            </div>

          </div>
        </div>

        {/* 4 Main Page Navigation Tabs Bar (Desktop & Tablet) */}
        <div className="bg-slate-50/95 dark:bg-[#0E1422]/95 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center justify-start sm:justify-center gap-1.5 sm:gap-3 py-2 overflow-x-auto no-scrollbar">
              {navItems.map(item => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectPage(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 scale-[1.02]'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {item.number}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {item.icon}
                      <span>{item.label}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 py-1.5 px-2 shadow-2xl flex items-center justify-around">
        {navItems.map(item => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-emerald-50 dark:bg-emerald-500/20' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[10px] mt-0.5 whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
