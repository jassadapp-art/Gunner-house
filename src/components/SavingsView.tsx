import React, { useMemo, useState } from 'react';
import type { ContributorId, HouseholdFundType, HouseholdSettings, SavingsGoal, Transaction } from '../types';
import { formatCurrency, formatPercent, formatThaiDate } from '../utils/formatters';
import { QuickAddBar } from './QuickAddBar';
import {
  PiggyBank,
  Target,
  PlusCircle,
  ArrowUpRight,
  Edit2,
  Trash2,
  CheckCircle2,
  Layers,
  Search,
} from 'lucide-react';

interface SavingsViewProps {
  settings: HouseholdSettings;
  goals: SavingsGoal[];
  transactions: Transaction[];
  onQuickAdd: (contributorId: ContributorId, amount: number, note: string, targetFund: HouseholdFundType) => void;
  onQuickWithdraw?: (contributorId: ContributorId, amount: number, note: string, targetFund: HouseholdFundType) => void;
  onOpenCustomAdd: (contributorId?: ContributorId, fund?: HouseholdFundType) => void;
  onUpdatePresets?: (presets: number[]) => void;
  onOpenGoalModal: (goal?: SavingsGoal | null) => void;
  onDeleteGoal: (goalId: string) => void;
  onOpenDepositForGoal: (goalId: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
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
  const [historySearch, setHistorySearch] = useState('');

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

  // Savings History transactions
  const savingsTransactions = useMemo(() => {
    return transactions
      .filter(t => t.type === 'deposit' || t.type === 'goal_allocation')
      .filter(t => {
        if (!historySearch.trim()) return true;
        const q = historySearch.toLowerCase();
        return (
          t.category.toLowerCase().includes(q) ||
          (t.note && t.note.toLowerCase().includes(q))
        );
      });
  }, [transactions, historySearch]);

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-600/10 via-teal-500/10 to-transparent border border-emerald-500/20 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
              หน้า 3
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              หน้าเงินออม & เป้าหมายครอบครัว
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
            บริหารกองทุนเงินออม (หมุนเวียน vs ระยะยาว) และติดตามความสำเร็จของทุกเป้าหมาย
          </p>
        </div>

        <button
          onClick={() => onOpenGoalModal(null)}
          className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition flex items-center gap-2 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>เพิ่มเป้าหมายเงินออม</span>
        </button>
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
              <span>เงินกองกลางสะสมรวมทั้งหมด</span>
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

      {/* Goals & Milestones Section */}
      <div className="space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>เป้าหมายเงินออม (Savings Goals)</span>
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

      {/* Savings & Allocation History Table */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>ประวัติการหยอดเงินออมและจัดสรร (Savings History)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              บันทึกรายการฝากเงินเข้ากองกลางและกองทุนเป้าหมาย
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              placeholder="ค้นหาประวัติการออม..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                <th className="pb-3 pl-2">วันที่</th>
                <th className="pb-3">รายการ / เป้าหมาย</th>
                <th className="pb-3">ผู้หยอด</th>
                <th className="pb-3">กองทุนปลายทาง</th>
                <th className="pb-3 text-right">จำนวนเงิน</th>
                <th className="pb-3 text-right pr-2">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {savingsTransactions.slice(0, 15).map(t => {
                const targetGoal = goals.find(g => g.id === t.goalId);
                const contributorName =
                  t.contributorId === 'person_a'
                    ? settings.members.person_a.nickname
                    : t.contributorId === 'person_b'
                    ? settings.members.person_b.nickname
                    : 'กองกลาง';

                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 pl-2 text-slate-500 dark:text-slate-400">
                      {formatThaiDate(t.date)}
                    </td>
                    <td className="py-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {t.note || t.category}
                      </div>
                      {targetGoal && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <span>{targetGoal.icon}</span>
                          <span>{targetGoal.title}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-slate-700 dark:text-slate-300">
                        {contributorName}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {t.targetFund === 'long_term' ? '🏛️ กองระยะยาว' : '💳 กองหมุนเวียน'}
                      </span>
                    </td>
                    <td className="py-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                      +{formatCurrency(t.amount)}
                    </td>
                    <td className="py-3 text-right pr-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditTransaction(t)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteTransaction(t.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
