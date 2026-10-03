/**
 * Utility functions for formatting numbers, currency, dates, and calculations
 */

export const formatCurrency = (amount: number, includeSymbol: boolean = true): string => {
  const formatted = new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return includeSymbol ? `฿${formatted}` : formatted;
};

export const formatCurrencyWithDecimals = (amount: number): string => {
  return formatCurrency(amount, true);
};

export const formatPercent = (value: number, decimals: number = 2): string => {
  return `${value.toFixed(decimals)}%`;
};

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const formatThaiDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const thaiYear = year + 543;
      return `${day} ${THAI_MONTHS_SHORT[month]} ${thaiYear.toString().slice(-2)}`;
    }
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.getMonth();
    const thaiYear = d.getFullYear() + 543;
    return `${day} ${THAI_MONTHS_SHORT[month]} ${thaiYear.toString().slice(-2)}`;
  } catch {
    return dateStr;
  }
};

export const getMonthLabel = (yearMonth: string): string => {
  // Format: YYYY-MM
  const [yearStr, monthStr] = yearMonth.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const year = parseInt(yearStr, 10);
  const thaiYear = (year + 543).toString().slice(-2);
  return `${THAI_MONTHS_SHORT[monthIdx]} '${thaiYear}`;
};

/**
 * Format month label for spreadsheet like in Image 1: "มิ.ย.-2021", "ก.ค.-2021", "ม.ค.-2024"
 */
export const formatSpreadsheetMonth = (yearMonth: string): string => {
  const [yearStr, monthStr] = yearMonth.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const safeIdx = Math.max(0, Math.min(11, isNaN(monthIdx) ? 0 : monthIdx));
  return `${THAI_MONTHS_SHORT[safeIdx]}-${yearStr}`;
};

/**
 * Format currency matching Excel/Spreadsheet style in Image 1:
 * - 0 becomes "฿ -"
 * - negative becomes "฿ (846.60)"
 * - positive becomes "฿ 17,834.82"
 */
export const formatCurrencySpreadsheet = (amount: number, blankIfZero: boolean = true): string => {
  if (Math.abs(amount) < 0.001) {
    return blankIfZero ? '฿ -' : '฿ 0.00';
  }
  if (amount < 0) {
    const formatted = new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    return `฿ (${formatted})`;
  }
  const formatted = new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `฿ ${formatted}`;
};

/**
 * Format full date matching Image 2 passbook: "31 พ.ค. 2022"
 */
export const formatPassbookDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const safeMonth = Math.max(0, Math.min(11, isNaN(month) ? 0 : month));
      return `${day} ${THAI_MONTHS_SHORT[safeMonth]} ${year}`;
    }
    const d = new Date(dateStr);
    return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

export const getCurrentYearMonth = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const calculateMonthsRemaining = (
  remainingAmount: number,
  monthlySavingsRate: number
): { text: string; isInfinite: boolean } => {
  if (remainingAmount <= 0) {
    return { text: 'บรรลุเป้าหมายแล้ว! 🎉', isInfinite: false };
  }
  if (monthlySavingsRate <= 0) {
    return { text: 'ยังไม่มีการออมสม่ำเสมอ', isInfinite: true };
  }
  const months = Math.ceil(remainingAmount / monthlySavingsRate);
  if (months > 120) {
    return { text: '> 10 ปี (ควรเพิ่มยอดออม)', isInfinite: false };
  }
  if (months > 12) {
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    return {
      text: remMonths > 0 ? `อีก ~${years} ปี ${remMonths} เดือน` : `อีก ~${years} ปี`,
      isInfinite: false,
    };
  }
  return { text: `อีกประมาณ ${months} เดือน`, isInfinite: false };
};
