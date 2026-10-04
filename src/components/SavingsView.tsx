import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { ContributorId, HouseholdFundType, HouseholdSettings, SavingsGoal, Transaction } from '../types';
import {
  formatCurrency,
  formatCurrencySpreadsheet,
  formatPassbookDate,
  formatSpreadsheetMonth,
  getCurrentYearMonth,
} from '../utils/formatters';
import {
  PiggyBank,
  Target,
  PlusCircle,
  Edit2,
  Trash2,
  Search,
  ArrowUpDown,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from 'lucide-react';

interface SavingsViewProps {
  settings: HouseholdSettings;
  goals: SavingsGoal[];
  transactions: Transaction[];
  onQuickAdd?: (contributorId: ContributorId, amount: number, note: string, targetFund: HouseholdFundType) => void;
  onQuickWithdraw?: (contributorId: ContributorId, amount: number, note: string, targetFund: HouseholdFundType) => void;
  onOpenCustomAdd: (contributorId?: ContributorId, fund?: HouseholdFundType, type?: 'deposit' | 'withdrawal') => void;
  onUpdatePresets?: (presets: number[]) => void;
  onOpenGoalModal: (goal?: SavingsGoal | null) => void;
  onDeleteGoal: (goalId: string) => void;
  onOpenDepositForGoal: (goalId: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string, tx?: Transaction) => void;
}

interface PassbookRow {
  index: number;
  tx: Transaction;
  dateStr: string;
  depositAmount: number | null;
  withdrawalAmount: number | null;
  netDelta: number;
  runningBalance: number;
  description: string;
  contributorId: ContributorId;
  contributorName: string;
}

interface MonthSavingsSummary {
  monthKey: string;
  monthLabel: string;
  depositTotal: number;
  withdrawalTotal: number;
  netSavings: number;
  endingBalance: number;
  descriptions: string[];
}

export const SavingsView: React.FC<SavingsViewProps> = ({
  settings,
  goals,
  transactions,
  onOpenCustomAdd,
  onOpenGoalModal,
  onDeleteGoal,
  onOpenDepositForGoal,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const currentMonthKey = getCurrentYearMonth();

  // Navigation tabs: 1. Passbook Table, 2. Goals & Funds
  const [activeTab, setActiveTab] = useState<'monthly' | 'passbook' | 'goals'>('passbook');
  const [tableOrientation, setTableOrientation] = useState<'vertical' | 'transposed'>('transposed');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'chronological' | 'latest'>('chronological');
  const [goalFilter, setGoalFilter] = useState<string>('all');

  // Ref for auto-scrolling to current month column in transposed view
  const transposedScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const currentMonthThRef = useRef<HTMLTableCellElement | null>(null);

  const scrollToCurrentMonth = (behavior: ScrollBehavior = 'smooth') => {
    const th = currentMonthThRef.current;
    const container = transposedScrollContainerRef.current;
    if (th && container) {
      const thLeft = th.offsetLeft;
      const thWidth = th.offsetWidth;
      const containerWidth = container.clientWidth;
      const targetScroll = Math.max(0, thLeft + thWidth + 240 - containerWidth);
      container.scrollTo({ left: targetScroll, behavior });
    }
  };

  useEffect(() => {
    if (tableOrientation === 'transposed' || activeTab === 'monthly') {
      const timer = setTimeout(() => {
        scrollToCurrentMonth('auto');
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [tableOrientation, activeTab, selectedYear]);

  // 1. Build Running Balance Passbook Rows matching Image 4 (146 items)
  // Sorted chronologically to calculate the precise cumulative running balance
  const allPassbookRows = useMemo<PassbookRow[]>(() => {
    const sorted = [...transactions]
      .filter(t => t.type !== 'goal_allocation' && !t.goalId && !t.note?.includes('หยอดเงินเข้าเป้าหมาย'))
      .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;

      // Check numeric id if available (tx-passbook-1 vs tx-passbook-2)
      const idA = parseInt(String(a.id || '').replace(/\D/g, ''), 10) || 0;
      const idB = parseInt(String(b.id || '').replace(/\D/g, ''), 10) || 0;
      if (idA !== idB) return idA - idB;

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const rows: PassbookRow[] = [];
    let currentBalance = 0;
    for (let idx = 0; idx < sorted.length; idx++) {
      const t = sorted[idx];
      const isWithdrawal = t.type === 'withdrawal';
      const delta = isWithdrawal ? -t.amount : t.amount;
      currentBalance += delta;

      const desc =
        t.withdrawalReason ||
        t.note ||
        t.category ||
        (isWithdrawal ? 'ถอนเงิน' : 'ฝากเงิน');

      const contributorName =
        t.contributorId === 'person_a'
          ? settings.members.person_a.nickname
          : t.contributorId === 'person_b'
          ? settings.members.person_b.nickname
          : 'กองกลาง';

      rows.push({
        index: idx + 1,
        tx: t,
        dateStr: formatPassbookDate(t.date),
        depositAmount: !isWithdrawal ? t.amount : null,
        withdrawalAmount: isWithdrawal ? t.amount : null,
        netDelta: delta,
        runningBalance: Math.round(currentBalance * 100) / 100,
        description: desc,
        contributorId: t.contributorId,
        contributorName,
      });
    }
    return rows;
  }, [transactions, settings.members]);

  // 3. Totals across all transactions
  const totalEndingBalance = useMemo(() => {
    if (allPassbookRows.length === 0) return 0;
    return allPassbookRows[allPassbookRows.length - 1].runningBalance;
  }, [allPassbookRows]);

  const totalDepositsAll = useMemo(() => {
    return allPassbookRows.reduce((acc, r) => acc + (r.depositAmount || 0), 0);
  }, [allPassbookRows]);

  const totalWithdrawalsAll = useMemo(() => {
    return allPassbookRows.reduce((acc, r) => acc + (r.withdrawalAmount || 0), 0);
  }, [allPassbookRows]);

  // 4. Available Years for Filtering
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      if (t.date && t.date.length >= 4) {
        set.add(t.date.slice(0, 4));
      }
    });
    set.add(currentMonthKey.slice(0, 4));
    return Array.from(set).sort().reverse();
  }, [transactions, currentMonthKey]);

  // 5. Filter & Sort Passbook Rows for Vertical View
  const displayPassbookRows = useMemo(() => {
    let rows = allPassbookRows;

    // Filter by year
    if (selectedYear !== 'all') {
      rows = rows.filter(r => r.tx.date.startsWith(selectedYear));
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter(
        r =>
          r.description.toLowerCase().includes(q) ||
          r.dateStr.toLowerCase().includes(q) ||
          r.tx.date.includes(q) ||
          r.contributorName.toLowerCase().includes(q) ||
          (r.depositAmount && r.depositAmount.toString().includes(q)) ||
          (r.withdrawalAmount && r.withdrawalAmount.toString().includes(q))
      );
    }

    // Sort order
    if (sortOrder === 'latest') {
      return [...rows].reverse();
    }
    return rows;
  }, [allPassbookRows, selectedYear, searchTerm, sortOrder]);

  // Passbook view totals for filtered rows
  const filteredViewTotals = useMemo(() => {
    const count = displayPassbookRows.length;
    const deposits = displayPassbookRows.reduce((acc, r) => acc + (r.depositAmount || 0), 0);
    const withdrawals = displayPassbookRows.reduce((acc, r) => acc + (r.withdrawalAmount || 0), 0);
    return { count, deposits, withdrawals, net: deposits - withdrawals };
  }, [displayPassbookRows]);

  // 6. Build Transposed Monthly Summary Data
  const monthlySavingsData = useMemo<MonthSavingsSummary[]>(() => {
    // Map transactions to months and compute running ending balances
    const monthMap: Record<string, { deposits: number; withdrawals: number; endingBalance: number; descriptions: string[] }> = {};
    
    // Iterate through allPassbookRows chronologically to get exact end-of-month balance
    allPassbookRows.forEach(r => {
      const mKey = r.tx.date.slice(0, 7);
      if (!monthMap[mKey]) {
        monthMap[mKey] = { deposits: 0, withdrawals: 0, endingBalance: 0, descriptions: [] };
      }
      if (r.depositAmount) monthMap[mKey].deposits += r.depositAmount;
      if (r.withdrawalAmount) monthMap[mKey].withdrawals += r.withdrawalAmount;
      monthMap[mKey].endingBalance = r.runningBalance;
      if (r.description && !monthMap[mKey].descriptions.includes(r.description)) {
        monthMap[mKey].descriptions.push(r.description);
      }
    });

    // Ensure all 12 months of selectedYear are included if a specific year is chosen
    if (selectedYear !== 'all') {
      for (let m = 1; m <= 12; m++) {
        const mKey = `${selectedYear}-${String(m).padStart(2, '0')}`;
        if (!monthMap[mKey]) {
          // Find the last known ending balance before this month
          let lastBal = 0;
          for (let i = allPassbookRows.length - 1; i >= 0; i--) {
            if (allPassbookRows[i].tx.date < `${mKey}-01`) {
              lastBal = allPassbookRows[i].runningBalance;
              break;
            }
          }
          monthMap[mKey] = { deposits: 0, withdrawals: 0, endingBalance: lastBal, descriptions: [] };
        }
      }
    }

    return Object.keys(monthMap)
      .sort()
      .map(mKey => {
        const item = monthMap[mKey];
        return {
          monthKey: mKey,
          monthLabel: formatSpreadsheetMonth(mKey),
          depositTotal: item.deposits,
          withdrawalTotal: item.withdrawals,
          netSavings: item.deposits - item.withdrawals,
          endingBalance: item.endingBalance,
          descriptions: item.descriptions,
        };
      });
  }, [allPassbookRows, selectedYear]);

  // Filtered months for Transposed View
  const displayTransposedMonths = useMemo(() => {
    if (selectedYear === 'all') return monthlySavingsData;
    return monthlySavingsData.filter(m => m.monthKey.startsWith(selectedYear));
  }, [monthlySavingsData, selectedYear]);

  // Display rows for Vertical Monthly Table (like MonthlyLedgerView)
  const displayMonthlyRows = useMemo(() => {
    let list = displayTransposedMonths;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        m =>
          m.monthLabel.toLowerCase().includes(q) ||
          m.monthKey.includes(q) ||
          m.descriptions.some(d => d.toLowerCase().includes(q)) ||
          m.depositTotal.toString().includes(q) ||
          m.withdrawalTotal.toString().includes(q)
      );
    }
    if (sortOrder === 'latest') {
      return [...list].reverse();
    }
    return list;
  }, [displayTransposedMonths, searchTerm, sortOrder]);

  // Transposed View Summary Metrics
  const transposedSummary = useMemo(() => {
    let sumDep = 0;
    let sumWithdr = 0;
    let sumNet = 0;

    displayTransposedMonths.forEach(m => {
      sumDep += m.depositTotal;
      sumWithdr += m.withdrawalTotal;
      sumNet += m.netSavings;
    });

    const count = displayTransposedMonths.length || 1;
    const latestMonth = displayTransposedMonths[displayTransposedMonths.length - 1];
    return {
      sumDep,
      avgDep: sumDep / count,
      sumWithdr,
      avgWithdr: sumWithdr / count,
      sumNet,
      avgNet: sumNet / count,
      latestEndingBalance: latestMonth ? latestMonth.endingBalance : totalEndingBalance,
      count,
    };
  }, [displayTransposedMonths, totalEndingBalance]);

  // Filtered Goals
  const filteredGoals = useMemo(() => {
    if (goalFilter === 'all') return goals;
    return goals.filter(g => g.category === goalFilter);
  }, [goals, goalFilter]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    goals.forEach(g => set.add(g.category));
    return Array.from(set);
  }, [goals]);

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      


      {/* 2. Top 3 Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        
        {/* Card 1: Ending Net Savings Balance */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-100 mb-2">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <span>💰</span>
              <span>เงินออมสะสมสุทธิ</span>
            </span>
            <PiggyBank className="w-5 h-5 text-white/80" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {formatCurrency(totalEndingBalance)}
          </div>
          <div className="text-[11px] text-emerald-100/90 mt-2 pt-2 border-t border-white/20">
            <span>ตามสมุดบัญชี</span>
          </div>
        </div>

        {/* Card 2: Total Deposits */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/20 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>ยอดฝากสะสม</span>
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {formatCurrency(totalDepositsAll)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            เงินออมและรายได้พิเศษ
          </p>
        </div>

        {/* Card 3: Total Withdrawals */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/20 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              <span>ยอดถอนสะสม</span>
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
            {formatCurrency(totalWithdrawalsAll)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            เบิกใช้จ่ายและลงทุน
          </p>
        </div>

      </div>

      {/* 3. Controls & View Switcher Toolbar */}
      <div className="space-y-3">
        {/* Main Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          
          {/* View Modes Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start">

            <button
              onClick={() => {
                setActiveTab('passbook');
                setTableOrientation('vertical');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'passbook'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="สมุดบัญชีเงินออมจริง"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>📖 สมุดบัญชี</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('goals');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'goals'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="เป้าหมาย & กองทุนการออม"
            >
              <Target className="w-3.5 h-3.5" />
              <span>🎯 เป้าหมาย ({goals.length})</span>
            </button>
          </div>

          {/* Search, Sort & Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {activeTab !== 'goals' && (
              <div className="relative min-w-[180px] flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="ค้นหารายละเอียด, วันที่..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {(activeTab === 'passbook' || (activeTab === 'monthly' && tableOrientation === 'vertical')) && (
              <button
                onClick={() =>
                  setSortOrder(prev => (prev === 'chronological' ? 'latest' : 'chronological'))
                }
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                title="สลับลำดับการแสดงผล"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  {sortOrder === 'chronological'
                    ? 'เก่า ➔ ใหม่'
                    : 'ล่าสุดก่อน'}
                </span>
              </button>
            )}

            {/* Quick Actions */}
            <button
              onClick={() => onOpenCustomAdd(undefined, 'operating', 'deposit')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ ฝากเงินออม</span>
            </button>

            <button
              onClick={() => onOpenCustomAdd(undefined, 'operating', 'withdrawal')}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>- ถอนเงิน</span>
            </button>
          </div>
        </div>

        {/* Year Filter Pills for Monthly & Passbook Views */}
        {activeTab !== 'goals' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-bold mr-1 flex items-center gap-1 text-[11px] whitespace-nowrap">
              <span>📅</span>
              <span>เลือกปี:</span>
            </span>
            {availableYears.map(yr => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedYear === yr
                    ? 'bg-emerald-600 text-white shadow-2xs shadow-emerald-600/30'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
              >
                {yr}
              </button>
            ))}
            <button
              onClick={() => setSelectedYear('all')}
              className={`px-3 py-1 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                selectedYear === 'all'
                  ? 'bg-emerald-600 text-white shadow-2xs shadow-emerald-600/30'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              ทุกปี
            </button>

            {tableOrientation === 'transposed' && activeTab === 'monthly' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedYear(currentMonthKey.slice(0, 4));
                  setTimeout(() => scrollToCurrentMonth('smooth'), 50);
                }}
                className="ml-auto px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                title="เลื่อนหน้าจอไปยังเดือนปัจจุบันทันที"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>📍 ไปที่เดือนปัจจุบัน</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5. TAB 2: PASSBOOK TABLE (ตามรูปที่ 4) */}
      {activeTab === 'passbook' && (
        <div className="space-y-4">
          
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[720px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                
                {/* Table Header matching Image 4 */}
                <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm border-b-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-center font-bold">
                  <tr>
                    <th className="py-3 px-3 w-14 border-r border-slate-200 dark:border-slate-700">
                      ลำดับ
                    </th>
                    <th className="py-3 px-4 w-32 border-r border-slate-200 dark:border-slate-700">
                      วันที่
                    </th>
                    <th className="py-3 px-4 w-36 border-r border-slate-200 dark:border-slate-700 text-right">
                      ฝาก/ถอน
                    </th>
                    {/* Signature Running Balance Column with pastel green header */}
                    <th className="py-3 px-4 w-40 bg-[#a8d5a2] dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100 border-x-2 border-[#8fc288] dark:border-emerald-700 text-right font-black">
                      คงเหลือสะสม
                    </th>
                    <th className="py-3 px-6 border-r border-slate-200 dark:border-slate-700 text-left">
                      รายละเอียด
                    </th>
                    <th className="py-3 px-3 w-24 border-r border-slate-200 dark:border-slate-700">
                      ผู้ทำรายการ
                    </th>
                    <th className="py-3 px-3 w-20 text-center">
                      จัดการ
                    </th>
                  </tr>
                </thead>

                {/* Table Body matching Image 4 */}
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-medium">
                  {displayPassbookRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        ไม่พบรายการเงินออมที่ตรงกับเงื่อนไขการค้นหา
                      </td>
                    </tr>
                  ) : (
                    displayPassbookRows.map(row => {
                      const isDeposit = row.depositAmount !== null;
                      const isWithdrawal = row.withdrawalAmount !== null;

                      return (
                        <tr
                          key={row.tx.id || `row-${row.index}-${row.tx.date}`}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          {/* 1. ลำดับ */}
                          <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                            {row.index}
                          </td>

                          {/* 2. วันที่ (31 พ.ค. 2022) */}
                          <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                            {row.dateStr}
                          </td>

                          {/* 3. ฝาก/ถอน (Positive emerald, Negative rose) */}
                          <td className="py-3 px-4 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap font-bold">
                            {isDeposit ? (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {formatCurrencySpreadsheet(row.depositAmount || 0)}
                              </span>
                            ) : isWithdrawal ? (
                              <span className="text-rose-600 dark:text-rose-400">
                                {formatCurrencySpreadsheet(-(row.withdrawalAmount || 0))}
                              </span>
                            ) : (
                              <span className="text-slate-400">฿ -</span>
                            )}
                          </td>

                          {/* 4. คงเหลือสะสม (Pastel Green Column matching Image 2 & 4) */}
                          <td className="py-3 px-4 text-right font-black bg-[#a8d5a2]/60 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-100 border-x-2 border-[#8fc288]/70 dark:border-emerald-700/60 whitespace-nowrap text-[13px]">
                            {formatCurrency(row.runningBalance)}
                          </td>

                          {/* 5. รายละเอียด (เช่น ซื้อวัว, กองทุน, คืนเงิน) */}
                          <td className="py-3 px-6 text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">
                                {row.description}
                              </span>
                              {row.tx.targetFund === 'long_term' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 font-normal">
                                  🏛️ กองระยะยาว
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 6. ผู้ทำรายการ */}
                          <td className="py-3 px-3 text-center border-r border-slate-100 dark:border-slate-800">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                row.contributorId === 'person_a'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'
                                  : row.contributorId === 'person_b'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20'
                                  : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/20'
                              }`}
                            >
                              {row.contributorName}
                            </span>
                          </td>

                          {/* 7. จัดการ */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => onEditTransaction(row.tx)}
                                className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition rounded"
                                title="แก้ไขรายการ"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteTransaction(row.tx.id, row.tx)}
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition rounded"
                                title="ลบรายการ"
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
                <tfoot className="bg-slate-50 dark:bg-slate-800/90 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-xs sticky bottom-0 z-10 backdrop-blur-sm">
                  <tr>
                    <td colSpan={2} className="py-3 px-4 text-center text-slate-700 dark:text-slate-300">
                      รวมทั้งหมด ({filteredViewTotals.count} รายการ)
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 dark:text-emerald-300">
                      สุทธิ: {formatCurrency(filteredViewTotals.net)}
                    </td>
                    <td className="py-3 px-4 text-right font-black bg-[#a8d5a2] dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100 border-x-2 border-[#8fc288] dark:border-emerald-700 text-[13px]">
                      {displayPassbookRows.length > 0
                        ? formatCurrency(
                            sortOrder === 'chronological'
                              ? displayPassbookRows[displayPassbookRows.length - 1].runningBalance
                              : displayPassbookRows[0].runningBalance
                          )
                        : formatCurrency(totalEndingBalance)}
                    </td>
                    <td colSpan={3} className="py-3 px-6 text-slate-500 text-[11px]">
                      ฝาก: {formatCurrency(filteredViewTotals.deposits)} | ถอน: {formatCurrency(filteredViewTotals.withdrawals)}
                    </td>
                  </tr>
                </tfoot>

              </table>
            </div>
          </div>

        </div>
      )}

      {/* 6. TAB 1: MONTHLY SAVINGS SUMMARY - TRANSPOSED (แนวนอน 🔄) */}
      {activeTab === 'monthly' && tableOrientation === 'transposed' && (
        <div className="space-y-4">
          
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden w-full">
            <div ref={transposedScrollContainerRef} className="overflow-x-auto max-w-full">
              <table className="w-full text-left text-xs border-collapse">
                
                {/* Header: Months as Columns */}
                <thead className="bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm border-b-2 border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
                  <tr>
                    {/* Sticky Left Header */}
                    <th className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 py-3.5 px-4 min-w-[210px] w-[210px] border-r-2 border-slate-300 dark:border-slate-700 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]">
                      <div className="flex items-center justify-between">
                        <span>รายการเงินออม</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({displayTransposedMonths.length} ด.)
                        </span>
                      </div>
                    </th>

                    {/* Month Columns */}
                    {displayTransposedMonths.map(m => {
                      const isCurrent = m.monthKey === currentMonthKey;
                      return (
                        <th
                          key={m.monthKey}
                          ref={isCurrent ? currentMonthThRef : undefined}
                          className={`py-3 px-3 min-w-[110px] text-right border-r border-slate-200 dark:border-slate-700 whitespace-nowrap ${
                            isCurrent
                              ? 'bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-black'
                              : ''
                          }`}
                        >
                          <div className="flex flex-col items-end">
                            <span>{m.monthLabel}</span>
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
                    <th className="py-3 px-3 min-w-[120px] text-right font-black text-emerald-900 dark:text-emerald-300 border-r border-slate-200 dark:border-slate-700 bg-slate-200/60 dark:bg-slate-700/60 whitespace-nowrap">
                      รวมทั้งสิ้น
                    </th>
                    <th className="py-3 px-3 min-w-[110px] text-right font-black text-slate-700 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-700/60 whitespace-nowrap">
                      เฉลี่ย/เดือน
                    </th>
                  </tr>
                </thead>

                {/* Body: Savings Rows */}
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  
                  {/* ROW 1: ยอดฝากเงินออม (Deposits) */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-3 px-4 font-bold text-slate-900 dark:text-slate-100 border-r-2 border-slate-200 dark:border-slate-800 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>📥 ยอดฝากเงินออม</span>
                      </div>
                    </td>
                    {displayTransposedMonths.map(m => {
                      const isCurrent = m.monthKey === currentMonthKey;
                      return (
                        <td
                          key={m.monthKey}
                          className={`py-2.5 px-3 text-right border-r border-slate-100 dark:border-slate-800 font-bold whitespace-nowrap text-emerald-600 dark:text-emerald-400 ${
                            isCurrent ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''
                          }`}
                        >
                          {formatCurrencySpreadsheet(m.depositTotal)}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 text-right font-black text-emerald-700 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 whitespace-nowrap">
                      {formatCurrency(transposedSummary.sumDep)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-600 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-800/30 whitespace-nowrap">
                      {formatCurrency(transposedSummary.avgDep)}
                    </td>
                  </tr>

                  {/* ROW 2: ยอดถอนเงินออม (Withdrawals) */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-3 px-4 font-bold text-slate-900 dark:text-slate-100 border-r-2 border-slate-200 dark:border-slate-800 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span>📤 ยอดถอนเงินออม</span>
                      </div>
                    </td>
                    {displayTransposedMonths.map(m => {
                      const isCurrent = m.monthKey === currentMonthKey;
                      return (
                        <td
                          key={m.monthKey}
                          className={`py-2.5 px-3 text-right border-r border-slate-100 dark:border-slate-800 font-bold whitespace-nowrap text-rose-600 dark:text-rose-400 ${
                            isCurrent ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''
                          }`}
                        >
                          {formatCurrencySpreadsheet(m.withdrawalTotal > 0 ? -m.withdrawalTotal : 0)}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 text-right font-black text-rose-700 dark:text-rose-400 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 whitespace-nowrap">
                      {formatCurrency(transposedSummary.sumWithdr)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-600 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-800/30 whitespace-nowrap">
                      {formatCurrency(transposedSummary.avgWithdr)}
                    </td>
                  </tr>

                  {/* ROW 3: เงินออมสุทธิประจำเดือน (Net Monthly) */}
                  <tr className="bg-slate-100/70 dark:bg-slate-800/70 border-y-2 border-slate-300 dark:border-slate-700 font-black">
                    <td className="sticky left-0 z-10 bg-slate-100 dark:bg-slate-800 py-3.5 px-4 font-black text-slate-900 dark:text-white border-r-2 border-slate-300 dark:border-slate-700 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                      ⚖️ ออมสุทธิประจำเดือน
                    </td>
                    {displayTransposedMonths.map(m => {
                      const isCurrent = m.monthKey === currentMonthKey;
                      const isZero = Math.abs(m.netSavings) < 0.01;
                      const isNeg = m.netSavings < 0;
                      return (
                        <td
                          key={m.monthKey}
                          className={`py-3 px-3 text-right border-r border-slate-200 dark:border-slate-700 whitespace-nowrap font-black ${
                            isZero
                              ? 'text-slate-400 dark:text-slate-500'
                              : isNeg
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-900 dark:text-slate-100'
                          } ${isCurrent ? 'bg-emerald-100/40 dark:bg-emerald-950/30 font-extrabold' : ''}`}
                        >
                          {formatCurrencySpreadsheet(m.netSavings)}
                        </td>
                      );
                    })}
                    <td
                      className={`py-3 px-3 text-right font-black border-r border-slate-300 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-700/50 whitespace-nowrap ${
                        transposedSummary.sumNet < 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {formatCurrencySpreadsheet(transposedSummary.sumNet)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-black bg-slate-200/50 dark:bg-slate-700/50 whitespace-nowrap ${
                        transposedSummary.avgNet < 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {formatCurrencySpreadsheet(transposedSummary.avgNet)}
                    </td>
                  </tr>

                  {/* ROW 4: เงินออมสะสมสิ้นเดือน (Ending Cumulative Balance) */}
                  <tr className="bg-emerald-50/70 dark:bg-emerald-950/40 border-b-2 border-emerald-300 dark:border-emerald-700/60 font-black">
                    <td className="sticky left-0 z-10 bg-[#a8d5a2] dark:bg-emerald-950 py-3.5 px-4 font-black text-emerald-950 dark:text-emerald-100 border-r-2 border-emerald-300 dark:border-emerald-800 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                      🏦 ยอดเงินออมสะสมสิ้นเดือน
                    </td>
                    {displayTransposedMonths.map(m => {
                      const isCurrent = m.monthKey === currentMonthKey;
                      return (
                        <td
                          key={m.monthKey}
                          className={`py-3 px-3 text-right border-r border-emerald-200/70 dark:border-emerald-900/40 whitespace-nowrap font-black text-emerald-950 dark:text-emerald-100 text-[13px] bg-[#a8d5a2]/50 dark:bg-emerald-950/60 ${
                            isCurrent ? 'bg-[#a8d5a2] dark:bg-emerald-900/70 font-extrabold' : ''
                          }`}
                        >
                          {formatCurrency(m.endingBalance)}
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 text-right font-black text-emerald-950 dark:text-emerald-100 border-r border-emerald-300 dark:border-emerald-800 bg-[#a8d5a2] dark:bg-emerald-900/80 whitespace-nowrap text-[13px]">
                      {formatCurrency(transposedSummary.latestEndingBalance)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-900 dark:text-emerald-200 bg-[#a8d5a2]/60 dark:bg-emerald-900/60 whitespace-nowrap">
                      คงเหลือสิ้นงวด
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      
      {/* 6.2 TAB 1: MONTHLY SAVINGS SUMMARY - VERTICAL (แนวตั้ง 📋 เหมือนหน้ารายละเอียดรายเดือน) */}
      {activeTab === 'monthly' && tableOrientation === 'vertical' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[720px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                
                {/* Table Header matching MonthlyLedgerView style */}
                <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm border-b-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-center font-bold">
                  <tr>
                    <th className="py-3 px-3 w-14 border-r border-slate-200 dark:border-slate-700">
                      ลำดับ
                    </th>
                    <th className="py-3 px-4 w-32 border-r border-slate-200 dark:border-slate-700">
                      เดือน
                    </th>
                    <th className="py-3 px-4 w-36 border-r border-slate-200 dark:border-slate-700 text-right">
                      📥 ฝากเงินออม
                    </th>
                    <th className="py-3 px-4 w-36 border-r border-slate-200 dark:border-slate-700 text-right">
                      📤 ถอนเงินออม
                    </th>
                    <th className="py-3 px-4 w-36 border-r border-slate-200 dark:border-slate-700 text-right">
                      ⚖️ ออมสุทธิ (ฝาก-ถอน)
                    </th>
                    {/* Signature pastel green running balance header */}
                    <th className="py-3 px-4 w-44 bg-[#a8d5a2] dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100 border-x-2 border-[#8fc288] dark:border-emerald-700 text-right font-black">
                      🏦 คงเหลือสะสมสิ้นเดือน
                    </th>
                    <th className="py-3 px-6 border-r border-slate-200 dark:border-slate-700 text-left">
                      รายละเอียด / หมายเหตุ
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-medium">
                  {displayMonthlyRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        ไม่พบข้อมูลเงินออมรายเดือนที่ตรงกับเงื่อนไขการค้นหา
                      </td>
                    </tr>
                  ) : (
                    displayMonthlyRows.map((m, idx) => {
                      const isCurrent = m.monthKey === currentMonthKey;
                      const hasDeposits = m.depositTotal > 0;
                      const hasWithdrawals = m.withdrawalTotal > 0;
                      const isZeroNet = Math.abs(m.netSavings) < 0.01;
                      const isNegNet = m.netSavings < 0;

                      return (
                        <tr
                          key={m.monthKey}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                            isCurrent ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                          }`}
                        >
                          {/* 1. ลำดับ */}
                          <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                            {idx + 1}
                          </td>

                          {/* 2. เดือน */}
                          <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <span>{m.monthLabel}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-600 text-white font-bold shadow-2xs">
                                  ปัจจุบัน
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. ฝากเงินออม */}
                          <td className="py-3 px-4 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                            {hasDeposits ? formatCurrencySpreadsheet(m.depositTotal) : <span className="text-slate-300 dark:text-slate-600">฿ -</span>}
                          </td>

                          {/* 4. ถอนเงินออม */}
                          <td className="py-3 px-4 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap font-bold text-rose-600 dark:text-rose-400">
                            {hasWithdrawals ? formatCurrencySpreadsheet(-m.withdrawalTotal) : <span className="text-slate-300 dark:text-slate-600">฿ -</span>}
                          </td>

                          {/* 5. ออมสุทธิ (ฝาก-ถอน) */}
                          <td className={`py-3 px-4 text-right border-r border-slate-100 dark:border-slate-800 whitespace-nowrap font-black ${
                            isZeroNet ? 'text-slate-400' : isNegNet ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
                          }`}>
                            {formatCurrencySpreadsheet(m.netSavings)}
                          </td>

                          {/* 6. คงเหลือสะสมสิ้นเดือน (Pastel green signature) */}
                          <td className="py-3 px-4 text-right font-black bg-[#a8d5a2]/60 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-100 border-x-2 border-[#8fc288]/70 dark:border-emerald-700/60 whitespace-nowrap text-[13px]">
                            {formatCurrency(m.endingBalance)}
                          </td>

                          {/* 7. รายละเอียด / หมายเหตุ */}
                          <td className="py-3 px-6 text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                            <span className="text-xs">
                              {m.descriptions && m.descriptions.length > 0 ? m.descriptions.join(', ') : '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Table Footer */}
                <tfoot className="bg-slate-50 dark:bg-slate-800/90 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-xs sticky bottom-0 z-10 backdrop-blur-sm">
                  <tr>
                    <td colSpan={2} className="py-3 px-4 text-center text-slate-700 dark:text-slate-300">
                      รวมทั้งสิ้น ({displayMonthlyRows.length} เดือน)
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(transposedSummary.sumDep)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-rose-700 dark:text-rose-400">
                      {formatCurrency(-transposedSummary.sumWithdr)}
                    </td>
                    <td className={`py-3 px-4 text-right font-black ${transposedSummary.sumNet < 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                      {formatCurrencySpreadsheet(transposedSummary.sumNet)}
                    </td>
                    <td className="py-3 px-4 text-right font-black bg-[#a8d5a2] dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100 border-x-2 border-[#8fc288] dark:border-emerald-700 text-[13px]">
                      {formatCurrency(totalEndingBalance)}
                    </td>
                    <td className="py-3 px-6 text-slate-500 text-[11px]">
                      ยอดเงินออมสะสมสุทธิสิ้นสุด (157,359.89 ฿)
                    </td>
                  </tr>
                </tfoot>

              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 3: GOALS & FUNDS MANAGEMENT */}
      {activeTab === 'goals' && (
        <div className="space-y-6">
          {/* Category Filter for Goals */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-bold mr-1">หมวดหมู่เป้าหมาย:</span>
              <button
                onClick={() => setGoalFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  goalFilter === 'all'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                ทั้งหมด ({goals.length})
              </button>
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setGoalFilter(c)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    goalFilter === c
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <button
              onClick={() => onOpenGoalModal(null)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>สร้างเป้าหมายใหม่</span>
            </button>
          </div>

          {/* Goal Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGoals.map(goal => {
              const txAllocated = transactions
                .filter(t => t.goalId === goal.id)
                .reduce((sum, t) => sum + (t.type === 'withdrawal' ? -t.amount : t.amount), 0);
              const displayCurrentAmount = Math.max(goal.currentAmount || 0, txAllocated);
              const pct = goal.targetAmount > 0 ? (displayCurrentAmount / goal.targetAmount) * 100 : 0;
              const isAchieved = displayCurrentAmount >= goal.targetAmount;

              return (
                <div
                  key={goal.id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800">
                        {goal.icon}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base">
                          {goal.title}
                        </h4>
                        <span className="text-xs text-slate-500">{goal.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenGoalModal(goal)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteGoal(goal.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-600 dark:text-slate-400">ความคืบหน้า</span>
                      <span className={isAchieved ? 'text-emerald-600 font-extrabold' : 'text-slate-900 dark:text-white'}>
                        {pct.toFixed(1)}% {isAchieved && '🎉 ครบแล้ว!'}
                      </span>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, pct))}%`,
                          backgroundColor: isAchieved ? '#10B981' : goal.color || '#10B981',
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">สะสมแล้ว</span>
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {formatCurrency(displayCurrentAmount)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">เป้าหมาย</span>
                      <span className="font-bold text-slate-600 dark:text-slate-400">
                        {formatCurrency(goal.targetAmount)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenDepositForGoal(goal.id)}
                    className="w-full py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>🎯 หยอดเงินเข้าเป้าหมายนี้</span>
                  </button>
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
};
