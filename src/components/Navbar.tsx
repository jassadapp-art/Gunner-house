import React from 'react';
import type { HouseholdSettings } from '../types';
import { PlusCircle, Settings, Target, PiggyBank, RefreshCw, Receipt, Sun, Moon, Lock } from 'lucide-react';

interface NavbarProps {
  settings: HouseholdSettings;
  onOpenAddModal: () => void;
  onOpenGoalModal: () => void;
  onOpenExpenseModal: () => void;
  onOpenSettingsModal: () => void;
  onResetData: () => void;
  onToggleTheme: () => void;
  onLockScreen?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  onOpenAddModal,
  onOpenGoalModal,
  onOpenExpenseModal,
  onOpenSettingsModal,
  onResetData,
  onToggleTheme,
  onLockScreen,
}) => {
  const memberA = settings.members.person_a;
  const memberB = settings.members.person_b;
  const isLight = (settings.theme ?? 'light') === 'light';

  return (
    <header className="sticky top-0 z-40 bg-white/85 dark:bg-[#0B0F19]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Household Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center shadow-md shadow-emerald-600/20 ring-1 ring-emerald-300/40">
              <PiggyBank className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  {settings.householdName}
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-500/30">
                  Shared Pool (2 Users)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                ระบบติดตามและบริหารกองกลางครัวเรือนเพื่อเป้าหมายร่วมกัน
              </p>
            </div>
          </div>

          {/* Member Indicators & Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* 2 Members Pills */}
            <div className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-1 gap-1.5">
              {/* Member A */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 text-xs text-slate-800 dark:text-slate-200 shadow-xs">
                <span className="text-sm">{memberA.avatar}</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">{memberA.nickname}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>

              <span className="text-xs font-bold text-slate-400">&</span>

              {/* Member B */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-indigo-500/10 border border-indigo-300 dark:border-indigo-500/20 text-xs text-slate-800 dark:text-slate-200 shadow-xs">
                <span className="text-sm">{memberB.avatar}</span>
                <span className="font-semibold text-indigo-700 dark:text-indigo-400">{memberB.nickname}</span>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              </div>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              title={isLight ? 'สลับเป็นโหมดมืด' : 'สลับเป็นโทนเขียวอ่อนสบายตา'}
              className="p-2 sm:px-2.5 sm:py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 rounded-xl transition flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-slate-700 shadow-xs"
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

            {/* Reset / Demo data button */}
            <button
              onClick={onResetData}
              title="รีเซ็ตข้อมูลตัวอย่าง 6 เดือน"
              className="p-2 sm:px-2.5 sm:py-2 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition border border-transparent hover:border-slate-300 dark:hover:border-slate-700 flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden 2xl:inline">รีเซ็ต</span>
            </button>

            {/* Expense Modal Button */}
            <button
              onClick={onOpenExpenseModal}
              className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              title="จัดการค่าใช้จ่ายประจำ"
            >
              <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">ค่าใช้จ่าย</span>
            </button>

            {/* Goal Modal Button */}
            <button
              onClick={onOpenGoalModal}
              className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            >
              <Target className="w-4 h-4 text-teal-600 dark:text-cyan-400" />
              <span className="hidden sm:inline">เพิ่มเป้าหมาย</span>
            </button>

            {/* Settings Modal Button */}
            <button
              onClick={onOpenSettingsModal}
              title="ตั้งค่าสมาชิกและระบบ"
              className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            >
              <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">ตั้งค่า</span>
            </button>

            {/* Lock Screen Button */}
            {settings.isPasswordProtected !== false && onLockScreen && (
              <button
                onClick={onLockScreen}
                title="ล็อกหน้าจอทันที (Lock Screen)"
                className="p-2 sm:px-2.5 sm:py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              >
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="hidden xl:inline">ล็อก</span>
              </button>
            )}

            {/* Primary Action: Add Transaction */}
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ring-1 ring-white/30"
            >
              <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              <span>บันทึกเงินออม</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
