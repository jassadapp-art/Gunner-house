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
  netSavings: number;       // เงินเหลือจากการคำนวณ (รายรับ-รายจ่าย)
  cumulativeSavings: number;// เงินเหลือสะสม

  // 1. Data from Savings Page (Passbook): Request 1: "กราฟแนวโน้มใช้ข้อมูลของหน้าเงินออม"
  savingsDeposit: number;   // ยอดฝากเข้าเงินออมประจำช่วง
  savingsWithdrawal: number;// ยอดถอนเงินออมประจำช่วง
  savingsNet: number;       // เงินออมสุทธิประจำช่วง (ฝาก - ถอน จากหน้าเงินออม)
  savingsEndingBalance: number; // ยอดเงินออมสะสมจริง ณ สิ้นช่วง จากสมุดบัญชีเงินออม

  expenseRatio: number;     // % รายจ่ายรวมต่อรายรับ
  savingsRatio: number;     // % เงินออมต่อรายรับ

  // 2. Credit Card: Request 2: "แสดงทั้งรายจ่ายต่อเดือน และ % ต่อรายรับ"
  creditCardKtc: number;    // บัตร KTC
  creditCardTtb: number;    // บัตร TTB
  creditCardTotal: number;  // รวมยอดบัตรเครดิต
  creditCardRatio: number;  // % บัตรเครดิตต่อรายรับ

  // 3. Electricity & Rent: Request 3: "เพิ่ม แท่งรายจ่าย และเพิ่มค่าห้องเข้าไปด้วย พร้อมทั้งมีเส้น % ทั้งสอง"
  electricityBill: number;  // ค่าไฟ (บาท)
  electricityRatio: number; // % ค่าไฟต่อรายรับ
  rentBill: number;         // ค่าห้อง/ค่าที่พัก (บาท)
  rentRatio: number;        // % ค่าห้องต่อรายรับ
  utilitiesTotal: number;   // รวมค่าไฟ + ค่าห้อง
  utilitiesRatio: number;   // % รวมที่อยู่อาศัยต่อรายรับ

  // 4. Fuel: Request 4: "เพิ่มกราฟเปรียบเทียบค่าน้ำมันแต่ละเดือน พร้อม % รายรับ"
  fuelBill: number;         // ค่าน้ำมัน (บาท)
  fuelRatio: number;        // % ค่าน้ำมันต่อรายรับ
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
 * Build Passbook Monthly Map matching SavingsView exact running balances
 * แสดงเฉพาะเงินออมจริง ไม่เอาเป้าหมายมาคำนวณด้วย
 */
export function buildPassbookMonthlyMap(transactions: Transaction[]) {
  const pureSavings = transactions.filter(
    t => t.type !== 'goal_allocation' && !t.goalId && !t.note?.includes('หยอดเงินเข้าเป้าหมาย')
  );

  const sorted = [...pureSavings].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateA - dateB;

    const idA = parseInt(String(a.id || '').replace(/\D/g, ''), 10) || 0;
    const idB = parseInt(String(b.id || '').replace(/\D/g, ''), 10) || 0;
    if (idA !== idB) return idA - idB;

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const monthMap = new Map<string, { deposits: number; withdrawals: number; net: number; balance: number }>();
  let currentBalance = 0;

  sorted.forEach(t => {
    const isWithdrawal = t.type === 'withdrawal';
    const delta = isWithdrawal ? -t.amount : t.amount;
    currentBalance += delta;

    const mKey = t.date.slice(0, 7);
    const existing = monthMap.get(mKey);
    if (!existing) {
      monthMap.set(mKey, {
        deposits: !isWithdrawal ? t.amount : 0,
        withdrawals: isWithdrawal ? t.amount : 0,
        net: delta,
        balance: Math.round(currentBalance * 100) / 100,
      });
    } else {
      if (!isWithdrawal) existing.deposits += t.amount;
      else existing.withdrawals += t.amount;
      existing.net += delta;
      existing.balance = Math.round(currentBalance * 100) / 100;
    }
  });

  return { sorted, monthMap, latestBalance: Math.round(currentBalance * 100) / 100 };
}

/**
 * Build unified metrics history supporting:
 * - 'monthly' (รายเดือน: 6 เดือน, 12 เดือน, หรือทั้งหมด)
 * - 'quarterly' (รายไตรมาส: Q1, Q2, Q3, Q4)
 * - 'yearly' (รายปี: 2021..2026)
 * Incorporates:
 * 1. Savings data directly from the Savings Passbook (Request 1)
 * 2. Credit Card payments & ratio (Request 2)
 * 3. Electricity & Rent bills with both % ratios (Request 3)
 * 4. Fuel expenses & fuel ratio (Request 4)
 */
export function buildAnalyticsMetricsHistory(
  settings: HouseholdSettings,
  expenses: MonthlyExpense[],
  transactions: Transaction[],
  timeframe: 'monthly' | 'quarterly' | 'yearly' = 'monthly',
  rangeOption: number | 'all' = 6
): AnalyticsMetricPoint[] {
  const allMonths = getAllAvailableMonthKeys(settings, expenses, transactions);
  const passbookData = buildPassbookMonthlyMap(transactions);

  const baseIncomeA = settings.members.person_a.monthlyIncome || 40250;
  const baseIncomeB = settings.members.person_b.monthlyIncome || 22850.90;

  let lastKnownPassbookBalance = 0;

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
    let fuelBill = 0;

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
      if (e.id === 'exp-rent' || e.title.includes('ที่พัก') || e.title.includes('ค่าห้อง') || e.title.includes('เช่า')) {
        rentBill += amt;
      }
      // User Request 2: "กราฟน้ำมันไม่ต้องเอาเงินเดือนแม่มาคิด"
      if ((e.id === 'exp-fuel' || e.title.includes('น้ำมัน')) && !e.title.includes('แม่') && e.id !== 'exp-mom') {
        let fuelAmt = amt;
        // Deduct 10,000 if mother's salary was mistakenly combined with fuel
        if (fuelAmt >= 10000 && (fuelAmt === 13000 || fuelAmt === 10000 || (e.note && e.note.includes('แม่')))) {
          fuelAmt = Math.max(0, fuelAmt - 10000);
        }
        fuelBill += fuelAmt;
      }
    });

    let adhocExpenses = 0;
    transactions.forEach(t => {
      if (t.date.startsWith(mKey) && t.type === 'withdrawal') {
        adhocExpenses += t.amount;

        const text = `${t.note || ''} ${t.withdrawalReason || ''} ${t.category || ''}`;
        // User Request 2: "กราฟน้ำมันไม่ต้องเอาเงินเดือนแม่มาคิด"
        // Exclude purely mother related transactions ("จ่ายเงินคืนแม่", "เงินเดือนแม่")
        if (text.includes('น้ำมัน') && !text.includes('จ่ายเงินคืนแม่')) {
          const momDeduction = text.includes('แม่') ? 10000 : 0;
          const netFuel = Math.max(0, t.amount - momDeduction);
          fuelBill += netFuel;
        }
      }
    });

    const totalExpenses = fixedExpenses + adhocExpenses;
    const netSavings = totalIncome - totalExpenses;
    const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
    const savingsRatio = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    const creditCardTotal = creditCardKtc + creditCardTtb;
    const creditCardRatio = totalIncome > 0 ? (creditCardTotal / totalIncome) * 100 : 0;

    const electricityRatio = totalIncome > 0 ? (electricityBill / totalIncome) * 100 : 0;
    const rentRatio = totalIncome > 0 ? (rentBill / totalIncome) * 100 : 0;
    const utilitiesTotal = electricityBill + rentBill;
    const utilitiesRatio = totalIncome > 0 ? (utilitiesTotal / totalIncome) * 100 : 0;

    const fuelRatio = totalIncome > 0 ? (fuelBill / totalIncome) * 100 : 0;

    // Passbook Savings Data from Savings Page
    const pbEntry = passbookData.monthMap.get(mKey);
    let savingsDeposit = 0;
    let savingsWithdrawal = 0;
    let savingsNet = 0;
    if (pbEntry) {
      savingsDeposit = pbEntry.deposits;
      savingsWithdrawal = pbEntry.withdrawals;
      savingsNet = pbEntry.net;
      lastKnownPassbookBalance = pbEntry.balance;
    }
    const savingsEndingBalance = lastKnownPassbookBalance;

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
      savingsDeposit,
      savingsWithdrawal,
      savingsNet,
      savingsEndingBalance,
      expenseRatio,
      savingsRatio,
      creditCardKtc,
      creditCardTtb,
      creditCardTotal,
      creditCardRatio,
      electricityBill,
      electricityRatio,
      rentBill,
      rentRatio,
      utilitiesTotal,
      utilitiesRatio,
      fuelBill,
      fuelRatio,
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
          savingsDeposit: m.savingsDeposit,
          savingsWithdrawal: m.savingsWithdrawal,
          savingsNet: m.savingsNet,
          savingsEndingBalance: m.savingsEndingBalance,
          expenseRatio: 0,
          savingsRatio: 0,
          creditCardKtc: m.creditCardKtc,
          creditCardTtb: m.creditCardTtb,
          creditCardTotal: m.creditCardTotal,
          creditCardRatio: 0,
          electricityBill: m.electricityBill,
          electricityRatio: 0,
          rentBill: m.rentBill,
          rentRatio: 0,
          utilitiesTotal: m.utilitiesTotal,
          utilitiesRatio: 0,
          fuelBill: m.fuelBill,
          fuelRatio: 0,
        });
      } else {
        existing.incomeA += m.incomeA;
        existing.incomeB += m.incomeB;
        existing.totalIncome += m.totalIncome;
        existing.fixedExpenses += m.fixedExpenses;
        existing.adhocExpenses += m.adhocExpenses;
        existing.totalExpenses += m.totalExpenses;
        existing.netSavings += m.netSavings;
        existing.savingsDeposit += m.savingsDeposit;
        existing.savingsWithdrawal += m.savingsWithdrawal;
        existing.savingsNet += m.savingsNet;
        existing.savingsEndingBalance = m.savingsEndingBalance; // End of quarter balance
        existing.creditCardKtc += m.creditCardKtc;
        existing.creditCardTtb += m.creditCardTtb;
        existing.creditCardTotal += m.creditCardTotal;
        existing.electricityBill += m.electricityBill;
        existing.rentBill += m.rentBill;
        existing.utilitiesTotal += m.utilitiesTotal;
        existing.fuelBill += m.fuelBill;
      }
    });

    let qList = Array.from(qMap.values()).map(q => {
      const expenseRatio = q.totalIncome > 0 ? (q.totalExpenses / q.totalIncome) * 100 : 0;
      const savingsRatio = q.totalIncome > 0 ? (q.netSavings / q.totalIncome) * 100 : 0;
      const creditCardRatio = q.totalIncome > 0 ? (q.creditCardTotal / q.totalIncome) * 100 : 0;
      const electricityRatio = q.totalIncome > 0 ? (q.electricityBill / q.totalIncome) * 100 : 0;
      const rentRatio = q.totalIncome > 0 ? (q.rentBill / q.totalIncome) * 100 : 0;
      const utilitiesRatio = q.totalIncome > 0 ? (q.utilitiesTotal / q.totalIncome) * 100 : 0;
      const fuelRatio = q.totalIncome > 0 ? (q.fuelBill / q.totalIncome) * 100 : 0;
      return {
        ...q,
        expenseRatio,
        savingsRatio,
        creditCardRatio,
        electricityRatio,
        rentRatio,
        utilitiesRatio,
        fuelRatio,
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
        savingsDeposit: m.savingsDeposit,
        savingsWithdrawal: m.savingsWithdrawal,
        savingsNet: m.savingsNet,
        savingsEndingBalance: m.savingsEndingBalance,
        expenseRatio: 0,
        savingsRatio: 0,
        creditCardKtc: m.creditCardKtc,
        creditCardTtb: m.creditCardTtb,
        creditCardTotal: m.creditCardTotal,
        creditCardRatio: 0,
        electricityBill: m.electricityBill,
        electricityRatio: 0,
        rentBill: m.rentBill,
        rentRatio: 0,
        utilitiesTotal: m.utilitiesTotal,
        utilitiesRatio: 0,
        fuelBill: m.fuelBill,
        fuelRatio: 0,
      });
    } else {
      existing.incomeA += m.incomeA;
      existing.incomeB += m.incomeB;
      existing.totalIncome += m.totalIncome;
      existing.fixedExpenses += m.fixedExpenses;
      existing.adhocExpenses += m.adhocExpenses;
      existing.totalExpenses += m.totalExpenses;
      existing.netSavings += m.netSavings;
      existing.savingsDeposit += m.savingsDeposit;
      existing.savingsWithdrawal += m.savingsWithdrawal;
      existing.savingsNet += m.savingsNet;
      existing.savingsEndingBalance = m.savingsEndingBalance; // End of year balance
      existing.creditCardKtc += m.creditCardKtc;
      existing.creditCardTtb += m.creditCardTtb;
      existing.creditCardTotal += m.creditCardTotal;
      existing.electricityBill += m.electricityBill;
      existing.rentBill += m.rentBill;
      existing.utilitiesTotal += m.utilitiesTotal;
      existing.fuelBill += m.fuelBill;
    }
  });

  let yList = Array.from(yMap.values()).map(y => {
    const expenseRatio = y.totalIncome > 0 ? (y.totalExpenses / y.totalIncome) * 100 : 0;
    const savingsRatio = y.totalIncome > 0 ? (y.netSavings / y.totalIncome) * 100 : 0;
    const creditCardRatio = y.totalIncome > 0 ? (y.creditCardTotal / y.totalIncome) * 100 : 0;
    const electricityRatio = y.totalIncome > 0 ? (y.electricityBill / y.totalIncome) * 100 : 0;
    const rentRatio = y.totalIncome > 0 ? (y.rentBill / y.totalIncome) * 100 : 0;
    const utilitiesRatio = y.totalIncome > 0 ? (y.utilitiesTotal / y.totalIncome) * 100 : 0;
    const fuelRatio = y.totalIncome > 0 ? (y.fuelBill / y.totalIncome) * 100 : 0;
    return {
      ...y,
      expenseRatio,
      savingsRatio,
      creditCardRatio,
      electricityRatio,
      rentRatio,
      utilitiesRatio,
      fuelRatio,
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
    if (e.id === 'exp-electricity' || e.id === 'exp-rent') {
      category = 'ที่อยู่อาศัย (บ้าน/คอนโด)';
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
