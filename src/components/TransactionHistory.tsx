import React, { useState, useMemo } from 'react';
import type { ContributorId, HouseholdFundType, HouseholdSettings, SavingsGoal, Transaction } from '../types';
import { formatCurrency, formatThaiDate } from '../utils/formatters';
import {
  History,
  Search,
  Filter,
  Trash2,
  Edit,
  ArrowUpDown,
  Calendar,
  Layers,
  FileText,
  Wallet,
  Receipt,
  Coins,
  Target,
} from 'lucide-react';

interface TransactionHistoryProps {
  transactions: Transaction[];
  goals: SavingsGoal[];
  settings: HouseholdSettings;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  goals,
  settings,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [selectedFund, setSelectedFund] = useState<'all' | HouseholdFundType>('all');
  const [selectedContributor, setSelectedContributor] = useState<'all' | ContributorId>('all');
  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [visibleCount, setVisibleCount] = useState(10);

  const memberA = settings.members.person_a;
  const memberB = settings.members.person_b;

  // Filter & Search & Sort
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(tx => {
        if (selectedFund !== 'all') {
          const txFund = tx.targetFund ?? 'long_term';
          if (txFund !== selectedFund) return false;
        }
        if (selectedContributor !== 'all' && tx.contributorId !== selectedContributor) {
          return false;
        }
        if (selectedGoal !== 'all') {
          if (tx.goalId !== selectedGoal && tx.category !== selectedGoal) {
            return false;
          }
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchNote = tx.note?.toLowerCase().includes(q);
          const matchReason = tx.withdrawalReason?.toLowerCase().includes(q);
          const matchCategory = tx.category.toLowerCase().includes(q);
          const goalObj = goals.find(g => g.id === tx.goalId);
          const matchGoal = goalObj?.title.toLowerCase().includes(q);
          if (!matchNote && !matchReason && !matchCategory && !matchGoal) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
  }, [transactions, selectedFund, selectedContributor, selectedGoal, searchQuery, sortOrder, goals]);

  const getGoalInfo = (goalId?: string) => {
    if (!goalId) return null;
    return goals.find(g => g.id === goalId);
  };

  return (
    <div className="bg-white/95 dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-sm dark:shadow-xl space-y-5 transition-colors">
      
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-purple-500/10 border border-emerald-300/60 dark:border-purple-500/20 flex items-center justify-center text-emerald-700 dark:text-purple-400 shadow-sm">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>ความมั่นคง ทั้งหมด</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                (Transaction History)
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              บันทึกทุกยอดฝากและถอนเงิน จำแนกตามกองทุน ผู้ทำรายการ และเป้าหมายความมั่นคง ({filteredTransactions.length} รายการ)
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาตามบันทึก, เป้าหมาย, เหตุผล..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />
        </div>
      </div>

      {/* Filter Tabs & Options Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-800/70">
        
        {/* Left: Fund Filters + Contributor Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Fund Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setSelectedFund('all')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition ${
                selectedFund === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              ทุกกองทุน
            </button>
            <button
              onClick={() => setSelectedFund('long_term')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition ${
                selectedFund === 'long_term'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700'
              }`}
            >
              <Wallet className="w-3 h-3" />
              <span>🏛️ ระยะยาว</span>
            </button>
            <button
              onClick={() => setSelectedFund('operating')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition ${
                selectedFund === 'operating'
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-indigo-700'
              }`}
            >
              <Receipt className="w-3 h-3" />
              <span>💳 หมุนเวียน</span>
            </button>
          </div>

          {/* Contributor Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setSelectedContributor('all')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition ${
                selectedContributor === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              ทุกคน
            </button>
            <button
              onClick={() => setSelectedContributor('joint')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition ${
                selectedContributor === 'joint'
                  ? 'bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-500/30 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-teal-700'
              }`}
            >
              <span>👥</span>
              <span>รวมกัน</span>
            </button>
            <button
              onClick={() => setSelectedContributor('person_a')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition ${
                selectedContributor === 'person_a'
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700'
              }`}
            >
              <span>{memberA.avatar}</span>
              <span>{memberA.nickname}</span>
            </button>
            <button
              onClick={() => setSelectedContributor('person_b')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition ${
                selectedContributor === 'person_b'
                  ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-indigo-700'
              }`}
            >
              <span>{memberB.avatar}</span>
              <span>{memberB.nickname}</span>
            </button>
          </div>
        </div>

        {/* Goal Filter & Sort Order */}
        <div className="flex items-center gap-2">
          {/* Goal dropdown */}
          <div className="relative">
            <select
              value={selectedGoal}
              onChange={e => setSelectedGoal(e.target.value)}
              aria-label="กรองตามเป้าหมาย"
              className="bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 transition appearance-none pr-8 cursor-pointer"
            >
              <option value="all">🎯 ทุกเป้าหมาย</option>
              {goals.map(g => (
                <option key={g.id} value={g.id}>
                  {g.icon} {g.title}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort toggle */}
          <button
            onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
            className="p-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl text-xs flex items-center gap-1 transition shadow-2xs"
            title={`เรียงวันที่: ${sortOrder === 'desc' ? 'ใหม่สุด -> เก่าสุด' : 'เก่าสุด -> ใหม่สุด'}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{sortOrder === 'desc' ? 'ล่าสุด' : 'เก่าสุด'}</span>
          </button>
        </div>

      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800/90 shadow-sm dark:shadow-inner">
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-400 opacity-50" />
            ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <th scope="col" className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>วันที่</span>
                  </div>
                </th>
                <th scope="col" className="py-3 px-4">กองทุน</th>
                <th scope="col" className="py-3 px-4">ผู้ทำรายการ</th>
                <th scope="col" className="py-3 px-4">รายการ / หมายเหตุ</th>
                <th scope="col" className="py-3 px-4">เป้าหมาย / หมวดหมู่</th>
                <th scope="col" className="py-3 px-4 text-right">จำนวนเงิน</th>
                <th scope="col" className="py-3 px-4 text-center w-24">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-xs">
              {filteredTransactions.slice(0, visibleCount).map((tx, index) => {
                const isJoint = tx.contributorId === 'joint';
                const isPersonA = tx.contributorId === 'person_a';
                const member = isPersonA ? memberA : memberB;
                const goal = getGoalInfo(tx.goalId);
                const isWithdrawal = tx.type === 'withdrawal';
                const isGoalAllocation = tx.type === 'goal_allocation';
                const isLongTerm = (tx.targetFund ?? 'long_term') === 'long_term';

                return (
                  <tr
                    key={`${tx.id || 'tx'}-${index}`}
                    className={`hover:bg-emerald-50/50 dark:hover:bg-slate-800/40 transition duration-150 group ${
                      isWithdrawal
                        ? 'bg-rose-50/40 dark:bg-rose-950/20'
                        : isGoalAllocation
                        ? 'bg-teal-50/40 dark:bg-teal-950/20'
                        : index % 2 === 0
                        ? 'bg-white dark:bg-slate-900/40'
                        : 'bg-slate-50/60 dark:bg-slate-950/20'
                    }`}
                  >
                    {/* Date */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                      {formatThaiDate(tx.date)}
                    </td>

                    {/* Target Fund Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isLongTerm ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-[11px] font-bold shadow-2xs">
                          <span>🏛️</span>
                          <span>{isGoalAllocation ? 'ดึงจากระยะยาว' : 'ระยะยาว'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-[11px] font-bold shadow-2xs">
                          <span>💳</span>
                          <span>{isGoalAllocation ? 'ดึงจากหมุนเวียน' : 'หมุนเวียน'}</span>
                        </span>
                      )}
                    </td>

                    {/* Contributor Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isJoint ? (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-2xs ${
                            isWithdrawal
                              ? 'bg-rose-100/80 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
                              : isGoalAllocation
                              ? 'bg-teal-100/80 dark:bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-500/30'
                              : 'bg-teal-100/80 dark:bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-500/30'
                          }`}
                        >
                          <span className="text-sm">👥</span>
                          <span>รวมกัน</span>
                          {isWithdrawal && <span className="text-[10px] ml-0.5 font-bold text-rose-600">(ถอน)</span>}
                          {isGoalAllocation && <span className="text-[10px] ml-0.5 font-bold text-teal-600">(หยอดเป้าหมาย)</span>}
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-2xs ${
                            isWithdrawal
                              ? 'bg-rose-100/80 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
                              : isGoalAllocation
                              ? 'bg-teal-100/80 dark:bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-500/30'
                              : isPersonA
                              ? 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
                              : 'bg-indigo-100/70 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-400 border-indigo-300 dark:border-indigo-500/30'
                          }`}
                        >
                          <span className="text-sm">{member.avatar}</span>
                          <span>{member.nickname}</span>
                          {isWithdrawal && <span className="text-[10px] ml-0.5 font-bold text-rose-600">(ถอน)</span>}
                          {isGoalAllocation && <span className="text-[10px] ml-0.5 font-bold text-teal-600">(หยอดเป้าหมาย)</span>}
                        </span>
                      )}
                    </td>

                    {/* Note / Withdrawal Reason */}
                    <td className="py-3 px-4 font-medium max-w-[240px] truncate">
                      {isWithdrawal ? (
                        <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-semibold">
                          <Coins className="w-3.5 h-3.5 flex-shrink-0 text-rose-500" />
                          <span className="truncate">{tx.withdrawalReason || tx.note || 'ถอนเงิน'}</span>
                        </div>
                      ) : isGoalAllocation ? (
                        <div className="flex items-center gap-1.5 text-teal-800 dark:text-teal-300 font-semibold">
                          <Target className="w-3.5 h-3.5 flex-shrink-0 text-teal-600 dark:text-teal-400" />
                          <span className="truncate">{tx.note || `ดึงเงินเข้าเป้าหมาย: ${goal?.title || 'เป้าหมาย'}`}</span>
                        </div>
                      ) : (
                        <span className="text-slate-800 dark:text-slate-200">
                          {tx.note || <span className="text-slate-400 italic">เงินออมเข้ากองทุน</span>}
                        </span>
                      )}
                    </td>

                    {/* Goal / Category */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isWithdrawal ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100/80 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 font-semibold">
                          <span>💸</span>
                          <span>ถอนเงิน</span>
                        </span>
                      ) : isGoalAllocation && goal ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-100/80 dark:bg-teal-500/20 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-500/30 font-bold shadow-2xs">
                          <span>{goal.icon}</span>
                          <span className="truncate max-w-[160px]">{goal.title}</span>
                        </span>
                      ) : (tx.category === 'ความมั่นคง' || goal?.category === 'ความมั่นคง') ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 font-semibold shadow-2xs">
                          <span>🛡️</span>
                          <span>ความมั่นคง</span>
                        </span>
                      ) : goal ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-cyan-500/10 text-teal-800 dark:text-cyan-300 border border-teal-200 dark:border-cyan-500/20 font-medium">
                          <span>{goal.icon}</span>
                          <span className="truncate max-w-[160px]">{goal.title}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
                          <Layers className="w-3.5 h-3.5 text-slate-500" />
                          <span>{tx.category}</span>
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <span
                        className={`font-extrabold text-sm tracking-tight ${
                          isWithdrawal
                            ? 'text-rose-600 dark:text-rose-400'
                            : isGoalAllocation
                            ? 'text-teal-700 dark:text-teal-400'
                            : isJoint
                            ? 'text-teal-700 dark:text-teal-400'
                            : isPersonA
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-indigo-700 dark:text-indigo-400'
                        }`}
                        title={isGoalAllocation ? `ดึงเงินออกจาก${isLongTerm ? 'กองระยะยาว' : 'กองหมุนเวียน'} เข้าเป้าหมาย` : undefined}
                      >
                        {isWithdrawal ? '-' : isGoalAllocation ? '-' : '+'}{formatCurrency(tx.amount)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditTransaction(tx)}
                          title="แก้ไขรายการ"
                          className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteTransaction(tx.id)}
                          title="ลบรายการ"
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Table Footer Summary */}
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-300">
                <td colSpan={5} className="py-3 px-4 text-slate-600 dark:text-slate-400">
                  รวมยอดรายการที่แสดง ({Math.min(visibleCount, filteredTransactions.length)} จาก {filteredTransactions.length} รายการ)
                </td>
                <td className="py-3 px-4 text-right font-extrabold text-slate-900 dark:text-white text-sm">
                  {formatCurrency(
                    filteredTransactions
                      .slice(0, visibleCount)
                      .reduce((acc, t) => acc + (t.type === 'withdrawal' ? -t.amount : t.amount), 0)
                  )}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Show more button */}
      {filteredTransactions.length > visibleCount && (
        <div className="pt-3 text-center border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setVisibleCount(prev => prev + 15)}
            className="px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-indigo-400 hover:text-emerald-800 dark:hover:text-indigo-300 hover:bg-emerald-50 dark:hover:bg-indigo-500/10 rounded-xl transition"
          >
            แสดงรายการเพิ่มเติม ({filteredTransactions.length - visibleCount} รายการที่เหลือ)...
          </button>
        </div>
      )}

    </div>
  );
};
