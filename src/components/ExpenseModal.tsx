import React, { useState, useEffect } from 'react';
import type { ExpenseAmountType, ExpensePayer, HouseholdSettings, MonthlyExpense } from '../types';
import { X, Receipt, Palette, Calendar, Users, Plus, Check, Lock, Zap } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expenseData: MonthlyExpense) => void;
  onDelete?: (expenseId: string) => void;
  editingExpense?: MonthlyExpense | null;
  settings: HouseholdSettings;
  categories: string[];
  onAddCustomCategory: (newCategory: string) => void;
}

const EXPENSE_EMOJIS = ['🏠', '🚗', '⚡', '📶', '🩺', '🛒', '💳', '⛽', '🍼', '🐾', '🏋️', '📦'];
const EXPENSE_COLORS = [
  '#10B981', // Emerald
  '#0D9488', // Teal
  '#0284C7', // Sky
  '#6366F1', // Indigo
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#EF4444', // Red
];

const DEFAULT_CATEGORIES = [
  'ที่อยู่อาศัย (บ้าน/คอนโด)',
  'ยานพาหนะและการเดินทาง',
  'สาธารณูปโภค (น้ำ/ไฟ/ส่วนกลาง)',
  'ประกันและสุขภาพ',
  'สื่อสารและอินเทอร์เน็ต',
  'ของกินและของใช้ในบ้าน',
  'การศึกษาและอนาคตลูก',
  'บัตรเครดิตและสินเชื่อ',
  'บันเทิงและไลฟ์สไตล์',
  'อื่นๆ',
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingExpense,
  settings,
  categories = DEFAULT_CATEGORIES,
  onAddCustomCategory,
}) => {
  const memberA = settings.members.person_a;
  const memberB = settings.members.person_b;
  const safeCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [amountType, setAmountType] = useState<ExpenseAmountType>('fixed');
  const [currentMonthAmount, setCurrentMonthAmount] = useState('');
  const [category, setCategory] = useState(safeCategories[0] || 'ที่อยู่อาศัย (บ้าน/คอนโด)');
  const [payer, setPayer] = useState<ExpensePayer>('joint');
  const [dueDay, setDueDay] = useState<number | ''>(1);
  const [icon, setIcon] = useState('🏠');
  const [color, setColor] = useState('#10B981');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  // Custom category addition state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (editingExpense) {
      setTitle(editingExpense.title);
      setAmount(editingExpense.amount.toString());
      setAmountType(editingExpense.amountType || 'fixed');
      setCurrentMonthAmount(
        editingExpense.currentMonthAmount !== undefined ? editingExpense.currentMonthAmount.toString() : ''
      );
      setCategory(editingExpense.category);
      setPayer(editingExpense.payer);
      setDueDay(editingExpense.dueDay ?? 1);
      setIcon(editingExpense.icon || '🏠');
      setColor(editingExpense.color || '#10B981');
      setNote(editingExpense.note || '');
    } else {
      setTitle('');
      setAmount('');
      setAmountType('fixed');
      setCurrentMonthAmount('');
      setCategory(categories[0] || 'ที่อยู่อาศัย (บ้าน/คอนโด)');
      setPayer('joint');
      setDueDay(1);
      setIcon('🏠');
      setColor('#10B981');
      setNote('');
    }
    setIsAddingCategory(false);
    setNewCategoryName('');
    setError('');
  }, [editingExpense, isOpen, categories]);

  if (!isOpen) return null;

  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const trimmed = newCategoryName.trim();
    onAddCustomCategory(trimmed);
    setCategory(trimmed);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!title.trim()) {
      setError('กรุณาระบุชื่อรายการค่าใช้จ่าย');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('กรุณาระบุจำนวนเงินที่ถูกต้องและมากกว่า 0 บาท');
      return;
    }

    const numActual = currentMonthAmount.trim() ? parseFloat(currentMonthAmount) : undefined;
    if (numActual !== undefined && (isNaN(numActual) || numActual < 0)) {
      setError('กรุณาระบุยอดจริงตามบิลให้ถูกต้อง');
      return;
    }

    const savedExpense: MonthlyExpense = {
      id: editingExpense?.id || `exp-${Date.now()}`,
      title: title.trim(),
      amount: numAmount,
      amountType,
      currentMonthAmount: amountType === 'variable' ? numActual : undefined,
      monthlyBills: editingExpense?.monthlyBills,
      category,
      payer,
      dueDay: dueDay ? Number(dueDay) : undefined,
      icon,
      color,
      note: note.trim() || undefined,
      isPaidThisMonth: editingExpense?.isPaidThisMonth ?? false,
    };

    onSave(savedExpense);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden max-h-[90vh] flex flex-col transition-colors">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-5 flex-shrink-0">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {editingExpense ? 'แก้ไขค่าใช้จ่ายประจำเดือน' : 'เพิ่มค่าใช้จ่ายประจำเดือน'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ระบุรายการค่าใช้จ่ายคงที่หรือผันแปรตามบิล เช่น ค่าบ้าน ค่ารถ ค่าน้ำไฟ พร้อมจัดหมวดหมู่ให้เหมือนกัน
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
          
          {/* Expense Type Selector (Fixed vs Variable) */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
              รูปแบบค่าใช้จ่าย
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAmountType('fixed')}
                className={`p-2.5 rounded-xl text-left border transition ${
                  amountType === 'fixed'
                    ? 'bg-white dark:bg-slate-900 border-emerald-500 text-slate-900 dark:text-white shadow-xs ring-1 ring-emerald-500/40'
                    : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white/50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Lock className={`w-3.5 h-3.5 ${amountType === 'fixed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  <span>ยอดคงที่ (Fixed)</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  เท่ากันทุกเดือน เช่น ผ่อนบ้าน, ค่ารถ, ค่าเน็ต
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAmountType('variable')}
                className={`p-2.5 rounded-xl text-left border transition ${
                  amountType === 'variable'
                    ? 'bg-amber-50/70 dark:bg-amber-500/10 border-amber-500 text-amber-950 dark:text-amber-300 shadow-xs ring-1 ring-amber-500/40'
                    : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white/50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Zap className={`w-3.5 h-3.5 ${amountType === 'variable' ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span>ผันแปรตามบิล (Variable)</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  ยอดเปลี่ยนตามจริง เช่น ค่าไฟ, ค่าน้ำ, ค่าบัตร
                </div>
              </button>
            </div>
          </div>

          {/* Icon & Color Selector */}
          <div className="flex flex-col sm:flex-row gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            {/* Emoji */}
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                เลือกไอคอน
              </label>
              <div className="flex flex-wrap gap-1.5">
                {EXPENSE_EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setIcon(e)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition ${
                      icon === e
                        ? 'bg-emerald-100 dark:bg-slate-700 ring-2 ring-emerald-500 scale-110'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-transparent'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Accent */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                <Palette className="w-3 h-3" /> สีแท็ก
              </label>
              <div className="flex flex-wrap gap-1.5 sm:w-28">
                {EXPENSE_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition ${
                      color === c
                        ? 'ring-2 ring-emerald-600 dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-slate-950 scale-110'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              ชื่อรายการค่าใช้จ่าย *
            </label>
            <input
              type="text"
              required
              placeholder="เช่น ค่าผ่อนบ้าน, ค่าผ่อนรถ, ค่าน้ำไฟ..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Amount Inputs (Fixed vs Variable) */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  {amountType === 'variable' ? (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>ยอดประมาณการ / งบต่อเดือน (THB) *</span>
                    </>
                  ) : (
                    <span>จำนวนเงินคงที่ต่อเดือน (THB) *</span>
                  )}
                </label>
                {amountType === 'variable' && (
                  <span className="text-[11px] text-slate-400">ใช้เป็นฐานคำนวณงบประมาณ</span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  ฿
                </span>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder={amountType === 'variable' ? '2,500' : '10,000'}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base rounded-xl pl-8 pr-3 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* If Variable: Actual bill for current month */}
            {amountType === 'variable' && (
              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                    ยอดจริงตามบิลรอบเดือนนี้ (THB - ถ้ามีบิลแล้ว)
                  </label>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400">ไม่บังคับ (แก้ไขภายหลังได้)</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-600 dark:text-amber-400">
                    ฿
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder="เช่น 2,450 (เว้นว่างไว้หากยังไม่ได้รับบิล)"
                    value={currentMonthAmount}
                    onChange={e => setCurrentMonthAmount(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-500/40 text-amber-950 dark:text-white font-bold text-sm rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <p className="text-[10px] text-amber-800/80 dark:text-amber-400/80 mt-1">
                  💡 หากกรอกยอดจริง ระบบจะนำยอดนี้ไปคำนวณในงบและกราฟประจำเดือนแทนยอดประมาณการ
                </p>
              </div>
            )}
          </div>

          {/* Category Selection with "+ เพิ่มหมวดหมู่ใหม่" */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                หมวดหมู่ (Category เพื่อจัดกลุ่มให้เหมือนกัน) *
              </label>
              <button
                type="button"
                onClick={() => setIsAddingCategory(prev => !prev)}
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                {isAddingCategory ? 'ปิดกล่องเพิ่ม' : '+ เพิ่มหมวดหมู่ใหม่'}
              </button>
            </div>

            {/* Inline Add New Category input */}
            {isAddingCategory && (
              <div className="mb-2 p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-2 animate-in fade-in duration-150">
                <input
                  type="text"
                  placeholder="พิมพ์ชื่อหมวดหมู่ใหม่ เช่น ค่าสัตว์เลี้ยง, กองทุนรวม..."
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  className="flex-1 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddNewCategory}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition active:scale-95 flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  เพิ่ม
                </button>
              </div>
            )}

            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
            >
              {safeCategories.map(cat => (
                <option key={cat} value={cat}>
                  🏷️ {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Due Day */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              วันครบกำหนดชำระของทุกเดือน
            </label>
            <input
              type="number"
              min="1"
              max="31"
              placeholder="เช่น 1, 5, 25 (วันที่ในเดือน)"
              value={dueDay}
              onChange={e => setDueDay(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Payer (Who pays) */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              ใครรับผิดชอบค่าใช้จ่ายนี้?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPayer('joint')}
                className={`py-2 px-2 rounded-xl text-xs font-semibold text-center border transition ${
                  payer === 'joint'
                    ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/40'
                    : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                🤝 กองกลาง (หารสอง)
              </button>

              <button
                type="button"
                onClick={() => setPayer('person_a')}
                className={`py-2 px-2 rounded-xl text-xs font-semibold text-center border transition ${
                  payer === 'person_a'
                    ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/40'
                    : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                {memberA.avatar} {memberA.nickname} จ่าย
              </button>

              <button
                type="button"
                onClick={() => setPayer('person_b')}
                className={`py-2 px-2 rounded-xl text-xs font-semibold text-center border transition ${
                  payer === 'person_b'
                    ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/40'
                    : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                {memberB.avatar} {memberB.nickname} จ่าย
              </button>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              หมายเหตุเพิ่มเติม
            </label>
            <input
              type="text"
              placeholder="เช่น หักบัญชีอัตโนมัติ, ชำระผ่านบัตรเครดิต..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Bottom Actions */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80">
            {editingExpense && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`คุณแน่ใจว่าต้องการลบรายการ "${editingExpense.title}" หรือไม่?`)) {
                    onDelete(editingExpense.id);
                    onClose();
                  }
                }}
                className="text-xs text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:underline"
              >
                ลบรายการนี้
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/20"
              >
                {editingExpense ? 'บันทึกการแก้ไข' : 'เพิ่มค่าใช้จ่าย'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
