import { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import type {
  ContributorId,
  HouseholdFundType,
  HouseholdSettings,
  MonthlyExpense,
  SavingsGoal,
  Transaction,
  TransactionType,
  ActivePage,
} from './types';
import {
  loadStoredSettings,
  saveStoredSettings,
  loadStoredGoals,
  saveStoredGoals,
  loadStoredTransactions,
  saveStoredTransactions,
  loadStoredExpenses,
  saveStoredExpenses,
  resetAllData,
} from './utils/storage';
import { formatCurrency, getTodayDateString, getCurrentYearMonth } from './utils/formatters';
import { checkAndAutoResetMonthlyExpenses, forceResetToNewMonth } from './utils/expenseHelpers';
import {
  getSupabaseConfig,
  fetchCloudHouseholdData,
  pushCloudHouseholdData,
  subscribeToCloudChanges,
} from './services/supabaseSync';

// Components
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { MonthlyLedgerView } from './components/MonthlyLedgerView';
import { SavingsView } from './components/SavingsView';
import { InvestmentTaxView } from './components/InvestmentTaxView';
import { AddTransactionModal } from './components/AddTransactionModal';
import { GoalModal } from './components/GoalModal';
import { ExpenseModal } from './components/ExpenseModal';
import { SettingsModal } from './components/SettingsModal';
import { LockScreen } from './components/LockScreen';
import { CheckCircle, Heart } from 'lucide-react';

export function App() {
  // State from LocalStorage
  const [settings, setSettings] = useState<HouseholdSettings>(loadStoredSettings);
  const [goals, setGoals] = useState<SavingsGoal[]>(loadStoredGoals);
  const [transactions, setTransactions] = useState<Transaction[]>(loadStoredTransactions);
  const [expenses, setExpenses] = useState<MonthlyExpense[]>(() => {
    const loaded = loadStoredExpenses();
    const { updatedExpenses } = checkAndAutoResetMonthlyExpenses(loaded);
    return updatedExpenses;
  });

  // Lock Screen state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      const stored = sessionStorage.getItem('household_unlocked');
      if (stored === 'true') return true;
      const initialSett = loadStoredSettings();
      if (initialSett.isPasswordProtected === false) return true;
      return false;
    } catch {
      return false;
    }
  });

  const handleLockScreen = () => {
    try {
      sessionStorage.removeItem('household_unlocked');
    } catch {
      // ignore
    }
    setIsUnlocked(false);
    showToast('🔒 ล็อกหน้าจอแล้ว');
  };

  const handleUnlock = () => {
    try {
      sessionStorage.setItem('household_unlocked', 'true');
    } catch {
      // ignore
    }
    setIsUnlocked(true);
  };

  // Active Page Tab (1. Dashboard, 2. Monthly Ledger, 3. Savings, 4. Investment & Tax)
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [initialContributor, setInitialContributor] = useState<ContributorId>('joint');
  const [initialGoalId, setInitialGoalId] = useState<string | undefined>(undefined);
  const [initialFund, setInitialFund] = useState<HouseholdFundType>('operating');
  const [initialType, setInitialType] = useState<TransactionType>('goal_allocation');
  const [initialCategory, setInitialCategory] = useState<string | undefined>(undefined);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<MonthlyExpense | null>(null);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'security' | 'categories' | 'cloud' | 'data'>('profile');
  const [cloudStatus, setCloudStatus] = useState<'connected' | 'syncing' | 'offline' | 'error'>(() => {
    const cfg = getSupabaseConfig();
    return cfg.isConfigured ? 'syncing' : 'offline';
  });
  const isRemoteUpdatingRef = useRef(false);

  // Live Fund Balances
  const currentLongTermBalance = useMemo(() => {
    const longTermTxs = transactions.filter(t => (t.targetFund ?? 'long_term') === 'long_term');
    const deposits = longTermTxs
      .filter(t => t.type === 'deposit' || (!t.type && t.type !== 'withdrawal'))
      .reduce((acc, t) => acc + t.amount, 0);
    const withdrawals = longTermTxs
      .filter(t => t.type === 'withdrawal')
      .reduce((acc, t) => acc + t.amount, 0);
    const allocations = longTermTxs
      .filter(t => t.type === 'goal_allocation')
      .reduce((acc, t) => acc + t.amount, 0);
    return deposits - withdrawals - allocations;
  }, [transactions]);

  const currentOperatingBalance = useMemo(() => {
    const memberA = settings.members.person_a;
    const memberB = settings.members.person_b;
    const monthlyHouseholdIncome = settings.householdMonthlyIncome ??
      ((memberA.monthlyIncome || 40250) + (memberB.monthlyIncome || 22850.90));
    const totalMonthlyExpense = expenses.reduce((acc, e) => {
      if (e.amountType === 'variable' && e.currentMonthAmount !== undefined && e.currentMonthAmount > 0) {
        return acc + e.currentMonthAmount;
      }
      return acc + e.amount;
    }, 0);
    const operatingTxs = transactions.filter(t => t.targetFund === 'operating');
    const deposits = operatingTxs
      .filter(t => t.type === 'deposit' || (!t.type && t.type !== 'withdrawal'))
      .reduce((acc, t) => acc + t.amount, 0);
    const withdrawals = operatingTxs
      .filter(t => t.type === 'withdrawal')
      .reduce((acc, t) => acc + t.amount, 0);
    const allocations = operatingTxs
      .filter(t => t.type === 'goal_allocation')
      .reduce((acc, t) => acc + t.amount, 0);
    return (monthlyHouseholdIncome - totalMonthlyExpense) + (deposits - withdrawals - allocations);
  }, [transactions, settings, expenses]);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Sync to LocalStorage on changes
  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveStoredGoals(goals);
  }, [goals]);

  useEffect(() => {
    saveStoredTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    saveStoredExpenses(expenses);
  }, [expenses]);

  const currentDataRef = useRef({ settings, goals, transactions, expenses });
  const lastCloudUpdatedAtRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    currentDataRef.current = { settings, goals, transactions, expenses };
  }, [settings, goals, transactions, expenses]);

  // 1. Cloud Sync on Mount & Realtime Subscription + Mobile Wake-Up Polling
  useEffect(() => {
    const config = getSupabaseConfig();
    if (!config.isConfigured) {
      return;
    }

    let isMounted = true;

    const syncFromCloud = async (isBackgroundPoll = false) => {
      try {
        const cloudData = await fetchCloudHouseholdData();
        if (!isMounted) return;

        if (cloudData) {
          // Only update if it's the initial load or cloud has a newer timestamp
          if (!lastCloudUpdatedAtRef.current || (cloudData.updated_at && cloudData.updated_at !== lastCloudUpdatedAtRef.current)) {
            isRemoteUpdatingRef.current = true;
            lastCloudUpdatedAtRef.current = cloudData.updated_at;
            setSettings(cloudData.settings);
            setGoals(cloudData.goals);
            setTransactions(cloudData.transactions);
            if (cloudData.expenses) setExpenses(cloudData.expenses);
            setCloudStatus('connected');
            if (isBackgroundPoll) {
              showToast('🔄 ข้อมูลอัปเดตตรงกับอีกอุปกรณ์แล้ว');
            }
            setTimeout(() => {
              isRemoteUpdatingRef.current = false;
            }, 400);
          }
        } else if (!isBackgroundPoll) {
          // Table has no record yet -> initialize with local state
          const nowIso = new Date().toISOString();
          lastCloudUpdatedAtRef.current = nowIso;
          pushCloudHouseholdData({
            ...currentDataRef.current,
            updated_at: nowIso,
          }).then(ok => {
            if (isMounted) setCloudStatus(ok ? 'connected' : 'error');
          });
        }
      } catch (err) {
        console.error('Cloud sync error:', err);
        if (isMounted && !isBackgroundPoll) setCloudStatus('error');
      }
    };

    // Initial fetch on mount
    syncFromCloud(false);

    // Subscribe to Realtime postgres changes
    const unsubscribe = subscribeToCloudChanges(
      newData => {
        if (!isMounted) return;
        isRemoteUpdatingRef.current = true;
        lastCloudUpdatedAtRef.current = newData.updated_at;
        setSettings(newData.settings);
        setGoals(newData.goals);
        setTransactions(newData.transactions);
        if (newData.expenses) setExpenses(newData.expenses);
        setCloudStatus('connected');
        showToast('🔄 ข้อมูลอัปเดตสดจากอีกอุปกรณ์แล้ว');
        setTimeout(() => {
          isRemoteUpdatingRef.current = false;
        }, 500);
      },
      status => {
        if (isMounted) setCloudStatus(status);
      }
    );

    // Mobile Phone Wake-up: when user unlocks screen or switches back to browser tab
    const handleWakeUp = () => {
      if (document.visibilityState === 'visible') {
        syncFromCloud(true);
      }
    };

    window.addEventListener('focus', handleWakeUp);
    document.addEventListener('visibilitychange', handleWakeUp);

    // Bulletproof Polling Fallback (every 4 seconds for active screen)
    // Ensures real-time sync even if mobile network or carrier drops WebSocket
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncFromCloud(true);
      }
    }, 4000);

    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener('focus', handleWakeUp);
      document.removeEventListener('visibilitychange', handleWakeUp);
      clearInterval(pollInterval);
    };
  }, []);

  // 2. Debounced push to Cloud on local mutations
  useEffect(() => {
    if (isRemoteUpdatingRef.current) return;
    const config = getSupabaseConfig();
    if (!config.isConfigured) return;

    const timer = setTimeout(async () => {
      setCloudStatus('syncing');
      const nowIso = new Date().toISOString();
      lastCloudUpdatedAtRef.current = nowIso;
      const ok = await pushCloudHouseholdData({
        settings,
        goals,
        transactions,
        expenses,
        updated_at: nowIso,
      });
      setCloudStatus(ok ? 'connected' : 'error');
    }, 500);

    return () => clearTimeout(timer);
  }, [settings, goals, transactions, expenses]);

  // 3. Manual Sync Handler
  const handleTriggerCloudSync = async () => {
    const config = getSupabaseConfig();
    if (!config.isConfigured) {
      showToast('⚠️ กรุณาระบุ Supabase URL และ Key ก่อนซิงค์');
      return;
    }
    setCloudStatus('syncing');
    try {
      const cloudData = await fetchCloudHouseholdData();
      if (cloudData) {
        isRemoteUpdatingRef.current = true;
        lastCloudUpdatedAtRef.current = cloudData.updated_at;
        setSettings(cloudData.settings);
        setGoals(cloudData.goals);
        setTransactions(cloudData.transactions);
        if (cloudData.expenses) setExpenses(cloudData.expenses);
        setCloudStatus('connected');
        showToast('✅ ดึงข้อมูลล่าสุดจาก Cloud เรียบร้อยแล้ว');
        setTimeout(() => {
          isRemoteUpdatingRef.current = false;
        }, 400);
      } else {
        const nowIso = new Date().toISOString();
        lastCloudUpdatedAtRef.current = nowIso;
        const ok = await pushCloudHouseholdData({
          settings,
          goals,
          transactions,
          expenses,
          updated_at: nowIso,
        });
        setCloudStatus(ok ? 'connected' : 'error');
        showToast(ok ? '✅ อัปโหลดข้อมูลขึ้น Cloud สำเร็จ' : '❌ ไม่สามารถอัปโหลดได้');
      }
    } catch {
      setCloudStatus('error');
      showToast('❌ การซิงค์ขัดข้อง ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
    }
  };

  // Trigger celebratory confetti
  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#6366F1', '#38BDF8', '#F59E0B'],
      });
    } catch {
      // ignore
    }
  };

  // Helper to get contributor name safely (supporting 'joint')
  const getContributorDisplayName = (id: ContributorId) => {
    if (id === 'joint') return 'กองกลาง (รวมกันทั้งคู่)';
    return settings.members[id]?.nickname || 'สมาชิก';
  };

  // 1. Add or Update Transaction
  const handleSaveTransaction = (txData: {
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
  }) => {
    const memberName = getContributorDisplayName(txData.contributorId);
    const fundName = txData.targetFund === 'operating' ? 'กองหมุนเวียน' : 'กองระยะยาว';
    const isWithdrawal = txData.type === 'withdrawal';

    if (txData.id) {
      // Update existing
      setTransactions(prev =>
        prev.map(t => (t.id === txData.id ? { ...t, ...txData } : t))
      );
      showToast(`อัปเดตรายการ${isWithdrawal ? 'ถอนเงิน' : 'เงินออม'}ของ ${memberName} สำเร็จ`);
    } else {
      // Create new
      const newTx: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        ...txData,
        createdAt: new Date().toISOString(),
      };
      setTransactions(prev => [newTx, ...prev]);

      // Check if goal was completed by this transaction (if deposit)
      if (!isWithdrawal && txData.goalId) {
        const goal = goals.find(g => g.id === txData.goalId);
        if (goal) {
          const currentTotal = transactions
            .filter(t => t.goalId === goal.id && t.type !== 'withdrawal')
            .reduce((acc, t) => acc + t.amount, 0) + txData.amount;
          if (currentTotal >= goal.targetAmount) {
            triggerCelebration();
            showToast(`🎉 ยินดีด้วย! คุณและคู่รักพิชิตเป้าหมาย "${goal.title}" สำเร็จแล้ว!`);
            return;
          }
        }
      }

      if (txData.type === 'goal_allocation') {
        const goal = goals.find(g => g.id === txData.goalId);
        triggerCelebration();
        showToast(`🎯 ดึงเงิน ${formatCurrency(txData.amount)} จาก${fundName} เข้าเป้าหมาย "${goal?.title || 'เป้าหมาย'}" (${memberName}) สำเร็จ!`);
      } else if (isWithdrawal) {
        showToast(`💸 ถอนเงิน ${formatCurrency(txData.amount)} จาก${fundName} (${memberName}) สำเร็จ`);
      } else {
        triggerCelebration();
        showToast(`🪙 บันทึกเงินออม ${formatCurrency(txData.amount)} เข้า${fundName} (${memberName}) เรียบร้อย`);
      }
    }
  };

  // 2. Quick Add Shortcut
  const handleQuickAdd = (
    contributorId: ContributorId,
    amount: number,
    note: string,
    targetFund: HouseholdFundType = 'operating'
  ) => {
    const memberName = getContributorDisplayName(contributorId);
    const defaultGoal = goals.length > 0 ? goals[0] : undefined;
    const fundName = targetFund === 'operating' ? 'กองหมุนเวียน' : 'กองระยะยาว';

    const newTx: Transaction = {
      id: `tx-quick-${Date.now()}`,
      date: getTodayDateString(),
      amount,
      type: 'deposit',
      targetFund,
      contributorId,
      goalId: targetFund === 'long_term' ? defaultGoal?.id : undefined,
      category: targetFund === 'long_term' ? (defaultGoal?.category || 'ทั่วไป') : 'หมุนเวียนรายเดือน',
      note: `${note} (${memberName})`,
      createdAt: new Date().toISOString(),
    };

    setTransactions(prev => [newTx, ...prev]);
    triggerCelebration();
    showToast(`⚡ Quick Add: ${memberName} หยอดเงินเข้า${fundName} ${formatCurrency(amount)} เรียบร้อย!`);
  };

  // 2.1 Quick Withdrawal
  const handleQuickWithdraw = (
    contributorId: ContributorId,
    amount: number,
    reason: string,
    targetFund: HouseholdFundType = 'operating'
  ) => {
    const memberName = getContributorDisplayName(contributorId);
    const fundName = targetFund === 'operating' ? 'กองหมุนเวียน' : 'กองระยะยาว';

    const newTx: Transaction = {
      id: `tx-withdraw-${Date.now()}`,
      date: getTodayDateString(),
      amount,
      contributorId,
      category: 'ถอนเงิน',
      type: 'withdrawal',
      targetFund,
      withdrawalReason: reason,
      note: `ถอนเงิน: ${reason} (${memberName})`,
      createdAt: new Date().toISOString(),
    };

    setTransactions(prev => [newTx, ...prev]);
    showToast(`💸 ถอนเงิน ${formatCurrency(amount)} จาก${fundName} สำเร็จ (${reason}) โดย ${memberName}`);
  };

  // 3. Delete Transaction
  const handleDeleteTransaction = (id: string) => {
    if (confirm('ต้องการลบรายการเงินออมนี้หรือไม่?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      showToast('ลบรายการเรียบร้อย');
    }
  };

  // 4. Save Goal
  const handleSaveGoal = (goalData: SavingsGoal) => {
    setGoals(prev => {
      const exists = prev.some(g => g.id === goalData.id);
      if (exists) {
        return prev.map(g => (g.id === goalData.id ? goalData : g));
      }
      return [...prev, goalData];
    });
    showToast(`บันทึกเป้าหมาย "${goalData.title}" เรียบร้อย`);
  };

  // 5. Delete Goal
  const handleDeleteGoal = (goalId: string) => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
    showToast('ลบเป้าหมายเรียบร้อย');
  };

  // 6. Save Expense
  const handleSaveExpense = (expenseData: MonthlyExpense) => {
    setExpenses(prev => {
      const exists = prev.some(e => e.id === expenseData.id);
      if (exists) {
        return prev.map(e => (e.id === expenseData.id ? expenseData : e));
      }
      return [...prev, expenseData];
    });
    showToast(`บันทึกค่าใช้จ่าย "${expenseData.title}" เรียบร้อย`);
  };

  // 7. Delete Expense
  const handleDeleteExpense = (expenseId: string) => {
    setExpenses(prev => prev.filter(e => e.id !== expenseId));
    showToast('ลบรายการค่าใช้จ่ายเรียบร้อย');
  };

  // Periodic background check: auto-reset expenses if today has reached/passed their due date in a new month cycle
  useEffect(() => {
    const runCheck = () => {
      setExpenses(prev => {
        const { updatedExpenses, resetCount, hasChanges } = checkAndAutoResetMonthlyExpenses(prev);
        if (hasChanges) {
          showToast(`📅 ถึงวันกำหนดชำระแล้ว ระบบรีเซ็ตสถานะเป็นรอบเดือนใหม่ ${resetCount} รายการ`);
          return updatedExpenses;
        }
        return prev;
      });
    };

    window.addEventListener('focus', runCheck);
    const interval = setInterval(runCheck, 60000 * 30);
    return () => {
      window.removeEventListener('focus', runCheck);
      clearInterval(interval);
    };
  }, []);

  // 8. Toggle Expense Paid
  const handleToggleExpensePaid = (expenseId: string) => {
    const currentMonthKey = getCurrentYearMonth();
    setExpenses(prev =>
      prev.map(e => {
        if (e.id === expenseId) {
          const nextState = !e.isPaidThisMonth;
          showToast(
            nextState
              ? `ทำเครื่องหมาย "${e.title}" ว่าชำระแล้วในรอบเดือนนี้ ✅`
              : `ทำเครื่องหมาย "${e.title}" ว่ายังไม่ชำระ ⏳`
          );
          return {
            ...e,
            isPaidThisMonth: nextState,
            lastPaidMonth: nextState ? currentMonthKey : undefined,
          };
        }
        return e;
      })
    );
  };

  // 8.1 Update Expense Bill (for variable recurring expenses e.g. electricity, water)
  const handleUpdateExpenseBill = (
    expenseId: string,
    actualAmount: number,
    markAsPaid?: boolean,
    targetMonthKey?: string
  ) => {
    const currentMonthKey = getCurrentYearMonth();
    const mKey = targetMonthKey || currentMonthKey;
    const isCurrent = mKey === currentMonthKey;

    setExpenses(prev =>
      prev.map(e => {
        if (e.id === expenseId) {
          const updatedBills = {
            ...(e.monthlyBills || {}),
            [mKey]: actualAmount,
          };
          const nextPaidState =
            isCurrent && markAsPaid !== undefined ? markAsPaid : e.isPaidThisMonth;

          if (markAsPaid) {
            showToast(`บันทึกบิล "${e.title}" ยอด ${formatCurrency(actualAmount)} และชำระเรียบร้อยแล้ว ✅`);
          } else {
            showToast(`อัปเดตยอด "${e.title}" รอบ ${mKey} เป็น ${formatCurrency(actualAmount)} เรียบร้อย ⚡`);
          }

          return {
            ...e,
            currentMonthAmount: isCurrent ? actualAmount : e.currentMonthAmount,
            monthlyBills: updatedBills,
            isPaidThisMonth: nextPaidState,
            lastPaidMonth: nextPaidState ? mKey : e.lastPaidMonth,
          };
        }
        return e;
      })
    );
  };

  // 8.1.1 Batch update expenses for a specific month
  const handleUpdateMonthExpenses = (
    monthKey: string,
    billsMap: Record<string, number>,
    estimatedAmount?: number,
    adhocAmount?: number
  ) => {
    const currentMonthKey = getCurrentYearMonth();
    const isCurrent = monthKey === currentMonthKey;

    setExpenses(prev =>
      prev.map(e => {
        if (billsMap[e.id] !== undefined) {
          const val = billsMap[e.id];
          const updatedBills = {
            ...(e.monthlyBills || {}),
            [monthKey]: val,
          };
          return {
            ...e,
            currentMonthAmount: isCurrent ? val : e.currentMonthAmount,
            monthlyBills: updatedBills,
          };
        }
        return e;
      })
    );

    if (estimatedAmount !== undefined || adhocAmount !== undefined) {
      setSettings(prev => ({
        ...prev,
        monthlyExpenseOverrides: {
          ...(prev.monthlyExpenseOverrides || {}),
          [monthKey]: {
            ...(prev.monthlyExpenseOverrides?.[monthKey] || {}),
            ...(estimatedAmount !== undefined ? { estimated: estimatedAmount } : {}),
            ...(adhocAmount !== undefined ? { adhoc: adhocAmount } : {}),
          },
        },
      }));
    }

    showToast(`บันทึกรายจ่ายรอบเดือน ${monthKey} เรียบร้อยแล้ว ✅`);
  };

  // 8.1.2 Update Household Title and Subtitle directly
  const handleUpdateHouseholdTitle = (name: string, subtitle?: string) => {
    setSettings(prev => ({
      ...prev,
      householdName: name,
      ...(subtitle !== undefined ? { householdSubtitle: subtitle } : {}),
    }));
    showToast('บันทึกชื่อบ้านเรียบร้อยแล้ว 🏡');
  };

  // 8.2 Force reset/clear all expenses for a new monthly cycle
  const handleForceResetMonthlyExpenses = () => {
    setExpenses(prev => forceResetToNewMonth(prev));
    showToast('🔄 เคลียร์สถานะค่าใช้จ่ายทั้งหมดเป็นรอบเดือนใหม่เรียบร้อยแล้ว');
  };

  // 8.3 Update Expense Estimated Amount (ยอดประมาณการประจำเดือน)
  const handleUpdateExpenseEstimatedAmount = (expenseId: string, newEstimatedAmount: number) => {
    setExpenses(prev =>
      prev.map(e => {
        if (e.id === expenseId) {
          return {
            ...e,
            estimatedAmount: newEstimatedAmount,
            amount: e.amountType === 'fixed' ? newEstimatedAmount : e.amount,
          };
        }
        return e;
      })
    );
    showToast('บันทึกยอดประมาณการประจำเดือนเรียบร้อยแล้ว 📊');
  };

  // 8.4 Update Monthly Income for a specific month (ตารางรายรับรายเดือน)
  const handleUpdateMonthlyIncome = (
    monthKey: string,
    data: { person_a?: number; person_b?: number; other?: number; balance?: number; note?: string }
  ) => {
    setSettings(prev => ({
      ...prev,
      monthlyIncomes: {
        ...(prev.monthlyIncomes || {}),
        [monthKey]: {
          ...(prev.monthlyIncomes?.[monthKey] || {}),
          ...data,
        },
      },
    }));
    showToast(`บันทึกข้อมูลรายรับประจำเดือน ${monthKey} เรียบร้อย 💼`);
  };

  // 9. Add dynamic custom category
  const handleAddCustomCategory = (newCat: string) => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    setSettings(prev => {
      const existing = prev.customExpenseCategories || [];
      if (existing.includes(trimmed)) return prev;
      return {
        ...prev,
        customExpenseCategories: [...existing, trimmed],
      };
    });
    showToast(`เพิ่มหมวดหมู่ใหม่ "${trimmed}" เรียบร้อยแล้ว ✨`);
  };

  // 10. Toggle Theme (Light/Soft Green vs Dark)
  const handleToggleTheme = () => {
    setSettings(prev => {
      const nextTheme = (prev.theme ?? 'light') === 'dark' ? 'light' : 'dark';
      showToast(
        nextTheme === 'light'
          ? '🌿 สลับเป็นธีมเขียวอ่อน สบายตา'
          : '🌙 สลับเป็นโหมดมืด (Dark Mode)'
      );
      return {
        ...prev,
        theme: nextTheme,
      };
    });
  };

  // 11. Update Quick Add Presets
  const handleUpdatePresets = (newPresets: number[]) => {
    setSettings(prev => ({
      ...prev,
      quickAddPresets: newPresets,
    }));
    showToast('บันทึกตัวเลขปุ่มลัด Quick Add เรียบร้อยแล้ว ⚡');
  };

  // Sync dark class on html document root
  useEffect(() => {
    const isDark = settings.theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // 11. Reset All Data
  const handleResetData = () => {
    const restored = resetAllData();
    setSettings(restored.settings);
    setGoals(restored.goals);
    setTransactions(restored.transactions);
    setExpenses(restored.expenses);
    showToast('รีเซ็ตข้อมูลเป็นชุดตัวอย่าง 6 เดือนเรียบร้อยแล้ว');
  };

  // 12. Import Data
  const handleImportData = (data: {
    settings: HouseholdSettings;
    goals: SavingsGoal[];
    transactions: Transaction[];
    expenses?: MonthlyExpense[];
  }) => {
    setSettings(data.settings);
    setGoals(data.goals);
    setTransactions(data.transactions);
    if (data.expenses) {
      setExpenses(data.expenses);
    }
    showToast('นำเข้าข้อมูลสำเร็จแล้ว');
  };

  const isLight = (settings.theme ?? 'light') === 'light';

  // Render Lock Screen if protected and locked
  if (!isUnlocked && settings.isPasswordProtected !== false) {
    return (
      <LockScreen
        correctPassword={settings.password || '1234'}
        householdName={settings.householdName}
        onUnlock={handleUnlock}
      />
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col selection:bg-emerald-500 selection:text-white transition-colors duration-200 ${
        isLight ? 'bg-[#F0F5F2] text-slate-800' : 'dark bg-[#0B0F19] text-slate-100'
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-white/95 dark:bg-slate-900/95 border border-emerald-500/40 text-slate-900 dark:text-slate-100 px-4 py-3 rounded-2xl shadow-xl dark:shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Navigation Bar */}
      <Navbar
        settings={settings}
        activePage={activePage}
        onSelectPage={setActivePage}
        onOpenAddModal={() => {
          setEditingTransaction(null);
          setInitialContributor('joint');
          setInitialGoalId(undefined);
          setInitialFund('operating');
          setInitialCategory(undefined);
          setIsAddModalOpen(true);
        }}
        onOpenSettingsModal={() => {
          setSettingsTab('profile');
          setIsSettingsModalOpen(true);
        }}
        onOpenCloudModal={() => {
          setSettingsTab('cloud');
          setIsSettingsModalOpen(true);
        }}
        cloudStatus={cloudStatus}
        onToggleTheme={handleToggleTheme}
        onLockScreen={handleLockScreen}
        onUpdateHouseholdTitle={handleUpdateHouseholdTitle}
      />

      {/* Main Content: 4 Pages */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7 pb-24 sm:pb-8">
        
        {/* 1. หน้า Dashboard สรุปภาพรวม & กราฟแนวโน้ม 5 ตัว */}
        {activePage === 'dashboard' && (
          <DashboardView
            settings={settings}
            expenses={expenses}
            transactions={transactions}
            onNavigateToTab={setActivePage}
          />
        )}

        {/* 2. หน้าลงรายละเอียดรายเดือน เป็นตารางรายรับ-รายจ่าย */}
        {activePage === 'monthly_ledger' && (
          <MonthlyLedgerView
            settings={settings}
            expenses={expenses}
            transactions={transactions}
            onOpenExpenseModal={exp => {
              setEditingExpense(exp || null);
              setIsExpenseModalOpen(true);
            }}
            onOpenAddTransactionModal={(type, cat) => {
              setEditingTransaction(null);
              setInitialType(type || 'deposit');
              setInitialContributor('joint');
              setInitialCategory(cat || 'รายได้พิเศษ');
              setIsAddModalOpen(true);
            }}
            onToggleExpensePaid={handleToggleExpensePaid}
            onUpdateExpenseBill={handleUpdateExpenseBill}
            onUpdateMonthExpenses={handleUpdateMonthExpenses}
            onUpdateExpenseEstimatedAmount={handleUpdateExpenseEstimatedAmount}
            onUpdateMonthlyIncome={handleUpdateMonthlyIncome}
            onDeleteExpense={handleDeleteExpense}
            onEditTransaction={tx => {
              setEditingTransaction(tx);
              setIsAddModalOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
            onForceResetNewMonth={handleForceResetMonthlyExpenses}
          />
        )}

        {/* 3. หน้าเงินออม & เป้าหมายครอบครัว */}
        {activePage === 'savings' && (
          <SavingsView
            settings={settings}
            goals={goals}
            transactions={transactions}
            onQuickAdd={handleQuickAdd}
            onQuickWithdraw={handleQuickWithdraw}
            onOpenCustomAdd={(contributorId, fund, type) => {
              setEditingTransaction(null);
              setInitialType(type || 'deposit');
              setInitialContributor(contributorId || 'joint');
              setInitialGoalId(undefined);
              setInitialFund(fund || 'operating');
              setInitialCategory(undefined);
              setIsAddModalOpen(true);
            }}
            onUpdatePresets={handleUpdatePresets}
            onOpenGoalModal={goal => {
              setEditingGoal(goal || null);
              setIsGoalModalOpen(true);
            }}
            onDeleteGoal={handleDeleteGoal}
            onOpenDepositForGoal={goalId => {
              setEditingTransaction(null);
              setInitialType('goal_allocation');
              setInitialContributor('joint');
              setInitialGoalId(goalId);
              setIsAddModalOpen(true);
            }}
            onEditTransaction={tx => {
              setEditingTransaction(tx);
              setIsAddModalOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {/* 4. หน้าแผนลงทุนและภาษี */}
        {activePage === 'investment_tax' && (
          <InvestmentTaxView
            settings={settings}
            onUpdateSettings={setSettings}
            onShowToast={showToast}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-emerald-900/10 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/40 py-6 text-xs text-slate-600 dark:text-slate-500 text-center transition-colors pb-24 sm:pb-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-700 dark:text-slate-300">Household Savings & Financial Planner</span>
            <span>•</span>
            <span className="text-slate-500 dark:text-slate-400">ระบบบริหารการเงินและภาษีครอบครัว 4 หน้าสำหรับ 2 คน</span>
          </div>
          <div className="flex items-center gap-1">
            <span>สร้างขึ้นด้วยความรัก</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 inline fill-rose-500" />
            <span>เพื่อเป้าหมายครอบครัวที่มั่นคงและอบอุ่น</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTransaction(null);
          setInitialCategory(undefined);
        }}
        onSave={handleSaveTransaction}
        editingTransaction={editingTransaction}
        initialContributor={initialContributor}
        initialGoalId={initialGoalId}
        initialFund={initialFund}
        initialType={initialType}
        initialCategory={initialCategory}
        longTermBalance={currentLongTermBalance}
        operatingBalance={currentOperatingBalance}
        goals={goals}
        settings={settings}
      />

      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingGoal(null);
        }}
        onSave={handleSaveGoal}
        onDelete={handleDeleteGoal}
        editingGoal={editingGoal}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        onDelete={handleDeleteExpense}
        editingExpense={editingExpense}
        settings={settings}
        categories={
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
        }
        onAddCustomCategory={handleAddCustomCategory}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        goals={goals}
        transactions={transactions}
        expenses={expenses}
        onSaveSettings={setSettings}
        onImportData={handleImportData}
        onResetData={handleResetData}
        initialTab={settingsTab}
        cloudStatus={cloudStatus}
        onTriggerCloudSync={handleTriggerCloudSync}
        onConfigSaved={() => {
          const cfg = getSupabaseConfig();
          setCloudStatus(cfg.isConfigured ? 'connected' : 'offline');
        }}
      />

    </div>
  );
}

export default App;
