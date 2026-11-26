// Plan Mapping (spec §10) — helpers shared by the plan list, wizard, plan view and site-wise mapping.
// Money is integer paise; per-transaction rates are decimal rupees as in the PayoutPlan model.
import { getSession } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { apiEnabled } from '@/lib/api'
import * as papi from '@/data/payoutApi'
import {
  businessStore, logPayout, nowIso, pctOf, planMappingStore, planStore, totalInvestment,
  type BusinessState, type DepositSlab, type Incentive, type PayoutPlan, type PlanMapping, type RentalMg, type TxnSlab, type Vertical,
} from '@/data/payout'
import { networkStore, siteStore, type Site } from '@/data/network'
import { franchiseStore } from '@/data/franchises'

/** Extra Incentive Rule Settings fields from the design (stored alongside the plan record). */
export type PlanX = PayoutPlan & { incentiveEligibility?: string; incentiveRemarks?: string; submittedBy?: string; reactivation?: boolean }
export type MappingSource = 'Individual' | 'Bulk' | 'Rule-based'
export type MappingX = PlanMapping & { source?: MappingSource; rule?: string; remarks?: string; createdAt?: string; decidedAt?: string }

export const PLAN_TYPES: PayoutPlan['planType'][] = ['Upfront Fee Model', 'Revenue Share Model', 'Fixed Rental Model']
export const MODEL_TYPES: PayoutPlan['modelType'][] = ['ATM', 'CRM']
export const APPLICABLE_FOR: PayoutPlan['applicableFor'][] = ['Franchisee', 'MF', 'Both']
export const GST_RATES = ['0', '5', '12', '18', '28']
export const PLAN_CATEGORIES: PayoutPlan['planCategory'][] = ['Flat rate per TXN', 'Slab Wise Per TXN']
export const INCENTIVE_TYPES: Incentive['type'][] = ['One-Time', 'Per Transaction', 'Threshold-Based']
export const INCENTIVE_TO: Incentive['applicableTo'][] = ['MF', 'Franchisee', 'Team Leader']
export const INCENTIVE_BASIS = ['Per Site', 'Per Transaction', 'Successful Cash TXN', 'Successful Non Cash TXN', 'Total TXN']
export const TXN_TYPES: Incentive['txnType'][] = ['Cash', 'Non Cash', 'Both']
export const FREQUENCIES: Incentive['frequency'][] = ['One-Time', 'Monthly', 'Quarterly']
export const RENTAL_KINDS: RentalMg['kind'][] = ['Rental', 'Rental Waiver', 'MG', 'MG Waiver']
export const RENTAL_TO: RentalMg['applicableTo'][] = ['Franchisee', 'MF']
export const GUARANTEE_TYPES: PayoutPlan['guaranteeType'][] = ['Rental / MG Slab Based', 'Fixed Rental', 'Fixed MG', 'None']
export const PLAN_STATUSES: PayoutPlan['status'][] = ['Draft', 'Pending Approval', 'Active', 'Inactive']
export const ELIGIBILITY_MAX = 500

export const today = () => new Date().toISOString().slice(0, 10)
export const currentUser = () => getSession()?.name ?? 'Unknown user'
export const fmtDate = (d?: string | null) => (d ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
export const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
/** Indian-grouped rupees without the symbol (the designs show "2,37,000"). */
export const rs = (p: number, decimals = 0) => (p / 100).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: 2 })
export const addDays = (d: string, n: number) => {
  const t = new Date(`${d}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() + n)
  return t.toISOString().slice(0, 10)
}

// ── plan records (several versions may share one code) ─────────────────────
export const planKey = (p: Pick<PayoutPlan, 'code' | 'version'>) => `${p.code}#v${p.version}`
export function latestByCode(plans: PayoutPlan[]): PayoutPlan[] {
  const m = new Map<string, PayoutPlan>()
  plans.forEach((p) => {
    const cur = m.get(p.code)
    if (!cur || p.version > cur.version) m.set(p.code, p)
  })
  return [...m.values()]
}
export const versionsOf = (plans: PayoutPlan[], code: string) => plans.filter((p) => p.code === code).sort((a, b) => b.version - a.version)
/** The version currently in force for a code (latest Active), used for new mappings. */
export const activeVersionOf = (plans: PayoutPlan[], code: string) => versionsOf(plans, code).find((p) => p.status === 'Active')
export function nextPlanCode(plans: PayoutPlan[]) {
  const max = plans.reduce((m, p) => Math.max(m, Number(p.code.replace(/\D/g, '')) || 0), 0)
  return `PLN${String(max + 1).padStart(6, '0')}`
}
export function upsertPlan(p: PlanX) {
  if (apiEnabled) void papi.apiUpsertPlan(planStore.get().find((x) => planKey(x) === planKey(p)), p)
  planStore.set((list) => (list.some((x) => planKey(x) === planKey(p)) ? list.map((x) => (planKey(x) === planKey(p) ? p : x)) : [p, ...list]))
}
export function deletePlanVersion(p: PayoutPlan) {
  planStore.set((list) => list.filter((x) => planKey(x) !== planKey(p)))
  if (apiEnabled) void papi.apiDeletePlan(p)
  logPayout({ by: currentUser(), area: 'Plan Mapping', ref: p.code, action: `Draft plan v${p.version} deleted` })
}
export const withHistory = (p: PlanX, note: string): PlanX => ({ ...p, history: [...p.history, { version: p.version, at: nowIso(), by: currentUser(), note }] })

export function blankPlan(code: string): PlanX {
  return {
    code, name: '', version: 1, vertical: 'Franchise Model', siteCategory: '', planType: 'Upfront Fee Model', modelType: 'ATM', applicableFor: 'Both', eligibility: '',
    investment: { initial: 0, refundableDeposit: 0, upfrontFee: 0, gstRate: 18 },
    planCategory: 'Slab Wise Per TXN',
    txnSlabs: [{ from: 1, to: 500, fr: { cash: 0, nonCash: 0 }, mf: { cash: 0, nonCash: 0 }, tl: { cash: 0, nonCash: 0 } }],
    depositSlabs: [{ from: 1, to: null, fr: 0, mf: 0, tl: 0 }],
    incentives: [], gstApplicable: true, rentalMg: [], guaranteeType: 'Rental / MG Slab Based', noFixedMonthlyGuarantee: false,
    fixedFee: 0, tdsPct: 2, effectiveFrom: today(), effectiveTo: null, status: 'Draft', createdBy: currentUser(), history: [],
    incentiveEligibility: '', incentiveRemarks: '',
  }
}
/** Active / Inactive plans are never edited in place (§10.3): editing clones them as the next version. */
export function nextVersionFrom(p: PlanX, plans: PayoutPlan[]): PlanX {
  const maxV = Math.max(...versionsOf(plans, p.code).map((x) => x.version))
  const from = p.effectiveFrom > today() ? addDays(p.effectiveFrom, 1) : today()
  return { ...structuredClone(p), version: maxV + 1, status: 'Draft', createdBy: currentUser(), approvedBy: undefined, effectiveFrom: from, effectiveTo: null }
}

export const categoriesFor = (v: Vertical | '', b: BusinessState) =>
  v === 'Franchise Model' ? b.franchiseCategories.filter((c) => c.status === 'Active').map((c) => c.name) : v === 'Business Model' ? b.bmCategories.filter((c) => c.status === 'Active').map((c) => c.name) : []

export const planTotal = (p: PayoutPlan) => totalInvestment(p).total

// ── validation ─────────────────────────────────────────────────────────────
export type Errors = Record<string, string>

export function validateDetails(p: PlanX, plans: PayoutPlan[]): Errors {
  const e: Errors = {}
  if (!p.name.trim()) e.name = 'Plan name is required.'
  else if (p.name.trim().length < 3) e.name = 'Use at least 3 characters.'
  else if (plans.some((x) => x.code !== p.code && x.name.trim().toLowerCase() === p.name.trim().toLowerCase())) e.name = 'Another plan already uses this name.'
  if (!/^PLN\d{6}$/.test(p.code)) e.code = 'Plan code must be PLN followed by 6 digits.'
  if (!p.vertical) e.vertical = 'Select the business vertical.'
  if (!p.siteCategory) e.siteCategory = 'Select a site category of this vertical.'
  else if (!categoriesFor(p.vertical, businessStore.get()).includes(p.siteCategory)) e.siteCategory = `"${p.siteCategory}" is not a ${p.vertical} category.`
  if (!p.planType) e.planType = 'Select the plan type.'
  if (!p.modelType) e.modelType = 'Select the model type.'
  if (!p.applicableFor) e.applicableFor = 'Select who the plan applies to.'
  if (p.vertical === 'Business Model' && p.applicableFor !== 'MF') e.applicableFor = 'Business Model plans can apply only to MF / Super MF (Franchisees cannot be mapped to BM sites).'
  if (!p.eligibility.trim()) e.eligibility = 'Eligibility criteria is required.'
  else if (p.eligibility.length > ELIGIBILITY_MAX) e.eligibility = `Maximum ${ELIGIBILITY_MAX} characters.`
  const inv = p.investment
  if (inv.initial <= 0) e.initial = 'Enter the initial investment.'
  if (inv.refundableDeposit < 0) e.refundableDeposit = 'Cannot be negative.'
  if (inv.upfrontFee < 0) e.upfrontFee = 'Cannot be negative.'
  if (inv.gstRate < 0 || inv.gstRate > 28) e.gstRate = 'Select a GST rate.'
  return e
}
/** The isolated "is the new code free" check — only for brand-new plans. */
export const codeTaken = (code: string, plans: PayoutPlan[]) => plans.some((x) => x.code === code)

type Range = { from: number; to: number | null }
/** Ranges must start where the previous one ended + 1 (no gaps, no overlaps), From < To, only the last row may be open-ended. */
export function validateRanges(rows: Range[], label: string): { rows: Record<number, string>; list: string[] } {
  const out: Record<number, string> = {}
  const list: string[] = []
  if (!rows.length) list.push(`Add at least one ${label} row.`)
  rows.forEach((r, i) => {
    const n = i + 1
    if (!Number.isInteger(r.from) || r.from < 0) out[i] = `Row ${n}: From must be a whole number ≥ 0.`
    else if (r.to === null && i !== rows.length - 1) out[i] = `Row ${n}: only the last row can be open-ended ("Above").`
    else if (r.to !== null && (!Number.isInteger(r.to) || r.to <= r.from)) out[i] = `Row ${n}: To must be greater than From.`
    else if (i > 0) {
      const prev = rows[i - 1]
      if (prev.to !== null && r.from > prev.to + 1) out[i] = `Row ${n}: gap — ${prev.to + 1} to ${r.from - 1} is not covered.`
      else if (prev.to !== null && r.from <= prev.to) out[i] = `Row ${n}: overlaps row ${i} (From must be ${prev.to + 1}).`
    }
  })
  return { rows: out, list: [...list, ...Object.values(out)] }
}
const badRate = (n: number) => !Number.isFinite(n) || n < 0 || n > 10000
export function validateTxnSlabs(p: PlanX) {
  const res = validateRanges(p.txnSlabs, 'transaction slab')
  if (p.planCategory === 'Flat rate per TXN' && p.txnSlabs.length !== 1) res.list.unshift('Flat rate per TXN uses a single rate row — remove the extra slabs or switch to Slab Wise Per TXN.')
  p.txnSlabs.forEach((s, i) => {
    if (!res.rows[i] && [s.fr.cash, s.fr.nonCash, s.mf.cash, s.mf.nonCash, s.tl.cash, s.tl.nonCash].some(badRate)) {
      res.rows[i] = `Row ${i + 1}: rates must be between ₹0 and ₹10,000 per TXN.`
      res.list.push(res.rows[i])
    }
  })
  // A plan whose franchise rates are all zero would produce ₹0 payouts for every site.
  if (p.txnSlabs.length && p.txnSlabs.every((s) => !s.fr.cash && !s.fr.nonCash)) res.list.push('Enter at least one non-zero Franchise rate (Cash or Non Cash) — all rates are ₹0.')
  return res
}
export function validateDepositSlabs(p: PlanX) {
  const res = validateRanges(p.depositSlabs, 'deposit commission')
  p.depositSlabs.forEach((s, i) => {
    if (!res.rows[i] && [s.fr, s.mf, s.tl].some(badRate)) {
      res.rows[i] = `Row ${i + 1}: rates must be between ₹0 and ₹10,000.`
      res.list.push(res.rows[i])
    }
  })
  return res
}
export function validateIncentive(x: Incentive, all: Incentive[], idx: number): string | null {
  if (!x.name.trim()) return 'Incentive name is required.'
  if (all.some((o, i) => i !== idx && o.name.trim().toLowerCase() === x.name.trim().toLowerCase())) return 'Incentive names must be unique.'
  if (!x.basis) return 'Select the calculation basis.'
  if (x.type === 'Threshold-Based' && (!x.threshold || x.threshold <= 0)) return 'Threshold-based incentives need a threshold > 0.'
  if (x.amount <= 0) return 'Incentive rate / amount must be greater than 0.'
  if (x.type === 'One-Time' && x.frequency !== 'One-Time') return 'One-time incentives must use the One-Time payment frequency.'
  return null
}
export function validateIncentives(p: PlanX) {
  const rows: Record<number, string> = {}
  p.incentives.forEach((x, i) => {
    const m = validateIncentive(x, p.incentives, i)
    if (m) rows[i] = `Incentive ${i + 1}: ${m}`
  })
  return { rows, list: Object.values(rows) }
}
/** Rental (+ waiver) and MG (+ waiver) are two independent slab series on the cash TXN count. */
export function validateRental(p: PlanX) {
  const rows: Record<number, string> = {}
  const list: string[] = []
  if (p.noFixedMonthlyGuarantee) return { rows, list }
  if (p.guaranteeType === 'None') list.push('Guarantee type "None" requires the "No Fixed Monthly Guarantee (UF Model)" option.')
  p.rentalMg.forEach((r, i) => {
    if (r.kind.includes('Waiver') && r.amount !== 0) rows[i] = `Row ${i + 1}: a waiver row must have ₹0 (NIL) amount.`
    else if (!r.kind.includes('Waiver') && r.amount <= 0) rows[i] = `Row ${i + 1}: enter the monthly ${r.kind} amount.`
  })
  ;(['Rental', 'MG'] as const).forEach((series) => {
    const idx = p.rentalMg.map((r, i) => ({ r, i })).filter(({ r }) => r.kind.startsWith(series)).sort((a, b) => a.r.from - b.r.from)
    if (p.guaranteeType === 'Rental / MG Slab Based' || (series === 'Rental' && p.guaranteeType === 'Fixed Rental') || (series === 'MG' && p.guaranteeType === 'Fixed MG')) {
      if (!idx.length) list.push(`Add the ${series} slabs required by the "${p.guaranteeType}" guarantee type.`)
    }
    const res = validateRanges(idx.map(({ r }) => r), series)
    Object.entries(res.rows).forEach(([k, m]) => {
      const orig = idx[Number(k)].i
      if (!rows[orig]) rows[orig] = `${series} series — ${m.replace(/^Row \d+/, `row ${orig + 1}`)}`
    })
  })
  return { rows, list: [...list, ...Object.values(rows)] }
}
export function validateValidity(p: PlanX, plans: PayoutPlan[]): Errors {
  const e: Errors = {}
  if (!p.effectiveFrom) e.effectiveFrom = 'Effective From is required.'
  if (p.effectiveTo && p.effectiveFrom && p.effectiveTo < p.effectiveFrom) e.effectiveTo = 'Effective To must be on or after Effective From.'
  const prevActive = versionsOf(plans, p.code).find((x) => x.version < p.version && x.status === 'Active')
  if (prevActive && p.effectiveFrom && p.effectiveFrom <= prevActive.effectiveFrom) e.effectiveFrom = `Version ${p.version} must start after version ${prevActive.version} (from ${fmtDate(prevActive.effectiveFrom)}).`
  if (p.tdsPct < 0 || p.tdsPct > 30) e.tdsPct = 'TDS must be between 0% and 30%.'
  if (p.fixedFee < 0) e.fixedFee = 'Cannot be negative.'
  return e
}
export function stepIssues(p: PlanX, plans: PayoutPlan[]) {
  return [
    Object.values(validateDetails(p, plans)),
    [...validateTxnSlabs(p).list, ...validateDepositSlabs(p).list],
    [...validateIncentives(p).list, ...validateRental(p).list],
    Object.values(validateValidity(p, plans)),
  ]
}

// ── maker-checker on plans ─────────────────────────────────────────────────
export const makerOf = (p: PlanX) => p.submittedBy ?? p.createdBy
export function approvalBlock(p: PlanX): string | null {
  if (!can('Approve')) return 'Your role does not have the Approve permission.'
  if (makerOf(p) === currentUser()) return `Maker-checker: ${makerOf(p)} submitted this version and cannot approve it. Sign in as another approver.`
  return null
}
export function approvePlan(p: PlanX) {
  const by = currentUser()
  const dayBefore = addDays(p.effectiveFrom, -1)
  planStore.set((list) =>
    list.map((x) => {
      if (planKey(x) === planKey(p)) return { ...withHistory(p, p.reactivation ? 'Re-activation approved' : 'Approved and activated'), status: 'Active', approvedBy: by, reactivation: false }
      // the older version stays on record for historical calculations; it simply stops at the day before
      if (x.code === p.code && x.version < p.version && x.status === 'Active') {
        const end = x.effectiveTo && x.effectiveTo < dayBefore ? x.effectiveTo : dayBefore
        return { ...x, status: 'Inactive', effectiveTo: end, history: [...x.history, { version: x.version, at: nowIso(), by, note: `Superseded by version ${p.version}` }] }
      }
      return x
    }),
  )
  logPayout({ by, area: 'Plan Mapping', ref: p.code, action: `Plan v${p.version} approved`, after: 'Active' })
  if (apiEnabled) void papi.apiApprovePlan(p)
}

// ── site-wise mapping helpers ──────────────────────────────────────────────
export const BM_FRANCHISEE_MSG = 'Franchisees cannot add, own or map Business Model Sites. Only eligible Master Franchisees and Super Master Franchisees can be assigned BM Sites (§2.3).'
export type BeneficiaryKind = PlanMapping['beneficiaryType']
export const BENEFICIARY_KINDS: BeneficiaryKind[] = ['MF', 'Super MF', 'Franchisee']

export type Entity = {
  site: Site
  vertical: Vertical
  category: string | null // the site's own category in its vertical
  franchisee: { id: string; name: string } | null
  mf: string | null
  superMf: string | null
  city: string
  state: string
}
export function findSite(q: string): Site | undefined {
  const k = q.trim().toLowerCase()
  if (!k) return undefined
  return siteStore.get().sites.find((s) => s.atmId.toLowerCase() === k || s.siteId.toLowerCase() === k)
}
/** Franchise sites fall in WLA CRM when the machine is a CRM, otherwise WLA ATM. */
const franchiseCategoryOf = (s: Site) => (s.machineType === 'CRM' ? 'WLA CRM' : 'WLA ATM')
export function entityOf(site: Site): Entity {
  const b = businessStore.get()
  const fr = franchiseStore.get().find((f) => f.id === site.frId)
  const nodes = networkStore.get().nodes
  if (site.siteType === 'BM') {
    const bm = b.bmSites.find((x) => x.atmId === site.atmId)
    const cat = bm ? b.bmCategories.find((c) => c.code === bm.category)?.name ?? null : null
    return { site, vertical: 'Business Model', category: cat, franchisee: null, mf: bm?.mf && bm.mf !== '—' ? bm.mf : null, superMf: bm?.superMf && bm.superMf !== '—' ? bm.superMf : null, city: site.district, state: site.state }
  }
  const n = nodes[site.frId]
  let mf: string | null = null
  let superMf: string | null = null
  if (n?.parent.kind === 'MF') {
    mf = n.parent.name
    const mfn = nodes[n.parent.id]
    if (mfn?.parent.kind === 'SMF') superMf = mfn.parent.name
  } else if (n?.parent.kind === 'SMF') superMf = n.parent.name
  return { site, vertical: 'Franchise Model', category: franchiseCategoryOf(site), franchisee: fr ? { id: fr.id, name: fr.name } : null, mf, superMf, city: site.district, state: site.state }
}
export const sitesOfVertical = (v: Vertical) => siteStore.get().sites.filter((s) => (v === 'Business Model' ? s.siteType === 'BM' : s.siteType !== 'BM'))

export type MapDraft = { vertical: Vertical | ''; siteCategory: string; planCode: string; beneficiaryType: BeneficiaryKind | ''; effectiveFrom: string; effectiveTo: string }
export const EMPTY_MAP: MapDraft = { vertical: '', siteCategory: '', planCode: '', beneficiaryType: '', effectiveFrom: '', effectiveTo: '' }

export function validateMapBasics(d: MapDraft, plans: PayoutPlan[]): Errors {
  const e: Errors = {}
  if (!d.vertical) e.vertical = 'Select the business vertical.'
  if (!d.siteCategory) e.siteCategory = 'Select the site category.'
  const plan = d.planCode ? activeVersionOf(plans, d.planCode) : undefined
  if (!d.planCode) e.planCode = 'Select an approved plan.'
  else if (!plan) e.planCode = 'This plan has no approved (Active) version.'
  if (!d.beneficiaryType) e.beneficiaryType = 'Select the beneficiary.'
  else if (d.vertical === 'Business Model' && d.beneficiaryType === 'Franchisee') e.beneficiaryType = BM_FRANCHISEE_MSG
  else if (plan && plan.applicableFor === 'Franchisee' && d.beneficiaryType !== 'Franchisee') e.beneficiaryType = `Plan ${plan.code} applies to Franchisees only.`
  else if (plan && plan.applicableFor === 'MF' && d.beneficiaryType === 'Franchisee') e.beneficiaryType = `Plan ${plan.code} applies to MF / Super MF only.`
  if (!d.effectiveFrom) e.effectiveFrom = 'Effective From is required.'
  else if (plan && d.effectiveFrom < plan.effectiveFrom) e.effectiveFrom = `Plan v${plan.version} is valid from ${fmtDate(plan.effectiveFrom)}.`
  if (d.effectiveTo && d.effectiveFrom && d.effectiveTo < d.effectiveFrom) e.effectiveTo = 'Effective To must be on or after Effective From.'
  else if (plan?.effectiveTo && (!d.effectiveTo || d.effectiveTo > plan.effectiveTo)) e.effectiveTo = `Plan v${plan.version} ends on ${fmtDate(plan.effectiveTo)} — set Effective To on or before it.`
  return e
}
export const beneficiaryName = (en: Entity, k: BeneficiaryKind) => (k === 'Franchisee' ? en.franchisee?.name ?? null : k === 'MF' ? en.mf : en.superMf)

/** Per-site check shared by individual, bulk and rule-based mapping. Returns the mapping or the reason it is blocked. */
export function buildMapping(d: MapDraft, site: Site, plans: PayoutPlan[], existing: PlanMapping[], source: MappingSource, rule?: string): { ok: MappingX } | { error: string } {
  const en = entityOf(site)
  const plan = activeVersionOf(plans, d.planCode)
  if (!plan || !d.vertical || !d.beneficiaryType) return { error: 'Mapping details are incomplete.' }
  if (en.vertical !== d.vertical) return { error: `${site.atmId} is a ${en.vertical} site (${site.siteType}); the two verticals never share sites.` }
  if (d.vertical === 'Business Model' && !en.category) return { error: `${site.atmId} is not registered in the Business Model site master.` }
  if (en.category !== d.siteCategory) return { error: `${site.atmId} belongs to site category "${en.category}", not "${d.siteCategory}".` }
  if (d.vertical === 'Business Model' && d.beneficiaryType === 'Franchisee') return { error: BM_FRANCHISEE_MSG }
  const name = beneficiaryName(en, d.beneficiaryType)
  if (!name) return { error: `${site.atmId} has no ${d.beneficiaryType} in its hierarchy.` }
  const m: MappingX = {
    id: `PMAP-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    vertical: d.vertical, siteCategory: d.siteCategory, planCode: plan.code, planVersion: plan.version, atmId: site.atmId, siteId: site.siteId,
    beneficiaryType: d.beneficiaryType, beneficiaryName: name, effectiveFrom: d.effectiveFrom, effectiveTo: d.effectiveTo || null,
    status: 'Pending Approval', maker: currentUser(), source, rule, createdAt: nowIso(),
  }
  const clash = overlapMessage(m, existing)
  if (clash) return { error: clash }
  return { ok: m }
}
export function overlapMessage(m: PlanMapping, list: PlanMapping[], ignoreId?: string): string | null {
  const end = (d: string | null) => d ?? '9999-12-31'
  const x = list.find((o) => o.id !== ignoreId && o.status !== 'Rejected' && o.status !== 'Expired' && o.atmId === m.atmId && o.beneficiaryType === m.beneficiaryType && o.effectiveFrom <= end(m.effectiveTo) && m.effectiveFrom <= end(o.effectiveTo))
  if (!x) return null
  return `${m.atmId} already has plan ${x.planCode} v${x.planVersion} for ${x.beneficiaryType} ${fmtDate(x.effectiveFrom)} – ${x.effectiveTo ? fmtDate(x.effectiveTo) : 'open'} (${x.status}). Only one plan per site, beneficiary and period is allowed (§10.3).`
}
export function addMappings(ms: MappingX[]) {
  if (!ms.length) return
  planMappingStore.set((l) => [...ms, ...l])
  if (apiEnabled) {
    // one backend call per identical mapping definition (the server re-checks every site and skips invalid ones)
    const groups = new Map<string, MappingX[]>()
    ms.forEach((m) => {
      const k = [m.vertical, m.siteCategory, m.planCode, m.beneficiaryType, m.effectiveFrom, m.effectiveTo ?? '', m.source ?? '', m.rule ?? ''].join('|')
      groups.set(k, [...(groups.get(k) ?? []), m])
    })
    groups.forEach((g) => {
      const m = g[0]
      void papi.apiCreateMappings({ vertical: m.vertical, siteCategory: m.siteCategory, planCode: m.planCode, beneficiaryType: m.beneficiaryType, effectiveFrom: m.effectiveFrom, effectiveTo: m.effectiveTo, atmIds: g.map((x) => x.atmId), source: m.source ?? 'Individual', rule: m.rule, remarks: m.remarks })
    })
  }
}
export function mappingApprovalBlock(m: MappingX): string | null {
  if (!can('Approve')) return 'Your role does not have the Approve permission.'
  if (m.maker === currentUser()) return 'Maker-checker: you submitted this mapping and cannot approve it.'
  return null
}
/** Display status — an approved mapping past its end date reads as Expired. */
export const mappingStatus = (m: PlanMapping) => (m.status === 'Active' && m.effectiveTo && m.effectiveTo < today() ? 'Expired' : m.status)

export const gstOf = (p: PayoutPlan) => pctOf(p.investment.upfrontFee, p.investment.gstRate)
export type { DepositSlab, TxnSlab, Incentive, RentalMg }

/**
 * Bulk / rule-based run: each site is checked on its own (vertical, category, beneficiary, overlap —
 * including against mappings created earlier in the same run). Valid ones are created as Pending Approval.
 */
export function runMappings(d: MapDraft, sites: Site[], source: MappingSource, rule?: string) {
  const plans = planStore.get()
  const existing: PlanMapping[] = [...planMappingStore.get()]
  const created: MappingX[] = []
  const skipped: { atmId: string; reason: string }[] = []
  sites.forEach((s) => {
    const r = buildMapping(d, s, plans, existing, source, rule)
    if ('ok' in r) {
      created.push(r.ok)
      existing.push(r.ok)
    } else skipped.push({ atmId: s.atmId, reason: r.error })
  })
  addMappings(created)
  logPayout({ by: currentUser(), area: 'Plan Mapping', ref: d.planCode, action: `${source} mapping: ${created.length} created, ${skipped.length} skipped`, after: rule })
  return { created: created.map((m) => ({ atmId: m.atmId, id: m.id })), skipped }
}
export function logPlanMapping(m: MappingX, action: string) {
  logPayout({ by: currentUser(), area: 'Plan Mapping', ref: m.atmId, action, after: `${m.planCode} v${m.planVersion} · ${m.beneficiaryType} ${m.beneficiaryName}` })
}
/** Checker decision on a pending mapping. Approval re-checks the plan version and overlaps. */
export function decideMapping(m: MappingX, approve: boolean, remarks?: string): string | null {
  if (approve) {
    const block = mappingApprovalBlock(m)
    if (block) return block
    const plan = planStore.get().find((p) => p.code === m.planCode && p.version === m.planVersion)
    if (!plan || plan.status !== 'Active') return `${m.planCode} v${m.planVersion} is no longer Active — reject and re-map to the current version.`
    const clash = overlapMessage(m, planMappingStore.get().filter((x) => x.status === 'Active'), m.id)
    if (clash) return clash
  } else if (!can('Reject')) return 'Your role does not have the Reject permission.'
  const by = currentUser()
  planMappingStore.set((l) => l.map((x) => (x.id === m.id ? ({ ...x, status: approve ? 'Active' : 'Rejected', checker: by, remarks, decidedAt: nowIso() } as MappingX) : x)))
  logPlanMapping(m, approve ? 'Mapping approved' : `Mapping rejected${remarks ? `: ${remarks}` : ''}`)
  if (apiEnabled) void papi.apiDecideMapping(m.id, approve, remarks)
  return null
}
