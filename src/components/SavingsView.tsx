import React, { useMemo, useState } from 'react';
import type { ContributorId, HouseholdFundType, HouseholdSettings, SavingsGoal, Transaction } from '../types';
import { formatCurrency, formatPassbookDate, formatPercent } from '../utils/formatters';
import { QuickAddBar } from './QuickAddBar';
import {
  PiggyBank,
  Target,
  PlusCircle,
  ArrowUpRight,
  Edit2,
  Trash2,
  CheckCircle2,
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowUpDown,
  BookOpen,
} from 'lucide-react';

interface SavingsViewProps {
  settings: HouseholdSettings;
  goals: SavingsGoal[];
  transactions: Transaction[];
  onQuickAdd: (contributorId: ContributorId, amount: number, note: string, targetFund: HouseholdFundType) => void;
  onQuickWithdraw?: (contributorId: ContributorId, amount: number, note: string, targetFund: HouseholdFundType) => void;
  onOpenCustomAdd: (contributorId?: ContributorId, fund?: HouseholdFundType, type?: 'deposit' | 'withdrawal') => void;
  onUpdatePresets?: (presets: number[]) => void;
  onOpenGoalModal: (goal?: SavingsGoal | null) => void;
  onDeleteGoal: (goalId: string) => void;
  onOpenDepositForGoal: (goalId: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

interface PassbookRow {
  index: number;
  tx: Transaction;
  dateStr: string;
  depositAmount: number | null;
  withdrawalAmount: number | null;
  runningBalance: number;
  description: string;
  contributorId: ContributorId;
  contributorName: string;
}

export const SavingsView: React.FC<SavingsViewProps> = ({
  settings,
  goals,
  transactions,
  onQuickAdd,
  onQuickWithdraw,
  onOpenCustomAdd,
  onUpdatePresets,
  onOpenGoalModal,
  onDeleteGoal,
  onOpenDepositForGoal,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [goalFilter, setGoalFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'chronological' | 'latest'>('chronological');
  const [activeTab, setActiveTab] = useState<'passbook' | 'goals'>('passbook');

  // 1. Calculate Fund Balances
  const operatingBalance = useMemo(() => {
    return transactions.reduce((acc, t) => {
      const fund = t.targetFund || 'operating';
      if (fund === 'operating') {
        return acc + (t.type === 'withdrawal' ? -t.amount : t.amount);
      }
      return acc;
    }, 0);
  }, [transactions]);

  const longTermBalance = useMemo(() => {
    return transactions.reduce((acc, t) => {
      const fund = t.targetFund || 'operating';
      if (fund === 'long_term') {
        return acc + (t.type === 'withdrawal' ? -t.amount : t.amount);
      }
      return acc;
    }, 0);
  }, [transactions]);

  const totalPoolSavings = useMemo(() => {
    return transactions.reduce((acc, t) => {
      return acc + (t.type === 'withdrawal' ? -t.amount : t.amount);
    }, 0);
  }, [transactions]);

  // Member contributions
  const memberAContrib = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.contributorId === 'person_a') {
        return acc + (t.type === 'withdrawal' ? -t.amount : t.amount);
      }
      return acc;
    }, 0);
  }, [transactions]);

  const memberBContrib = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.contributorId === 'person_b') {
        return acc + (t.type === 'withdrawal' ? -t.amount : t.amount);
      }
      return acc;
    }, 0);
  }, [transactions]);

  // 2. Build Running Balance Passbook Rows matching Image 2
  // We sort chronologically from oldest to newest to compute the cumulative running balance
  const allPassbookRows = useMemo<PassbookRow[]>(() => {
    const sorted = [...transactions].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const rows: PassbookRow[] = [];
    let currentBalance = 0;
    for (let idx = 0; idx < sorted.length; idx++) {
      const t = sorted[idx];
      const isWithdrawal = t.type === 'withdrawal';
      const delta = isWithdrawal ? -t.amount : t.amount;
      currentBalance += delta;

      const desc =
        t.withdrawalReason ||
        t.note ||
        t.category ||
        (isWithdrawal ? 'ถอนเงิน' : 'ฝากเงิน');

      const contributorName =
        t.contributorId === 'person_a'
          ? settings.members.person_a.nickname
          : t.contributorId === 'person_b'
          ? settings.members.person_b.nickname
          : 'กองกลาง';

      rows.push({
        index: idx + 1,
        tx: t,
        dateStr: formatPassbookDate(t.date),
        depositAmount: !isWithdrawal ? t.amount : null,
        withdrawalAmount: isWithdrawal ? t.amount : null,
        runningBalance: currentBalance,
        description: desc,
        contributorId: t.contributorId,
        contributorName,
      });
    }
    return rows;
  }, [transactions, settings.members]);

  // Filter and sort for display
  const displayRows = useMemo(() => {
    let rows = allPassbookRows;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter(
        r =>
          r.description.toLowerCase().includes(q) ||
          r.dateStr.toLowerCase().includes(q) ||
          r.contributorName.toLowerCase().includes(q)
      );
    }

    if (sortOrder === 'latest') {
      return [...rows].reverse();
    }
    return rows;
  }, [allPassbookRows, searchTerm, sortOrder]);

  // Total summary of deposits & withdrawals
  const totalDeposits = useMemo(() => {
    return allPassbookRows.reduce((acc, r) => acc + (r.depositAmount || 0), 0);
  }, [allPassbookRows]);

  const totalWithdrawals = useMemo(() => {
    return allPassbookRows.reduce((acc, r) => acc + (r.withdrawalAmount || 0), 0);
  }, [allPassbookRows]);

  // Overall Goal Progress
  const totalGoalTarget = useMemo(() => goals.reduce((acc, g) => acc + g.targetAmount, 0), [goals]);
  const totalGoalCurrent = useMemo(() => goals.reduce((acc, g) => acc + g.currentAmount, 0), [goals]);
  const overallGoalProgress = totalGoalTarget > 0 ? (totalGoalCurrent / totalGoalTarget) * 100 : 0;

  // Filtered Goals
  const filteredGoals = useMemo(() => {
    if (goalFilter === 'all') return goals;
    return goals.filter(g => g.category === goalFilter);
  }, [goals, goalFilter]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    goals.forEach(g => set.add(g.category));
    return Array.from(set);
  }, [goals]);

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-600/15 via-teal-500/10 to-transparent border border-emerald-500/20 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
              หน้า 3
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              ตารางสมุดเงินออมสะสม & เป้าหมายครอบครัว
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
            บันทึกรายการฝาก-ถอน บัญชีเงินออมสะสม (คงเหลือสุทธิ) พร้อมเช็คยอดกองทุนและเป้าหมาย
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => onOpenCustomAdd(undefined, 'operating', 'deposit')}
            className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>+ ฝากเงินออม</span>
          </button>

          <button
            onClick={() => onOpenCustomAdd(undefined, 'operating', 'withdrawal')}
            className="px-3.5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-600/20 transition flex items-center gap-1.5"
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>- ถอนเงิน</span>
          </button>

          <button
            onClick={() => onOpenGoalModal(null)}
            className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-emerald-500" />
            <span>เป้าหมายใหม่</span>
          </button>
        </div>
      </div>

      {/* 3 Fund Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        
        {/* Card 1: Operating Fund */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/20 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <span>💳</span>
              <span>กองหมุนเวียน (Operating)</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
              ค่าเริ่มต้นหยอดเงิน
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {formatCurrency(operatingBalance)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            ใช้จ่ายหมุนเวียนในชีวิตประจำวัน บิลค่าไฟ ค่าน้ำ และค่าบัตรเครดิต
          </p>
        </div>

        {/* Card 2: Long-term Fund */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/20 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
              <span>🏛️</span>
              <span>กองระยะยาว (Long-Term)</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300">
              เพื่ออนาคต
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {formatCurrency(longTermBalance)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            เงินสะสมระยะยาวเพื่อความมั่นคง กองทุนลงทุน และเป้าหมายใหญ่
          </p>
        </div>

        {/* Card 3: Total Household Pool Savings */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-100 mb-2">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <span>🛡️</span>
              <span>ยอดเงินออมสะสมรวมทั้งหมด</span>
            </span>
            <PiggyBank className="w-5 h-5 text-white/80" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {formatCurrency(totalPoolSavings)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-emerald-100/90 mt-2 pt-2 border-t border-white/20">
            <span>เจ: {formatCurrency(memberAContrib, false)}</span>
            <span>•</span>
            <span>เมย์: {formatCurrency(memberBContrib, false)}</span>
          </div>
        </div>

      </div>

      {/* Quick Add Bar (หยอดเงินด่วน) */}
      <QuickAddBar
        settings={settings}
        onQuickAdd={onQuickAdd}
        onQuickWithdraw={onQuickWithdraw}
        onOpenCustomAdd={onOpenCustomAdd}
        onUpdatePresets={onUpdatePresets}
      />

      {/* View Toggle Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('passbook')}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === 'passbook'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>1. ตารางสมุดเงินออมสะสม (ตามรูปที่ 2)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {allPassbookRows.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('goals')}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === 'goals'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>2. เป้าหมายเงินออมครอบครัว ({goals.length})</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400 hidden sm:inline">
          {activeTab === 'passbook'
            ? 'คอลัมน์: วันที่ | ฝาก | ถอน | คงเหลือสะสม | รายละเอียด'
            : `ความคืบหน้ารวม ${overallGoalProgress.toFixed(1)}%`}
        </span>
      </div>

      {/* TAB 1: PASSBOOK LEDGER TABLE (MATCHING IMAGE 2) */}
      {activeTab === 'passbook' && (
        <div className="space-y-4">
          
          {/* Controls: Search & Sort */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="ค้นหารายการ เช่น ซื้อวัว, กองทุน, วันที่..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
              <button
                onClick={() =>
                  setSortOrder(prev => (prev === 'chronological' ? 'latest' : 'chronological'))
                }
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition flex items-center gap-1.5"
                title="สลับลำดับการแสดงผล"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  {sortOrder === 'chronological'
                    ? 'เรียงตามสมุดบัญชี (เก่า ➔ ใหม่)'
                    : 'เรียงล่าสุดก่อน (ใหม่ ➔ เก่า)'}
                </span>
              </button>

              <button
                onClick={() => onOpenCustomAdd(undefined, 'operating', 'deposit')}
                className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 font-bold hover:bg-emerald-100 transition flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>เพิ่มรายการ</span>
              </button>
            </div>
          </div>

          {/* EXACT SPREADSHEET / PASSBOOK TABLE (Matching Image 2) */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                
                {/* Table Header */}
                <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm border-b-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-center font-bold">
                  <tr>
                    <th className="py-3 px-3 w-14 border-r border-slate-200 dark:border-slate-700">
                      ลำดับ
                    </th>
                    <th className="py-3 px-4 w-32 border-r border-slate-200 dark:border-slate-700">
                      วันที่
                    </th>
                    <th className="py-3 px-4 w-36 border-r border-slate-200 dark:border-slate-700 text-right">
                      ฝาก
                    </th>
                    <th className="py-3 px-4 w-36 border-r border-slate-200 dark:border-slate-700 text-right">
                      ถอน
                    </th>
                    {/* Running Balance Column with exact pastel green header matching Image 2 */}
                    <th className="py-3 px-4 w-40 bg-[#a8d5a2] dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100 border-x-2 border-[#8fc288] dark:border-emerald-700 text-right font-black">
                      คงเหลือ
                    </th>
                    <th className="py-3 px-6 border-r border-slate-200 dark:border-slate-700 text-left">
                      รายละเอียด
                    </th>
                    <th className="py-3 px-3 w-24 border-r border-slate-200 dark:border-slate-700">
                      ผู้ทำรายการ
                    </th>
                    <th className="py-3 px-3 w-20 text-center">
                      จัดการ
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-medium">
                  {displayRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        ไม่พบรายการเงินออมที่ตรงกับการค้นหา
                      </td>
                    </tr>
                  ) : (
                    displayRows.map(row => {
                      const isDeposit = row.depositAmount !== null;
                      const isWithdrawal = row.withdrawalAmount !== null;

                      return (
                        <tr
                          key={row.tx.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          {/* 1. ลำดับ */}
                          <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                            {row.index}
                          </td>

                          {/* 2. วันที่ (31 พ.ค. 2022) */}
                          <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                            {row.dateStr}
                          </td>

                          {/* 3. ฝาก (Deposit) */}
                          <td className="py-3 px-4 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                            {isDeposit ? (
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(row.depositAmount || 0)}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">-</span>
                            )}
                          </td>

                          {/* 4. ถอน (Withdrawal) */}
                          <td className="py-3 px-4 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                            {isWithdrawal ? (
                              <span className="font-extrabold text-rose-600 dark:text-rose-400">
                                -{formatCurrency(row.withdrawalAmount || 0)}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">-</span>
                            )}
                          </td>

                          {/* 5. คงเหลือ (Signature Pastel Green Column matching Image 2) */}
                          <td className="py-3 px-4 text-right font-black bg-[#a8d5a2]/60 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-100 border-x-2 border-[#8fc288]/70 dark:border-emerald-700/60 whitespace-nowrap text-[13px]">
                            {formatCurrency(row.runningBalance)}
                          </td>

                          {/* 6. รายละเอียด (เช่น ซื้อวัว, กองทุน) */}
                          <td className="py-3 px-6 text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">
                                {row.description}
                              </span>
                              {row.tx.targetFund === 'long_term' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 font-normal">
                                  🏛️ ระยะยาว
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 7. ผู้ทำรายการ */}
                          <td className="py-3 px-3 text-center border-r border-slate-100 dark:border-slate-800">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                row.contributorId === 'person_a'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'
                                  : row.contributorId === 'person_b'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20'
                                  : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/20'
                              }`}
                            >
                              {row.contributorName}
                            </span>
                          </td>

                          {/* 8. จัดการ */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => onEditTransaction(row.tx)}
                                className="p-1 text-slate-400 hover:text-indigo-600 transition"
                                title="แก้ไขรายการ"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteTransaction(row.tx.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition"
                                title="ลบรายการ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Table Footer with Total Running Summary */}
                <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-xs">
                  <tr>
                    <td colSpan={2} className="py-3 px-4 text-center text-slate-700 dark:text-slate-300">
                      รวมทั้งหมด ({allPassbookRows.length} รายการ)
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-black">
                      +{formatCurrency(totalDeposits)}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400 font-black">
                      -{formatCurrency(totalWithdrawals)}
                    </td>
                    <td className="py-3 px-4 text-right bg-[#a8d5a2] dark:bg-emerald-900/80 text-emerald-950 dark:text-emerald-100 border-x-2 border-[#8fc288] dark:border-emerald-700 font-black text-sm">
                      {formatCurrency(totalPoolSavings)}
                    </td>
                    <td colSpan={3} className="py-3 px-6 text-slate-500 text-[11px]">
                      ยอดคงเหลือสะสมสุทธิในกองกลาง
                    </td>
                  </tr>
                </tfoot>

              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: GOALS & MILESTONES SECTION */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>เป้าหมายเงินออมครอบครัว (Family Savings Goals)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ความคืบหน้ารวม {formatPercent(overallGoalProgress, 1)} ({formatCurrency(totalGoalCurrent)} / {formatCurrency(totalGoalTarget)})
              </p>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setGoalFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  goalFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                ทั้งหมด ({goals.length})
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setGoalFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    goalFilter === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Goals Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGoals.map(goal => {
              const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
              const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

              return (
                <div
                  key={goal.id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4 hover:border-emerald-500/40 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl flex-shrink-0">
                          {goal.icon}
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                            {goal.title}
                          </h4>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                            {goal.category}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onOpenGoalModal(goal)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition"
                          title="แก้ไขเป้าหมาย"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteGoal(goal.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="ลบเป้าหมาย"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {goal.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2">
                        {goal.description}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(goal.currentAmount)}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          เป้าหมาย {formatCurrency(goal.targetAmount)} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer of card */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      {remaining <= 0 ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          สำเร็จแล้ว 🎉
                        </span>
                      ) : (
                        <span>ขาดอีก {formatCurrency(remaining)}</span>
                      )}
                    </span>

                    <button
                      onClick={() => onOpenDepositForGoal(goal.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 transition flex items-center gap-1"
                    >
                      <span>หยอดเงินเข้าเป้าหมายนี้</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
};
