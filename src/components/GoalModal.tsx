import React, { useState, useEffect } from 'react';
import type { SavingsGoal } from '../types';
import { X, Target, Palette, Calendar } from 'lucide-react';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goalData: SavingsGoal) => void;
  onDelete?: (goalId: string) => void;
  editingGoal?: SavingsGoal | null;
}

const EMOJI_PRESETS = ['🛡️', '✈️', '🏡', '🛋️', '👶', '🚗', '💍', '💻', '🎓', '🏥', '🏖️', '💎'];
const COLOR_PRESETS = [
  '#10B981', // Emerald
  '#0D9488', // Teal
  '#0284C7', // Sky
  '#6366F1', // Indigo
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#14B8A6', // Teal
];

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingGoal,
}) => {
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [category, setCategory] = useState('ความมั่นคง');
  const [targetDate, setTargetDate] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [color, setColor] = useState('#10B981');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingGoal) {
      setTitle(editingGoal.title);
      setTargetAmount(editingGoal.targetAmount.toString());
      setCategory(editingGoal.category);
      setTargetDate(editingGoal.targetDate || '');
      setIcon(editingGoal.icon || '🎯');
      setColor(editingGoal.color || '#10B981');
      setDescription(editingGoal.description || '');
    } else {
      setTitle('');
      setTargetAmount('');
      setCategory('ความมั่นคง');
      setTargetDate('');
      setIcon('🎯');
      setColor('#10B981');
      setDescription('');
    }
    setError('');
  }, [editingGoal, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numTarget = parseFloat(targetAmount);
    if (!title.trim()) {
      setError('กรุณาระบุชื่อเป้าหมาย');
      return;
    }
    if (isNaN(numTarget) || numTarget <= 0) {
      setError('กรุณาระบุจำนวนเงินเป้าหมายที่ถูกต้อง');
      return;
    }

    const savedGoal: SavingsGoal = {
      id: editingGoal?.id || `goal-${Date.now()}`,
      title: title.trim(),
      targetAmount: numTarget,
      currentAmount: editingGoal?.currentAmount || 0,
      category,
      targetDate: targetDate || undefined,
      icon,
      color,
      description: description.trim() || undefined,
    };

    onSave(savedGoal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden transition-colors">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-teal-600 dark:text-cyan-400" />
            {editingGoal ? 'แก้ไขเป้าหมายการออม' : 'สร้างเป้าหมายกองกลางใหม่'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            กำหนดเป้าหมายเพื่อสร้างแรงจูงใจในการออมเงินร่วมกัน
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Icon & Color Selection */}
          <div className="flex flex-col sm:flex-row gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            {/* Emoji Picker */}
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                เลือกไอคอน
              </label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_PRESETS.map(e => (
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

            {/* Color Accent Picker */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                <Palette className="w-3 h-3" /> โทนสี
              </label>
              <div className="flex flex-wrap gap-1.5 sm:w-28">
                {COLOR_PRESETS.map(c => (
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

          {/* Goal Title */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              ชื่อเป้าหมาย *
            </label>
            <input
              type="text"
              required
              placeholder="เช่น ทริปสวิตเซอร์แลนด์, รถยนต์คันใหม่..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Target Amount */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              ยอดเงินเป้าหมาย (THB) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                ฿
              </span>
              <input
                type="number"
                step="any"
                required
                placeholder="100,000"
                value={targetAmount}
                onChange={e => setTargetAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base rounded-xl pl-8 pr-3 py-2.5 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Category & Target Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                หมวดหมู่
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
              >
                <option value="ความมั่นคง">🛡️ ความมั่นคง (Emergency)</option>
                <option value="ท่องเที่ยว">✈️ ท่องเที่ยว (Vacation)</option>
                <option value="อนาคต/เกษียณ">🏡 อนาคต/เกษียณ (Retirement)</option>
                <option value="ของใช้ในบ้าน">🛋️ ของใช้ในบ้าน (Home)</option>
                <option value="การศึกษาลูก">👶 อนาคตลูก (Child Fund)</option>
                <option value="อื่นๆ">📦 อื่นๆ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                วันที่ต้องการบรรลุ (ถ้ามี)
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              รายละเอียดเพิ่มเติม
            </label>
            <textarea
              rows={2}
              placeholder="เป้าหมายและแผนการใช้เงินร่วมกัน..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
            {editingGoal && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('คุณแน่ใจว่าต้องการลบเป้าหมายนี้หรือไม่?')) {
                    onDelete(editingGoal.id);
                    onClose();
                  }
                }}
                className="text-xs text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:underline"
              >
                ลบเป้าหมายนี้
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
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20"
              >
                {editingGoal ? 'บันทึกการแก้ไข' : 'สร้างเป้าหมาย'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
