import React from 'react';
import type { HouseholdSettings, MonthlyExpense, SavingsGoal, Transaction } from '../types';
import { formatCurrency, formatPercent, getCurrentYearMonth } from '../utils/formatters';
import {
  Wallet,
  Calendar,
  Award,
  CheckCircle2,
  ShieldCheck,
  Receipt,
  MinusCircle,
  PlusCircle,
} from 'lucide-react';

interface OverviewCardsProps {
  transactions: Transaction[];
  goals: SavingsGoal[];
  settings: HouseholdSettings;
  expenses?: MonthlyExpense[];
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({
  transactions,
  goals,
  settings,
  expenses = [],
}) => {
  const memberA = settings.members.person_a;
  const memberB = settings.members.person_b;

  // ==========================================
  // กองที่ 1: กองกลางสะสมทั้งหมด (Total Joint Accumulated Savings)
  // กฎ: เพิ่มลดเฉพาะเมื่อทำการเบิกหรือหยอดเข้ากองกลางเท่านั้น
  // ==========================================
  const longTermTxs = transactions.filter(t => (t.targetFund ?? 'long_term') === 'long_term');
  const totalDeposits = longTermTxs
    .filter(t => t.type === 'deposit' || (!t.type && t.type !== 'withdrawal'))
    .reduce((acc, t) => acc + t.amount, 0);

  const totalWithdrawals = longTermTxs
    .filter(t => t.type === 'withdrawal')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalGoalAllocationsLongTerm = longTermTxs
    .filter(t => t.type === 'goal_allocation')
    .reduce((acc, t) => acc + t.amount, 0);

  // หักทั้งการถอนเงิน และการดึงเงินออกจากกองระยะยาวเข้าเป้าหมาย
  const totalJointSavings = totalDeposits - totalWithdrawals - totalGoalAllocationsLongTerm;

  // All time breakdown (shares of joint + individual in long_term pool)
  const totalA = longTermTxs
    .filter(t => t.contributorId === 'person_a')
    .reduce((acc, t) => acc + (t.type === 'withdrawal' || t.type === 'goal_allocation' ? -t.amount : t.amount), 0);
  const totalB = longTermTxs
    .filter(t => t.contributorId === 'person_b')
    .reduce((acc, t) => acc + (t.type === 'withdrawal' || t.type === 'goal_allocation' ? -t.amount : t.amount), 0);
  const totalJointTx = longTermTxs
    .filter(t => t.contributorId === 'joint')
    .reduce((acc, t) => acc + (t.type === 'withdrawal' || t.type === 'goal_allocation' ? -t.amount : t.amount), 0);

  const effectiveA = totalA + (totalJointTx * 0.5);
  const effectiveB = totalB + (totalJointTx * 0.5);
  const percentA = totalJointSavings > 0 ? Math.max(0, (effectiveA / totalJointSavings) * 100) : 50;
  const percentB = totalJointSavings > 0 ? Math.max(0, (effectiveB / totalJointSavings) * 100) : 50;

  // ==========================================
  // กองที่ 2: กองทุนใช้จ่ายรายเดือน (Monthly Operating & Expense Fund)
  // กฎ: แสดงยอดเงินหลังจากหักค่าใช้จ่ายทั้งหมดแล้ว
  // ==========================================
  const monthlyHouseholdIncome = settings.householdMonthlyIncome ??
    ((memberA.monthlyIncome || 40250) + (memberB.monthlyIncome || 22850.90));

  const totalMonthlyExpense = expenses.reduce((acc, e) => {
    if (e.amountType === 'variable' && e.currentMonthAmount !== undefined && e.currentMonthAmount > 0) {
      return acc + e.currentMonthAmount;
    }
    return acc + e.amount;
  }, 0);

  // Operating Fund transactions (adjustments)
  const operatingTxs = transactions.filter(t => t.targetFund === 'operating');
  const operatingDeposits = operatingTxs
    .filter(t => t.type === 'deposit' || (!t.type && t.type !== 'withdrawal'))
    .reduce((acc, t) => acc + t.amount, 0);
  const operatingWithdrawals = operatingTxs
    .filter(t => t.type === 'withdrawal')
    .reduce((acc, t) => acc + t.amount, 0);
  const operatingGoalAllocations = operatingTxs
    .filter(t => t.type === 'goal_allocation')
    .reduce((acc, t) => acc + t.amount, 0);

  // การดึงเงินเข้าเป้าหมายจากกองหมุนเวียน จะถูกหักออกจากทุนหมุนเวียน
  const operatingNetAdjustment = operatingDeposits - operatingWithdrawals - operatingGoalAllocations;

  const remainingOperatingFund = (monthlyHouseholdIncome - totalMonthlyExpense) + operatingNetAdjustment;
  const expenseRatio = monthlyHouseholdIncome > 0 ? (totalMonthlyExpense / monthlyHouseholdIncome) * 100 : 0;
  const remainingRatio = monthlyHouseholdIncome > 0 ? (remainingOperatingFund / monthlyHouseholdIncome) * 100 : 0;

  // ==========================================
  // 3. Supporting KPI Metrics
  // ==========================================
  const currentYM = getCurrentYearMonth();
  const currentMonthTransactions = transactions.filter(t => t.date.startsWith(currentYM));
  const savedThisMonth = currentMonthTransactions.reduce(
    (acc, t) => acc + (t.type === 'withdrawal' ? -t.amount : t.amount),
    0
  );

  const monthlyTargetTotal = memberA.monthlyTarget + memberB.monthlyTarget;
  const monthlyProgressPercent = monthlyTargetTotal > 0 ? (savedThisMonth / monthlyTargetTotal) * 100 : 0;

  // Progress to Total Household Goal
  const totalGoalsTarget = goals.reduce((acc, g) => acc + g.targetAmount, 0) || settings.totalHouseholdTarget;
  const totalGoalProgressPercent = totalGoalsTarget > 0 ? Math.min((totalJointSavings / totalGoalsTarget) * 100, 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Header Banner: โครงสร้าง 2 กองทุนหลัก */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <span>โครงสร้างบริหาร 2 กองทุนหลักของครอบครัว</span>
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
              (Dual Household Funds Architecture)
            </span>
          </h2>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>แยกกองทุนสะสม และ กองทุนใช้จ่ายหมุนเวียนอย่างชัดเจน</span>
        </div>
      </div>

      {/* Tier 1: Two Primary Hero Funds (Side-by-Side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* ========================================================== */}
        {/* 🏛️ กองที่ 1: กองกลางสะสมทั้งหมด (Joint Wealth Pool) */}
        {/* ========================================================== */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/10 via-white/95 to-teal-500/5 dark:from-emerald-950/40 dark:via-slate-900/90 dark:to-teal-950/20 p-5 sm:p-7 border-2 border-emerald-500/40 dark:border-emerald-500/30 shadow-md dark:shadow-2xl backdrop-blur-md flex flex-col justify-between group hover:border-emerald-500 transition-all duration-300">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none group-hover:bg-emerald-500/25 transition-all" />

          <div>
            {/* Fund 1 Header & Rule Tag */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-extrabold tracking-wide uppercase shadow-xs flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>กองที่ 1 • กองกลางสะสมทั้งหมด</span>
                </span>
              </div>
              
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-300/80 dark:border-emerald-500/30">
                <span>🔒 ทุนสะสมระยะยาว</span>
              </div>
            </div>

            {/* Rule condition explanation */}
            <div className="text-[11px] text-emerald-900/80 dark:text-emerald-300/80 font-medium mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>กฎการเพิ่ม/ลด: <b>เพิ่มลดเฉพาะเมื่อทำการเบิกหรือหยอดเข้ากองกลางเท่านั้น</b></span>
            </div>

            {/* Main Balance Display */}
            <div className="my-2">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-2">
                <span>{formatCurrency(totalJointSavings)}</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">สุทธิปัจจุบัน</span>
              </div>
            </div>

            {/* Cash Flow Audit Metrics for Fund 1 */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-emerald-200/60 dark:border-slate-800/80">
              <div className="bg-white/80 dark:bg-slate-950/40 p-2.5 rounded-2xl border border-emerald-200/70 dark:border-emerald-500/20">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <PlusCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>ยอดฝากสะสมเข้ากองกลาง</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  +{formatCurrency(totalDeposits)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  สะสมจากคงเหลือ 12 เดือน
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-950/40 p-2.5 rounded-2xl border border-rose-200/70 dark:border-rose-500/20">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <MinusCircle className="w-3 h-3 text-rose-500" />
                  <span>ยอดเบิกถอนกองกลาง</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                  -{formatCurrency(totalWithdrawals)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  (ยางรถยนต์ 12k + DCA 58.2k)
                </div>
              </div>
            </div>

            {/* Goal Allocations from Fund 1 indicator */}
            {totalGoalAllocationsLongTerm > 0 && (
              <div className="mt-2 p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-500/30 text-[11px] flex items-center justify-between">
                <span className="text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1">
                  <span>🎯</span>
                  <span>ดึงเงินไปใส่เป้าหมายแล้ว:</span>
                </span>
                <span className="font-bold text-teal-700 dark:text-teal-300">
                  -{formatCurrency(totalGoalAllocationsLongTerm)}
                </span>
              </div>
            )}
          </div>

          {/* Equal Ownership Footer */}
          <div className="mt-4 pt-3 border-t border-emerald-200/60 dark:border-slate-800/80">
            <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1.5 font-medium">
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                {memberA.avatar} {memberA.nickname}: {formatPercent(percentA)} ({formatCurrency(effectiveA)})
              </span>
              <span className="flex items-center gap-1 text-indigo-700 dark:text-indigo-400 font-semibold">
                ({formatCurrency(effectiveB)}) {memberB.nickname} {memberB.avatar}: {formatPercent(percentB)}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${percentA}%` }}
                title={`${memberA.name}: ${formatPercent(percentA)}`}
              />
              <div
                className="bg-indigo-500 transition-all duration-500"
                style={{ width: `${percentB}%` }}
                title={`${memberB.name}: ${formatPercent(percentB)}`}
              />
            </div>
          </div>

        </div>

        {/* ========================================================== */}
        {/* 💳 กองที่ 2: กองทุนใช้จ่ายรายเดือน (Monthly Operating Fund) */}
        {/* ========================================================== */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500/10 via-white/95 to-sky-500/5 dark:from-indigo-950/40 dark:via-slate-900/90 dark:to-sky-950/20 p-5 sm:p-7 border-2 border-indigo-500/40 dark:border-indigo-500/30 shadow-md dark:shadow-2xl backdrop-blur-md flex flex-col justify-between group hover:border-indigo-500 transition-all duration-300">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none group-hover:bg-indigo-500/25 transition-all" />

          <div>
            {/* Fund 2 Header & Rule Tag */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-white text-[11px] font-extrabold tracking-wide uppercase shadow-xs flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>กองที่ 2 • กองทุนใช้จ่ายรายเดือน</span>
                </span>
              </div>

              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-800 dark:text-indigo-300 bg-indigo-100/90 dark:bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-300/80 dark:border-indigo-500/30">
                <span>📊 ทุนหมุนเวียนประจำงวด</span>
              </div>
            </div>

            {/* Rule condition explanation */}
            <div className="text-[11px] text-indigo-900/80 dark:text-indigo-300/80 font-medium mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>สูตรคำนวณ: <b>แสดงยอดคงเหลือหลังจากหักค่าใช้จ่ายทั้งหมดแล้ว</b></span>
            </div>

            {/* Main Balance Display (Net Operating Surplus) */}
            <div className="my-2">
              <div className="text-3xl sm:text-4xl font-black text-indigo-700 dark:text-indigo-400 tracking-tight flex items-baseline gap-2">
                <span>{formatCurrency(remainingOperatingFund)}</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">คงเหลือสุทธิเดือนนี้</span>
              </div>
            </div>

            {/* Equation Breakdown for Fund 2 */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-indigo-200/60 dark:border-slate-800/80">
              <div className="bg-white/80 dark:bg-slate-950/40 p-2.5 rounded-2xl border border-indigo-200/70 dark:border-indigo-500/20">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <span>💵 รายรับรวมครัวเรือน</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatCurrency(monthlyHouseholdIncome)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  เจ ฿40.2k + เมย์ ฿22.8k
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-950/40 p-2.5 rounded-2xl border border-rose-200/70 dark:border-rose-500/20">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <span>🧾 หักค่าใช้จ่ายทั้งหมด</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                  -{formatCurrency(totalMonthlyExpense)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {expenses.length} รายการ (รถ, บัตร, ค่าห้อง ฯลฯ)
                </div>
              </div>
            </div>

            {/* Operating Fund Direct Adjustments (if any) */}
            {operatingTxs.length > 0 && (
              <div className="mt-2 p-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-500/30 text-[11px] flex items-center justify-between">
                <span className="text-indigo-800 dark:text-indigo-300 font-semibold">
                  ปรับปรุงฝาก/ถอนกองหมุนเวียน ({operatingTxs.length} รายการ):
                </span>
                <span className={`font-bold ${operatingNetAdjustment >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {operatingNetAdjustment >= 0 ? '+' : ''}{formatCurrency(operatingNetAdjustment)}
                </span>
              </div>
            )}
          </div>

          {/* Cash Flow Balance Meter Footer */}
          <div className="mt-4 pt-3 border-t border-indigo-200/60 dark:border-slate-800/80">
            <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1.5 font-medium">
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                ภาระค่าใช้จ่าย: {formatPercent(expenseRatio)}
              </span>
              <span className="text-indigo-700 dark:text-indigo-400 font-bold">
                คงเหลือพร้อมออม: {formatPercent(remainingRatio)}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="bg-rose-500 transition-all duration-500"
                style={{ width: `${expenseRatio}%` }}
                title={`ค่าใช้จ่าย: ${formatPercent(expenseRatio)}`}
              />
              <div
                className="bg-indigo-500 transition-all duration-500"
                style={{ width: `${remainingRatio}%` }}
                title={`คงเหลือ: ${formatPercent(remainingRatio)}`}
              />
            </div>
          </div>

        </div>

      </div>

      {/* Tier 2: Supporting KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Card 3: Saved This Month vs Target */}
        <div className="relative overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-900/80 p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm dark:shadow-xl backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>ยอดออมสะสมงวดนี้ (Saved This Month)</span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(savedThisMonth)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>เป้าหมายงวดนี้:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(monthlyTargetTotal)}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                ({formatPercent(monthlyProgressPercent)})
              </span>
            </div>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300/60 dark:border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Progress to Household Goals */}
        <div className="relative overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-900/80 p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm dark:shadow-xl backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1 w-full max-w-[75%]">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>ความคืบหน้าเป้าหมายครอบครัว 4 ด้าน</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {formatPercent(totalGoalProgressPercent)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                (ขาดอีก {formatCurrency(Math.max(0, totalGoalsTarget - totalJointSavings))})
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${totalGoalProgressPercent}%` }}
              />
            </div>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/10 border border-amber-300/60 dark:border-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400 shadow-xs">
            <Award className="w-6 h-6" />
          </div>
        </div>

      </div>

    </div>
  );
};
