import React from 'react';
import type { SavingsGoal, Transaction } from '../types';
import {
  formatCurrency,
  formatPercent,
  formatThaiDate,
  calculateMonthsRemaining,
} from '../utils/formatters';
import {
  Target,
  Calendar,
  Clock,
  Plus,
  Edit2,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';

interface GoalsListProps {
  goals: SavingsGoal[];
  transactions: Transaction[];
  onOpenGoalModal: (goalToEdit?: SavingsGoal) => void;
  onOpenDepositForGoal: (goalId: string) => void;
}

export const GoalsList: React.FC<GoalsListProps> = ({
  goals,
  transactions,
  onOpenGoalModal,
  onOpenDepositForGoal,
}) => {
  // Calculate average monthly savings across all transactions
  const monthMap = new Map<string, number>();
  transactions.forEach(t => {
    const ym = t.date.slice(0, 7);
    const delta = t.type === 'withdrawal' ? -t.amount : t.amount;
    monthMap.set(ym, (monthMap.get(ym) || 0) + delta);
  });
  const totalMonths = Math.max(1, monthMap.size);
  const totalAllTime = transactions.reduce(
    (acc, t) => acc + (t.type === 'withdrawal' ? -t.amount : t.amount),
    0
  );
  const avgMonthlySavings = Math.max(0, totalAllTime / totalMonths);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-cyan-500/10 border border-teal-300/60 dark:border-cyan-500/20 flex items-center justify-center text-teal-700 dark:text-cyan-400 shadow-sm">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              เป้าหมายกองกลางร่วมกัน (Shared Goals & Milestones)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ความคืบหน้าของแต่ละกระปุกเป้าหมาย และคาดการณ์เวลาที่จะบรรลุเป้าหมาย
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenGoalModal()}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition shadow-xs active:scale-95"
        >
          <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>เพิ่มเป้าหมายใหม่</span>
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {goals.map(goal => {
          const linkedTxs = transactions.filter(t => t.goalId === goal.id);
          const currentFromTxs = linkedTxs.reduce(
            (acc, t) => acc + (t.type === 'withdrawal' ? -t.amount : t.amount),
            0
          );
          const effectiveCurrent = Math.max(
            0,
            goal.id === 'goal-emergency'
              ? currentFromTxs
              : (goal.currentAmount || 0) + currentFromTxs
          );
          
          const progressPercent = Math.min((effectiveCurrent / goal.targetAmount) * 100, 100);
          const remainingAmount = Math.max(0, goal.targetAmount - effectiveCurrent);
          const isCompleted = remainingAmount === 0;

          const goalShareOfMonthly = avgMonthlySavings / Math.max(1, goals.length);
          const forecast = calculateMonthsRemaining(remainingAmount, goalShareOfMonthly);

          return (
            <div
              key={goal.id}
              className="relative overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-900/80 p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-slate-700 transition-all duration-300 shadow-sm dark:shadow-xl backdrop-blur-md flex flex-col justify-between group"
            >
              {/* Subtle ambient light */}
              <div
                className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full blur-3xl opacity-15 pointer-events-none group-hover:opacity-25 transition-opacity"
                style={{ backgroundColor: goal.color }}
              />

              <div>
                {/* Top Row: Icon, Title, Category Badge, Edit */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-slate-200 dark:border-white/10"
                      style={{ backgroundColor: `${goal.color}20` }}
                    >
                      {goal.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                          {goal.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
                          {goal.category}
                        </span>
                        {goal.targetDate && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            ครบกำหนด: {formatThaiDate(goal.targetDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Edit button */}
                  <button
                    onClick={() => onOpenGoalModal(goal)}
                    title="แก้ไขเป้าหมาย"
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                {goal.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                    {goal.description}
                  </p>
                )}

                {/* Amounts & Progress Status */}
                <div className="mt-4 bg-slate-50/80 dark:bg-slate-950/50 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800/80">
                  <div className="flex items-baseline justify-between mb-2">
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">สะสมแล้ว</span>
                      <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(effectiveCurrent)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 dark:text-slate-400">เป้าหมาย</span>
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(goal.targetAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 relative">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: goal.color,
                        boxShadow: `0 0 8px ${goal.color}60`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                    <span className="flex items-center gap-1">
                      {isCompleted ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> สำเร็จแล้ว 100%!
                        </span>
                      ) : (
                        <span>ยังขาดอีก {formatCurrency(remainingAmount)}</span>
                      )}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white" style={{ color: goal.color }}>
                      {formatPercent(progressPercent)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Forecast & Quick Deposit Button */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-cyan-400 flex-shrink-0" />
                  <span className="truncate">
                    คาดการณ์: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{forecast.text}</strong>
                  </span>
                </div>

                <button
                  onClick={() => onOpenDepositForGoal(goal.id)}
                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-500/30 text-xs font-semibold transition active:scale-95 shadow-2xs"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>หยอดเข้าเป้าหมายนี้</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};
