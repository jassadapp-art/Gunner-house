import React, { useState, useEffect } from 'react';
import type {
  ContributorId,
  HouseholdFundType,
  HouseholdSettings,
  SavingsGoal,
  Transaction,
  TransactionType,
} from '../types';
import { getTodayDateString, formatCurrency } from '../utils/formatters';
import {
  X,
  Check,
  Calendar,
  Layers,
  FileText,
  Wallet,
  Receipt,
  ArrowDownRight,
  ArrowUpRight,
  Target,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (txData: {
    id?: string;
    contributorId: ContributorId;
    date: string;
    amount: number;
    goalId?: string;
    category: string;
    note?: string;
    type?: TransactionType;
    targetFund?: HouseholdFundType;
    withdrawalReason?: string;
  }) => void;
  editingTransaction?: Transaction | null;
  initialContributor?: ContributorId;
  initialGoalId?: string;
  initialFund?: HouseholdFundType;
  initialType?: TransactionType;
  longTermBalance?: number;
  operatingBalance?: number;
  goals: SavingsGoal[];
  settings: HouseholdSettings;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTransaction,
  initialContributor,
  initialGoalId,
  initialFund,
  initialType,
  longTermBalance = 357189.69,
  operatingBalance = 31037.50,
  goals,
  settings,
}) => {
  const memberA = settings.members.person_a;
  const memberB = settings.members.person_b;

  const [type, setType] = useState<TransactionType>('deposit');
  const [targetFund, setTargetFund] = useState<HouseholdFundType>('long_term');
  const [contributorId, setContributorId] = useState<ContributorId>('joint');
  const [date, setDate] = useState(getTodayDateString());
  const [amount, setAmount] = useState<string>('');
  const [goalId, setGoalId] = useState<string>('');
  const [category, setCategory] = useState<string>('ทั่วไป');
  const [withdrawalReason, setWithdrawalReason] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type || 'deposit');
      setTargetFund(editingTransaction.targetFund || 'long_term');
      setContributorId(editingTransaction.contributorId);
      setDate(editingTransaction.date);
      setAmount(editingTransaction.amount.toString());
      setGoalId(editingTransaction.goalId || '');
      setCategory(editingTransaction.category || 'ทั่วไป');
      setWithdrawalReason(editingTransaction.withdrawalReason || '');
      setNote(editingTransaction.note || '');
    } else {
      const defaultType = initialType || (initialGoalId ? 'goal_allocation' : 'deposit');
      setType(defaultType);
      setTargetFund(initialFund || 'long_term');
      setContributorId(initialContributor || 'joint');
      setDate(getTodayDateString());
      setAmount('');
      const chosenGoalId = initialGoalId || (goals.length > 0 ? goals[0].id : '');
      setGoalId(chosenGoalId);
      if (chosenGoalId) {
        const found = goals.find(g => g.id === chosenGoalId);
        if (found) setCategory(found.category);
      } else {
        setCategory(goals.length > 0 ? goals[0].category : 'ทั่วไป');
      }
      setWithdrawalReason('');
      setNote('');
    }
    setError('');
  }, [editingTransaction, isOpen, initialContributor, initialGoalId, initialFund, initialType, goals]);

  if (!isOpen) return null;

  const handleGoalChange = (newGoalId: string) => {
    setGoalId(newGoalId);
    const found = goals.find(g => g.id === newGoalId);
    if (found) {
      setCategory(found.category);
    }
  };

  const handleQuickAddAmount = (addVal: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + addVal).toString());
  };

  const selectedGoalObj = goals.find(g => g.id === goalId);
  const currentAvailableInSelectedFund = targetFund === 'long_term' ? longTermBalance : operatingBalance;
  const numAmount = parseFloat(amount) || 0;
  const isOverFundBalance = type === 'goal_allocation' && numAmount > currentAvailableInSelectedFund;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('กรุณาระบุจำนวนเงินที่ถูกต้องและมากกว่า 0 บาท');
      return;
    }

    if (type === 'goal_allocation' && !goalId) {
      setError('กรุณาเลือกเป้าหมายที่ต้องการหยอดเงินเข้า');
      return;
    }

    const fundName = targetFund === 'operating' ? 'กองหมุนเวียน' : 'กองระยะยาว';
    let finalNote = note.trim();
    if (type === 'goal_allocation' && !finalNote && selectedGoalObj) {
      finalNote = `ดึงเงินจาก${fundName} เข้าเป้าหมาย: ${selectedGoalObj.title}`;
    }

    onSave({
      id: editingTransaction?.id,
      contributorId,
      date,
      amount: numAmount,
      type,
      targetFund,
      withdrawalReason: type === 'withdrawal' ? (withdrawalReason.trim() || 'ถอนเงิน') : undefined,
      goalId: (type === 'goal_allocation' || type === 'deposit') ? (goalId || undefined) : undefined,
      category: type === 'withdrawal' ? 'ถอนเงิน' : (type === 'goal_allocation' && selectedGoalObj ? selectedGoalObj.category : (category || 'ทั่วไป')),
      note: finalNote || undefined,
    });
    onClose();
  };

  const WITHDRAWAL_PRESET_REASONS = [
    'ซ่อมรถ/ค่ายานพาหนะ',
    'ค่ารักษาพยาบาล',
    'ซ่อมบ้าน/เครื่องใช้ไฟฟ้า',
    'สำรองจ่ายด่วน',
    'เบิกใช้จ่ายทั่วไป',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl p-6 sm:p-7 transition-colors">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-5">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {editingTransaction
              ? '✏️ แก้ไขรายการ'
              : type === 'goal_allocation'
              ? '🎯 หยอดเงินเข้าเป้าหมาย'
              : type === 'deposit'
              ? '🪙 ฝากเงินเข้ากองทุน'
              : '💸 ถอนเงินจากกองทุน'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {type === 'goal_allocation'
              ? 'ดึงเงินออกจากกองทุนที่เลือก (กองระยะยาว หรือ กองหมุนเวียน) เพื่อนำไปสะสมในเป้าหมาย'
              : type === 'deposit'
              ? 'ฝากเงินเติมเข้ากองทุนของครอบครัว'
              : 'เบิกถอนเงินออกจากกองทุนของครอบครัวเพื่อใช้จ่าย'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. Transaction Type Toggle (3 modes) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              ประเภทรายการ *
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setType('goal_allocation')}
                className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  type === 'goal_allocation'
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span className="truncate">🎯 หยอดเป้าหมาย</span>
              </button>

              <button
                type="button"
                onClick={() => setType('deposit')}
                className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  type === 'deposit'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span className="truncate">🪙 ฝากเข้ากองทุน</span>
              </button>

              <button
                type="button"
                onClick={() => setType('withdrawal')}
                className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  type === 'withdrawal'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span className="truncate">💸 ถอนเงิน</span>
              </button>
            </div>
          </div>

          {/* 2. Target Goal Selector (Shown prominently when in goal_allocation mode) */}
          {type === 'goal_allocation' && (
            <div className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-500/30 space-y-2">
              <label className="block text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>เลือกเป้าหมายปลายทางที่ต้องการหยอดเงินเข้า *</span>
              </label>
              <select
                value={goalId}
                onChange={e => handleGoalChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-teal-300 dark:border-teal-600 text-xs font-semibold text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                {goals.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.icon} {g.title} (เป้าหมาย: {formatCurrency(g.targetAmount)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Source/Target Fund Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              {type === 'goal_allocation'
                ? 'เลือกกองทุนต้นทางที่ต้องการดึงเงินออก (Source Fund) *'
                : type === 'deposit'
                ? 'เลือกกองทุนที่ต้องการฝากเข้า *'
                : 'เลือกกองทุนที่ต้องการถอนออก *'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Fund 1: Long-term */}
              <button
                type="button"
                onClick={() => setTargetFund('long_term')}
                className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                  targetFund === 'long_term'
                    ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <span>🏛️ กองระยะยาว</span>
                    {targetFund === 'long_term' && (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ml-auto" />
                    )}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">กองกลางสะสมทั้งหมด</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    คงเหลือ: <strong className="text-emerald-700 dark:text-emerald-300">{formatCurrency(longTermBalance)}</strong>
                  </div>
                </div>
              </button>

              {/* Fund 2: Operating */}
              <button
                type="button"
                onClick={() => setTargetFund('operating')}
                className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                  targetFund === 'operating'
                    ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-500 ring-2 ring-indigo-500/30 shadow-md'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <span>💳 กองหมุนเวียน</span>
                    {targetFund === 'operating' && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ml-auto" />
                    )}
                  </div>
                  <div className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium">กองทุนใช้จ่ายรายเดือน</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    คงเหลือ: <strong className="text-indigo-700 dark:text-indigo-300">{formatCurrency(operatingBalance)}</strong>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Transfer Visual Preview (when in goal_allocation mode) */}
          {type === 'goal_allocation' && selectedGoalObj && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-100 via-teal-50/50 to-slate-100 dark:from-slate-950 dark:via-teal-950/30 dark:to-slate-950 border border-teal-200/80 dark:border-teal-500/30 flex items-center justify-between gap-2 text-xs">
              <div className="text-left min-w-0">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">ดึงออกจาก</span>
                <span className="font-bold text-slate-900 dark:text-white truncate">
                  {targetFund === 'long_term' ? '🏛️ กองระยะยาว' : '💳 กองหมุนเวียน'}
                </span>
                {numAmount > 0 && (
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-bold">
                    -{formatCurrency(numAmount)}
                  </span>
                )}
              </div>

              <div className="flex flex-col items-center flex-shrink-0 px-2">
                <ArrowRight className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-pulse" />
                <span className="text-[9px] text-teal-600 dark:text-teal-400 font-extrabold uppercase mt-0.5">โอนเข้า</span>
              </div>

              <div className="text-right min-w-0">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">สะสมเข้า</span>
                <span className="font-bold text-teal-700 dark:text-teal-300 truncate block">
                  {selectedGoalObj.icon} {selectedGoalObj.title}
                </span>
                {numAmount > 0 && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">
                    +{formatCurrency(numAmount)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 4. Contributor Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              ผู้ทำรายการ (Contributor) *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Joint */}
              <button
                type="button"
                onClick={() => setContributorId('joint')}
                className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                  contributorId === 'joint'
                    ? 'bg-teal-50 dark:bg-teal-500/15 border-teal-500 text-slate-900 dark:text-white ring-2 ring-teal-500/30 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <span className="text-xl">👥</span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">รวมกัน (ทั้งคู่)</div>
                  <div className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">กองกลางหลัก</div>
                </div>
                {contributorId === 'joint' && (
                  <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 ml-auto flex-shrink-0" />
                )}
              </button>

              {/* Person A */}
              <button
                type="button"
                onClick={() => setContributorId('person_a')}
                className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                  contributorId === 'person_a'
                    ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500 text-slate-900 dark:text-white ring-2 ring-emerald-500/30 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <span className="text-xl">{memberA.avatar}</span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">{memberA.nickname}</div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Person A</div>
                </div>
                {contributorId === 'person_a' && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 ml-auto flex-shrink-0" />
                )}
              </button>

              {/* Person B */}
              <button
                type="button"
                onClick={() => setContributorId('person_b')}
                className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                  contributorId === 'person_b'
                    ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-500 text-slate-900 dark:text-white ring-2 ring-indigo-500/30 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <span className="text-xl">{memberB.avatar}</span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">{memberB.nickname}</div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Person B</div>
                </div>
                {contributorId === 'person_b' && (
                  <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 ml-auto flex-shrink-0" />
                )}
              </button>
            </div>
          </div>

          {/* 5. Amount Input & Quick Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                จำนวนเงิน (THB) *
              </label>
              {isOverFundBalance && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>เกินยอดเงินคงเหลือในกองทุน</span>
                </span>
              )}
            </div>

            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold ${
                type === 'goal_allocation'
                  ? 'text-teal-600'
                  : type === 'deposit'
                  ? 'text-emerald-500'
                  : 'text-rose-500'
              }`}>
                ฿
              </span>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className={`w-full bg-slate-50 dark:bg-slate-950 border text-slate-900 dark:text-white font-bold text-xl rounded-2xl pl-10 pr-4 py-3 focus:outline-none transition ${
                  type === 'goal_allocation'
                    ? 'border-slate-300 dark:border-slate-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                    : type === 'deposit'
                    ? 'border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    : 'border-rose-300 dark:border-rose-700/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                }`}
              />
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[500, 1000, 3000, 5000, 10000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAddAmount(val)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 transition active:scale-95"
                >
                  +{formatCurrency(val, false)}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Conditional: Deposit Goal (Optional) vs Withdrawal Reason */}
          {type === 'deposit' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-cyan-400" />
                จัดสรรไปยังเป้าหมาย (ตัวเลือก)
              </label>
              <select
                value={goalId}
                onChange={e => handleGoalChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- กองกลางทั่วไป (ไม่เจาะจง) --</option>
                {goals.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.icon} {g.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === 'withdrawal' && (
            <div className="space-y-2 p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30">
              <label className="block text-xs font-bold text-rose-800 dark:text-rose-300">
                เหตุผลการถอนเงิน *
              </label>
              <input
                type="text"
                placeholder="เช่น ซ่อมรถ, ค่ารักษาพยาบาล, สำรองจ่ายฉุกเฉิน..."
                value={withdrawalReason}
                onChange={e => setWithdrawalReason(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-rose-300 dark:border-rose-500/40 text-xs text-slate-900 dark:text-white rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <div className="flex flex-wrap gap-1 text-[11px]">
                {WITHDRAWAL_PRESET_REASONS.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setWithdrawalReason(r)}
                    className={`px-2 py-0.5 rounded-lg border transition ${
                      withdrawalReason === r
                        ? 'bg-rose-600 text-white border-rose-600 font-semibold'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-rose-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 7. Date & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                วันที่บันทึก
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                หมายเหตุเพิ่มเติม (ตัวเลือก)
              </label>
              <input
                type="text"
                placeholder="เช่น เงินเดือนออก, ปันผล, สลิปโอน..."
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
          </div>

          {/* 8. Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className={`px-6 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md transition active:scale-95 ${
                type === 'goal_allocation'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-teal-600/30'
                  : type === 'deposit'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
                  : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/30'
              }`}
            >
              {editingTransaction
                ? 'บันทึกการแก้ไข'
                : type === 'goal_allocation'
                ? `🎯 ยืนยันดึงเงินเข้าเป้าหมาย (${targetFund === 'long_term' ? 'จากกองระยะยาว' : 'จากกองหมุนเวียน'})`
                : type === 'deposit'
                ? `🪙 ยืนยันการฝากเงิน (${targetFund === 'long_term' ? 'กองระยะยาว' : 'กองหมุนเวียน'})`
                : `💸 ยืนยันการถอนเงิน (${targetFund === 'long_term' ? 'กองระยะยาว' : 'กองหมุนเวียน'})`}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
