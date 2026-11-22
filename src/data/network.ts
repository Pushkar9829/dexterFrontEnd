// Franchise network + Master Data (site master) — shared model for the
// "Franchise & Master Data Management" spec (20.11.2026).
// Mock only: everything lives in localStorage via createStore until the backend exists.
import { createStore } from '@/lib/store'
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
  categoryStore.set((c) => ({ ...c, [key]: [...c[key], { ...item, active: true }] }))
  logMasterAudit({ entity: 'Category', ref: key, action: 'Created', after: item.code })
}
export function toggleCategoryItem(key: CategoryKey, code: string) {
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
  siteStore.set((st) => ({
    sites: st.sites.map((x) => (x.siteId === siteId ? { ...x, ...(typeof patch === 'function' ? patch(x) : patch), updatedAt: nowIso() } : x)),
  }))
  if (audit) logMasterAudit({ entity: 'Site', ref: siteId, ...audit })
}
export function addSite(site: Site) {
  siteStore.set((st) => ({ sites: [site, ...st.sites] }))
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
