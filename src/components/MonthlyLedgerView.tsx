import React, { useState, useMemo } from 'react';
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
  // Sub-tabs: 1. Incomes Table (Image 1), 2. Expenses Table (Image 1 style), 3. Budget & Checklist
  const [activeTab, setActiveTab] = useState<'incomes' | 'expenses' | 'budget'>('incomes');
  const [sortOrder, setSortOrder] = useState<'chronological' | 'latest'>('chronological');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentYearMonth());

  // Inline income editing modal/state
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

  // Base incomes
  const memberA = settings.members.person_a;
  const memberB = settings.members.person_b;
  const baseIncomeA = memberA.monthlyIncome || 40250;
  const baseIncomeB = memberB.monthlyIncome || 22850.90;

  // 1. Gather all unique months recorded across incomes, expenses, and transactions
  const allRecordedMonths = useMemo(() => {
    const set = new Set<string>();

    // From settings.monthlyIncomes
    if (settings.monthlyIncomes) {
      Object.keys(settings.monthlyIncomes).forEach(m => set.add(m));
    }

    // From expenses monthlyBills
    expenses.forEach(e => {
      if (e.monthlyBills) {
        Object.keys(e.monthlyBills).forEach(m => set.add(m));
      }
    });

    // From transactions
    transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        set.add(t.date.slice(0, 7));
      }
    });

    // Always include current month
    set.add(getCurrentYearMonth());

    const list = Array.from(set).sort();
    return list;
  }, [settings.monthlyIncomes, expenses, transactions]);

  // 2. Build Incomes Table Data matching Image 1
  const allIncomeRows = useMemo<MonthIncomeData[]>(() => {
    return allRecordedMonths.map((mKey, idx) => {
      const custom = settings.monthlyIncomes?.[mKey];
      const incA = custom?.person_a !== undefined ? custom.person_a : baseIncomeA;
      const incB = custom?.person_b !== undefined ? custom.person_b : baseIncomeB;

      // Other income: custom override or sum of deposit transactions marked as 'รายได้พิเศษ'
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

      // Compute total expenses for this month to derive "คงเหลือ" (Net balance)
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
  const allExpenseRows = useMemo<MonthExpenseData[]>(() => {
    // Total estimated expense per month = sum of all recurring expenses estimated amounts
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
          e.lastPaidMonth === mKey || (mKey === getCurrentYearMonth() && e.isPaidThisMonth);
        if (isPaid) paidCount++;
      });

      // Ad-hoc withdrawals in month
      let adhocTotal = 0;
      transactions.forEach(t => {
        if (t.date.startsWith(mKey) && t.type === 'withdrawal') {
          adhocTotal += t.amount;
        }
      });
      actualTotal += adhocTotal;

      const diff = baseEstimated - actualTotal; // positive = under budget / saved; negative = exceeded

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
  }, [allRecordedMonths, expenses, transactions]);

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

  // Recurring items for Selected Month (Tab 3)
  const recurringItemsSelectedMonth = useMemo(() => {
    return expenses.map(exp => {
      const amount = getExpenseAmountForMonth(exp, selectedMonth);
      const estimatedAmt = getExpenseEstimatedAmount(exp);
      const isPaid =
        exp.lastPaidMonth === selectedMonth ||
        (selectedMonth === getCurrentYearMonth() && exp.isPaidThisMonth);

      return {
        ...exp,
        monthAmount: amount,
        estimatedAmt,
        isPaidInSelectedMonth: Boolean(isPaid),
      };
    });
  }, [expenses, selectedMonth]);

  const paidCountSelectedMonth = useMemo(
    () => recurringItemsSelectedMonth.filter(i => i.isPaidInSelectedMonth).length,
    [recurringItemsSelectedMonth]
  );

  // Handlers for Income Editing
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
    <div className="space-y-7 animate-in fade-in duration-300">
      
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
              รอบเดือนปัจจุบัน ({getMonthLabel(getCurrentYearMonth())})
            </span>
            <div className="text-2xl font-black text-white mt-0.5">
              {formatCurrency(
                (settings.monthlyIncomes?.[getCurrentYearMonth()]?.person_a ?? baseIncomeA) +
                  (settings.monthlyIncomes?.[getCurrentYearMonth()]?.person_b ?? baseIncomeB)
              )}
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
          {activeTab === 'expenses' && 'คอลัมน์: ลำดับ | เดือน | ประมาณการ | จ่ายจริง | ผลต่าง | แต่ละรายการ'}
          {activeTab === 'budget' && 'แก้ไขยอดประมาณการได้ทันที (คลิก ✏️)'}
        </span>
      </div>

      {/* Toolbar: Search & Sort Order */}
      {(activeTab === 'incomes' || activeTab === 'expenses') && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ค้นหาเดือน เช่น มิ.ย.-2021, 2024..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 text-xs">
            <button
              onClick={() =>
                setSortOrder(prev => (prev === 'chronological' ? 'latest' : 'chronological'))
              }
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition flex items-center gap-1.5"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                {sortOrder === 'chronological'
                  ? 'เรียงตามเวลา (เก่า ➔ ใหม่ แบบรูปที่ 1)'
                  : 'เรียงล่าสุดก่อน (ใหม่ ➔ เก่า)'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 1: INCOMES TABLE (EXACT SPREADSHEET MATCHING IMAGE 1) */}
      {/* ============================================================== */}
      {activeTab === 'incomes' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                
                {/* Table Header matching Image 1 */}
                <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm border-b-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-center">
                  <tr>
                    <th className="py-3 px-3 w-14 border-r border-slate-200 dark:border-slate-700">
                      ลำดับ
                    </th>
                    <th className="py-3 px-4 w-32 border-r border-slate-200 dark:border-slate-700">
                      วันที่
                    </th>
                    <th className="py-3 px-4 w-36 border-r border-slate-200 dark:border-slate-700 text-right">
                      คงเหลือ
                    </th>
                    <th className="py-3 px-4 w-36 border-r border-slate-200 dark:border-slate-700 text-right">
                      เจ
                    </th>
                    <th className="py-3 px-4 w-36 border-r border-slate-200 dark:border-slate-700 text-right">
                      เมย์
                    </th>
                    <th className="py-3 px-4 w-36 border-r border-slate-200 dark:border-slate-700 text-right">
                      อื่นๆ
                    </th>
                    <th className="py-3 px-4 w-40 border-r border-slate-200 dark:border-slate-700 text-right font-black text-emerald-800 dark:text-emerald-300">
                      รวมรายรับ
                    </th>
                    <th className="py-3 px-3 w-20 text-center">
                      แก้ไข
                    </th>
                  </tr>
                </thead>

                {/* Table Body matching Image 1 */}
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-medium">
                  {displayIncomeRows.map(row => {
                    const isZeroNet = Math.abs(row.netBalance) < 0.01;
                    const isNegNet = row.netBalance < 0;

                    return (
                      <tr
                        key={row.monthKey}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* 1. ลำดับ */}
                        <td className="py-2.5 px-3 text-center text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                          {row.index}
                        </td>

                        {/* 2. วันที่ / เดือน (มิ.ย.-2021) */}
                        <td className="py-2.5 px-4 text-center font-medium text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                          {row.monthLabel}
                        </td>

                        {/* 3. คงเหลือ (Net balance e.g. ฿ -, ฿ 530.00, ฿ (846.60)) */}
                        <td
                          className={`py-2.5 px-4 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap font-medium ${
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
                        <td className="py-2.5 px-4 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrencySpreadsheet(row.person_a)}
                        </td>

                        {/* 5. เมย์ (May) */}
                        <td className="py-2.5 px-4 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrencySpreadsheet(row.person_b)}
                        </td>

                        {/* 6. อื่นๆ (Other) */}
                        <td className="py-2.5 px-4 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {formatCurrencySpreadsheet(row.other)}
                        </td>

                        {/* 7. รวมรายรับ (Total Income) */}
                        <td className="py-2.5 px-4 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatCurrency(row.totalIncome)}
                        </td>

                        {/* 8. แก้ไข (Edit) */}
                        <td className="py-2.5 px-3 text-center">
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
                    <td colSpan={2} className="py-3 px-4 text-center text-slate-700 dark:text-slate-300">
                      รวมทั้งหมด ({allIncomeRows.length} เดือน)
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      -
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-black">
                      {formatCurrency(allIncomeRows.reduce((acc, r) => acc + r.person_a, 0))}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-black">
                      {formatCurrency(allIncomeRows.reduce((acc, r) => acc + r.person_b, 0))}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-black">
                      {formatCurrency(allIncomeRows.reduce((acc, r) => acc + r.other, 0))}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-black text-sm">
                      {formatCurrency(totalIncomeAllMonths)}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400">
                      -
                    </td>
                  </tr>
                </tfoot>

              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 2: EXPENSES TABLE (MULTI-MONTH SPREADSHEET FORMAT)     */}
      {/* ============================================================== */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                
                {/* Header */}
                <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm border-b-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-center">
                  <tr>
                    <th className="py-3 px-3 w-12 border-r border-slate-200 dark:border-slate-700">
                      ลำดับ
                    </th>
                    <th className="py-3 px-4 w-28 border-r border-slate-200 dark:border-slate-700">
                      เดือน
                    </th>
                    <th className="py-3 px-4 w-32 border-r border-slate-200 dark:border-slate-700 text-right bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
                      ยอดประมาณการ
                    </th>
                    <th className="py-3 px-4 w-32 border-r border-slate-200 dark:border-slate-700 text-right font-black text-rose-600 dark:text-rose-400">
                      จ่ายจริง
                    </th>
                    <th className="py-3 px-4 w-28 border-r border-slate-200 dark:border-slate-700 text-right">
                      ผลต่าง
                    </th>
                    {/* Recurring bill item columns */}
                    {expenses.map(e => (
                      <th
                        key={e.id}
                        className="py-3 px-3 min-w-[100px] border-r border-slate-200 dark:border-slate-700 text-right whitespace-nowrap"
                      >
                        <span className="mr-1">{e.icon}</span>
                        <span>{e.title}</span>
                      </th>
                    ))}
                    <th className="py-3 px-3 w-28 border-r border-slate-200 dark:border-slate-700 text-right">
                      ย่อย/ถอน
                    </th>
                    <th className="py-3 px-3 w-24 text-center">
                      สถานะ
                    </th>
                  </tr>
                </thead>

                {/* Body */}
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-medium">
                  {displayExpenseRows.map(row => {
                    const isOverBudget = row.difference < 0;

                    return (
                      <tr
                        key={row.monthKey}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* 1. ลำดับ */}
                        <td className="py-2.5 px-3 text-center text-slate-500 border-r border-slate-100 dark:border-slate-800">
                          {row.index}
                        </td>

                        {/* 2. เดือน */}
                        <td className="py-2.5 px-4 text-center font-medium text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                          {row.monthLabel}
                        </td>

                        {/* 3. ยอดประมาณการ */}
                        <td className="py-2.5 px-4 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap font-bold text-amber-800 dark:text-amber-300 bg-amber-50/30 dark:bg-amber-950/10">
                          {formatCurrency(row.estimatedTotal)}
                        </td>

                        {/* 4. จ่ายจริง */}
                        <td className="py-2.5 px-4 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap font-black text-rose-600 dark:text-rose-400">
                          {formatCurrency(row.actualTotal)}
                        </td>

                        {/* 5. ผลต่าง */}
                        <td
                          className={`py-2.5 px-4 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap font-bold ${
                            isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isOverBudget
                            ? `-${formatCurrency(Math.abs(row.difference), false)}`
                            : `+${formatCurrency(row.difference, false)}`}
                        </td>

                        {/* Each recurring item */}
                        {expenses.map(e => {
                          const val = row.items[e.id] ?? 0;
                          return (
                            <td
                              key={e.id}
                              className="py-2.5 px-3 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap text-slate-800 dark:text-slate-200"
                            >
                              {val > 0 ? formatCurrency(val, false) : '-'}
                            </td>
                          );
                        })}

                        {/* Adhoc */}
                        <td className="py-2.5 px-3 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {row.adhocTotal > 0 ? formatCurrency(row.adhocTotal, false) : '-'}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 text-center">
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
                      </tr>
                    );
                  })}
                </tbody>

                {/* Footer */}
                <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-xs">
                  <tr>
                    <td colSpan={2} className="py-3 px-4 text-center text-slate-700 dark:text-slate-300">
                      รวมทั้งหมด ({allExpenseRows.length} เดือน)
                    </td>
                    <td className="py-3 px-4 text-right text-amber-800 dark:text-amber-300 font-black">
                      {formatCurrency(allExpenseRows.reduce((acc, r) => acc + r.estimatedTotal, 0))}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400 font-black">
                      {formatCurrency(allExpenseRows.reduce((acc, r) => acc + r.actualTotal, 0))}
                    </td>
                    <td colSpan={expenses.length + 3} className="py-3 px-4 text-slate-400 text-right">
                      ยอดรวมประเมิน vs จ่ายจริงสะสม
                    </td>
                  </tr>
                </tfoot>

              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 3: BUDGET SETTINGS & MONTHLY CHECKLIST                 */}
      {/* ============================================================== */}
      {activeTab === 'budget' && (
        <div className="space-y-6">
          
          {/* Month Selector for Checklist */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
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
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
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

          {/* Prompt explaining: "ยอดประมาณการก็ ใส่ตอนเพิ่มรายจ่าย หรือสามารถแก้ทีหลังได้" */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
            <span className="text-base flex-shrink-0">💡</span>
            <div>
              <span className="font-bold">จัดการยอดประมาณการประจำเดือน (Budget):</span>
              <p className="mt-0.5 text-emerald-800/90 dark:text-emerald-300/90">
                คุณสามารถกดปุ่ม <span className="font-bold">✏️ แก้ไขประมาณการ</span> ที่การ์ดแต่ละรายการด้านล่าง เพื่อเปลี่ยนยอดงบประมาณได้ทันที หรือกดแก้ไขเพื่อเปลี่ยนชื่อ/หมวดหมู่/รูปแบบบิล
              </p>
            </div>
          </div>

          {/* Recurring Expense Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
