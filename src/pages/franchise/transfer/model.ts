// Transfer & Portability + Exit Management (spec §3.2 note, §3.4, §6, §25, §27).
// Business logic for this folder only. Shared records (TransferRequest / ExitRequest) live in
// portabilityStore (src/data/network.ts); everything the shared model has no field for (drafts,
// snapshots, reject reasons, override remarks, hand-over results) lives in portExtraStore below.
import { useEffect, useState } from 'react'
import { createStore } from '@/lib/store'
import { apiEnabled, get, patch as apiPatch, post } from '@/lib/api'
import { toast } from '@/components/ui/Toast'
import { loadNetwork, loadSites } from '@/data/network'
import { getSession } from '@/lib/auth'
import { franchiseStore, type Tier } from '@/data/franchises'
import type { FileValue } from '@/components/ui/Form'
import {
  COMPANY,
  CURRENT_ACTOR,
  TEAM_LEADERS,
  childrenOf,
  logMasterAudit,
  networkStore,
  nowIso,
  portabilityStore,
  remapParent,
  siteStore,
  updateNode,
  type ExitRequest,
  type NetworkState,
  type ParentKind,
  type ParentRef,
  type SiteState,
  type TransferRequest,
  type TransferScope,
  type TransferType,
} from '@/data/network'

// ── Extra state ──────────────────────────────────────────────────────────
export type Ref = { id: string; name: string } | null
export type Moved = { frId: string; name: string; from: ParentRef; to: ParentRef }

export type TransferDraft = {
  type: TransferType | ''
  subjectId: string
  targetId: string
  scope: TransferScope | ''
  memberIds: string[]
  siteIds: string[]
  reason: string
  noc: FileValue
  letter: FileValue
  supporting: FileValue
  emailRef: string
  correspondence: string
  effectiveDate: string
}
export type TransferMeta = {
  subjectKind?: SubjectKind
  memberIds?: string[] // SMF + scope 'MF': which MFs of the SMF move
  snapshot?: { curSmf: Ref; curMf: Ref; newSmf: Ref; newMf: Ref }
  overrideRemark?: string
  rejectReason?: string
  acceptRemark?: string
  approvedAt?: string
  moved?: Moved[]
  appliedAt?: string
}
export type ExitDraft = {
  frId: string
  reason: string
  effectiveDate: string
  targetKind: ParentKind | ''
  targetId: string
  remark: string
}
export type ExitMeta = {
  effectiveDate?: string
  requestedBy?: string
  remark?: string
  rejectReason?: string
  approvedAt?: string
  exitedAt?: string
  moved?: Moved[]
}
type Extra = {
  transferDraft: TransferDraft | null
  exitDraft: ExitDraft | null
  transferMeta: Record<string, TransferMeta>
  exitMeta: Record<string, ExitMeta>
}
export const portExtraStore = createStore<Extra>('dexter.portabilityExtra.v1', () => ({ transferDraft: null, exitDraft: null, transferMeta: {}, exitMeta: {} }))
export const usePortExtra = () => portExtraStore.use()

export function saveTransferDraft(d: TransferDraft | null) {
  portExtraStore.set((s) => ({ ...s, transferDraft: d }))
}
export function saveExitDraft(d: ExitDraft | null) {
  portExtraStore.set((s) => ({ ...s, exitDraft: d }))
}
export function patchTransferMeta(id: string, patch: Partial<TransferMeta>) {
  portExtraStore.set((s) => ({ ...s, transferMeta: { ...s.transferMeta, [id]: { ...s.transferMeta[id], ...patch } } }))
}
export function patchExitMeta(id: string, patch: Partial<ExitMeta>) {
  portExtraStore.set((s) => ({ ...s, exitMeta: { ...s.exitMeta, [id]: { ...s.exitMeta[id], ...patch } } }))
}

// ── Lookups ──────────────────────────────────────────────────────────────
export const actor = () => getSession()?.name ?? CURRENT_ACTOR
export const today = () => new Date().toISOString().slice(0, 10)
export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
export const fmtDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')

export const TIER_KIND: Record<Tier, 'SMF' | 'MF' | 'FR'> = { 'Super Master': 'SMF', Master: 'MF', Franchise: 'FR' }

export function nameOf(id: string): string {
  if (id === COMPANY.id) return COMPANY.name
  const tl = TEAM_LEADERS.find((t) => t.id === id)
  if (tl) return tl.name
  return franchiseStore.get().find((f) => f.id === id)?.name ?? id
}
export const refLabel = (r?: Ref | ParentRef) => (r ? `${r.name} (${r.id})` : '—')

/** Parent reference for a network node acting as a parent (SMF / MF only). */
export function refOfNode(frId: string): ParentRef {
  const n = networkStore.get().nodes[frId]
  const kind: ParentKind = n?.tier === 'Super Master' ? 'SMF' : 'MF'
  return { kind, id: frId, name: nameOf(frId) }
}
export const tlRef = (id: string): ParentRef => ({ kind: 'Team Leader', id, name: nameOf(id) })

/** SMF above a parent reference (the SMF itself, or the SMF an MF is mapped to). */
function smfAbove(ref: ParentRef, s: NetworkState): Ref {
  if (ref.kind === 'SMF') return { id: ref.id, name: ref.name }
  if (ref.kind === 'MF') {
    const p = s.nodes[ref.id]?.parent
    if (p?.kind === 'SMF') return { id: p.id, name: p.name }
  }
  return null
}
export function mappingView(current: ParentRef, next: ParentRef, s: NetworkState) {
  return {
    curSmf: smfAbove(current, s),
    curMf: current.kind === 'MF' ? { id: current.id, name: current.name } : null,
    newSmf: smfAbove(next, s),
    newMf: next.kind === 'MF' ? { id: next.id, name: next.name } : null,
  }
}

// ── Transfer type rules (§6.1) ───────────────────────────────────────────
export type SubjectKind = 'SMF' | 'MF' | 'FR' | 'Team Leader'
export type TargetKind = 'SMF' | 'MF' | 'Team Leader' | 'Company'
export const TYPE_RULES: Record<TransferType, { subject: SubjectKind; target: TargetKind; scopes: TransferScope[] }> = {
  'MF to MF': { subject: 'MF', target: 'SMF', scopes: ['MF'] },
  'SMF to SMF': { subject: 'SMF', target: 'SMF', scopes: ['Entire Network', 'MF'] },
  'SMF to Team Leader': { subject: 'SMF', target: 'Team Leader', scopes: ['Entire Network', 'MF'] },
  'SMF to Company': { subject: 'SMF', target: 'Company', scopes: ['Entire Network', 'MF'] },
  'MF to Company': { subject: 'MF', target: 'Company', scopes: ['Entire Network', 'MF'] },
  'FR to FR/MF': { subject: 'FR', target: 'MF', scopes: ['FR', 'Selected Sites'] },
  'Team Leader to Company': { subject: 'Team Leader', target: 'Company', scopes: ['Entire Network', 'Selected Sites'] },
}
export const ALL_SCOPES: TransferScope[] = ['SMF', 'MF', 'FR', 'Selected Sites', 'Entire Network']

/** What a scope means for a given transfer type (shown under the scope picker). */
export function scopeHelp(type: TransferType, scope: TransferScope): string {
  const sub = TYPE_RULES[type].subject
  if (scope === 'Entire Network') {
    if (sub === 'SMF') return 'Every MF mapped to this SMF moves to the new parent; FRs and their sites move with their MF.'
    if (sub === 'MF') return 'Every FR under this MF is mapped directly to the new parent; the MF keeps its own mapping.'
    return 'Every MF / FR mapped to this Team Leader moves to the new parent.'
  }
  if (scope === 'MF') return sub === 'SMF' ? 'Only the MFs you select below move to the new parent.' : 'The MF itself (with its FRs) moves to the new parent.'
  if (scope === 'FR') return 'The franchise moves to the new parent with all of its sites.'
  if (scope === 'Selected Sites') return 'Site-level parents are not kept separately — the FR(s) owning the selected sites are remapped; the site list is recorded on the request and in history.'
  return ''
}

/** Candidate subjects for a transfer type (exited nodes are excluded). */
export function subjectOptions(type: TransferType, s: NetworkState): { id: string; label: string }[] {
  const sub = TYPE_RULES[type].subject
  if (sub === 'Team Leader') return TEAM_LEADERS.map((t) => ({ id: t.id, label: `${t.name} (${t.id})` }))
  const tier: Tier = sub === 'SMF' ? 'Super Master' : sub === 'MF' ? 'Master' : 'Franchise'
  return franchiseStore
    .get()
    .filter((f) => f.tier === tier && s.nodes[f.id]?.status !== 'Exited')
    .map((f) => ({ id: f.id, label: `${f.name} (${s.nodes[f.id]?.code ?? f.id} · ${f.id})` }))
}

/**
 * Current parent of whatever moves. For an SMF the moved nodes are its MFs, so the "old parent"
 * is the SMF itself; same for a Team Leader and for an MF moving its whole FR network.
 */
export function currentParentFor(type: TransferType, subjectId: string, scope: TransferScope | '', s: NetworkState): ParentRef | null {
  if (!subjectId) return null
  const sub = TYPE_RULES[type].subject
  if (sub === 'Team Leader') return tlRef(subjectId)
  if (sub === 'SMF') return refOfNode(subjectId)
  if (sub === 'MF' && scope === 'Entire Network') return refOfNode(subjectId)
  return s.nodes[subjectId]?.parent ?? null
}

/** New-parent options restricted by type. */
export function targetOptions(type: TransferType, subjectId: string, current: ParentRef | null, s: NetworkState): ParentRef[] {
  const t = TYPE_RULES[type].target
  if (t === 'Company') return [COMPANY]
  if (t === 'Team Leader') return TEAM_LEADERS.filter((x) => x.id !== current?.id).map((x) => tlRef(x.id))
  const tier: Tier = t === 'SMF' ? 'Super Master' : 'Master'
  return franchiseStore
    .get()
    .filter((f) => f.tier === tier && f.id !== subjectId && f.id !== current?.id && s.nodes[f.id]?.status !== 'Exited')
    .map((f) => ({ kind: t, id: f.id, name: f.name }))
}

/** Sites belonging to the subject (FR: own sites, Team Leader: sites of FRs mapped to the TL). */
export function subjectSites(type: TransferType, subjectId: string, s: NetworkState, st: SiteState) {
  const sub = TYPE_RULES[type].subject
  if (sub === 'FR') return st.sites.filter((x) => x.frId === subjectId)
  if (sub === 'Team Leader') {
    const frs = new Set(Object.values(s.nodes).filter((n) => n.parent.id === subjectId).map((n) => n.frId))
    return st.sites.filter((x) => frs.has(x.frId))
  }
  return []
}

const live = (s: NetworkState, ids: string[]) => ids.filter((id) => s.nodes[id] && s.nodes[id].status !== 'Exited')

/**
 * Nodes whose parent changes when the transfer is applied.
 *
 * Rule for "Entire Network" (spec §6.1 / §27 rules 9–10):
 *  - SMF subject: an SMF always reports to the Company, so its network = every node mapped to it
 *    (its MFs). They are remapped to the new parent (another SMF, a Team Leader or the Company);
 *    FRs stay under their MF and therefore travel with it; sites stay on their FR.
 *  - MF subject ("MF to Company"): the FRs under the MF are mapped directly to the new parent;
 *    the MF keeps its own mapping.
 *  - Team Leader subject: every node mapped to the Team Leader is remapped.
 * Scope "MF" on an SMF moves only the selected MFs; on an MF it moves the MF itself.
 * Scope "Selected Sites" remaps the FR(s) owning those sites (no site-level parent exists).
 * Old mappings are never deleted — remapParent() pushes them into node.history.
 */
export function membersFor(t: TransferRequest, meta: TransferMeta | undefined, s: NetworkState, st: SiteState): string[] {
  const sub = meta?.subjectKind ?? TYPE_RULES[t.type].subject
  const subject = t.subjectIds[0]
  if (sub === 'FR') return live(s, [subject])
  if (sub === 'MF') return t.scope === 'Entire Network' ? live(s, childrenOf(s, subject).map((n) => n.frId)) : live(s, [subject])
  if (sub === 'SMF') return t.scope === 'MF' && meta?.memberIds?.length ? live(s, meta.memberIds) : live(s, childrenOf(s, subject).map((n) => n.frId))
  // Team Leader
  if (t.scope === 'Selected Sites') {
    const ids = new Set(st.sites.filter((x) => t.siteIds.includes(x.siteId)).map((x) => x.frId))
    return live(s, [...ids])
  }
  return live(s, childrenOf(s, subject).map((n) => n.frId))
}

// ── Transfer mutations ───────────────────────────────────────────────────
export function nextTransferId() {
  const nums = portabilityStore.get().transfers.map((t) => Number(t.id.replace(/\D/g, '')) || 0)
  return `TRF-${String(Math.max(1040, ...nums) + 1).padStart(4, '0')}`
}
export function patchTransfer(id: string, patch: Partial<TransferRequest>, logText?: string, audit?: { before?: string; after?: string }) {
  if (apiEnabled) {
    const before = portabilityStore.get().transfers.find((t) => t.id === id)
    if (before) pushTransfer(before, patch)
  }
  portabilityStore.set((s) => ({
    ...s,
    transfers: s.transfers.map((t) => (t.id === id ? { ...t, ...patch, log: logText ? [...t.log, { at: nowIso(), by: actor(), text: logText }] : t.log } : t)),
  }))
  if (logText) logMasterAudit({ entity: 'Transfer', ref: id, action: logText, by: actor(), ...audit })
}
export function addTransfer(t: TransferRequest, meta: TransferMeta) {
  portabilityStore.set((s) => ({ ...s, transfers: [t, ...s.transfers] }))
  patchTransferMeta(t.id, meta)
  logMasterAudit({ entity: 'Transfer', ref: t.id, action: 'Transfer request raised', after: `${t.type} · ${t.current.name} → ${t.next.name}`, by: actor() })
}

/** Apply the new mapping (stage "New Mapping") and preserve history. Returns what moved. */
export function applyTransfer(t: TransferRequest): Moved[] {
  if (apiEnabled) {
    // The backend remaps subjects / network / selected sites when the Super Admin approves; just refresh.
    loadNetwork(true).catch(() => undefined)
    loadSites(true).catch(() => undefined)
    return []
  }
  const s = networkStore.get()
  const meta = portExtraStore.get().transferMeta[t.id]
  const ids = membersFor(t, meta, s, siteStore.get())
  const moved: Moved[] = []
  const approvedBy = t.adminApproval?.by ?? actor()
  ids.forEach((id) => {
    const n = networkStore.get().nodes[id]
    if (!n || n.parent.id === t.next.id) return
    moved.push({ frId: id, name: nameOf(id), from: n.parent, to: t.next })
    remapParent(id, t.next, `Transfer ${t.id} (${t.type}): ${t.reason}`, { approvedBy, transferId: t.id })
  })
  patchTransferMeta(t.id, { moved, appliedAt: nowIso() })
  return moved
}

// ── Exit mutations ───────────────────────────────────────────────────────
export function nextExitId() {
  const nums = portabilityStore.get().exits.map((e) => Number(e.id.replace(/\D/g, '')) || 0)
  return `EXT-${String(Math.max(200, ...nums) + 1).padStart(4, '0')}`
}
export function patchExit(id: string, patch: Partial<ExitRequest>, logText?: string, audit?: { before?: string; after?: string }) {
  if (apiEnabled) {
    const before = portabilityStore.get().exits.find((e) => e.id === id)
    if (before) pushExit(before, patch)
  }
  portabilityStore.set((s) => ({
    ...s,
    exits: s.exits.map((e) => (e.id === id ? { ...e, ...patch, log: logText ? [...e.log, { at: nowIso(), by: actor(), text: logText }] : e.log } : e)),
  }))
  if (logText) logMasterAudit({ entity: 'Exit', ref: id, action: logText, by: actor(), ...audit })
}
export function addExit(e: ExitRequest, meta: ExitMeta) {
  portabilityStore.set((s) => ({ ...s, exits: [e, ...s.exits] }))
  patchExitMeta(e.id, meta)
  logMasterAudit({ entity: 'Exit', ref: e.id, action: 'Exit requested', after: `${e.tier} ${nameOf(e.frId)} (${e.frId})`, by: actor() })
}

/** Hand-over target options when the exiting party has a network (§27 rule 9). */
export const HANDOVER_KINDS = (tier: Tier): ParentKind[] => (tier === 'Master' ? ['MF', 'SMF', 'Team Leader', 'Company'] : ['SMF', 'Team Leader', 'Company'])
export function handoverOptions(kind: ParentKind | '', exitingId: string, s: NetworkState): ParentRef[] {
  if (!kind) return []
  if (kind === 'Company') return [COMPANY]
  if (kind === 'Team Leader') return TEAM_LEADERS.map((t) => tlRef(t.id))
  const tier: Tier = kind === 'SMF' ? 'Super Master' : 'Master'
  return franchiseStore
    .get()
    .filter((f) => f.tier === tier && f.id !== exitingId && s.nodes[f.id]?.status !== 'Exited')
    .map((f) => ({ kind, id: f.id, name: f.name }))
}
export const liveChildren = (s: NetworkState, id: string) => childrenOf(s, id).filter((n) => n.status !== 'Exited')

/** Execute an approved exit: node → Exited, children handed over, history kept. */
export function executeExit(e: ExitRequest): Moved[] {
  if (apiEnabled) {
    // The backend sets the franchise to Exited and hands the network over when the exit is approved.
    loadNetwork(true).catch(() => undefined)
    return []
  }
  const s = networkStore.get()
  const before = s.nodes[e.frId]?.status ?? '—'
  const moved: Moved[] = []
  if (e.networkTo) {
    const to = e.networkTo
    liveChildren(s, e.frId).forEach((n) => {
      moved.push({ frId: n.frId, name: nameOf(n.frId), from: n.parent, to })
      remapParent(n.frId, to, `Exit hand-over ${e.id}`, { approvedBy: e.approvedBy })
    })
  }
  updateNode(e.frId, { status: 'Exited' })
  logMasterAudit({ entity: 'Hierarchy', ref: e.frId, action: 'Status changed (exit)', before, after: 'Exited', by: actor() })
  patchExitMeta(e.id, { moved, exitedAt: nowIso() })
  return moved
}

// ── API mode (backend /transfers, /exits) ────────────────────────────────
type ApiTransfer = Omit<TransferRequest, 'id' | 'requestedOn' | 'adminApproval' | 'emailRef' | 'correspondence'> & {
  transferId: string; requestedOn: string; emailRef?: string; correspondence?: string; adminApproval?: { by: string; at: string; decision: 'Approved' | 'Rejected'; remark: string }
}
type ApiExit = Omit<ExitRequest, 'id' | 'tier'> & { exitId: string; tier: string }
const toTransfer = (t: ApiTransfer): TransferRequest => ({ ...t, id: t.transferId, emailRef: t.emailRef ?? '', correspondence: t.correspondence ?? '', documents: { ...t.documents, supporting: t.documents?.supporting ?? [] }, log: t.log ?? [] })
const toExit = (e: ApiExit): ExitRequest => ({ ...e, id: e.exitId, tier: e.tier as Tier, log: e.log ?? [] })
const mergeTransfer = (t: TransferRequest) => portabilityStore.set((s) => ({ ...s, transfers: s.transfers.some((x) => x.id === t.id) ? s.transfers.map((x) => (x.id === t.id ? t : x)) : [t, ...s.transfers] }))
const mergeExit = (e: ExitRequest) => portabilityStore.set((s) => ({ ...s, exits: s.exits.some((x) => x.id === e.id) ? s.exits.map((x) => (x.id === e.id ? e : x)) : [e, ...s.exits] }))
const enc = encodeURIComponent
const remarkOf = (r?: string, fallback = 'Approved') => (r && r.trim().length >= 3 ? r.trim() : fallback)

export async function loadPortability() {
  if (!apiEnabled) return
  const [t, e] = await Promise.all([get<{ items: ApiTransfer[] }>('/transfers', { limit: 200, sort: '-requestedOn' }), get<{ items: ApiExit[] }>('/exits', { limit: 200, sort: '-requestedOn' })])
  portabilityStore.set({ transfers: t.items.map(toTransfer), exits: e.items.map(toExit) })
}
/** Page hook: hydrate transfers + exits (and the network they refer to) once per mount. */
export function usePortabilityLoad() {
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({ loading: apiEnabled, error: null })
  useEffect(() => {
    if (!apiEnabled) return
    Promise.all([loadPortability(), loadNetwork()])
      .then(() => setState({ loading: false, error: null }))
      .catch((err: Error) => {
        setState({ loading: false, error: err.message })
        toast(err.message || 'Could not load transfers from the server.', 'error')
      })
  }, [])
  return state
}

const failed = (e: Error) => {
  toast(e.message || 'The server rejected the step.', 'error')
  loadPortability().catch(() => undefined)
}

/** Map a local stage change to the backend stage endpoint (maker-checker + SA-only approval enforced server-side). */
function pushTransfer(t: TransferRequest, p: Partial<TransferRequest>) {
  const id = enc(t.id)
  let call: Promise<ApiTransfer> | null = null
  if (p.status === 'Rejected') call = post(`/transfers/${id}/reject`, { remark: remarkOf(p.adminApproval?.remark, 'Rejected') })
  else if (p.nocOverride && !t.nocOverride) call = post(`/transfers/${id}/noc-override`, { remark: remarkOf(p.adminApproval?.remark, 'Approved without NOC') })
  else if (p.status === 'Approved' && p.adminApproval?.decision === 'Approved') call = post(`/transfers/${id}/approve`, { remark: remarkOf(p.adminApproval.remark) })
  else if (p.crmVerified && !t.crmVerified) call = post(`/transfers/${id}/verify`, {})
  else if (p.newParentAccepted && !t.newParentAccepted) call = post(`/transfers/${id}/accept`, {})
  else if (p.documents?.noc && p.documents.noc !== t.documents.noc) call = post(`/transfers/${id}/noc`, { noc: p.documents.noc })
  if (!call) return
  call
    .then((r) => {
      if (r?.transferId) mergeTransfer(toTransfer(r))
      if (p.status === 'Approved') {
        loadNetwork(true).catch(() => undefined)
        loadSites(true).catch(() => undefined)
      }
    })
    .catch(failed)
}
function pushExit(e: ExitRequest, p: Partial<ExitRequest>) {
  const id = enc(e.id)
  let call: Promise<ApiExit> | null = null
  const checklist: Record<string, boolean> = {}
  for (const k of ['settlementCleared', 'documentsReturned', 'nocIssued'] as const) if (p[k] !== undefined && p[k] !== e[k]) checklist[k] = !!p[k]
  if (Object.keys(checklist).length) call = apiPatch(`/exits/${id}/checklist`, checklist)
  else if (p.status === 'Approved') call = post(`/exits/${id}/approve`, { remark: 'Approved by Super Admin' })
  else if (p.status === 'Rejected') call = post(`/exits/${id}/reject`, { remark: remarkOf(portExtraStore.get().exitMeta[e.id]?.rejectReason, 'Rejected') })
  else if (p.networkTo) toast('The server keeps the hand-over target given when the exit was raised; this change is local only.', 'info')
  if (!call) return
  call
    .then((r) => {
      if (r?.exitId) mergeExit(toExit(r))
      if (p.status === 'Approved') loadNetwork(true).catch(() => undefined)
    })
    .catch(failed)
}

/** API mode: POST /transfers; returns the server transfer id (mock mode: local add, same id). */
export async function addTransferAsync(t: TransferRequest, meta: TransferMeta): Promise<string | null> {
  if (!apiEnabled) {
    addTransfer(t, meta)
    return t.id
  }
  try {
    const r = await post<ApiTransfer>('/transfers', {
      type: t.type, subjectIds: t.subjectIds, scope: t.scope, next: { kind: t.next.kind, id: t.next.kind === 'Company' ? undefined : t.next.id }, siteIds: t.siteIds.length ? t.siteIds : undefined,
      reason: t.reason, effectiveDate: t.effectiveDate, documents: { requestLetter: t.documents.requestLetter, supporting: t.documents.supporting }, emailRef: t.emailRef || undefined, correspondence: t.correspondence || undefined,
    })
    let tr = toTransfer(r)
    if (t.documents.noc) tr = toTransfer(await post<ApiTransfer>(`/transfers/${enc(tr.id)}/noc`, { noc: t.documents.noc }))
    mergeTransfer(tr)
    patchTransferMeta(tr.id, meta)
    return tr.id
  } catch (e) {
    toast((e as Error).message || 'The server rejected the transfer request.', 'error')
    return null
  }
}
/** API mode: POST /exits; returns the server exit id. */
export async function addExitAsync(e: ExitRequest, meta: ExitMeta): Promise<string | null> {
  if (!apiEnabled) {
    addExit(e, meta)
    return e.id
  }
  try {
    const r = await post<ApiExit>('/exits', { frId: e.frId, reason: e.reason, networkTo: e.networkTo ? { kind: e.networkTo.kind, id: e.networkTo.kind === 'Company' ? undefined : e.networkTo.id } : undefined })
    const ex = toExit(r)
    mergeExit(ex)
    patchExitMeta(ex.id, meta)
    return ex.id
  } catch (err) {
    toast((err as Error).message || 'The server rejected the exit request.', 'error')
    return null
  }
}
