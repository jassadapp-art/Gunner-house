import React, { useState, useMemo } from 'react';
import type { HouseholdSettings, MonthlyExpense, Transaction } from '../types';
import { formatCurrency, formatPercent, getCurrentYearMonth } from '../utils/formatters';
import {
  buildAnalyticsMetricsHistory,
  getCategoryExpenseBreakdownForMonth,
  getExpenseAmountForMonth,
  getExpenseEstimatedAmount,
  type AnalyticsMetricPoint,
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
  ComposedChart,
  Line,
} from 'recharts';
import {
  TrendingUp,
  CreditCard,
  Zap,
  PieChart as PieIcon,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CheckCircle2,
  Clock,
  PiggyBank,
  BarChart3,
  Building2,
  LineChart as LineChartIcon,
  Fuel,
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
  // Timeframe: Monthly | Quarterly | Yearly
  const [timeframe, setTimeframe] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  // Monthly sub-range
  const [monthlyRange, setMonthlyRange] = useState<6 | 12 | 'all'>(6);
  // Savings Chart Mode: Bar (แต่ละช่วง) vs Trend (สะสมต่อเนื่อง) (Request 1 & 5)
  const [savingsChartMode, setSavingsChartMode] = useState<'bar' | 'trend'>('bar');

  // Unified metrics history based on timeframe & range
  const history: AnalyticsMetricPoint[] = useMemo(() => {
    return buildAnalyticsMetricsHistory(
      settings,
      expenses,
      transactions,
      timeframe,
      timeframe === 'monthly' ? monthlyRange : 'all'
    );
  }, [settings, expenses, transactions, timeframe, monthlyRange]);

  // Default selected month for Pie chart is the latest available month
  const [selectedPieMonth, setSelectedPieMonth] = useState<string>(() => {
    return history.length > 0 ? history[history.length - 1].monthKey : '2026-09';
  });

  // Keep selectedPieMonth valid
  const effectivePieMonth = useMemo(() => {
    if (history.some(h => h.monthKey === selectedPieMonth)) {
      return selectedPieMonth;
    }
    return history.length > 0 ? history[history.length - 1].monthKey : '2026-09';
  }, [history, selectedPieMonth]);

  const currentPeriodData = useMemo(() => {
    return history[history.length - 1] || {
      key: '2026-09',
      monthKey: '2026-09',
      label: "ก.ย. '69",
      timeframe: 'monthly',
      incomeA: 40250,
      incomeB: 22850.90,
      totalIncome: 63100.90,
      fixedExpenses: 26923,
      adhocExpenses: 0,
      totalExpenses: 26923,
      netSavings: 36177.90,
      cumulativeSavings: 36177.90,
      savingsDeposit: 10000,
      savingsWithdrawal: 10000,
      savingsNet: 0,
      savingsEndingBalance: 157359.89,
      expenseRatio: 42.67,
      savingsRatio: 57.33,
      creditCardKtc: 2110.26,
      creditCardTtb: 4286.85,
      creditCardTotal: 6397.11,
      creditCardRatio: 10.14,
      electricityBill: 662.89,
      electricityRatio: 1.05,
      rentBill: 363.00,
      rentRatio: 0.58,
      utilitiesTotal: 1025.89,
      utilitiesRatio: 1.63,
      fuelBill: 2800,
      fuelRatio: 4.44,
    };
  }, [history]);

  const prevPeriodData = useMemo(() => {
    return history.length > 1 ? history[history.length - 2] : null;
  }, [history]);

  // Electricity stats
  const electricityAvg = useMemo(() => {
    const sum = history.reduce((acc, h) => acc + h.electricityBill, 0);
    return history.length > 0 ? sum / history.length : 0;
  }, [history]);

  const electricityDiffPercent = useMemo(() => {
    if (!prevPeriodData || prevPeriodData.electricityBill <= 0) return 0;
    return ((currentPeriodData.electricityBill - prevPeriodData.electricityBill) / prevPeriodData.electricityBill) * 100;
  }, [currentPeriodData, prevPeriodData]);

  // Fuel stats
  const fuelAvg = useMemo(() => {
    const sum = history.reduce((acc, h) => acc + h.fuelBill, 0);
    return history.length > 0 ? sum / history.length : 0;
  }, [history]);

  // Credit card stats (Request 1: ไม่แบ่ง KTC/TTB)
  const creditCardAvg = useMemo(() => {
    const sum = history.reduce((acc, h) => acc + h.creditCardTotal, 0);
    return history.length > 0 ? sum / history.length : 0;
  }, [history]);

  // Current month bill payment status (Request 3: เพิ่มสถานะบิลเดือนปัจจุบัน)
  const activeMonthKey = currentPeriodData.monthKey || getCurrentYearMonth();
  const currentMonthBillsStatus = useMemo(() => {
    let paidCount = 0;
    let paidTotal = 0;
    let unpaidTotal = 0;

    expenses.forEach(e => {
      const explicitAmt = e.monthlyBills?.[activeMonthKey];
      const isPaid =
        e.lastPaidMonth === activeMonthKey ||
        (e.isPaidThisMonth && (explicitAmt !== undefined ? explicitAmt > 0 : true));

      const amt = getExpenseAmountForMonth(e, activeMonthKey);
      const est = getExpenseEstimatedAmount(e);

      if (isPaid && (explicitAmt !== undefined ? explicitAmt > 0 : true)) {
        paidCount++;
        paidTotal += amt;
      } else {
        unpaidTotal += est;
      }
    });

    const totalCount = expenses.length;
    const unpaidCount = Math.max(0, totalCount - paidCount);
    const isAllPaid = totalCount > 0 && paidCount === totalCount;

    return {
      totalCount,
      paidCount,
      unpaidCount,
      paidTotal,
      unpaidTotal,
      isAllPaid,
    };
  }, [expenses, activeMonthKey]);

  // Pie chart category slices for the selected month
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
        <div className="p-3 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-xs space-y-1.5 backdrop-blur-md">
          <div className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1 mb-1">
            ช่วงเวลา: {label}
          </div>
          {payload.map((p: any, i: number) => {
            const isRatio = p.name.includes('%') || (p.dataKey && String(p.dataKey).toLowerCase().includes('ratio'));
            return (
              <div key={i} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5" style={{ color: p.color || p.stroke }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || p.stroke }} />
                  <span>{p.name}:</span>
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {typeof p.value === 'number'
                    ? isRatio
                      ? formatPercent(p.value, 1)
                      : formatCurrency(p.value)
                    : p.value}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const timeframeLabel =
    timeframe === 'monthly'
      ? 'รายเดือน'
      : timeframe === 'quarterly'
      ? 'รายไตรมาส'
      : 'รายปี';

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      
      {/* Top Header & Multi-Timeframe Switcher */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600/10 via-teal-500/10 to-transparent p-5 rounded-3xl border border-emerald-500/20 backdrop-blur-sm">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              แดชบอร์ดภาพรวม
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              สรุปภาพรวมการเงิน ({timeframeLabel})
            </p>
          </div>

        {/* Timeframe Controls Bar */}
        <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto">
          {/* 1. Timeframe Mode Switcher */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <button
              onClick={() => setTimeframe('monthly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                timeframe === 'monthly'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>รายเดือน</span>
            </button>

            <button
              onClick={() => setTimeframe('quarterly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                timeframe === 'quarterly'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>รายไตรมาส</span>
            </button>

            <button
              onClick={() => setTimeframe('yearly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                timeframe === 'yearly'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>รายปี</span>
            </button>
          </div>

          {/* 2. Monthly Sub-Range (Shown only when in monthly mode) */}
          {timeframe === 'monthly' && (
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <button
                onClick={() => setMonthlyRange(6)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  monthlyRange === 6
                    ? 'bg-slate-800 text-white dark:bg-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                6 เดือน
              </button>
              <button
                onClick={() => setMonthlyRange(12)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  monthlyRange === 12
                    ? 'bg-slate-800 text-white dark:bg-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                12 เดือน
              </button>
              <button
                onClick={() => setMonthlyRange('all')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  monthlyRange === 'all'
                    ? 'bg-slate-800 text-white dark:bg-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ทั้งหมด
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5 Primary KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Card 1: Total Period Income */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">รายรับ ({currentPeriodData.label})</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(currentPeriodData.totalIncome)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>เจ: {formatCurrency(currentPeriodData.incomeA, false)} | เมย์: {formatCurrency(currentPeriodData.incomeB, false)}</span>
          </div>
        </div>

        {/* Card 2: Total Period Expenses & Ratio */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">สัดส่วนรายจ่าย</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              currentPeriodData.expenseRatio <= 50
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
            <span>{formatPercent(currentPeriodData.expenseRatio, 1)}</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              ({formatCurrency(currentPeriodData.totalExpenses, false)} ฿)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {currentPeriodData.expenseRatio <= 50 ? 'ต่ำกว่า 50% (ยอดเยี่ยม)' : 'ควบคุมได้ตามเกณฑ์'}
            </span>
          </div>
        </div>

        {/* Card 3: Net Savings for Period (Using Savings Passbook Data) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">เงินออมสะสม</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 flex items-baseline gap-2">
            <span>{formatCurrency(currentPeriodData.savingsEndingBalance)}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>งวดนี้: <strong className={currentPeriodData.savingsNet >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{formatCurrency(currentPeriodData.savingsNet)}</strong></span>
          </div>
        </div>

        {/* Card 4: % Credit Card Ratio */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">ค่าบัตรเครดิต</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
            <span>{formatPercent(currentPeriodData.creditCardRatio, 1)}</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              ({formatCurrency(currentPeriodData.creditCardTotal, false)} ฿)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>รวมค่าบัตรงวดนี้</span>
            <span className={`font-bold ${currentPeriodData.creditCardRatio > 15 ? 'text-rose-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
              {currentPeriodData.creditCardRatio > 15 ? '⚠️ เกินเกณฑ์ 15%' : 'ปกติ'}
            </span>
          </div>
        </div>

        {/* Card 5: Current Month Bills Status */}
        <div
          onClick={() => onNavigateToTab?.('monthly_ledger')}
          title="ดูตารางรายจ่ายรายเดือน"
          className="col-span-2 md:col-span-1 p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">สถานะบิล ({currentPeriodData.label})</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
              currentMonthBillsStatus.isAllPaid
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 group-hover:scale-110'
                : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 group-hover:scale-110'
            }`}>
              {currentMonthBillsStatus.isAllPaid ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
            <span className={currentMonthBillsStatus.isAllPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}>
              {currentMonthBillsStatus.paidCount}/{currentMonthBillsStatus.totalCount}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {currentMonthBillsStatus.isAllPaid ? 'ชำระครบแล้ว' : 'รายการ'}
            </span>
          </div>
          <div className="mt-2 text-[11px] flex items-center justify-between">
            <span className={currentMonthBillsStatus.isAllPaid ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-amber-600 dark:text-amber-400 font-semibold'}>
              {currentMonthBillsStatus.isAllPaid
                ? 'ชำระครบทุกบิลแล้ว 🎉'
                : `รอชำระ ${currentMonthBillsStatus.unpaidCount} บิล (${formatCurrency(currentMonthBillsStatus.unpaidTotal, false)} ฿)`}
            </span>
            <span className="text-[10px] text-indigo-500 font-bold group-hover:translate-x-0.5 transition">
              ดูตาราง →
            </span>
          </div>
        </div>

      </div>

      {/* Row 1: Executive Overview + Savings Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Unified Chart: รายรับ รายจ่าย และ % สัดส่วนค่าใช้จ่าย */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    รายรับ - รายจ่าย & สัดส่วน
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    เปรียบเทียบรายรับ รายจ่าย และ % ต่อรายรับ
                  </p>
                </div>
              </div>
            </div>

            <div className="h-68 sm:h-72 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={history} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  
                  {/* Left Axis: Currency (฿k) */}
                  <YAxis
                    yAxisId="left"
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                  />

                  {/* Right Axis: Percentage (0-100%) */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fontSize: 11, fill: '#0D9488' }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip content={renderCurrencyTooltip} />

                  <ReferenceLine
                    yAxisId="right"
                    y={50}
                    stroke="#10B981"
                    strokeDasharray="4 4"
                    label={{ value: 'เกณฑ์ 50%', fill: '#10B981', fontSize: 10, position: 'insideTopRight' }}
                  />
                  <ReferenceLine
                    yAxisId="right"
                    y={70}
                    stroke="#F59E0B"
                    strokeDasharray="4 4"
                    label={{ value: 'เพดาน 70%', fill: '#F59E0B', fontSize: 10, position: 'insideTopRight' }}
                  />

                  {/* Bar: Total Income */}
                  <Bar
                    yAxisId="left"
                    dataKey="totalIncome"
                    name="รายรับรวม"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />

                  {/* Bar: Total Expenses */}
                  <Bar
                    yAxisId="left"
                    dataKey="totalExpenses"
                    name="รายจ่ายรวม"
                    fill="#F43F5E"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />

                  {/* Line: % Expense Ratio */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="expenseRatio"
                    name="% รายจ่ายต่อรายรับ"
                    stroke="#0D9488"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#0D9488' }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500" />
              <span>รายรับ: <strong>{formatCurrency(currentPeriodData.totalIncome, false)} ฿</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-500" />
              <span>รายจ่าย: <strong>{formatCurrency(currentPeriodData.totalExpenses, false)} ฿</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-teal-600" />
              <span>สัดส่วน: <strong className="text-teal-600 dark:text-teal-400">{formatPercent(currentPeriodData.expenseRatio, 1)}</strong></span>
            </div>
          </div>
        </div>

        {/* 2. Savings Chart */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <PiggyBank className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    วิเคราะห์เงินออม
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {savingsChartMode === 'bar'
                      ? 'เงินออมสุทธิตามสมุดบัญชี'
                      : 'แนวโน้มเงินออมสะสมตามสมุดบัญชี'}
                  </p>
                </div>
              </div>

              {/* Mode Toggle Button: Bar vs Cumulative Trend */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs self-stretch sm:self-auto">
                <button
                  type="button"
                  onClick={() => setSavingsChartMode('bar')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    savingsChartMode === 'bar'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="กราฟแท่งเงินออม"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>กราฟแท่ง</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSavingsChartMode('trend')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    savingsChartMode === 'trend'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="กราฟเส้นแนวโน้มสะสม"
                >
                  <LineChartIcon className="w-3.5 h-3.5" />
                  <span>แนวโน้มสะสม</span>
                </button>
              </div>
            </div>

            <div className="h-68 sm:h-72 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                {savingsChartMode === 'bar' ? (
                  /* 2.1 กราฟแท่งเงินออมสุทธิประจำช่วงจากหน้าเงินออม */
                  <BarChart data={history} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={renderCurrencyTooltip} />
                    <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="3 3" />
                    <Bar dataKey="savingsNet" name="เงินออมสุทธิ" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {history.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.savingsNet >= 0 ? '#10B981' : '#F43F5E'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  /* 2.2 กราฟเส้นแนวโน้มเงินออมสะสมจริงจากหน้าเงินออม (Passbook Ending Balance) */
                  <AreaChart data={history} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="savingsCumGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={renderCurrencyTooltip} />
                    <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="3 3" />
                    <Area
                      type="monotone"
                      dataKey="savingsEndingBalance"
                      name="เงินออมสะสม"
                      stroke="#8B5CF6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#savingsCumGrad)"
                      dot={{ r: 4, fill: '#8B5CF6' }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <span>
              เงินออมสุทธิงวดนี้: <strong className={currentPeriodData.savingsNet >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 font-bold'}>
                {formatCurrency(currentPeriodData.savingsNet)}
              </strong>
            </span>
            <span>
              เงินออมสะสมรวม: <strong className="text-purple-600 dark:text-purple-400 font-black">
                {formatCurrency(currentPeriodData.savingsEndingBalance)}
              </strong>
            </span>
          </div>
        </div>

      </div>

      {/* Row 2: Credit Card + Electricity & Rent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 3. กราฟบัตรเครดิต */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    ค่าบัตรเครดิต
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ยอดจ่ายรวม และ % ต่อรายรับ
                  </p>
                </div>
              </div>
            </div>

            <div className="h-68 sm:h-72 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={history} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  
                  {/* Left Axis: Credit Card Amount (฿k) */}
                  <YAxis
                    yAxisId="left"
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                  />

                  {/* Right Axis: % Credit Card to Income */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 40]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fontSize: 11, fill: '#6366F1' }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip content={renderCurrencyTooltip} />

                  <ReferenceLine
                    yAxisId="right"
                    y={15}
                    stroke="#EC4899"
                    strokeDasharray="4 4"
                    label={{ value: 'เพดานเตือน (15%)', fill: '#EC4899', fontSize: 10, position: 'insideTopRight' }}
                  />

                  {/* Single Bar: Total Credit Card (Request 1: ไม่แบ่ง KTC/TTB) */}
                  <Bar
                    yAxisId="left"
                    dataKey="creditCardTotal"
                    name="ค่าบัตรเครดิต (฿)"
                    fill="#6366F1"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />

                  {/* Line: % Ratio */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="creditCardRatio"
                    name="% ค่าบัตรต่อรายรับ"
                    stroke="#EC4899"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#EC4899' }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <span>ค่าบัตรงวดล่าสุด: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{formatCurrency(currentPeriodData.creditCardTotal)}</strong></span>
            <span>สัดส่วนต่อรายรับ: <strong className="text-pink-600 dark:text-pink-400 font-bold">{formatPercent(currentPeriodData.creditCardRatio, 1)}</strong></span>
            <span>เฉลี่ย: <strong>{formatCurrency(creditCardAvg)}</strong></span>
          </div>
        </div>

        {/* 4. กราฟค่าไฟ & ค่าห้อง */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      ค่าไฟ & ค่าห้อง
                    </h3>
                    {prevPeriodData && electricityDiffPercent !== 0 && (
                      <span
                        className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          electricityDiffPercent <= 0
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {electricityDiffPercent <= 0 ? (
                          <>
                            <ArrowDownRight className="w-3 h-3 mr-0.5" />
                            ค่าไฟลด {Math.abs(electricityDiffPercent).toFixed(1)}%
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-3 h-3 mr-0.5" />
                            ค่าไฟ +{electricityDiffPercent.toFixed(1)}%
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    แท่งค่าใช้จ่าย และ % ต่อรายรับ
                  </p>
                </div>
              </div>
            </div>

            <div className="h-68 sm:h-72 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={history} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  
                  {/* Left Axis: Expenses (฿) */}
                  <YAxis
                    yAxisId="left"
                    tickFormatter={v => `${v}`}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                  />

                  {/* Right Axis: % to Income */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 10]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fontSize: 11, fill: '#D97706' }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip content={renderCurrencyTooltip} />

                  {/* Bars: Electricity & Rent */}
                  <Bar
                    yAxisId="left"
                    dataKey="electricityBill"
                    name="ค่าไฟ (฿)"
                    fill="#EAB308"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={22}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="rentBill"
                    name="ค่าห้อง/ที่พัก (฿)"
                    fill="#F97316"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={22}
                  />

                  {/* Lines: % Electricity & % Rent */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="electricityRatio"
                    name="% ค่าไฟต่อรายรับ"
                    stroke="#CA8A04"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#CA8A04' }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="rentRatio"
                    name="% ค่าห้องต่อรายรับ"
                    stroke="#EA580C"
                    strokeWidth={2.5}
                    strokeDasharray="3 3"
                    dot={{ r: 3, fill: '#EA580C' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <span>ค่าไฟ: <strong className="text-yellow-600 dark:text-yellow-400">{formatCurrency(currentPeriodData.electricityBill)}</strong> ({formatPercent(currentPeriodData.electricityRatio, 1)})</span>
            <span>ค่าห้อง: <strong className="text-orange-600 dark:text-orange-400">{formatCurrency(currentPeriodData.rentBill)}</strong> ({formatPercent(currentPeriodData.rentRatio, 1)})</span>
            <span>รวมที่พัก: <strong className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(currentPeriodData.utilitiesTotal)}</strong> ({formatPercent(currentPeriodData.utilitiesRatio, 1)})</span>
            <span>เฉลี่ยค่าไฟ: <strong>{formatCurrency(electricityAvg)}</strong></span>
          </div>
        </div>

      </div>

      {/* Row 3: Fuel Expense + Category Breakdown Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 5. กราฟค่าน้ำมัน */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    ค่าน้ำมัน
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ยอดจ่ายค่าน้ำมัน และ % ต่อรายรับ
                  </p>
                </div>
              </div>
            </div>

            <div className="h-68 sm:h-72 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={history} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  
                  {/* Left Axis: Fuel Amount (฿k) */}
                  <YAxis
                    yAxisId="left"
                    tickFormatter={v => `${(v / 1000).toFixed(1)}k`}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                  />

                  {/* Right Axis: % Fuel to Income */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 15]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fontSize: 11, fill: '#0284C7' }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip content={renderCurrencyTooltip} />

                  <ReferenceLine
                    yAxisId="right"
                    y={5}
                    stroke="#0284C7"
                    strokeDasharray="4 4"
                    label={{ value: 'เกณฑ์ 5%', fill: '#0284C7', fontSize: 10, position: 'insideTopRight' }}
                  />

                  {/* Bar: Fuel Amount */}
                  <Bar
                    yAxisId="left"
                    dataKey="fuelBill"
                    name="ค่าน้ำมัน (฿)"
                    fill="#0284C7"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />

                  {/* Line: % Fuel to Income */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="fuelRatio"
                    name="% ค่าน้ำมันต่อรายรับ"
                    stroke="#0369A1"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#0369A1' }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <span>ค่าน้ำมันงวดล่าสุด: <strong className="text-sky-600 dark:text-sky-400 font-bold">{formatCurrency(currentPeriodData.fuelBill)}</strong></span>
            <span>สัดส่วนต่อรายรับ: <strong className="text-sky-700 dark:text-sky-300 font-bold">{formatPercent(currentPeriodData.fuelRatio, 1)}</strong></span>
            <span>เฉลี่ย: <strong>{formatCurrency(fuelAvg)}</strong></span>
          </div>
        </div>

        {/* 6. กราฟพายแบ่งสัดส่วนรายจ่าย */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <PieIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    สัดส่วนรายจ่าย
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    แบ่งตามหมวดหมู่ ({history.find(h => h.monthKey === effectivePieMonth)?.label || effectivePieMonth})
                  </p>
                </div>
              </div>

              {/* Month Selector for Pie Chart */}
              <div className="flex items-center gap-1.5 self-stretch sm:self-auto">
                <span className="text-[11px] text-slate-400 font-medium">เดือน:</span>
                <select
                  value={effectivePieMonth}
                  onChange={e => setSelectedPieMonth(e.target.value)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                >
                  {history.map(h => (
                    <option key={h.key} value={h.monthKey}>
                      {h.label} ({formatCurrency(h.totalExpenses, false)} ฿)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Donut Chart with Breakdown List */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center mt-2">
              <div className="sm:col-span-6 flex items-center justify-center relative min-h-[220px]">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={categorySlices}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
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
                  <span className="text-[11px] text-slate-400 font-medium">รายจ่ายรวม</span>
                  <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {formatCurrency(totalPieExpenses)}
                  </span>
                </div>
              </div>

              {/* Slices legend */}
              <div className="sm:col-span-6 space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {categorySlices.slice(0, 5).map((cat, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span>{cat.icon}</span>
                      <span className="font-bold truncate text-slate-800 dark:text-slate-200">{cat.name}</span>
                    </div>
                    <span className="font-extrabold" style={{ color: cat.color }}>
                      {formatPercent(cat.percentage, 1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>💡 หมวดที่ใช้จ่ายสูงสุด: <strong>{categorySlices[0]?.name || 'ค่างวดรถ'}</strong></span>
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('monthly_ledger')}
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
              >
                <span>ดูตารางรายจ่าย</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
