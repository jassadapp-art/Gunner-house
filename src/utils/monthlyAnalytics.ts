import type { HouseholdSettings, MonthlyExpense, Transaction } from '../types';
import { getMonthLabel } from './formatters';

export interface MonthlyMetricPoint {
  monthKey: string;      // 'YYYY-MM'
  label: string;         // 'ก.ย. 69'
  incomeA: number;       // รายได้เจ
  incomeB: number;       // รายได้เมย์
  totalIncome: number;   // รายได้รวม
  fixedExpenses: number; // รายจ่ายประจำ
  adhocExpenses: number; // รายจ่ายพิเศษ/ถอน
  totalExpenses: number; // รายจ่ายรวม
  netSavings: number;    // เงินเหลือ/เงินออมสุทธิ
  expenseRatio: number;  // % รายจ่ายต่อรายรับ
  savingsRatio: number;  // % เงินออมต่อรายรับ
  creditCardKtc: number; // บัตร KTC
  creditCardTtb: number; // บัตร TTB
  creditCardTotal: number; // รวมบัตรเครดิต
  creditCardRatio: number; // % บัตรเครดิตต่อรายรับ
  electricityBill: number; // ค่าไฟ
  rentBill: number;      // ค่าที่พัก
}

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

export function buildMonthlyMetricsHistory(
  settings: HouseholdSettings,
  expenses: MonthlyExpense[],
  transactions: Transaction[],
  monthsCount: number = 6
): MonthlyMetricPoint[] {
  const result: MonthlyMetricPoint[] = [];

  // Determine months range ending at current/latest month
  const now = new Date();
  const monthKeys: string[] = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthKeys.push(key);
  }

  // Base individual incomes
  const baseIncomeA = settings.members.person_a.monthlyIncome || 40250;
  const baseIncomeB = settings.members.person_b.monthlyIncome || 22850.90;

  monthKeys.forEach(mKey => {
    // 1. Income for month
    const customIncome = settings.monthlyIncomes?.[mKey];
    let incomeA = customIncome?.person_a !== undefined ? customIncome.person_a : baseIncomeA;
    let incomeB = customIncome?.person_b !== undefined ? customIncome.person_b : baseIncomeB;
    let extraOther = customIncome?.other ?? 0;

    // Check for ad-hoc income transactions in that month
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

    // 2. Expenses for month
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

    // Ad-hoc withdrawals in month
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

    result.push({
      monthKey: mKey,
      label: getMonthLabel(mKey),
      incomeA,
      incomeB,
      totalIncome,
      fixedExpenses,
      adhocExpenses,
      totalExpenses,
      netSavings,
      expenseRatio,
      savingsRatio,
      creditCardKtc,
      creditCardTtb,
      creditCardTotal,
      creditCardRatio,
      electricityBill,
      rentBill,
    });
  });

  return result;
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
