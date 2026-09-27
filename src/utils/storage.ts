import type { HouseholdSettings, MonthlyExpense, SavingsGoal, Transaction } from '../types';
import { initialExpenses, initialGoals, initialSettings, initialTransactions } from '../data/mockData';

const SETTINGS_KEY = 'household_savings_settings_v8';
const GOALS_KEY = 'household_savings_goals_v8';
const TRANSACTIONS_KEY = 'household_savings_transactions_v8';
const EXPENSES_KEY = 'household_savings_expenses_v8';

/**
 * Safe fallback reader:
 * First checks v8; if not found, checks older versions (v7, v6, etc.) and migrates data forward
 * to guarantee that previously saved user data is NEVER lost or deleted.
 */
const getWithFallback = (baseKey: string): string | null => {
  try {
    const current = localStorage.getItem(`${baseKey}_v8`);
    if (current) return current;

    // Check previous versions in descending order
    for (const ver of ['v7', 'v6', 'v5', 'v4', 'v3', 'v2', 'v1']) {
      const prev = localStorage.getItem(`${baseKey}_${ver}`);
      if (prev) {
        // Automatically migrate forward to v8 so user data is preserved
        localStorage.setItem(`${baseKey}_v8`, prev);
        return prev;
      }
    }
  } catch (err) {
    console.error('Failed reading storage key with fallback', err);
  }
  return null;
};

export const loadStoredSettings = (): HouseholdSettings => {
  try {
    const saved = getWithFallback('household_savings_settings');
    if (saved) return JSON.parse(saved);
  } catch (err) {
    console.error('Failed to load settings from storage', err);
  }
  return initialSettings;
};

export const saveStoredSettings = (settings: HouseholdSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings', err);
  }
};

export const loadStoredGoals = (): SavingsGoal[] => {
  try {
    const saved = getWithFallback('household_savings_goals');
    if (saved) return JSON.parse(saved);
  } catch (err) {
    console.error('Failed to load goals from storage', err);
  }
  return initialGoals;
};

export const saveStoredGoals = (goals: SavingsGoal[]): void => {
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  } catch (err) {
    console.error('Failed to save goals', err);
  }
};

export const loadStoredTransactions = (): Transaction[] => {
  try {
    const saved = getWithFallback('household_savings_transactions');
    if (saved) return JSON.parse(saved);
  } catch (err) {
    console.error('Failed to load transactions from storage', err);
  }
  return initialTransactions;
};

export const saveStoredTransactions = (transactions: Transaction[]): void => {
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (err) {
    console.error('Failed to save transactions', err);
  }
};

export const loadStoredExpenses = (): MonthlyExpense[] => {
  try {
    const saved = getWithFallback('household_savings_expenses');
    if (saved) return JSON.parse(saved);
  } catch (err) {
    console.error('Failed to load expenses from storage', err);
  }
  return initialExpenses;
};

export const saveStoredExpenses = (expenses: MonthlyExpense[]): void => {
  try {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
  } catch (err) {
    console.error('Failed to save expenses', err);
  }
};

export const resetAllData = (): {
  settings: HouseholdSettings;
  goals: SavingsGoal[];
  transactions: Transaction[];
  expenses: MonthlyExpense[];
} => {
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(GOALS_KEY);
  localStorage.removeItem(TRANSACTIONS_KEY);
  localStorage.removeItem(EXPENSES_KEY);
  return {
    settings: initialSettings,
    goals: initialGoals,
    transactions: initialTransactions,
    expenses: initialExpenses,
  };
};

export const exportDataAsJSON = (
  settings: HouseholdSettings,
  goals: SavingsGoal[],
  transactions: Transaction[],
  expenses?: MonthlyExpense[]
): void => {
  const data = {
    version: '1.1.0',
    exportDate: new Date().toISOString(),
    settings,
    goals,
    transactions,
    expenses: expenses || [],
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `household-savings-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
