import { createStore } from '@/lib/store'
import { downloadCsv } from '@/lib/export'
import { CURRENT_USER, agreementOf, legalStore, newId, siteRows, type AuditEvent } from '@/data/legal'

export type FieldKind = 'text' | 'email' | 'tel' | 'equip' | 'done' | 'date' | 'pd'

export const EQUIP_STATES = ['Pending', 'Delivered', 'Installation pending', 'Installation done']
export const DONE_STATES = ['Pending', 'Done']

export type ProjectField = { key: string; label: string; kind: FieldKind; width: number }

/** The 26 project fields, A–Z, as three bands. */
export const PROJECT_BANDS: { title: string; sub: string; range: string; fields: ProjectField[] }[] = [
  {
    title: 'Site & readiness', sub: 'Identification, model and initial work', range: 'A–I',
    fields: [
      { key: 'siteLoi', label: 'Site/LOI Number', kind: 'text', width: 170 },
      { key: 'franchisee', label: 'Name of Franchisee', kind: 'text', width: 220 },
      { key: 'frContact', label: 'FR Contact Number', kind: 'tel', width: 160 },
      { key: 'frEmail', label: 'FR Email', kind: 'email', width: 220 },
      { key: 'siteLocation', label: 'Site Location', kind: 'text', width: 220 },
      { key: 'model', label: 'Model', kind: 'text', width: 130 },
      { key: 'sdStatus', label: 'SD Status', kind: 'text', width: 140 },
      { key: 'electrical', label: 'Electrical Work', kind: 'text', width: 140 },
      { key: 'tisStatus', label: 'Tis Status', kind: 'text', width: 130 },
    ],
  },
  {
    title: 'Equipment & site works', sub: 'Delivery, installation and branding', range: 'J–R',
    fields: [
      { key: 'atmMachine', label: 'ATM Machine', kind: 'equip', width: 170 },
      { key: 'vsat', label: 'V-SAT', kind: 'equip', width: 170 },
      { key: 'ups', label: 'UPS', kind: 'equip', width: 170 },
      { key: 'grouting', label: 'Grouting', kind: 'done', width: 110 },
      { key: 'signage', label: 'Signage Board', kind: 'done', width: 130 },
      { key: 'lollypop', label: 'Lollypop', kind: 'done', width: 110 },
      { key: 'hitachi', label: "Hitachi's Branding", kind: 'done', width: 150 },
      { key: 'monkeyCage', label: 'Monkey Cage', kind: 'done', width: 120 },
      { key: 'techLive', label: 'Tech Live', kind: 'done', width: 110 },
    ],
  },
  {
    title: 'Go-live & accounts', sub: 'Activation, registration and account status', range: 'S–Z',
    fields: [
      { key: 'cashLive', label: 'Cash Live', kind: 'done', width: 110 },
      { key: 'projectionDate', label: 'Projection completion date', kind: 'pd', width: 200 },
      { key: 'agreementStatus', label: 'Agreement Status', kind: 'done', width: 150 },
      { key: 'apnaApp', label: 'Apna App Registration', kind: 'text', width: 180 },
      { key: 'wlaAccount', label: 'WLA Account Status', kind: 'text', width: 170 },
      { key: 'payoutAccount', label: 'Payout Account Status', kind: 'text', width: 260 },
      { key: 'gstStatus', label: 'GST Status', kind: 'text', width: 200 },
      { key: 'status', label: 'Status', kind: 'text', width: 200 },
    ],
  },
]
export const PROJECT_FIELDS = PROJECT_BANDS.flatMap((b) => b.fields)

export type Project = {
  id: string
  siteId: string
  franchiseId: string
  archived: boolean
  archivedAt?: string
  archiveReason?: string
  createdAt: string
  updatedAt: string
  f: Record<string, string>
}

export type ProjectState = { projects: Project[]; audit: AuditEvent[] }

/** milestones counted in the progress summary */
export const MILESTONES: { key: string; done: (v: string) => boolean }[] = [
  { key: 'electrical', done: (v) => /complete|done/i.test(v) },
  { key: 'tisStatus', done: (v) => /complete|done/i.test(v) },
  { key: 'atmMachine', done: (v) => v === 'Installation done' },
  { key: 'vsat', done: (v) => v === 'Installation done' },
  { key: 'ups', done: (v) => v === 'Installation done' },
  ...['grouting', 'signage', 'lollypop', 'hitachi', 'monkeyCage', 'techLive', 'cashLive', 'agreementStatus'].map((key) => ({ key, done: (v: string) => v === 'Done' })),
]
export const progressOf = (p: Project) => {
  const done = MILESTONES.filter((m) => m.done(p.f[m.key] ?? '')).length
  return { done, total: MILESTONES.length, pct: Math.round((done / MILESTONES.length) * 100) }
}

// ───────────────────────── Seed ─────────────────────────

const at = (day: string, time: string) => new Date(`${day}T${time}:00+05:30`).toISOString()

/** stage 0..13: how far along the go-live path a site is */
function fieldsFor(stage: number, base: Record<string, string>, n: number): Record<string, string> {
  const equip = (from: number) => (stage >= from + 2 ? 'Installation done' : stage >= from + 1 ? 'Installation pending' : stage >= from ? 'Delivered' : 'Pending')
  const done = (from: number) => (stage >= from ? 'Done' : 'Pending')
  const live = stage >= 13
  const liveDay = `${String(1 + (n % 27)).padStart(2, '0')}.${n % 2 ? '09' : '10'}.2026`
  return {
    ...base,
    sdStatus: stage >= 1 ? 'Received' : 'Pending',
    electrical: stage >= 1 ? 'Complete' : 'Pending',
    tisStatus: stage >= 2 ? 'Complete' : 'Pending',
    atmMachine: equip(3),
    vsat: equip(4),
    ups: equip(4),
    grouting: done(6),
    signage: done(7),
    lollypop: done(8),
    hitachi: done(9),
    monkeyCage: done(10),
    techLive: done(12),
    cashLive: done(13),
    projectionDate: live ? '' : `2026-${n % 2 ? '11' : '12'}-${String(5 + (n % 20)).padStart(2, '0')}`,
    agreementStatus: done(11),
    apnaApp: stage >= 9 ? 'Registered' : stage >= 5 ? 'Applied' : 'Pending',
    wlaAccount: stage >= 12 ? 'Active' : stage >= 8 ? 'Opened · KYC pending' : 'Pending',
    payoutAccount: stage >= 12 ? 'Verified' : stage >= 6 ? `Mail Sent for necessary letters_${liveDay}` : 'Pending',
    gstStatus: stage >= 10 ? 'Registered' : stage >= 6 ? `Mail Sent for necessary letters_${liveDay}` : 'Pending',
    status: live ? `Live · ${liveDay}` : stage >= 10 ? 'Go-live scheduled' : stage >= 3 ? 'Installation in progress' : 'Site preparation',
  }
}

const STAGES = [5, 13, 9, 2, 11, 7, 13, 4, 12, 0, 8, 13, 6, 10, 3, 13, 1, 9, 12, 5, 7, 13, 11, 4, 2]

function seed(): ProjectState {
  const sites = siteRows().slice(0, 25)
  const audit: AuditEvent[] = []
  const projects = sites.map((s, n): Project => {
    const id = `PRJ-${s.id.slice(-5)}`
    const main = s.id === 'ST-MH-PUN-00124'
    const base = { siteLoi: s.id, franchisee: s.franchiseName, frContact: s.contactNumber, frEmail: s.email, siteLocation: `${s.location}, ${s.city}`, model: s.model }
    const f = main
      ? { ...fieldsFor(2, base, n), sdStatus: 'Received', projectionDate: '2026-11-20', status: 'Awaiting legal clearance' }
      : fieldsFor(STAGES[n], base, n)
    // Agreement Status mirrors the legal register (Done only once the signed agreement is approved)
    f.agreementStatus = agreementOf(legalStore.get(), s.id)?.status === 'Approved' ? 'Done' : 'Pending'
    const createdAt = `${s.createdOn}T11:00:00+05:30`
    const archived = [7, 16, 23].includes(n)
    const p: Project = {
      id, siteId: s.id, franchiseId: s.franchiseId, archived, createdAt: new Date(createdAt).toISOString(), updatedAt: at('2026-10-06', '08:45'), f,
      ...(archived ? { archivedAt: at('2026-10-0' + (3 + (n % 4)), '17:30'), archiveReason: n === 16 ? 'Site dropped · landlord withdrew consent' : 'Duplicate entry merged into a newer record' } : {}),
    }
    audit.push({ id: `EV-${id}-C`, ref: id, at: p.createdAt, actor: s.owner, role: 'Administrator', event: 'Created', outcome: 'Created', context: 'Project record', version: '—', source: 'Workspace' })
    if (f.electrical === 'Complete')
      audit.push({ id: `EV-${id}-E`, ref: id, at: new Date(new Date(createdAt).getTime() + 6 * 86400e3).toISOString(), actor: 'Amit Jadhav', role: 'Engineer', event: 'Updated', outcome: 'Saved', context: 'Electrical Work: Pending → Complete', version: '—', source: 'Workspace' })
    if (f.atmMachine !== 'Pending')
      audit.push({ id: `EV-${id}-A`, ref: id, at: new Date(new Date(createdAt).getTime() + 12 * 86400e3).toISOString(), actor: 'Amit Jadhav', role: 'Engineer', event: 'Updated', outcome: 'Saved', context: `ATM Machine: Pending → ${f.atmMachine === 'Delivered' ? 'Delivered' : 'Delivered'}`, version: '—', source: 'Workspace' })
    if (archived)
      audit.push({ id: `EV-${id}-X`, ref: id, at: p.archivedAt!, actor: 'Paras Dubey', role: 'Administrator', event: 'Archived', outcome: 'Archived', context: p.archiveReason!, version: '—', source: 'Workspace' })
    return p
  })
  return { projects, audit }
}

export const projectStore = createStore<ProjectState>('dexter.projects.v1', seed)
export const useProjects = () => projectStore.use()
export const getProject = (s: ProjectState, id: string) => s.projects.find((p) => p.id === id)
export const projectAudit = (s: ProjectState, id: string) => s.audit.filter((e) => e.ref === id).sort((a, b) => b.at.localeCompare(a.at))

const log = (ref: string, event: string, outcome: string, context: string, note?: string) =>
  ({ id: newId('EV'), ref, at: new Date().toISOString(), actor: CURRENT_USER.name, role: CURRENT_USER.role, event, outcome, context, version: '—', source: 'Workspace', note }) as AuditEvent

const label = (k: string) => PROJECT_FIELDS.find((f) => f.key === k)?.label ?? k
const shown = (v: string) => v || '—'

/** Save field changes; one audit event per changed field. Returns number of changed fields. */
export function saveProjectFields(id: string, next: Record<string, string>) {
  const p = getProject(projectStore.get(), id)
  if (!p) return 0
  const changed = Object.keys(next).filter((k) => (p.f[k] ?? '') !== (next[k] ?? ''))
  if (!changed.length) return 0
  projectStore.set((s) => ({
    projects: s.projects.map((x) => (x.id === id ? { ...x, f: { ...x.f, ...next }, updatedAt: new Date().toISOString() } : x)),
    audit: [...changed.map((k) => log(id, 'Updated', 'Saved', `${label(k)}: ${shown(p.f[k] ?? '')} → ${shown(next[k] ?? '')}`)), ...s.audit],
  }))
  return changed.length
}

export function archiveProject(id: string, reason: string) {
  projectStore.set((s) => ({
    projects: s.projects.map((x) => (x.id === id ? { ...x, archived: true, archivedAt: new Date().toISOString(), archiveReason: reason } : x)),
    audit: [log(id, 'Archived', 'Archived', reason || 'Deleted from active register'), ...s.audit],
  }))
}

export function restoreProject(id: string) {
  projectStore.set((s) => ({
    projects: s.projects.map((x) => (x.id === id ? { ...x, archived: false, archivedAt: undefined, archiveReason: undefined } : x)),
    audit: [log(id, 'Restored', 'Restored', 'Moved back to Active Projects'), ...s.audit],
  }))
}

export function logProjectExport(ids: string[], what: string) {
  projectStore.set((s) => ({ ...s, audit: [...ids.map((id) => log(id, 'Exported', 'Downloaded', what)), ...s.audit] }))
}

/** CSV export of the 26 fields (+ progress); every exported project gets an audit event. */
export function exportProjects(rows: Project[], name: string) {
  downloadCsv(
    name,
    ['Project ID', ...PROJECT_FIELDS.map((f) => f.label), 'Progress'],
    rows.map((p) => {
      const pr = progressOf(p)
      return [p.id, ...PROJECT_FIELDS.map((f) => (f.kind === 'pd' && !p.f[f.key] ? 'Pending' : (p.f[f.key] ?? ''))), `${pr.done}/${pr.total}`]
    }),
  )
  logProjectExport(rows.map((p) => p.id), `Exported in ${name}.csv`)
}
