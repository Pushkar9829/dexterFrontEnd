// Payout Management (Dexter "Payout Management Master Development Specification").
// Shared mock model for the Payout module. All money is stored as INTEGER PAISE (spec §16.1:
// no floating point for financial values). Mock only — persisted in localStorage.
import { createStore } from '@/lib/store'
import { apiEnabled } from '@/lib/api'
import { siteStore, networkStore, TEAM_LEADERS, type Site } from './network'
import { franchiseStore } from './franchises'

// ── money helpers (paise) ────────────────────────────────────────────────
export type Paise = number
export const toPaise = (rupees: number | string) => Math.round(Number(String(rupees).replace(/[,₹\s]/g, '') || 0) * 100)
export const fromPaise = (p: Paise) => p / 100
export const inrP = (p: Paise, decimals = 2) =>
  `₹${(p / 100).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
/** percentage of a paise amount, rounded half-up to the paisa */
export const pctOf = (p: Paise, pct: number) => Math.round((p * pct) / 100)
export const sumP = (xs: Paise[]) => xs.reduce((a, b) => a + b, 0)

// API mode (VITE_API_URL): stores start empty under their own keys and are hydrated from the backend
// by src/data/payoutApi.ts; mock mode keeps the seeded demo data below.
const sk = (key: string) => (apiEnabled ? `${key}.api` : key)
const seedOr = <T,>(empty: () => T, seed: () => T) => (apiEnabled ? empty : seed)

let seq = 0
export const pid = (p: string) => `${p}-${Date.now().toString(36).toUpperCase()}${(seq++).toString(36).toUpperCase()}`
export const nowIso = () => new Date().toISOString()

// ── verticals & categories (§2, §6.2) — the two verticals never share masters ──
export type Vertical = 'Franchise Model' | 'Business Model'
export const VERTICALS: Vertical[] = ['Franchise Model', 'Business Model']

export type FranchiseCategory = { code: string; name: string; description: string; status: 'Active' | 'Inactive' }
export type BmCategory = {
  code: string
  name: string
  businessModel: string
  description: string
  applicablePayout: boolean
  expenseRules: string[] // applicable expense heads
  partnerShareRule: string
  effectiveFrom: string
  status: 'Active' | 'Inactive'
}
export const EXPENSE_HEADS = ['Rent', 'Electricity Bill', 'Housekeeping', 'Staff Expenses', 'Partner Share', 'Other Expenses'] as const
export type ExpenseHead = (typeof EXPENSE_HEADS)[number]

// ── open business rules needing Finance sign-off (§21) — configurable, never assumed ──
export type FinanceRules = {
  tlEligibleProfitBasis: string | null
  tlShareType: 'Percentage' | 'Fixed' | 'Both' | null
  tlSharePct: number | null
  tlShareFixed: Paise | null
  tlAllocation: 'Site-wise' | 'Consolidated' | null
  mfShareRule: string | null
  bmOwnership: 'Direct MF' | 'Super MF with MF operating' | null
  superMfBmShare: string | null
  rentAlreadyDeducted: boolean | null
  partnerShareBasis: 'Gross payout' | 'Post-rent payout' | 'Post-expense profit' | null
  staffExpenseMode: 'Direct site entry' | 'Allocation across sites' | null
  expenseAccounting: 'Accrual' | 'Cash' | 'Both' | null
  tdsRates: number[] // offered TDS/GST % options
  negativeProfitTreatment: string | null
  expenseApprovalLimit: Paise | null
  varianceTolerance: Paise | null // reconciliation tolerance
  updatedAt: string
  updatedBy: string
}
export const RULE_LABELS: Record<Exclude<keyof FinanceRules, 'updatedAt' | 'updatedBy' | 'tdsRates'>, string> = {
  tlEligibleProfitBasis: '01 · Exact definition of eligible Franchise profit for TL sharing',
  tlShareType: '02 · Team Leader share type',
  tlSharePct: '02 · Team Leader share %',
  tlShareFixed: '02 · Team Leader fixed share',
  tlAllocation: '03 · TL allocation (site-wise / consolidated)',
  mfShareRule: '04 · Approved MF / Super MF commercial sharing rule',
  bmOwnership: '05 · BM site ownership',
  superMfBmShare: '06 · Super MF separate BM share',
  rentAlreadyDeducted: '07 · Rent already deducted from received payout?',
  partnerShareBasis: '08 · Partner share basis',
  staffExpenseMode: '09 · Staff expenses mode',
  expenseAccounting: '10 · Expense accounting',
  negativeProfitTreatment: '12 · Negative profit / carry-forward treatment',
  expenseApprovalLimit: '13 · Expense approval limit',
  varianceTolerance: '14 · Approved reconciliation variance tolerance',
}
const seedRules = (): FinanceRules => ({
  tlEligibleProfitBasis: null, tlShareType: null, tlSharePct: null, tlShareFixed: null, tlAllocation: null, mfShareRule: null,
  bmOwnership: null, superMfBmShare: null, rentAlreadyDeducted: null, partnerShareBasis: null, staffExpenseMode: null,
  expenseAccounting: null, tdsRates: [0, 1, 2, 5, 10, 18], negativeProfitTreatment: null, expenseApprovalLimit: null,
  varianceTolerance: null, updatedAt: '2026-11-04T10:00:00.000Z', updatedBy: 'System',
})
export const financeRulesStore = createStore<FinanceRules>(sk('dexter.payout.rules.v1'), seedRules)
export const useFinanceRules = () => financeRulesStore.use()
export const pendingRuleCount = (r: FinanceRules) => Object.keys(RULE_LABELS).filter((k) => r[k as keyof FinanceRules] === null).length

// ── plans (§10, Plan.xlsx, Plan Mapping designs) ─────────────────────────
export type RateTriple = { cash: number; nonCash: number } // ₹ per txn (decimal rupees, converted at calc time)
export type TxnSlab = { from: number; to: number | null; fr: RateTriple; mf: RateTriple; tl: RateTriple }
export type DepositSlab = { from: number; to: number | null; fr: number; mf: number; tl: number }
export type Incentive = { name: string; type: 'One-Time' | 'Per Transaction' | 'Threshold-Based'; applicableTo: 'MF' | 'Franchisee' | 'Team Leader'; basis: string; txnType: 'Cash' | 'Non Cash' | 'Both'; threshold: number | null; amount: Paise; frequency: 'One-Time' | 'Monthly' | 'Quarterly' }
export type RentalMg = { kind: 'Rental' | 'Rental Waiver' | 'MG' | 'MG Waiver'; from: number; to: number | null; amount: Paise; applicableTo: 'Franchisee' | 'MF' }
export type PlanStatus = 'Draft' | 'Pending Approval' | 'Active' | 'Inactive'
export type PayoutPlan = {
  code: string // PLN000836
  name: string
  version: number
  vertical: Vertical
  siteCategory: string
  planType: 'Upfront Fee Model' | 'Revenue Share Model' | 'Fixed Rental Model'
  modelType: 'ATM' | 'CRM'
  applicableFor: 'Franchisee' | 'MF' | 'Both'
  eligibility: string
  investment: { initial: Paise; refundableDeposit: Paise; upfrontFee: Paise; gstRate: number }
  planCategory: 'Flat rate per TXN' | 'Slab Wise Per TXN'
  txnSlabs: TxnSlab[]
  depositSlabs: DepositSlab[]
  incentives: Incentive[]
  gstApplicable: boolean
  rentalMg: RentalMg[]
  guaranteeType: 'Rental / MG Slab Based' | 'Fixed Rental' | 'Fixed MG' | 'None'
  noFixedMonthlyGuarantee: boolean
  fixedFee: Paise // Fixed Fee / CRA cost per month
  tdsPct: number
  effectiveFrom: string
  effectiveTo: string | null
  status: PlanStatus
  createdBy: string
  approvedBy?: string
  history: { version: number; at: string; by: string; note: string }[]
}
export const totalInvestment = (p: PayoutPlan) => {
  // Per the design: Initial investment (2,10,000) = Refundable deposit (60,000) + Upfront fee (1,50,000);
  // GST applies to the upfront fee only; Total = Initial + GST (2,37,000).
  const gst = pctOf(p.investment.upfrontFee, p.investment.gstRate)
  return { gst, total: p.investment.initial + gst, consistent: p.investment.initial === p.investment.refundableDeposit + p.investment.upfrontFee }
}
// Plan.xlsx slabs
const XLSX_SLABS: [number, number | null, number][] = [
  [1, 500, 0], [501, 700, 0], [701, 1000, 2], [1001, 1500, 5], [1501, 1800, 6], [1801, 2000, 8], [2001, 2500, 9], [2501, 3000, 10], [3001, 3500, 11], [3501, 4000, 11],
]
const slabs = (): TxnSlab[] => XLSX_SLABS.map(([from, to, c]) => ({ from, to, fr: { cash: c, nonCash: 0.5 }, mf: { cash: c, nonCash: 0.5 }, tl: { cash: c, nonCash: 0.5 } }))
const deposit = (): DepositSlab[] => [
  { from: 1, to: 10000, fr: 13, mf: 1, tl: 0.5 },
  { from: 10001, to: 20000, fr: 15, mf: 1, tl: 0.5 },
  { from: 20001, to: null, fr: 15, mf: 1, tl: 0.5 },
]
function seedPlans(): PayoutPlan[] {
  const base = (code: string, name: string, status: PlanStatus, model: 'ATM' | 'CRM', initial: number, refund: number, upfront: number): PayoutPlan => ({
    code, name, version: 1, vertical: 'Franchise Model', siteCategory: 'WLA ATM', planType: 'Upfront Fee Model', modelType: model, applicableFor: 'Both',
    eligibility: 'Plan लागू होने के लिए आवेदक को WLA ATM नेटवर्क में पंजीकृत होना आवश्यक है और न्यूनतम व्यापार मानदंडों को पूरा करना होगा।',
    investment: { initial: toPaise(initial), refundableDeposit: toPaise(refund), upfrontFee: toPaise(upfront), gstRate: 18 },
    planCategory: 'Slab Wise Per TXN', txnSlabs: slabs(), depositSlabs: deposit(),
    incentives: [
      { name: 'MF Site Incentive', type: 'One-Time', applicableTo: 'MF', basis: 'Per Site', txnType: 'Both', threshold: null, amount: toPaise(1000), frequency: 'One-Time' },
      { name: 'MF Transaction Incentive', type: 'Per Transaction', applicableTo: 'MF', basis: 'Per Transaction', txnType: 'Both', threshold: null, amount: toPaise(1), frequency: 'Monthly' },
      { name: 'Franchisee Achievement Incentive', type: 'Threshold-Based', applicableTo: 'Franchisee', basis: 'Successful Cash TXN', txnType: 'Cash', threshold: 1800, amount: toPaise(2000), frequency: 'Monthly' },
    ],
    gstApplicable: true,
    rentalMg: [
      { kind: 'Rental', from: 0, to: 1800, amount: toPaise(5000), applicableTo: 'Franchisee' },
      { kind: 'Rental', from: 1801, to: 2100, amount: toPaise(3000), applicableTo: 'Franchisee' },
      { kind: 'Rental Waiver', from: 2101, to: null, amount: 0, applicableTo: 'Franchisee' },
      { kind: 'MG', from: 0, to: 1800, amount: toPaise(6500), applicableTo: 'Franchisee' },
      { kind: 'MG', from: 1801, to: 2100, amount: toPaise(4500), applicableTo: 'Franchisee' },
      { kind: 'MG Waiver', from: 2101, to: null, amount: 0, applicableTo: 'Franchisee' },
    ],
    guaranteeType: 'Rental / MG Slab Based', noFixedMonthlyGuarantee: false, fixedFee: 0, tdsPct: 2,
    effectiveFrom: '2026-04-01', effectiveTo: null, status, createdBy: 'Priya Nair', approvedBy: status === 'Active' ? 'Paras Dubey' : undefined,
    history: [{ version: 1, at: '2026-04-01T10:00:00.000Z', by: 'Priya Nair', note: 'Plan created' }],
  })
  return [
    base('PLN000836', 'WLA Palladium – ATM Model', 'Draft', 'ATM', 210000, 60000, 150000),
    base('PLN000721', 'Premium ATM Plan', 'Active', 'ATM', 170000, 50000, 120000),
    base('PLN000658', 'Standard ATM Plan', 'Inactive', 'CRM', 130000, 40000, 100000),
  ]
}
export const planStore = createStore<PayoutPlan[]>(sk('dexter.payout.plans.v1'), seedOr(() => [], seedPlans))
export const usePlans = () => planStore.use()

export type PlanMapping = {
  id: string
  vertical: Vertical
  siteCategory: string
  planCode: string
  planVersion: number
  atmId: string
  siteId: string
  beneficiaryType: 'Franchisee' | 'MF' | 'Super MF'
  beneficiaryName: string
  effectiveFrom: string
  effectiveTo: string | null
  status: 'Pending Approval' | 'Active' | 'Rejected' | 'Expired'
  maker: string
  checker?: string
}
export const planMappingStore = createStore<PlanMapping[]>(sk('dexter.payout.planMap.v1'), () => [])
/** Overlap check (§10.3): one active plan per site + beneficiary + period. */
export function overlaps(m: Pick<PlanMapping, 'atmId' | 'beneficiaryType' | 'effectiveFrom' | 'effectiveTo'>, list = planMappingStore.get(), ignoreId?: string) {
  const end = (d: string | null) => d ?? '9999-12-31'
  return list.find((x) => x.id !== ignoreId && x.status !== 'Rejected' && x.status !== 'Expired' && x.atmId === m.atmId && x.beneficiaryType === m.beneficiaryType && x.effectiveFrom <= end(m.effectiveTo) && m.effectiveFrom <= end(x.effectiveTo))
}

// ── calculation engine (provisional — formula needs Finance sign-off, §5.2 / §21) ──
export type TxnData = { cash: number; nonCash: number; postCash: number; postNonCash: number; deposit: number } // counts
export type Deductions = { fixedFee: Paise; negativeFixedFee: Paise; iciciSr: Paise; ntPenalty: Paise; alf: Paise; recovery: Paise; waiver: Paise; additionalRecovery: Paise; credit: Paise }
export const ZERO_DED: Deductions = { fixedFee: 0, negativeFixedFee: 0, iciciSr: 0, ntPenalty: 0, alf: 0, recovery: 0, waiver: 0, additionalRecovery: 0, credit: 0 }
export const DEDUCTION_LABELS: Record<keyof Deductions, string> = {
  fixedFee: 'Fixed Fee / CRA Cost', negativeFixedFee: 'Negative Fixed Fee', iciciSr: 'ICICI SR Recovery', ntPenalty: 'NT Penalty', alf: 'ALF Charges',
  recovery: 'Recovery', waiver: 'Waiver', additionalRecovery: 'Additional Recovery', credit: 'Credit Amount',
}
const slabFor = (slabsList: { from: number; to: number | null }[], n: number) => slabsList.find((s) => n >= s.from && (s.to === null || n <= s.to)) ?? slabsList[slabsList.length - 1]
const rp = (r: number) => Math.round(r * 100) // ₹ rate → paise
export type FrCalc = { gross: Paise; netFranchisee: Paise; withoutTds: Paise; taxPct: number; taxAmt: Paise; net: Paise; mfRevenue: Paise; tlBase: Paise; lines: { label: string; amount: Paise }[] }
/**
 * Franchisee payout. Gross = cash×rate + nonCash×rate + post-cash/non-cash at the same slab + deposit slab rate.
 * Net Franchisee = Gross − Fixed Fee − ICICI SR − NT Penalty − ALF − Recovery + Negative Fixed Fee + Waiver.
 * FR payout w/o TDS = Net Franchisee − Additional Recovery + Credit.  Net = w/o TDS − TDS/GST.
 * PROVISIONAL: Finance must approve the formula, tax treatment and rounding (spec §5.2).
 */
export function calcFranchise(plan: PayoutPlan | undefined, t: TxnData, d: Deductions, taxPct: number): FrCalc {
  const s = plan ? (slabFor(plan.txnSlabs, t.cash + t.postCash) as TxnSlab) : undefined
  const ds = plan ? (slabFor(plan.depositSlabs, t.deposit) as DepositSlab) : undefined
  const cashP = s ? (t.cash + t.postCash) * rp(s.fr.cash) : 0
  const nonCashP = s ? (t.nonCash + t.postNonCash) * rp(s.fr.nonCash) : 0
  const depP = ds ? t.deposit * rp(ds.fr) : 0
  const gross = cashP + nonCashP + depP
  const netFranchisee = gross - d.fixedFee - d.iciciSr - d.ntPenalty - d.alf - d.recovery + d.negativeFixedFee + d.waiver
  const withoutTds = netFranchisee - d.additionalRecovery + d.credit
  const taxAmt = withoutTds > 0 ? pctOf(withoutTds, taxPct) : 0
  const mfRevenue = s && ds ? (t.cash + t.postCash) * rp(s.mf.cash) + (t.nonCash + t.postNonCash) * rp(s.mf.nonCash) + t.deposit * rp(ds.mf) : 0
  const tlBase = s && ds ? (t.cash + t.postCash) * rp(s.tl.cash) + (t.nonCash + t.postNonCash) * rp(s.tl.nonCash) + t.deposit * Math.round(ds.tl * 100) : 0
  return {
    gross, netFranchisee, withoutTds, taxPct, taxAmt, net: withoutTds - taxAmt, mfRevenue, tlBase,
    lines: [
      { label: 'Cash + Post Cash', amount: cashP }, { label: 'Non Cash + Post Non Cash', amount: nonCashP }, { label: 'Deposit', amount: depP },
      { label: 'Franchisee Gross Revenue', amount: gross },
    ],
  }
}

// ── beneficiary accounts (§8) ────────────────────────────────────────────
export type BeneficiaryType = 'Franchisee' | 'MF' | 'Super MF' | 'Team Leader' | 'Other'
export type BeneficiaryAccount = {
  id: string
  beneficiaryType: BeneficiaryType
  beneficiaryId: string
  name: string
  vertical: Vertical
  atmId?: string
  siteId?: string
  pan: string
  bank: string
  holder: string
  accountNo: string
  ifsc: string
  accountType: 'Current' | 'Savings'
  document?: string
  effectiveFrom: string
  status: 'Draft' | 'Pending' | 'Active' | 'Rejected' | 'Superseded'
  kycVerified: boolean
  maker: string
  checker?: string
  history: { at: string; by: string; action: string; detail?: string }[]
}
export const BANKS = ['HDFC Bank', 'ICICI Bank', 'Axis Bank', 'State Bank of India', 'Kotak Mahindra Bank', 'Bank of Baroda', 'Punjab National Bank', 'Yes Bank']

// ── monthly payout (§9) ──────────────────────────────────────────────────
export type PayoutSource = 'Manual' | 'File-Based' | 'Auto'
export type ReconStatus = 'Matched' | 'Variance Found' | 'PDF Only' | 'Excel Only' | 'Account Mismatch' | 'Duplicate' | 'Unmapped Site' | 'Account Pending' | 'Data Pending'
export type PayoutLine = {
  id: string
  batchId: string
  source: PayoutSource
  month: string // 2026-09
  atmId: string
  siteId: string
  model: string
  cashLiveDate: string
  frId: string
  frName: string
  mfName: string
  smfName: string
  mfCode: string
  city: string
  state: string
  planCode?: string
  txn: TxnData
  ded: Deductions
  gross: Paise
  mfRevenue: Paise
  taxPct: number
  taxAmt: Paise
  withoutTds: Paise
  net: Paise
  pan: string
  releaseDate?: string
  creditStatus?: 'Pending' | 'Credited' | 'Failed' | 'On Hold'
  paidDate?: string
  utr?: string
  remarks?: string
  overriddenBy?: string // manual override is permission-controlled and audited (§9.3)
}
export type BatchStatus = 'Draft' | 'Uploaded' | 'Validated' | 'Pending Approval' | 'Approved' | 'Released' | 'Completed' | 'On Hold' | 'Rejected'
export type PayoutBatch = {
  id: string
  name: string // PAYOUT_SEP26_MAN
  fy: string // 2026-27
  month: string
  type: 'Manual Payout' | 'File-Based Payout' | 'Auto Reconciliation'
  vertical: Vertical
  fileName?: string
  fileType?: string
  fileSizeKb?: number
  records: number
  gross: Paise
  gst: Paise
  tds: Paise
  net: Paise
  paymentDate?: string
  paymentMode?: string
  bankAccount?: string
  status: BatchStatus
  maker: string
  checker?: string
  createdAt: string
  remarks?: string
}
export type PayoutState = { batches: PayoutBatch[]; lines: PayoutLine[] }

// ── Team Leader profit sharing (§5.4–5.6) ────────────────────────────────
export type TlRule = { id: string; tlId: string; tlName: string; reportingMf: string; siteAtmIds: string[]; type: 'Percentage' | 'Fixed'; value: number; effectiveFrom: string; effectiveTo: string | null; status: 'Pending' | 'Approved' | 'Rejected' }
export type TlShare = { id: string; month: string; tlId: string; tlName: string; eligibleProfit: Paise; share: Paise; approval: 'Pending' | 'Approved' | 'Rejected'; payment: 'Pending' | 'Paid' | 'Hold'; utr?: string }

// ── Business Model (§6, §7, §12) ─────────────────────────────────────────
export type BmSite = { code: string; atmId: string; siteId: string; category: string; superMf: string; mf: string; businessModel: string; effectiveFrom: string; effectiveTo: string | null; agreement?: string; approval: 'Pending' | 'Approved' | 'Rejected'; status: 'Active' | 'Inactive'; city: string; state: string }
export type BmPayout = { id: string; fy: string; month: string; atmId: string; gross: Paise; rentDeductedAtSource: Paise; otherSourceDeductions: Paise; received: Paise; reference: string; date: string; document?: string }
export type ExpenseStatus = 'Recorded' | 'Approved' | 'Due' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Rejected'
export type BmExpense = { id: string; fy: string; month: string; atmId: string; head: ExpenseHead; amount: Paise; paid: Paise; billDate: string; dueDate?: string; paymentDate?: string; paymentMode?: string; vendor?: string; invoiceNo?: string; document?: string; status: ExpenseStatus; remarks?: string }
export type ForecastRow = { id: string; date: string; kind: 'BM' | 'FFM'; atmId: string; state: string; city: string; bank: string; nodalBranch: string; craFeasibility: string; morningBalance: Paise; dispensed: Paise; todaysIndent: Paise; requiredIndent: Paise; reason: string; status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' }
export type AlfRow = { id: string; atmId: string; type: 'Monthly' | 'Weekly'; start: string; reversal: string; amount: Paise; purpose: string; status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Reversed'; approvedBy?: string }

export type BusinessState = { franchiseCategories: FranchiseCategory[]; bmCategories: BmCategory[]; bmSites: BmSite[]; bmPayouts: BmPayout[]; expenses: BmExpense[]; forecasts: ForecastRow[]; alf: AlfRow[] }

// ── seeds ────────────────────────────────────────────────────────────────
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}
const MODELS = ['Citrine', 'Peridot Alfa Plus', 'Peridot Alfa', 'Jade', 'Palladium Lite', 'Green Coral', 'Yellow Emerald', 'Green Emerald', 'Coral']
const fakePan = (r: () => number) => `${'ABCDEFGHJK'[Math.floor(r() * 10)]}${'PQRSTUVWXY'[Math.floor(r() * 10)]}GPS${String(1000 + Math.floor(r() * 8999))}${'ABCDEFGH'[Math.floor(r() * 8)]}`

function parentNames(frId: string) {
  const nodes = networkStore.get().nodes
  const n = nodes[frId]
  let mf = '—'
  let smf = '—'
  if (n?.parent.kind === 'MF') {
    mf = n.parent.name
    const mfn = nodes[n.parent.id]
    if (mfn?.parent.kind === 'SMF') smf = mfn.parent.name
  } else if (n?.parent.kind === 'Company') mf = 'Dexter India Management Services Pvt Ltd'
  return { mf, smf }
}

function seedPayout(): PayoutState {
  const r = rng(77)
  const plans = planStore.get()
  const plan = plans.find((p) => p.status === 'Active') ?? plans[0]
  const frs = franchiseStore.get()
  const sites: Site[] = siteStore.get().sites.filter((s) => s.operational).slice(0, 60)
  const batches: PayoutBatch[] = []
  const lines: PayoutLine[] = []
  const mkLines = (batchId: string, source: PayoutSource, month: string, jitter: number) =>
    sites.map((s, i) => {
      const fr = frs.find((f) => f.id === s.frId)
      const rr = rng(i + 11)
      const txn: TxnData = { cash: Math.floor(rr() * 2600) + 200, nonCash: Math.floor(rr() * 360) + 40, postCash: rr() < 0.2 ? Math.floor(rr() * 2500) : 0, postNonCash: rr() < 0.2 ? Math.floor(rr() * 200) : 0, deposit: rr() < 0.3 ? Math.floor(rr() * 220) : 0 }
      const ded: Deductions = { ...ZERO_DED, alf: rr() < 0.15 ? toPaise(3090) : 0, negativeFixedFee: rr() < 0.06 ? toPaise(4709) : 0 }
      if (source !== 'Auto' && i % 9 === 0) ded.ntPenalty = toPaise(jitter) // creates variance for the recon screen
      const c = calcFranchise(plan, txn, ded, 2)
      const { mf, smf } = parentNames(s.frId)
      return {
        id: pid('PL'), batchId, source, month, atmId: s.atmId, siteId: s.siteId, model: MODELS[i % MODELS.length], cashLiveDate: '2023-12-28', frId: s.frId, frName: fr?.name ?? s.frId,
        mfName: mf, smfName: smf, mfCode: `HPY000${4546 + i}`, city: s.district, state: s.state, planCode: plan.code, txn, ded, gross: c.gross, mfRevenue: c.mfRevenue,
        taxPct: 2, taxAmt: c.taxAmt, withoutTds: c.withoutTds, net: c.net, pan: fakePan(r), releaseDate: '2026-10-05', creditStatus: 'Credited', paidDate: '2026-10-05', utr: `UTR${String(26100500 + i * 37)}`,
      } as PayoutLine
    })
  const add = (id: string, name: string, type: PayoutBatch['type'], source: PayoutSource, month: string, jitter: number, status: BatchStatus, file?: string) => {
    const ls = mkLines(id, source, month, jitter)
    lines.push(...ls)
    const gross = sumP(ls.map((l) => l.gross))
    const tds = sumP(ls.map((l) => l.taxAmt))
    batches.push({ id, name, fy: '2026-27', month, type, vertical: 'Franchise Model', fileName: file, fileType: file ? 'Excel (.xlsx)' : undefined, fileSizeKb: file ? 2400 : undefined, records: ls.length, gross, gst: 0, tds, net: sumP(ls.map((l) => l.net)), paymentDate: status === 'Completed' ? `${month}-05` : undefined, paymentMode: 'NEFT', bankAccount: 'Dexter Ops Account - 1234567890', status, maker: 'Sanjay Gupta', checker: status === 'Completed' ? 'Priya Nair' : undefined, createdAt: `${month}-03T10:00:00.000Z` })
  }
  add('BAT-SEP26-FILE', 'PAYOUT_SEP26_001', 'File-Based Payout', 'File-Based', '2026-09', 0, 'Pending Approval', 'Monthly_Payout_Sep26.xlsx')
  add('BAT-SEP26-MAN', 'PAYOUT_SEP26_MAN', 'Manual Payout', 'Manual', '2026-09', 180, 'Draft')
  add('BAT-SEP26-AUTO', 'PAYOUT_SEP26_AUTO', 'Auto Reconciliation', 'Auto', '2026-09', 0, 'Validated')
  add('BAT-AUG26-AUTO', 'PAYOUT_AUG26_001', 'Auto Reconciliation', 'Auto', '2026-08', 0, 'Completed', 'Auto_Recon_Aug26')
  return { batches, lines }
}
export const payoutStore = createStore<PayoutState>(sk('dexter.payout.monthly.v1'), seedOr(() => ({ batches: [], lines: [] }), seedPayout))
export const usePayout = () => payoutStore.use()

function seedAccounts(): BeneficiaryAccount[] {
  const r = rng(91)
  const frs = franchiseStore.get().slice(0, 40)
  return frs.map((f, i) => {
    const bank = BANKS[i % BANKS.length]
    const tier: BeneficiaryType = f.tier === 'Super Master' ? 'Super MF' : f.tier === 'Master' ? 'MF' : 'Franchisee'
    return {
      id: `BEN-${String(1001 + i)}`, beneficiaryType: tier, beneficiaryId: f.id, name: f.name, vertical: 'Franchise Model', pan: fakePan(r), bank, holder: f.name,
      accountNo: String(Math.floor(r() * 9e11) + 1e11), ifsc: `${bank.replace(/[^A-Z]/g, '').slice(0, 4).padEnd(4, 'X')}0${String(Math.floor(r() * 900000) + 100000)}`, accountType: 'Current',
      document: 'Cancelled_Cheque.pdf', effectiveFrom: '2026-04-01', status: i % 11 === 3 ? 'Pending' : 'Active', kycVerified: i % 11 !== 3, maker: 'Sanjay Gupta', checker: i % 11 === 3 ? undefined : 'Priya Nair',
      history: [{ at: '2026-04-01T10:00:00.000Z', by: 'Sanjay Gupta', action: 'Account added' }],
    } as BeneficiaryAccount
  })
}
export const accountStore = createStore<BeneficiaryAccount[]>(sk('dexter.payout.accounts.v1'), seedOr(() => [], seedAccounts))
export const useBeneficiaryAccounts = () => accountStore.use()

function seedTl(): { rules: TlRule[]; shares: TlShare[] } {
  const sites = siteStore.get().sites.filter((s) => s.operational)
  const rules: TlRule[] = TEAM_LEADERS.slice(0, 5).map((t, i) => ({
    id: `TLR-${100 + i}`, tlId: t.id, tlName: t.name, reportingMf: '—', siteAtmIds: sites.slice(i * 6, i * 6 + 6).map((s) => s.atmId), type: 'Percentage', value: 0, effectiveFrom: '2026-04-01', effectiveTo: null, status: 'Pending',
  }))
  return { rules, shares: [] }
}
export const tlStore = createStore<{ rules: TlRule[]; shares: TlShare[] }>(sk('dexter.payout.tl.v1'), seedOr(() => ({ rules: [], shares: [] }), seedTl))
export const useTl = () => tlStore.use()

function seedBusiness(): BusinessState {
  const r = rng(55)
  const sites = siteStore.get().sites.filter((s) => s.siteType === 'BM').slice(0, 24)
  const nodes = networkStore.get().nodes
  const mfs = Object.values(nodes).filter((n) => n.tier === 'Master')
  const frs = franchiseStore.get()
  const nameOf = (id: string) => frs.find((f) => f.id === id)?.name ?? id
  const bmCategories: BmCategory[] = [
    { code: 'BMC-01', name: 'BM Urban Site', businessModel: 'Owned & Operated', description: 'Urban BM ATM sites', applicablePayout: true, expenseRules: [...EXPENSE_HEADS], partnerShareRule: 'As per agreement', effectiveFrom: '2026-04-01', status: 'Active' },
    { code: 'BMC-02', name: 'BM Rural Site', businessModel: 'Owned & Operated', description: 'Rural / semi-urban BM ATM sites', applicablePayout: true, expenseRules: ['Rent', 'Electricity Bill', 'Housekeeping', 'Other Expenses'], partnerShareRule: 'None', effectiveFrom: '2026-04-01', status: 'Active' },
    { code: 'BMC-03', name: 'BM Partner Site', businessModel: 'Partner Operated', description: 'Partner-operated BM sites with revenue share', applicablePayout: true, expenseRules: [...EXPENSE_HEADS], partnerShareRule: 'Percentage of post-expense profit (pending §21-08)', effectiveFrom: '2026-04-01', status: 'Active' },
  ]
  const bmSites: BmSite[] = sites.map((s, i) => {
    const mf = mfs[i % mfs.length]
    const smf = mf.parent.kind === 'SMF' ? mf.parent.name : '—'
    return { code: `BMS-${String(201 + i)}`, atmId: s.atmId, siteId: s.siteId, category: bmCategories[i % 3].code, superMf: smf, mf: nameOf(mf.frId), businessModel: bmCategories[i % 3].businessModel, effectiveFrom: '2026-04-01', effectiveTo: null, agreement: 'BM_Agreement.pdf', approval: i % 7 === 5 ? 'Pending' : 'Approved', status: 'Active', city: s.district, state: s.state }
  })
  const bmPayouts: BmPayout[] = []
  const expenses: BmExpense[] = []
  ;['2026-08', '2026-09'].forEach((m, mi) =>
    bmSites.forEach((b, i) => {
      const gross = toPaise(30000 + Math.floor(r() * 40000))
      bmPayouts.push({ id: pid('BMP'), fy: '2026-27', month: m, atmId: b.atmId, gross, rentDeductedAtSource: 0, otherSourceDeductions: 0, received: gross, reference: `WLA/${m}/${b.atmId}`, date: `${m}-28` })
      const add = (head: ExpenseHead, amt: number, st: ExpenseStatus) => expenses.push({ id: pid('EXP'), fy: '2026-27', month: m, atmId: b.atmId, head, amount: toPaise(amt), paid: st === 'Paid' ? toPaise(amt) : st === 'Partially Paid' ? toPaise(Math.round(amt / 2)) : 0, billDate: `${m}-08`, dueDate: `${m}-20`, paymentDate: st === 'Paid' ? `${m}-18` : undefined, paymentMode: 'Bank Transfer', vendor: head === 'Rent' ? 'Site landlord' : undefined, invoiceNo: `${head.slice(0, 3).toUpperCase()}/${m}/${i}`, document: `${head.replace(/\s/g, '_')}.pdf`, status: st })
      add('Rent', 8000 + Math.floor(r() * 12000), 'Paid')
      add('Electricity Bill', 2500 + Math.floor(r() * (i % 6 === 0 && mi === 1 ? 9000 : 3500)), mi === 1 && i % 4 === 0 ? 'Due' : 'Paid')
      if (i % 5 !== 2) add('Housekeeping', 1500 + Math.floor(r() * 1500), 'Paid') // some sites miss a mandatory head → Incomplete
      add('Staff Expenses', 4000 + Math.floor(r() * 4000), mi === 1 && i % 3 === 0 ? 'Partially Paid' : 'Paid')
      if (b.category === 'BMC-03') add('Partner Share', 6000 + Math.floor(r() * 6000), 'Approved')
      add('Other Expenses', Math.floor(r() * 2500), 'Recorded')
    }),
  )
  const banks = ['Axis Bank', 'HDFC Bank', 'SBI', 'PNB', 'ICICI Bank']
  const forecasts: ForecastRow[] = bmSites.slice(0, 8).map((b, i) => ({
    id: pid('FC'), date: '2026-11-04', kind: 'BM', atmId: b.atmId, state: b.state, city: b.city, bank: banks[i % banks.length], nodalBranch: b.city, craFeasibility: 'CMS',
    morningBalance: toPaise(480000 + Math.floor(r() * 350000)), dispensed: toPaise(470000 + Math.floor(r() * 330000)), todaysIndent: i % 3 === 0 ? 0 : toPaise(500000 * (1 + (i % 3))),
    requiredIndent: toPaise(1250000 + (i % 4) * 500000), reason: ['Please raise an indent in ₹500 denomination only.', 'Demand is higher than expected.', 'Weekend cash requirement.', 'Cash level below threshold.'][i % 4], status: 'Draft',
  }))
  const alf: AlfRow[] = bmSites.slice(0, 8).map((b, i) => ({
    id: pid('ALF'), atmId: b.atmId, type: i % 2 ? 'Weekly' : 'Monthly', start: `2026-10-${20 + (i % 6)}`, reversal: `2026-10-${26 + (i % 3)}`, amount: toPaise(150000 + (i % 4) * 100000), purpose: i % 2 ? 'Weekly ALF – Cash demand' : 'Monthly ALF as per request', status: 'Draft',
  }))
  return {
    franchiseCategories: [
      { code: 'FRC-01', name: 'WLA ATM', description: 'Franchise WLA ATM site', status: 'Active' },
      { code: 'FRC-02', name: 'WLA CRM', description: 'Franchise cash recycler site', status: 'Active' },
    ],
    bmCategories, bmSites, bmPayouts, expenses, forecasts, alf,
  }
}
export const businessStore = createStore<BusinessState>(
  sk('dexter.payout.business.v1'),
  seedOr(() => ({ franchiseCategories: [], bmCategories: [], bmSites: [], bmPayouts: [], expenses: [], forecasts: [], alf: [] }), seedBusiness),
)
export const useBusiness = () => businessStore.use()

/** BM site P&L (§6.5 / §6.6). Rent deducted at source is not deducted again. */
export function bmPnl(b: BusinessState, atmId: string, month: string, mandatory: ExpenseHead[] = ['Rent', 'Electricity Bill', 'Housekeeping', 'Staff Expenses']) {
  const pay = b.bmPayouts.find((p) => p.atmId === atmId && p.month === month)
  const ex = b.expenses.filter((e) => e.atmId === atmId && e.month === month && e.status !== 'Rejected')
  const by = (h: ExpenseHead) => sumP(ex.filter((e) => e.head === h).map((e) => e.amount))
  const rent = pay && pay.rentDeductedAtSource > 0 ? 0 : by('Rent')
  const heads = { Rent: rent, 'Electricity Bill': by('Electricity Bill'), Housekeeping: by('Housekeeping'), 'Staff Expenses': by('Staff Expenses'), 'Partner Share': by('Partner Share'), 'Other Expenses': by('Other Expenses') } as Record<ExpenseHead, Paise>
  const total = sumP(Object.values(heads))
  const received = pay?.received ?? 0
  const net = received - total
  const missing = mandatory.filter((h) => !ex.some((e) => e.head === h) && !(h === 'Rent' && pay && pay.rentDeductedAtSource > 0))
  const status = !pay ? 'Reconciliation Pending' : missing.length ? 'Incomplete' : net > 0 ? 'Profitable' : net < 0 ? 'Loss Making' : 'Break-even'
  return { received, heads, total, net, margin: received ? Math.round((net / received) * 1000) / 10 : 0, missing, status, outstanding: sumP(ex.map((e) => e.amount - e.paid)) }
}
export const PNL_TONE: Record<string, 'green' | 'red' | 'amber' | 'gray'> = { Profitable: 'green', 'Loss Making': 'red', 'Break-even': 'amber', Incomplete: 'gray', 'Reconciliation Pending': 'amber' }

// ── audit (§16.1) ────────────────────────────────────────────────────────
export type PayoutAudit = { id: string; at: string; by: string; area: string; ref: string; action: string; before?: string; after?: string }
export const payoutAuditStore = createStore<PayoutAudit[]>(sk('dexter.payout.audit.v1'), () => [])
export const usePayoutAudit = () => payoutAuditStore.use()
export function logPayout(e: Omit<PayoutAudit, 'id' | 'at'>) {
  payoutAuditStore.set((l) => [{ id: pid('PAU'), at: nowIso(), ...e }, ...l].slice(0, 3000))
}

export const FY_OPTIONS = ['2025-26', '2026-27', '2027-28']
export const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).replace(' ', '-')
