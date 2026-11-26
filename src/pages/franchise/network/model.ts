// Franchise network management (spec Part 1 §1–§5 + Part 4 §13–§14).
// Module-local state: onboarding registrations, profile details, document versions,
// mapping / entity change requests and status history. Shared hierarchy lives in @/data/network.
import { createStore } from '@/lib/store'
import { apiEnabled, patch as apiPatch, post } from '@/lib/api'
import { toast } from '@/components/ui/Toast'
import { loadNetwork, mergeFranchise, type ApiFranchise } from '@/data/network'
import type { FileValue } from '@/components/ui/Form'
import {
  COMPANY,
  CURRENT_ACTOR,
  ENTITY_DOCS,
  TEAM_LEADERS,
  logMasterAudit,
  networkStore,
  nowIso,
  remapParent,
  tierCode,
  uid,
  updateNode,
  type EntityType,
  type NetworkNode,
  type NetworkState,
  type NetworkStatus,
  type ParentKind,
  type ParentRef,
  type Site,
} from '@/data/network'
import { addFranchise, franchiseStore, updateFranchises, type Franchise, type Tier } from '@/data/franchises'
import { LOCATIONS } from '@/data/applications'

// ── tier helpers ─────────────────────────────────────────────────────────
export const SLUG_TIER: Record<string, Tier> = { 'super-master': 'Super Master', master: 'Master', franchise: 'Franchise' }
export const TIER_SLUGS: Record<Tier, string> = { 'Super Master': 'super-master', Master: 'master', Franchise: 'franchise' }
export const TIER_SHORT: Record<Tier, string> = { 'Super Master': 'SMF', Master: 'MF', Franchise: 'FR' }
export const TIER_LONG: Record<Tier, string> = { 'Super Master': 'Super Master Franchise', Master: 'Master Franchise', Franchise: 'Franchise' }
export const CHILD_TIER: Record<Tier, Tier | null> = { 'Super Master': 'Master', Master: 'Franchise', Franchise: null }
export const TEAMS = ['CRM North', 'CRM West', 'CRM South', 'CRM East']
export const BANK_NAMES = ['HDFC Bank', 'Axis Bank', 'ICICI Bank', 'State Bank of India', 'Kotak Mahindra Bank', 'Bank of Baroda', 'Punjab National Bank']
export const districtsOf = (state: string) => LOCATIONS[state]?.cities ?? []

/** Which parent kinds a tier may be mapped to (§1, §3.1). */
export const PARENT_KINDS: Record<Tier, ParentKind[]> = {
  'Super Master': ['Company'],
  Master: ['SMF', 'Company'],
  Franchise: ['MF', 'Company', 'Team Leader'],
}
export const PARENT_KIND_LABEL: Record<ParentKind, string> = { SMF: 'Super Master Franchise', MF: 'Master Franchise', Company: 'Direct Company', 'Team Leader': 'Team Leader' }

/** Selectable parents of a kind: [{ value, label }] */
export function parentOptions(kind: ParentKind | '', nodes: NetworkState['nodes'], frs: Franchise[], excludeId?: string): { value: string; label: string }[] {
  if (!kind || kind === 'Company') return []
  if (kind === 'Team Leader') return TEAM_LEADERS.map((t) => ({ value: t.id, label: `${t.id} · ${t.name}` }))
  const tier: Tier = kind === 'SMF' ? 'Super Master' : 'Master'
  return frs
    .filter((f) => f.tier === tier && f.id !== excludeId && nodes[f.id]?.status !== 'Exited' && nodes[f.id]?.status !== 'Draft')
    .map((f) => ({ value: f.id, label: `${nodes[f.id]?.code ?? f.id} · ${f.name}` }))
}
export function parentRefOf(kind: ParentKind | '', id: string): ParentRef | null {
  if (kind === 'Company') return COMPANY
  if (!kind || !id) return null
  if (kind === 'Team Leader') {
    const t = TEAM_LEADERS.find((x) => x.id === id)
    return t ? { kind, id: t.id, name: t.name } : null
  }
  const f = franchiseStore.get().find((x) => x.id === id)
  return f ? { kind, id: f.id, name: f.name } : null
}

// ── registration form ────────────────────────────────────────────────────
export type RegForm = {
  partnerCode: string
  contactName: string
  mobile: string
  email: string
  entity: EntityType | ''
  companyName: string
  pan: string
  gst: string
  address: string
  state: string
  district: string
  pin: string
  bankName: string
  accountNo: string
  ifsc: string
  agreementNo: string
  agreementDate: string
  agreementValidTill: string
  docs: Record<string, FileValue>
  reportingManager: string
  assignedTeam: string
  parentKind: ParentKind | ''
  parentId: string
}
export const emptyRegForm = (tier?: Tier): RegForm => ({
  partnerCode: '', contactName: '', mobile: '', email: '', entity: '', companyName: '', pan: '', gst: '',
  address: '', state: '', district: '', pin: '', bankName: '', accountNo: '', ifsc: '',
  agreementNo: '', agreementDate: '', agreementValidTill: '', docs: {}, reportingManager: '', assignedTeam: '',
  parentKind: tier === 'Super Master' ? 'Company' : '', parentId: '',
})
export type RegErrors = Partial<Record<keyof RegForm | `doc:${string}`, string>>

export const needsGst = (e: EntityType | '') => !!e && ENTITY_DOCS[e].includes('GST')
const RX = {
  mobile: /^[6-9]\d{9}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  pan: /^[A-Z]{5}\d{4}[A-Z]$/,
  gst: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
  pin: /^[1-9]\d{5}$/,
  account: /^\d{9,18}$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
}

/** Basic info only (Method A — CRM fills basics, franchisee completes KYC in the app). */
export function validateBasic(f: RegForm, tier: Tier): RegErrors {
  const e: RegErrors = {}
  if (!f.contactName.trim()) e.contactName = 'Enter the contact person name'
  if (!RX.mobile.test(f.mobile)) e.mobile = 'Enter a valid 10-digit mobile number'
  if (!RX.email.test(f.email.trim())) e.email = 'Enter a valid email address'
  if (!f.entity) e.entity = 'Select the entity type'
  if (!f.companyName.trim()) e.companyName = 'Enter the company / firm / trade name'
  if (!f.state) e.state = 'Select the state'
  if (!f.district) e.district = 'Select the district'
  if (!f.parentKind) e.parentKind = 'Select the parent mapping'
  else if (f.parentKind !== 'Company' && !f.parentId) e.parentId = `Select the ${PARENT_KIND_LABEL[f.parentKind]}`
  if (tier === 'Super Master' && f.parentKind !== 'Company') e.parentKind = 'An SMF is always mapped to the company'
  return e
}

/** Profile fields (everything except documents). */
export function validateProfile(f: RegForm, tier: Tier): RegErrors {
  const e = validateBasic(f, tier)
  if (!f.partnerCode.trim()) e.partnerCode = 'Enter the partner code'
  if (!RX.pan.test(f.pan)) e.pan = 'PAN must look like ABCDE1234F'
  if (needsGst(f.entity) && !RX.gst.test(f.gst)) e.gst = 'GST is required for this entity (15 characters)'
  else if (f.gst && !RX.gst.test(f.gst)) e.gst = 'GSTIN must be 15 characters (e.g. 27ABCDE1234F1Z5)'
  if (!f.address.trim()) e.address = 'Enter the registered address'
  if (!RX.pin.test(f.pin)) e.pin = 'Enter a valid 6-digit PIN'
  if (!f.bankName) e.bankName = 'Select the bank'
  if (!RX.account.test(f.accountNo)) e.accountNo = 'Account number must be 9–18 digits'
  if (!RX.ifsc.test(f.ifsc)) e.ifsc = 'IFSC must look like HDFC0001234'
  if (!f.agreementNo.trim()) e.agreementNo = 'Enter the agreement number'
  if (!f.agreementDate) e.agreementDate = 'Select the agreement date'
  if (!f.agreementValidTill) e.agreementValidTill = 'Select the validity date'
  else if (f.agreementDate && f.agreementValidTill <= f.agreementDate) e.agreementValidTill = 'Validity must be after the agreement date'
  if (!f.reportingManager) e.reportingManager = 'Select the reporting manager'
  if (!f.assignedTeam) e.assignedTeam = 'Select the assigned team'
  return e
}

export const requiredDocs = (entity: EntityType | '') => (entity ? ENTITY_DOCS[entity] : [])
export function validateDocs(f: RegForm): RegErrors {
  const e: RegErrors = {}
  requiredDocs(f.entity).forEach((d) => {
    if (!f.docs[d]) e[`doc:${d}`] = `${d} is required`
  })
  return e
}
export const validateFull = (f: RegForm, tier: Tier): RegErrors => ({ ...validateProfile(f, tier), ...validateDocs(f) })

/** Next system code for a tier (shown read-only on the form; assigned on submit). */
export function nextCode(tier: Tier, nodes: NetworkState['nodes']) {
  const count = Object.values(nodes).filter((n) => n.tier === tier).length + 1
  return tier === 'Franchise' ? `FR-${10000 + count}` : `${tierCode(tier)}-${String(count).padStart(4, '0')}`
}

// ── module state ─────────────────────────────────────────────────────────
export type OnboardStage = 'Draft' | 'Link Generated' | 'Link Sent' | 'KYC Uploaded' | 'Documents Verified' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Returned'
export const ONBOARD_STAGES: OnboardStage[] = ['Draft', 'Link Generated', 'Link Sent', 'KYC Uploaded', 'Documents Verified', 'Pending Approval', 'Approved', 'Rejected', 'Returned']
export type LogLine = { at: string; by: string; text: string }
export type Decision = { by: string; at: string; action: 'Approved' | 'Rejected' | 'Returned'; reason: string }
export type Registration = {
  id: string // REG-xxxx
  tier: Tier
  method: 'A' | 'B'
  form: RegForm
  stage: OnboardStage
  frId?: string
  code?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  link?: string
  sentVia: string[]
  kycFromApp: boolean
  docsVerified: boolean
  decision?: Decision
  log: LogLine[]
}
export type DocVersion = { v: number; name: string; size: number; at: string; by: string }
export type ReqStatus = 'Pending' | 'Approved' | 'Rejected'
export type MappingRequest = { id: string; frId: string; from: ParentRef; to: ParentRef; reason: string; requestedBy: string; requestedRole: string; at: string; status: ReqStatus; decidedBy?: string; decidedAt?: string; remark?: string }
export type EntityRequest = { id: string; frId: string; from: EntityType; to: EntityType; reason: string; requestedBy: string; at: string; status: ReqStatus; oldDetails: { companyName: string; pan: string; gst: string; docs: string[] }; decidedBy?: string; decidedAt?: string; remark?: string }
export type StatusChange = { id: string; frId: string; at: string; by: string; from: NetworkStatus; to: NetworkStatus; reason: string }

type ModState = {
  registrations: Registration[]
  profiles: Record<string, Partial<RegForm>>
  docs: Record<string, Record<string, DocVersion[]>>
  mappingRequests: MappingRequest[]
  entityRequests: EntityRequest[]
  statusLog: StatusChange[]
}

function seedModule(): ModState {
  const at = (d: string) => new Date(d).toISOString()
  const base = (over: Partial<RegForm>): RegForm => ({ ...emptyRegForm(), ...over })
  return {
    registrations: [
      {
        id: 'REG-2611-001', tier: 'Franchise', method: 'A', stage: 'Link Sent', createdAt: at('2026-11-18T10:20:00+05:30'), updatedAt: at('2026-11-18T10:40:00+05:30'), createdBy: 'Priya Nair',
        form: base({ contactName: 'Harish Kumar', mobile: '9826012345', email: 'harish.kumar@example.in', entity: 'Individual', companyName: 'Harish Cash Point', state: 'Madhya Pradesh', district: districtsOf('Madhya Pradesh')[0] ?? '', parentKind: 'Company' }),
        link: 'https://app.dexterindia.in/activate/AX7K2Q9M', sentVia: ['SMS'], kycFromApp: false, docsVerified: false,
        log: [{ at: at('2026-11-18T10:20:00+05:30'), by: 'Priya Nair', text: 'Basic information captured (Method A)' }, { at: at('2026-11-18T10:40:00+05:30'), by: 'Priya Nair', text: 'Activation link sent via SMS' }],
      },
      {
        id: 'REG-2611-002', tier: 'Master', method: 'B', stage: 'Draft', createdAt: at('2026-11-20T15:05:00+05:30'), updatedAt: at('2026-11-20T15:05:00+05:30'), createdBy: 'Rohit Verma',
        form: base({ contactName: 'Sneha Kulkarni', mobile: '9890011223', email: 'sneha@kulkarnifin.example', entity: 'Partnership', companyName: 'Kulkarni Financial Partners', state: 'Maharashtra', district: 'Pune', parentKind: 'Company' }),
        sentVia: [], kycFromApp: false, docsVerified: false, log: [{ at: at('2026-11-20T15:05:00+05:30'), by: 'Rohit Verma', text: 'Draft saved (Method B)' }],
      },
    ],
    profiles: {},
    docs: {},
    mappingRequests: [],
    entityRequests: [],
    statusLog: [],
  }
}
export const modStore = createStore<ModState>('dexter.networkMgmt.v1', seedModule)
export const useMod = () => modStore.use()

const log = (by = CURRENT_ACTOR) => (text: string): LogLine => ({ at: nowIso(), by, text })

// ── registrations ────────────────────────────────────────────────────────
export function saveRegistration(r: Registration) {
  modStore.set((s) => {
    const exists = s.registrations.some((x) => x.id === r.id)
    return { ...s, registrations: exists ? s.registrations.map((x) => (x.id === r.id ? r : x)) : [r, ...s.registrations] }
  })
}
export const newRegistration = (tier: Tier, method: 'A' | 'B', form: RegForm): Registration => ({
  id: uid('REG'), tier, method, form, stage: 'Draft', createdAt: nowIso(), updatedAt: nowIso(), createdBy: CURRENT_ACTOR, sentVia: [], kycFromApp: false, docsVerified: false, log: [],
})
export function patchRegistration(id: string, patch: Partial<Registration>, text?: string) {
  modStore.set((s) => ({
    ...s,
    registrations: s.registrations.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: nowIso(), log: text ? [log()(text), ...r.log] : r.log } : r)),
  }))
}
export const getRegistration = (id: string) => modStore.get().registrations.find((r) => r.id === id)

/**
 * Send a registration for Admin approval: creates the franchise (registry) + network node in
 * 'Pending Approval'. Access stays locked (franchise marked Inactive) until an Admin approves (§14 Step 4).
 */
export function sendForApproval(regId: string): string | null {
  const reg = getRegistration(regId)
  if (!reg) return null
  const f = reg.form
  const parent = parentRefOf(f.parentKind, f.parentId) ?? COMPANY
  let frId = reg.frId
  const code = reg.code ?? nextCode(reg.tier, networkStore.get().nodes)
  if (!frId) {
    const fr = addFranchise({ name: f.companyName.trim(), tier: reg.tier, state: f.state, city: f.district, atms: 0 })
    frId = fr.id
  } else {
    updateFranchises([frId], { name: f.companyName.trim(), state: f.state, city: f.district })
  }
  updateFranchises([frId], { status: 'Inactive', kyc: 'In review' })
  const prev = networkStore.get().nodes[frId]
  const node: NetworkNode = {
    frId, tier: reg.tier, code, partnerCode: f.partnerCode || '—', entity: (f.entity || 'Individual') as EntityType, parent, status: 'Pending Approval',
    agreementNo: f.agreementNo, agreementDate: f.agreementDate, agreementValidTill: f.agreementValidTill, nocPending: false,
    reportingManager: f.reportingManager, assignedTeam: f.assignedTeam,
    history: prev?.history ?? [{ id: uid('MAP'), to: parent, at: nowIso(), by: CURRENT_ACTOR, reason: 'Registration — initial mapping (pending Admin approval)' }],
    entityHistory: prev?.entityHistory ?? [],
  }
  networkStore.set((s) => ({ nodes: { ...s.nodes, [frId]: node } }))
  const id = frId
  modStore.set((s) => {
    const docs = { ...(s.docs[id] ?? {}) }
    Object.entries(f.docs).forEach(([k, v]) => {
      if (v && !(docs[k] ?? []).some((x) => x.name === v.name)) docs[k] = [{ v: (docs[k]?.length ?? 0) + 1, name: v.name, size: v.size, at: nowIso(), by: CURRENT_ACTOR }, ...(docs[k] ?? [])]
    })
    return { ...s, profiles: { ...s.profiles, [id]: { ...f, docs: {} } }, docs: { ...s.docs, [id]: docs } }
  })
  patchRegistration(regId, { frId, code, stage: 'Pending Approval', decision: undefined }, 'Sent for Admin approval')
  logMasterAudit({ entity: 'Franchise', ref: frId, action: `${TIER_SHORT[reg.tier]} registration sent for approval`, after: `${code} · ${f.companyName}` })
  return frId
}

/** Admin decision (§14 Step 4 / §25). Reason mandatory for Reject / Return. Audit-logged. */
export function decideRegistration(regId: string, action: Decision['action'], reason: string) {
  const reg = getRegistration(regId)
  if (!reg || !reg.frId) return
  const decision: Decision = { by: CURRENT_ACTOR, at: nowIso(), action, reason }
  if (apiEnabled) {
    const to = action === 'Approved' ? 'Active' : action === 'Rejected' ? 'Inactive' : 'Draft'
    serverSync(post(`/franchises/${enc(reg.frId)}/status`, { status: to, reason: reason.trim().length >= 3 ? reason.trim() : `Onboarding ${action.toLowerCase()}` }))
    if (action === 'Approved') serverSync(apiPatch(`/franchises/${enc(reg.frId)}`, { kyc: 'Verified' }))
  }
  if (action === 'Approved') {
    updateNode(reg.frId, { status: 'Active' })
    updateFranchises([reg.frId], { status: 'Active', kyc: 'Verified' })
    patchRegistration(regId, { stage: 'Approved', decision }, `Approved by Admin${reason ? ` — ${reason}` : ''}. Project Mapping now available.`)
  } else {
    updateNode(reg.frId, { status: action === 'Rejected' ? 'Inactive' : 'Draft' })
    patchRegistration(regId, { stage: action, decision }, `${action} — ${reason}`)
  }
  addStatusLog(reg.frId, 'Pending Approval', action === 'Approved' ? 'Active' : action === 'Rejected' ? 'Inactive' : 'Draft', `Onboarding ${action.toLowerCase()}${reason ? `: ${reason}` : ''}`)
  logMasterAudit({ entity: 'Franchise', ref: reg.frId, action: `Registration ${action.toLowerCase()}`, before: 'Pending Approval', after: reason ? `${action} — ${reason}` : action })
}

// ── profiles ─────────────────────────────────────────────────────────────
function hash(s: string) {
  let h = 7
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 1_000_003
  return h
}
/** Profile form for an existing franchise: stored details over deterministic mock defaults. */
export function profileFormOf(f: Franchise, n: NetworkNode | undefined, stored: Partial<RegForm> | undefined): RegForm {
  const h = hash(f.id)
  const L = 'ABCDEFGHJKLMNPRSTUVWXYZ'
  const panBody = `${L[h % 23]}${L[(h >> 2) % 23]}${L[(h >> 4) % 23]}P${L[(h >> 6) % 23]}${String(1000 + (h % 9000))}${L[(h >> 3) % 23]}`
  const owner = f.owner
  const defaults: RegForm = {
    ...emptyRegForm(f.tier),
    partnerCode: n?.partnerCode && n.partnerCode !== '—' ? n.partnerCode : '',
    contactName: owner,
    mobile: `9${String(100000000 + (h * 977) % 899999999).padStart(9, '0')}`,
    email: `${f.name.split(' ')[0].toLowerCase()}.${f.id.slice(-5)}@partner.dexterindia.in`,
    entity: n?.entity ?? 'Individual',
    companyName: f.name,
    pan: panBody,
    gst: '',
    address: `Office ${(h % 40) + 1}, Market Complex, ${f.city}`,
    state: f.state,
    district: districtsOf(f.state).includes(f.city) ? f.city : districtsOf(f.state)[0] ?? f.city,
    pin: String(400001 + (h % 99000)),
    bankName: BANK_NAMES[h % BANK_NAMES.length],
    accountNo: String(50100000000000 + h * 13),
    ifsc: `${BANK_NAMES[h % BANK_NAMES.length].replace(/[^A-Z]/g, '').padEnd(4, 'X').slice(0, 4)}0${String(100000 + (h % 900000))}`,
    agreementNo: n?.agreementNo ?? '',
    agreementDate: n?.agreementDate ?? '',
    agreementValidTill: n?.agreementValidTill ?? '',
    reportingManager: n?.reportingManager ?? '',
    assignedTeam: n?.assignedTeam ?? '',
    parentKind: n?.parent.kind ?? '',
    parentId: n?.parent.kind === 'Company' ? '' : n?.parent.id ?? '',
  }
  if (needsGst(defaults.entity)) defaults.gst = `${String(10 + (h % 27)).padStart(2, '0')}${panBody}1Z${L[h % 23]}`
  const merged = { ...defaults, ...(stored ?? {}) }
  // node is the source of truth for hierarchy / agreement / entity
  if (n) {
    merged.entity = n.entity
    merged.parentKind = n.parent.kind
    merged.parentId = n.parent.kind === 'Company' ? '' : n.parent.id
    merged.agreementNo = n.agreementNo
    merged.agreementDate = n.agreementDate
    merged.agreementValidTill = n.agreementValidTill
    merged.reportingManager = n.reportingManager
    merged.assignedTeam = n.assignedTeam
    if (n.partnerCode && n.partnerCode !== '—') merged.partnerCode = n.partnerCode
  }
  return { ...merged, docs: {} }
}

export function saveProfile(frId: string, before: RegForm, form: RegForm) {
  const { docs: _docs, ...rest } = form
  void _docs
  modStore.set((s) => ({ ...s, profiles: { ...s.profiles, [frId]: rest } }))
  updateNode(frId, {
    partnerCode: form.partnerCode, agreementNo: form.agreementNo, agreementDate: form.agreementDate, agreementValidTill: form.agreementValidTill,
    reportingManager: form.reportingManager, assignedTeam: form.assignedTeam,
  })
  updateFranchises([frId], { name: form.companyName.trim(), state: form.state, city: form.district })
  if (apiEnabled)
    serverSync(
      apiPatch(`/franchises/${enc(frId)}`, {
        name: form.companyName.trim(), state: form.state, city: form.district, agreementNo: form.agreementNo || undefined, agreementDate: form.agreementDate || undefined,
        agreementValidTill: form.agreementValidTill || undefined, reportingManager: form.reportingManager || undefined, assignedTeam: form.assignedTeam || undefined,
        contactEmail: form.email || undefined, contactMobile: form.mobile || undefined,
      }),
    )
  const changed = (Object.keys(rest) as (keyof RegForm)[]).filter((k) => k !== 'docs' && String(before[k] ?? '') !== String(form[k] ?? ''))
  logMasterAudit({ entity: 'Franchise', ref: frId, action: 'Profile updated', before: changed.map((k) => `${k}: ${String(before[k] ?? '')}`).join('; '), after: changed.map((k) => `${k}: ${String(form[k] ?? '')}`).join('; ') })
  return changed.length
}

// ── documents (versioned) ────────────────────────────────────────────────
export function addDocVersion(frId: string, type: string, file: { name: string; size: number }) {
  modStore.set((s) => {
    const cur = s.docs[frId]?.[type] ?? []
    const v: DocVersion = { v: cur.length + 1, name: file.name, size: file.size, at: nowIso(), by: CURRENT_ACTOR }
    return { ...s, docs: { ...s.docs, [frId]: { ...(s.docs[frId] ?? {}), [type]: [v, ...cur] } } }
  })
  logMasterAudit({ entity: 'Franchise document', ref: frId, action: `${type} uploaded`, after: file.name })
  if (type === 'NOC') updateNode(frId, { nocPending: false })
}

// ── mapping change requests (Admin raises, Super Admin approves — §25) ───
export function raiseMappingRequest(frId: string, to: ParentRef, reason: string, role: string) {
  const node = networkStore.get().nodes[frId]
  if (!node) return
  const r: MappingRequest = { id: uid('MCR'), frId, from: node.parent, to, reason, requestedBy: CURRENT_ACTOR, requestedRole: role, at: nowIso(), status: 'Pending' }
  modStore.set((s) => ({ ...s, mappingRequests: [r, ...s.mappingRequests] }))
  logMasterAudit({ entity: 'Hierarchy', ref: frId, action: 'Mapping change requested', before: `${node.parent.kind} ${node.parent.name}`, after: `${to.kind} ${to.name}` })
}
export function decideMappingRequest(id: string, approve: boolean, remark: string) {
  const r = modStore.get().mappingRequests.find((x) => x.id === id)
  if (!r || r.status !== 'Pending') return
  if (approve) remapParent(r.frId, r.to, r.reason, { approvedBy: CURRENT_ACTOR })
  if (approve && apiEnabled) serverSync(post(`/franchises/${enc(r.frId)}/remap`, { parent: { kind: r.to.kind, id: r.to.kind === 'Company' ? undefined : r.to.id }, reason: r.reason.length >= 3 ? r.reason : `Mapping change: ${r.reason}` }))
  modStore.set((s) => ({
    ...s,
    mappingRequests: s.mappingRequests.map((x) => (x.id === id ? { ...x, status: approve ? 'Approved' : 'Rejected', decidedBy: CURRENT_ACTOR, decidedAt: nowIso(), remark } : x)),
  }))
  if (!approve) logMasterAudit({ entity: 'Hierarchy', ref: r.frId, action: 'Mapping change rejected', after: remark })
}

// ── entity type change (approval only, old details preserved — §5) ───────
export function raiseEntityRequest(frId: string, to: EntityType, reason: string, current: RegForm) {
  const node = networkStore.get().nodes[frId]
  if (!node) return
  const docs = Object.keys(modStore.get().docs[frId] ?? {})
  const r: EntityRequest = { id: uid('ECR'), frId, from: node.entity, to, reason, requestedBy: CURRENT_ACTOR, at: nowIso(), status: 'Pending', oldDetails: { companyName: current.companyName, pan: current.pan, gst: current.gst, docs } }
  modStore.set((s) => ({ ...s, entityRequests: [r, ...s.entityRequests] }))
  logMasterAudit({ entity: 'Franchise', ref: frId, action: 'Entity type change requested', before: node.entity, after: to })
}
export function decideEntityRequest(id: string, approve: boolean, remark: string) {
  const r = modStore.get().entityRequests.find((x) => x.id === id)
  if (!r || r.status !== 'Pending') return
  const node = networkStore.get().nodes[r.frId]
  if (approve && node) {
    updateNode(r.frId, { entity: r.to, entityHistory: [{ at: nowIso(), from: node.entity, to: r.to, by: CURRENT_ACTOR }, ...node.entityHistory] })
    if (apiEnabled) serverSync(apiPatch(`/franchises/${enc(r.frId)}`, { entity: r.to }))
  }
  modStore.set((s) => ({
    ...s,
    entityRequests: s.entityRequests.map((x) => (x.id === id ? { ...x, status: approve ? 'Approved' : 'Rejected', decidedBy: CURRENT_ACTOR, decidedAt: nowIso(), remark } : x)),
  }))
  logMasterAudit({ entity: 'Franchise', ref: r.frId, action: approve ? 'Entity type changed' : 'Entity type change rejected', before: r.from, after: approve ? r.to : remark })
}

// ── status management (§4.1 #13) ─────────────────────────────────────────
export const MANAGED_STATUSES: NetworkStatus[] = ['Active', 'Inactive', 'Hold', 'Suspended', 'Exited']
function addStatusLog(frId: string, from: NetworkStatus, to: NetworkStatus, reason: string) {
  const e: StatusChange = { id: uid('STS'), frId, at: nowIso(), by: CURRENT_ACTOR, from, to, reason }
  modStore.set((s) => ({ ...s, statusLog: [e, ...s.statusLog] }))
}
export function changeStatus(frId: string, to: NetworkStatus, reason: string) {
  const node = networkStore.get().nodes[frId]
  if (!node) return
  updateNode(frId, { status: to })
  updateFranchises([frId], { status: to === 'Active' ? 'Active' : 'Inactive' })
  addStatusLog(frId, node.status, to, reason)
  if (apiEnabled) return serverSync(post(`/franchises/${enc(frId)}/status`, { status: to, reason })) // allowed transitions enforced server-side
  logMasterAudit({ entity: 'Franchise', ref: frId, action: 'Status changed', before: node.status, after: `${to} — ${reason}` })
}

// ── network maths ────────────────────────────────────────────────────────
export type NetIndex = { children: Map<string, NetworkNode[]>; sitesByFr: Map<string, Site[]> }
export function buildIndex(nodes: NetworkState['nodes'], sites: Site[]): NetIndex {
  const children = new Map<string, NetworkNode[]>()
  Object.values(nodes).forEach((n) => {
    const k = n.parent.id
    const arr = children.get(k)
    if (arr) arr.push(n)
    else children.set(k, [n])
  })
  const sitesByFr = new Map<string, Site[]>()
  sites.forEach((s) => {
    const arr = sitesByFr.get(s.frId)
    if (arr) arr.push(s)
    else sitesByFr.set(s.frId, [s])
  })
  return { children, sitesByFr }
}
/** All nodes below an id (depth-first). */
export function descendants(idx: NetIndex, id: string): NetworkNode[] {
  const out: NetworkNode[] = []
  const stack = [...(idx.children.get(id) ?? [])]
  const seen = new Set<string>([id])
  while (stack.length) {
    const n = stack.pop()!
    if (seen.has(n.frId)) continue
    seen.add(n.frId)
    out.push(n)
    stack.push(...(idx.children.get(n.frId) ?? []))
  }
  return out
}
/** Sites of a node's whole network (its own sites + every FR below it). */
export function networkSites(idx: NetIndex, id: string): Site[] {
  const own = idx.sitesByFr.get(id) ?? []
  return [...own, ...descendants(idx, id).flatMap((n) => idx.sitesByFr.get(n.frId) ?? [])]
}

export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
export const fmtDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
export function inrShort(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString('en-IN')}`
}
export const isLocked = (s?: NetworkStatus) => s === 'Draft' || s === 'Pending Approval'

/** Inline paging helper. */
export function paged<T>(rows: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const p = Math.min(page, pages)
  return rows.slice((p - 1) * size, p * size)
}

// ── API mode: franchise registry / network writes go to /franchises ──────
/** Optimistic local change already applied by the caller → push to the server; on error reload the network. */
function serverSync(p: Promise<ApiFranchise | unknown>, ok?: string) {
  p.then((r) => {
    if (r && typeof r === 'object' && 'frId' in (r as object)) mergeFranchise(r as ApiFranchise)
    if (ok) toast(ok)
  }).catch((e: Error) => {
    toast(e.message || 'The server rejected the change.', 'error')
    loadNetwork(true).catch(() => undefined)
  })
}
const enc = encodeURIComponent

/**
 * API mode: create the franchise on the server (POST /franchises → status Pending Approval, server frId / code),
 * then keep the local registration bookkeeping. Mock mode: same as `sendForApproval`.
 */
export async function sendForApprovalAsync(regId: string): Promise<string | null> {
  if (!apiEnabled) return sendForApproval(regId)
  const reg = getRegistration(regId)
  if (!reg) return null
  const f = reg.form
  const parent = parentRefOf(f.parentKind, f.parentId) ?? COMPANY
  try {
    let fr: ApiFranchise
    const common = {
      name: f.companyName.trim(), state: f.state, city: f.district, entity: (f.entity || undefined) as EntityType | undefined,
      agreementNo: f.agreementNo || undefined, agreementDate: f.agreementDate || undefined, agreementValidTill: f.agreementValidTill || undefined,
      reportingManager: f.reportingManager || undefined, assignedTeam: f.assignedTeam || undefined, contactEmail: f.email || undefined, contactMobile: f.mobile || undefined,
    }
    if (reg.frId && networkStore.get().nodes[reg.frId]) fr = await apiPatch<ApiFranchise>(`/franchises/${enc(reg.frId)}`, common)
    else fr = await post<ApiFranchise>('/franchises', { ...common, tier: reg.tier, parent: { kind: parent.kind, id: parent.kind === 'Company' ? undefined : parent.id } })
    mergeFranchise(fr)
    patchRegistration(regId, { frId: fr.frId, code: fr.code })
    const id = sendForApproval(regId)
    mergeFranchise(fr) // server values win over the local defaults
    return id
  } catch (e) {
    toast((e as Error).message || 'The server rejected the registration.', 'error')
    return null
  }
}
