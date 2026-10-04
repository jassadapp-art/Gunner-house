import React from 'react';
import type { HouseholdSettings, ActivePage } from '../types';
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  TrendingUp,
  PlusCircle,
  Users,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface SidebarProps {
  settings: HouseholdSettings;
  activePage: ActivePage;
  onSelectPage: (page: ActivePage) => void;
  onOpenAddModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  settings,
  activePage,
  onSelectPage,
  onOpenAddModal,
}) => {
  const navItems: { id: ActivePage; label: string; number: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'dashboard',
      number: '1',
      label: 'แดชบอร์ด',
      icon: <LayoutDashboard className="w-5 h-5" />,
      desc: 'ภาพรวมรายรับ รายจ่าย',
    },
    {
      id: 'monthly_ledger',
      number: '2',
      label: 'รายรับรายจ่าย',
      icon: <Receipt className="w-5 h-5" />,
      desc: 'ตารางบันทึกประจำเดือน',
    },
    {
      id: 'savings',
      number: '3',
      label: 'เงินออม',
      icon: <PiggyBank className="w-5 h-5" />,
      desc: 'เป้าหมายและเงินเก็บ',
    },
    {
      id: 'investment_tax',
      number: '4',
      label: 'ลงทุน & ภาษี',
      icon: <TrendingUp className="w-5 h-5" />,
      desc: 'พอร์ตลงทุนและภาษี',
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 border-r border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0E1422]/80 backdrop-blur-xl p-4 sm:p-5 sticky top-16 sm:top-20 h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] overflow-y-auto justify-between shadow-2xs">
      
      <div className="space-y-5">
        
        {/* Navigation Section Title */}
        <div className="flex items-center justify-between px-2 pt-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            เมนูหลัก
          </span>
        </div>

        {/* 4 Vertical Navigation Tabs (Request 3: เรียงจากบนลงล่าง ด้านซ้ายของจอ) */}
        <nav className="flex flex-col gap-2">
          {navItems.map(item => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`group flex items-start gap-3 p-3 rounded-2xl text-left transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                }`}
              >
                {/* Number Badge */}
                <span
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-transform ${
                    isActive
                      ? 'bg-white/20 text-white shadow-2xs'
                      : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:scale-105'
                  }`}
                >
                  {item.number}
                </span>

                {/* Icon & Label */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={isActive ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}>
                      {item.icon}
                    </span>
                    <span className="text-sm font-bold truncate">
                      {item.label}
                    </span>
                  </div>
                  <div className={`text-[11px] mt-0.5 truncate ${
                    isActive ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Quick Add Button */}
        <div className="pt-2">
          <button
            onClick={onOpenAddModal}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 hover:shadow-lg transition-all active:scale-98"
          >
            <PlusCircle className="w-4 h-4" />
            <span>บันทึกรายการใหม่</span>
          </button>
        </div>

      </div>

      {/* Bottom Household Info Card */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
        <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2 mb-2 text-slate-700 dark:text-slate-300 font-bold text-xs">
            <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>สมาชิกในบ้าน</span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                {settings.members.person_a.avatar} {settings.members.person_a.name}
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(settings.members.person_a.monthlyIncome || 40250, false)} ฿
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                {settings.members.person_b.avatar} {settings.members.person_b.name}
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(settings.members.person_b.monthlyIncome || 22850.90, false)} ฿
              </span>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-center text-slate-400 dark:text-slate-500">
          Gunner House • v12 Verified
        </div>
      </div>

    </aside>
  );
};
