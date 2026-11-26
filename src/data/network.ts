// Franchise network + Master Data (site master) — shared model for the
// "Franchise & Master Data Management" spec (20.11.2026).
// Mock only: everything lives in localStorage via createStore until the backend exists.
import { useEffect, useState } from 'react'
import { createStore } from '@/lib/store'
import { ApiError, apiEnabled, get, patch as apiPatch, post, put } from '@/lib/api'
import { toast } from '@/components/ui/Toast'
import { franchiseStore, STATE_CODE, type Franchise, type Tier } from './franchises'
import { LOCATIONS } from './applications'

// ── helpers ──────────────────────────────────────────────────────────────
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}
const pick = <T,>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)]
export const nowIso = () => new Date().toISOString()
let seq = 0
export const uid = (p: string) => `${p}-${Date.now().toString(36).toUpperCase()}${(seq++).toString(36).toUpperCase()}`
export const CURRENT_ACTOR = 'Paras Dubey'

// ── Category masters (Admin can add more) — spec §8 ──────────────────────
export type CategoryKey = 'projectTypes' | 'plans' | 'siteTypes' | 'settlementTypes' | 'machineTypes' | 'engineerTypes' | 'tisCreatedBy'
export type CategoryItem = { code: string; name: string; description?: string; category?: string; active: boolean }
export type Categories = Record<CategoryKey, CategoryItem[]>

export const CATEGORY_META: Record<CategoryKey, { title: string; sub: string; withCategory?: boolean }> = {
  projectTypes: { title: 'Project Type', sub: 'HPY, XYZ, BANK and other project types (§8.1)' },
  plans: { title: 'Plan Type', sub: 'Plan ID, plan name and plan category — drives mobile app features (§8.2)', withCategory: true },
  siteTypes: { title: 'Type of Sites', sub: 'FFM / SF / CRA / BM — links project, investment, finance and operations workflow (§8.3)' },
  settlementTypes: { title: 'Account / Settlement Type', sub: 'WLA Account, Axis Indent, ICICI Bank (§8.4)' },
  machineTypes: { title: 'ATM Machine Type', sub: 'NCR, Perto, CRM (§8.5)' },
  engineerTypes: { title: 'Engineer Type', sub: 'ATM / UPS / Network (§12.1)' },
  tisCreatedBy: { title: 'TIS Created By', sub: 'Franchise, Master Franchise, WLA Operator, Other (§16)' },
}

const seedCategories = (): Categories => ({
  projectTypes: [
    { code: 'HPY', name: 'HPY', active: true },
    { code: 'XYZ', name: 'XYZ', active: true },
    { code: 'BANK', name: 'BANK', active: true },
  ],
  plans: [
    { code: 'PL-01', name: 'Silver', category: 'Standard', active: true },
    { code: 'PL-02', name: 'Gold', category: 'Premium', active: true },
    { code: 'PL-03', name: 'Platinum', category: 'Premium', active: true },
  ],
  siteTypes: [
    { code: 'FFM', name: 'Full Funding Model', description: 'फुल फंडिंग मॉडल', active: true },
    { code: 'SF', name: 'Self Funding Model', description: 'सेल्फ फंडिंग मॉडल', active: true },
    { code: 'CRA', name: 'Cash Replacement Agency', description: 'कैश रिप्लेसमेंट एजेंसी', active: true },
    { code: 'BM', name: 'Business Model', description: 'बिजनेस मॉडल', active: true },
  ],
  settlementTypes: [
    { code: 'WLA', name: 'WLA Account', description: 'Current account opened in any designated bank', active: true },
    { code: 'AXIS', name: 'Axis Indent', description: "Through the parent company's Axis Bank account", active: true },
    { code: 'ICICI', name: 'ICICI Bank', description: 'ICICI Bank account via the SR process', active: true },
  ],
  machineTypes: [
    { code: 'NCR', name: 'NCR', active: true },
    { code: 'PERTO', name: 'Perto', active: true },
    { code: 'CRM', name: 'CRM', active: true },
  ],
  engineerTypes: [
    { code: 'ATM', name: 'ATM', active: true },
    { code: 'UPS', name: 'UPS', active: true },
    { code: 'NET', name: 'Network', active: true },
  ],
  tisCreatedBy: [
    { code: 'FR', name: 'Franchise (FR)', active: true },
    { code: 'MF', name: 'Master Franchise (MF)', active: true },
    { code: 'WLA', name: 'WLA Operator', active: true },
    { code: 'OTHER', name: 'Other', active: true },
  ],
})
export const categoryStore = createStore<Categories>('dexter.categories.v1', seedCategories)
export const useCategories = () => categoryStore.use()
export function addCategoryItem(key: CategoryKey, item: Omit<CategoryItem, 'active'>) {
  if (apiEnabled) {
    post<CategoryItem>(`/categories/${key}`, { code: item.code, name: item.name, description: item.description, category: item.category })
      .then((c) => categoryStore.set((cs) => ({ ...cs, [key]: [...cs[key], { code: c.code, name: c.name, description: c.description, category: c.category, active: c.active ?? true }] })))
      .catch((e: Error) => toast(e.message || 'Could not add the category item.', 'error'))
    return
  }
  categoryStore.set((c) => ({ ...c, [key]: [...c[key], { ...item, active: true }] }))
  logMasterAudit({ entity: 'Category', ref: key, action: 'Created', after: item.code })
}
export function toggleCategoryItem(key: CategoryKey, code: string) {
  if (apiEnabled) {
    post<CategoryItem>(`/categories/${key}/${encodeURIComponent(code)}/toggle`)
      .then((c) => categoryStore.set((cs) => ({ ...cs, [key]: cs[key].map((x) => (x.code === code ? { ...x, active: c.active } : x)) })))
      .catch((e: Error) => toast(e.message || 'Could not change the category item.', 'error'))
    return
  }
  categoryStore.set((c) => ({ ...c, [key]: c[key].map((i) => (i.code === code ? { ...i, active: !i.active } : i)) }))
  logMasterAudit({ entity: 'Category', ref: key, action: 'Status changed', after: code })
}

// ── People: team leaders, engineers, managers / RM ───────────────────────
export type Person = { id: string; name: string; mobile: string; email: string; empCode?: string; department?: string; reportingManager?: string; type?: string }
const FIRST = ['Amit', 'Rahul', 'Suresh', 'Vikas', 'Neha', 'Pooja', 'Rakesh', 'Sanjay', 'Deepak', 'Anil', 'Kavita', 'Manoj', 'Ritu', 'Ajay', 'Sunil', 'Kiran']
const LAST = ['Sharma', 'Verma', 'Singh', 'Yadav', 'Gupta', 'Patel', 'Kumar', 'Mishra', 'Joshi', 'Chauhan', 'Rao', 'Nair']
function people(prefix: string, n: number, seed: number, extra: (r: () => number, i: number) => Partial<Person> = () => ({})): Person[] {
  const r = rng(seed)
  return Array.from({ length: n }, (_, i) => {
    const name = `${pick(r, FIRST)} ${pick(r, LAST)}`
    return {
      id: `${prefix}-${String(101 + i)}`,
      name,
      mobile: `9${Math.floor(100000000 + r() * 899999999)}`,
      email: `${name.toLowerCase().replace(' ', '.')}@dexterindia.in`,
      ...extra(r, i),
    }
  })
}
export const TEAM_LEADERS = people('TL', 8, 5, () => ({ department: 'Field Operations' }))
export const ENGINEERS = people('ENG', 24, 7, (r) => ({ type: pick(r, ['ATM', 'UPS', 'Network'] as const) }))
export const MANAGERS = people('RM', 10, 9, (r, i) => ({ empCode: `DX-EMP-${2040 + i}`, department: pick(r, ['Project', 'Operations', 'CRM']), reportingManager: 'Meera Iyer' }))

// ── Hierarchy & entity — spec §1, §3, §5, §24.2 ──────────────────────────
export type EntityType = 'Individual' | 'Partnership' | 'Private Limited' | 'Firm'
export const ENTITY_TYPES: EntityType[] = ['Individual', 'Partnership', 'Private Limited', 'Firm']
export const ENTITY_DOCS: Record<EntityType, string[]> = {
  Individual: ['PAN', 'KYC (Aadhaar / permitted)'],
  Partnership: ['Partnership Deed', 'PAN', 'KYC'],
  'Private Limited': ['Certificate of Incorporation', 'PAN', 'GST', 'Authorized Signatory'],
  Firm: ['Firm Registration', 'PAN', 'GST'],
}
export type ParentKind = 'SMF' | 'MF' | 'Company' | 'Team Leader'
export type ParentRef = { kind: ParentKind; id: string; name: string }
export const COMPANY: ParentRef = { kind: 'Company', id: 'DEXTER', name: 'Dexter India (Direct Company)' }

export type NetworkStatus = 'Draft' | 'Pending Approval' | 'Active' | 'Inactive' | 'Hold' | 'Suspended' | 'Exited'
export const NETWORK_STATUSES: NetworkStatus[] = ['Draft', 'Pending Approval', 'Active', 'Inactive', 'Hold', 'Suspended', 'Exited']

export type MappingHistory = { id: string; from?: ParentRef; to: ParentRef; at: string; by: string; approvedBy?: string; reason: string; transferId?: string }
export type NetworkNode = {
  frId: string // franchise id (FR-xx-xxxxx) — works for SMF / MF / FR
  tier: Tier
  code: string // SMF-0001 / MF-0001 / FR-10001 — system code per tier
  partnerCode: string
  entity: EntityType
  parent: ParentRef
  status: NetworkStatus
  agreementNo: string
  agreementDate: string
  agreementValidTill: string
  nocPending: boolean
  reportingManager: string
  assignedTeam: string
  history: MappingHistory[]
  entityHistory: { at: string; from: EntityType; to: EntityType; by: string }[]
}
export type NetworkState = { nodes: Record<string, NetworkNode> }

const TIER_CODE: Record<Tier, string> = { 'Super Master': 'SMF', Master: 'MF', Franchise: 'FR' }
export const tierCode = (t: Tier) => TIER_CODE[t]

function seedNetwork(): NetworkState {
  const r = rng(21)
  const frs = franchiseStore.get()
  const smfs = frs.filter((f) => f.tier === 'Super Master')
  const mfs = frs.filter((f) => f.tier === 'Master')
  const nodes: Record<string, NetworkNode> = {}
  const counters: Record<Tier, number> = { 'Super Master': 0, Master: 0, Franchise: 10000 }
  const ref = (f: Franchise, kind: ParentKind): ParentRef => ({ kind, id: f.id, name: f.name })
  const base = new Date('2025-04-01').getTime()
  frs.forEach((f) => {
    counters[f.tier]++
    let parent: ParentRef = COMPANY
    if (f.tier === 'Master') parent = r() < 0.75 ? ref(pick(r, smfs), 'SMF') : COMPANY
    if (f.tier === 'Franchise') {
      const x = r()
      parent = x < 0.8 ? ref(pick(r, mfs), 'MF') : x < 0.9 ? { kind: 'Team Leader', ...pick(r, TEAM_LEADERS) } : COMPANY
      parent = { kind: parent.kind, id: parent.id, name: parent.name }
    }
    const ad = new Date(base + Math.floor(r() * 400) * 86400_000)
    const code = f.tier === 'Franchise' ? `FR-${counters.Franchise}` : `${TIER_CODE[f.tier]}-${String(counters[f.tier]).padStart(4, '0')}`
    nodes[f.id] = {
      frId: f.id,
      tier: f.tier,
      code,
      partnerCode: `PC-${STATE_CODE[f.state] ?? 'XX'}-${String(Math.floor(r() * 9000) + 1000)}`,
      entity: pick(r, ENTITY_TYPES),
      parent,
      status: f.status === 'Inactive' ? 'Inactive' : r() < 0.03 ? 'Hold' : 'Active',
      agreementNo: `AGR-${ad.getFullYear()}-${String(Math.floor(r() * 90000) + 10000)}`,
      agreementDate: ad.toISOString().slice(0, 10),
      agreementValidTill: new Date(ad.getTime() + 3 * 365 * 86400_000).toISOString().slice(0, 10),
      nocPending: r() < 0.06,
      reportingManager: pick(r, MANAGERS).name,
      assignedTeam: pick(r, ['CRM North', 'CRM West', 'CRM South', 'CRM East']),
      history: [{ id: uid('MAP'), to: parent, at: ad.toISOString(), by: 'CRM Team', approvedBy: 'Admin', reason: 'Initial onboarding mapping' }],
      entityHistory: [],
    }
  })
  return { nodes }
}
export const networkStore = createStore<NetworkState>('dexter.network.v1', seedNetwork)
export const useNetwork = () => networkStore.use()

/** Network node for a franchise; creates a default one for franchises added after seeding. */
export function nodeOf(f: Franchise): NetworkNode {
  const n = networkStore.get().nodes[f.id]
  if (n) return n
  const node: NetworkNode = {
    frId: f.id, tier: f.tier, code: `${TIER_CODE[f.tier]}-NEW`, partnerCode: '—', entity: 'Individual', parent: COMPANY, status: 'Pending Approval',
    agreementNo: '', agreementDate: '', agreementValidTill: '', nocPending: false, reportingManager: '', assignedTeam: '',
    history: [{ id: uid('MAP'), to: COMPANY, at: nowIso(), by: CURRENT_ACTOR, reason: 'Created' }], entityHistory: [],
  }
  networkStore.set((s) => ({ nodes: { ...s.nodes, [f.id]: node } }))
  return node
}
export function updateNode(frId: string, patch: Partial<NetworkNode>) {
  networkStore.set((s) => ({ nodes: { ...s.nodes, [frId]: { ...s.nodes[frId], ...patch } } }))
}
/** Change the current parent; the old mapping is never deleted — it is kept in history (§6.3, §24.2). */
export function remapParent(frId: string, to: ParentRef, reason: string, opts: { approvedBy?: string; transferId?: string } = {}) {
  const node = networkStore.get().nodes[frId]
  if (!node) return
  const h: MappingHistory = { id: uid('MAP'), from: node.parent, to, at: nowIso(), by: CURRENT_ACTOR, reason, ...opts }
  updateNode(frId, { parent: to, history: [h, ...node.history] })
  logMasterAudit({ entity: 'Hierarchy', ref: frId, action: 'Parent mapping changed', before: `${node.parent.kind} ${node.parent.name}`, after: `${to.kind} ${to.name}` })
}
/** Children of a parent (MFs under an SMF, FRs under an MF, …). */
export const childrenOf = (s: NetworkState, parentId: string) => Object.values(s.nodes).filter((n) => n.parent.id === parentId)

// ── Site Master (Master Data) — spec §7–§12 ──────────────────────────────
export type StepStatus = 'Not Started' | 'Pending' | 'In Progress' | 'Email Submitted' | 'Completed' | 'On Hold'
export const STEP_STATUSES: StepStatus[] = ['Not Started', 'Pending', 'In Progress', 'Email Submitted', 'Completed', 'On Hold']
export type Department = 'Project' | 'Legal' | 'Finance' | 'Operations' | 'Technical'
/** Completion pipeline (§10.1) with the owning department (§11.1). */
export const COMPLETION_STEPS: { key: string; label: string; dept: Department }[] = [
  { key: 'onboarding', label: 'Franchise Onboarding (Registration, KYC, Basic info)', dept: 'Project' },
  { key: 'projectMapping', label: 'Project Mapping (Project ID, Site ID, Type, Plan)', dept: 'Project' },
  { key: 'tis', label: 'TIS Creation', dept: 'Project' },
  { key: 'siteSetup', label: 'Site Setup, Installation & Signage', dept: 'Project' },
  { key: 'assetsDelivery', label: 'Assets Delivery', dept: 'Project' },
  { key: 'sdMapping', label: 'SD Mapping', dept: 'Finance' },
  { key: 'accountMapping', label: 'Account Mapping (WLA / Axis Indent / ICICI + Payout)', dept: 'Finance' },
  { key: 'legal', label: 'Legal Completion (LOI, Affidavit, Agreement, CLF, Apna App, KYC, PVC)', dept: 'Legal' },
  { key: 'engineerMapping', label: 'Engineer Mapping', dept: 'Technical' },
  { key: 'firstTxn', label: '1st Transaction Starting', dept: 'Operations' },
  { key: 'final', label: 'Final Project Completion + Inauguration Photos', dept: 'Project' },
]
export type StepState = { status: StepStatus; assignedTo: string; since: string; remark?: string; updatedAt?: string }

export type LegalDocKey = 'LOI' | 'Affidavit' | 'Agreement' | 'KYC' | 'PVC'
export const LEGAL_SEQUENCE: LegalDocKey[] = ['LOI', 'Affidavit', 'Agreement', 'KYC', 'PVC']
export type LegalTrack = { upload: 'Uploaded' | 'Pending'; verification: 'Pending' | 'Verified' | 'Rejected' | 'Re-upload Required'; final: 'Complete' | 'Pending' }

export type AccountMapping = {
  type: string // settlement type code
  bank: string
  holder: string
  accountNo: string
  ifsc: string
  branch: string
  mappedOn: string
  approval: 'Pending' | 'Approved' | 'Rejected'
  settlement: 'Active' | 'Pending' | 'Stopped'
}
export type PayoutMapping = { bank: string; accountNo: string; ifsc: string; status: 'Mapped' | 'Pending' }
/** Pending payout-mapping change (API: PUT /sites/:id/payout → 202). The current mapping stays in force until approved. */
export type PayoutRequest = { bank: string; accountNo: string; ifsc: string; status: 'Pending'; requestedBy?: string; requestedByName?: string; requestedAt?: string }
/** Pending settlement-status change (API: POST /sites/:id/account/settlement). */
export type SettlementRequest = { to: AccountMapping['settlement']; reason: string; requestedBy?: string; requestedByName?: string; requestedAt?: string }
export type SettlementChange = { from: string; to: string; reason?: string; requestedByName?: string; requestedAt?: string; decision: 'Approved' | 'Rejected'; decidedByName?: string; decidedAt?: string; remark?: string }
export type EngineerAssignment = { engineerId: string; name: string; mobile: string; type: string; assignedOn: string; assignedBy: string }
export type ManagerAssignment = { managerId: string; name: string; empCode: string; mobile: string; email: string; department: string; reportingManager: string; mappedOn: string }
export type TisDetails = { createdBy: string; otherName?: string; responsible: string; createdOn: string; photos: number; verification: 'Pending' | 'Verified' | 'Rejected'; verifiedBy?: string; remarks?: string }

export type Site = {
  siteId: string // manual unique Site ID (§2 principle)
  atmId: string // ATM ID — the final base for everything (§8.7 note)
  projectId: string
  frId: string
  projectType: string
  plan: string
  siteType: string // FFM / SF / CRA / BM
  machineType: string
  location: string
  address: string
  state: string
  district: string
  pin: string
  investment: number
  operational: boolean
  monthlyTxns: number
  account?: AccountMapping
  accountHistory: (AccountMapping & { replacedOn: string; replacedBy: string })[]
  payout?: PayoutMapping
  payoutRequest?: PayoutRequest
  settlementRequest?: SettlementRequest
  settlementHistory?: SettlementChange[]
  engineer?: EngineerAssignment
  engineerHistory: (EngineerAssignment & { removedOn: string })[]
  manager?: ManagerAssignment
  managerHistory: (ManagerAssignment & { removedOn: string })[]
  tis?: TisDetails
  steps: Record<string, StepState>
  legal: Record<LegalDocKey, LegalTrack>
  installation: StepStatus
  updatedAt: string
}
export type SiteState = { sites: Site[] }

const BANKS = ['HDFC Bank', 'Axis Bank', 'ICICI Bank', 'State Bank of India', 'Kotak Mahindra Bank', 'Bank of Baroda']
const DEPT_USERS: Record<Department, string[]> = {
  Project: ['Rohit Verma', 'Arjun Sethi'],
  Legal: ['Meera Iyer', 'Kavita Rao'],
  Finance: ['Priya Nair', 'Sanjay Gupta'],
  Operations: ['Vikram Mehta', 'Deepak Joshi'],
  Technical: ['Manoj Kumar', 'Ajay Chauhan'],
}
export const deptUsers = DEPT_USERS

function seedSites(): SiteState {
  const r = rng(33)
  const frs = franchiseStore.get().filter((f) => f.tier === 'Franchise').slice(0, 140)
  const cats = seedCategories()
  const sites: Site[] = []
  let siteNo = 1
  const today = new Date('2026-11-23').getTime()
  frs.forEach((f) => {
    const count = Math.max(1, Math.min(9, Math.round(f.atms / 2)))
    for (let k = 0; k < count; k++) {
      const n = siteNo++
      const progress = r() // how far along the pipeline this site is
      const doneCount = Math.floor(progress * (COMPLETION_STEPS.length + 1))
      const steps: Record<string, StepState> = {}
      COMPLETION_STEPS.forEach((s, i) => {
        const daysAgo = Math.floor(r() * 60) + 1
        let status: StepStatus = 'Not Started'
        if (i < doneCount) status = 'Completed'
        else if (i === doneCount) status = pick(r, ['Pending', 'In Progress', 'Email Submitted', 'On Hold', 'Pending'] as StepStatus[])
        else status = i === doneCount + 1 ? 'Pending' : 'Not Started'
        steps[s.key] = { status, assignedTo: pick(r, DEPT_USERS[s.dept]), since: new Date(today - daysAgo * 86400_000).toISOString(), remark: status === 'On Hold' ? 'Awaiting franchisee documents' : undefined }
      })
      const lt = (): LegalTrack => {
        const x = r()
        return x < 0.55 ? { upload: 'Uploaded', verification: 'Verified', final: 'Complete' } : x < 0.75 ? { upload: 'Uploaded', verification: 'Pending', final: 'Pending' } : x < 0.82 ? { upload: 'Uploaded', verification: 'Re-upload Required', final: 'Pending' } : { upload: 'Pending', verification: 'Pending', final: 'Pending' }
      }
      const legal = Object.fromEntries(LEGAL_SEQUENCE.map((d) => [d, lt()])) as Record<LegalDocKey, LegalTrack>
      const accDone = steps.accountMapping.status === 'Completed'
      const st = pick(r, cats.settlementTypes).code
      const bank = st === 'AXIS' ? 'Axis Bank' : st === 'ICICI' ? 'ICICI Bank' : pick(r, BANKS)
      const eng = steps.engineerMapping.status === 'Completed' ? pick(r, ENGINEERS) : undefined
      const mgr = pick(r, MANAGERS)
      const city = f.city
      const state = f.state
      const tisBy = pick(r, cats.tisCreatedBy)
      sites.push({
        siteId: `SITE-${STATE_CODE[state] ?? 'XX'}-${String(n).padStart(4, '0')}`,
        atmId: `DX${STATE_CODE[state] ?? 'XX'}${String(70000 + n * 7)}`,
        projectId: `PRJ-2026-${String(n).padStart(4, '0')}`,
        frId: f.id,
        projectType: pick(r, ['HPY', 'XYZ', 'BANK']),
        plan: pick(r, ['Silver', 'Gold', 'Platinum']),
        siteType: pick(r, ['FFM', 'SF', 'CRA', 'BM']),
        machineType: pick(r, ['NCR', 'Perto', 'CRM']),
        location: `${pick(r, ['Main Road', 'Market Yard', 'Bus Stand', 'Station Road', 'Chowk', 'Highway'])}, ${city}`,
        address: `Shop ${Math.floor(r() * 90) + 1}, ${pick(r, ['Gandhi Nagar', 'Shivaji Path', 'Nehru Colony', 'MG Road', 'Civil Lines'])}, ${city}`,
        state,
        district: city,
        pin: String(400000 + Math.floor(r() * 99999)),
        investment: (Math.floor(r() * 8) + 4) * 100000,
        operational: steps.firstTxn.status === 'Completed',
        monthlyTxns: steps.firstTxn.status === 'Completed' ? Math.floor(r() * 4000) + 400 : 0,
        account: accDone || r() < 0.4 ? {
          type: st, bank, holder: f.name, accountNo: String(Math.floor(r() * 9e11) + 1e11), ifsc: `${bank.slice(0, 4).toUpperCase()}0${String(Math.floor(r() * 900000) + 100000)}`,
          branch: `${city} Main`, mappedOn: new Date(today - Math.floor(r() * 200) * 86400_000).toISOString().slice(0, 10), approval: accDone ? 'Approved' : 'Pending', settlement: accDone ? 'Active' : 'Pending',
        } : undefined,
        accountHistory: [],
        payout: accDone ? { bank: pick(r, BANKS), accountNo: String(Math.floor(r() * 9e11) + 1e11), ifsc: 'HDFC0001234', status: 'Mapped' } : { bank: '', accountNo: '', ifsc: '', status: 'Pending' },
        engineer: eng ? { engineerId: eng.id, name: eng.name, mobile: eng.mobile, type: eng.type ?? 'ATM', assignedOn: new Date(today - Math.floor(r() * 120) * 86400_000).toISOString().slice(0, 10), assignedBy: 'Manoj Kumar' } : undefined,
        engineerHistory: [],
        manager: { managerId: mgr.id, name: mgr.name, empCode: mgr.empCode ?? '', mobile: mgr.mobile, email: mgr.email, department: mgr.department ?? '', reportingManager: mgr.reportingManager ?? '', mappedOn: '2026-06-01' },
        managerHistory: [],
        tis: steps.tis.status === 'Not Started' ? undefined : {
          createdBy: tisBy.name, otherName: tisBy.code === 'OTHER' ? 'Sharma Infra Services' : undefined, responsible: f.owner, createdOn: new Date(today - Math.floor(r() * 150) * 86400_000).toISOString().slice(0, 10),
          photos: Math.floor(r() * 6) + 2, verification: steps.tis.status === 'Completed' ? 'Verified' : 'Pending', verifiedBy: steps.tis.status === 'Completed' ? 'Rohit Verma' : undefined,
        },
        steps,
        legal,
        installation: steps.siteSetup.status,
        updatedAt: new Date(today - Math.floor(r() * 30) * 86400_000).toISOString(),
      })
    }
  })
  return { sites }
}
export const siteStore = createStore<SiteState>('dexter.sites.v1', seedSites)
export const useSites = () => siteStore.use()
export const getSiteById = (s: SiteState, siteId: string) => s.sites.find((x) => x.siteId === siteId)
/** Auto-fetch by ATM ID (§9.3 design rule): any module picking an ATM ID gets the site's basic info. */
export const siteByAtm = (atmId: string) => siteStore.get().sites.find((x) => x.atmId.toLowerCase() === atmId.trim().toLowerCase())

export function updateSite(siteId: string, patch: Partial<Site> | ((s: Site) => Partial<Site>), audit?: { action: string; before?: string; after?: string }) {
  const before = siteStore.get().sites.find((x) => x.siteId === siteId)
  siteStore.set((st) => ({
    sites: st.sites.map((x) => (x.siteId === siteId ? { ...x, ...(typeof patch === 'function' ? patch(x) : patch), updatedAt: nowIso() } : x)),
  }))
  if (apiEnabled) {
    // API mode: optimistic update, then the matching backend endpoint(s); rolled back on error. The server audits.
    const after = siteStore.get().sites.find((x) => x.siteId === siteId)
    if (before && after) syncSite(before, after)
    return
  }
  if (audit) logMasterAudit({ entity: 'Site', ref: siteId, ...audit })
}
export function addSite(site: Site) {
  siteStore.set((st) => ({ sites: [site, ...st.sites] }))
  if (apiEnabled) return createSiteOnServer(site) // POST /sites (unique Site ID / ATM ID enforced server-side)
  logMasterAudit({ entity: 'Site', ref: site.siteId, action: 'Site created', after: site.atmId })
}

/** Overall completion % and whether the project is still Incomplete (§10.2: incomplete until all mandatory steps). */
export function completionOf(s: Site) {
  const done = COMPLETION_STEPS.filter((c) => s.steps[c.key]?.status === 'Completed').length
  return { done, total: COMPLETION_STEPS.length, pct: Math.round((done / COMPLETION_STEPS.length) * 100), complete: done === COMPLETION_STEPS.length }
}
export const projectStatusOf = (s: Site) => (completionOf(s).complete ? 'Completed' : 'Incomplete')
export const legalStatusOf = (s: Site) => (LEGAL_SEQUENCE.every((d) => s.legal[d].final === 'Complete') ? 'Complete' : 'Pending')
export const agreementStatusOf = (s: Site) => s.legal.Agreement.final === 'Complete' ? 'Complete' : 'Pending'
export const accountStatusOf = (s: Site) => (s.account?.approval === 'Approved' ? 'Mapped' : s.account ? 'Approval Pending' : 'Pending')

/** Pending activities across sites (§11.3): one row per non-complete step. */
export function pendingActivities(st: SiteState) {
  const rows: { siteId: string; atmId: string; frId: string; dept: Department; work: string; assignedTo: string; since: string; status: StepStatus; days: number }[] = []
  const now = Date.now()
  st.sites.forEach((s) =>
    COMPLETION_STEPS.forEach((c) => {
      const step = s.steps[c.key]
      if (step && step.status !== 'Completed' && step.status !== 'Not Started')
        rows.push({ siteId: s.siteId, atmId: s.atmId, frId: s.frId, dept: c.dept, work: c.label.split(' (')[0], assignedTo: step.assignedTo, since: step.since, status: step.status, days: Math.max(0, Math.round((now - new Date(step.since).getTime()) / 86400_000)) })
    }),
  )
  return rows
}

// ── Transfers & portability — spec §6 ────────────────────────────────────
export type TransferType = 'MF to MF' | 'SMF to SMF' | 'SMF to Team Leader' | 'SMF to Company' | 'MF to Company' | 'FR to FR/MF' | 'Team Leader to Company'
export const TRANSFER_TYPES: { type: TransferType; desc: string }[] = [
  { type: 'MF to MF', desc: 'Move an MF from one SMF to another SMF' },
  { type: 'SMF to SMF', desc: "Move an SMF's network to another SMF" },
  { type: 'SMF to Team Leader', desc: 'Give the MF & FR network to a Team Leader' },
  { type: 'SMF to Company', desc: 'Transfer the whole network directly to the company' },
  { type: 'MF to Company', desc: 'Bring the FRs under an MF directly under the company' },
  { type: 'FR to FR/MF', desc: 'Change franchise mapping per NOC & approval' },
  { type: 'Team Leader to Company', desc: "Transfer a Team Leader's sites to the company" },
]
export type TransferScope = 'SMF' | 'MF' | 'FR' | 'Selected Sites' | 'Entire Network'
export type TransferStatus = 'Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'Completed'
/** NOC-based workflow (§3.4). */
export const TRANSFER_STAGES = ['Transfer Request', 'NOC Submission', 'New Parent Acceptance', 'CRM / Admin Verification', 'Final Approval (Super Admin)', 'New Mapping', 'History Preserved'] as const
export type TransferRequest = {
  id: string // TRF-xxxx
  type: TransferType
  requestedOn: string
  requestedBy: string
  subjectIds: string[] // franchise ids being moved
  siteIds: string[] // when scope = Selected Sites
  scope: TransferScope
  current: ParentRef
  next: ParentRef
  reason: string
  documents: { noc?: string; requestLetter?: string; supporting: string[] }
  emailRef: string
  correspondence: string
  crmVerified: boolean
  crmVerifiedBy?: string
  newParentAccepted: boolean
  adminApproval?: { by: string; at: string; decision: 'Approved' | 'Rejected'; remark: string }
  nocOverride: boolean // Super Admin / Director may transfer without NOC
  effectiveDate: string
  stage: number // index into TRANSFER_STAGES
  status: TransferStatus
  log: { at: string; by: string; text: string }[]
}
export type ExitRequest = {
  id: string // EXT-xxxx
  frId: string
  tier: Tier
  requestedOn: string
  reason: string
  networkTo?: ParentRef // where the network goes on exit (§27 rule 9)
  settlementCleared: boolean
  documentsReturned: boolean
  nocIssued: boolean
  status: 'Requested' | 'Under Review' | 'Approved' | 'Rejected' | 'Exited'
  approvedBy?: string
  log: { at: string; by: string; text: string }[]
}
export type PortabilityState = { transfers: TransferRequest[]; exits: ExitRequest[] }
function seedPortability(): PortabilityState {
  const frs = franchiseStore.get()
  const smf = frs.filter((f) => f.tier === 'Super Master')
  const mf = frs.filter((f) => f.tier === 'Master')
  const fr = frs.filter((f) => f.tier === 'Franchise')
  const P = (f: Franchise, kind: ParentKind): ParentRef => ({ kind, id: f.id, name: f.name })
  const mk = (i: number, type: TransferType, subj: Franchise, from: ParentRef, to: ParentRef, stage: number, status: TransferStatus): TransferRequest => ({
    id: `TRF-${String(1041 + i)}`, type, requestedOn: new Date(Date.UTC(2026, 9, 2 + i * 3)).toISOString(), requestedBy: 'Rohit Verma', subjectIds: [subj.id], siteIds: [],
    scope: type.startsWith('SMF') ? 'Entire Network' : type.startsWith('MF') ? 'MF' : 'FR', current: from, next: to, reason: pick(rng(i + 3), ['Business restructuring', 'Franchisee request', 'Parent exiting the network', 'Territory realignment']),
    documents: { noc: stage > 1 ? 'NOC_signed.pdf' : undefined, requestLetter: 'Request_letter.pdf', supporting: [] }, emailRef: `CRM/${2026}/${400 + i}`, correspondence: 'Email thread with both parents attached',
    crmVerified: stage > 3, crmVerifiedBy: stage > 3 ? 'Vikram Mehta' : undefined, newParentAccepted: stage > 2,
    adminApproval: status === 'Approved' || status === 'Completed' ? { by: 'Paras Dubey', at: new Date(Date.UTC(2026, 9, 5 + i * 3)).toISOString(), decision: 'Approved', remark: 'Approved' } : status === 'Rejected' ? { by: 'Paras Dubey', at: new Date(Date.UTC(2026, 9, 5 + i * 3)).toISOString(), decision: 'Rejected', remark: 'NOC not valid' } : undefined,
    nocOverride: false, effectiveDate: new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10), stage, status, log: [{ at: new Date(Date.UTC(2026, 9, 2 + i * 3)).toISOString(), by: 'Rohit Verma', text: 'Transfer request raised' }],
  })
  return {
    transfers: [
      mk(0, 'FR to FR/MF', fr[3], P(mf[0], 'MF'), P(mf[1], 'MF'), 1, 'Pending'),
      mk(1, 'MF to MF', mf[2], P(smf[0], 'SMF'), P(smf[1], 'SMF'), 3, 'Under Review'),
      mk(2, 'SMF to Company', smf[2], COMPANY, COMPANY, 4, 'Under Review'),
      mk(3, 'MF to Company', mf[4], P(smf[3], 'SMF'), COMPANY, 6, 'Completed'),
      mk(4, 'FR to FR/MF', fr[9], P(mf[5], 'MF'), P(mf[6], 'MF'), 4, 'Rejected'),
      mk(5, 'SMF to Team Leader', smf[4], COMPANY, { kind: 'Team Leader', id: TEAM_LEADERS[0].id, name: TEAM_LEADERS[0].name }, 2, 'Pending'),
    ],
    exits: [
      { id: 'EXT-0201', frId: fr[12].id, tier: 'Franchise', requestedOn: '2026-10-28T10:00:00.000Z', reason: 'Closing business', settlementCleared: false, documentsReturned: false, nocIssued: false, status: 'Under Review', log: [{ at: '2026-10-28T10:00:00.000Z', by: 'Priya Nair', text: 'Exit requested' }] },
      { id: 'EXT-0202', frId: smf[5].id, tier: 'Super Master', requestedOn: '2026-11-04T10:00:00.000Z', reason: 'Retirement', networkTo: COMPANY, settlementCleared: true, documentsReturned: true, nocIssued: false, status: 'Requested', log: [{ at: '2026-11-04T10:00:00.000Z', by: 'Rohit Verma', text: 'Exit requested' }] },
    ],
  }
}
export const portabilityStore = createStore<PortabilityState>('dexter.portability.v1', seedPortability)
export const usePortability = () => portabilityStore.use()

// ── Master data audit log (§25.1) ────────────────────────────────────────
export type MasterAudit = { id: string; at: string; by: string; entity: string; ref: string; action: string; before?: string; after?: string }
export const masterAuditStore = createStore<MasterAudit[]>('dexter.masterAudit.v1', () => [])
export function logMasterAudit(e: Omit<MasterAudit, 'id' | 'at' | 'by'> & { by?: string }) {
  masterAuditStore.set((l) => [{ id: uid('AUD'), at: nowIso(), by: e.by ?? CURRENT_ACTOR, ...e }, ...l].slice(0, 2000))
}
export const useMasterAudit = () => masterAuditStore.use()

export { LOCATIONS }

// ── API mode (backend /sites, /categories, /franchises, /audit) ──────────
// The stores keep their shapes. `loadSites()` / `loadCategories()` / `loadNetwork()` hydrate them;
// `updateSite()` / `addSite()` above route the change to the matching endpoint (see `pushSiteChange`).
type ApiPage<T> = { items: T[]; total: number; pages: number }

const LEGAL_DEFAULT: LegalTrack = { upload: 'Pending', verification: 'Pending', final: 'Pending' }
/** Backend site (possibly field-projected for Finance / Legal / Project parts) → frontend Site. */
export function toSite(x: Partial<Site> & { siteId: string; atmId: string; createdAt?: string }): Site {
  const legal = Object.fromEntries(LEGAL_SEQUENCE.map((d) => [d, { ...LEGAL_DEFAULT, ...(x.legal?.[d] ?? {}) }])) as Record<LegalDocKey, LegalTrack>
  return {
    projectId: '', frId: '', projectType: '', plan: '', siteType: '', machineType: '', location: '', address: '', state: '', district: '', pin: '',
    investment: 0, operational: false, monthlyTxns: 0, installation: 'Not Started', updatedAt: x.createdAt ?? nowIso(),
    ...x,
    // explicit keys so a merge clears a request the server has decided (mergeSite spreads the fresh record)
    payoutRequest: x.payoutRequest,
    settlementRequest: x.settlementRequest,
    accountHistory: x.accountHistory ?? [],
    engineerHistory: x.engineerHistory ?? [],
    managerHistory: x.managerHistory ?? [],
    steps: x.steps ?? {},
    legal,
  }
}

/** Fetch every page of a list endpoint (limit 200 per page). */
async function fetchAllPages<T>(path: string, query: Record<string, string | number | boolean | undefined> = {}): Promise<T[]> {
  const first = await get<ApiPage<T>>(path, { ...query, limit: 200, page: 1 })
  const out = [...first.items]
  for (let p = 2; p <= Math.min(first.pages ?? 1, 50); p++) out.push(...(await get<ApiPage<T>>(path, { ...query, limit: 200, page: p })).items)
  return out
}

let sitesLoaded: Promise<boolean> | null = null
/** Hydrate the Site Master from GET /sites (roles with Master Data access). Keeps the local store on 403. */
export function loadSites(force = false): Promise<boolean> {
  if (!apiEnabled) return Promise.resolve(false)
  if (sitesLoaded && !force) return sitesLoaded
  sitesLoaded = fetchAllPages<Site>('/sites')
    .then((items) => {
      siteStore.set({ sites: items.map(toSite) })
      return true
    })
    .catch((e) => {
      sitesLoaded = null
      if (e instanceof ApiError && e.status === 403) return false
      throw e
    })
  return sitesLoaded
}
/** Full record of one site (incl. histories) — GET /sites/:siteId. */
export async function loadSite(siteId: string) {
  if (!apiEnabled) return siteStore.get().sites.find((s) => s.siteId === siteId)
  const r = await get<{ site: Site }>(`/sites/${encodeURIComponent(siteId)}`)
  const s = toSite(r.site)
  mergeSite(s)
  return s
}
function mergeSite(s: Site) {
  siteStore.set((st) => (st.sites.some((x) => x.siteId === s.siteId) ? { sites: st.sites.map((x) => (x.siteId === s.siteId ? { ...x, ...s, accountHistory: s.accountHistory.length ? s.accountHistory : x.accountHistory, engineerHistory: s.engineerHistory.length ? s.engineerHistory : x.engineerHistory, managerHistory: s.managerHistory.length ? s.managerHistory : x.managerHistory } : x)) } : { sites: [s, ...st.sites] }))
}

const BASE_FIELDS = ['atmId', 'projectId', 'projectType', 'plan', 'siteType', 'machineType', 'location', 'address', 'state', 'district', 'pin', 'investment', 'operational', 'monthlyTxns'] as const
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const enc = encodeURIComponent

/** Work out which backend endpoints a local site change needs and call them in order. */
async function pushSiteChange(before: Site, after: Site): Promise<Site | null> {
  const id = enc(before.siteId)
  let last: Site | null = null
  const run = async (p: Promise<Site>) => {
    last = toSite(await p)
  }
  const base: Record<string, unknown> = {}
  for (const k of BASE_FIELDS) if (!same(before[k], after[k])) base[k] = after[k]
  if (Object.keys(base).length) await run(apiPatch<Site>(`/sites/${id}`, base))
  if (!same(before.account, after.account) && after.account) {
    const a = after.account
    const b = before.account
    const onlyDecision = b && same({ ...b, approval: undefined, settlement: undefined, decidedBy: undefined }, { ...a, approval: undefined, settlement: undefined, decidedBy: undefined })
    if (onlyDecision && a.approval !== b.approval && (a.approval === 'Approved' || a.approval === 'Rejected')) await run(post<Site>(`/sites/${id}/account/decision`, { decision: a.approval }))
    else if (onlyDecision && a.settlement !== b.settlement) throw new ApiError(0, 'NOT_SUPPORTED', 'Settlement status changes go through requestSettlementChange (maker-checker).')
    else if (!onlyDecision) await run(put<Site>(`/sites/${id}/account`, { type: a.type, bank: a.bank, holder: a.holder, accountNo: a.accountNo, ifsc: a.ifsc, branch: a.branch }))
  }
  if (!same(before.payout, after.payout) && after.payout) await run(put<Site>(`/sites/${id}/payout`, { bank: after.payout.bank, accountNo: after.payout.accountNo, ifsc: after.payout.ifsc }))
  if (!same(before.engineer, after.engineer) && after.engineer) {
    const e = after.engineer
    await run(put<Site>(`/sites/${id}/engineer`, { engineerId: e.engineerId, name: e.name, mobile: e.mobile, type: e.type }))
  }
  if (!same(before.manager, after.manager) && after.manager) {
    const m = after.manager
    await run(put<Site>(`/sites/${id}/manager`, { managerId: m.managerId, name: m.name, empCode: m.empCode, mobile: m.mobile, email: m.email, department: m.department, reportingManager: m.reportingManager }))
  }
  if (!same(before.tis, after.tis) && after.tis) {
    const t = after.tis
    await run(put<Site>(`/sites/${id}/tis`, { createdBy: t.createdBy, otherName: t.otherName || undefined, responsible: t.responsible, createdOn: t.createdOn.slice(0, 10), photos: t.photos, verification: t.verification, verifiedBy: t.verifiedBy || undefined, remarks: t.remarks || undefined }))
  }
  for (const k of Object.keys(after.steps ?? {})) {
    const a = after.steps[k]
    const b = before.steps?.[k]
    if (same(a, b)) continue
    const body: Record<string, string> = {}
    if (a.status !== b?.status) body.status = a.status
    if (a.assignedTo !== b?.assignedTo) body.assignedTo = a.assignedTo
    if (a.remark !== b?.remark && a.remark !== undefined) body.remark = a.remark
    if (Object.keys(body).length) await run(apiPatch<Site>(`/sites/${id}/steps/${enc(k)}`, body))
  }
  for (const d of LEGAL_SEQUENCE) {
    const a = after.legal[d]
    const b = before.legal[d]
    if (same(a, b)) continue
    const body: Record<string, string> = {}
    if (a.upload !== b.upload) body.upload = a.upload
    if (a.verification !== b.verification) body.verification = a.verification
    if (a.final !== b.final) body.final = a.final
    if (Object.keys(body).length) await run(apiPatch<Site>(`/sites/${id}/legal/${d}`, body))
  }
  return last
}

// ── Maker-checker requests on the Site Master (API mode; callers handle mock mode locally) ──
const siteCall = async (p: Promise<Site>) => {
  const s = toSite(await p)
  mergeSite(s)
  return s
}
/** PUT /sites/:id/payout → 202 with a Pending `payoutRequest`; the current mapping stays until a different user approves. */
export const requestPayoutChange = (siteId: string, p: { bank: string; accountNo: string; ifsc: string }) => siteCall(put<Site>(`/sites/${enc(siteId)}/payout`, p))
/** POST /sites/:id/payout/decision — maker-checker (`MAKER_CHECKER`); a remark is required to reject. */
export const decidePayoutChange = (siteId: string, decision: 'Approved' | 'Rejected', remark?: string) =>
  siteCall(post<Site>(`/sites/${enc(siteId)}/payout/decision`, { decision, ...(remark?.trim() ? { remark: remark.trim() } : {}) }))
/** POST /sites/:id/account/settlement — opens a settlement-status change request (reason ≥ 3 chars). */
export const requestSettlementChange = (siteId: string, status: AccountMapping['settlement'], reason: string) =>
  siteCall(post<Site>(`/sites/${enc(siteId)}/account/settlement`, { status, reason: reason.trim() }))
/** POST /sites/:id/account/settlement/decision — maker-checker; a remark is required to reject. */
export const decideSettlementChange = (siteId: string, decision: 'Approved' | 'Rejected', remark?: string) =>
  siteCall(post<Site>(`/sites/${enc(siteId)}/account/settlement/decision`, { decision, ...(remark?.trim() ? { remark: remark.trim() } : {}) }))

function syncSite(before: Site, after: Site) {
  pushSiteChange(before, after)
    .then((s) => s && mergeSite(s))
    .catch((e: Error) => {
      // roll back the optimistic change and show the backend reason
      siteStore.set((st) => ({ sites: st.sites.map((x) => (x.siteId === before.siteId ? before : x)) }))
      toast(e.message || 'The server rejected the change.', 'error')
    })
}
function createSiteOnServer(site: Site) {
  post<Site>('/sites', {
    siteId: site.siteId, atmId: site.atmId, frId: site.frId, projectId: site.projectId || undefined, projectType: site.projectType, plan: site.plan, siteType: site.siteType,
    machineType: site.machineType, location: site.location, address: site.address, state: site.state, district: site.district, pin: site.pin, investment: Math.round(site.investment) || undefined,
  })
    .then((s) => mergeSite(toSite(s)))
    .catch((e: Error) => {
      siteStore.set((st) => ({ sites: st.sites.filter((x) => x.siteId !== site.siteId) }))
      toast(e.message || 'The server rejected the new site.', 'error')
    })
}

// ── Category masters ──
export async function loadCategories() {
  if (!apiEnabled) return
  const r = await get<Record<CategoryKey, CategoryItem[]>>('/categories')
  categoryStore.set((c) => {
    const next = { ...c }
    for (const k of Object.keys(CATEGORY_META) as CategoryKey[]) if (r[k]) next[k] = r[k].map((i) => ({ code: i.code, name: i.name, description: i.description, category: i.category, active: i.active }))
    return next
  })
}

// ── Franchise network (GET /franchises → franchiseStore + networkStore) ──
export type ApiFranchise = {
  frId: string; name: string; tier: Tier; code: string; partnerCode?: string; state: string; city: string; atms: number; kyc: Franchise['kyc']; status: NetworkStatus; owner?: string; entity: EntityType
  parent: ParentRef; agreementNo?: string; agreementDate?: string; agreementValidTill?: string; nocPending?: boolean; reportingManager?: string; assignedTeam?: string
  mappingHistory?: MappingHistory[]; entityHistory?: NetworkNode['entityHistory']; updatedAt?: string
}
export const toFranchise = (f: ApiFranchise): Franchise => ({ id: f.frId, name: f.name, tier: f.tier, state: f.state, city: f.city, atms: f.atms, kyc: f.kyc, status: f.status === 'Active' ? 'Active' : 'Inactive', owner: f.owner ?? '', updatedAt: f.updatedAt ?? nowIso() })
export const toNode = (f: ApiFranchise): NetworkNode => ({
  frId: f.frId, tier: f.tier, code: f.code, partnerCode: f.partnerCode ?? '—', entity: f.entity, parent: f.parent, status: f.status, agreementNo: f.agreementNo ?? '', agreementDate: f.agreementDate ?? '',
  agreementValidTill: f.agreementValidTill ?? '', nocPending: !!f.nocPending, reportingManager: f.reportingManager ?? '', assignedTeam: f.assignedTeam ?? '', history: f.mappingHistory ?? [], entityHistory: f.entityHistory ?? [],
})
/** Merge one backend franchise into both stores. */
export function mergeFranchise(f: ApiFranchise) {
  franchiseStore.set((list) => (list.some((x) => x.id === f.frId) ? list.map((x) => (x.id === f.frId ? toFranchise(f) : x)) : [toFranchise(f), ...list]))
  networkStore.set((s) => ({ nodes: { ...s.nodes, [f.frId]: toNode(f) } }))
}
let networkLoaded: Promise<boolean> | null = null
export function loadNetwork(force = false): Promise<boolean> {
  if (!apiEnabled) return Promise.resolve(false)
  if (networkLoaded && !force) return networkLoaded
  networkLoaded = fetchAllPages<ApiFranchise>('/franchises')
    .then((items) => {
      franchiseStore.set(items.map(toFranchise))
      networkStore.set({ nodes: Object.fromEntries(items.map((f) => [f.frId, toNode(f)])) })
      return true
    })
    .catch((e) => {
      networkLoaded = null
      if (e instanceof ApiError && e.status === 403) return false
      throw e
    })
  return networkLoaded
}

/** Master-data audit (GET /audit?category=data, entities Site / Category / Franchise). */
export async function loadMasterAudit() {
  if (!apiEnabled) return
  type A = { _id: string; at: string; actor?: { name?: string }; entity: string; ref: string; action: string; diff?: { path: string; before?: unknown; after?: unknown }[] }
  const rows = (await Promise.all(['Site', 'Category', 'Franchise'].map((entity) => get<ApiPage<A>>('/audit', { category: 'data', entity, limit: 200, sort: '-at' }).then((r) => r.items).catch(() => [] as A[])))).flat()
  const s = (v: unknown) => (v === undefined ? undefined : typeof v === 'string' ? v : JSON.stringify(v))
  masterAuditStore.set(
    rows
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((a) => ({ id: a._id, at: a.at, by: a.actor?.name ?? 'System', entity: a.entity === 'Franchise' ? 'Hierarchy' : a.entity, ref: a.ref, action: a.action, before: s(a.diff?.[0]?.before), after: s(a.diff?.[0]?.after) })),
  )
}

/** Hook for Master Data / franchise pages: hydrate the given slices once per mount (API mode). */
export function useMasterLoad(which: ('sites' | 'categories' | 'network' | 'audit')[] = ['sites']) {
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({ loading: apiEnabled, error: null })
  const key = which.join(',')
  useEffect(() => {
    if (!apiEnabled) return
    let alive = true
    Promise.all(which.map((w) => (w === 'sites' ? loadSites(true) : w === 'categories' ? loadCategories() : w === 'network' ? loadNetwork(true) : loadMasterAudit())))
      .then(() => alive && setState({ loading: false, error: null }))
      .catch((e: Error) => alive && setState({ loading: false, error: e.message }))
    return () => {
      alive = false
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return state
}

/** Franchisee: own sites only (GET /my/sites — no account / legal data). */
export async function loadMySites() {
  if (!apiEnabled) return
  const r = await get<{ items: Site[] } | Site[]>('/my/sites', { limit: 200 })
  const items = Array.isArray(r) ? r : r.items
  siteStore.set({ sites: items.map(toSite) })
}

/** Roles without Master Data access: identity-only site directory (Site ID / ATM ID / franchise / type / location). */
export async function loadSiteDirectory() {
  if (!apiEnabled) return
  const r = await get<{ items: (Partial<Site> & { siteId: string; atmId: string })[] }>('/sites/directory')
  siteStore.set({ sites: r.items.map(toSite) })
}
