import type { MonthlyExpense } from '../types';
import { getCurrentYearMonth } from './formatters';

/**
 * Checks and automatically resets recurring monthly expenses when their due date arrives in a new month cycle.
 *
 * Requirements:
 * - "ถ้าถึงวันกำหนดชำระแล้ว สถานะจะถูกเคลียร์เป็นเดือนใหม่ทันที"
 * - If current date reaches or passes the expense's dueDay (e.g. 1st, 5th, 17th, 20th),
 *   and it has not been marked as paid for the current month cycle (lastPaidMonth !== currentMonthKey),
 *   its status is automatically reset to unpaid (isPaidThisMonth: false).
 * - For variable expenses, if no bill has been entered yet for the current month,
 *   currentMonthAmount is cleared so the user can enter the new billing statement.
 */
export function checkAndAutoResetMonthlyExpenses(
  expenses: MonthlyExpense[],
  referenceDate: Date = new Date()
): { updatedExpenses: MonthlyExpense[]; resetCount: number; hasChanges: boolean } {
  const currentMonthKey = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
  const currentDay = referenceDate.getDate();

  let resetCount = 0;
  let hasChanges = false;

  const updatedExpenses = expenses.map(exp => {
    const dueDay = exp.dueDay || 1;
    const isDue = currentDay >= dueDay;
    const isPaidForThisCycle = exp.lastPaidMonth === currentMonthKey;

    // If it has reached due date in current cycle, but was marked paid in a PREVIOUS month or never
    if (isDue && !isPaidForThisCycle && exp.isPaidThisMonth) {
      resetCount++;
      hasChanges = true;
      return {
        ...exp,
        isPaidThisMonth: false,
        // Reset variable amount for the new cycle if it was carried over from previous months
        currentMonthAmount:
          exp.amountType === 'variable' && (!exp.monthlyBills || !exp.monthlyBills[currentMonthKey])
            ? undefined
            : exp.currentMonthAmount,
      };
    }

    return exp;
  });

  return { updatedExpenses, resetCount, hasChanges };
}

/**
 * Force-clears all recurring expenses for testing or starting a new monthly billing cycle immediately.
 */
export function forceResetToNewMonth(
  expenses: MonthlyExpense[],
  targetMonthKey: string = getCurrentYearMonth()
): MonthlyExpense[] {
  return expenses.map(exp => ({
    ...exp,
    isPaidThisMonth: false,
    currentMonthAmount:
      exp.amountType === 'variable' && (!exp.monthlyBills || !exp.monthlyBills[targetMonthKey])
        ? undefined
        : exp.currentMonthAmount,
  }));
}

/**
 * Helper to inspect the due status of an expense for UI display
 */
export function getExpenseDueStatus(
  exp: MonthlyExpense,
  referenceDate: Date = new Date()
): { isDue: boolean; daysRemaining: number; isPaidThisCycle: boolean } {
  const currentMonthKey = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
  const currentDay = referenceDate.getDate();
  const dueDay = exp.dueDay || 1;

  const isDue = currentDay >= dueDay;
  const daysRemaining = Math.max(0, dueDay - currentDay);
  const isPaidThisCycle = exp.isPaidThisMonth === true && exp.lastPaidMonth === currentMonthKey;

  return { isDue, daysRemaining, isPaidThisCycle };
}
