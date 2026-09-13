import React, { useState, useEffect } from 'react';
import type { ContributorId, HouseholdFundType, HouseholdSettings } from '../types';
import { formatCurrency } from '../utils/formatters';
import { Zap, Plus, Settings2, Check, Coins, Wallet, Receipt } from 'lucide-react';

interface QuickAddBarProps {
  settings: HouseholdSettings;
  onQuickAdd: (contributorId: ContributorId, amount: number, note: string, targetFund: HouseholdFundType) => void;
  onQuickWithdraw?: (contributorId: ContributorId, amount: number, note: string, targetFund: HouseholdFundType) => void;
  onOpenCustomAdd: (contributorId?: ContributorId, fund?: HouseholdFundType) => void;
  onUpdatePresets?: (presets: number[]) => void;
}

const DEFAULT_PRESETS = [500, 1000, 3000, 5000];
const WITHDRAWAL_REASONS = [
  'ซ่อมรถ/ค่ายานพาหนะ',
  'ค่ารักษาพยาบาล',
  'ซ่อมบ้าน/เครื่องใช้ไฟฟ้า',
  'สำรองจ่ายทั่วไป',
  'เบิกใช้จ่ายส่วนตัว',
];

export const QuickAddBar: React.FC<QuickAddBarProps> = ({
  settings,
  onQuickAdd,
  onQuickWithdraw,
  onOpenCustomAdd,
  onUpdatePresets,
}) => {
  const memberA = settings.members.person_a;
  const memberB = settings.members.person_b;

  // Active Mode: 'deposit' vs 'withdraw'
  const [activeMode, setActiveMode] = useState<'deposit' | 'withdraw'>('deposit');
  // Selected Fund: 'long_term' vs 'operating'
  const [selectedFund, setSelectedFund] = useState<HouseholdFundType>('long_term');
  const [withdrawalReason, setWithdrawalReason] = useState<string>('ซ่อมรถ/ค่ายานพาหนะ');

  // Customizable Quick Add Amount
  const [amountInput, setAmountInput] = useState<string>('1000');
  
  // Quick Presets
  const [presets, setPresets] = useState<number[]>(() => {
    return settings.quickAddPresets && settings.quickAddPresets.length > 0
      ? settings.quickAddPresets
      : DEFAULT_PRESETS;
  });

  // Preset editor toggle
  const [isEditingPresets, setIsEditingPresets] = useState(false);
  const [editingPresetsText, setEditingPresetsText] = useState(presets.join(', '));

  useEffect(() => {
    if (settings.quickAddPresets && settings.quickAddPresets.length > 0) {
      setPresets(settings.quickAddPresets);
      setEditingPresetsText(settings.quickAddPresets.join(', '));
    }
  }, [settings.quickAddPresets]);

  const handleSavePresets = () => {
    const parsed = editingPresetsText
      .split(',')
      .map(s => parseInt(s.trim().replace(/[^0-9]/g, ''), 10))
      .filter(n => !isNaN(n) && n > 0);

    const validPresets = parsed.length > 0 ? parsed : DEFAULT_PRESETS;
    setPresets(validPresets);
    setIsEditingPresets(false);
    if (onUpdatePresets) {
      onUpdatePresets(validPresets);
    }
  };

  const currentNumericAmount = Math.max(1, Number(amountInput) || 0);

  const handleAction = (contributorId: ContributorId) => {
    if (currentNumericAmount <= 0) return;
    const fundName = selectedFund === 'long_term' ? 'กองระยะยาว' : 'กองหมุนเวียน';
    if (activeMode === 'deposit') {
      onQuickAdd(contributorId, currentNumericAmount, `หยอดเงินเข้า${fundName} (${formatCurrency(currentNumericAmount)})`, selectedFund);
    } else {
      if (onQuickWithdraw) {
        onQuickWithdraw(contributorId, currentNumericAmount, withdrawalReason || 'ถอนเงิน', selectedFund);
      }
    }
  };

  return (
    <div className="bg-white/95 dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-sm dark:shadow-lg transition-colors space-y-3">
      
      {/* Top Header & Mode Switcher + Fund Switcher + Preset Editor */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-2xs transition ${
            activeMode === 'deposit'
              ? 'bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300/60 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-100 dark:bg-rose-500/10 border border-rose-300/60 dark:border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}>
            {activeMode === 'deposit' ? <Zap className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              {activeMode === 'deposit' ? 'Quick Add • หยอดเงินด่วน' : 'Withdrawal • ถอนเงิน'}
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${
                selectedFund === 'long_term'
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                  : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300'
              }`}>
                {selectedFund === 'long_term' ? '🏛️ กองระยะยาว' : '💳 กองหมุนเวียน'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {activeMode === 'deposit'
                ? `พิมพ์ยอดเงิน หรือคลิกปุ่มลัด แล้วกดหยอดเข้า${selectedFund === 'long_term' ? 'กองกลางสะสมระยะยาว' : 'กองทุนใช้จ่ายหมุนเวียน'}`
                : `ระบุยอดเงินและเหตุผล เพื่อเบิกถอนเงินจาก${selectedFund === 'long_term' ? 'กองกลางสะสมระยะยาว' : 'กองทุนใช้จ่ายหมุนเวียน'}`}
            </p>
          </div>
        </div>

        {/* Controls: Fund Selector + Mode Switcher + Preset Button */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Fund Selector: Long-term vs Operating */}
          <div className="inline-flex bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedFund('long_term')}
              className={`px-2.5 py-1 rounded-lg transition font-bold flex items-center gap-1.5 ${
                selectedFund === 'long_term'
                  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="กองที่ 1: กองกลางสะสมทั้งหมด (ทุนระยะยาว)"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>🏛️ กองระยะยาว</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFund('operating')}
              className={`px-2.5 py-1 rounded-lg transition font-bold flex items-center gap-1.5 ${
                selectedFund === 'operating'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs ring-1 ring-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="กองที่ 2: กองทุนใช้จ่ายรายเดือน (ทุนหมุนเวียน)"
            >
              <Receipt className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>💳 กองหมุนเวียน</span>
            </button>
          </div>

          {/* Mode Switcher: Deposit vs Withdraw */}
          <div className="inline-flex bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveMode('deposit')}
              className={`px-2.5 py-1 rounded-lg transition font-semibold flex items-center gap-1 ${
                activeMode === 'deposit'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>หยอดเงิน</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('withdraw')}
              className={`px-2.5 py-1 rounded-lg transition font-semibold flex items-center gap-1 ${
                activeMode === 'withdraw'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>ถอนเงิน</span>
            </button>
          </div>

          {/* Preset Customizer Toggle */}
          <button
            type="button"
            onClick={() => setIsEditingPresets(prev => !prev)}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="ปรับแต่งตัวเลขปุ่มลัด"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isEditingPresets ? 'ปิด' : 'ปรับปุ่มลัด'}</span>
          </button>
        </div>
      </div>

      {/* Preset Editor Form (Shown when editing) */}
      {isEditingPresets && (
        <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex-1 text-xs">
            <label className="block text-[11px] font-semibold text-emerald-900 dark:text-emerald-200 mb-1">
              กำหนดตัวเลขปุ่มลัด (คั่นด้วยเครื่องหมายจุลภาค , )
            </label>
            <input
              type="text"
              value={editingPresetsText}
              onChange={e => setEditingPresetsText(e.target.value)}
              placeholder="500, 1000, 3000, 5000"
              className="w-full bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-500/40 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto pt-1 sm:pt-4">
            <button
              type="button"
              onClick={handleSavePresets}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition active:scale-95 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>บันทึกปุ่มลัด</span>
            </button>
          </div>
        </div>
      )}

      {/* Withdrawal Reason Field (Shown when in withdraw mode) */}
      {activeMode === 'withdraw' && (
        <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 space-y-2 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <label className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-rose-600" />
              <span>ระบุเหตุผลการถอนเงิน *</span>
            </label>
            <span className="text-[11px] text-rose-600/80 dark:text-rose-400/80">
              ยอดเงินจะถูกหักออกจาก{selectedFund === 'long_term' ? 'กองระยะยาว' : 'กองหมุนเวียน'} และบันทึกในประวัติ
            </span>
          </div>
          <input
            type="text"
            value={withdrawalReason}
            onChange={e => setWithdrawalReason(e.target.value)}
            placeholder="เช่น ซ่อมรถ, ค่ารักษาพยาบาล, สำรองจ่ายด่วน..."
            className="w-full bg-white dark:bg-slate-950 border border-rose-300 dark:border-rose-500/40 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">เหตุผลด่วน:</span>
            {WITHDRAWAL_REASONS.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setWithdrawalReason(r)}
                className={`px-2 py-0.5 rounded-lg border transition ${
                  withdrawalReason === r
                    ? 'bg-rose-600 text-white border-rose-600 font-semibold shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-rose-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Controls Bar: [ Amount Input + Presets ] -> [ Action Buttons ] */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
        
        {/* Left: Interactive Amount Input & Preset Chips */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Direct Amount Input */}
          <div className={`flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/80 px-3 py-1.5 rounded-xl border shadow-2xs ${
            activeMode === 'deposit'
              ? 'border-slate-300 dark:border-slate-700'
              : 'border-rose-300 dark:border-rose-700/80 ring-1 ring-rose-500/20'
          }`}>
            <span className={`text-xs font-bold ${activeMode === 'deposit' ? 'text-slate-400 dark:text-slate-500' : 'text-rose-500'}`}>
              ฿
            </span>
            <input
              type="number"
              step="any"
              min="1"
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              placeholder="จำนวนเงิน"
              className="w-24 sm:w-28 bg-transparent text-sm sm:text-base font-extrabold text-slate-900 dark:text-white focus:outline-none"
            />
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">บาท</span>
          </div>

          {/* Quick Preset Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {presets.map(amt => (
              <button
                key={`preset-${amt}`}
                type="button"
                onClick={() => setAmountInput(amt.toString())}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition active:scale-95 ${
                  currentNumericAmount === amt
                    ? activeMode === 'deposit'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500'
                }`}
              >
                {activeMode === 'deposit' ? '+' : '-'}{amt >= 1000 ? `${(amt / 1000).toLocaleString()}k` : amt}
              </button>
            ))}

            {/* Target month shortcuts */}
            <button
              type="button"
              onClick={() => setAmountInput(memberA.monthlyTarget.toString())}
              className="hidden sm:inline-flex px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 transition"
              title={`ยอดประจำงวดของ ${memberA.nickname} (${formatCurrency(memberA.monthlyTarget)})`}
            >
              งวด A ({formatCurrency(memberA.monthlyTarget, false)})
            </button>
            <button
              type="button"
              onClick={() => setAmountInput(memberB.monthlyTarget.toString())}
              className="hidden sm:inline-flex px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 transition"
              title={`ยอดประจำงวดของ ${memberB.nickname} (${formatCurrency(memberB.monthlyTarget)})`}
            >
              งวด B ({formatCurrency(memberB.monthlyTarget, false)})
            </button>
          </div>
        </div>

        {/* Right: Action Buttons for Joint, Person A & Person B */}
        <div className="flex flex-wrap items-center gap-2 pt-1 lg:pt-0">
          
          {/* Joint Action Button (รวมกัน) */}
          <button
            type="button"
            onClick={() => handleAction('joint')}
            disabled={currentNumericAmount <= 0}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition active:scale-95 ${
              activeMode === 'deposit'
                ? 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/20'
                : 'bg-rose-800 hover:bg-rose-700 shadow-rose-800/20'
            }`}
            title={
              activeMode === 'deposit'
                ? `หยอดเงิน ${formatCurrency(currentNumericAmount)} เข้า${selectedFund === 'long_term' ? 'กองระยะยาว' : 'กองหมุนเวียน'} (รวมกันทั้งคู่)`
                : `ถอนเงิน ${formatCurrency(currentNumericAmount)} จาก${selectedFund === 'long_term' ? 'กองระยะยาว' : 'กองหมุนเวียน'} รวมกัน`
            }
          >
            <span>👥</span>
            <span>{activeMode === 'deposit' ? 'หยอดรวมกัน' : 'ถอนรวมกัน'}</span>
            <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
              activeMode === 'deposit' ? 'bg-teal-700/70' : 'bg-rose-900/70'
            }`}>
              {activeMode === 'deposit' ? '+' : '-'}{formatCurrency(currentNumericAmount, false)}
            </span>
          </button>

          {/* Member A Action Button */}
          <button
            type="button"
            onClick={() => handleAction('person_a')}
            disabled={currentNumericAmount <= 0}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition active:scale-95 ${
              activeMode === 'deposit'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
            }`}
            title={
              activeMode === 'deposit'
                ? `หยอดเงิน ${formatCurrency(currentNumericAmount)} เข้า${selectedFund === 'long_term' ? 'กองระยะยาว' : 'กองหมุนเวียน'} ให้ ${memberA.name}`
                : `ถอนเงิน ${formatCurrency(currentNumericAmount)} จาก${selectedFund === 'long_term' ? 'กองระยะยาว' : 'กองหมุนเวียน'} ให้ ${memberA.name}`
            }
          >
            <span>{memberA.avatar}</span>
            <span>{activeMode === 'deposit' ? `หยอดให้ ${memberA.nickname}` : `ถอนให้ ${memberA.nickname}`}</span>
            <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
              activeMode === 'deposit' ? 'bg-emerald-700/60' : 'bg-rose-700/70'
            }`}>
              {activeMode === 'deposit' ? '+' : '-'}{formatCurrency(currentNumericAmount, false)}
            </span>
          </button>

          {/* Member B Action Button */}
          <button
            type="button"
            onClick={() => handleAction('person_b')}
            disabled={currentNumericAmount <= 0}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition active:scale-95 ${
              activeMode === 'deposit'
                ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                : 'bg-rose-700 hover:bg-rose-600 shadow-rose-700/20'
            }`}
            title={
              activeMode === 'deposit'
                ? `หยอดเงิน ${formatCurrency(currentNumericAmount)} เข้า${selectedFund === 'long_term' ? 'กองระยะยาว' : 'กองหมุนเวียน'} ให้ ${memberB.name}`
                : `ถอนเงิน ${formatCurrency(currentNumericAmount)} จาก${selectedFund === 'long_term' ? 'กองระยะยาว' : 'กองหมุนเวียน'} ให้ ${memberB.name}`
            }
          >
            <span>{memberB.avatar}</span>
            <span>{activeMode === 'deposit' ? `หยอดให้ ${memberB.nickname}` : `ถอนให้ ${memberB.nickname}`}</span>
            <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
              activeMode === 'deposit' ? 'bg-indigo-700/60' : 'bg-rose-800/70'
            }`}>
              {activeMode === 'deposit' ? '+' : '-'}{formatCurrency(currentNumericAmount, false)}
            </span>
          </button>

          {/* Full Custom Modal Button */}
          <button
            type="button"
            onClick={() => onOpenCustomAdd('joint', selectedFund)}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            title="เปิดหน้าต่างระบุข้อมูล/เป้าหมายแบบละเอียด"
          >
            <Plus className="w-4 h-4" />
          </button>

        </div>

      </div>

    </div>
  );
};
