import React, { useMemo, useState } from 'react';
import type { HouseholdSettings, Transaction } from '../types';
import { formatCurrency, formatPercent, getMonthLabel } from '../utils/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { BarChart3, Layers, Sparkles, TrendingUp } from 'lucide-react';

interface AnalyticsSectionProps {
  transactions: Transaction[];
  settings: HouseholdSettings;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  transactions,
  settings,
}) => {
  const memberA = settings.members.person_a;
  const memberB = settings.members.person_b;

  // View mode and range state
  const [viewMode, setViewMode] = useState<'monthly' | 'cumulative'>('monthly');
  const [rangeMonths, setRangeMonths] = useState<6 | 12>(12);

  // Total net savings across all transactions
  const totalSavings = useMemo(() => {
    return transactions.reduce(
      (acc, t) => acc + (t.type === 'withdrawal' ? -t.amount : t.amount),
      0
    );
  }, [transactions]);

  // Monthly Stacked Bar Chart Data
  const monthlyData = useMemo(() => {
    const monthMap = new Map<
      string,
      { monthKey: string; person_a: number; person_b: number; joint: number }
    >();

    const now = new Date();
    for (let i = rangeMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, { monthKey: key, person_a: 0, person_b: 0, joint: 0 });
    }

    transactions.forEach(t => {
      const key = t.date.slice(0, 7);
      if (monthMap.has(key)) {
        const item = monthMap.get(key)!;
        const delta = t.type === 'withdrawal' ? -t.amount : t.amount;
        if (t.contributorId === 'person_a') {
          item.person_a += delta;
        } else if (t.contributorId === 'person_b') {
          item.person_b += delta;
        } else {
          item.joint += delta;
        }
      }
    });

    return Array.from(monthMap.values()).map(item => ({
      ...item,
      label: getMonthLabel(item.monthKey),
      total: item.person_a + item.person_b + item.joint,
    }));
  }, [transactions, rangeMonths]);

  // Cumulative Growth Data (Running total of savings)
  const cumulativeData = useMemo(() => {
    let runningA = 0;
    let runningB = 0;
    let runningTotal = 0;

    // Calculate baseline from all transactions before the start of the current range window
    const now = new Date();
    const earliestWindowDate = new Date(now.getFullYear(), now.getMonth() - (rangeMonths - 1), 1);
    const earliestWindowKey = `${earliestWindowDate.getFullYear()}-${String(earliestWindowDate.getMonth() + 1).padStart(2, '0')}`;

    transactions.forEach(t => {
      const key = t.date.slice(0, 7);
      if (key < earliestWindowKey) {
        const delta = t.type === 'withdrawal' ? -t.amount : t.amount;
        if (t.contributorId === 'person_a') {
          runningA += delta;
        } else if (t.contributorId === 'person_b') {
          runningB += delta;
        } else {
          runningA += delta * 0.5;
          runningB += delta * 0.5;
        }
        runningTotal += delta;
      }
    });

    return monthlyData.map(item => {
      runningA += item.person_a + (item.joint * 0.5);
      runningB += item.person_b + (item.joint * 0.5);
      runningTotal += item.total;
      return {
        ...item,
        cumA: Math.max(0, runningA),
        cumB: Math.max(0, runningB),
        cumTotal: Math.max(0, runningTotal),
      };
    });
  }, [monthlyData, transactions, rangeMonths]);

  // 3. Category & Goals Allocation Data
  const categoryData = useMemo(() => {
    const catMap = new Map<string, number>();

    transactions.forEach(t => {
      // For categories, only count positive deposits
      if (t.type === 'withdrawal') return;
      const cat = t.category || 'อื่นๆ';
      catMap.set(cat, (catMap.get(cat) || 0) + t.amount);
    });

    const colors = ['#10B981', '#0D9488', '#0284C7', '#6366F1', '#F59E0B', '#EC4899', '#8B5CF6'];
    let idx = 0;
    const list: { name: string; value: number; color: string }[] = [];

    catMap.forEach((val, key) => {
      list.push({
        name: key,
        value: val,
        color: colors[idx % colors.length],
      });
      idx++;
    });

    return list.sort((a, b) => b.value - a.value);
  }, [transactions]);

  // Custom Tooltip for Stacked Bar Chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const valJoint = payload.find((p: any) => p.dataKey === 'joint')?.value || 0;
      const valA = payload.find((p: any) => p.dataKey === 'person_a')?.value || 0;
      const valB = payload.find((p: any) => p.dataKey === 'person_b')?.value || 0;
      const total = valJoint + valA + valB;

      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-xl text-xs">
          <div className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2 flex items-center justify-between gap-4">
            <span>เดือน {label}</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{formatCurrency(total)}</span>
          </div>
          <div className="space-y-1.5">
            {valJoint > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-teal-700 dark:text-teal-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                  👥 รวมกัน (กองกลาง):
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(valJoint)}</span>
              </div>
            )}
            {valA > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: memberA.color }} />
                  {memberA.avatar} {memberA.nickname}:
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(valA)}</span>
              </div>
            )}
            {valB > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: memberB.color }} />
                  {memberB.avatar} {memberB.nickname}:
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(valB)}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Cumulative Growth Chart
  const CustomCumulativeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const cumTotal = payload.find((p: any) => p.dataKey === 'cumTotal')?.value || 0;
      const cumA = payload.find((p: any) => p.dataKey === 'cumA')?.value || 0;
      const cumB = payload.find((p: any) => p.dataKey === 'cumB')?.value || 0;

      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-xl text-xs min-w-[200px]">
          <div className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2 flex items-center justify-between gap-4">
            <span>สะสมถึง {label}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">{formatCurrency(cumTotal)}</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: memberA.color }} />
                {memberA.avatar} {memberA.nickname} สะสม:
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(cumA)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: memberB.color }} />
                {memberB.avatar} {memberB.nickname} สะสม:
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(cumB)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* 1. Monthly Savings Trend & Cumulative Growth Section */}
      <div className="lg:col-span-12 bg-white/95 dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-sm dark:shadow-xl flex flex-col justify-between transition-colors">
        
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-indigo-500/10 border border-emerald-300/60 dark:border-indigo-500/20 flex items-center justify-center text-emerald-700 dark:text-indigo-400">
                {viewMode === 'monthly' ? (
                  <BarChart3 className="w-5 h-5" />
                ) : (
                  <TrendingUp className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{viewMode === 'monthly' ? 'แนวโน้มเงินออมย้อนหลังรายเดือน (Monthly Savings Trend)' : 'แนวโน้มเงินออมสะสมเติบโต (Cumulative Savings Growth)'}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {viewMode === 'monthly'
                    ? `กราฟแท่งซ้อน 2 สี (Stacked Bar) จำแนกยอดออมของแต่ละคนย้อนหลัง ${rangeMonths} เดือน`
                    : `กราฟพื้นที่สะสม (Cumulative Area) แสดงความมั่งคั่งกองกลางที่เติบโตขึ้นอย่างต่อเนื่องย้อนหลัง ${rangeMonths} เดือน`}
                </p>
              </div>
            </div>

            {/* Controls: View Mode toggle + Range selector */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Mode Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('monthly')}
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                    viewMode === 'monthly'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>ยอดออมรายเดือน</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cumulative')}
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                    viewMode === 'cumulative'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>สะสมเงินออม</span>
                </button>
              </div>

              {/* Range Selector: 6 vs 12 Months */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setRangeMonths(6)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    rangeMonths === 6
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  6 เดือน
                </button>
                <button
                  type="button"
                  onClick={() => setRangeMonths(12)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    rangeMonths === 12
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  12 เดือน
                </button>
              </div>

              {/* Legend indicators */}
              <div className="hidden sm:flex items-center gap-3 text-xs bg-slate-50 dark:bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">รวมกัน</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: memberA.color }} />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{memberA.nickname}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: memberB.color }} />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{memberB.nickname}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chart Container */}
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'monthly' ? (
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="joint" name="รวมกัน (กองกลาง)" stackId="savings" fill="#0D9488" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="person_a" name={memberA.nickname} stackId="savings" fill={memberA.color} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="person_b" name={memberB.nickname} stackId="savings" fill={memberB.color} radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cumColorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="cumColorB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomCumulativeTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="cumTotal"
                    name="กองกลางสะสมรวม"
                    stroke="#10B981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#cumColorTotal)"
                  />
                  <Area
                    type="monotone"
                    dataKey="cumA"
                    name={memberA.nickname}
                    stroke="#059669"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="cumB"
                    name={memberB.nickname}
                    stroke="#6366F1"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="none"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Footer info tip */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span>
              เฉลี่ยออมร่วมกันเดือนละ ~{formatCurrency(monthlyData.length > 0 ? monthlyData.reduce((acc, m) => acc + m.total, 0) / monthlyData.length : 0)} (ช่วง {rangeMonths} เดือนล่าสุด)
            </span>
          </span>
          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
            {viewMode === 'monthly'
              ? '💡 สลับเป็น "สะสมเงินออม" เพื่อดูกราฟการเติบโตแบบก้าวกระโดด'
              : '🚀 พลังดอกเบี้ยทบต้นและการออมร่วมกันสร้างความมั่นคงในระยะยาว'}
          </span>
        </div>

      </div>

      {/* 3. Category Allocation Breakdown */}
      <div className="lg:col-span-12 bg-white/95 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-sm dark:shadow-lg transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-cyan-500/10 border border-teal-300/60 dark:border-cyan-500/20 flex items-center justify-center text-teal-700 dark:text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">การจัดสรรเงินกองกลางตามเป้าหมาย (Goal Allocation)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">สัดส่วนการกระจายเงินออมไปสู่เป้าหมายสำคัญของครอบครัว</p>
            </div>
          </div>
        </div>

        {/* Category horizontal pill progress cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {categoryData.map((cat, idx) => {
            const pct = totalSavings > 0 ? (cat.value / totalSavings) * 100 : 0;
            return (
              <div
                key={`cat-${idx}`}
                className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/90 rounded-xl p-3 hover:border-emerald-300 dark:hover:border-slate-700 transition shadow-2xs"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(cat.value)}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
                <div className="mt-1.5 text-right text-[10px] text-slate-500 dark:text-slate-400">
                  {formatPercent(pct)} ของเงินออมรวม
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
