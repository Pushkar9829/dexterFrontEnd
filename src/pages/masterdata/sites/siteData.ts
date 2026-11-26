// Site Master helpers + local store (custom columns, hidden columns, drafts, legal file names).
// Shared models live in src/data/network.ts — this file only adds Site Master UI state.
import { createStore } from '@/lib/store'
import type { Franchise } from '@/data/franchises'
import {
  COMPLETION_STEPS, LEGAL_SEQUENCE, accountStatusOf, agreementStatusOf, completionOf, deptUsers, legalStatusOf, nowIso, projectStatusOf,
  type Categories, type LegalDocKey, type NetworkState, type Site, type StepState,
} from '@/data/network'
import type { MasterAccess, Role } from '@/lib/rbac'

// ── local store ──────────────────────────────────────────────────────────
export type CustomColumn = { key: string; label: string; createdOn: string; createdBy: string }
export type SiteDraft = {
  siteId: string; atmId: string; projectId: string; frId: string; projectType: string; plan: string; siteType: string; machineType: string
  location: string; address: string; state: string; district: string; pin: string; investment: string
}
export type SiteMasterState = {
  custom: CustomColumn[]
  hidden: string[] // column keys hidden by Admin
  values: Record<string, Record<string, string>> // siteId → custom column key → value
  draft: SiteDraft | null
  legalFiles: Record<string, Partial<Record<LegalDocKey, string>>> // siteId → doc → file name
}
export const siteMasterStore = createStore<SiteMasterState>('dexter.siteMaster.v1', () => ({ custom: [], hidden: [], values: {}, draft: null, legalFiles: {} }))
export const useSiteMaster = () => siteMasterStore.use()

export const emptyDraft = (): SiteDraft => ({
  siteId: '', atmId: '', projectId: '', frId: '', projectType: '', plan: '', siteType: '', machineType: '',
  location: '', address: '', state: '', district: '', pin: '', investment: '',
})

// ── hierarchy (walk networkStore parents of an FR) ─────────────────────
export type Hierarchy = { smf: string; mf: string; tl: string; parentLabel: string }
export function hierarchyOf(net: NetworkState, frId: string): Hierarchy {
  const h: Hierarchy = { smf: '', mf: '', tl: '', parentLabel: '' }
  const first = net.nodes[frId]
  if (!first) return h
  h.parentLabel = `${first.parent.kind} · ${first.parent.name}`
  let cur = first
  const seen = new Set<string>([frId])
  for (let i = 0; i < 6; i++) {
    const p = cur.parent
    if (p.kind === 'SMF' && !h.smf) h.smf = p.name
    if (p.kind === 'MF' && !h.mf) h.mf = p.name
    if (p.kind === 'Team Leader' && !h.tl) h.tl = p.name
    const next = net.nodes[p.id]
    if (!next || seen.has(p.id)) break
    seen.add(p.id)
    cur = next
  }
  return h
}

// ── role helpers ─────────────────────────────────────────────────────────
export const isAdmin = (role: Role) => role === 'Super Admin' || role === 'Admin'
/** Full account numbers only for Finance and Admin; everyone else sees them masked (DPDP / §19). */
export const canSeeAccountNo = (role: Role) => isAdmin(role) || role === 'Finance Team'
export const canApproveAccount = (role: Role) => isAdmin(role) || role === 'Finance Team'

export type TabKey = 'basic' | 'progress' | 'investment' | 'account' | 'payout' | 'legal' | 'tis' | 'engineer' | 'manager' | 'custom' | 'history'
export const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: 'Basic & Site' },
  { key: 'progress', label: 'Project & Progress' },
  { key: 'investment', label: 'Investment' },
  { key: 'account', label: 'Account' },
  { key: 'payout', label: 'Payout' },
  { key: 'legal', label: 'Legal' },
  { key: 'tis', label: 'TIS' },
  { key: 'engineer', label: 'Engineer' },
  { key: 'manager', label: 'Manager / RM' },
  { key: 'custom', label: 'Custom Fields' },
  { key: 'history', label: 'History' },
]
const VISIBLE_TABS: Record<Exclude<MasterAccess, 'none'>, TabKey[]> = {
  full: TABS.map((t) => t.key),
  project: TABS.map((t) => t.key),
  finance: ['basic', 'account', 'payout', 'history'],
  legal: ['basic', 'legal', 'history'],
}
const EDIT_TABS: Record<Exclude<MasterAccess, 'none'>, TabKey[]> = {
  full: TABS.map((t) => t.key),
  project: ['basic', 'progress', 'investment', 'tis', 'engineer', 'manager', 'custom'],
  finance: ['account', 'payout'],
  legal: ['legal'],
}
export const visibleTabs = (a: MasterAccess) => (a === 'none' ? [] : VISIBLE_TABS[a])
export const canEditTab = (a: MasterAccess, t: TabKey) => a !== 'none' && EDIT_TABS[a].includes(t)

// ── formatting ───────────────────────────────────────────────────────────
export const fmtDate = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
export const fmtDateTime = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
export const daysSince = (iso?: string) => (iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400_000)) : 0)
export const inrFmt = (n: number) => `₹ ${n.toLocaleString('en-IN')}`
export const todayIso = () => new Date().toISOString().slice(0, 10)
export const catName = (cats: Categories, key: keyof Categories, code?: string) => (code ? (cats[key].find((c) => c.code === code)?.name ?? code) : '')

export const COMPLETION_BUCKETS = ['Completed (100%)', '75–99%', '50–74%', '25–49%', 'Below 25%'] as const
export function bucketOf(pct: number) {
  if (pct >= 100) return COMPLETION_BUCKETS[0]
  if (pct >= 75) return COMPLETION_BUCKETS[1]
  if (pct >= 50) return COMPLETION_BUCKETS[2]
  if (pct >= 25) return COMPLETION_BUCKETS[3]
  return COMPLETION_BUCKETS[4]
}

// ── row model for the list ───────────────────────────────────────────────
export type SiteRow = {
  site: Site
  frName: string
  h: Hierarchy
  pct: number
  projectStatus: string
  legalStatus: string
  accountStatus: string
  agreementStatus: string
  accountType: string
  tisBy: string
}
export function buildRows(sites: Site[], frMap: Map<string, Franchise>, net: NetworkState, cats: Categories): SiteRow[] {
  const hCache = new Map<string, Hierarchy>()
  return sites.map((s) => {
    let h = hCache.get(s.frId)
    if (!h) {
      h = hierarchyOf(net, s.frId)
      hCache.set(s.frId, h)
    }
    const tis = s.tis ? (s.tis.otherName ? `${s.tis.createdBy} — ${s.tis.otherName}` : s.tis.createdBy) : ''
    return {
      site: s,
      frName: frMap.get(s.frId)?.name ?? '',
      h,
      pct: completionOf(s).pct,
      projectStatus: projectStatusOf(s),
      legalStatus: legalStatusOf(s),
      accountStatus: accountStatusOf(s),
      agreementStatus: agreementStatusOf(s),
      accountType: catName(cats, 'settlementTypes', s.account?.type),
      tisBy: tis,
    }
  })
}

/** Fresh site for the create form: every step Not Started except onboarding (§10 — data fills in later). */
export function newSiteFrom(d: SiteDraft): Site {
  const now = nowIso()
  const steps: Record<string, StepState> = {}
  COMPLETION_STEPS.forEach((c) => {
    steps[c.key] = { status: c.key === 'onboarding' ? 'Completed' : 'Not Started', assignedTo: deptUsers[c.dept][0], since: now, updatedAt: now }
  })
  return {
    siteId: d.siteId.trim(), atmId: d.atmId.trim().toUpperCase(), projectId: d.projectId.trim(), frId: d.frId.trim(),
    projectType: d.projectType, plan: d.plan, siteType: d.siteType, machineType: d.machineType,
    location: d.location.trim(), address: d.address.trim(), state: d.state, district: d.district.trim(), pin: d.pin.trim(),
    investment: Number(d.investment) || 0, operational: false, monthlyTxns: 0,
    accountHistory: [], engineerHistory: [], managerHistory: [],
    payout: { bank: '', accountNo: '', ifsc: '', status: 'Pending' },
    steps,
    legal: Object.fromEntries(LEGAL_SEQUENCE.map((k) => [k, { upload: 'Pending', verification: 'Pending', final: 'Pending' }])) as Site['legal'],
    installation: 'Not Started',
    updatedAt: now,
  }
}

export const PIN_RE = /^[1-9]\d{5}$/
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/
export const ACCOUNT_RE = /^\d{9,18}$/
