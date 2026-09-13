import React, { useMemo, useState } from 'react';
import type { HouseholdSettings, MonthlyExpense } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  Receipt,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  PieChart as PieIcon,
  Home,
  Filter,
  Layers,
  AlertCircle,
  AlertTriangle,
  Lock,
  Zap,
  X,
} from 'lucide-react';

const getEffectiveExpenseAmount = (e: MonthlyExpense): number => {
  if (e.amountType === 'variable' && e.currentMonthAmount !== undefined && e.currentMonthAmount > 0) {
    return e.currentMonthAmount;
  }
  return e.amount;
};

interface ExpensesSectionProps {
  expenses: MonthlyExpense[];
  settings: HouseholdSettings;
  onOpenExpenseModal: (expenseToEdit?: MonthlyExpense) => void;
  onDeleteExpense: (id: string) => void;
  onToggleExpensePaid: (id: string) => void;
  onUpdateExpenseBill?: (expenseId: string, actualAmount: number, markAsPaid?: boolean) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'ที่อยู่อาศัย (บ้าน/คอนโด)': '#10B981', // Emerald
  'ยานพาหนะและการเดินทาง': '#0D9488', // Teal
  'สาธารณูปโภค (น้ำ/ไฟ/ส่วนกลาง)': '#F59E0B', // Amber
  'ประกันและสุขภาพ': '#EC4899', // Pink
  'สื่อสารและอินเทอร์เน็ต': '#6366F1', // Indigo
  'ของกินและของใช้ในบ้าน': '#8B5CF6', // Purple
  'การศึกษาและอนาคตลูก': '#0284C7', // Sky Blue
  'บัตรเครดิตและสินเชื่อ': '#EF4444', // Red
  'บันเทิงและไลฟ์สไตล์': '#14B8A6', // Teal
  'อื่นๆ': '#64748B', // Slate
};

const PALETTE = [
  '#10B981', '#0D9488', '#0284C7', '#6366F1',
  '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#14B8A6'
];

export const ExpensesSection: React.FC<ExpensesSectionProps> = ({
  expenses,
  settings,
  onOpenExpenseModal,
  onDeleteExpense,
  onToggleExpensePaid,
  onUpdateExpenseBill,
}) => {
  const [chartViewMode, setChartViewMode] = useState<'category' | 'item'>('category');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [trendViewMode, setTrendViewMode] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('2026-09');

  // Quick Bill Entry Modal state for variable expenses
  const [billModalExpense, setBillModalExpense] = useState<MonthlyExpense | null>(null);
  const [billModalAmount, setBillModalAmount] = useState<string>('');
  const [billModalError, setBillModalError] = useState<string>('');

  const handleOpenBillModal = (exp: MonthlyExpense) => {
    setBillModalExpense(exp);
    const initialAmt = exp.currentMonthAmount !== undefined ? exp.currentMonthAmount : exp.amount;
    setBillModalAmount(initialAmt.toString());
    setBillModalError('');
  };

  const handleCloseBillModal = () => {
    setBillModalExpense(null);
    setBillModalAmount('');
    setBillModalError('');
  };

  const handleConfirmBill = (markAsPaid: boolean) => {
    if (!billModalExpense) return;
    const num = parseFloat(billModalAmount);
    if (isNaN(num) || num < 0) {
      setBillModalError('กรุณาระบุจำนวนเงินที่ถูกต้อง (ตั้งแต่ 0 บาทขึ้นไป)');
      return;
    }
    if (onUpdateExpenseBill) {
      onUpdateExpenseBill(billModalExpense.id, num, markAsPaid);
    }
    handleCloseBillModal();
  };

  const handleStatusToggleClick = (exp: MonthlyExpense) => {
    if (exp.amountType === 'variable' && !exp.isPaidThisMonth) {
      handleOpenBillModal(exp);
    } else {
      onToggleExpensePaid(exp.id);
    }
  };

  const memberA = settings.members.person_a;
  const memberB = settings.members.person_b;

  // Household Income
  const incomeA = memberA.monthlyIncome ?? 45000;
  const incomeB = memberB.monthlyIncome ?? 40000;
  const monthlyHouseholdIncome = settings.householdMonthlyIncome ?? (incomeA + incomeB);

  // Total Monthly Expenses (Effective actual / budget)
  const totalMonthlyExpense = useMemo(() => {
    return expenses.reduce((acc, e) => acc + getEffectiveExpenseAmount(e), 0);
  }, [expenses]);

  // Baseline Budget Total
  const totalBudgetExpense = useMemo(() => {
    return expenses.reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  const expenseVariance = totalMonthlyExpense - totalBudgetExpense;

  // Status Counts
  const paidCount = expenses.filter(e => e.isPaidThisMonth).length;
  const unpaidCount = expenses.filter(e => !e.isPaidThisMonth).length;
  const paidAmount = expenses.filter(e => e.isPaidThisMonth).reduce((a, b) => a + getEffectiveExpenseAmount(b), 0);
  const remainingAmount = totalMonthlyExpense - paidAmount;

  // Breakdown by Payer
  const { jointTotal, payerATotal, payerBTotal } = useMemo(() => {
    let joint = 0;
    let a = 0;
    let b = 0;

    expenses.forEach(e => {
      const amt = getEffectiveExpenseAmount(e);
      if (e.payer === 'joint') joint += amt;
      else if (e.payer === 'person_a') a += amt;
      else if (e.payer === 'person_b') b += amt;
    });

    return { jointTotal: joint, payerATotal: a, payerBTotal: b };
  }, [expenses]);

  // Expense Ratio vs Household Income
  const currentExpenseToIncomeRatio = monthlyHouseholdIncome > 0
    ? (totalMonthlyExpense / monthlyHouseholdIncome) * 100
    : 0;

  // Financial Health Recommendation Helper
  const getHealthStatus = (ratio: number) => {
    if (ratio <= 40) {
      return {
        level: 'healthy',
        badge: '🟢 ปลอดภัยสูง (< 40%)',
        title: 'สภาพคล่องดีเยี่ยม',
        desc: 'ภาระค่าใช้จ่ายคงที่ต่ำกว่า 40% ของรายรับ มีความยืดหยุ่นและเหลือเงินออมสบาย',
        color: 'text-emerald-700 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
      };
    } else if (ratio <= 50) {
      return {
        level: 'moderate',
        badge: '🟡 มาตรฐาน (40-50%)',
        title: 'เป็นไปตามเกณฑ์ 50/30/20',
        desc: 'ค่าใช้จ่ายจำเป็นอยู่ในเกณฑ์ไม่เกิน 50% ของรายรับ บริหารจัดการได้สมดุล',
        color: 'text-amber-700 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
      };
    } else {
      return {
        level: 'warning',
        badge: '🔴 เฝ้าระวัง (> 50%)',
        title: 'ภาระค่าใช้จ่ายค่อนข้างสูง',
        desc: 'ค่าใช้จ่ายประจำคงที่เกิน 50% ของรายรับ แนะนำเฝ้าระวังเพื่อไม่ให้กระทบสภาพคล่องฉุกเฉิน',
        color: 'text-rose-700 dark:text-rose-400',
        bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30',
      };
    }
  };

  // Real historical trend datasets from Je & May's financial spreadsheet (2021 - 2026)
  const HISTORICAL_MONTHS = [
    { key: '2025-10', label: 'ต.ค. 68', expense: 17435.18, income: 62704.50 },
    { key: '2025-11', label: 'พ.ย. 68', expense: 14423.80, income: 53988.70 },
    { key: '2025-12', label: 'ธ.ค. 68', expense: 14363.36, income: 58774.50 },
    { key: '2026-01', label: 'ม.ค. 69', expense: 15590.85, income: 60117.60 },
    { key: '2026-02', label: 'ก.พ. 69', expense: 23278.28, income: 56119.60 },
    { key: '2026-03', label: 'มี.ค. 69', expense: 11805.34, income: 58393.60 },
    { key: '2026-04', label: 'เม.ย. 69', expense: 11763.95, income: 57103.60 },
    { key: '2026-05', label: 'พ.ค. 69', expense: 34848.29, income: 54335.60 },
    { key: '2026-06', label: 'มิ.ย. 69', expense: 24240.92, income: 59539.20 },
    { key: '2026-07', label: 'ก.ค. 69', expense: 39497.46, income: 60852.58 },
    { key: '2026-08', label: 'ส.ค. 69', expense: 35276.41, income: 56983.90 },
    { key: '2026-09', label: 'ก.ย. 69 (ปัจจุบัน)', expense: 32063.40, income: 63100.90 },
  ];

  const HISTORICAL_QUARTERS = [
    { key: '2024-Q4', label: 'Q4/67', expense: 62989.04, income: 152943.40 },
    { key: '2025-Q1', label: 'Q1/68', expense: 57486.36, income: 184109.50 },
    { key: '2025-Q2', label: 'Q2/68', expense: 37922.81, income: 154844.78 },
    { key: '2025-Q3', label: 'Q3/68', expense: 42999.35, income: 166413.00 },
    { key: '2025-Q4', label: 'Q4/68', expense: 46222.34, income: 175467.70 },
    { key: '2026-Q1', label: 'Q1/69', expense: 50674.47, income: 174630.80 },
    { key: '2026-Q2', label: 'Q2/69', expense: 70853.16, income: 170978.40 },
    { key: '2026-Q3', label: 'Q3/69 (ล่าสุด)', expense: 106837.27, income: 180937.38 },
  ];

  const HISTORICAL_YEARS = [
    { key: '2021', label: 'ปี 2564 (7 ด.)', expense: 152025.61, income: 278491.06 },
    { key: '2022', label: 'ปี 2565', expense: 215920.52, income: 377824.36 },
    { key: '2023', label: 'ปี 2566', expense: 206584.88, income: 481523.07 },
    { key: '2024', label: 'ปี 2567 (11 ด.)', expense: 214006.67, income: 507071.10 },
    { key: '2025', label: 'ปี 2568', expense: 184630.86, income: 680834.98 },
    { key: '2026', label: 'ปี 2569 (9 ด.)', expense: 228364.90, income: 526546.58 },
  ];

  // Trend Data for Monthly / Quarterly / Yearly views
  const trendData = useMemo(() => {
    if (trendViewMode === 'monthly') {
      return HISTORICAL_MONTHS.map(m => {
        const isCurrent = m.key === '2026-09';
        const expAmt = isCurrent ? totalMonthlyExpense : m.expense;
        const incAmt = isCurrent ? monthlyHouseholdIncome : m.income;
        const ratio = incAmt > 0 ? Number(((expAmt / incAmt) * 100).toFixed(1)) : 0;
        return {
          label: m.label,
          expense: expAmt,
          income: incAmt,
          ratio,
          surplus: incAmt - expAmt,
        };
      });
    } else if (trendViewMode === 'quarterly') {
      return HISTORICAL_QUARTERS.map(q => {
        const isCurrentQ = q.key === '2026-Q3';
        const expAmt = isCurrentQ
          ? 39497.46 + 35276.41 + totalMonthlyExpense
          : q.expense;
        const incAmt = isCurrentQ
          ? 60852.58 + 56983.90 + monthlyHouseholdIncome
          : q.income;
        const ratio = incAmt > 0 ? Number(((expAmt / incAmt) * 100).toFixed(1)) : 0;
        return {
          label: q.label,
          expense: expAmt,
          income: incAmt,
          ratio,
          surplus: incAmt - expAmt,
        };
      });
    } else {
      return HISTORICAL_YEARS.map(y => {
        const isCurrentY = y.key === '2026';
        const expAmt = isCurrentY
          ? (228364.90 - 32063.40) + totalMonthlyExpense
          : y.expense;
        const incAmt = isCurrentY
          ? (526546.58 - 63100.90) + monthlyHouseholdIncome
          : y.income;
        const ratio = incAmt > 0 ? Number(((expAmt / incAmt) * 100).toFixed(1)) : 0;
        return {
          label: y.label,
          expense: expAmt,
          income: incAmt,
          ratio,
          surplus: incAmt - expAmt,
        };
      });
    }
  }, [totalMonthlyExpense, monthlyHouseholdIncome, trendViewMode]);

  // Unique categories from expenses
  const allUsedCategories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach(e => set.add(e.category));
    return Array.from(set);
  }, [expenses]);

  // Helper to get expense amount for selected month
  const getExpenseAmountForMonth = (e: MonthlyExpense, mKey: string): number => {
    if (mKey === '2026-09') {
      return getEffectiveExpenseAmount(e);
    }
    if (e.amountType === 'fixed') {
      return e.amount;
    }
    if (e.monthlyBills && e.monthlyBills[mKey] !== undefined) {
      return e.monthlyBills[mKey];
    }
    return 0;
  };

  const selectedMonthInfo = useMemo(() => {
    const found = HISTORICAL_MONTHS.find(m => m.key === selectedMonthKey);
    return found || HISTORICAL_MONTHS[HISTORICAL_MONTHS.length - 1];
  }, [selectedMonthKey]);

  const selectedMonthExpenses = useMemo(() => {
    return expenses
      .map(e => ({
        ...e,
        resolvedAmount: getExpenseAmountForMonth(e, selectedMonthKey),
      }))
      .filter(e => e.resolvedAmount > 0);
  }, [expenses, selectedMonthKey]);

  const selectedMonthTotalExpense = useMemo(() => {
    if (selectedMonthKey === '2026-09') {
      return totalMonthlyExpense;
    }
    return selectedMonthExpenses.reduce((acc, e) => acc + e.resolvedAmount, 0);
  }, [selectedMonthKey, selectedMonthExpenses, totalMonthlyExpense]);

  const selectedMonthIncome = useMemo(() => {
    if (selectedMonthKey === '2026-09') {
      return monthlyHouseholdIncome;
    }
    return selectedMonthInfo.income;
  }, [selectedMonthKey, selectedMonthInfo, monthlyHouseholdIncome]);

  const selectedMonthSurplus = selectedMonthIncome - selectedMonthTotalExpense;
  const selectedMonthExpenseRatio = selectedMonthIncome > 0
    ? (selectedMonthTotalExpense / selectedMonthIncome) * 100
    : 0;

  // Chart Data: Either By Category OR By Item (Based on selected month!)
  const chartData = useMemo(() => {
    const totalExp = selectedMonthTotalExpense;

    if (chartViewMode === 'category') {
      const catMap = new Map<string, { amount: number; count: number; icon: string }>();

      selectedMonthExpenses.forEach(e => {
        const cat = e.category || 'อื่นๆ';
        const amt = e.resolvedAmount;
        const existing = catMap.get(cat) || { amount: 0, count: 0, icon: e.icon };
        catMap.set(cat, {
          amount: existing.amount + amt,
          count: existing.count + 1,
          icon: existing.icon,
        });
      });

      const list = Array.from(catMap.entries()).map(([catName, data], idx) => {
        const pct = totalExp > 0 ? (data.amount / totalExp) * 100 : 0;
        return {
          id: `cat-${idx}`,
          name: catName,
          amount: data.amount,
          percent: pct,
          color: CATEGORY_COLORS[catName] || PALETTE[idx % PALETTE.length],
          icon: data.icon || '🏷️',
          count: data.count,
        };
      });

      return list.sort((a, b) => b.amount - a.amount);
    } else {
      return selectedMonthExpenses
        .map((e, idx) => {
          const amt = e.resolvedAmount;
          const pct = totalExp > 0 ? (amt / totalExp) * 100 : 0;
          return {
            id: e.id,
            name: e.title,
            amount: amt,
            percent: pct,
            color: e.color || PALETTE[idx % PALETTE.length],
            icon: e.icon,
            count: 1,
          };
        })
        .sort((a, b) => b.amount - a.amount);
    }
  }, [selectedMonthExpenses, selectedMonthTotalExpense, chartViewMode]);

  // Filtered expenses for table (Filtered by Category AND by Paid/Unpaid Status)
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      // 1. Status Filter
      if (statusFilter === 'unpaid' && e.isPaidThisMonth) return false;
      if (statusFilter === 'paid' && !e.isPaidThisMonth) return false;
      // 2. Category Filter
      if (filterCategory !== 'all' && e.category !== filterCategory) return false;
      return true;
    });
  }, [expenses, statusFilter, filterCategory]);

  // Custom Pie Tooltip
  const CustomExpenseTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-xl text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span>{data.icon} {data.name}</span>
          </div>
          <div className="text-slate-600 dark:text-slate-300">
            ยอดเงิน: <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(data.amount)}</span> ({selectedMonthInfo.label})
          </div>
          <div className="text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] mt-0.5">
            สัดส่วน: {formatPercent(data.percent)} ของค่าใช้จ่ายงวด {selectedMonthInfo.label}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Trend Tooltip
  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl shadow-xl text-xs space-y-1.5 min-w-[210px]">
          <div className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center justify-between">
            <span>{label}</span>
            <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
              {data.ratio}% ของรายรับ
            </span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300 pt-0.5">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-xs bg-emerald-500 inline-block" />
              <span>รายรับครัวเรือน:</span>
            </span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(data.income)}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-xs bg-rose-500 inline-block" />
              <span>ค่าใช้จ่ายประจำ:</span>
            </span>
            <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(data.expense)}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-1">
            <span>💰 คงเหลือสุทธิ:</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(data.surplus)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/90 dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-sm dark:shadow-xl space-y-6 transition-colors">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300/60 dark:border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shadow-sm">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              ค่าใช้จ่ายประจำรายเดือน (Monthly Fixed Expenses)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ติดตามค่าใช้จ่ายคงที่ เช่น ค่าบ้าน ค่ารถ ค่าน้ำไฟ จัดหมวดหมู่และดูสัดส่วนเปอร์เซ็นต์ ({expenses.length} รายการ)
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenExpenseModal()}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มค่าใช้จ่ายประจำ</span>
        </button>
      </div>

      {/* Top 3 Metric Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Metric 1: Total Monthly Expense (Fixed & Variable) */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-slate-950/60 border border-emerald-200/80 dark:border-emerald-500/20">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">
            <span>รวมค่าใช้จ่ายประจำรอบนี้</span>
            <TrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
            {formatCurrency(totalMonthlyExpense)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center justify-between gap-1">
            <span>งบประมาณการ: {formatCurrency(totalBudgetExpense)}</span>
            {expenseVariance !== 0 && (
              <span className={`font-bold ${expenseVariance < 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {expenseVariance < 0 ? `ประหยัด ${formatCurrency(Math.abs(expenseVariance))}` : `เกินงบ +${formatCurrency(expenseVariance)}`}
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: Joint vs Individual Breakdown */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">
            <span>การกระจายภาระชำระ</span>
            <Home className="w-4 h-4 text-teal-600 dark:text-cyan-400" />
          </div>
          <div className="text-xs space-y-1 mt-1">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">🤝 กองกลางหารสอง:</span>
              <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(jointTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-700 dark:text-emerald-400">{memberA.avatar} {memberA.nickname}:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(payerATotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-indigo-700 dark:text-indigo-400">{memberB.avatar} {memberB.nickname}:</span>
              <span className="font-bold text-indigo-700 dark:text-indigo-400">{formatCurrency(payerBTotal)}</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Paid status this month */}
        <div
          onClick={() => setStatusFilter(prev => prev === 'unpaid' ? 'all' : 'unpaid')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
            statusFilter === 'unpaid'
              ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 shadow-sm'
              : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-slate-700'
          }`}
          title="คลิกเพื่อกรองดูเฉพาะรายการที่ยังค้างชำระ"
        >
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">
            <span className="flex items-center gap-1.5">
              <span>สถานะการชำระรอบเดือนนี้</span>
              {unpaidCount > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
            <span>{paidCount} / {expenses.length} รายการ</span>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              {expenses.length > 0 ? formatPercent((paidCount / expenses.length) * 100) : '0%'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
            <span>ชำระแล้ว: {formatCurrency(paidAmount)}</span>
            <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
              {unpaidCount > 0 && <span className="animate-pulse">⚠️</span>}
              ค้างชำระ: {formatCurrency(remainingAmount)}
            </span>
          </div>
        </div>

      </div>

      {/* Visual Chart & Percentage Breakdown Section */}
      <div className="space-y-4 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
        
        {/* Month Selector Bar for Expense Breakdown */}
        <div className="bg-slate-50/80 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300/60 dark:border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <span>เลือกดูสัดส่วนเปอร์เซ็นต์ค่าใช้จ่ายย้อนหลัง</span>
                  {selectedMonthKey !== '2026-09' ? (
                    <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-500/30">
                      ย้อนหลัง: {selectedMonthInfo.label}
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-500/30">
                      เดือนปัจจุบัน
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  สัดส่วนและกราฟวงกลมจะอัปเดตตามเดือนที่เลือกทันที (ประวัติ 12 เดือนล่าสุด)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <select
                value={selectedMonthKey}
                onChange={e => setSelectedMonthKey(e.target.value)}
                className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl font-semibold shadow-2xs focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {[...HISTORICAL_MONTHS].reverse().map(m => (
                  <option key={m.key} value={m.key}>
                    {m.label} • {formatCurrency(m.key === '2026-09' ? totalMonthlyExpense : m.expense)}
                  </option>
                ))}
              </select>

              {selectedMonthKey !== '2026-09' && (
                <button
                  type="button"
                  onClick={() => setSelectedMonthKey('2026-09')}
                  className="text-xs px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition shadow-xs flex items-center gap-1"
                  title="กลับสู่เดือนปัจจุบัน"
                >
                  <span>🔄 เดือนปัจจุบัน</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Month Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {[...HISTORICAL_MONTHS].reverse().map(m => {
              const isSelected = selectedMonthKey === m.key;
              return (
                <button
                  key={`chip-${m.key}`}
                  type="button"
                  onClick={() => setSelectedMonthKey(m.key)}
                  className={`px-3 py-1 rounded-xl whitespace-nowrap transition-all text-[11px] border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-slate-700 font-medium'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Month Operating Surplus (Fund 2) Summary */}
          <div className="bg-white dark:bg-slate-900/90 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-white">
                งวด {selectedMonthInfo.label}:
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                รายรับ {formatCurrency(selectedMonthIncome)}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                หักค่าใช้จ่ายทั้งหมด -{formatCurrency(selectedMonthTotalExpense)} ({formatPercent(selectedMonthExpenseRatio)})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400">คงเหลือสุทธิ (กองทุนที่ 2):</span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">
                {formatCurrency(selectedMonthSurplus)}
              </span>
              <span className="text-[10px] text-slate-400">
                ({formatPercent(selectedMonthIncome > 0 ? (selectedMonthSurplus / selectedMonthIncome) * 100 : 0)})
              </span>
            </div>
          </div>
        </div>

        {/* Charts & Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 1. Donut Chart (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50/70 dark:bg-slate-950/50 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
            <div className="w-full flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <PieIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>สัดส่วนค่าใช้จ่าย ({selectedMonthInfo.label})</span>
              </h4>

              {/* View Mode Toggle: Category vs Item */}
              <div className="inline-flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] shadow-sm">
                <button
                  type="button"
                  onClick={() => setChartViewMode('category')}
                  className={`px-2.5 py-1 rounded-lg transition font-medium ${
                    chartViewMode === 'category'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  ตามหมวดหมู่
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('item')}
                  className={`px-2.5 py-1 rounded-lg transition font-medium ${
                    chartViewMode === 'item'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  ตามรายการ
                </button>
              </div>
            </div>

            <div className="relative h-56 w-full flex items-center justify-center">
              {selectedMonthExpenses.length === 0 ? (
                <div className="text-xs text-slate-400">ไม่มีรายการค่าใช้จ่ายในงวดนี้</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<CustomExpenseTooltip />} />
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={84}
                        paddingAngle={3}
                        dataKey="amount"
                        stroke="none"
                      >
                        {chartData.map(entry => (
                          <Cell key={`exp-cell-${entry.id}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                      {selectedMonthInfo.label}
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(selectedMonthTotalExpense)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {selectedMonthExpenses.length} รายการ
                    </span>
                  </div>
                </>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-1">
              {chartViewMode === 'category' ? '💡 สัดส่วนรวมตามหมวดหมู่' : '💡 สัดส่วนจำแนกรายชื่อรายการ'} (งวด {selectedMonthInfo.label})
            </p>
          </div>

          {/* 2. Percentage Progress Bars (7 cols) */}
          <div className="lg:col-span-7 bg-slate-50/70 dark:bg-slate-950/50 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 flex flex-col justify-center space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                แจกแจงสัดส่วนเปอร์เซ็นต์ {chartViewMode === 'category' ? '(ตามหมวดหมู่)' : '(ตามรายการ)'} • {selectedMonthInfo.label}
              </h4>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {chartData.length} กลุ่ม
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-60 pr-1">
              {chartData.map(item => (
                <div key={`breakdown-${item.id}`} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate max-w-[240px]">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span>{item.icon}</span>
                      <span className="truncate">{item.name}</span>
                      {chartViewMode === 'category' && item.count > 1 && (
                        <span className="text-[10px] text-slate-400 font-normal">({item.count} รายการ)</span>
                      )}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(item.amount)}</span>
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400 w-14 text-right">
                        {formatPercent(item.percent)}
                      </span>
                    </div>
                  </div>

                  {/* Bar */}
                  <div className="h-2 w-full bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percent}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* 2. Monthly Recurring Expense-to-Income Trend Analytics */}
      <div className="bg-slate-50/70 dark:bg-slate-950/50 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 space-y-4">
        
        {/* Header & View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/70 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-500/10 border border-amber-300/60 dark:border-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                แนวโน้มค่าใช้จ่ายประจำคิดเป็น % ของรายรับ (Expense-to-Income Trend)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                วิเคราะห์สัดส่วนภาระค่าใช้จ่ายคงที่เทียบกับรายรับรวมครัวเรือน เพื่อสุขภาพทางการเงินที่ยั่งยืน
              </p>
            </div>
          </div>

          {/* 3 View Mode Switcher: รายเดือน, รายไตรมาส, รายปี */}
          <div className="inline-flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTrendViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg transition font-semibold flex items-center gap-1 ${
                trendViewMode === 'monthly'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>📅</span>
              <span>รายเดือน</span>
            </button>
            <button
              type="button"
              onClick={() => setTrendViewMode('quarterly')}
              className={`px-3 py-1.5 rounded-lg transition font-semibold flex items-center gap-1 ${
                trendViewMode === 'quarterly'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>📊</span>
              <span>รายไตรมาส</span>
            </button>
            <button
              type="button"
              onClick={() => setTrendViewMode('yearly')}
              className={`px-3 py-1.5 rounded-lg transition font-semibold flex items-center gap-1 ${
                trendViewMode === 'yearly'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🗓️</span>
              <span>รายปี</span>
            </button>
          </div>
        </div>

        {/* Trend Composed Chart (Bar + Line) */}
        <div className="h-64 sm:h-72 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData} margin={{ top: 12, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
              />
              <YAxis
                yAxisId="left"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#F59E0B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip content={<CustomTrendTooltip />} />
              <Bar
                yAxisId="left"
                dataKey="income"
                name="รายรับรวมครัวเรือน"
                fill="#10B981"
                radius={[5, 5, 0, 0]}
                maxBarSize={34}
              />
              <Bar
                yAxisId="left"
                dataKey="expense"
                name="ค่าใช้จ่ายประจำ"
                fill="#F43F5E"
                radius={[5, 5, 0, 0]}
                maxBarSize={34}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ratio"
                name="% สัดส่วนของรายรับ"
                stroke="#F59E0B"
                strokeWidth={3.5}
                dot={{ r: 4, fill: '#F59E0B', strokeWidth: 2, stroke: '#FFFFFF' }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Chart Color Legend: Green Income, Red Expense, Orange Line % */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-1 pb-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
            <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block shadow-xs" />
            <span>แท่งเขียว = รายรับ</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
            <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block shadow-xs" />
            <span>แท่งแดง = รายจ่าย</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
            <span className="w-4 h-1 bg-amber-500 inline-block rounded-full shadow-xs" />
            <span>เส้นสีส้ม = สัดส่วน % ของรายรับ</span>
          </div>
        </div>

        {/* 4 Financial Health KPI Summary Badges */}
        {(() => {
          const health = getHealthStatus(currentExpenseToIncomeRatio);
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">สัดส่วนค่าใช้จ่ายต่อรายรับ</div>
                <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
                  {formatPercent(currentExpenseToIncomeRatio)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">เกณฑ์สากลไม่ควรเกิน 50%</div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">รายรับรวมครัวเรือน / เดือน</div>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {formatCurrency(monthlyHouseholdIncome)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {memberA.nickname}: {formatCurrency(incomeA)} • {memberB.nickname}: {formatCurrency(incomeB)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">เงินคงเหลือสุทธิก่อนออม</div>
                <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(monthlyHouseholdIncome - totalMonthlyExpense)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">สำหรับกินใช้และหยอดกระปุก</div>
              </div>

              <div className={`p-3 rounded-xl border shadow-2xs ${health.bg}`}>
                <div className="text-[11px] font-bold flex items-center justify-between mb-0.5">
                  <span className={health.color}>{health.badge}</span>
                </div>
                <div className={`font-bold text-xs ${health.color}`}>{health.title}</div>
                <div className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5 leading-tight">
                  {health.desc}
                </div>
              </div>

            </div>
          );
        })()}

      </div>

      {/* Interactive Expense Data Table with Status & Category Filter */}
      <div className="space-y-3 pt-2">
        
        {/* Table Filter Bar: Status Tabs (All, Unpaid, Paid) & Category Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>ทั้งหมด</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700">
                {expenses.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('unpaid')}
              className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 ${
                statusFilter === 'unpaid'
                  ? 'bg-rose-600 text-white font-bold shadow-xs'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
              }`}
            >
              {unpaidCount > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
              <span>ยังไม่จ่าย</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === 'unpaid' ? 'bg-rose-700 text-white' : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
              }`}>
                {unpaidCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 ${
                statusFilter === 'paid'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>จ่ายแล้ว</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === 'paid' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
              }`}>
                {paidCount}
              </span>
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 text-xs self-end sm:self-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">🏷️ ทุกหมวดหมู่ ({expenses.length})</option>
              {allUsedCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-400">
              (แสดง {filteredExpenses.length} รายการ)
            </span>
          </div>

        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800/90 shadow-sm dark:shadow-inner">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <th scope="col" className="py-3 px-4 w-12 text-center">สถานะ</th>
                <th scope="col" className="py-3 px-4">รายการค่าใช้จ่าย</th>
                <th scope="col" className="py-3 px-4">หมวดหมู่</th>
                <th scope="col" className="py-3 px-4">กำหนดชำระ</th>
                <th scope="col" className="py-3 px-4">ผู้รับผิดชอบ</th>
                <th scope="col" className="py-3 px-4 text-right">ยอดเงิน/เดือน</th>
                <th scope="col" className="py-3 px-4 text-right">สัดส่วน %</th>
                <th scope="col" className="py-3 px-4 text-center w-20">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-xs">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    ไม่พบรายการในเงื่อนไขการกรองนี้
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp, idx) => {
                  const effAmt = getEffectiveExpenseAmount(exp);
                  const pct = totalMonthlyExpense > 0 ? (effAmt / totalMonthlyExpense) * 100 : 0;
                  const isJoint = exp.payer === 'joint';
                  const isPersonA = exp.payer === 'person_a';
                  const isVariable = exp.amountType === 'variable';

                  return (
                    <tr
                      key={exp.id}
                      className={`hover:bg-emerald-50/50 dark:hover:bg-slate-800/40 transition duration-150 group ${
                        !exp.isPaidThisMonth
                          ? 'bg-rose-50/25 dark:bg-rose-950/10'
                          : idx % 2 === 0
                          ? 'bg-white dark:bg-slate-900/40'
                          : 'bg-slate-50/60 dark:bg-slate-950/20'
                      }`}
                    >
                      {/* Status Toggle (Paid / Unpaid) with Blinking Warning Beacon */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleStatusToggleClick(exp)}
                          title={
                            exp.isPaidThisMonth
                              ? 'ชำระแล้วในรอบเดือนนี้ (คลิกเพื่อเปลี่ยนเป็นยังไม่ชำระ)'
                              : isVariable
                              ? '⚡ บิลผันแปร: คลิกเพื่อตรวจสอบยอดและชำระเงิน'
                              : '⚠️ ยังไม่ได้ชำระ! คลิกเพื่อทำเครื่องหมายว่าชำระแล้ว'
                          }
                          className="transition transform active:scale-90 inline-flex items-center justify-center p-1 rounded-full"
                        >
                          {exp.isPaidThisMonth ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500" />
                          ) : (
                            <span className="relative flex h-5 w-5 items-center justify-center">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60"></span>
                              <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 animate-pulse" />
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Title & Note with Type Badge & Blinking Alert */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{exp.icon}</span>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white">{exp.title}</span>

                              {/* Expense Type Badge: Fixed vs Variable */}
                              {isVariable ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
                                  <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                  ผันแปร
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50">
                                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                                  คงที่
                                </span>
                              )}

                              {!exp.isPaidThisMonth ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-300 dark:border-rose-800/80 animate-pulse shadow-2xs">
                                  <AlertTriangle className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400 animate-bounce" />
                                  ยังไม่จ่าย
                                </span>
                              ) : (
                                <span className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                                  ✓ จ่ายแล้ว
                                </span>
                              )}
                            </div>
                            {exp.note && <div className="text-[11px] text-slate-500 dark:text-slate-400">{exp.note}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-slate-800 text-emerald-800 dark:text-slate-300 border border-emerald-200 dark:border-slate-700 text-[11px] font-medium">
                          <Layers className="w-3 h-3 text-emerald-600 dark:text-slate-400" />
                          <span>{exp.category}</span>
                        </span>
                      </td>

                      {/* Due Day */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {exp.dueDay ? (
                          <span className="flex items-center gap-1 text-[11px]">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            ทุกวันที่ {exp.dueDay}
                          </span>
                        ) : '-'}
                      </td>

                      {/* Payer Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isJoint ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/20">
                            🤝 กองกลาง
                          </span>
                        ) : isPersonA ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/20">
                            <span>{memberA.avatar}</span>
                            <span>{memberA.nickname}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-indigo-100/70 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-500/20">
                            <span>{memberB.avatar}</span>
                            <span>{memberB.nickname}</span>
                          </span>
                        )}
                      </td>

                      {/* Amount & Variance */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                          {formatCurrency(effAmt)}
                        </div>
                        {isVariable ? (
                          <div className="mt-0.5 space-y-0.5">
                            {exp.currentMonthAmount !== undefined ? (
                              (() => {
                                const diff = exp.currentMonthAmount - exp.amount;
                                return (
                                  <div className="text-[10px]">
                                    {diff < 0 ? (
                                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                        ประหยัด {formatCurrency(Math.abs(diff))} (งบ {formatCurrency(exp.amount)})
                                      </span>
                                    ) : diff > 0 ? (
                                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                        เกินงบ +{formatCurrency(diff)} (งบ {formatCurrency(exp.amount)})
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-medium">ตรงตามงบ {formatCurrency(exp.amount)}</span>
                                    )}
                                  </div>
                                );
                              })()
                            ) : (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                ~{formatCurrency(exp.amount)} (งบประมาณการ)
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenBillModal(exp)}
                              className="inline-flex items-center gap-0.5 text-[10px] text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-semibold hover:underline"
                            >
                              <span>✏️ บันทึกบิลรอบนี้</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">คงที่ทุกเดือน</div>
                        )}
                      </td>

                      {/* Percentage % */}
                      <td className="py-3 px-4 whitespace-nowrap text-right font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                        {formatPercent(pct)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          {isVariable && (
                            <button
                              onClick={() => handleOpenBillModal(exp)}
                              title="บันทึกยอดบิลรอบนี้"
                              className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition"
                            >
                              <Zap className="w-3.5 h-3.5 fill-amber-500/30" />
                            </button>
                          )}
                          <button
                            onClick={() => onOpenExpenseModal(exp)}
                            title="แก้ไขรายการ"
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteExpense(exp.id)}
                            title="ลบรายการ"
                            className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition"
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
            {/* Table Footer */}
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-300">
                <td colSpan={5} className="py-3 px-4 text-slate-600 dark:text-slate-400">
                  รวมยอดรายการ ({filteredExpenses.length} รายการ)
                </td>
                <td className="py-3 px-4 text-right font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">
                  {formatCurrency(filteredExpenses.reduce((a, b) => a + getEffectiveExpenseAmount(b), 0))}
                </td>
                <td className="py-3 px-4 text-right font-extrabold text-emerald-700 dark:text-emerald-400 text-xs">
                  {formatPercent(totalMonthlyExpense > 0 ? (filteredExpenses.reduce((a, b) => a + getEffectiveExpenseAmount(b), 0) / totalMonthlyExpense) * 100 : 0)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

      </div>

      {/* Quick Bill Entry Modal for Variable Expenses */}
      {billModalExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl p-6 overflow-hidden transition-colors">
            
            <button
              onClick={handleCloseBillModal}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center text-xl">
                {billModalExpense.icon}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>บันทึกบิลรอบนี้:</span>
                  <span className="text-amber-600 dark:text-amber-400">{billModalExpense.title}</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  งบประมาณการเฉลี่ย: {formatCurrency(billModalExpense.amount)} / เดือน
                </p>
              </div>
            </div>

            {billModalError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium">
                {billModalError}
              </div>
            )}

            <div className="space-y-3 py-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ยอดตามบิลจริงของรอบเดือนนี้ (THB) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-500">
                    ฿
                  </span>
                  <input
                    type="number"
                    step="any"
                    autoFocus
                    required
                    placeholder={billModalExpense.amount.toString()}
                    value={billModalAmount}
                    onChange={e => setBillModalAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold text-lg rounded-xl pl-8 pr-3 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Quick Adjust Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] text-slate-400 mr-1">ทางลัด:</span>
                <button
                  type="button"
                  onClick={() => setBillModalAmount(billModalExpense.amount.toString())}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] hover:bg-slate-200 transition"
                >
                  ตามงบ ({formatCurrency(billModalExpense.amount)})
                </button>
                {[-500, -100, +100, +500].map(diff => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(billModalAmount) || billModalExpense.amount;
                      const next = Math.max(0, cur + diff);
                      setBillModalAmount(next.toString());
                    }}
                    className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] hover:bg-amber-100 transition"
                  >
                    {diff > 0 ? `+${diff}` : diff}
                  </button>
                ))}
              </div>

              {/* Comparison Preview */}
              {(() => {
                const num = parseFloat(billModalAmount);
                if (!isNaN(num)) {
                  const diff = num - billModalExpense.amount;
                  return (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                      <span className="text-slate-500">เปรียบเทียบกับงบ:</span>
                      {diff < 0 ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                          🟢 ประหยัดได้ {formatCurrency(Math.abs(diff))}
                        </span>
                      ) : diff > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                          🔴 เกินงบ +{formatCurrency(diff)}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-medium">⚪ เท่ากับงบพอดี</span>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => handleConfirmBill(true)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>บันทึกและชำระแล้ว ✅</span>
              </button>

              <button
                type="button"
                onClick={() => handleConfirmBill(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition active:scale-95"
              >
                บันทึกยอดอย่างเดียว ⏳
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
