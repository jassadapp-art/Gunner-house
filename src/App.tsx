import { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import type { ContributorId, HouseholdFundType, HouseholdSettings, MonthlyExpense, SavingsGoal, Transaction, TransactionType } from './types';
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
import { formatCurrency, getTodayDateString } from './utils/formatters';

// Components
import { Navbar } from './components/Navbar';
import { OverviewCards } from './components/OverviewCards';
import { QuickAddBar } from './components/QuickAddBar';
import { AnalyticsSection } from './components/AnalyticsSection';
import { GoalsList } from './components/GoalsList';
import { ExpensesSection } from './components/ExpensesSection';
import { TransactionHistory } from './components/TransactionHistory';
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
  const [expenses, setExpenses] = useState<MonthlyExpense[]>(loadStoredExpenses);

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

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [initialContributor, setInitialContributor] = useState<ContributorId>('person_a');
  const [initialGoalId, setInitialGoalId] = useState<string | undefined>(undefined);
  const [initialFund, setInitialFund] = useState<HouseholdFundType>('long_term');
  const [initialType, setInitialType] = useState<TransactionType>('goal_allocation');

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<MonthlyExpense | null>(null);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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
    targetFund: HouseholdFundType = 'long_term'
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
    targetFund: HouseholdFundType = 'long_term'
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

  // 8. Toggle Expense Paid
  const handleToggleExpensePaid = (expenseId: string) => {
    setExpenses(prev =>
      prev.map(e => {
        if (e.id === expenseId) {
          const nextState = !e.isPaidThisMonth;
          showToast(
            nextState
              ? `ทำเครื่องหมาย "${e.title}" ว่าชำระแล้วในรอบเดือนนี้ ✅`
              : `ทำเครื่องหมาย "${e.title}" ว่ายังไม่ชำระ ⏳`
          );
          return { ...e, isPaidThisMonth: nextState };
        }
        return e;
      })
    );
  };

  // 8.1 Update Expense Bill (for variable recurring expenses e.g. electricity, water)
  const handleUpdateExpenseBill = (expenseId: string, actualAmount: number, markAsPaid?: boolean) => {
    setExpenses(prev =>
      prev.map(e => {
        if (e.id === expenseId) {
          const now = new Date();
          const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const updatedBills = {
            ...(e.monthlyBills || {}),
            [currentMonthKey]: actualAmount,
          };
          const nextPaidState = markAsPaid !== undefined ? markAsPaid : e.isPaidThisMonth;

          if (markAsPaid) {
            showToast(`บันทึกบิล "${e.title}" ยอด ${formatCurrency(actualAmount)} และชำระเรียบร้อยแล้ว ✅`);
          } else {
            showToast(`อัปเดตยอดบิลรอบเดือนนี้ของ "${e.title}" เป็น ${formatCurrency(actualAmount)} เรียบร้อย ⚡`);
          }

          return {
            ...e,
            currentMonthAmount: actualAmount,
            monthlyBills: updatedBills,
            isPaidThisMonth: nextPaidState,
          };
        }
        return e;
      })
    );
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
        onOpenAddModal={() => {
          setEditingTransaction(null);
          setInitialContributor('person_a');
          setInitialGoalId(undefined);
          setIsAddModalOpen(true);
        }}
        onOpenGoalModal={() => {
          setEditingGoal(null);
          setIsGoalModalOpen(true);
        }}
        onOpenExpenseModal={() => {
          setEditingExpense(null);
          setIsExpenseModalOpen(true);
        }}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onResetData={handleResetData}
        onToggleTheme={handleToggleTheme}
        onLockScreen={handleLockScreen}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        
        {/* Quick Add Bar */}
        <QuickAddBar
          settings={settings}
          onQuickAdd={handleQuickAdd}
          onQuickWithdraw={handleQuickWithdraw}
          onOpenCustomAdd={(contributorId, fund) => {
            setEditingTransaction(null);
            setInitialType('deposit');
            setInitialContributor(contributorId || 'person_a');
            setInitialGoalId(undefined);
            setInitialFund(fund || 'long_term');
            setIsAddModalOpen(true);
          }}
          onUpdatePresets={handleUpdatePresets}
        />

        {/* 1. Overview KPI Cards */}
        <OverviewCards
          transactions={transactions}
          goals={goals}
          settings={settings}
          expenses={expenses}
        />

        {/* 2. Charts & Analytics Section */}
        <AnalyticsSection
          transactions={transactions}
          settings={settings}
        />

        {/* 3. Monthly Recurring Expenses (New Feature) */}
        <ExpensesSection
          expenses={expenses}
          settings={settings}
          onOpenExpenseModal={exp => {
            setEditingExpense(exp || null);
            setIsExpenseModalOpen(true);
          }}
          onDeleteExpense={handleDeleteExpense}
          onToggleExpensePaid={handleToggleExpensePaid}
          onUpdateExpenseBill={handleUpdateExpenseBill}
        />

        {/* 4. Shared Goals & Milestones */}
        <GoalsList
          goals={goals}
          transactions={transactions}
          onOpenGoalModal={goal => {
            setEditingGoal(goal || null);
            setIsGoalModalOpen(true);
          }}
          onOpenDepositForGoal={goalId => {
            setEditingTransaction(null);
            setInitialType('goal_allocation');
            setInitialGoalId(goalId);
            setIsAddModalOpen(true);
          }}
        />

        {/* 5. Transaction History Table */}
        <TransactionHistory
          transactions={transactions}
          goals={goals}
          settings={settings}
          onEditTransaction={tx => {
            setEditingTransaction(tx);
            setIsAddModalOpen(true);
          }}
          onDeleteTransaction={handleDeleteTransaction}
        />

      </main>

      {/* Footer */}
      <footer className="border-t border-emerald-900/10 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/40 py-6 mt-12 text-xs text-slate-600 dark:text-slate-500 text-center transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-700 dark:text-slate-300">Household Savings Tracker</span>
            <span>•</span>
            <span className="text-slate-500 dark:text-slate-400">ระบบติดตามเงินออมและค่าใช้จ่ายกองกลางครัวเรือนสำหรับ 2 คน</span>
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
        }}
        onSave={handleSaveTransaction}
        editingTransaction={editingTransaction}
        initialContributor={initialContributor}
        initialGoalId={initialGoalId}
        initialFund={initialFund}
        initialType={initialType}
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
      />

    </div>
  );
}

export default App;
