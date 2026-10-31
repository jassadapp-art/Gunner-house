import type { MonthlyExpense } from '../types';
import {
  getCurrentYearMonth,
  getPreviousBillingMonth,
  BILLING_CYCLE_CUTOFF_DAY,
} from './formatters';

/**
 * Calculates the exact Due Date for an expense in a given billing cycle.
 * Billing cycle 'YYYY-MM' runs from the 25th of month (M-1) to the 24th of month M.
 * - If dueDay >= 25: falls on dueDay of month (M-1)
 * - If dueDay < 25: falls on dueDay of month M
 */
export function getExpenseDueDateForCycle(
  cycleKey: string,
  dueDay: number = 1
): Date {
  const [yearStr, monthStr] = cycleKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  if (dueDay >= BILLING_CYCLE_CUTOFF_DAY) {
    return new Date(year, month - 2, dueDay);
  } else {
    return new Date(year, month - 1, dueDay);
  }
}

/**
 * Checks and automatically resets recurring monthly expenses on the 25th of every month:
 * 1. "อยากให้รอบบิลบันทึก": Snapshots and locks previous cycle bills into monthlyBills[prevCycle].
 * 2. "และเป็นเดือนถัดไป ในทุกวันที่ 25 ของเดือน": Rollovers to the new billing cycle:
 *    - isPaidThisMonth resets to false for the new cycle
 *    - variable currentMonthAmount resets to undefined (blank/ready for entering new bill)
 */
export function checkAndAutoResetMonthlyExpenses(
  expenses: MonthlyExpense[],
  referenceDate: Date = new Date()
): { updatedExpenses: MonthlyExpense[]; resetCount: number; hasChanges: boolean } {
  const activeCycle = getCurrentYearMonth(referenceDate);
  const prevCycle = getPreviousBillingMonth(activeCycle);

  let resetCount = 0;
  let hasChanges = false;

  const updatedExpenses = expenses.map(exp => {
    let updatedMonthlyBills = exp.monthlyBills ? { ...exp.monthlyBills } : {};
    let billsChanged = false;

    // 1. Snapshot previous cycle bills so history is permanently locked
    if (updatedMonthlyBills[prevCycle] === undefined) {
      if (exp.amountType === 'fixed') {
        updatedMonthlyBills[prevCycle] = exp.amount;
        billsChanged = true;
      } else if (exp.amountType === 'variable') {
        const valToSnapshot = exp.currentMonthAmount !== undefined ? exp.currentMonthAmount : exp.amount;
        if (valToSnapshot > 0) {
          updatedMonthlyBills[prevCycle] = valToSnapshot;
          billsChanged = true;
        }
      }
    }

    // 2. Rollover to new active billing cycle if not yet paid for this cycle
    const isPaidInActiveCycle = exp.lastPaidMonth === activeCycle;

    if (!isPaidInActiveCycle && (exp.isPaidThisMonth || exp.currentMonthAmount !== undefined)) {
      resetCount++;
      hasChanges = true;
      return {
        ...exp,
        monthlyBills: billsChanged ? updatedMonthlyBills : (exp.monthlyBills || {}),
        isPaidThisMonth: false,
        // Reset variable amount for the new billing cycle if no bill has been entered yet for activeCycle
        currentMonthAmount:
          exp.amountType === 'variable' && (!updatedMonthlyBills[activeCycle])
            ? undefined
            : exp.currentMonthAmount,
      };
    }

    if (billsChanged) {
      hasChanges = true;
      return {
        ...exp,
        monthlyBills: updatedMonthlyBills,
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
  const currentMonthKey = getCurrentYearMonth(referenceDate);
  const dueDay = exp.dueDay || 1;
  const dueDate = getExpenseDueDateForCycle(currentMonthKey, dueDay);

  // Compare day with 00:00:00 precision
  const todayZero = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const dueZero = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  const isDue = todayZero.getTime() >= dueZero.getTime();
  const diffMs = dueZero.getTime() - todayZero.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isPaidThisCycle = exp.isPaidThisMonth === true && exp.lastPaidMonth === currentMonthKey;

  return { isDue, daysRemaining, isPaidThisCycle };
}
