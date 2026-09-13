export type ContributorId = 'person_a' | 'person_b' | 'joint';
export type ExpensePayer = 'joint' | 'person_a' | 'person_b';

export interface MemberProfile {
  id: ContributorId;
  name: string;
  nickname: string;
  avatar: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  monthlyTarget: number;
  monthlyIncome?: number; // Estimated individual monthly income/salary
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  category: string;
  targetDate?: string;
  icon: string; // Emoji
  color: string; // Tailwind color class or hex
  description?: string;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'goal_allocation';
export type HouseholdFundType = 'long_term' | 'operating'; // กองระยะยาว (กองกลาง) vs กองหมุนเวียน (ใช้จ่าย)

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type?: TransactionType; // 'deposit' (default) or 'withdrawal'
  targetFund?: HouseholdFundType; // 'long_term' (default) or 'operating'
  withdrawalReason?: string;
  contributorId: ContributorId;
  goalId?: string;
  category: string;
  note?: string;
  createdAt: string;
}

export type ExpenseAmountType = 'fixed' | 'variable';

export interface MonthlyExpense {
  id: string;
  title: string;
  amount: number; // Base amount: for fixed this is regular monthly amount; for variable this is estimated/budgeted amount
  amountType?: ExpenseAmountType; // 'fixed' (default) or 'variable'
  currentMonthAmount?: number; // Actual recorded amount for current billing cycle
  monthlyBills?: Record<string, number>; // Historical records of monthly bill amounts e.g. { '2026-08': 4150, '2026-09': 4320 }
  category: string;
  payer: ExpensePayer;
  dueDay?: number; // 1 - 31
  icon: string; // Emoji
  color?: string;
  note?: string;
  isPaidThisMonth?: boolean;
}

export interface HouseholdSettings {
  householdName: string;
  currency: string;
  theme?: 'light' | 'dark';
  password?: string;              // PIN or password (default: '1234')
  isPasswordProtected?: boolean;  // whether lock screen is enabled
  members: {
    person_a: MemberProfile;
    person_b: MemberProfile;
  };
  totalHouseholdTarget: number;
  customExpenseCategories?: string[];
  householdMonthlyIncome?: number; // Total household monthly income
  quickAddPresets?: number[];      // Custom quick add amount presets
}

export interface MonthlySummary {
  monthKey: string; // YYYY-MM
  label: string;    // e.g. "เม.ย. 67" or "Apr 2024"
  person_a: number;
  person_b: number;
  total: number;
}
