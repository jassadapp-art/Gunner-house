import React, { useState, useMemo, useEffect } from 'react';
import type { HouseholdSettings, MonthlyExpense, Transaction } from '../types';
import {
  formatCurrency,
  formatSpreadsheetMonth,
  formatCurrencySpreadsheet,
  getCurrentYearMonth,
  getMonthLabel,
} from '../utils/formatters';
import { getExpenseAmountForMonth, getExpenseEstimatedAmount } from '../utils/monthlyAnalytics';
import {
  Calendar,
  Receipt,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Search,
  PlusCircle,
  ArrowUpDown,
  SlidersHorizontal,
  Table,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

interface MonthlyLedgerViewProps {
  settings: HouseholdSettings;
  expenses: MonthlyExpense[];
  transactions: Transaction[];
  onOpenExpenseModal: (expense?: MonthlyExpense | null) => void;
  onOpenAddTransactionModal: (type?: 'deposit' | 'withdrawal', category?: string) => void;
  onToggleExpensePaid: (expenseId: string) => void;
  onUpdateExpenseBill: (expenseId: string, amount: number, markAsPaid?: boolean) => void;
  onUpdateExpenseEstimatedAmount?: (expenseId: string, amount: number) => void;
  onUpdateMonthlyIncome?: (
    monthKey: string,
    data: { person_a?: number; person_b?: number; other?: number; note?: string }
  ) => void;
  onDeleteExpense: (expenseId: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onForceResetNewMonth: () => void;
}

interface MonthIncomeData {
  index: number;
  monthKey: string;
  monthLabel: string;
  person_a: number;
  person_b: number;
  other: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}

interface MonthExpenseData {
  index: number;
  monthKey: string;
  monthLabel: string;
  estimatedTotal: number;
  actualTotal: number;
  difference: number;
  items: Record<string, number>;
  adhocTotal: number;
  paidCount: number;
  totalBills: number;
}

export const MonthlyLedgerView: React.FC<MonthlyLedgerViewProps> = ({
  settings,
  expenses,
  transactions,
  onOpenExpenseModal,
  onOpenAddTransactionModal,
  onToggleExpensePaid,
  onUpdateExpenseBill,
  onUpdateExpenseEstimatedAmount,
  onUpdateMonthlyIncome,
  onDeleteExpense,
  onForceResetNewMonth,
}) => {
  // Current real-world month
  const currentMonthKey = getCurrentYearMonth();

  // Sub-tabs: 1. Incomes Table (Image 1), 2. Expenses Table (Image 1 style), 3. Budget & Checklist
  const [activeTab, setActiveTab] = useState<'incomes' | 'expenses' | 'budget'>('incomes');
  const [sortOrder, setSortOrder] = useState<'chronological' | 'latest'>('chronological');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => currentMonthKey);

  // 🔄 Table Orientation: 'transposed' (months as columns, categories as rows) vs 'vertical' (original)
  const [tableOrientation, setTableOrientation] = useState<'transposed' | 'vertical'>('transposed');

  // Selected year for transposed view
  const [selectedYear, setSelectedYear] = useState<string>(() => currentMonthKey.slice(0, 4));

  // Table display mode for Expenses: 'fit' (100% width, no horizontal scroll) vs 'full' (all bill columns)
  const [expenseTableViewMode, setExpenseTableViewMode] = useState<'fit' | 'full'>('fit');
  // Expanded row ID for month details in fit mode
  const [expandedMonthKey, setExpandedMonthKey] = useState<string | null>(null);

  // Quick inputs for Current Month Incomes (in the red circled area)
  const memberA = settings.members.person_a;
  const memberB = settings.members.person_b;
  const baseIncomeA = memberA.monthlyIncome || 40250;
  const baseIncomeB = memberB.monthlyIncome || 22850.90;

  const currentMonthSavedIncome = settings.monthlyIncomes?.[currentMonthKey];
  const [currentInputA, setCurrentInputA] = useState<string>(
    () => (currentMonthSavedIncome?.person_a ?? baseIncomeA).toString()
  );
  const [currentInputB, setCurrentInputB] = useState<string>(
    () => (currentMonthSavedIncome?.person_b ?? baseIncomeB).toString()
  );
  const [currentInputOther, setCurrentInputOther] = useState<string>(
    () => (currentMonthSavedIncome?.other ?? 0).toString()
  );

  // Sync inputs if settings change
  useEffect(() => {
    const saved = settings.monthlyIncomes?.[currentMonthKey];
    setCurrentInputA((saved?.person_a ?? baseIncomeA).toString());
    setCurrentInputB((saved?.person_b ?? baseIncomeB).toString());
    setCurrentInputOther((saved?.other ?? 0).toString());
  }, [settings.monthlyIncomes, currentMonthKey, baseIncomeA, baseIncomeB]);

  // 📝 Current Month Numeric Expense Inputs (Request 2: "รายจ่ายตามรูป ต้องมีช่องใส่เป็นตัวเลขได้")
  const [currentExpenseInputs, setCurrentExpenseInputs] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    expenses.forEach(e => {
      const amt = getExpenseAmountForMonth(e, currentMonthKey);
      init[e.id] = amt > 0 ? amt.toString() : (e.amount > 0 ? e.amount.toString() : '');
    });
    return init;
  });

  // Sync with expense changes
  useEffect(() => {
    setCurrentExpenseInputs(prev => {
      const next = { ...prev };
      let changed = false;
      expenses.forEach(e => {
        if (next[e.id] === undefined) {
          const amt = getExpenseAmountForMonth(e, currentMonthKey);
          next[e.id] = amt > 0 ? amt.toString() : (e.amount > 0 ? e.amount.toString() : '');
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [expenses, currentMonthKey]);

  const handleExpenseInputChange = (id: string, val: string) => {
    setCurrentExpenseInputs(prev => ({
      ...prev,
      [id]: val,
    }));
  };

  const handleExpenseInputBlur = (id: string) => {
    const val = currentExpenseInputs[id];
    if (val !== undefined && val.trim() !== '') {
      const num = parseFloat(val);
      if (!isNaN(num) && num >= 0) {
        onUpdateExpenseBill(id, num);
      }
    }
  };

  const handleSaveAllCurrentExpenses = () => {
    expenses.forEach(e => {
      const val = currentExpenseInputs[e.id];
      if (val !== undefined && val.trim() !== '') {
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0) {
          onUpdateExpenseBill(e.id, num);
        }
      }
    });
  };

  // Live expense calculation for current month based on real-time numeric inputs
  const liveCurrentExpenseTotal = useMemo(() => {
    return expenses.reduce((acc, e) => {
      const raw = currentExpenseInputs[e.id];
      if (raw !== undefined && raw.trim() !== '') {
        const num = parseFloat(raw);
        return acc + (isNaN(num) ? 0 : num);
      }
      return acc + getExpenseAmountForMonth(e, currentMonthKey);
    }, 0);
  }, [expenses, currentExpenseInputs, currentMonthKey]);

  // Inline income editing modal/state for other historical months
  const [editingIncomeMonth, setEditingIncomeMonth] = useState<string | null>(null);
  const [editIncomeA, setEditIncomeA] = useState('');
  const [editIncomeB, setEditIncomeB] = useState('');
  const [editIncomeOther, setEditIncomeOther] = useState('');

  // Inline estimated amount editing state
  const [editingEstimatedExpId, setEditingEstimatedExpId] = useState<string | null>(null);
  const [tempEstimatedVal, setTempEstimatedVal] = useState<string>('');

  // Quick bill edit state for recurring items
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [tempBillAmount, setTempBillAmount] = useState<string>('');

  // 1. Gather all unique months recorded across incomes, expenses, and transactions
  const allRecordedMonths = useMemo(() => {
    const set = new Set<string>();

    if (settings.monthlyIncomes) {
      Object.keys(settings.monthlyIncomes).forEach(m => set.add(m));
    }

    expenses.forEach(e => {
      if (e.monthlyBills) {
        Object.keys(e.monthlyBills).forEach(m => set.add(m));
      }
    });

    transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        set.add(t.date.slice(0, 7));
      }
    });

    // Always include current month
    set.add(currentMonthKey);

    return Array.from(set).sort();
  }, [settings.monthlyIncomes, expenses, transactions, currentMonthKey]);

  // 2. Build Incomes Table Data matching Image 1
  const allIncomeRows = useMemo<MonthIncomeData[]>(() => {
    return allRecordedMonths.map((mKey, idx) => {
      const custom = settings.monthlyIncomes?.[mKey];
      const incA = custom?.person_a !== undefined ? custom.person_a : baseIncomeA;
      const incB = custom?.person_b !== undefined ? custom.person_b : baseIncomeB;

      let incOther = custom?.other ?? 0;
      transactions.forEach(t => {
        if (
          t.date.startsWith(mKey) &&
          t.type === 'deposit' &&
          t.category === 'รายได้พิเศษ' &&
          custom?.other === undefined
        ) {
          incOther += t.amount;
        }
      });

      const totalIncome = incA + incB + incOther;

      let monthExpenses = 0;
      expenses.forEach(e => {
        monthExpenses += getExpenseAmountForMonth(e, mKey);
      });
      transactions.forEach(t => {
        if (t.date.startsWith(mKey) && t.type === 'withdrawal') {
          monthExpenses += t.amount;
        }
      });

      const netBalance = totalIncome - monthExpenses;

      return {
        index: idx + 1,
        monthKey: mKey,
        monthLabel: formatSpreadsheetMonth(mKey),
        person_a: incA,
        person_b: incB,
        other: incOther,
        totalIncome,
        totalExpense: monthExpenses,
        netBalance,
      };
    });
  }, [allRecordedMonths, settings.monthlyIncomes, baseIncomeA, baseIncomeB, transactions, expenses]);

  // Filter and sort incomes
  const displayIncomeRows = useMemo(() => {
    let rows = allIncomeRows;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter(r => r.monthLabel.toLowerCase().includes(q) || r.monthKey.includes(q));
    }
    if (sortOrder === 'latest') {
      return [...rows].reverse();
    }
    return rows;
  }, [allIncomeRows, searchTerm, sortOrder]);

  // Incomes Totals
  const totalIncomeAllMonths = useMemo(() => {
    return allIncomeRows.reduce((acc, r) => acc + r.totalIncome, 0);
  }, [allIncomeRows]);

  const avgIncomePerMonth = useMemo(() => {
    return allIncomeRows.length > 0 ? totalIncomeAllMonths / allIncomeRows.length : 0;
  }, [allIncomeRows, totalIncomeAllMonths]);

  // 3. Build Expenses Table Data (Multi-month spreadsheet format)
  // Dynamically recalculates whenever expenses array is added/edited/removed!
  const allExpenseRows = useMemo<MonthExpenseData[]>(() => {
    const baseEstimated = expenses.reduce((acc, e) => acc + getExpenseEstimatedAmount(e), 0);

    return allRecordedMonths.map((mKey, idx) => {
      const itemsMap: Record<string, number> = {};
      let actualTotal = 0;
      let paidCount = 0;

      expenses.forEach(e => {
        const amt = getExpenseAmountForMonth(e, mKey);
        itemsMap[e.id] = amt;
        actualTotal += amt;

        const isPaid =
          e.lastPaidMonth === mKey || (mKey === currentMonthKey && e.isPaidThisMonth);
        if (isPaid) paidCount++;
      });

      let adhocTotal = 0;
      transactions.forEach(t => {
        if (t.date.startsWith(mKey) && t.type === 'withdrawal') {
          adhocTotal += t.amount;
        }
      });
      actualTotal += adhocTotal;

      const diff = baseEstimated - actualTotal;

      return {
        index: idx + 1,
        monthKey: mKey,
        monthLabel: formatSpreadsheetMonth(mKey),
        estimatedTotal: baseEstimated,
        actualTotal,
        difference: diff,
        items: itemsMap,
        adhocTotal,
        paidCount,
        totalBills: expenses.length,
      };
    });
  }, [allRecordedMonths, expenses, transactions, currentMonthKey]);

  // Current Month Data for quick banner
  const currentExpenseRow = useMemo(() => {
    return allExpenseRows.find(r => r.monthKey === currentMonthKey);
  }, [allExpenseRows, currentMonthKey]);

  // Filter and sort expenses
  const displayExpenseRows = useMemo(() => {
    let rows = allExpenseRows;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter(r => r.monthLabel.toLowerCase().includes(q) || r.monthKey.includes(q));
    }
    if (sortOrder === 'latest') {
      return [...rows].reverse();
    }
    return rows;
  }, [allExpenseRows, searchTerm, sortOrder]);

  // Recurring items for Selected Month (Tab 3 & current month banner)
  const recurringItemsSelectedMonth = useMemo(() => {
    return expenses.map(exp => {
      const amount = getExpenseAmountForMonth(exp, selectedMonth);
      const estimatedAmt = getExpenseEstimatedAmount(exp);
      const isPaid =
        exp.lastPaidMonth === selectedMonth ||
        (selectedMonth === currentMonthKey && exp.isPaidThisMonth);

      return {
        ...exp,
        monthAmount: amount,
        estimatedAmt,
        isPaidInSelectedMonth: Boolean(isPaid),
      };
    });
  }, [expenses, selectedMonth, currentMonthKey]);

  const paidCountSelectedMonth = useMemo(
    () => recurringItemsSelectedMonth.filter(i => i.isPaidInSelectedMonth).length,
    [recurringItemsSelectedMonth]
  );

  // Available unique years in dataset
  const availableYears = useMemo(() => {
    const ySet = new Set<string>();
    allRecordedMonths.forEach(m => {
      const y = m.slice(0, 4);
      if (y) ySet.add(y);
    });
    return Array.from(ySet).sort().reverse();
  }, [allRecordedMonths]);

  // Transposed months based on selectedYear, searchTerm, and sortOrder
  const transposedMonths = useMemo(() => {
    let list = allRecordedMonths;
    if (selectedYear !== 'all') {
      list = list.filter(m => m.startsWith(selectedYear));
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(m => {
        const label = formatSpreadsheetMonth(m).toLowerCase();
        return label.includes(q) || m.includes(q);
      });
    }
    if (sortOrder === 'latest') {
      return [...list].reverse();
    }
    return list;
  }, [allRecordedMonths, selectedYear, searchTerm, sortOrder]);

  // Map of income data by monthKey for instant O(1) lookup
  const incomeByMonthMap = useMemo(() => {
    const map: Record<string, MonthIncomeData> = {};
    allIncomeRows.forEach(r => {
      map[r.monthKey] = r;
    });
    return map;
  }, [allIncomeRows]);

  // Summary calculations for Transposed Income Table across transposedMonths
  const transposedIncomeSummary = useMemo(() => {
    let sumA = 0;
    let sumB = 0;
    let sumOther = 0;
    let sumTotal = 0;
    let sumExpense = 0;
    let sumNet = 0;

    transposedMonths.forEach(mKey => {
      const d = incomeByMonthMap[mKey];
      if (d) {
        sumA += d.person_a;
        sumB += d.person_b;
        sumOther += d.other;
        sumTotal += d.totalIncome;
        sumExpense += d.totalExpense;
        sumNet += d.netBalance;
      }
    });

    const count = transposedMonths.length || 1;
    return {
      sumA,
      avgA: sumA / count,
      sumB,
      avgB: sumB / count,
      sumOther,
      avgOther: sumOther / count,
      sumTotal,
      avgTotal: sumTotal / count,
      sumExpense,
      avgExpense: sumExpense / count,
      sumNet,
      avgNet: sumNet / count,
      count,
    };
  }, [transposedMonths, incomeByMonthMap]);

  // Map of expense data by monthKey for instant O(1) lookup
  const expenseByMonthMap = useMemo(() => {
    const map: Record<string, MonthExpenseData> = {};
    allExpenseRows.forEach(r => {
      map[r.monthKey] = r;
    });
    return map;
  }, [allExpenseRows]);

  // Summary calculations for Transposed Expense Table across transposedMonths
  const transposedExpenseSummary = useMemo(() => {
    let sumEst = 0;
    let sumAct = 0;
    let sumAdhoc = 0;

    const itemTotals: Record<string, number> = {};
    expenses.forEach(e => {
      itemTotals[e.id] = 0;
    });

    transposedMonths.forEach(mKey => {
      const d = expenseByMonthMap[mKey];
      if (d) {
        sumEst += d.estimatedTotal;
        const actualVal = mKey === currentMonthKey ? liveCurrentExpenseTotal : d.actualTotal;
        sumAct += actualVal;
        sumAdhoc += d.adhocTotal;

        expenses.forEach(e => {
          const itemVal =
            mKey === currentMonthKey
              ? (parseFloat(currentExpenseInputs[e.id] ?? '') || getExpenseAmountForMonth(e, currentMonthKey))
              : (d.items[e.id] || 0);
          itemTotals[e.id] = (itemTotals[e.id] || 0) + itemVal;
        });
      }
    });

    const count = transposedMonths.length || 1;
    return {
      sumEst,
      avgEst: sumEst / count,
      sumAct,
      avgAct: sumAct / count,
      sumDiff: sumEst - sumAct,
      sumAdhoc,
      itemTotals,
      count,
    };
  }, [
    transposedMonths,
    expenseByMonthMap,
    expenses,
    currentMonthKey,
    liveCurrentExpenseTotal,
    currentExpenseInputs,
  ]);

  // Live calculation for current month quick fill
  const parsedCurrentA = parseFloat(currentInputA) || 0;
  const parsedCurrentB = parseFloat(currentInputB) || 0;
  const parsedCurrentOther = parseFloat(currentInputOther) || 0;
  const currentLiveTotalIncome = parsedCurrentA + parsedCurrentB + parsedCurrentOther;
  const currentLiveNetBalance = currentLiveTotalIncome - (liveCurrentExpenseTotal || currentExpenseRow?.actualTotal || 0);

  // Handle Save Current Month Income
  const handleSaveCurrentMonthIncome = () => {
    if (!onUpdateMonthlyIncome) return;
    onUpdateMonthlyIncome(currentMonthKey, {
      person_a: parsedCurrentA,
      person_b: parsedCurrentB,
      other: parsedCurrentOther,
    });
  };

  // Handlers for Historical Income Editing Modal
  const handleOpenEditIncome = (monthKey: string) => {
    const row = allIncomeRows.find(r => r.monthKey === monthKey);
    setEditingIncomeMonth(monthKey);
    setEditIncomeA(row ? row.person_a.toString() : baseIncomeA.toString());
    setEditIncomeB(row ? row.person_b.toString() : baseIncomeB.toString());
    setEditIncomeOther(row ? row.other.toString() : '0');
  };

  const handleSaveIncome = () => {
    if (!editingIncomeMonth || !onUpdateMonthlyIncome) return;
    const a = parseFloat(editIncomeA);
    const b = parseFloat(editIncomeB);
    const other = parseFloat(editIncomeOther);

    onUpdateMonthlyIncome(editingIncomeMonth, {
      person_a: isNaN(a) ? baseIncomeA : a,
      person_b: isNaN(b) ? baseIncomeB : b,
      other: isNaN(other) ? 0 : other,
    });
    setEditingIncomeMonth(null);
  };

  // Handlers for Estimated Amount Quick Edit
  const handleStartEditEstimated = (expId: string, currentVal: number) => {
    setEditingEstimatedExpId(expId);
    setTempEstimatedVal(currentVal.toString());
  };

  const handleSaveEstimated = (expId: string) => {
    const val = parseFloat(tempEstimatedVal);
    if (!isNaN(val) && val >= 0 && onUpdateExpenseEstimatedAmount) {
      onUpdateExpenseEstimatedAmount(expId, val);
    }
    setEditingEstimatedExpId(null);
  };

  // Handlers for Bill Quick Edit
  const handleStartEditBill = (expId: string, currentVal: number) => {
    setEditingBillId(expId);
    setTempBillAmount(currentVal.toString());
  };

  const handleSaveBillEdit = (expId: string) => {
    const val = parseFloat(tempBillAmount);
    if (!isNaN(val) && val >= 0) {
      onUpdateExpenseBill(expId, val);
    }
    setEditingBillId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-600/15 via-teal-500/10 to-transparent border border-emerald-500/20 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
              หน้า 2
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              ตารางรายรับ - รายจ่าย รายเดือน
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
            ตารางสรุปรายรับและรายจ่ายแบบรายเดือน พร้อมกำหนดและแก้ไขยอดประมาณการได้ตลอดเวลา
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => onOpenAddTransactionModal('deposit', 'รายได้พิเศษ')}
            className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ เพิ่มรายรับพิเศษ</span>
          </button>

          <button
            onClick={() => onOpenExpenseModal(null)}
            className="px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ เพิ่มรายจ่ายประจำ</span>
          </button>
        </div>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/20 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              รายรับเฉลี่ยต่อเดือน
            </span>
            <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-0.5">
              {formatCurrency(avgIncomePerMonth)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              จากข้อมูลทั้งหมด {allIncomeRows.length} เดือน
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/20 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
              ยอดประมาณการรายจ่ายรวม
            </span>
            <div className="text-2xl font-black text-rose-950 dark:text-rose-100 mt-0.5">
              {formatCurrency(expenses.reduce((acc, e) => acc + getExpenseEstimatedAmount(e), 0))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              งบประมาณฐานต่อเดือน ({expenses.length} รายการ)
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-indigo-100">
              รอบเดือนปัจจุบัน ({getMonthLabel(currentMonthKey)})
            </span>
            <div className="text-2xl font-black text-white mt-0.5">
              {formatCurrency(currentLiveTotalIncome)}
            </div>
            <p className="text-[10px] text-indigo-100/80 mt-1">
              ชำระบิลแล้ว {expenses.filter(e => e.isPaidThisMonth).length}/{expenses.length} รายการ
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center font-bold">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Sub-Tab Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          
          <button
            onClick={() => setActiveTab('incomes')}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'incomes'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>1. ตารางรายรับ (ตามรูปที่ 1)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {allIncomeRows.length} เดือน
            </span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'expenses'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>2. ตารางรายจ่าย (รายเดือน)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {allExpenseRows.length} เดือน
            </span>
          </button>

          <button
            onClick={() => setActiveTab('budget')}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'budget'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>3. ยอดประมาณการ & บิลประจำเดือน</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {expenses.length} รายการ
            </span>
          </button>

        </div>

        <span className="text-[11px] text-slate-400 self-end sm:self-center">
          {activeTab === 'incomes' && 'คอลัมน์: ลำดับ | วันที่ | คงเหลือ | เจ | เมย์ | อื่นๆ | รวมรายรับ'}
          {activeTab === 'expenses' && 'ความกว้างพอดีจอ 100% ไม่มีแถบเลื่อนซ้ายขวาด้านล่าง'}
          {activeTab === 'budget' && 'เพิ่มและแก้ไขยอดประมาณการได้ทันที'}
        </span>
      </div>

      {/* Toolbar: Search, Year Filter & Orientation Switch */}
      {(activeTab === 'incomes' || activeTab === 'expenses') && (
        <div className="flex flex-col gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Left: Search box */}
            <div className="relative flex-1 md:max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="ค้นหาเดือน เช่น มิ.ย.-2021, 2024..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Right: Orientation toggle and sort */}
            <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 text-xs">
              
              {/* Orientation Switch: 🔄 สลับแถว⇄คอลัมน์ (Default) vs 📋 ตารางแนวตั้ง */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTableOrientation('transposed')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 ${
                    tableOrientation === 'transposed'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="สลับคอลัมน์เป็นแถว จากแถวเป็นคอลัมน์ (เดือนเป็นคอลัมน์ แนวนอน)"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>สลับแถว⇄คอลัมน์ (แนวนอน)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTableOrientation('vertical')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 ${
                    tableOrientation === 'vertical'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="ตารางแนวตั้งเดิม (เดือนเป็นแถว)"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>ตารางแนวตั้ง</span>
                </button>
              </div>

              {activeTab === 'expenses' && tableOrientation === 'vertical' && (
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setExpenseTableViewMode('fit')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                      expenseTableViewMode === 'fit'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    พอดีจอ
                  </button>
                  <button
                    onClick={() => setExpenseTableViewMode('full')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                      expenseTableViewMode === 'full'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    ตารางเต็ม
                  </button>
                </div>
              )}

              <button
                onClick={() =>
                  setSortOrder(prev => (prev === 'chronological' ? 'latest' : 'chronological'))
                }
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition flex items-center gap-1.5"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  {sortOrder === 'chronological'
                    ? 'เก่า ➔ ใหม่'
                    : 'ใหม่ ➔ เก่า'}
                </span>
              </button>
            </div>
          </div>

          {/* Year selector filter pills for Transposed orientation */}
          {tableOrientation === 'transposed' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap mr-1">
                กรองดูตามปี:
              </span>
              {availableYears.map(yr => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedYear === yr
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {yr} {yr === currentMonthKey.slice(0, 4) ? '(ปีปัจจุบัน)' : ''}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedYear('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedYear === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                ทุกปี ({allRecordedMonths.length} เดือน)
              </button>
            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 1: INCOMES TABLE (EXACT SPREADSHEET MATCHING IMAGE 1) */}
      {/* ============================================================== */}
      {activeTab === 'incomes' && (
        <div className="space-y-4">
          
          {/* 📍 1.1 พื้นที่แถวเดือนปัจจุบันเสมอ (ตามพื้นที่วงสีแดงในรูปที่ 1) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border-2 border-emerald-500/30 dark:border-emerald-500/40 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>เดือนปัจจุบัน</span>
                </span>
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {formatSpreadsheetMonth(currentMonthKey)} ({getMonthLabel(currentMonthKey)})
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:inline">
                  • กรอกตัวเลขรายรับเดือนนี้ได้ทันทีที่แถวนี้
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">รวมรายรับเดือนนี้</span>
                  <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(currentLiveTotalIncome)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">คงเหลือสุทธิเดือนนี้</span>
                  <span className={`text-sm sm:text-base font-black ${currentLiveNetBalance < 0 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-100'}`}>
                    {formatCurrencySpreadsheet(currentLiveNetBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Inputs Row for Current Month */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  💼 เจ (รายได้ประจำ)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                  <input
                    type="number"
                    step="any"
                    value={currentInputA}
                    onChange={e => setCurrentInputA(e.target.value)}
                    placeholder={baseIncomeA.toString()}
                    className="w-full pl-6 pr-2 py-1 text-xs font-bold text-slate-900 dark:text-white rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  💼 เมย์ (รายได้ประจำ)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                  <input
                    type="number"
                    step="any"
                    value={currentInputB}
                    onChange={e => setCurrentInputB(e.target.value)}
                    placeholder={baseIncomeB.toString()}
                    className="w-full pl-6 pr-2 py-1 text-xs font-bold text-slate-900 dark:text-white rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  ✨ รายได้อื่นๆ / เสริม
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                  <input
                    type="number"
                    step="any"
                    value={currentInputOther}
                    onChange={e => setCurrentInputOther(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-6 pr-2 py-1 text-xs font-bold text-slate-900 dark:text-white rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleSaveCurrentMonthIncome}
                  className="w-full py-2 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5 h-[34px]"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกรายรับเดือนนี้</span>
                </button>
              </div>
            </div>
          </div>

          {/* 1.2 ตารางรายรับ (สลับแถว-คอลัมน์ หรือ แนวตั้ง) */}
          {tableOrientation === 'transposed' ? (
            /* TRANSPOSED INCOMES TABLE (เดือนเป็นคอลัมน์ แหล่งรายรับเป็นแถว) */
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden w-full">
              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm border-b-2 border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
                    <tr>
                      {/* Sticky Left Header */}
                      <th className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 py-3.5 px-4 min-w-[210px] w-[210px] border-r-2 border-slate-300 dark:border-slate-700 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]">
                        <div className="flex items-center justify-between">
                          <span>รายการ / แหล่งรายรับ</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({transposedMonths.length} ด.)
                          </span>
                        </div>
                      </th>

                      {/* Month Columns */}
                      {transposedMonths.map(mKey => {
                        const isCurrent = mKey === currentMonthKey;
                        return (
                          <th
                            key={mKey}
                            className={`py-3 px-3 min-w-[105px] text-right border-r border-slate-200 dark:border-slate-700 whitespace-nowrap ${
                              isCurrent
                                ? 'bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-black'
                                : ''
                            }`}
                          >
                            <div className="flex flex-col items-end">
                              <span>{formatSpreadsheetMonth(mKey)}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-600 text-white font-bold mt-0.5 shadow-2xs">
                                  ปัจจุบัน
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}

                      {/* Summary Columns */}
                      <th className="py-3 px-3 min-w-[115px] text-right font-black text-emerald-900 dark:text-emerald-300 border-r border-slate-200 dark:border-slate-700 bg-slate-200/60 dark:bg-slate-700/60 whitespace-nowrap">
                        รวมทั้งสิ้น
                      </th>
                      <th className="py-3 px-3 min-w-[105px] text-right font-black text-slate-700 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-700/60 whitespace-nowrap">
                        เฉลี่ย/เดือน
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                    {/* ROW 1: เจ */}
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-3 px-4 font-bold text-slate-900 dark:text-slate-100 border-r-2 border-slate-200 dark:border-slate-800 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span>{memberA.name || 'เจ'} (รายรับคนหาร A)</span>
                        </div>
                      </td>
                      {transposedMonths.map(mKey => {
                        const d = incomeByMonthMap[mKey];
                        const isCurrent = mKey === currentMonthKey;
                        return (
                          <td
                            key={mKey}
                            className={`py-2.5 px-3 text-right border-r border-slate-100 dark:border-slate-800 font-bold whitespace-nowrap ${
                              isCurrent ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {isCurrent ? (
                              <input
                                type="number"
                                step="any"
                                value={currentInputA}
                                onChange={e => setCurrentInputA(e.target.value)}
                                onBlur={handleSaveCurrentMonthIncome}
                                className="w-20 px-1 py-0.5 text-xs text-right font-bold rounded-lg bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            ) : (
                              formatCurrencySpreadsheet(d?.person_a ?? 0)
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 whitespace-nowrap">
                        {formatCurrency(transposedIncomeSummary.sumA)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-600 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-800/30 whitespace-nowrap">
                        {formatCurrency(transposedIncomeSummary.avgA)}
                      </td>
                    </tr>

                    {/* ROW 2: เมย์ */}
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-3 px-4 font-bold text-slate-900 dark:text-slate-100 border-r-2 border-slate-200 dark:border-slate-800 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                          <span>{memberB.name || 'เมย์'} (รายรับคนหาร B)</span>
                        </div>
                      </td>
                      {transposedMonths.map(mKey => {
                        const d = incomeByMonthMap[mKey];
                        const isCurrent = mKey === currentMonthKey;
                        return (
                          <td
                            key={mKey}
                            className={`py-2.5 px-3 text-right border-r border-slate-100 dark:border-slate-800 font-bold whitespace-nowrap ${
                              isCurrent ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {isCurrent ? (
                              <input
                                type="number"
                                step="any"
                                value={currentInputB}
                                onChange={e => setCurrentInputB(e.target.value)}
                                onBlur={handleSaveCurrentMonthIncome}
                                className="w-20 px-1 py-0.5 text-xs text-right font-bold rounded-lg bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            ) : (
                              formatCurrencySpreadsheet(d?.person_b ?? 0)
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 whitespace-nowrap">
                        {formatCurrency(transposedIncomeSummary.sumB)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-600 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-800/30 whitespace-nowrap">
                        {formatCurrency(transposedIncomeSummary.avgB)}
                      </td>
                    </tr>

                    {/* ROW 3: อื่นๆ */}
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r-2 border-slate-200 dark:border-slate-800 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>อื่นๆ / รายได้พิเศษ</span>
                        </div>
                      </td>
                      {transposedMonths.map(mKey => {
                        const d = incomeByMonthMap[mKey];
                        const isCurrent = mKey === currentMonthKey;
                        return (
                          <td
                            key={mKey}
                            className={`py-2.5 px-3 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap ${
                              isCurrent ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {isCurrent ? (
                              <input
                                type="number"
                                step="any"
                                value={currentInputOther}
                                onChange={e => setCurrentInputOther(e.target.value)}
                                onBlur={handleSaveCurrentMonthIncome}
                                className="w-20 px-1 py-0.5 text-xs text-right font-bold rounded-lg bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            ) : (
                              formatCurrencySpreadsheet(d?.other ?? 0)
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-right font-black text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 whitespace-nowrap">
                        {formatCurrency(transposedIncomeSummary.sumOther)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-800/30 whitespace-nowrap">
                        {formatCurrency(transposedIncomeSummary.avgOther)}
                      </td>
                    </tr>

                    {/* ROW 4: รวมรายรับทั้งหมด (Total Income) */}
                    <tr className="bg-emerald-100/60 dark:bg-emerald-950/40 border-y-2 border-emerald-300 dark:border-emerald-700/60 font-black">
                      <td className="sticky left-0 z-10 bg-emerald-100 dark:bg-emerald-950 py-3.5 px-4 font-black text-emerald-950 dark:text-emerald-100 border-r-2 border-emerald-300 dark:border-emerald-800 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                        💰 รวมรายรับทั้งหมด
                      </td>
                      {transposedMonths.map(mKey => {
                        const d = incomeByMonthMap[mKey];
                        const isCurrent = mKey === currentMonthKey;
                        const val = isCurrent ? currentLiveTotalIncome : (d?.totalIncome ?? 0);
                        return (
                          <td
                            key={mKey}
                            className={`py-3 px-3 text-right border-r border-emerald-200/70 dark:border-emerald-900/40 whitespace-nowrap font-black text-emerald-900 dark:text-emerald-200 ${
                              isCurrent ? 'bg-emerald-200/50 dark:bg-emerald-900/50 text-emerald-950 dark:text-emerald-100 font-extrabold' : ''
                            }`}
                          >
                            {formatCurrency(val)}
                          </td>
                        );
                      })}
                      <td className="py-3 px-3 text-right font-black text-emerald-950 dark:text-emerald-100 border-r border-emerald-300 dark:border-emerald-800 bg-emerald-200/60 dark:bg-emerald-900/60 whitespace-nowrap">
                        {formatCurrency(transposedIncomeSummary.sumTotal)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-900 dark:text-emerald-200 bg-emerald-200/60 dark:bg-emerald-900/60 whitespace-nowrap">
                        {formatCurrency(transposedIncomeSummary.avgTotal)}
                      </td>
                    </tr>

                    {/* ROW 5: รวมรายจ่ายจริง (Total Expense) */}
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-3 px-4 font-bold text-rose-700 dark:text-rose-400 border-r-2 border-slate-200 dark:border-slate-800 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
                        💸 รายจ่ายจริงรวม
                      </td>
                      {transposedMonths.map(mKey => {
                        const d = incomeByMonthMap[mKey];
                        const isCurrent = mKey === currentMonthKey;
                        const val = isCurrent ? liveCurrentExpenseTotal : (d?.totalExpense ?? 0);
                        return (
                          <td
                            key={mKey}
                            className={`py-2.5 px-3 text-right border-r border-slate-100 dark:border-slate-800 font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap ${
                              isCurrent ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''
                            }`}
                          >
                            {formatCurrency(val)}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-right font-black text-rose-700 dark:text-rose-400 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 whitespace-nowrap">
                        {formatCurrency(transposedIncomeSummary.sumExpense)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600/80 dark:text-rose-400/80 bg-slate-50/60 dark:bg-slate-800/30 whitespace-nowrap">
                        {formatCurrency(transposedIncomeSummary.avgExpense)}
                      </td>
                    </tr>

                    {/* ROW 6: คงเหลือสุทธิ (Net Balance) */}
                    <tr className="bg-slate-100/70 dark:bg-slate-800/70 border-t-2 border-slate-300 dark:border-slate-700 font-black">
                      <td className="sticky left-0 z-10 bg-slate-100 dark:bg-slate-800 py-3.5 px-4 font-black text-slate-900 dark:text-white border-r-2 border-slate-300 dark:border-slate-700 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                        ⚖️ คงเหลือสุทธิ (Net)
                      </td>
                      {transposedMonths.map(mKey => {
                        const d = incomeByMonthMap[mKey];
                        const isCurrent = mKey === currentMonthKey;
                        const net = isCurrent ? currentLiveNetBalance : (d?.netBalance ?? 0);
                        const isZero = Math.abs(net) < 0.01;
                        const isNeg = net < 0;
                        return (
                          <td
                            key={mKey}
                            className={`py-3 px-3 text-right border-r border-slate-200 dark:border-slate-700 whitespace-nowrap font-black ${
                              isZero
                                ? 'text-slate-400'
                                : isNeg
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-900 dark:text-slate-100'
                            } ${isCurrent ? 'bg-emerald-100/40 dark:bg-emerald-950/30 font-extrabold' : ''}`}
                          >
                            {formatCurrencySpreadsheet(net)}
                          </td>
                        );
                      })}
                      <td
                        className={`py-3 px-3 text-right font-black border-r border-slate-300 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-700/50 whitespace-nowrap ${
                          transposedIncomeSummary.sumNet < 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {formatCurrencySpreadsheet(transposedIncomeSummary.sumNet)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-black bg-slate-200/50 dark:bg-slate-700/50 whitespace-nowrap ${
                          transposedIncomeSummary.avgNet < 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {formatCurrencySpreadsheet(transposedIncomeSummary.avgNet)}
                      </td>
                    </tr>

                    {/* ROW 7: จัดการ / แก้ไข */}
                    <tr className="bg-white dark:bg-slate-900">
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-2.5 px-4 font-bold text-slate-500 border-r-2 border-slate-200 dark:border-slate-800 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
                        ⚙️ จัดการยอด
                      </td>
                      {transposedMonths.map(mKey => {
                        const isCurrent = mKey === currentMonthKey;
                        return (
                          <td key={mKey} className="py-2.5 px-2 text-center border-r border-slate-100 dark:border-slate-800">
                            {isCurrent ? (
                              <button
                                onClick={handleSaveCurrentMonthIncome}
                                className="px-2 py-1 text-[10px] font-bold rounded-md bg-emerald-600 text-white hover:bg-emerald-500 shadow-2xs transition"
                              >
                                💾 บันทึก
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenEditIncome(mKey)}
                                className="p-1 text-slate-400 hover:text-emerald-600 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                title={`แก้ไขยอดรายรับรอบเดือน ${mKey}`}
                              >
                                <Edit2 className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td colSpan={2} className="py-2.5 px-3 text-center text-slate-400 text-[10px]">
                        -
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* 1.2 ตารางแนวตั้งเดิม (VERTICAL INCOMES TABLE) */
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden w-full">
              <div className="overflow-y-auto max-h-[700px] w-full">
                <table className="w-full table-fixed text-left text-xs border-collapse">
                  
                  {/* Fixed Proportional Columns that guarantee 100% screen fit */}
                  <colgroup>
                    <col className="w-[6%]" />
                    <col className="w-[14%]" />
                    <col className="w-[16%]" />
                    <col className="w-[16%]" />
                    <col className="w-[16%]" />
                    <col className="w-[12%]" />
                    <col className="w-[14%]" />
                    <col className="w-[6%]" />
                  </colgroup>

                  {/* Table Header matching Image 1 */}
                  <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm border-b-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-center">
                    <tr>
                      <th className="py-3 px-2 border-r border-slate-200 dark:border-slate-700">
                        ลำดับ
                      </th>
                      <th className="py-3 px-2 border-r border-slate-200 dark:border-slate-700">
                        วันที่
                      </th>
                      <th className="py-3 px-2 border-r border-slate-200 dark:border-slate-700 text-right">
                        คงเหลือ
                      </th>
                      <th className="py-3 px-2 border-r border-slate-200 dark:border-slate-700 text-right">
                        เจ
                      </th>
                      <th className="py-3 px-2 border-r border-slate-200 dark:border-slate-700 text-right">
                        เมย์
                      </th>
                      <th className="py-3 px-2 border-r border-slate-200 dark:border-slate-700 text-right">
                        อื่นๆ
                      </th>
                      <th className="py-3 px-2 border-r border-slate-200 dark:border-slate-700 text-right font-black text-emerald-800 dark:text-emerald-300">
                        รวมรายรับ
                      </th>
                      <th className="py-3 px-1 text-center">
                        แก้ไข
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body matching Image 1 */}
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-medium">
                    {displayIncomeRows.map(row => {
                      const isZeroNet = Math.abs(row.netBalance) < 0.01;
                      const isNegNet = row.netBalance < 0;
                      const isCurrent = row.monthKey === currentMonthKey;

                      return (
                        <tr
                          key={row.monthKey}
                          className={`transition-colors ${
                            isCurrent
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 font-bold hover:bg-emerald-100/70'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          {/* 1. ลำดับ */}
                          <td className="py-2.5 px-2 text-center text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                            {isCurrent ? (
                              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] inline-flex items-center justify-center">
                                {row.index}
                              </span>
                            ) : (
                              row.index
                            )}
                          </td>

                          {/* 2. วันที่ / เดือน (มิ.ย.-2021) */}
                          <td className="py-2.5 px-2 text-center font-medium text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800 truncate">
                            <div className="flex items-center justify-center gap-1">
                              <span>{row.monthLabel}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-600 text-white font-bold">
                                  ปัจจุบัน
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. คงเหลือ (Net balance e.g. ฿ -, ฿ 530.00, ฿ (846.60)) */}
                          <td
                            className={`py-2.5 px-2 text-right border-r border-slate-100 dark:border-slate-800 font-medium truncate ${
                              isZeroNet
                                ? 'text-slate-400 dark:text-slate-500'
                                : isNegNet
                                ? 'text-rose-600 dark:text-rose-400 font-bold'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {formatCurrencySpreadsheet(row.netBalance)}
                          </td>

                          {/* 4. เจ (Je) */}
                          <td className="py-2.5 px-2 text-right border-r border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100 truncate">
                            {formatCurrencySpreadsheet(row.person_a)}
                          </td>

                          {/* 5. เมย์ (May) */}
                          <td className="py-2.5 px-2 text-right border-r border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100 truncate">
                            {formatCurrencySpreadsheet(row.person_b)}
                          </td>

                          {/* 6. อื่นๆ (Other) */}
                          <td className="py-2.5 px-2 text-right border-r border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 truncate">
                            {formatCurrencySpreadsheet(row.other)}
                          </td>

                          {/* 7. รวมรายรับ (Total Income) */}
                          <td className="py-2.5 px-2 text-right border-r border-slate-100 dark:border-slate-800 font-black text-emerald-600 dark:text-emerald-400 truncate">
                            {formatCurrency(row.totalIncome)}
                          </td>

                          {/* 8. แก้ไข (Edit) */}
                          <td className="py-2.5 px-1 text-center">
                            <button
                              onClick={() => handleOpenEditIncome(row.monthKey)}
                              className="p-1 text-slate-400 hover:text-emerald-600 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="แก้ไขยอดรายรับของเดือนนี้"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Table Footer */}
                  <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-xs">
                    <tr>
                      <td colSpan={2} className="py-3 px-2 text-center text-slate-700 dark:text-slate-300">
                        รวมทั้งหมด ({allIncomeRows.length} เดือน)
                      </td>
                      <td className="py-3 px-2 text-right text-slate-500">
                        -
                      </td>
                      <td className="py-3 px-2 text-right text-slate-700 dark:text-slate-300 font-black truncate">
                        {formatCurrency(allIncomeRows.reduce((acc, r) => acc + r.person_a, 0))}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-700 dark:text-slate-300 font-black truncate">
                        {formatCurrency(allIncomeRows.reduce((acc, r) => acc + r.person_b, 0))}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-700 dark:text-slate-300 font-black truncate">
                        {formatCurrency(allIncomeRows.reduce((acc, r) => acc + r.other, 0))}
                      </td>
                      <td className="py-3 px-2 text-right text-emerald-600 dark:text-emerald-400 font-black truncate">
                        {formatCurrency(totalIncomeAllMonths)}
                      </td>
                      <td className="py-3 px-1 text-center text-slate-400">
                        -
                      </td>
                    </tr>
                  </tfoot>

                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 2: EXPENSES TABLE (MULTI-MONTH SPREADSHEET FORMAT)     */}
      {/* ============================================================== */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          
          {/* 📍 2.1 แถวสรุปและเช็คบิลรอบเดือนปัจจุบันเสมอ (ตามพื้นที่วงสีแดง) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent border-2 border-rose-500/30 dark:border-rose-500/40 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white shadow-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>เดือนปัจจุบัน</span>
                </span>
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {formatSpreadsheetMonth(currentMonthKey)} ({getMonthLabel(currentMonthKey)})
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:inline">
                  • รายจ่ายรอบเดือนปัจจุบันและรายการบิล
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">ยอดประมาณการ</span>
                  <span className="text-sm sm:text-base font-black text-amber-800 dark:text-amber-300">
                    {formatCurrency(currentExpenseRow?.estimatedTotal || 0)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">จ่ายจริงรอบนี้</span>
                  <span className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400">
                    {formatCurrency(liveCurrentExpenseTotal)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">ผลต่าง</span>
                  <span
                    className={`text-sm sm:text-base font-black ${
                      (currentExpenseRow?.estimatedTotal || 0) - liveCurrentExpenseTotal < 0
                        ? 'text-rose-600'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {(currentExpenseRow?.estimatedTotal || 0) - liveCurrentExpenseTotal < 0
                      ? `-${formatCurrency(Math.abs((currentExpenseRow?.estimatedTotal || 0) - liveCurrentExpenseTotal), false)}`
                      : `+${formatCurrency((currentExpenseRow?.estimatedTotal || 0) - liveCurrentExpenseTotal, false)}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Bill Inputs and Status for current month (Request 2: มีช่องใส่เป็นตัวเลขได้) */}
            <div className="space-y-2.5 pt-2 border-t border-rose-200/50 dark:border-rose-900/30 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    ตรวจและกรอกยอดรายจ่ายรอบเดือนนี้:
                  </span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    (ใส่ตัวเลขยอดจริงแต่ละรายการได้ทันที บันทึกและคำนวณเข้าตารางอัตโนมัติ)
                  </span>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleSaveAllCurrentExpenses}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>💾 บันทึกยอดบิลทั้งหมด</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('budget')}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs whitespace-nowrap hover:opacity-90 transition shadow-xs"
                  >
                    จัดการประมาณการ & บิล ➔
                  </button>
                </div>
              </div>

              {/* Numerical Input Chips/Cards matching user image */}
              <div className="flex items-center gap-2 overflow-x-auto py-1.5 max-w-full">
                {expenses.map(item => {
                  const isPaid =
                    item.lastPaidMonth === currentMonthKey ||
                    (currentMonthKey === getCurrentYearMonth() && item.isPaidThisMonth);

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border transition shadow-2xs whitespace-nowrap flex-shrink-0 ${
                        isPaid
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                      }`}
                    >
                      <span className="text-base select-none">{item.icon}</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[125px] truncate" title={item.title}>
                        {item.title}
                      </span>

                      {/* Number Input Field */}
                      <div className="relative flex items-center ml-1">
                        <span className="absolute left-2 text-[10px] text-slate-400 font-bold pointer-events-none select-none">฿</span>
                        <input
                          type="number"
                          step="any"
                          value={currentExpenseInputs[item.id] ?? ''}
                          onChange={e => handleExpenseInputChange(item.id, e.target.value)}
                          onBlur={() => handleExpenseInputBlur(item.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleExpenseInputBlur(item.id);
                          }}
                          placeholder="0.00"
                          className="w-24 pl-5 pr-2 py-1 text-xs font-bold text-right rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>

                      {/* Paid / Unpaid Toggle Button */}
                      <button
                        type="button"
                        onClick={() => onToggleExpensePaid(item.id)}
                        className={`p-1.5 rounded-xl transition flex items-center gap-1 text-[11px] font-bold ${
                          isPaid
                            ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-500'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 hover:text-emerald-700'
                        }`}
                        title={isPaid ? 'ชำระแล้ว (คลิกเพื่อยกเลิก)' : 'คลิกเพื่อระบุว่าชำระแล้ว'}
                      >
                        {isPaid ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            <span className="text-[10px]">จ่ายแล้ว</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-[10px]">ยังไม่จ่าย</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2.2 ตารางรายจ่าย (สลับแถว-คอลัมน์ หรือ แนวตั้ง) */}
          {tableOrientation === 'transposed' ? (
            /* TRANSPOSED EXPENSES TABLE (เดือนเป็นคอลัมน์ รายการรายจ่ายเป็นแถว) */
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden w-full">
              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm border-b-2 border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
                    <tr>
                      {/* Sticky Left Header */}
                      <th className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 py-3.5 px-4 min-w-[220px] w-[220px] border-r-2 border-slate-300 dark:border-slate-700 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]">
                        <div className="flex items-center justify-between">
                          <span>รายการรายจ่ายประจำ & บิล</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({expenses.length} รายการ)
                          </span>
                        </div>
                      </th>

                      {/* Month Columns */}
                      {transposedMonths.map(mKey => {
                        const isCurrent = mKey === currentMonthKey;
                        return (
                          <th
                            key={mKey}
                            className={`py-3 px-3 min-w-[110px] text-right border-r border-slate-200 dark:border-slate-700 whitespace-nowrap ${
                              isCurrent
                                ? 'bg-rose-100/80 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 font-black'
                                : ''
                            }`}
                          >
                            <div className="flex flex-col items-end">
                              <span>{formatSpreadsheetMonth(mKey)}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-600 text-white font-bold mt-0.5 shadow-2xs">
                                  ปัจจุบัน
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}

                      {/* Summary Columns Header */}
                      <th className="py-3 px-3 min-w-[115px] text-right font-black text-rose-600 dark:text-rose-400 border-r border-slate-200 dark:border-slate-700 bg-slate-200/60 dark:bg-slate-700/60 whitespace-nowrap">
                        รวมจ่ายจริง
                      </th>
                      <th className="py-3 px-3 min-w-[115px] text-right font-black text-amber-800 dark:text-amber-300 border-r border-slate-200 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-950/20 whitespace-nowrap">
                        งบรวมช่วงนี้
                      </th>
                      <th className="py-3 px-3 min-w-[105px] text-right font-black text-slate-700 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-700/60 whitespace-nowrap">
                        ผลต่างรวม
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                    {/* ROWS: Each expense item */}
                    {expenses.map(expense => {
                      const rowTotal = transposedExpenseSummary.itemTotals[expense.id] || 0;
                      const estPerMonth = getExpenseEstimatedAmount(expense);
                      const estTotalForPeriod = estPerMonth * transposedMonths.length;
                      const diffForPeriod = estTotalForPeriod - rowTotal;

                      return (
                        <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          {/* Sticky Left: Expense Title & Details */}
                          <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-2.5 px-4 font-bold border-r-2 border-slate-200 dark:border-slate-800 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-base select-none">{expense.icon}</span>
                              <div className="max-w-[150px] truncate">
                                <div className="text-slate-900 dark:text-white font-bold truncate" title={expense.title}>
                                  {expense.title}
                                </div>
                                <div className="text-[10px] text-slate-400 font-normal">
                                  งบ {formatCurrency(estPerMonth, false)}/ด.
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Month Columns */}
                          {transposedMonths.map(mKey => {
                            const isCurrent = mKey === currentMonthKey;
                            const d = expenseByMonthMap[mKey];
                            const val = isCurrent
                              ? (parseFloat(currentExpenseInputs[expense.id] ?? '') || getExpenseAmountForMonth(expense, currentMonthKey))
                              : (d?.items[expense.id] || 0);

                            return (
                              <td
                                key={mKey}
                                className={`py-2 px-2.5 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap ${
                                  isCurrent ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''
                                }`}
                              >
                                {isCurrent ? (
                                  <div className="inline-flex items-center justify-end">
                                    <input
                                      type="number"
                                      step="any"
                                      value={currentExpenseInputs[expense.id] ?? ''}
                                      onChange={e => handleExpenseInputChange(expense.id, e.target.value)}
                                      onBlur={() => handleExpenseInputBlur(expense.id)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleExpenseInputBlur(expense.id);
                                      }}
                                      className="w-20 px-1.5 py-0.5 text-xs text-right font-bold rounded-lg bg-rose-50/60 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                                      placeholder="0.00"
                                    />
                                  </div>
                                ) : (
                                  <span className={val > 0 ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-300 dark:text-slate-600'}>
                                    {val > 0 ? formatCurrency(val, false) : '-'}
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          {/* Summary Columns */}
                          <td className="py-2.5 px-3 text-right font-black text-rose-600 dark:text-rose-400 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 whitespace-nowrap">
                            {formatCurrency(rowTotal)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-800 dark:text-amber-300 border-r border-slate-200 dark:border-slate-800 bg-amber-50/30 dark:bg-amber-950/20 whitespace-nowrap">
                            {formatCurrency(estTotalForPeriod)}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${
                            diffForPeriod < 0 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {diffForPeriod < 0 ? `-${formatCurrency(Math.abs(diffForPeriod), false)}` : `+${formatCurrency(diffForPeriod, false)}`}
                          </td>
                        </tr>
                      );
                    })}

                    {/* ROW: ย่อย / ถอนเงิน (Ad-hoc) */}
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-2.5 px-4 font-bold text-slate-600 dark:text-slate-400 border-r-2 border-slate-200 dark:border-slate-800 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
                        🛒 รายจ่ายอื่นๆ / ถอนเงิน
                      </td>
                      {transposedMonths.map(mKey => {
                        const d = expenseByMonthMap[mKey];
                        const val = d?.adhocTotal || 0;
                        return (
                          <td key={mKey} className="py-2.5 px-3 text-right border-r border-slate-100 dark:border-slate-800 text-slate-600 whitespace-nowrap">
                            {val > 0 ? formatCurrency(val, false) : '-'}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-right font-black text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 whitespace-nowrap">
                        {formatCurrency(transposedExpenseSummary.sumAdhoc)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400 border-r border-slate-200 dark:border-slate-800 bg-amber-50/30 dark:bg-amber-950/20 whitespace-nowrap">
                        -
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400 whitespace-nowrap">
                        -
                      </td>
                    </tr>

                    {/* ROW: รวมรายจ่ายจริง (Total Actual Expense) - Highlighted */}
                    <tr className="bg-rose-100/60 dark:bg-rose-950/40 border-y-2 border-rose-300 dark:border-rose-700/60 font-black">
                      <td className="sticky left-0 z-10 bg-rose-100 dark:bg-rose-950 py-3.5 px-4 font-black text-rose-950 dark:text-rose-100 border-r-2 border-rose-300 dark:border-rose-800 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                        🔴 รวมรายจ่ายจริง
                      </td>
                      {transposedMonths.map(mKey => {
                        const isCurrent = mKey === currentMonthKey;
                        const d = expenseByMonthMap[mKey];
                        const val = isCurrent ? liveCurrentExpenseTotal : (d?.actualTotal || 0);
                        return (
                          <td
                            key={mKey}
                            className={`py-3 px-3 text-right border-r border-rose-200/70 dark:border-rose-900/40 whitespace-nowrap font-black text-rose-600 dark:text-rose-400 ${
                              isCurrent ? 'bg-rose-200/50 dark:bg-rose-900/50 font-extrabold' : ''
                            }`}
                          >
                            {formatCurrency(val)}
                          </td>
                        );
                      })}
                      <td className="py-3 px-3 text-right font-black text-rose-700 dark:text-rose-300 border-r border-rose-300 dark:border-rose-800 bg-rose-200/60 dark:bg-rose-900/60 whitespace-nowrap">
                        {formatCurrency(transposedExpenseSummary.sumAct)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-amber-800 dark:text-amber-300 border-r border-rose-300 dark:border-rose-800 bg-amber-50/50 dark:bg-amber-950/20 whitespace-nowrap">
                        {formatCurrency(transposedExpenseSummary.sumEst)}
                      </td>
                      <td className={`py-3 px-3 text-right font-black whitespace-nowrap ${
                        transposedExpenseSummary.sumDiff < 0 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {transposedExpenseSummary.sumDiff < 0
                          ? `-${formatCurrency(Math.abs(transposedExpenseSummary.sumDiff), false)}`
                          : `+${formatCurrency(transposedExpenseSummary.sumDiff, false)}`}
                      </td>
                    </tr>

                    {/* ROW: ยอดประมาณการรวม (Total Estimated Budget) */}
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-3 px-4 font-bold text-amber-800 dark:text-amber-300 border-r-2 border-slate-200 dark:border-slate-800 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
                        🎯 ยอดประมาณการรวม
                      </td>
                      {transposedMonths.map(mKey => {
                        const d = expenseByMonthMap[mKey];
                        return (
                          <td key={mKey} className="py-2.5 px-3 text-right border-r border-slate-100 dark:border-slate-800 font-bold text-amber-800 dark:text-amber-300 whitespace-nowrap">
                            {formatCurrency(d?.estimatedTotal || 0)}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-right font-black text-amber-800 dark:text-amber-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 whitespace-nowrap">
                        {formatCurrency(transposedExpenseSummary.sumEst)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-700 dark:text-amber-300 border-r border-slate-200 dark:border-slate-800 bg-amber-50/30 dark:bg-amber-950/20 whitespace-nowrap">
                        {formatCurrency(transposedExpenseSummary.avgEst)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400 whitespace-nowrap">
                        -
                      </td>
                    </tr>

                    {/* ROW: ผลต่างงบประมาณ (+/- Difference) */}
                    <tr className="bg-slate-100/70 dark:bg-slate-800/70 border-t-2 border-slate-300 dark:border-slate-700 font-black">
                      <td className="sticky left-0 z-10 bg-slate-100 dark:bg-slate-800 py-3.5 px-4 font-black text-slate-900 dark:text-white border-r-2 border-slate-300 dark:border-slate-700 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                        📊 ผลต่าง (+/- Diff)
                      </td>
                      {transposedMonths.map(mKey => {
                        const isCurrent = mKey === currentMonthKey;
                        const d = expenseByMonthMap[mKey];
                        const est = d?.estimatedTotal || 0;
                        const act = isCurrent ? liveCurrentExpenseTotal : (d?.actualTotal || 0);
                        const diff = est - act;
                        const isOver = diff < 0;

                        return (
                          <td
                            key={mKey}
                            className={`py-3 px-3 text-right border-r border-slate-200 dark:border-slate-700 whitespace-nowrap font-black ${
                              isOver ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isOver ? `-${formatCurrency(Math.abs(diff), false)}` : `+${formatCurrency(diff, false)}`}
                          </td>
                        );
                      })}
                      <td
                        className={`py-3 px-3 text-right font-black border-r border-slate-300 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-700/50 whitespace-nowrap ${
                          transposedExpenseSummary.sumDiff < 0 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {transposedExpenseSummary.sumDiff < 0
                          ? `-${formatCurrency(Math.abs(transposedExpenseSummary.sumDiff), false)}`
                          : `+${formatCurrency(transposedExpenseSummary.sumDiff, false)}`}
                      </td>
                      <td colSpan={2} className="py-3 px-3 text-center text-slate-400 text-[10px]">
                        -
                      </td>
                    </tr>

                    {/* ROW: สถานะชำระบิล */}
                    <tr className="bg-white dark:bg-slate-900">
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-2.5 px-4 font-bold text-slate-500 border-r-2 border-slate-200 dark:border-slate-800 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
                        📋 สถานะชำระบิล
                      </td>
                      {transposedMonths.map(mKey => {
                        const d = expenseByMonthMap[mKey];
                        const isCurrent = mKey === currentMonthKey;
                        const paidCount = isCurrent
                          ? expenses.filter(e => e.isPaidThisMonth || e.lastPaidMonth === currentMonthKey).length
                          : (d?.paidCount || 0);
                        const totalBills = d?.totalBills || expenses.length;
                        const isAllPaid = paidCount >= totalBills && totalBills > 0;

                        return (
                          <td key={mKey} className="py-2.5 px-2 text-center border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isAllPaid
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {paidCount}/{totalBills} {isAllPaid ? '✔' : ''}
                            </span>
                          </td>
                        );
                      })}
                      <td colSpan={3} className="py-2.5 px-3 text-center text-slate-400 text-[10px]">
                        -
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* 2.2 ตารางแนวตั้งเดิม (VERTICAL EXPENSES TABLE) */
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden w-full">
              <div className="overflow-y-auto max-h-[700px] w-full">
              
              {/* VIEW MODE 1: FIT SCREEN (พอดีจอ 100% ไม่มีแถบสไลด์ซ้ายขวา) */}
              {expenseTableViewMode === 'fit' ? (
                <table className="w-full table-fixed text-left text-xs border-collapse">
                  <colgroup>
                    <col className="w-[6%]" />
                    <col className="w-[14%]" />
                    <col className="w-[18%]" />
                    <col className="w-[18%]" />
                    <col className="w-[16%]" />
                    <col className="w-[16%]" />
                    <col className="w-[12%]" />
                  </colgroup>

                  <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm border-b-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-center">
                    <tr>
                      <th className="py-3 px-2 border-r border-slate-200 dark:border-slate-700">
                        ลำดับ
                      </th>
                      <th className="py-3 px-2 border-r border-slate-200 dark:border-slate-700">
                        เดือน
                      </th>
                      <th className="py-3 px-2 border-r border-slate-200 dark:border-slate-700 text-right bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
                        ยอดประมาณการ
                      </th>
                      <th className="py-3 px-2 border-r border-slate-200 dark:border-slate-700 text-right font-black text-rose-600 dark:text-rose-400">
                        จ่ายจริง
                      </th>
                      <th className="py-3 px-2 border-r border-slate-200 dark:border-slate-700 text-right">
                        ผลต่าง
                      </th>
                      <th className="py-3 px-2 border-r border-slate-200 dark:border-slate-700 text-center">
                        สถานะบิล
                      </th>
                      <th className="py-3 px-2 text-center">
                        แจกแจงบิล
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-medium">
                    {displayExpenseRows.map(row => {
                      const isOverBudget = row.difference < 0;
                      const isCurrent = row.monthKey === currentMonthKey;
                      const isExpanded = expandedMonthKey === row.monthKey;

                      return (
                        <React.Fragment key={row.monthKey}>
                          <tr
                            className={`transition-colors ${
                              isCurrent
                                ? 'bg-rose-50/60 dark:bg-rose-950/25 font-bold hover:bg-rose-100/50'
                                : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            {/* 1. ลำดับ */}
                            <td className="py-2.5 px-2 text-center text-slate-500 border-r border-slate-100 dark:border-slate-800">
                              {isCurrent ? (
                                <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] inline-flex items-center justify-center">
                                  {row.index}
                                </span>
                              ) : (
                                row.index
                              )}
                            </td>

                            {/* 2. เดือน */}
                            <td className="py-2.5 px-2 text-center font-medium text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800 truncate">
                              <div className="flex items-center justify-center gap-1">
                                <span>{row.monthLabel}</span>
                                {isCurrent && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-600 text-white font-bold">
                                    ปัจจุบัน
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 3. ยอดประมาณการ */}
                            <td className="py-2.5 px-2 text-right border-r border-slate-100 dark:border-slate-800 font-bold text-amber-800 dark:text-amber-300 bg-amber-50/20 dark:bg-amber-950/10 truncate">
                              {formatCurrency(row.estimatedTotal)}
                            </td>

                            {/* 4. จ่ายจริง */}
                            <td className="py-2.5 px-2 text-right border-r border-slate-100 dark:border-slate-800 font-black text-rose-600 dark:text-rose-400 truncate">
                              {formatCurrency(row.actualTotal)}
                            </td>

                            {/* 5. ผลต่าง */}
                            <td
                              className={`py-2.5 px-2 text-right border-r border-slate-100 dark:border-slate-800 font-bold truncate ${
                                isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {isOverBudget
                                ? `-${formatCurrency(Math.abs(row.difference), false)}`
                                : `+${formatCurrency(row.difference, false)}`}
                            </td>

                            {/* 6. สถานะ */}
                            <td className="py-2.5 px-2 text-center border-r border-slate-100 dark:border-slate-800">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  row.paidCount === row.totalBills
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                {row.paidCount}/{row.totalBills} บิล
                              </span>
                            </td>

                            {/* 7. แจกแจงบิล (Accordion toggle) */}
                            <td className="py-2.5 px-2 text-center">
                              <button
                                onClick={() =>
                                  setExpandedMonthKey(prev => (prev === row.monthKey ? null : row.monthKey))
                                }
                                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold inline-flex items-center gap-1 transition"
                              >
                                <span>{isExpanded ? 'ย่อ' : 'ดูบิล'}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded detail row showing every recurring bill for this month */}
                          {isExpanded && (
                            <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                              <td colSpan={7} className="p-3 sm:p-4">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <span className="flex items-center gap-1.5">
                                      <Receipt className="w-4 h-4 text-emerald-600" />
                                      <span>รายละเอียดค่าใช้จ่ายประจำเดือน {row.monthLabel}</span>
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-normal">
                                      รวม {expenses.length} รายการหลัก + รายจ่ายย่อย ({formatCurrency(row.adhocTotal)})
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                    {expenses.map(exp => {
                                      const val = row.items[exp.id] ?? 0;
                                      return (
                                        <div
                                          key={exp.id}
                                          className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs"
                                        >
                                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1 truncate font-medium">
                                              <span>{exp.icon}</span>
                                              <span className="truncate">{exp.title}</span>
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                              งบ {formatCurrency(getExpenseEstimatedAmount(exp), false)}
                                            </span>
                                          </div>
                                          <div className="text-sm font-black text-slate-900 dark:text-white mt-1">
                                            {val > 0 ? formatCurrency(val) : '-'}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>

                  {/* Footer */}
                  <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-xs">
                    <tr>
                      <td colSpan={2} className="py-3 px-2 text-center text-slate-700 dark:text-slate-300">
                        รวมทั้งหมด ({allExpenseRows.length} เดือน)
                      </td>
                      <td className="py-3 px-2 text-right text-amber-800 dark:text-amber-300 font-black truncate">
                        {formatCurrency(allExpenseRows.reduce((acc, r) => acc + r.estimatedTotal, 0))}
                      </td>
                      <td className="py-3 px-2 text-right text-rose-600 dark:text-rose-400 font-black truncate">
                        {formatCurrency(allExpenseRows.reduce((acc, r) => acc + r.actualTotal, 0))}
                      </td>
                      <td colSpan={3} className="py-3 px-2 text-slate-500 text-right text-[11px]">
                        ยอดรวมงบประมาณการ vs จ่ายจริงสะสม
                      </td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                /* VIEW MODE 2: FULL SPREADSHEET (ตารางเต็มแยกทุกคอลัมน์บิล) */
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm border-b-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-center">
                    <tr>
                      <th className="py-3 px-2 w-12 border-r border-slate-200 dark:border-slate-700">
                        ลำดับ
                      </th>
                      <th className="py-3 px-3 w-24 border-r border-slate-200 dark:border-slate-700">
                        เดือน
                      </th>
                      <th className="py-3 px-3 w-28 border-r border-slate-200 dark:border-slate-700 text-right bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
                        ยอดประมาณการ
                      </th>
                      <th className="py-3 px-3 w-28 border-r border-slate-200 dark:border-slate-700 text-right font-black text-rose-600 dark:text-rose-400">
                        จ่ายจริง
                      </th>
                      <th className="py-3 px-3 w-24 border-r border-slate-200 dark:border-slate-700 text-right">
                        ผลต่าง
                      </th>
                      {expenses.map(e => (
                        <th
                          key={e.id}
                          className="py-3 px-2 min-w-[90px] border-r border-slate-200 dark:border-slate-700 text-right whitespace-nowrap"
                        >
                          <span className="mr-1">{e.icon}</span>
                          <span>{e.title}</span>
                        </th>
                      ))}
                      <th className="py-3 px-2 w-20 border-r border-slate-200 dark:border-slate-700 text-right">
                        ย่อย/ถอน
                      </th>
                      <th className="py-3 px-2 w-20 text-center">
                        สถานะ
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-medium">
                    {displayExpenseRows.map(row => {
                      const isOverBudget = row.difference < 0;
                      return (
                        <tr
                          key={row.monthKey}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-2.5 px-2 text-center text-slate-500 border-r border-slate-100 dark:border-slate-800">
                            {row.index}
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                            {row.monthLabel}
                          </td>
                          <td className="py-2.5 px-3 text-right border-r border-slate-100 dark:border-slate-800 font-bold text-amber-800 dark:text-amber-300 bg-amber-50/20 whitespace-nowrap">
                            {formatCurrency(row.estimatedTotal)}
                          </td>
                          <td className="py-2.5 px-3 text-right border-r border-slate-100 dark:border-slate-800 font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            {formatCurrency(row.actualTotal)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right border-r border-slate-100 dark:border-slate-800 font-bold whitespace-nowrap ${
                              isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isOverBudget
                              ? `-${formatCurrency(Math.abs(row.difference), false)}`
                              : `+${formatCurrency(row.difference, false)}`}
                          </td>
                          {expenses.map(e => {
                            const val = row.items[e.id] ?? 0;
                            return (
                              <td
                                key={e.id}
                                className="py-2.5 px-2 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap text-slate-800 dark:text-slate-200"
                              >
                                {val > 0 ? formatCurrency(val, false) : '-'}
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-2 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap text-slate-600">
                            {row.adhocTotal > 0 ? formatCurrency(row.adhocTotal, false) : '-'}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600">
                              {row.paidCount}/{row.totalBills}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

            </div>
          </div>
        )}
      </div>
    )}

      {/* ============================================================== */}
      {/* SUB-TAB 3: BUDGET SETTINGS & MONTHLY CHECKLIST                 */}
      {/* ============================================================== */}
      {activeTab === 'budget' && (
        <div className="space-y-6">
          
          {/* Header Row of Tab 3 with prominent "+ เพิ่มรายจ่ายประจำเดือน" button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                  จัดการยอดประมาณการ & รายจ่ายประจำเดือน
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  เพิ่มรายการบิลใหม่ กำหนดยอดงบประมาณ และแก้ไขได้ตลอดเวลา (เชื่อมต่อตารางรายจ่ายอัตโนมัติ)
                </p>
              </div>
            </div>

            {/* Direct Add Button right on Tab 3! */}
            <button
              onClick={() => onOpenExpenseModal(null)}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ เพิ่มรายจ่ายประจำเดือน</span>
            </button>
          </div>

          {/* Month Selector for Checklist */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <div className="flex items-center gap-2">
                  <div className="font-bold text-slate-900 dark:text-white text-base">
                    {getMonthLabel(selectedMonth)}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300">
                    ชำระแล้ว {paidCountSelectedMonth}/{recurringItemsSelectedMonth.length} บิล
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {allRecordedMonths.map(m => (
                  <option key={m} value={m}>
                    {getMonthLabel(m)} ({formatSpreadsheetMonth(m)})
                  </option>
                ))}
              </select>

              <button
                onClick={onForceResetNewMonth}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
                title="เคลียร์สถานะชำระเงินเพื่อเริ่มรอบใหม่"
              >
                เคลียร์รอบใหม่
              </button>
            </div>
          </div>

          {/* Recurring Expense Cards Grid with prominent Add Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Cards for each expense */}
            {recurringItemsSelectedMonth.map(item => {
              const isEditingThisEstimated = editingEstimatedExpId === item.id;
              const isEditingThisBill = editingBillId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all ${
                    item.isPaidInSelectedMonth
                      ? 'border-emerald-300 dark:border-emerald-500/30'
                      : 'border-slate-200 dark:border-slate-800 shadow-sm'
                  }`}
                >
                  {/* Top: Icon, Title, Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl flex-shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          <span>{item.category}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            วันที่ {item.dueDay || 1}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenExpenseModal(item)}
                        className="p-1 text-slate-400 hover:text-indigo-600 transition"
                        title="แก้ไขข้อมูลหลักของรายการนี้"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteExpense(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Estimated Amount Box (ยอดประมาณการที่แก้ไขได้ตลอดเวลา) */}
                  <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <span>📊</span>
                        <span>ยอดประมาณการประจำเดือน</span>
                      </span>
                      {!isEditingThisEstimated && (
                        <button
                          onClick={() => handleStartEditEstimated(item.id, item.estimatedAmt)}
                          className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold text-[10px] flex items-center gap-0.5"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                          <span>แก้ไขประมาณการ</span>
                        </button>
                      )}
                    </div>

                    {isEditingThisEstimated ? (
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-xs font-bold text-slate-400">฿</span>
                        <input
                          type="number"
                          value={tempEstimatedVal}
                          onChange={e => setTempEstimatedVal(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEstimated(item.id)}
                          className="flex-1 px-2 py-1 text-xs rounded-lg border border-emerald-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEstimated(item.id)}
                          className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition"
                          title="บันทึก"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingEstimatedExpId(null)}
                          className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          title="ยกเลิก"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-base font-black text-slate-900 dark:text-white">
                        {formatCurrency(item.estimatedAmt)}
                        <span className="text-[10px] font-normal text-slate-400 ml-1.5">
                          {item.amountType === 'variable' ? '(ผันแปรตามบิล)' : '(คงที่)'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actual Bill & Paid Checklist for Selected Month */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400">ยอดบิลรอบเดือน {getMonthLabel(selectedMonth)}:</span>
                      {isEditingThisBill ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <input
                            type="number"
                            value={tempBillAmount}
                            onChange={e => setTempBillAmount(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveBillEdit(item.id)}
                            className="w-20 px-1.5 py-0.5 text-xs rounded border border-emerald-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveBillEdit(item.id)}
                            className="px-1.5 py-0.5 text-[10px] bg-emerald-600 text-white rounded font-bold"
                          >
                            เซฟ
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                            {formatCurrency(item.monthAmount)}
                          </span>
                          {item.amountType === 'variable' && (
                            <button
                              onClick={() => handleStartEditBill(item.id, item.monthAmount)}
                              className="text-slate-400 hover:text-emerald-500"
                              title="แก้บิลจริงรอบเดือนนี้"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Paid Toggle Button */}
                    <button
                      type="button"
                      onClick={() => onToggleExpensePaid(item.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
                        item.isPaidInSelectedMonth
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {item.isPaidInSelectedMonth ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>ชำระแล้ว</span>
                        </>
                      ) : (
                        <span>ยังไม่จ่าย</span>
                      )}
                    </button>
                  </div>

                </div>
              );
            })}

            {/* Direct "+ เพิ่มรายจ่ายประจำใหม่" Card */}
            <button
              onClick={() => onOpenExpenseModal(null)}
              className="p-6 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 group min-h-[180px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition shadow-xs">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div className="text-center">
                <span className="font-bold text-sm block text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  + เพิ่มรายจ่ายประจำเดือนใหม่
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  กำหนดชื่อ, ไอคอน, รูปแบบบิล และยอดประมาณการ
                </span>
              </div>
            </button>

          </div>

        </div>
      )}

      {/* Inline Modal for Editing Income of a Specific Month */}
      {editingIncomeMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  แก้ไขรายรับรอบเดือน {formatSpreadsheetMonth(editingIncomeMonth)}
                </h3>
              </div>
              <button
                onClick={() => setEditingIncomeMonth(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              ระบุตัวเลขรายได้ของ เจ, เมย์ และรายได้อื่นๆ ของเดือนนี้ ระบบจะบันทึกลงตารางรายรับทันที
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  💼 รายได้เจ (บาท)
                </label>
                <input
                  type="number"
                  step="any"
                  value={editIncomeA}
                  onChange={e => setEditIncomeA(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  💼 รายได้เมย์ (บาท)
                </label>
                <input
                  type="number"
                  step="any"
                  value={editIncomeB}
                  onChange={e => setEditIncomeB(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ✨ รายได้อื่นๆ / พิเศษ (บาท)
                </label>
                <input
                  type="number"
                  step="any"
                  value={editIncomeOther}
                  onChange={e => setEditIncomeOther(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingIncomeMonth(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveIncome}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
              >
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
