import React, { useState, useMemo } from 'react';
import type { HouseholdSettings, MonthlyExpense, Transaction } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';
import {
  buildMonthlyMetricsHistory,
  getCategoryExpenseBreakdownForMonth,
} from '../utils/monthlyAnalytics';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  CreditCard,
  Zap,
  PieChart as PieIcon,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

interface DashboardViewProps {
  settings: HouseholdSettings;
  expenses: MonthlyExpense[];
  transactions: Transaction[];
  onNavigateToTab?: (tab: 'dashboard' | 'monthly_ledger' | 'savings' | 'investment_tax') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  settings,
  expenses,
  transactions,
  onNavigateToTab,
}) => {
  const [rangeMonths, setRangeMonths] = useState<6 | 12>(6);

  // Compute 6 or 12 months history
  const history = useMemo(
    () => buildMonthlyMetricsHistory(settings, expenses, transactions, rangeMonths),
    [settings, expenses, transactions, rangeMonths]
  );

  // Default selected month for Pie chart is the latest month in history
  const [selectedPieMonth, setSelectedPieMonth] = useState<string>(() => {
    return history.length > 0 ? history[history.length - 1].monthKey : '2026-09';
  });

  // Keep selectedPieMonth valid if history changes
  const effectivePieMonth = useMemo(() => {
    if (history.some(h => h.monthKey === selectedPieMonth)) {
      return selectedPieMonth;
    }
    return history.length > 0 ? history[history.length - 1].monthKey : '2026-09';
  }, [history, selectedPieMonth]);

  const currentMonthData = useMemo(() => {
    return history[history.length - 1] || {
      totalIncome: 63100.90,
      totalExpenses: 26923,
      netSavings: 36177.90,
      expenseRatio: 42.67,
      savingsRatio: 57.33,
      creditCardTotal: 6397.11,
      creditCardRatio: 10.14,
      electricityBill: 662.89,
      monthKey: '2026-09',
      label: "ก.ย. '69",
    };
  }, [history]);

  const prevMonthData = useMemo(() => {
    return history.length > 1 ? history[history.length - 2] : null;
  }, [history]);

  // Electricity stats
  const electricityAvg = useMemo(() => {
    const sum = history.reduce((acc, h) => acc + h.electricityBill, 0);
    return history.length > 0 ? sum / history.length : 0;
  }, [history]);

  const electricityDiffPercent = useMemo(() => {
    if (!prevMonthData || prevMonthData.electricityBill <= 0) return 0;
    return ((currentMonthData.electricityBill - prevMonthData.electricityBill) / prevMonthData.electricityBill) * 100;
  }, [currentMonthData, prevMonthData]);

  // Pie chart category slices
  const categorySlices = useMemo(
    () => getCategoryExpenseBreakdownForMonth(expenses, transactions, effectivePieMonth),
    [expenses, transactions, effectivePieMonth]
  );

  const totalPieExpenses = useMemo(
    () => categorySlices.reduce((acc, s) => acc + s.amount, 0),
    [categorySlices]
  );

  // Custom tooltips
  const renderCurrencyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-xs space-y-1 backdrop-blur-md">
          <div className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1 mb-1.5">
            เดือน {label}
          </div>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: p.color || p.stroke }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || p.stroke }} />
                <span>{p.name}:</span>
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {typeof p.value === 'number'
                  ? p.name.includes('%') || p.dataKey.toLowerCase().includes('ratio')
                    ? formatPercent(p.value)
                    : formatCurrency(p.value)
                  : p.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      
      {/* Top Header & Range Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600/10 via-teal-500/10 to-transparent p-5 rounded-3xl border border-emerald-500/20 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
              หน้า 1
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Dashboard สรุปภาพรวม & กราฟแนวโน้ม
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
            สรุปข้อมูลรายรับ รายจ่าย ค่าบัตรเครดิต ค่าไฟ และสัดส่วนการเงินของครอบครัว
          </p>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <button
            onClick={() => setRangeMonths(6)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              rangeMonths === 6
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ย้อนหลัง 6 เดือน
          </button>
          <button
            onClick={() => setRangeMonths(12)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              rangeMonths === 12
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ย้อนหลัง 12 เดือน
          </button>
        </div>
      </div>

      {/* 4 Primary KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        
        {/* Card 1: Total Monthly Income */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">รายรับประจำเดือน</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(currentMonthData.totalIncome)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>เจ ฿40,250 • เมย์ ฿22,851</span>
          </div>
        </div>

        {/* Card 2: Total Monthly Expenses */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">% รายจ่ายต่อรายรับ</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              currentMonthData.expenseRatio <= 50
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
            <span>{formatPercent(currentMonthData.expenseRatio, 1)}</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              ({formatCurrency(currentMonthData.totalExpenses, false)} ฿)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ต่ำกว่าเกณฑ์ 50% (สุขภาพการเงินดีเยี่ยม)</span>
          </div>
        </div>

        {/* Card 3: % Credit Card payments to Income */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">% ค่าบัตรเครดิตต่อรายรับ</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
            <span>{formatPercent(currentMonthData.creditCardRatio, 1)}</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              ({formatCurrency(currentMonthData.creditCardTotal, false)} ฿)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>KTC: {formatCurrency(currentMonthData.creditCardKtc, false)} | TTB: {formatCurrency(currentMonthData.creditCardTtb, false)}</span>
          </div>
        </div>

        {/* Card 4: Electricity Bill */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">ค่าไฟเดือนล่าสุด</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(currentMonthData.electricityBill)}
          </div>
          <div className="mt-2 text-[11px] flex items-center gap-1 font-semibold">
            {electricityDiffPercent <= 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <ArrowDownRight className="w-3.5 h-3.5" />
                ประหยัดลง {Math.abs(electricityDiffPercent).toFixed(1)}% เทียบเดือนก่อน
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                เพิ่มขึ้น +{electricityDiffPercent.toFixed(1)}% เทียบเดือนก่อน
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. เทรนด์รายรับ (Income Trend) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  1. เทรนด์รายรับประจำเดือน (Income Trend)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  รายรับของเจ (40,250 ฿) และเมย์ (22,851 ฿) รวมเฉลี่ย {formatCurrency(currentMonthData.totalIncome)}
                </p>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={renderCurrencyTooltip} />
                <Bar dataKey="incomeA" name="เจ (Je)" stackId="income" fill="#10B981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="incomeB" name="เมย์ (May)" stackId="income" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 mt-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="w-3 h-3 rounded-md bg-emerald-500" />
              <span>เจ (Je): ฿40,250.00</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="w-3 h-3 rounded-md bg-indigo-500" />
              <span>เมย์ (May): ฿22,850.90</span>
            </div>
          </div>
        </div>

        {/* 2. เทรนด์ % รายจ่ายต่อรายรับ (% Expense-to-Income Trend) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  2. เทรนด์ % รายจ่ายต่อรายรับ (% Expense Ratio)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  สัดส่วนรายจ่ายต่อรายรับ (แนะนำไม่เกิน 50-70% เพื่อสุขภาพการเงินที่ดี)
                </p>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="expenseRatioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={renderCurrencyTooltip} />
                <ReferenceLine y={50} stroke="#10B981" strokeDasharray="4 4" label={{ value: 'เกณฑ์ยอดเยี่ยม (50%)', fill: '#10B981', fontSize: 10, position: 'insideTopRight' }} />
                <ReferenceLine y={70} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'เกณฑ์ระวัง (70%)', fill: '#F59E0B', fontSize: 10, position: 'insideTopRight' }} />
                <Area
                  type="monotone"
                  dataKey="expenseRatio"
                  name="% รายจ่ายต่อรายรับ"
                  stroke="#0D9488"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#expenseRatioGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between mt-3 text-xs px-2 text-slate-500 dark:text-slate-400">
            <span>เดือนล่าสุด: <strong className="text-teal-600 dark:text-teal-400 font-bold">{formatPercent(currentMonthData.expenseRatio, 1)}</strong></span>
            <span>อัตราเงินออมสุทธิ: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatPercent(currentMonthData.savingsRatio, 1)}</strong></span>
          </div>
        </div>

        {/* 3. % ค่าบัตรเครดิตต่อรายรับ (% Credit Card to Income) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  3. % ค่าบัตรเครดิตต่อรายรับ (% Credit Card Ratio)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ติดตามภาระบัตรเครดิต KTC & TTB (แนะนำไม่เกิน 15-20% ของรายรับ)
                </p>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={[0, 30]}
                  tickFormatter={v => `${v}%`}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={renderCurrencyTooltip} />
                <ReferenceLine y={15} stroke="#EC4899" strokeDasharray="3 3" label={{ value: 'เพดานเตือน (15%)', fill: '#EC4899', fontSize: 10, position: 'insideTopRight' }} />
                <Bar dataKey="creditCardRatio" name="% ค่าบัตรต่อรายรับ" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between mt-3 text-xs px-2 text-slate-500 dark:text-slate-400">
            <span>บัตร KTC (เจ): {formatCurrency(currentMonthData.creditCardKtc)}</span>
            <span>บัตร TTB (เมย์): {formatCurrency(currentMonthData.creditCardTtb)}</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">รวม {formatCurrency(currentMonthData.creditCardTotal)}</span>
          </div>
        </div>

        {/* 4. เทรนด์ค่าไฟ (Electricity Bill Trend) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  4. เทรนด์ค่าไฟ (Electricity Bill Trend)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ค่าไฟรายเดือนเฉลี่ย {formatCurrency(electricityAvg)} (เดือนล่าสุด {formatCurrency(currentMonthData.electricityBill)})
                </p>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="elecGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EAB308" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#EAB308" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={v => `${v}`}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={renderCurrencyTooltip} />
                <Area
                  type="monotone"
                  dataKey="electricityBill"
                  name="ค่าไฟ (บาท)"
                  stroke="#EAB308"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#elecGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between mt-3 text-xs px-2 text-slate-500 dark:text-slate-400">
            <span>ค่าไฟต่ำสุด: {formatCurrency(Math.min(...history.map(h => h.electricityBill)))}</span>
            <span>ค่าไฟสูงสุด: {formatCurrency(Math.max(...history.map(h => h.electricityBill)))}</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">เฉลี่ย {formatCurrency(electricityAvg)}</span>
          </div>
        </div>

      </div>

      {/* 5. กราฟพายแบ่งสัดส่วนรายจ่ายต่อเดือน (Monthly Expense Breakdown Pie Chart) */}
      <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <PieIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                5. กราฟพายแบ่งสัดส่วนรายจ่ายต่อเดือน (Expense Breakdown)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                สัดส่วนค่าใช้จ่ายตามหมวดหมู่ประจำเดือน {history.find(h => h.monthKey === effectivePieMonth)?.label || effectivePieMonth}
              </p>
            </div>
          </div>

          {/* Month Selector for Pie Chart */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              เลือกเดือน:
            </span>
            <select
              value={effectivePieMonth}
              onChange={e => setSelectedPieMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
            >
              {history.map(h => (
                <option key={h.monthKey} value={h.monthKey}>
                  {h.label} ({formatCurrency(h.totalExpenses, false)} ฿)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pie Content: Chart + Legend Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Donut Chart with Center Total */}
          <div className="lg:col-span-5 flex items-center justify-center relative min-h-[280px]">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categorySlices}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="amount"
                >
                  {categorySlices.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={renderCurrencyTooltip} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">รายจ่ายรวม</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {formatCurrency(totalPieExpenses)}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                จากรายได้ ฿63,101
              </span>
            </div>
          </div>

          {/* Breakdown Legend Cards */}
          <div className="lg:col-span-7 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {categorySlices.map((cat, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 hover:scale-[1.01] transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg flex-shrink-0">{cat.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {cat.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {formatCurrency(cat.amount)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span
                      className="px-2 py-0.5 rounded-lg text-xs font-extrabold"
                      style={{
                        backgroundColor: `${cat.color}20`,
                        color: cat.color,
                      }}
                    >
                      {formatPercent(cat.percentage, 1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
              <span>💡 ค่าใช้จ่ายหลักคือค่างวดรถและเงินเดือนแม่ (~70% ของรายจ่ายทั้งหมด)</span>
              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('monthly_ledger')}
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                >
                  <span>ดูรายละเอียดตารางรายจ่าย</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
