import React, { useState, useMemo } from 'react';
import type { HouseholdSettings, MonthlyExpense, Transaction } from '../types';
import { formatCurrency, formatThaiDate, getCurrentYearMonth, getMonthLabel } from '../utils/formatters';
import { getExpenseAmountForMonth } from '../utils/monthlyAnalytics';
import { getExpenseDueStatus } from '../utils/expenseHelpers';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Receipt,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Search,
  Filter,
} from 'lucide-react';

interface MonthlyLedgerViewProps {
  settings: HouseholdSettings;
  expenses: MonthlyExpense[];
  transactions: Transaction[];
  onOpenExpenseModal: (expense?: MonthlyExpense | null) => void;
  onOpenAddTransactionModal: (type?: 'deposit' | 'withdrawal', category?: string) => void;
  onToggleExpensePaid: (expenseId: string) => void;
  onUpdateExpenseBill: (expenseId: string, amount: number, markAsPaid?: boolean) => void;
  onDeleteExpense: (expenseId: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onForceResetNewMonth: () => void;
}

export const MonthlyLedgerView: React.FC<MonthlyLedgerViewProps> = ({
  settings,
  expenses,
  transactions,
  onOpenExpenseModal,
  onOpenAddTransactionModal,
  onToggleExpensePaid,
  onUpdateExpenseBill,
  onDeleteExpense,
  onEditTransaction,
  onDeleteTransaction,
  onForceResetNewMonth,
}) => {
  // Current active month for viewing ledger
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentYearMonth());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayer, setFilterPayer] = useState<'all' | 'person_a' | 'person_b' | 'joint'>('all');
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [tempBillAmount, setTempBillAmount] = useState<string>('');

  // Available months list (e.g. last 12 months)
  const availableMonths = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      list.push({ key, label: getMonthLabel(key) });
    }
    return list;
  }, []);

  const handlePrevMonth = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let y = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10) - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let y = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10) + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  // 1. Calculate Monthly Incomes
  const memberA = settings.members.person_a;
  const memberB = settings.members.person_b;
  const baseIncomeA = memberA.monthlyIncome || 40250;
  const baseIncomeB = memberB.monthlyIncome || 22850.90;

  // Extra income deposits in this month
  const monthlyExtraIncomes = useMemo(() => {
    return transactions.filter(
      t => t.date.startsWith(selectedMonth) && t.type === 'deposit' && t.category === 'รายได้พิเศษ'
    );
  }, [transactions, selectedMonth]);

  const totalExtraIncome = useMemo(
    () => monthlyExtraIncomes.reduce((acc, t) => acc + t.amount, 0),
    [monthlyExtraIncomes]
  );

  const totalIncome = baseIncomeA + baseIncomeB + totalExtraIncome;

  // 2. Calculate Recurring Expenses for this month
  const recurringItems = useMemo(() => {
    return expenses.map(exp => {
      const amount = getExpenseAmountForMonth(exp, selectedMonth);
      const dueStatus = getExpenseDueStatus(exp);
      const isPaid = exp.lastPaidMonth === selectedMonth || (selectedMonth === getCurrentYearMonth() && exp.isPaidThisMonth);
      return {
        ...exp,
        monthAmount: amount,
        isPaidInSelectedMonth: Boolean(isPaid),
        dueStatus,
      };
    });
  }, [expenses, selectedMonth]);

  const filteredRecurringItems = useMemo(() => {
    return recurringItems.filter(item => {
      if (filterPayer !== 'all' && item.payer !== filterPayer) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          item.title.toLowerCase().includes(term) ||
          item.category.toLowerCase().includes(term) ||
          (item.note && item.note.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [recurringItems, filterPayer, searchTerm]);

  const totalRecurringExpense = useMemo(
    () => recurringItems.reduce((acc, i) => acc + i.monthAmount, 0),
    [recurringItems]
  );

  const paidCount = useMemo(
    () => recurringItems.filter(i => i.isPaidInSelectedMonth).length,
    [recurringItems]
  );

  // 3. Ad-hoc withdrawals / daily expenses for this month
  const monthlyAdhocExpenses = useMemo(() => {
    return transactions.filter(
      t => t.date.startsWith(selectedMonth) && t.type === 'withdrawal'
    );
  }, [transactions, selectedMonth]);

  const filteredAdhocExpenses = useMemo(() => {
    return monthlyAdhocExpenses.filter(t => {
      if (filterPayer !== 'all' && t.contributorId !== filterPayer) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          (t.withdrawalReason && t.withdrawalReason.toLowerCase().includes(term)) ||
          (t.note && t.note.toLowerCase().includes(term)) ||
          t.category.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [monthlyAdhocExpenses, filterPayer, searchTerm]);

  const totalAdhocExpense = useMemo(
    () => monthlyAdhocExpenses.reduce((acc, t) => acc + t.amount, 0),
    [monthlyAdhocExpenses]
  );

  const totalExpenses = totalRecurringExpense + totalAdhocExpense;
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Handle Quick Bill Edit
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
      
      {/* Month Selector Bar & Action Header */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Title & Page Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
                  หน้า 2
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  ตารางรายรับ-รายจ่าย รายเดือน
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                บันทึกและตรวจสอบรายละเอียดการเงินประจำเดือน {getMonthLabel(selectedMonth)}
              </p>
            </div>
          </div>

          {/* Month Stepper & Select */}
          <div className="flex items-center gap-2 self-stretch md:self-auto bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={handlePrevMonth}
              title="เดือนก่อนหน้า"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-2">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              >
                {availableMonths.map(m => (
                  <option key={m.key} value={m.key} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleNextMonth}
              title="เดือนถัดไป"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* 3 Summary Badges for Selected Month */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          
          <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                รายรับรวมรอบเดือนนี้
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100">
                {formatCurrency(totalIncome)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-200/50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/40 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                รายจ่ายรวมรอบเดือนนี้
              </span>
              <div className="text-xl sm:text-2xl font-black text-rose-900 dark:text-rose-100">
                {formatCurrency(totalExpenses)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-200/50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/40 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">
                คงเหลือสุทธิ / เงินออม
              </span>
              <div className="text-xl sm:text-2xl font-black text-indigo-900 dark:text-indigo-100">
                {formatCurrency(netSavings)}
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-600 text-white">
              ออม {savingsRate.toFixed(1)}%
            </span>
          </div>

        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อบิล, หมวดหมู่..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Payer Filter */}
        <div className="flex items-center gap-1.5 self-stretch sm:self-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 flex items-center gap-1 font-medium pl-1">
            <Filter className="w-3.5 h-3.5" />
            ผู้จ่าย:
          </span>
          <button
            onClick={() => setFilterPayer('all')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterPayer === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setFilterPayer('person_a')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterPayer === 'person_a'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {memberA.nickname} (เจ)
          </button>
          <button
            onClick={() => setFilterPayer('person_b')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterPayer === 'person_b'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {memberB.nickname} (เมย์)
          </button>
          <button
            onClick={() => setFilterPayer('joint')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterPayer === 'joint'
                ? 'bg-teal-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            กองกลาง
          </button>
        </div>
      </div>

      {/* 1. ตารางรายรับประจำเดือน (Monthly Income Table) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                1. ตารางรายรับประจำเดือน (Incomes)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                เงินเดือนประจำและรายได้เสริมของสมาชิก
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenAddTransactionModal('deposit', 'รายได้พิเศษ')}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>เพิ่มรายรับพิเศษ</span>
          </button>
        </div>

        {/* Income Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                <th className="pb-3 pl-2">รายการ</th>
                <th className="pb-3">ผู้รับ</th>
                <th className="pb-3">หมวดหมู่</th>
                <th className="pb-3 text-right">จำนวนเงิน</th>
                <th className="pb-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              
              {/* Member A regular salary */}
              {(filterPayer === 'all' || filterPayer === 'person_a') && (
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 pl-2 flex items-center gap-2">
                    <span className="text-base">💼</span>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">เงินเดือนประจำ (เจ)</div>
                      <div className="text-[10px] text-slate-400">โอนเข้าทุกสิ้นเดือน / ต้นเดือน</div>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-500/20">
                      {memberA.avatar} {memberA.nickname}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500 dark:text-slate-400">เงินเดือนประจำ</td>
                  <td className="py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatCurrency(baseIncomeA)}
                  </td>
                  <td className="py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                      ได้รับแล้ว
                    </span>
                  </td>
                </tr>
              )}

              {/* Member B regular salary */}
              {(filterPayer === 'all' || filterPayer === 'person_b') && (
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 pl-2 flex items-center gap-2">
                    <span className="text-base">💼</span>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">เงินเดือนประจำ (เมย์)</div>
                      <div className="text-[10px] text-slate-400">โอนเข้าทุกสิ้นเดือน / ต้นเดือน</div>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold border border-indigo-200 dark:border-indigo-500/20">
                      {memberB.avatar} {memberB.nickname}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500 dark:text-slate-400">เงินเดือนประจำ</td>
                  <td className="py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatCurrency(baseIncomeB)}
                  </td>
                  <td className="py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                      ได้รับแล้ว
                    </span>
                  </td>
                </tr>
              )}

              {/* Extra Incomes */}
              {monthlyExtraIncomes.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 pl-2 flex items-center gap-2">
                    <span className="text-base">✨</span>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{item.note || 'รายได้พิเศษ'}</div>
                      <div className="text-[10px] text-slate-400">{formatThaiDate(item.date)}</div>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      {item.contributorId === 'person_a' ? memberA.nickname : item.contributorId === 'person_b' ? memberB.nickname : 'กองกลาง'}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500 dark:text-slate-400">รายได้พิเศษ</td>
                  <td className="py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                      ได้รับแล้ว
                    </span>
                  </td>
                </tr>
              ))}

            </tbody>
          </table>
        </div>
      </div>

      {/* 2. ตารางรายจ่ายประจำและบิล (Monthly Recurring Expenses & Bills Table) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  2. ตารางรายจ่ายประจำ & บิล (Recurring Expenses)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300">
                  ชำระแล้ว {paidCount}/{recurringItems.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                รวม 7 รายการหลัก (ค่างวดรถ, เงินเดือนแม่, บัตร KTC, บัตร TTB, ประกัน, ที่พัก, ค่าไฟ)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onForceResetNewMonth}
              title="รีเซ็ตสถานะชำระเงินทั้งหมดเพื่อเริ่มรอบเดือนใหม่"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
            >
              เคลียร์รอบใหม่
            </button>
            <button
              onClick={() => onOpenExpenseModal(null)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>เพิ่มรายจ่ายประจำ</span>
            </button>
          </div>
        </div>

        {/* Recurring Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                <th className="pb-3 text-center w-12">จ่ายแล้ว</th>
                <th className="pb-3 pl-2">รายการบิล</th>
                <th className="pb-3">กำหนดจ่าย</th>
                <th className="pb-3">ผู้จ่าย</th>
                <th className="pb-3 text-right">ยอดเงินรอบนี้</th>
                <th className="pb-3 text-right pr-2">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredRecurringItems.map(item => (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition ${
                    item.isPaidInSelectedMonth ? 'opacity-85' : ''
                  }`}
                >
                  {/* Paid Checkbox */}
                  <td className="py-3 text-center">
                    <button
                      type="button"
                      onClick={() => onToggleExpensePaid(item.id)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${
                        item.isPaidInSelectedMonth
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:border-emerald-500 border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {item.isPaidInSelectedMonth ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span className="w-2 h-2 rounded-sm bg-slate-300 dark:bg-slate-600" />
                      )}
                    </button>
                  </td>

                  {/* Title & Notes */}
                  <td className="py-3 pl-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl flex-shrink-0">{item.icon}</span>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className={item.isPaidInSelectedMonth ? 'line-through text-slate-400 dark:text-slate-500' : ''}>
                            {item.title}
                          </span>
                          {item.amountType === 'variable' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-semibold">
                              ผันแปร
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.note || item.category}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Due Day */}
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      ทุกวันที่ {item.dueDay || 1}
                    </span>
                  </td>

                  {/* Payer */}
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                      item.payer === 'person_a'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'
                        : item.payer === 'person_b'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20'
                        : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/20'
                    }`}>
                      {item.payer === 'person_a' ? memberA.nickname : item.payer === 'person_b' ? memberB.nickname : 'กองกลาง'}
                    </span>
                  </td>

                  {/* Amount with inline edit */}
                  <td className="py-3 text-right">
                    {editingBillId === item.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          value={tempBillAmount}
                          onChange={e => setTempBillAmount(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveBillEdit(item.id)}
                          className="w-24 px-2 py-1 text-right text-xs rounded-lg border border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveBillEdit(item.id)}
                          className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold"
                        >
                          บันทึก
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {formatCurrency(item.monthAmount)}
                        </span>
                        {item.amountType === 'variable' && (
                          <button
                            onClick={() => handleStartEditBill(item.id, item.monthAmount)}
                            title="แก้ไขยอดบิลของเดือนนี้"
                            className="p-1 text-slate-400 hover:text-emerald-600 transition"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-3 text-right pr-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onOpenExpenseModal(item)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="แก้ไขข้อมูลหลักของบิลนี้"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteExpense(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="ลบบิลนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. ตารางค่าใช้จ่ายย่อย & การถอนเงิน (Ad-hoc Expenses & Withdrawals Table) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                3. ค่าใช้จ่ายย่อย & รายการถอนเงิน (Ad-hoc Expenses & Withdrawals)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ค่าใช้จ่ายผันแปร ค่าซ่อมบำรุง หรือเงินที่ถอนใช้ระหว่างเดือน
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenAddTransactionModal('withdrawal', 'อื่นๆ')}
            className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 text-xs font-bold hover:bg-rose-100 transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>บันทึกรายจ่ายย่อย</span>
          </button>
        </div>

        {filteredAdhocExpenses.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            ไม่มีรายการรายจ่ายย่อยพิเศษในเดือน {getMonthLabel(selectedMonth)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-3 pl-2">วันที่</th>
                  <th className="pb-3">รายการ</th>
                  <th className="pb-3">หมวดหมู่</th>
                  <th className="pb-3">ผู้จ่าย</th>
                  <th className="pb-3 text-right">จำนวนเงิน</th>
                  <th className="pb-3 text-right pr-2">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredAdhocExpenses.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 pl-2 text-slate-500 dark:text-slate-400">
                      {formatThaiDate(item.date)}
                    </td>
                    <td className="py-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {item.withdrawalReason || item.note || 'รายจ่ายย่อย'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        หักจาก{item.targetFund === 'operating' ? '💳 กองหมุนเวียน' : '🏛️ กองระยะยาว'}
                      </div>
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">{item.category}</td>
                    <td className="py-3">
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        {item.contributorId === 'person_a' ? memberA.nickname : item.contributorId === 'person_b' ? memberB.nickname : 'กองกลาง'}
                      </span>
                    </td>
                    <td className="py-3 text-right font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                      -{formatCurrency(item.amount)}
                    </td>
                    <td className="py-3 text-right pr-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditTransaction(item)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteTransaction(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
