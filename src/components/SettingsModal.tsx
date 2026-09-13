import React, { useState, useRef } from 'react';
import type { HouseholdSettings, MonthlyExpense, SavingsGoal, Transaction } from '../types';
import { exportDataAsJSON } from '../utils/storage';
import {
  X,
  Settings,
  Users,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  Tag,
  Plus,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Cloud,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  Laptop,
  Database,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  SUPABASE_SQL_SETUP,
} from '../services/supabaseSync';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: HouseholdSettings;
  goals: SavingsGoal[];
  transactions: Transaction[];
  expenses: MonthlyExpense[];
  onSaveSettings: (newSettings: HouseholdSettings) => void;
  onImportData: (data: {
    settings: HouseholdSettings;
    goals: SavingsGoal[];
    transactions: Transaction[];
    expenses?: MonthlyExpense[];
  }) => void;
  onResetData: () => void;
  initialTab?: 'profile' | 'security' | 'categories' | 'cloud' | 'data';
  cloudStatus?: 'connected' | 'syncing' | 'offline' | 'error';
  onTriggerCloudSync?: () => Promise<void>;
  onConfigSaved?: () => void;
}

const AVATAR_OPTIONS = ['👨🏻‍💻', '👩🏻‍🎨', '👨‍💼', '👩‍💼', '🧔‍♂️', '👩‍🦰', '🧑‍🚀', '👸', '🤴', '🐱', '🐶', '🐼'];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  goals,
  transactions,
  expenses,
  onSaveSettings,
  onImportData,
  onResetData,
  initialTab,
  cloudStatus = 'offline',
  onTriggerCloudSync,
  onConfigSaved,
}) => {
  const [householdName, setHouseholdName] = useState(settings.householdName);
  
  // Person A state
  const [nameA, setNameA] = useState(settings.members.person_a.name);
  const [nicknameA, setNicknameA] = useState(settings.members.person_a.nickname);
  const [avatarA, setAvatarA] = useState(settings.members.person_a.avatar);
  const [targetA, setTargetA] = useState(settings.members.person_a.monthlyTarget.toString());
  const [incomeA, setIncomeA] = useState((settings.members.person_a.monthlyIncome ?? 45000).toString());

  // Person B state
  const [nameB, setNameB] = useState(settings.members.person_b.name);
  const [nicknameB, setNicknameB] = useState(settings.members.person_b.nickname);
  const [avatarB, setAvatarB] = useState(settings.members.person_b.avatar);
  const [targetB, setTargetB] = useState(settings.members.person_b.monthlyTarget.toString());
  const [incomeB, setIncomeB] = useState((settings.members.person_b.monthlyIncome ?? 40000).toString());

  // Categories state
  const [categories, setCategories] = useState<string[]>(
    settings.customExpenseCategories || [
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
    ]
  );
  const [newCatInput, setNewCatInput] = useState('');

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'categories' | 'cloud' | 'data'>(initialTab || 'profile');

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Cloud Sync state
  const config = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(config.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(config.anonKey);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isSyncingManual, setIsSyncingManual] = useState(false);
  const [cloudMsg, setCloudMsg] = useState<string | null>(null);

  const [isPasswordProtected, setIsPasswordProtected] = useState(settings.isPasswordProtected !== false);
  const [password, setPassword] = useState(settings.password || '1234');
  const [showPassword, setShowPassword] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatInput.trim()) return;
    const trimmed = newCatInput.trim();
    if (!categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
    }
    setNewCatInput('');
  };

  const handleRemoveCategory = (catToRemove: string) => {
    setCategories(categories.filter(c => c !== catToRemove));
  };

  const handleSaveCloudConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setTestResult({ success: false, message: 'กรุณากรอกทั้ง Project URL และ Anon Key' });
      return;
    }
    saveSupabaseConfig(supabaseUrl, supabaseAnonKey);
    setTestingConnection(true);
    setTestResult(null);
    const result = await testSupabaseConnection();
    setTestingConnection(false);
    setTestResult(result);
    if (result.success) {
      onConfigSaved?.();
      setCloudMsg('บันทึกการตั้งค่าและเชื่อมต่อสำเร็จ!');
      setTimeout(() => setCloudMsg(null), 3000);
    }
  };

  const handleTestCloudConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    const result = await testSupabaseConnection();
    setTestingConnection(false);
    setTestResult(result);
  };

  const handleClearCloud = () => {
    if (confirm('คุณต้องการยกเลิกการเชื่อมต่อ Cloud และกลับไปใช้ LocalStorage ในเครื่องนี้ใช่หรือไม่?')) {
      clearSupabaseConfig();
      setSupabaseUrl('');
      setSupabaseAnonKey('');
      setTestResult(null);
      onConfigSaved?.();
      setCloudMsg('ยกเลิกการเชื่อมต่อ Cloud แล้ว');
      setTimeout(() => setCloudMsg(null), 3000);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleManualSyncNow = async () => {
    if (!onTriggerCloudSync) return;
    setIsSyncingManual(true);
    try {
      await onTriggerCloudSync();
      setCloudMsg('ซิงค์ข้อมูลขึ้น Cloud เรียบร้อยแล้ว!');
      setTimeout(() => setCloudMsg(null), 3000);
    } catch (err: any) {
      setCloudMsg('เกิดข้อผิดพลาดในการซิงค์: ' + err?.message);
    } finally {
      setIsSyncingManual(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const incA = parseFloat(incomeA) || 0;
    const incB = parseFloat(incomeB) || 0;

    const updated: HouseholdSettings = {
      ...settings,
      householdName: householdName.trim() || 'กองกลางครัวเรือน',
      customExpenseCategories: categories,
      householdMonthlyIncome: incA + incB,
      isPasswordProtected,
      password: password.trim() || '1234',
      members: {
        person_a: {
          ...settings.members.person_a,
          name: nameA.trim() || 'Person A',
          nickname: nicknameA.trim() || 'Person A',
          avatar: avatarA,
          monthlyTarget: parseFloat(targetA) || 0,
          monthlyIncome: incA,
        },
        person_b: {
          ...settings.members.person_b,
          name: nameB.trim() || 'Person B',
          nickname: nicknameB.trim() || 'Person B',
          avatar: avatarB,
          monthlyTarget: parseFloat(targetB) || 0,
          monthlyIncome: incB,
        },
      },
    };

    onSaveSettings(updated);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.settings && json.transactions) {
          onImportData(json);
          alert('นำเข้าข้อมูลสำเร็จแล้ว!');
          onClose();
        } else {
          alert('ไฟล์ข้อมูลไม่ถูกต้องตามโครงสร้าง');
        }
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ JSON');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden max-h-[90vh] flex flex-col transition-colors">
        
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
            <Settings className="w-5 h-5 text-emerald-600 dark:text-indigo-400" />
            ตั้งค่าระบบกองกลางและสมาชิก
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ปรับแต่งชื่อเล่น Avatar หมวดหมู่ค่าใช้จ่าย และจัดการสำรองข้อมูล
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-5 border-b border-slate-200 dark:border-slate-800 pb-3 flex-shrink-0">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'profile'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            สมาชิกและบัญชี
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'security'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            รหัสผ่านล็อก
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'categories'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            หมวดหมู่ ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'cloud'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Cloud ซิงค์สด</span>
            {config.isConfigured && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'data'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            สำรอง & กู้คืน (Backup)
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 pr-1">
          {activeTab === 'profile' ? (
            <form onSubmit={handleSave} className="space-y-5">
              {/* Household Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  ชื่อบัญชีกองกลาง / ครอบครัว
                </label>
                <input
                  type="text"
                  required
                  value={householdName}
                  onChange={e => setHouseholdName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Person A Card */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    สมาชิกคนที่ 1 (Person A)
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Emerald Theme</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">ชื่อเต็ม</label>
                    <input
                      type="text"
                      value={nameA}
                      onChange={e => setNameA(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">ชื่อเล่น (สั้นๆ)</label>
                    <input
                      type="text"
                      value={nicknameA}
                      onChange={e => setNicknameA(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">เป้าออม/เดือน (THB)</label>
                    <input
                      type="number"
                      value={targetA}
                      onChange={e => setTargetA(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">รายรับ/เงินเดือน (THB)</label>
                    <input
                      type="number"
                      value={incomeA}
                      onChange={e => setIncomeA(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:border-emerald-500 font-semibold text-emerald-700 dark:text-emerald-400"
                    />
                  </div>
                </div>

                {/* Avatar selection for A */}
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">เลือก Avatar</label>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_OPTIONS.map(av => (
                      <button
                        key={`a-${av}`}
                        type="button"
                        onClick={() => setAvatarA(av)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition ${
                          avatarA === av
                            ? 'bg-emerald-200 dark:bg-emerald-500/20 border-2 border-emerald-600 dark:border-emerald-500 scale-110'
                            : 'bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-transparent'
                        }`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Person B Card */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-500/5 border border-indigo-200 dark:border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                    สมาชิกคนที่ 2 (Person B)
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Indigo Theme</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">ชื่อเต็ม</label>
                    <input
                      type="text"
                      value={nameB}
                      onChange={e => setNameB(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">ชื่อเล่น (สั้นๆ)</label>
                    <input
                      type="text"
                      value={nicknameB}
                      onChange={e => setNicknameB(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">เป้าออม/เดือน (THB)</label>
                    <input
                      type="number"
                      value={targetB}
                      onChange={e => setTargetB(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">รายรับ/เงินเดือน (THB)</label>
                    <input
                      type="number"
                      value={incomeB}
                      onChange={e => setIncomeB(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-500 font-semibold text-indigo-700 dark:text-indigo-400"
                    />
                  </div>
                </div>

                {/* Avatar selection for B */}
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">เลือก Avatar</label>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_OPTIONS.map(av => (
                      <button
                        key={`b-${av}`}
                        type="button"
                        onClick={() => setAvatarB(av)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition ${
                          avatarB === av
                            ? 'bg-indigo-200 dark:bg-indigo-500/20 border-2 border-indigo-600 dark:border-indigo-500 scale-110'
                            : 'bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-transparent'
                        }`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Profile */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 flex items-center gap-1.5"
                >
                  {saveSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>บันทึกเรียบร้อย!</span>
                    </>
                  ) : (
                    <span>บันทึกการตั้งค่า</span>
                  )}
                </button>
              </div>
            </form>
          ) : activeTab === 'security' ? (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        ระบบล็อกหน้าจอด้วยรหัสผ่าน (Lock Screen)
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        ต้องใส่ PIN หรือ Password ก่อนเข้าสู่หน้าแดชบอร์ด
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPasswordProtected}
                      onChange={e => setIsPasswordProtected(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {isPasswordProtected && (
                  <div className="pt-3 border-t border-amber-200/80 dark:border-amber-500/20 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        กำหนดรหัสผ่าน (PIN หรือตัวอักษร)
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="ใส่รหัสผ่าน เช่น 1234"
                          className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white rounded-xl pl-3 pr-10 py-2.5 focus:outline-none focus:border-emerald-500 font-mono tracking-wider"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                        * รหัสผ่านเริ่มต้นคือ <code className="font-bold text-emerald-700 dark:text-emerald-400">1234</code> สามารถเปลี่ยนเป็นรหัส 4-6 หลัก หรือตัวอักษรใดๆ ได้ตามต้องการ
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 flex items-center gap-1.5"
                >
                  {saveSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>บันทึกเรียบร้อย!</span>
                    </>
                  ) : (
                    <span>บันทึกการตั้งค่ารหัสผ่าน</span>
                  )}
                </button>
              </div>
            </form>
          ) : activeTab === 'categories' ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  จัดการหมวดหมู่ค่าใช้จ่ายประจำ
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  หมวดหมู่เหล่านี้จะถูกนำไปใช้ในฟอร์มบันทึกค่าใช้จ่ายและคำนวณสัดส่วนในกราฟ
                </p>
              </div>

              {/* Add category form */}
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input
                  type="text"
                  placeholder="เพิ่มหมวดหมู่ใหม่..."
                  value={newCatInput}
                  onChange={e => setNewCatInput(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่ม
                </button>
              </form>

              {/* Categories list */}
              <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center justify-between p-3 bg-white dark:bg-slate-950/40 text-xs text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {cat}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat)}
                      title="ลบหมวดหมู่นี้"
                      className="p-1 text-slate-400 hover:text-rose-500 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                >
                  บันทึกหมวดหมู่
                </button>
              </div>
            </div>
          ) : activeTab === 'cloud' ? (
            <div className="space-y-4">
              {/* Cloud Status Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/40 dark:from-slate-950/80 dark:to-emerald-950/20 border border-slate-200 dark:border-emerald-500/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        ฐานข้อมูลกลาง Supabase (Realtime Sync)
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        เชื่อมโยงข้อมูลระหว่างคอมพิวเตอร์และมือถือแบบ Realtime
                      </p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    cloudStatus === 'connected'
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                      : cloudStatus === 'syncing'
                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                      : cloudStatus === 'error'
                      ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      cloudStatus === 'connected'
                        ? 'bg-emerald-500 animate-pulse'
                        : cloudStatus === 'syncing'
                        ? 'bg-amber-500 animate-spin'
                        : cloudStatus === 'error'
                        ? 'bg-rose-500'
                        : 'bg-slate-400'
                    }`}></span>
                    <span>
                      {cloudStatus === 'connected'
                        ? 'เชื่อมต่อแล้ว (ซิงค์สด)'
                        : cloudStatus === 'syncing'
                        ? 'กำลังซิงค์...'
                        : cloudStatus === 'error'
                        ? 'เชื่อมต่อไม่สำเร็จ'
                        : 'ออฟไลน์ (ในเครื่องนี้)'}
                    </span>
                  </span>
                </div>

                {/* Device sync preview */}
                <div className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-around text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Laptop className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>คอมพิวเตอร์</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>⇄</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20">Realtime</span>
                    <span>⇄</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>โทรศัพท์มือถือ</span>
                  </div>
                </div>
              </div>

              {/* Notification Message */}
              {cloudMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{cloudMsg}</span>
                </div>
              )}

              {/* Test Result Message */}
              {testResult && (
                <div className={`p-3 rounded-xl text-xs border flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              {/* Form Settings */}
              <form onSubmit={handleSaveCloudConfig} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Supabase Project URL
                    </label>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-emerald-600 hover:text-emerald-500 flex items-center gap-1"
                    >
                      <span>เปิด Supabase Dashboard</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="url"
                    value={supabaseUrl}
                    onChange={e => setSupabaseUrl(e.target.value)}
                    placeholder="https://xxxxxxxxxxxx.supabase.co"
                    disabled={config.isFromEnv}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition disabled:opacity-60"
                  />
                  {config.isFromEnv && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      ℹ️ ค่านี้ถูกตั้งค่ามาจาก Render Environment Variables เรียบร้อยแล้ว
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Supabase Public Anon Key
                  </label>
                  <input
                    type="password"
                    value={supabaseAnonKey}
                    onChange={e => setSupabaseAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    disabled={config.isFromEnv}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition disabled:opacity-60 font-mono"
                  />
                </div>

                {/* Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {!config.isFromEnv && (
                    <button
                      type="submit"
                      disabled={testingConnection}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span>💾 บันทึกและเชื่อมต่อ</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleTestCloudConnection}
                    disabled={testingConnection || !supabaseUrl || !supabaseAnonKey}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-medium text-xs border border-slate-300 dark:border-slate-700 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                    <span>{testingConnection ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}</span>
                  </button>

                  {config.isConfigured && onTriggerCloudSync && (
                    <button
                      type="button"
                      onClick={handleManualSyncNow}
                      disabled={isSyncingManual}
                      className="px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 font-medium text-xs hover:bg-teal-100 transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingManual ? 'animate-spin' : ''}`} />
                      <span>{isSyncingManual ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูลเดี๋ยวนี้'}</span>
                    </button>
                  )}

                  {config.isConfigured && !config.isFromEnv && (
                    <button
                      type="button"
                      onClick={handleClearCloud}
                      className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs transition"
                    >
                      ล้างค่าเชื่อมต่อ
                    </button>
                  )}
                </div>
              </form>

              {/* SQL Script Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      คำสั่ง SQL สร้างตารางใน Supabase (ทำครั้งเดียว)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition flex items-center gap-1 shadow-2xs"
                  >
                    {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSql ? 'คัดลอกแล้ว!' : 'คัดลอกคำสั่ง SQL'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  นำคำสั่งนี้ไปวางในเมนู <strong>SQL Editor</strong> บน Supabase แล้วกดปุ่ม <strong>Run</strong> ระบบจะสร้างตารางและเปิดใช้งาน Realtime ให้ทันที
                </p>
              </div>

              {/* Render Environment Setup Tip */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <span>💡 เคล็ดลับให้คอมและมือถือลิ้งค์กันอัตโนมัติ:</span>
                </p>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                  ไปที่ <strong>Render Dashboard</strong> ➡️ คลิกที่เว็บไซต์ของคุณ ➡️ ไปที่แท็บ <strong>Environment</strong> ➡️ เพิ่ม 2 ตัวแปรนี้:
                </p>
                <div className="mt-2 space-y-1 font-mono text-[10px] bg-white dark:bg-slate-900 p-2 rounded-lg border border-amber-200 dark:border-amber-900">
                  <div><strong>VITE_SUPABASE_URL</strong> = <em>(Project URL ของคุณ)</em></div>
                  <div><strong>VITE_SUPABASE_ANON_KEY</strong> = <em>(Anon Key ของคุณ)</em></div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                  เมื่อเพิ่มใน Render แล้ว ทุกอุปกรณ์ที่เปิดเว็บ (ทั้งคอมและโทรศัพท์ของเมย์/เจ) จะเชื่อมต่อเข้าหากันทันที 100% โดยไม่ต้องพิมพ์รหัสในโทรศัพท์เลยครับ!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Backup / Export */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ส่งออกข้อมูลสำรอง (Export JSON)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    ดาวน์โหลดไฟล์ JSON เก็บประวัติเงินออมและเป้าหมายทั้งหมดไว้บนเครื่องของคุณ
                  </p>
                </div>
                <button
                  onClick={() => exportDataAsJSON(settings, goals, transactions, expenses)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition flex items-center gap-1.5 flex-shrink-0 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด</span>
                </button>
              </div>

              {/* Restore / Import */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    นำเข้าข้อมูลสำรอง (Import JSON)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    กู้คืนข้อมูลจากไฟล์สำรอง JSON ที่เคยดาวน์โหลดไว้
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 transition flex items-center gap-1.5 flex-shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>เลือกไฟล์</span>
                </button>
              </div>

              {/* Reset to initial mock data */}
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/20 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    รีเซ็ตเป็นข้อมูลตัวอย่างเริ่มต้น
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    ล้างการเปลี่ยนแปลงทั้งหมด และคืนค่าข้อมูลจำลอง 6 เดือนที่เตรียมไว้ให้
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm('คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้น 6 เดือนหรือไม่?')) {
                      onResetData();
                      onClose();
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30 text-xs font-semibold transition flex-shrink-0"
                >
                  รีเซ็ตข้อมูล
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
