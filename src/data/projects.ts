// Site Master — Projects core master (Project spec §4, §6.2, §9, §13).
// The permanent site record lives in the central Master Data (siteStore, src/data/network.ts). This store
// only adds the project-level fields that Master Data does not hold (LOI number, site name/category,
// ownership, project dates, closure) — keyed by the same unique Site ID, never duplicating the site.
// Lifecycle and consolidated pending categories are always derived from live siteStore + installation data.
import { createStore } from '@/lib/store'
import { downloadCsv } from '@/lib/export'
import { completionOf, logMasterAudit, siteStore, type NetworkState, type Site } from '@/data/network'
import { franchiseStore, STATE_CODE, type Franchise } from '@/data/franchises'
import { actorName, nowIso, wid } from '@/data/workflow'
import { PROJECT_EXECUTIVES, isRunning, stageCounts, type InstallRecord, type InstallState } from '@/data/siteInstallation'
import { apiEnabled, get, post, patch as apiPatch } from '@/lib/api'
import { createLoader, fetchAll, toastError } from '@/data/bizApi'

// ── Lifecycle (§4.5) ─────────────────────────────────────────────────────
export type Lifecycle = 'Pipeline' | 'Active' | 'Incomplete' | 'Completed' | 'Closed' | 'Archived'
export const LIFECYCLES: Lifecycle[] = ['Pipeline', 'Active', 'Incomplete', 'Completed', 'Closed', 'Archived']
export const LIFECYCLE_MEANING: Record<Lifecycle, string> = {
  Pipeline: 'Site registered or proposed; project execution not started',
  Active: 'Site has entered the project execution lifecycle and is on track',
  Incomplete: 'Mandatory activities / module approvals pending beyond target date, on hold or rejected',
  Completed: 'All mandatory project stages and required approvals completed',
  Closed: 'Project / site formally closed by an authorized decision',
  Archived: 'Historical record retained for reference; not part of active work',
}
export const LIFECYCLE_COLOR: Record<Lifecycle, string> = { Pipeline: '#64748b', Active: '#2563eb', Incomplete: '#f59e0b', Completed: '#10b981', Closed: '#7c3aed', Archived: '#94a3b8' }

// ── Consolidated pending categories (§4.5 highlight, §6.2) ───────────────
export type PendingCategory = 'Legal – Incomplete' | 'Agreement – Incomplete' | 'Site Installation – Incomplete' | 'Documentation – Incomplete' | 'Account Setup – Incomplete'
export const PENDING_CATEGORIES: PendingCategory[] = ['Legal – Incomplete', 'Agreement – Incomplete', 'Site Installation – Incomplete', 'Documentation – Incomplete', 'Account Setup – Incomplete']
export const PENDING_MODULE: Record<PendingCategory, string> = {
  'Legal – Incomplete': 'Legal',
  'Agreement – Incomplete': 'Legal · Agreement',
  'Site Installation – Incomplete': 'Site Installation',
  'Documentation – Incomplete': 'Master Data · TIS / Documents',
  'Account Setup – Incomplete': 'Finance · Account Mapping',
}
export type PendingItem = { cat: PendingCategory; to: string }

export const SITE_CATEGORIES = ['Metro', 'Urban', 'Semi-Urban', 'Rural']
export const MODEL_NAMES: Record<string, string> = { FFM: 'FFM · Full Funding', SF: 'SF · Self Funding', CRA: 'CRA · Cash Replacement', BM: 'BM · Business Model' }
export const modelOf = (s: Site) => MODEL_NAMES[s.siteType] ?? s.siteType
export { PROJECT_EXECUTIVES }

// ── Types ────────────────────────────────────────────────────────────────
export type OwnershipField = 'Project Executive' | 'Site Owner'
export type OwnershipChange = { id: string; at: string; by: string; field: OwnershipField; from: string; to: string; reason: string }
export type Project = {
  id: string // project id (from Master Data)
  siteId: string // unique Site ID — the central reference (§10)
  loiNumber: string // unique LOI number (controlled uniqueness, §10)
  siteName: string
  siteCategory: string
  siteOwner: string
  executive: string // Assigned Project Executive
  createdAt: string
  createdBy: string
  startDate?: string
  targetDate: string
  closure?: { status: 'Closed' | 'Archived'; at: string; by: string; reason: string }
  archived: boolean // kept for the Legal › Site record link
  archivedAt?: string
  archiveReason?: string
  updatedAt: string
  updatedBy: string
  ownership: OwnershipChange[]
}
export type ProjectEvent = { id: string; ref: string; siteId: string; at: string; by: string; action: string; detail?: string }
export type ProjectState = { projects: Project[]; audit: ProjectEvent[] }

// ── Seed ─────────────────────────────────────────────────────────────────
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}
const OWNERS = ['Ramesh Kumar', 'Sunita Devi', 'Mahesh Patel', 'Anil Sharma', 'Kavya Reddy', 'Harish Gupta', 'Farhan Ali', 'Lata Joshi']
const DAY = 86400_000
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10)

function seed(): ProjectState {
  const r = rng(77)
  const frs = new Map(franchiseStore.get().map((f) => [f.id, f]))
  const today = Date.now()
  const audit: ProjectEvent[] = []
  const projects = siteStore.get().sites.map((s, i): Project => {
    const fr = frs.get(s.frId)
    const createdT = today - (40 + Math.floor(r() * 380)) * DAY
    const started = s.steps.projectMapping?.status === 'Completed'
    const p: Project = {
      id: s.projectId,
      siteId: s.siteId,
      loiNumber: `LOI/${STATE_CODE[s.state] ?? 'XX'}/${new Date(createdT).getFullYear()}/${String(i + 1).padStart(4, '0')}`,
      siteName: `${(fr?.name ?? 'Site').split(' ').slice(0, 2).join(' ')} · ${s.location.split(',')[0]}`,
      siteCategory: SITE_CATEGORIES[Math.floor(r() * SITE_CATEGORIES.length)],
      siteOwner: OWNERS[Math.floor(r() * OWNERS.length)],
      executive: PROJECT_EXECUTIVES[Math.floor(r() * PROJECT_EXECUTIVES.length)],
      createdAt: new Date(createdT).toISOString(),
      createdBy: ['Rohit Verma', 'Arjun Sethi', 'Paras Dubey'][i % 3],
      startDate: started ? isoDay(createdT + (5 + Math.floor(r() * 20)) * DAY) : undefined,
      targetDate: isoDay(createdT + (150 + Math.floor(r() * 240)) * DAY),
      archived: false,
      updatedAt: s.updatedAt,
      updatedBy: 'Rohit Verma',
      ownership: [],
    }
    const x = r()
    if (!completionOf(s).complete && x < 0.07) {
      const status = x < 0.03 ? 'Closed' : 'Archived'
      const reason = status === 'Closed' ? 'Site dropped — landlord withdrew consent (management decision)' : 'Duplicate proposal merged into a newer site record'
      const at = new Date(today - Math.floor(r() * 90) * DAY).toISOString()
      p.closure = { status, at, by: 'Paras Dubey', reason }
      if (status === 'Archived') Object.assign(p, { archived: true, archivedAt: at, archiveReason: reason })
      audit.push({ id: wid('PEV'), ref: p.id, siteId: s.siteId, at, by: 'Paras Dubey', action: `Project ${status.toLowerCase()}`, detail: reason })
    }
    if (r() < 0.12) {
      const from = PROJECT_EXECUTIVES[(PROJECT_EXECUTIVES.indexOf(p.executive) + 1) % PROJECT_EXECUTIVES.length]
      const at = new Date(createdT + 30 * DAY).toISOString()
      p.ownership.push({ id: wid('OWN'), at, by: 'Rohit Verma', field: 'Project Executive', from, to: p.executive, reason: 'Workload rebalancing' })
    }
    audit.push({ id: wid('PEV'), ref: p.id, siteId: s.siteId, at: p.createdAt, by: p.createdBy, action: 'Site Master record created', detail: `${p.siteId} · ${p.loiNumber}` })
    return p
  })
  return { projects, audit }
}

export const projectStore = createStore<ProjectState>(apiEnabled ? 'dexter.projects.api.v1' : 'dexter.projects.v2', () => (apiEnabled ? { projects: [], audit: [] } : seed()))
/** Project overlays (API mode: hydrated from GET /projects on first use). */
export const useProjects = () => {
  projectLoader.use()
  return projectStore.use()
}

/** Default overlay for sites created in Master Data after the seed (Pipeline until execution starts). */
export function defaultProject(s: Site): Project {
  return {
    id: s.projectId, siteId: s.siteId, loiNumber: '', siteName: s.location, siteCategory: '', siteOwner: '', executive: 'Unassigned', createdAt: s.updatedAt, createdBy: 'Master Data',
    targetDate: isoDay(new Date(s.updatedAt).getTime() + 180 * DAY), archived: false, updatedAt: s.updatedAt, updatedBy: 'Master Data', ownership: [],
  }
}
export const projectForSite = (st: ProjectState, site: Site) => st.projects.find((p) => p.siteId === site.siteId) ?? defaultProject(site)
export const projectAudit = (st: ProjectState, siteId: string) => st.audit.filter((e) => e.siteId === siteId).sort((a, b) => b.at.localeCompare(a.at))

// ── Derivations ──────────────────────────────────────────────────────────
const NON_AGREEMENT_LEGAL = ['LOI', 'Affidavit', 'KYC', 'PVC'] as const

export function pendingOf(site: Site, install?: InstallRecord): PendingItem[] {
  const out: PendingItem[] = []
  if (NON_AGREEMENT_LEGAL.some((d) => site.legal[d].final !== 'Complete')) out.push({ cat: 'Legal – Incomplete', to: '/legal' })
  if (site.legal.Agreement.final !== 'Complete') out.push({ cat: 'Agreement – Incomplete', to: '/legal/agreement' })
  const instPending = install ? install.status !== 'Approved' : site.steps.siteSetup?.status !== 'Completed' || site.steps.assetsDelivery?.status !== 'Completed'
  if (instPending) out.push({ cat: 'Site Installation – Incomplete', to: install ? `/projects/installation/${install.id}` : `/projects/installation/new?site=${encodeURIComponent(site.siteId)}` })
  const docPending = site.steps.tis?.status !== 'Completed' || site.steps.final?.status !== 'Completed' || (!!install && isRunning(install) && stageCounts(install, 'documentation').done < stageCounts(install, 'documentation').total)
  if (docPending) out.push({ cat: 'Documentation – Incomplete', to: `/master-data/sites/${encodeURIComponent(site.siteId)}` })
  if (site.steps.accountMapping?.status !== 'Completed' || site.steps.sdMapping?.status !== 'Completed' || site.account?.approval !== 'Approved') out.push({ cat: 'Account Setup – Incomplete', to: '/finance/settlement-bank/account-mapping' })
  return out
}

export function lifecycleOf(p: Project, site: Site, install?: InstallRecord, now = Date.now()): Lifecycle {
  if (p.closure?.status === 'Archived') return 'Archived'
  if (p.closure?.status === 'Closed') return 'Closed'
  if (completionOf(site).complete && (!install || install.status === 'Approved')) return 'Completed'
  if (!p.startDate && !install) return 'Pipeline'
  const overdue = new Date(p.targetDate).getTime() < now
  const blocked =
    Object.values(site.steps).some((s) => s.status === 'On Hold') ||
    Object.values(site.legal).some((l) => l.verification === 'Rejected' || l.verification === 'Re-upload Required') ||
    install?.status === 'Rejected by Admin' ||
    install?.status === 'Correction Requested'
  return overdue || blocked ? 'Incomplete' : 'Active'
}
/** Why a project is Incomplete — used by the AI delay analysis. */
export function incompleteReason(p: Project, site: Site, install?: InstallRecord) {
  if (install?.status === 'Rejected by Admin') return 'Installation rejected by Admin'
  if (install?.status === 'Correction Requested') return 'Franchise correction pending'
  const hold = Object.entries(site.steps).find(([, s]) => s.status === 'On Hold')
  if (hold) return `Step on hold: ${hold[1].remark ?? hold[0]}`
  if (Object.values(site.legal).some((l) => l.verification === 'Re-upload Required' || l.verification === 'Rejected')) return 'Legal document re-upload required'
  if (new Date(p.targetDate).getTime() < Date.now()) return 'Target completion date passed'
  return ''
}

export type Hier = { mf: string; smf: string }
export function hierOf(net: NetworkState, frId: string): Hier {
  const h: Hier = { mf: '', smf: '' }
  let cur = net.nodes[frId]
  const seen = new Set<string>([frId])
  for (let i = 0; cur && i < 6; i++) {
    const p = cur.parent
    if (p.kind === 'SMF' && !h.smf) h.smf = p.name
    if (p.kind === 'MF' && !h.mf) h.mf = p.name
    if (seen.has(p.id)) break
    seen.add(p.id)
    cur = net.nodes[p.id]
  }
  return h
}

export type SiteMasterRow = {
  p: Project
  site: Site
  fr?: Franchise
  frName: string
  hier: Hier
  location: string
  model: string
  lifecycle: Lifecycle
  pending: PendingItem[]
  install?: InstallRecord
  pct: number
  completedOn?: string
}

export function buildSiteMasterRows(sites: Site[], ps: ProjectState, inst: InstallState, frs: Franchise[], net: NetworkState): SiteMasterRow[] {
  const frMap = new Map(frs.map((f) => [f.id, f]))
  const pMap = new Map(ps.projects.map((p) => [p.siteId, p]))
  const iMap = new Map<string, InstallRecord>()
  inst.records.forEach((r) => {
    const cur = iMap.get(r.siteId)
    if (!cur || (isRunning(r) && !isRunning(cur)) || (isRunning(r) === isRunning(cur) && r.startedAt > cur.startedAt)) iMap.set(r.siteId, r)
  })
  const hCache = new Map<string, Hier>()
  const now = Date.now()
  return sites.map((site) => {
    const p = pMap.get(site.siteId) ?? defaultProject(site)
    const install = iMap.get(site.siteId)
    let hier = hCache.get(site.frId)
    if (!hier) {
      hier = hierOf(net, site.frId)
      hCache.set(site.frId, hier)
    }
    const fr = frMap.get(site.frId)
    const lifecycle = lifecycleOf(p, site, install, now)
    const comp = completionOf(site)
    const fin = site.steps.final
    return {
      p, site, fr, frName: fr?.name ?? site.frId, hier, install, lifecycle,
      location: `${site.district}, ${site.state}`,
      model: modelOf(site),
      pending: lifecycle === 'Completed' || lifecycle === 'Closed' || lifecycle === 'Archived' ? [] : pendingOf(site, install),
      pct: comp.pct,
      completedOn: lifecycle === 'Completed' ? (fin?.updatedAt ?? fin?.since) : undefined,
    }
  })
}

// ── Mutations (all audited) ──────────────────────────────────────────────
export type Result = { ok: true } | { ok: false; error: string }
const ev = (p: Project, action: string, detail?: string): ProjectEvent => ({ id: wid('PEV'), ref: p.id, siteId: p.siteId, at: nowIso(), by: actorName(), action, detail })

function ensure(siteId: string): Project | undefined {
  const st = projectStore.get()
  const existing = st.projects.find((p) => p.siteId === siteId)
  if (existing) return existing
  const site = siteStore.get().sites.find((s) => s.siteId === siteId)
  if (!site) return undefined
  const p = defaultProject(site)
  projectStore.set((s) => ({ ...s, projects: [...s.projects, p] }))
  return p
}

/** Controlled uniqueness of the LOI number (§10 duplicate prevention). */
export function isLoiUnique(loi: string, siteId: string) {
  const v = loi.trim().toLowerCase()
  return !!v && !projectStore.get().projects.some((p) => p.siteId !== siteId && p.loiNumber.trim().toLowerCase() === v)
}

const FIELD_LABEL: Record<string, string> = { loiNumber: 'LOI Number', siteName: 'Site Name', siteCategory: 'Site Category', startDate: 'Project Start Date', targetDate: 'Target Completion Date' }
export type EditableFields = Partial<Pick<Project, 'loiNumber' | 'siteName' | 'siteCategory' | 'startDate' | 'targetDate'>>

export function saveProject(siteId: string, next: EditableFields): Result {
  const p = ensure(siteId)
  if (!p) return { ok: false, error: 'Site not found in Master Data' }
  if (next.loiNumber !== undefined) {
    if (!next.loiNumber.trim()) return { ok: false, error: 'LOI Number is required' }
    if (!isLoiUnique(next.loiNumber, siteId)) return { ok: false, error: `LOI Number ${next.loiNumber} is already used by another site` }
  }
  const changed = (Object.keys(next) as (keyof EditableFields)[]).filter((k) => (p[k] ?? '') !== (next[k] ?? ''))
  if (!changed.length) return { ok: true }
  projectStore.set((s) => ({
    projects: s.projects.map((x) => (x.siteId === siteId ? { ...x, ...next, updatedAt: nowIso(), updatedBy: actorName() } : x)),
    audit: [...changed.map((k) => ev(p, 'Field updated', `${FIELD_LABEL[k]}: ${p[k] || '—'} → ${next[k] || '—'}`)), ...s.audit],
  }))
  remote(siteId, () => apiPatch(`/projects/${encodeURIComponent(siteId)}`, Object.fromEntries(changed.map((k) => [k, next[k] ?? '']))))
  return { ok: true }
}

/** Ownership change — old and new mapping both kept (§4.2). */
export function changeOwnership(siteId: string, field: OwnershipField, to: string, reason: string): Result {
  const p = ensure(siteId)
  if (!p) return { ok: false, error: 'Site not found' }
  if (!to.trim() || !reason.trim()) return { ok: false, error: 'New value and reason are required' }
  const from = field === 'Project Executive' ? p.executive : p.siteOwner
  if (from === to) return { ok: false, error: 'No change' }
  const change: OwnershipChange = { id: wid('OWN'), at: nowIso(), by: actorName(), field, from, to, reason }
  projectStore.set((s) => ({
    projects: s.projects.map((x) => (x.siteId === siteId ? { ...x, ...(field === 'Project Executive' ? { executive: to } : { siteOwner: to }), ownership: [change, ...x.ownership], updatedAt: nowIso(), updatedBy: actorName() } : x)),
    audit: [ev(p, `${field} changed`, `${from || '—'} → ${to}: ${reason}`), ...s.audit],
  }))
  if (!apiEnabled) logMasterAudit({ entity: 'Site', ref: siteId, action: `${field} changed`, before: from, after: to, by: actorName() })
  remote(siteId, () => post(`/projects/${encodeURIComponent(siteId)}/ownership`, { field, to, reason }))
  return { ok: true }
}

export function closeProject(siteId: string, status: 'Closed' | 'Archived', reason: string): Result {
  const p = ensure(siteId)
  if (!p) return { ok: false, error: 'Site not found' }
  if (!reason.trim()) return { ok: false, error: 'A reason is required' }
  const at = nowIso()
  projectStore.set((s) => ({
    projects: s.projects.map((x) => (x.siteId === siteId ? { ...x, closure: { status, at, by: actorName(), reason }, archived: status === 'Archived', archivedAt: status === 'Archived' ? at : undefined, archiveReason: status === 'Archived' ? reason : undefined, updatedAt: at, updatedBy: actorName() } : x)),
    audit: [ev(p, `Project ${status.toLowerCase()}`, reason), ...s.audit],
  }))
  remote(siteId, () => post(`/projects/${encodeURIComponent(siteId)}/close`, { status, reason }))
  return { ok: true }
}

export function restoreProject(siteId: string, reason: string): Result {
  const p = ensure(siteId)
  if (!p?.closure) return { ok: false, error: 'Project is not closed / archived' }
  if (!reason.trim()) return { ok: false, error: 'A reason is required' }
  projectStore.set((s) => ({
    projects: s.projects.map((x) => (x.siteId === siteId ? { ...x, closure: undefined, archived: false, archivedAt: undefined, archiveReason: undefined, updatedAt: nowIso(), updatedBy: actorName() } : x)),
    audit: [ev(p, `Restored from ${p.closure!.status}`, reason), ...s.audit],
  }))
  remote(siteId, () => post(`/projects/${encodeURIComponent(siteId)}/restore`, { reason }))
  return { ok: true }
}

export function startProject(siteId: string) {
  // API mode: the backend sets the start date when the installation starts — just re-read the overlay
  if (apiEnabled) return void refreshProject(siteId).catch(() => undefined)
  const p = ensure(siteId)
  if (!p || p.startDate) return
  projectStore.set((s) => ({ projects: s.projects.map((x) => (x.siteId === siteId ? { ...x, startDate: isoDay(Date.now()) } : x)), audit: [ev(p, 'Project execution started', 'Installation workflow initiated'), ...s.audit] }))
}

/** Site/LOI search for New Site Installation (§5.2): exact Site ID, LOI number or ATM ID. */
export function findSite(query: string): Site | undefined {
  const q = query.trim().toLowerCase()
  if (!q) return undefined
  const sites = siteStore.get().sites
  const byId = sites.find((s) => s.siteId.toLowerCase() === q || s.atmId.toLowerCase() === q)
  if (byId) return byId
  const p = projectStore.get().projects.find((x) => x.loiNumber.toLowerCase() === q)
  return p ? sites.find((s) => s.siteId === p.siteId) : undefined
}
export function suggestSites(query: string, limit = 6): { site: Site; loi: string }[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const loi = new Map(projectStore.get().projects.map((p) => [p.siteId, p.loiNumber]))
  return siteStore
    .get()
    .sites.filter((s) => s.siteId.toLowerCase().includes(q) || s.atmId.toLowerCase().includes(q) || (loi.get(s.siteId) ?? '').toLowerCase().includes(q))
    .slice(0, limit)
    .map((site) => ({ site, loi: loi.get(site.siteId) ?? '' }))
}

export function exportSiteMaster(rows: SiteMasterRow[], name: string) {
  downloadCsv(
    name,
    ['S.N.', 'Site ID', 'LOI Number', 'Site Name', 'Franchise', 'Franchise ID', 'Master Franchise', 'Super Master Franchise', 'State', 'District', 'PIN', 'Address', 'Model', 'Project Type', 'Site Category', 'Site Owner', 'Project Executive', 'Created', 'Start', 'Target', 'Lifecycle', 'Pending Modules', 'Completion %'],
    rows.map((r, i) => [
      String(i + 1), r.site.siteId, r.p.loiNumber, r.p.siteName, r.frName, r.site.frId, r.hier.mf, r.hier.smf, r.site.state, r.site.district, r.site.pin, r.site.address, r.model, r.site.projectType, r.p.siteCategory, r.p.siteOwner, r.p.executive,
      r.p.createdAt.slice(0, 10), r.p.startDate ?? '', r.p.targetDate, r.lifecycle, r.pending.map((x) => x.cat).join('; '), `${r.pct}%`,
    ]),
  )
}

// ══════════════════════════════ Backend API (VITE_API_URL) ══════════════════════════════
// The project overlay is hydrated from GET /projects (all pages); lifecycle / pending stay derived on the client from
// the Site Master + installations (same rules as the backend). Mutations patch the store optimistically, call the
// backend, then re-read the project (row + ownership + events); on failure the error is toasted and the store resynced.

type ApiClosure = { status: 'Closed' | 'Archived'; at: string; by: string; reason: string }
type ApiProjectRow = {
  projectId: string; siteId: string; loiNumber?: string; siteName?: string; siteCategory?: string; siteOwner?: string; executive?: string
  startDate?: string; targetDate?: string; closure?: ApiClosure | null; createdAt?: string; createdBy?: string; updatedAt?: string; updatedBy?: string
}
type ApiProjectDetail = ApiProjectRow & {
  ownership?: { at: string; by: string; field: OwnershipField; from: string; to: string; reason: string }[]
  events?: { eventId: string; ref: string; siteId: string; at: string; by: string; action: string; detail?: string }[]
}

function projectFromApi(x: ApiProjectRow, prev?: Project): Project {
  const closure = x.closure ? { ...x.closure, at: String(x.closure.at) } : undefined
  return {
    id: x.projectId,
    siteId: x.siteId,
    loiNumber: x.loiNumber ?? '',
    siteName: x.siteName ?? '',
    siteCategory: x.siteCategory ?? '',
    siteOwner: x.siteOwner ?? '',
    executive: x.executive || 'Unassigned',
    createdAt: x.createdAt ? String(x.createdAt) : (prev?.createdAt ?? ''),
    createdBy: x.createdBy ?? prev?.createdBy ?? '',
    startDate: x.startDate ? String(x.startDate).slice(0, 10) : undefined,
    targetDate: String(x.targetDate ?? '').slice(0, 10),
    closure,
    archived: closure?.status === 'Archived',
    archivedAt: closure?.status === 'Archived' ? closure.at : undefined,
    archiveReason: closure?.status === 'Archived' ? closure.reason : undefined,
    updatedAt: x.updatedAt ? String(x.updatedAt) : (prev?.updatedAt ?? ''),
    updatedBy: x.updatedBy ?? prev?.updatedBy ?? '',
    ownership: prev?.ownership ?? [],
  }
}

export const projectLoader = createLoader('Site Master projects', async () => {
  const rows = await fetchAll<ApiProjectRow>('/projects')
  const prev = new Map(projectStore.get().projects.map((p) => [p.siteId, p]))
  projectStore.set((s) => ({ ...s, projects: rows.map((r) => projectFromApi(r, prev.get(r.siteId))) }))
})

/** GET /projects/:siteId → overlay + ownership history + project events. */
export async function refreshProject(siteId: string) {
  if (!apiEnabled) return
  const d = await get<ApiProjectDetail>(`/projects/${encodeURIComponent(siteId)}`)
  const prev = projectStore.get().projects.find((p) => p.siteId === siteId)
  const p: Project = {
    ...projectFromApi(d, prev),
    ownership: (d.ownership ?? []).map((o, i) => ({ ...o, at: String(o.at), id: `OWN-${siteId}-${i}` })),
  }
  const events: ProjectEvent[] = (d.events ?? []).map((e) => ({ id: e.eventId, ref: e.ref, siteId: e.siteId, at: String(e.at), by: e.by, action: e.action, detail: e.detail }))
  projectStore.set((s) => ({
    projects: s.projects.some((x) => x.siteId === siteId) ? s.projects.map((x) => (x.siteId === siteId ? p : x)) : [...s.projects, p],
    audit: [...events, ...s.audit.filter((e) => e.siteId !== siteId)],
  }))
}

function remote(siteId: string, fn: () => Promise<unknown>) {
  if (!apiEnabled) return
  fn()
    .then(() => refreshProject(siteId))
    .catch((e) => {
      toastError(e, 'Site Master')
      refreshProject(siteId).catch(() => undefined)
    })
}
