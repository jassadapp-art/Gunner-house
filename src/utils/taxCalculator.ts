import type { TaxProfile, MemberProfile } from '../types';

export interface TaxBracketStep {
  range: string;
  min: number;
  max: number;
  rate: number; // e.g. 0.05 for 5%
  taxableInBracket: number;
  taxAmount: number;
}

export interface TaxCalculationResult {
  grossIncome: number;
  salaryYearly: number;
  bonus: number;
  otherIncome: number;
  
  standardExpenses: number; // 50% max 100,000
  personalDeduction: number; // 60,000
  
  deductionsBreakdown: {
    label: string;
    amount: number;
    maxLimit: number;
  }[];
  totalDeductions: number;
  
  netTaxableIncome: number;
  taxPayable: number;
  effectiveTaxRate: number;
  marginalTaxRate: number;
  
  brackets: TaxBracketStep[];
  
  taxWithoutDeductions: number;
  taxSaved: number;
  
  recommendations: {
    thaiEsgRemaining: number;
    ssfRemaining: number;
    rmfRemaining: number;
    potentialSavingsPer10k: number;
    tip: string;
  };
}

export const TAX_BRACKETS = [
  { min: 0, max: 150000, rate: 0, label: '0 - 150,000' },
  { min: 150000, max: 300000, rate: 0.05, label: '150,001 - 300,000' },
  { min: 300000, max: 500000, rate: 0.10, label: '300,001 - 500,000' },
  { min: 500000, max: 750000, rate: 0.15, label: '500,001 - 750,000' },
  { min: 750000, max: 1000000, rate: 0.20, label: '750,001 - 1,000,000' },
  { min: 1000000, max: 2000000, rate: 0.25, label: '1,000,001 - 2,000,000' },
  { min: 2000000, max: 5000000, rate: 0.30, label: '2,000,001 - 5,000,000' },
  { min: 5000000, max: Infinity, rate: 0.35, label: 'มากกว่า 5,000,000' },
];

export function computeTaxFromNetIncome(netIncome: number): {
  taxPayable: number;
  brackets: TaxBracketStep[];
  marginalRate: number;
} {
  let totalTax = 0;
  let marginalRate = 0;
  const bracketSteps: TaxBracketStep[] = [];

  for (const b of TAX_BRACKETS) {
    if (netIncome > b.min) {
      const taxableInBracket = Math.min(netIncome - b.min, b.max - b.min);
      const tax = taxableInBracket * b.rate;
      totalTax += tax;
      marginalRate = b.rate;

      bracketSteps.push({
        range: b.label,
        min: b.min,
        max: b.max,
        rate: b.rate,
        taxableInBracket,
        taxAmount: tax,
      });
    } else {
      bracketSteps.push({
        range: b.label,
        min: b.min,
        max: b.max,
        rate: b.rate,
        taxableInBracket: 0,
        taxAmount: 0,
      });
    }
  }

  return { taxPayable: totalTax, brackets: bracketSteps, marginalRate };
}

export function calculatePersonalIncomeTax(
  member: MemberProfile,
  profile?: TaxProfile
): TaxCalculationResult {
  const salaryYearly = (member.monthlyIncome || member.monthlyTarget || 0) * 12;
  const bonus = profile?.annualBonus || 0;
  const otherIncome = profile?.otherIncome || 0;
  const grossIncome = profile?.annualIncomeOverride ?? (salaryYearly + bonus + otherIncome);

  // Standard Expense Deduction: 50% max 100,000
  const standardExpenses = Math.min(grossIncome * 0.5, 100000);
  const personalDeduction = 60000;

  // Deduction Items with Limits
  const socialSecurity = Math.min(profile?.socialSecurity ?? 9000, 9000);
  
  // Life and Health Insurance: life max 100k, health max 25k, combined max 100k
  const rawHealth = profile?.healthInsurance || 0;
  const healthInsurance = Math.min(rawHealth, 25000);
  const rawLife = profile?.lifeInsurance || 0;
  const lifeAndHealth = Math.min(rawLife + healthInsurance, 100000);

  // Retirement group: PVD + SSF + RMF combined max 500,000 (and each has individual % cap)
  const maxRetirementCap = 500000;
  const pvdMax = grossIncome * 0.15;
  const pvdDeduction = Math.min(profile?.pvdDeduction || 0, pvdMax);

  const ssfMax = Math.min(grossIncome * 0.3, 200000);
  const rawSsf = profile?.ssf || 0;
  const ssfDeduction = Math.min(rawSsf, ssfMax);

  const rmfMax = Math.min(grossIncome * 0.3, 500000);
  const rawRmf = profile?.rmf || 0;
  const rmfDeduction = Math.min(rawRmf, rmfMax);

  const cappedRetirement = Math.min(pvdDeduction + ssfDeduction + rmfDeduction, maxRetirementCap);

  // ThaiESG: max 30% of income, up to 300,000 THB (Separate pool, not part of 500k!)
  const thaiEsgMax = Math.min(grossIncome * 0.3, 300000);
  const rawThaiEsg = profile?.thaiEsg || 0;
  const thaiEsgDeduction = Math.min(rawThaiEsg, thaiEsgMax);

  // Home loan interest: max 100,000
  const homeLoanInterest = Math.min(profile?.homeLoanInterest || 0, 100000);

  // Parents: 30,000 each
  const parentCount = profile?.parentDeductionCount || 0;
  const parentDeduction = parentCount * 30000;

  // Other deductions
  const otherDeductions = profile?.otherDeductions || 0;

  const deductionsBreakdown = [
    { label: 'ค่าลดหย่อนส่วนตัว', amount: personalDeduction, maxLimit: 60000 },
    { label: 'ประกันสังคม', amount: socialSecurity, maxLimit: 9000 },
    { label: 'ประกันชีวิตและสุขภาพ', amount: lifeAndHealth, maxLimit: 100000 },
    { label: 'กองทุน ThaiESG (เกณฑ์ใหม่)', amount: thaiEsgDeduction, maxLimit: thaiEsgMax },
    { label: 'กองทุนสำรองเลี้ยงชีพ (PVD)', amount: pvdDeduction, maxLimit: pvdMax },
    { label: 'กองทุน SSF', amount: ssfDeduction, maxLimit: ssfMax },
    { label: 'กองทุน RMF', amount: rmfDeduction, maxLimit: rmfMax },
    { label: 'ดอกเบี้ยเงินกู้ยืมเพื่อที่อยู่อาศัย', amount: homeLoanInterest, maxLimit: 100000 },
    { label: `ลดหย่อนบิดามารดา (${parentCount} คน)`, amount: parentDeduction, maxLimit: 120000 },
    { label: 'ค่าลดหย่อนอื่นๆ', amount: otherDeductions, maxLimit: Infinity },
  ];

  const totalDeductions =
    personalDeduction +
    socialSecurity +
    lifeAndHealth +
    thaiEsgDeduction +
    cappedRetirement +
    homeLoanInterest +
    parentDeduction +
    otherDeductions;

  const netTaxableIncome = Math.max(0, grossIncome - standardExpenses - totalDeductions);
  const { taxPayable, brackets, marginalRate } = computeTaxFromNetIncome(netTaxableIncome);

  // Baseline tax with only personal + standard expenses (to calculate tax saved)
  const baselineNet = Math.max(0, grossIncome - standardExpenses - personalDeduction);
  const { taxPayable: taxWithoutDeductions } = computeTaxFromNetIncome(baselineNet);
  const taxSaved = Math.max(0, taxWithoutDeductions - taxPayable);

  const effectiveTaxRate = grossIncome > 0 ? (taxPayable / grossIncome) * 100 : 0;

  // Remaining deduction opportunities
  const thaiEsgRemaining = Math.max(0, thaiEsgMax - thaiEsgDeduction);
  const ssfRemaining = Math.max(0, Math.min(ssfMax - ssfDeduction, maxRetirementCap - cappedRetirement));
  const rmfRemaining = Math.max(0, Math.min(rmfMax - rmfDeduction, maxRetirementCap - cappedRetirement));

  const potentialSavingsPer10k = 10000 * marginalRate;

  let tip = 'วางแผนภาษีได้อย่างยอดเยี่ยม อัตราภาษีอยู่ในเกณฑ์ที่ประหยัดได้ดีมาก';
  if (marginalRate >= 0.15) {
    tip = `ฐานภาษีของคุณอยู่ที่ ${(marginalRate * 100).toFixed(0)}%! หากลงทุนใน ThaiESG หรือ SSF เพิ่มเติม ทุกๆ 10,000 บาท จะได้เงินคืนภาษีทันที ${(marginalRate * 10000).toLocaleString()} บาท`;
  } else if (marginalRate === 0.10) {
    tip = `ฐานภาษีของคุณอยู่ที่ 10% การเพิ่มกองทุน ThaiESG หรือประกันสุขภาพ จะช่วยลดหย่อนและได้เงินคืน 10% ของยอดที่ซื้อ`;
  } else if (marginalRate === 0.05) {
    tip = `ฐานภาษีของคุณอยู่ที่ 5% วางแผนลดหย่อนอีกนิดจะสามารถลดภาษีให้กลายเป็น 0 บาท (ยกเว้นภาษีทั้งหมด) ได้เลยครับ!`;
  } else {
    tip = 'ยินดีด้วยครับ! เงินได้สุทธิไม่เกิน 150,000 บาท ได้รับการยกเว้นภาษี (ไม่ต้องจ่ายภาษี)';
  }

  return {
    grossIncome,
    salaryYearly,
    bonus,
    otherIncome,
    standardExpenses,
    personalDeduction,
    deductionsBreakdown,
    totalDeductions,
    netTaxableIncome,
    taxPayable,
    effectiveTaxRate,
    marginalTaxRate: marginalRate * 100,
    brackets,
    taxWithoutDeductions,
    taxSaved,
    recommendations: {
      thaiEsgRemaining,
      ssfRemaining,
      rmfRemaining,
      potentialSavingsPer10k,
      tip,
    },
  };
}
