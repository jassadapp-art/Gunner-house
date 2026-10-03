import React, { useState, useMemo } from 'react';
import type { HouseholdSettings, InvestmentItem, TaxProfile } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { calculatePersonalIncomeTax } from '../utils/taxCalculator';
import {
  TrendingUp,
  Calculator,
  PieChart as PieIcon,
  PlusCircle,
  Award,
  Sparkles,
  Edit2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface InvestmentTaxViewProps {
  settings: HouseholdSettings;
  onUpdateSettings: (newSettings: HouseholdSettings) => void;
  onShowToast?: (msg: string) => void;
}

export const InvestmentTaxView: React.FC<InvestmentTaxViewProps> = ({
  settings,
  onUpdateSettings,
  onShowToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'investment' | 'tax'>('investment');
  const [selectedTaxMember, setSelectedTaxMember] = useState<'person_a' | 'person_b'>('person_a');

  // Investment Modal State
  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<InvestmentItem | null>(null);

  const [invTitle, setInvTitle] = useState('');
  const [invCategory, setInvCategory] = useState<InvestmentItem['category']>('thaiesg');
  const [invOwner, setInvOwner] = useState<'person_a' | 'person_b' | 'joint'>('person_a');
  const [invCost, setInvCost] = useState('');
  const [invValue, setInvValue] = useState('');
  const [invDca, setInvDca] = useState('');
  const [invTarget, setInvTarget] = useState('');
  const [invNotes, setInvNotes] = useState('');

  const memberA = settings.members.person_a;
  const memberB = settings.members.person_b;

  const investments = useMemo(() => settings.investments || [], [settings.investments]);
  const taxProfiles: Record<'person_a' | 'person_b', TaxProfile | undefined> = useMemo(
    () => settings.taxProfiles || { person_a: undefined, person_b: undefined },
    [settings.taxProfiles]
  );

  // Current Tax Calculation for selected member
  const currentMember = selectedTaxMember === 'person_a' ? memberA : memberB;
  const currentTaxProfile = taxProfiles[selectedTaxMember];
  const taxResult = useMemo(
    () => calculatePersonalIncomeTax(currentMember, currentTaxProfile),
    [currentMember, currentTaxProfile]
  );

  // Investment Portfolio Summary
  const totalCost = useMemo(() => investments.reduce((acc, i) => acc + i.initialCost, 0), [investments]);
  const totalValue = useMemo(() => investments.reduce((acc, i) => acc + i.currentValue, 0), [investments]);
  const totalDcaMonthly = useMemo(() => investments.reduce((acc, i) => acc + i.monthlyDca, 0), [investments]);
  const profitLoss = totalValue - totalCost;
  const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

  // Investment Categories for Donut Chart
  const assetSlices = useMemo(() => {
    const map = new Map<string, number>();
    investments.forEach(i => {
      let label = 'อื่นๆ';
      if (i.category === 'thaiesg') label = 'ThaiESG';
      else if (i.category === 'ssf' || i.category === 'rmf') label = 'SSF / RMF';
      else if (i.category === 'pvd') label = 'กองทุนสำรองเลี้ยงชีพ PVD';
      else if (i.category === 'stock_thai') label = 'หุ้นไทย (SET50)';
      else if (i.category === 'stock_global') label = 'กองทุนหุ้นโลก (ETF)';
      map.set(label, (map.get(label) || 0) + i.currentValue);
    });

    const colors = ['#10B981', '#6366F1', '#F59E0B', '#06B6D4', '#EC4899', '#8B5CF6'];
    let idx = 0;
    return Array.from(map.entries()).map(([name, val]) => ({
      name,
      value: val,
      color: colors[idx++ % colors.length],
    }));
  }, [investments]);

  // Handle Save Investment
  const handleOpenAddInv = () => {
    setEditingInv(null);
    setInvTitle('');
    setInvCategory('thaiesg');
    setInvOwner('person_a');
    setInvCost('');
    setInvValue('');
    setInvDca('');
    setInvTarget('');
    setInvNotes('');
    setIsInvModalOpen(true);
  };

  const handleOpenEditInv = (inv: InvestmentItem) => {
    setEditingInv(inv);
    setInvTitle(inv.title);
    setInvCategory(inv.category);
    setInvOwner(inv.owner);
    setInvCost(inv.initialCost.toString());
    setInvValue(inv.currentValue.toString());
    setInvDca(inv.monthlyDca.toString());
    setInvTarget(inv.targetValue ? inv.targetValue.toString() : '');
    setInvNotes(inv.notes || '');
    setIsInvModalOpen(true);
  };

  const handleSaveInv = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invTitle.trim()) return;

    const cost = parseFloat(invCost) || 0;
    const val = parseFloat(invValue) || cost;
    const dca = parseFloat(invDca) || 0;
    const target = invTarget ? parseFloat(invTarget) : undefined;

    const newItem: InvestmentItem = {
      id: editingInv ? editingInv.id : `inv-${Date.now()}`,
      title: invTitle.trim(),
      category: invCategory,
      owner: invOwner,
      initialCost: cost,
      currentValue: val,
      monthlyDca: dca,
      targetValue: target,
      notes: invNotes.trim(),
      updatedAt: new Date().toISOString(),
    };

    let updatedList: InvestmentItem[];
    if (editingInv) {
      updatedList = investments.map(i => (i.id === editingInv.id ? newItem : i));
    } else {
      updatedList = [...investments, newItem];
    }

    onUpdateSettings({
      ...settings,
      investments: updatedList,
    });

    setIsInvModalOpen(false);
    onShowToast?.(editingInv ? 'แก้ไขข้อมูลการลงทุนเรียบร้อยแล้ว' : 'เพิ่มสินทรัพย์การลงทุนใหม่เรียบร้อยแล้ว ✨');
  };

  const handleDeleteInv = (id: string) => {
    if (!window.confirm('คุณต้องการลบสินทรัพย์การลงทุนนี้ใช่หรือไม่?')) return;
    const updated = investments.filter(i => i.id !== id);
    onUpdateSettings({
      ...settings,
      investments: updated,
    });
    onShowToast?.('ลบสินทรัพย์เรียบร้อยแล้ว');
  };

  // Handle Tax Profile field update
  const handleUpdateTaxField = (field: keyof TaxProfile, value: number) => {
    const defaultProfileA: TaxProfile = {
      memberId: 'person_a',
      socialSecurity: 9000,
      pvdDeduction: 0,
      lifeInsurance: 0,
      healthInsurance: 0,
      thaiEsg: 0,
      ssf: 0,
      rmf: 0,
      homeLoanInterest: 0,
      parentDeductionCount: 0,
      otherDeductions: 0,
    };

    const defaultProfileB: TaxProfile = {
      memberId: 'person_b',
      socialSecurity: 9000,
      pvdDeduction: 0,
      lifeInsurance: 0,
      healthInsurance: 0,
      thaiEsg: 0,
      ssf: 0,
      rmf: 0,
      homeLoanInterest: 0,
      parentDeductionCount: 0,
      otherDeductions: 0,
    };

    const profileA = taxProfiles.person_a || defaultProfileA;
    const profileB = taxProfiles.person_b || defaultProfileB;

    const targetProfile = selectedTaxMember === 'person_a' ? profileA : profileB;
    const updatedProfile: TaxProfile = {
      ...targetProfile,
      [field]: value,
    };

    onUpdateSettings({
      ...settings,
      taxProfiles: {
        person_a: selectedTaxMember === 'person_a' ? updatedProfile : profileA,
        person_b: selectedTaxMember === 'person_b' ? updatedProfile : profileB,
      },
    });
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      
      {/* Header Banner & Sub-tab Switcher */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-600/10 via-teal-500/10 to-transparent border border-emerald-500/20 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
              หน้า 4
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              แผนการลงทุน & วางแผนภาษี
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
            บริหารพอร์ตลงทุนระยะยาว (DCA, ThaiESG, SSF, PVD, หุ้น) และคำนวณภาษีบุคคลธรรมดาเพื่อความมั่งคั่ง
          </p>
        </div>

        {/* 2 Tabs: Investment vs Tax */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('investment')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'investment'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>พอร์ต & แผนลงทุน</span>
          </button>
          <button
            onClick={() => setActiveSubTab('tax')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'tax'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>วางแผนภาษี (ภ.ง.ด.)</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SUB-TAB 1: INVESTMENT PORTFOLIO & PLAN                         */}
      {/* ============================================================== */}
      {activeSubTab === 'investment' && (
        <div className="space-y-6">
          
          {/* Portfolio Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                มูลค่าพอร์ตปัจจุบัน
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                {formatCurrency(totalValue)}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                เงินต้นลงทุนรวม {formatCurrency(totalCost)}
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                กำไร/ขาดทุนสะสม (P/L)
              </span>
              <div className={`text-xl sm:text-2xl font-black mt-1 ${
                profitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
              }`}>
                {profitLoss >= 0 ? '+' : ''}{formatCurrency(profitLoss)}
              </div>
              <div className={`mt-2 text-[11px] font-bold ${
                profitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
              }`}>
                {profitLoss >= 0 ? '+' : ''}{formatPercent(profitLossPercent, 2)}
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                แผนออม DCA ประจำเดือน
              </span>
              <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {formatCurrency(totalDcaMonthly)}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                สะสมอัตโนมัติทุกเดือน
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                สินทรัพย์ทั้งหมด
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                {investments.length} รายการ
              </div>
              <button
                onClick={handleOpenAddInv}
                className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 self-start"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ เพิ่มสินทรัพย์ใหม่</span>
              </button>
            </div>

          </div>

          {/* Allocation Donut Chart + Asset List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Donut Chart */}
            <div className="lg:col-span-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-600" />
                <span>สัดส่วนสินทรัพย์ลงทุน (Asset Allocation)</span>
              </h3>
              
              <div className="h-60 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetSlices}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {assetSlices.map((entry, idx) => (
                        <Cell key={`asset-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                {assetSlices.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span>{s.name}</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(s.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Investment Items Grid */}
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  รายการพอร์ตลงทุนของครอบครัว ({investments.length})
                </h3>
                <button
                  onClick={handleOpenAddInv}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>เพิ่มรายการลงทุน</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {investments.map(inv => {
                  const gain = inv.currentValue - inv.initialCost;
                  const gainPct = inv.initialCost > 0 ? (gain / inv.initialCost) * 100 : 0;
                  const ownerName = inv.owner === 'person_a' ? memberA.nickname : inv.owner === 'person_b' ? memberB.nickname : 'พอร์ตคู่';

                  return (
                    <div
                      key={inv.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-emerald-500/40 transition gap-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {inv.category} • {ownerName}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                              {inv.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditInv(inv)}
                              className="p-1 text-slate-400 hover:text-indigo-600 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteInv(inv.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {inv.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                            {inv.notes}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <div className="text-[10px] text-slate-400">มูลค่าปัจจุบัน</div>
                          <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                            {formatCurrency(inv.currentValue)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">DCA/เดือน</div>
                          <div className="font-bold text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(inv.monthlyDca)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">กำไร/ขาดทุน</div>
                          <div className={`font-bold ${gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {gain >= 0 ? '+' : ''}{gainPct.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 2: PERSONAL INCOME TAX PLANNER (ภ.ง.ด. 91/90)           */}
      {/* ============================================================== */}
      {activeSubTab === 'tax' && (
        <div className="space-y-6">
          
          {/* Member Switcher (เจ vs เมย์) */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  คำนวณภาษีเงินได้บุคคลธรรมดา (ปี 2567-2569)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  เลือกสมาชิกเพื่อวางแผนสิทธิลดหย่อนภาษี (ThaiESG, SSF, PVD, ประกัน, ดอกเบี้ยบ้าน)
                </p>
              </div>
            </div>

            {/* Switch Member Buttons */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSelectedTaxMember('person_a')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedTaxMember === 'person_a'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{memberA.avatar}</span>
                <span>{memberA.name}</span>
              </button>
              <button
                onClick={() => setSelectedTaxMember('person_b')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedTaxMember === 'person_b'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{memberB.avatar}</span>
                <span>{memberB.name}</span>
              </button>
            </div>
          </div>

          {/* Tax Result Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">รายได้รวมทั้งปี</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                {formatCurrency(taxResult.grossIncome)}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                เงินเดือน ฿{(currentMember.monthlyIncome || 0).toLocaleString()} x 12
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">เงินได้สุทธิ (หลังหักลดหย่อน)</span>
              <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {formatCurrency(taxResult.netTaxableIncome)}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                ลดหย่อนรวม {formatCurrency(taxResult.totalDeductions + taxResult.standardExpenses)}
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ภาษีที่ต้องชำระสุทธิ</span>
              <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(taxResult.taxPayable)}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                ฐานภาษีสูงสุด {taxResult.marginalTaxRate.toFixed(0)}%
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 shadow-sm">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                ภาษีที่ประหยัดได้ (Tax Saved)
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(taxResult.taxSaved)}
              </div>
              <div className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>จากสิทธิลดหย่อนที่วางแผนไว้</span>
              </div>
            </div>

          </div>

          {/* Interactive Deduction Inputs & Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Form: Adjust Deductions */}
            <div className="lg:col-span-7 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>ปรับปรุงรายการลดหย่อนของ {currentMember.name}</span>
                </h4>
                <span className="text-xs text-slate-400">
                  คำนวณอัตโนมัติ Realtime
                </span>
              </div>

              <div className="space-y-3.5 text-xs">
                
                {/* Bonus */}
                <div className="grid grid-cols-3 items-center gap-3">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold">
                    โบนัสประจำปี (บาท)
                  </label>
                  <input
                    type="number"
                    value={currentTaxProfile?.annualBonus || ''}
                    onChange={e => handleUpdateTaxField('annualBonus', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="col-span-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Social Security */}
                <div className="grid grid-cols-3 items-center gap-3">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold">
                    ประกันสังคม (สูงสุด 9,000)
                  </label>
                  <input
                    type="number"
                    max={9000}
                    value={currentTaxProfile?.socialSecurity ?? 9000}
                    onChange={e => handleUpdateTaxField('socialSecurity', parseFloat(e.target.value) || 0)}
                    className="col-span-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* ThaiESG */}
                <div className="grid grid-cols-3 items-center gap-3">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                    <span>กองทุน ThaiESG</span>
                    <span className="text-[10px] px-1 rounded bg-emerald-100 text-emerald-800 font-bold">ใหม่!</span>
                  </label>
                  <input
                    type="number"
                    max={300000}
                    value={currentTaxProfile?.thaiEsg || ''}
                    onChange={e => handleUpdateTaxField('thaiEsg', parseFloat(e.target.value) || 0)}
                    placeholder="สูงสุด 300,000"
                    className="col-span-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* PVD */}
                <div className="grid grid-cols-3 items-center gap-3">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold">
                    กองทุนสำรองเลี้ยงชีพ PVD
                  </label>
                  <input
                    type="number"
                    value={currentTaxProfile?.pvdDeduction || ''}
                    onChange={e => handleUpdateTaxField('pvdDeduction', parseFloat(e.target.value) || 0)}
                    placeholder="สูงสุด 15% ไม่เกิน 500k"
                    className="col-span-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* SSF */}
                <div className="grid grid-cols-3 items-center gap-3">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold">
                    กองทุน SSF (สูงสุด 200,000)
                  </label>
                  <input
                    type="number"
                    max={200000}
                    value={currentTaxProfile?.ssf || ''}
                    onChange={e => handleUpdateTaxField('ssf', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="col-span-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Life & Health Insurance */}
                <div className="grid grid-cols-3 items-center gap-3">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold">
                    เบี้ยประกันชีวิตทั่วไป
                  </label>
                  <input
                    type="number"
                    max={100000}
                    value={currentTaxProfile?.lifeInsurance || ''}
                    onChange={e => handleUpdateTaxField('lifeInsurance', parseFloat(e.target.value) || 0)}
                    placeholder="สูงสุด 100,000"
                    className="col-span-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Parent Count */}
                <div className="grid grid-cols-3 items-center gap-3">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold">
                    ลดหย่อนบิดามารดา (คน)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={4}
                    value={currentTaxProfile?.parentDeductionCount ?? 1}
                    onChange={e => handleUpdateTaxField('parentDeductionCount', parseInt(e.target.value, 10) || 0)}
                    className="col-span-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

              </div>
            </div>

            {/* Smart Recommendations & Tax Brackets Card */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Tip Card */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-md space-y-3">
                <div className="flex items-center gap-2 text-indigo-300">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-bold">คำแนะนำวางแผนภาษีอัจฉริยะ</span>
                </div>
                <p className="text-xs leading-relaxed text-indigo-100/90 font-medium">
                  {taxResult.recommendations.tip}
                </p>
                <div className="pt-2 border-t border-indigo-700/60 flex items-center justify-between text-xs">
                  <span className="text-indigo-300">สิทธิ ThaiESG คงเหลือ:</span>
                  <span className="font-extrabold text-emerald-400">
                    {formatCurrency(taxResult.recommendations.thaiEsgRemaining)}
                  </span>
                </div>
              </div>

              {/* Tax Brackets Step Table */}
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  ตารางแจกแจงภาษีขั้นบันได (ภ.ง.ด.)
                </h4>
                
                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                        <th className="pb-1.5">ขั้นเงินได้สุทธิ</th>
                        <th className="pb-1.5 text-center">อัตรา</th>
                        <th className="pb-1.5 text-right">ภาษีขั้นนี้</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {taxResult.brackets.slice(0, 5).map((b, idx) => (
                        <tr key={idx} className={b.taxableInBracket > 0 ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-400'}>
                          <td className="py-1.5">{b.range}</td>
                          <td className="py-1.5 text-center">{(b.rate * 100).toFixed(0)}%</td>
                          <td className="py-1.5 text-right">
                            {formatCurrency(b.taxAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* Add / Edit Investment Modal */}
      {isInvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingInv ? 'แก้ไขสินทรัพย์ลงทุน' : 'เพิ่มสินทรัพย์การลงทุนใหม่'}
              </h3>
              <button
                onClick={() => setIsInvModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInv} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  ชื่อสินทรัพย์ / กองทุน
                </label>
                <input
                  type="text"
                  required
                  value={invTitle}
                  onChange={e => setInvTitle(e.target.value)}
                  placeholder="เช่น กองทุนรวม ThaiESG, หุ้น SET50, PVD"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    ประเภทการลงทุน
                  </label>
                  <select
                    value={invCategory}
                    onChange={e => setInvCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="thaiesg">ThaiESG (ลดหย่อนภาษี)</option>
                    <option value="ssf">SSF (ลดหย่อนภาษี)</option>
                    <option value="rmf">RMF (เพื่อการเกษียณ)</option>
                    <option value="pvd">กองทุนสำรองเลี้ยงชีพ PVD</option>
                    <option value="stock_thai">หุ้นไทย (Thai Stocks)</option>
                    <option value="stock_global">หุ้นโลก / ETF</option>
                    <option value="gold">ทองคำ (Gold)</option>
                    <option value="crypto">คริปโต (Crypto)</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    เจ้าของพอร์ต
                  </label>
                  <select
                    value={invOwner}
                    onChange={e => setInvOwner(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="person_a">{memberA.nickname} (เจ)</option>
                    <option value="person_b">{memberB.nickname} (เมย์)</option>
                    <option value="joint">พอร์ตคู่ (กองกลาง)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    เงินต้นลงทุน (บาท)
                  </label>
                  <input
                    type="number"
                    required
                    value={invCost}
                    onChange={e => setInvCost(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    มูลค่าปัจจุบัน (บาท)
                  </label>
                  <input
                    type="number"
                    value={invValue}
                    onChange={e => setInvValue(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    DCA ต่อเดือน (บาท)
                  </label>
                  <input
                    type="number"
                    value={invDca}
                    onChange={e => setInvDca(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  หมายเหตุ / วัตถุประสงค์
                </label>
                <input
                  type="text"
                  value={invNotes}
                  onChange={e => setInvNotes(e.target.value)}
                  placeholder="เช่น ลดหย่อนภาษี 5 ปี, กองทุนระยะยาว"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInvModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  บันทึกสินทรัพย์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
