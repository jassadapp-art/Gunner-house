import type { HouseholdSettings, MonthlyExpense, SavingsGoal, Transaction } from '../types';
import { initialExpenses, initialGoals, initialSettings, initialTransactions } from '../data/mockData';

const SETTINGS_KEY = 'household_savings_settings_v7';
const GOALS_KEY = 'household_savings_goals_v7';
const TRANSACTIONS_KEY = 'household_savings_transactions_v7';
const EXPENSES_KEY = 'household_savings_expenses_v7';

// Ensure browser automatically loads the updated dataset
(() => {
  try {
    ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'].forEach(ver => {
      localStorage.removeItem(`household_savings_settings_${ver}`);
      localStorage.removeItem(`household_savings_goals_${ver}`);
      localStorage.removeItem(`household_savings_transactions_${ver}`);
      localStorage.removeItem(`household_savings_expenses_${ver}`);
    });
  } catch {
    // Ignore local storage parse error
  }
})();

export const loadStoredSettings = (): HouseholdSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
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
    const saved = localStorage.getItem(GOALS_KEY);
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
    const saved = localStorage.getItem(TRANSACTIONS_KEY);
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
    const saved = localStorage.getItem(EXPENSES_KEY);
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
