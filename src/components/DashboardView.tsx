import React, { useState, useMemo } from 'react';
import type { HouseholdSettings, MonthlyExpense, Transaction } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';
import {
  buildAnalyticsMetricsHistory,
  getCategoryExpenseBreakdownForMonth,
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
  PiggyBank,
  BarChart3,
  Building2,
  LineChart as LineChartIcon,
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
  // Timeframe: Monthly | Quarterly | Yearly (Request 4)
  const [timeframe, setTimeframe] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  // Monthly sub-range
  const [monthlyRange, setMonthlyRange] = useState<6 | 12 | 'all'>(6);
  // Savings Chart Mode: Bar (แต่ละช่วง) vs Trend (สะสมต่อเนื่อง) (Request 5)
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
      expenseRatio: 42.67,
      savingsRatio: 57.33,
      creditCardKtc: 4500,
      creditCardTtb: 1897.11,
      creditCardTotal: 6397.11,
      creditCardRatio: 10.14,
      electricityBill: 662.89,
      rentBill: 0,
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
            const isRatio = p.name.includes('%') || (p.dataKey && p.dataKey.toLowerCase().includes('ratio'));
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
      
      {/* Top Header & Multi-Timeframe Switcher (Request 4) */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600/10 via-teal-500/10 to-transparent p-5 rounded-3xl border border-emerald-500/20 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-2xs">
              หน้า 1
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Dashboard สรุปภาพรวม & กราฟแนวโน้ม
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
            มุมมอง {timeframeLabel} • สรุปรายรับ รายจ่าย สัดส่วนค่าใช้จ่าย และการเติบโตของเงินออม
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

      {/* 4 Primary KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        
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
            <span className="text-xs font-bold">% รายจ่ายต่อรายรับ</span>
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
              {currentPeriodData.expenseRatio <= 50 ? 'ต่ำกว่าเกณฑ์ 50% (ยอดเยี่ยม)' : 'ควบคุมได้ตามเกณฑ์'}
            </span>
          </div>
        </div>

        {/* Card 3: Net Savings for Period */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">เงินออมสุทธิ ({currentPeriodData.label})</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black flex items-baseline gap-2 ${
            currentPeriodData.netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
          }`}>
            <span>{formatCurrency(currentPeriodData.netSavings)}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>อัตราเงินออม: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatPercent(currentPeriodData.savingsRatio, 1)}</strong></span>
          </div>
        </div>

        {/* Card 4: % Credit Card Ratio or Electricity */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">% ค่าบัตรเครดิตต่อรายรับ</span>
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
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>KTC: {formatCurrency(currentPeriodData.creditCardKtc, false)} | TTB: {formatCurrency(currentPeriodData.creditCardTtb, false)}</span>
          </div>
        </div>

      </div>

      {/* Main Charts Grid: 2 Primary Analytical Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Unified Chart (Request 4): รวมกราฟ รูปที่ 3 รายรับ รายจ่าย และ % สัดส่วนค่าใช้จ่าย เป็นกราฟเดียว */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    1. เทรนด์รายรับ รายจ่าย & % สัดส่วน (Executive Overview)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    กราฟแท่งเปรียบเทียบ รายรับ (เขียว) vs รายจ่าย (แดง) และเส้น % สัดส่วนรายจ่าย (แกนขวา)
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

        {/* 2. Savings Chart (Request 5): กราฟแท่งเงินออม และมีปุ่มกดสลับเป็น กราฟเส้นแนวโน้มเงินออมสะสม */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <PiggyBank className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    2. วิเคราะห์เงินออม (Savings Analysis)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {savingsChartMode === 'bar'
                      ? 'เงินออมสุทธิต่อช่วงเวลา (รายรับหักรายจ่าย)'
                      : 'แนวโน้มยอดเงินออมสะสมเติบโตต่อเนื่อง'}
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
                  title="ดูกราฟแท่งเงินออมแต่ละช่วง"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>กราฟแท่งช่วงเวลา</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSavingsChartMode('trend')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    savingsChartMode === 'trend'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="ดูกราฟเส้นแนวโน้มเงินออมสะสม"
                >
                  <LineChartIcon className="w-3.5 h-3.5" />
                  <span>แนวโน้มสะสม</span>
                </button>
              </div>
            </div>

            <div className="h-68 sm:h-72 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                {savingsChartMode === 'bar' ? (
                  /* 2.1 กราฟแท่งเงินออมแต่ละช่วง (Bar Chart of Net Savings) */
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
                    <Bar dataKey="netSavings" name="เงินออมสุทธิ" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {history.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.netSavings >= 0 ? '#10B981' : '#F43F5E'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  /* 2.2 กราฟเส้นแนวโน้มเงินออมสะสม (Cumulative Savings Curve) */
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
                      dataKey="cumulativeSavings"
                      name="เงินออมสะสมรวม"
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
              เงินออมงวดล่าสุด: <strong className={currentPeriodData.netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}>
                {formatCurrency(currentPeriodData.netSavings)}
              </strong>
            </span>
            <span>
              เงินออมสะสมรวม: <strong className="text-purple-600 dark:text-purple-400 font-black">
                {formatCurrency(currentPeriodData.cumulativeSavings)}
              </strong>
            </span>
          </div>
        </div>

      </div>

      {/* Row 2: Secondary Charts (Credit Card Ratio & Electricity Bill) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

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
                <Bar dataKey="creditCardRatio" name="% ค่าบัตรต่อรายรับ" fill="#6366F1" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between mt-3 text-xs px-2 text-slate-500 dark:text-slate-400">
            <span>บัตร KTC (เจ): {formatCurrency(currentPeriodData.creditCardKtc)}</span>
            <span>บัตร TTB (เมย์): {formatCurrency(currentPeriodData.creditCardTtb)}</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">รวม {formatCurrency(currentPeriodData.creditCardTotal)}</span>
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
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    4. เทรนด์ค่าไฟ (Electricity Bill Trend)
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
                          ประหยัด {Math.abs(electricityDiffPercent).toFixed(1)}%
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="w-3 h-3 mr-0.5" />
                          +{electricityDiffPercent.toFixed(1)}%
                        </>
                      )}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ค่าไฟเฉลี่ย {formatCurrency(electricityAvg)} (งวดล่าสุด {formatCurrency(currentPeriodData.electricityBill)})
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
                <option key={h.key} value={h.monthKey}>
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
                จากรายได้ ฿{formatCurrency(currentPeriodData.totalIncome, false)}
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
