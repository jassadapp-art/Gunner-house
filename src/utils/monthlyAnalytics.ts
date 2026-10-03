import type { HouseholdSettings, MonthlyExpense, Transaction } from '../types';
import { getMonthLabel } from './formatters';

export interface AnalyticsMetricPoint {
  key: string;              // 'YYYY-MM' or 'YYYY-Q#' or 'YYYY'
  monthKey: string;         // 'YYYY-MM' for backward compatibility
  label: string;            // 'ก.ย. 69' or 'Q3/69' or 'ปี 2569'
  timeframe: 'monthly' | 'quarterly' | 'yearly';
  incomeA: number;          // รายได้เจ
  incomeB: number;          // รายได้เมย์
  totalIncome: number;      // รายได้รวม
  fixedExpenses: number;    // รายจ่ายประจำ
  adhocExpenses: number;    // รายจ่ายพิเศษ/ถอน
  totalExpenses: number;    // รายจ่ายรวม
  netSavings: number;       // เงินเหลือ/เงินออมสุทธิประจำช่วง
  cumulativeSavings: number;// เงินออมสะสมต่อเนื่อง
  expenseRatio: number;     // % รายจ่ายต่อรายรับ
  savingsRatio: number;     // % เงินออมต่อรายรับ
  creditCardKtc: number;    // บัตร KTC
  creditCardTtb: number;    // บัตร TTB
  creditCardTotal: number;  // รวมบัตรเครดิต
  creditCardRatio: number;  // % บัตรเครดิตต่อรายรับ
  electricityBill: number;  // ค่าไฟ
  rentBill: number;         // ค่าที่พัก
}

export type MonthlyMetricPoint = AnalyticsMetricPoint;

export interface CategoryExpenseSlice {
  name: string;
  category: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'ยานพาหนะและการเดินทาง': '#10B981', // Emerald
  'อื่นๆ': '#EC4899', // Pink (Mom)
  'บัตรเครดิตและสินเชื่อ': '#6366F1', // Indigo
  'ที่อยู่อาศัย (บ้าน/คอนโด)': '#F59E0B', // Amber
  'สาธารณูปโภค (ค่าไฟ/น้ำ)': '#EAB308', // Yellow
  'ประกันและสุขภาพ': '#06B6D4', // Cyan
  'เงินออมและการลงทุน': '#8B5CF6', // Purple
  'ของกินและของใช้ในบ้าน': '#F97316', // Orange
};

const CATEGORY_ICONS: Record<string, string> = {
  'ยานพาหนะและการเดินทาง': '🚗',
  'อื่นๆ': '🍼',
  'บัตรเครดิตและสินเชื่อ': '💳',
  'ที่อยู่อาศัย (บ้าน/คอนโด)': '🏠',
  'สาธารณูปโภค (ค่าไฟ/น้ำ)': '⚡',
  'ประกันและสุขภาพ': '🩺',
  'เงินออมและการลงทุน': '📈',
  'ของกินและของใช้ในบ้าน': '🛒',
};

export function getExpenseEstimatedAmount(exp: MonthlyExpense): number {
  return exp.estimatedAmount ?? exp.amount;
}

export function getExpenseAmountForMonth(exp: MonthlyExpense, monthKey: string): number {
  if (exp.monthlyBills && exp.monthlyBills[monthKey] !== undefined) {
    return exp.monthlyBills[monthKey];
  }
  if (exp.amountType === 'variable') {
    return exp.currentMonthAmount !== undefined ? exp.currentMonthAmount : (exp.estimatedAmount ?? exp.amount);
  }
  return exp.amount;
}

/**
 * Discover all available month keys in the system across settings, expenses, transactions, and now
 */
export function getAllAvailableMonthKeys(
  settings: HouseholdSettings,
  expenses: MonthlyExpense[],
  transactions: Transaction[]
): string[] {
  const set = new Set<string>();
  if (settings.monthlyIncomes) {
    Object.keys(settings.monthlyIncomes).forEach(k => {
      if (/^\d{4}-\d{2}$/.test(k)) set.add(k);
    });
  }
  expenses.forEach(e => {
    if (e.monthlyBills) {
      Object.keys(e.monthlyBills).forEach(k => {
        if (/^\d{4}-\d{2}$/.test(k)) set.add(k);
      });
    }
  });
  transactions.forEach(t => {
    if (t.date && t.date.length >= 7 && /^\d{4}-\d{2}$/.test(t.date.slice(0, 7))) {
      set.add(t.date.slice(0, 7));
    }
  });
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  set.add(currentKey);

  return Array.from(set).sort();
}

/**
 * Build unified metrics history supporting:
 * - 'monthly' (รายเดือน: 6 เดือน, 12 เดือน, หรือทั้งหมด)
 * - 'quarterly' (รายไตรมาส: Q1, Q2, Q3, Q4)
 * - 'yearly' (รายปี: 2021..2026)
 * Automatically computes net savings and cumulative savings curve!
 */
export function buildAnalyticsMetricsHistory(
  settings: HouseholdSettings,
  expenses: MonthlyExpense[],
  transactions: Transaction[],
  timeframe: 'monthly' | 'quarterly' | 'yearly' = 'monthly',
  rangeOption: number | 'all' = 6
): AnalyticsMetricPoint[] {
  const allMonths = getAllAvailableMonthKeys(settings, expenses, transactions);

  const baseIncomeA = settings.members.person_a.monthlyIncome || 40250;
  const baseIncomeB = settings.members.person_b.monthlyIncome || 22850.90;

  // 1. Build complete monthly metric points
  const rawMonthlyList: AnalyticsMetricPoint[] = allMonths.map(mKey => {
    const customIncome = settings.monthlyIncomes?.[mKey];
    let incomeA = customIncome?.person_a !== undefined ? customIncome.person_a : baseIncomeA;
    let incomeB = customIncome?.person_b !== undefined ? customIncome.person_b : baseIncomeB;
    let extraOther = customIncome?.other ?? 0;

    transactions.forEach(t => {
      if (t.date.startsWith(mKey) && t.type === 'deposit' && t.category === 'รายได้พิเศษ') {
        if (t.contributorId === 'person_a') incomeA += t.amount;
        else if (t.contributorId === 'person_b') incomeB += t.amount;
        else {
          extraOther += t.amount;
        }
      }
    });

    const totalIncome = incomeA + incomeB + extraOther;

    let fixedExpenses = 0;
    let creditCardKtc = 0;
    let creditCardTtb = 0;
    let electricityBill = 0;
    let rentBill = 0;

    expenses.forEach(e => {
      const amt = getExpenseAmountForMonth(e, mKey);
      fixedExpenses += amt;

      if (e.id === 'exp-ktc') creditCardKtc += amt;
      else if (e.id === 'exp-ttb') creditCardTtb += amt;
      else if (e.category === 'บัตรเครดิตและสินเชื่อ') {
        if (e.payer === 'person_a') creditCardKtc += amt;
        else creditCardTtb += amt;
      }

      if (e.id === 'exp-electricity' || e.title.includes('ค่าไฟ')) {
        electricityBill += amt;
      }
      if (e.id === 'exp-rent' || e.title.includes('ที่พัก')) {
        rentBill += amt;
      }
    });

    let adhocExpenses = 0;
    transactions.forEach(t => {
      if (t.date.startsWith(mKey) && t.type === 'withdrawal') {
        adhocExpenses += t.amount;
      }
    });

    const totalExpenses = fixedExpenses + adhocExpenses;
    const netSavings = totalIncome - totalExpenses;
    const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
    const savingsRatio = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    const creditCardTotal = creditCardKtc + creditCardTtb;
    const creditCardRatio = totalIncome > 0 ? (creditCardTotal / totalIncome) * 100 : 0;

    return {
      key: mKey,
      monthKey: mKey,
      label: getMonthLabel(mKey),
      timeframe: 'monthly',
      incomeA,
      incomeB,
      totalIncome,
      fixedExpenses,
      adhocExpenses,
      totalExpenses,
      netSavings,
      cumulativeSavings: 0,
      expenseRatio,
      savingsRatio,
      creditCardKtc,
      creditCardTtb,
      creditCardTotal,
      creditCardRatio,
      electricityBill,
      rentBill,
    };
  });

  // 2. Aggregate based on requested timeframe
  if (timeframe === 'monthly') {
    let selected = rawMonthlyList;
    if (typeof rangeOption === 'number' && rangeOption > 0 && selected.length > rangeOption) {
      selected = selected.slice(selected.length - rangeOption);
    }

    let runningCum = 0;
    return selected.map(pt => {
      runningCum += pt.netSavings;
      return {
        ...pt,
        cumulativeSavings: runningCum,
      };
    });
  }

  if (timeframe === 'quarterly') {
    // Group monthly items by quarter: YYYY-Q1, YYYY-Q2, YYYY-Q3, YYYY-Q4
    const qMap = new Map<string, AnalyticsMetricPoint>();

    rawMonthlyList.forEach(m => {
      const [yearStr, monthStr] = m.monthKey.split('-');
      const monthNum = parseInt(monthStr, 10);
      const qNum = Math.ceil(monthNum / 3);
      const qKey = `${yearStr}-Q${qNum}`;
      const thaiYearShort = (parseInt(yearStr, 10) + 543) % 100;
      const qLabel = `Q${qNum}/${thaiYearShort}`;

      const existing = qMap.get(qKey);
      if (!existing) {
        qMap.set(qKey, {
          key: qKey,
          monthKey: m.monthKey,
          label: qLabel,
          timeframe: 'quarterly',
          incomeA: m.incomeA,
          incomeB: m.incomeB,
          totalIncome: m.totalIncome,
          fixedExpenses: m.fixedExpenses,
          adhocExpenses: m.adhocExpenses,
          totalExpenses: m.totalExpenses,
          netSavings: m.netSavings,
          cumulativeSavings: 0,
          expenseRatio: 0,
          savingsRatio: 0,
          creditCardKtc: m.creditCardKtc,
          creditCardTtb: m.creditCardTtb,
          creditCardTotal: m.creditCardTotal,
          creditCardRatio: 0,
          electricityBill: m.electricityBill,
          rentBill: m.rentBill,
        });
      } else {
        existing.incomeA += m.incomeA;
        existing.incomeB += m.incomeB;
        existing.totalIncome += m.totalIncome;
        existing.fixedExpenses += m.fixedExpenses;
        existing.adhocExpenses += m.adhocExpenses;
        existing.totalExpenses += m.totalExpenses;
        existing.netSavings += m.netSavings;
        existing.creditCardKtc += m.creditCardKtc;
        existing.creditCardTtb += m.creditCardTtb;
        existing.creditCardTotal += m.creditCardTotal;
        existing.electricityBill += m.electricityBill;
        existing.rentBill += m.rentBill;
      }
    });

    let qList = Array.from(qMap.values()).map(q => {
      const expenseRatio = q.totalIncome > 0 ? (q.totalExpenses / q.totalIncome) * 100 : 0;
      const savingsRatio = q.totalIncome > 0 ? (q.netSavings / q.totalIncome) * 100 : 0;
      const creditCardRatio = q.totalIncome > 0 ? (q.creditCardTotal / q.totalIncome) * 100 : 0;
      return {
        ...q,
        expenseRatio,
        savingsRatio,
        creditCardRatio,
      };
    });

    if (typeof rangeOption === 'number' && rangeOption > 0 && qList.length > rangeOption) {
      qList = qList.slice(qList.length - rangeOption);
    }

    let runningCum = 0;
    return qList.map(q => {
      runningCum += q.netSavings;
      return {
        ...q,
        cumulativeSavings: runningCum,
      };
    });
  }

  // Yearly timeframe: group by year
  const yMap = new Map<string, AnalyticsMetricPoint>();

  rawMonthlyList.forEach(m => {
    const yearStr = m.monthKey.slice(0, 4);
    const thaiYear = parseInt(yearStr, 10) + 543;
    const yKey = yearStr;
    const yLabel = `ปี ${thaiYear}`;

    const existing = yMap.get(yKey);
    if (!existing) {
      yMap.set(yKey, {
        key: yKey,
        monthKey: m.monthKey,
        label: yLabel,
        timeframe: 'yearly',
        incomeA: m.incomeA,
        incomeB: m.incomeB,
        totalIncome: m.totalIncome,
        fixedExpenses: m.fixedExpenses,
        adhocExpenses: m.adhocExpenses,
        totalExpenses: m.totalExpenses,
        netSavings: m.netSavings,
        cumulativeSavings: 0,
        expenseRatio: 0,
        savingsRatio: 0,
        creditCardKtc: m.creditCardKtc,
        creditCardTtb: m.creditCardTtb,
        creditCardTotal: m.creditCardTotal,
        creditCardRatio: 0,
        electricityBill: m.electricityBill,
        rentBill: m.rentBill,
      });
    } else {
      existing.incomeA += m.incomeA;
      existing.incomeB += m.incomeB;
      existing.totalIncome += m.totalIncome;
      existing.fixedExpenses += m.fixedExpenses;
      existing.adhocExpenses += m.adhocExpenses;
      existing.totalExpenses += m.totalExpenses;
      existing.netSavings += m.netSavings;
      existing.creditCardKtc += m.creditCardKtc;
      existing.creditCardTtb += m.creditCardTtb;
      existing.creditCardTotal += m.creditCardTotal;
      existing.electricityBill += m.electricityBill;
      existing.rentBill += m.rentBill;
    }
  });

  let yList = Array.from(yMap.values()).map(y => {
    const expenseRatio = y.totalIncome > 0 ? (y.totalExpenses / y.totalIncome) * 100 : 0;
    const savingsRatio = y.totalIncome > 0 ? (y.netSavings / y.totalIncome) * 100 : 0;
    const creditCardRatio = y.totalIncome > 0 ? (y.creditCardTotal / y.totalIncome) * 100 : 0;
    return {
      ...y,
      expenseRatio,
      savingsRatio,
      creditCardRatio,
    };
  });

  if (typeof rangeOption === 'number' && rangeOption > 0 && yList.length > rangeOption) {
    yList = yList.slice(yList.length - rangeOption);
  }

  let runningCum = 0;
  return yList.map(y => {
    runningCum += y.netSavings;
    return {
      ...y,
      cumulativeSavings: runningCum,
    };
  });
}

/**
 * Backward compatibility wrapper
 */
export function buildMonthlyMetricsHistory(
  settings: HouseholdSettings,
  expenses: MonthlyExpense[],
  transactions: Transaction[],
  monthsCount: number = 6
): MonthlyMetricPoint[] {
  return buildAnalyticsMetricsHistory(settings, expenses, transactions, 'monthly', monthsCount);
}

export function getCategoryExpenseBreakdownForMonth(
  expenses: MonthlyExpense[],
  transactions: Transaction[],
  monthKey: string
): CategoryExpenseSlice[] {
  const catTotals = new Map<string, number>();

  // 1. Recurring expenses
  expenses.forEach(e => {
    const amt = getExpenseAmountForMonth(e, monthKey);
    let category = e.category || 'อื่นๆ';
    if (e.id === 'exp-electricity') {
      category = 'สาธารณูปโภค (ค่าไฟ/น้ำ)';
    }
    catTotals.set(category, (catTotals.get(category) || 0) + amt);
  });

  // 2. Ad-hoc withdrawals
  transactions.forEach(t => {
    if (t.date.startsWith(monthKey) && t.type === 'withdrawal') {
      const category = t.category || 'อื่นๆ';
      catTotals.set(category, (catTotals.get(category) || 0) + t.amount);
    }
  });

  const total = Array.from(catTotals.values()).reduce((a, b) => a + b, 0);
  const fallbackColors = ['#10B981', '#EC4899', '#6366F1', '#F59E0B', '#EAB308', '#06B6D4', '#8B5CF6', '#F97316'];
  let colorIdx = 0;

  const slices: CategoryExpenseSlice[] = [];
  catTotals.forEach((amt, cat) => {
    slices.push({
      name: cat,
      category: cat,
      amount: amt,
      percentage: total > 0 ? (amt / total) * 100 : 0,
      color: CATEGORY_COLORS[cat] || fallbackColors[colorIdx++ % fallbackColors.length],
      icon: CATEGORY_ICONS[cat] || '🏷️',
    });
  });

  return slices.sort((a, b) => b.amount - a.amount);
}
