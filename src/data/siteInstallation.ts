// Site Installation — execution module linked to the Site Master (Project spec §5, §6, §8.4, §12).
// One record per site in the installation workflow, shared by the CRM web portal and the franchise
// mobile app (§5.4): same statuses, same photos, same remarks. Mock only (localStorage).
//
// Workflow: franchise updates checklist + photos → CRM verifies / requests correction → CRM submits the
// verified record → Admin approves / rejects → approved data is locked, versioned and synced to the
// Site Master (siteStore) → task / email / notification via the central workflow engine.
import { createStore } from '@/lib/store'
import { downloadCsv } from '@/lib/export'
import { currentRole, type Role } from '@/lib/rbac'
import { checklistStore, emitWorkflow, wfStore, wid, nowIso, actorName, type ChecklistItem, type Notice, type WfTask } from '@/data/workflow'
import { siteStore, updateSite, type Site, type StepState } from '@/data/network'
import { franchiseStore, dossierFor } from '@/data/franchises'
import { apiEnabled, api, get, post, put, patch as apiPatch, uploadFile } from '@/lib/api'
import { createLoader, errMsg, fetchAll, toastError } from '@/data/bizApi'

// ── Types ────────────────────────────────────────────────────────────────
export type StageKey = 'info' | 'readiness' | 'equipment' | 'activation' | 'documentation' | 'final'
export const STAGES: { key: StageKey; n: number; label: string; short: string }[] = [
  { key: 'info', n: 1, label: 'Franchise & Site Info', short: 'Site Info' },
  { key: 'readiness', n: 2, label: 'Initial Readiness', short: 'Readiness' },
  { key: 'equipment', n: 3, label: 'Equipment Installation', short: 'Equipment' },
  { key: 'activation', n: 4, label: 'Operational Activation', short: 'Activation' },
  { key: 'documentation', n: 5, label: 'Documentation & Account', short: 'Docs & Account' },
  { key: 'final', n: 6, label: 'Final Status', short: 'Final' },
]
export type PhotoStage = 'readiness' | 'equipment' | 'activation' | 'documentation'
export type EntryStage = 'readiness' | 'equipment' | 'documentation'
export type ItemReview = 'Not Reviewed' | 'Verified' | 'Correction Requested'
export type PhotoReview = 'Pending Review' | 'Accepted' | 'Rejected'
export type ActorRole = 'Franchise' | 'CRM' | 'Admin' | 'System'

export type ChecklistEntry = {
  status: string
  value?: string // company name / linked reference
  franchiseRemark?: string
  crmReview: ItemReview
  crmRemark?: string
  updatedBy?: string
  updatedAt?: string
}
export type InstallPhoto = {
  id: string
  siteId: string
  stage: PhotoStage
  itemKey: string
  name: string
  dataUrl: string
  source: 'GPS Camera' | 'Gallery' | 'CRM Upload'
  gps?: string
  uploadedBy: string
  uploadedByRole: ActorRole
  uploadedAt: string
  review: PhotoReview
  reviewedBy?: string
  reviewedAt?: string
  rejectReason?: string
  deleted?: { by: string; at: string; reason: string }
  replacedById?: string
  replacesId?: string
}
export type Activation = {
  techLive: 'Pending' | 'Live'
  techLiveDate: string
  cashLive: 'Pending' | 'Live'
  cashLiveDate: string
  projectionDate: string
  remarks: string
  crmReview: ItemReview
  crmRemark?: string
}
export type InstallStatus = 'In Progress' | 'Submitted by Franchise' | 'Correction Requested' | 'Pending Admin Approval' | 'Rejected by Admin' | 'Approved' | 'Reopened'
export const INSTALL_STATUSES: InstallStatus[] = ['In Progress', 'Submitted by Franchise', 'Correction Requested', 'Pending Admin Approval', 'Rejected by Admin', 'Approved', 'Reopened']
export type Approval = 'Not Submitted' | 'Pending' | 'Approved' | 'Rejected'
export type HistoryEntry = { id: string; at: string; by: string; role: ActorRole; action: string; detail?: string }
export type ApprovedVersion = {
  version: number
  approvedAt: string
  approvedBy: string
  remarks: string
  snapshot: string // JSON of the approved data — never overwritten (§5.6, §6.1)
  reopenedAt?: string
  reopenedBy?: string
  reopenReason?: string
}

export type InstallRecord = {
  id: string
  siteId: string
  frId: string
  executive: string // Project Executive who started the workflow
  crmExecutive: string // CRM Executive (first-level verification)
  startedAt: string
  startedBy: string
  targetDate: string
  readiness: Record<string, ChecklistEntry>
  equipment: Record<string, ChecklistEntry>
  documentation: Record<string, ChecklistEntry>
  activation: Activation
  photos: InstallPhoto[]
  finalRemarks: string // team-only (never shown on the franchise app)
  status: InstallStatus
  franchiseSubmittedAt?: string
  submittedBy?: string
  submittedAt?: string
  approval: Approval
  approvedBy?: string
  approvedAt?: string
  adminRemarks?: string
  locked: boolean
  versions: ApprovedVersion[]
  history: HistoryEntry[]
  updatedAt: string
}
export type InstallState = { records: InstallRecord[] }

// ── Documentation & account fields (§5.5 D) ──────────────────────────────
export const DOC_FIELDS: { key: string; label: string; ref?: string }[] = [
  { key: 'loi', label: 'LOI Status' },
  { key: 'affidavit', label: 'Affidavit Status' },
  { key: 'agreement', label: 'Agreement Status' },
  { key: 'apnaApp', label: 'Apna App Registration' },
  { key: 'wla', label: 'WLA Account Status' },
  { key: 'payout', label: 'Payout Account Status', ref: 'Linked account reference' },
  { key: 'gst', label: 'GST Status', ref: 'Linked GST record' },
]
export const DOC_STATUSES = ['Pending', 'Submitted', 'Complete', 'N/A']

// ── Helpers ──────────────────────────────────────────────────────────────
export const isNA = (s?: string) => s === 'N/A'
export const isDone = (s?: string) => !!s && s !== 'Pending' && s !== 'N/A' && s !== 'Submitted'
const blank = (status = 'Pending'): ChecklistEntry => ({ status, crmReview: 'Not Reviewed' })
export const activePhotos = (r: InstallRecord, stage?: PhotoStage, itemKey?: string) =>
  r.photos.filter((p) => !p.deleted && !p.replacedById && (!stage || p.stage === stage) && (!itemKey || p.itemKey === itemKey))
export const checklistItems = (stage: 'readiness' | 'equipment'): ChecklistItem[] => checklistStore.get()[stage].filter((i) => i.active)
export const stageLabel = (k: StageKey) => STAGES.find((s) => s.key === k)?.label ?? k
export function itemLabel(stage: PhotoStage, key: string) {
  if (stage === 'activation') return 'Activation proof'
  if (stage === 'documentation') return DOC_FIELDS.find((d) => d.key === key)?.label ?? key
  return checklistItems(stage).find((i) => i.key === key)?.label ?? key
}

/** Applicable mandatory items (N/A excluded from the denominator — §9.2). */
export function stageCounts(r: InstallRecord, stage: EntryStage) {
  const keys = stage === 'documentation' ? DOC_FIELDS.map((d) => d.key) : checklistItems(stage).filter((i) => i.mandatory).map((i) => i.key)
  const entries = keys.map((k) => r[stage][k] ?? blank())
  const applicable = entries.filter((e) => !isNA(e.status))
  const done = applicable.filter((e) => isDone(e.status)).length
  return { done, total: applicable.length, pct: applicable.length ? Math.round((done / applicable.length) * 100) : 100 }
}
export const activationDone = (r: InstallRecord) =>
  r.activation.techLive === 'Live' && !!r.activation.techLiveDate && r.activation.cashLive === 'Live' && !!r.activation.cashLiveDate && activePhotos(r, 'activation').length > 0

/** Installation completion % — completed mandatory items ÷ applicable items (§9.2). */
export function installCompletion(r: InstallRecord) {
  const a = stageCounts(r, 'readiness')
  const b = stageCounts(r, 'equipment')
  const c = stageCounts(r, 'documentation')
  const act = (r.activation.techLive === 'Live' ? 1 : 0) + (r.activation.cashLive === 'Live' ? 1 : 0)
  const done = a.done + b.done + c.done + act
  const total = a.total + b.total + c.total + 2
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
}

export type StageState = 'Complete' | 'In Progress' | 'Correction' | 'Not Started'
function hasCorrection(r: InstallRecord, stage: PhotoStage) {
  const entries: { crmReview: ItemReview }[] = stage === 'activation' ? [r.activation] : Object.values(r[stage])
  return entries.some((e) => e.crmReview === 'Correction Requested') || activePhotos(r, stage).some((p) => p.review === 'Rejected')
}
export function stageState(r: InstallRecord, stage: StageKey): StageState {
  if (stage === 'info') return 'Complete'
  if (stage === 'final') return r.approval === 'Approved' ? 'Complete' : r.approval === 'Pending' ? 'In Progress' : r.approval === 'Rejected' ? 'Correction' : 'Not Started'
  if (hasCorrection(r, stage)) return 'Correction'
  if (stage === 'activation') {
    if (activationDone(r)) return 'Complete'
    return r.activation.techLive === 'Live' || r.activation.cashLive === 'Live' || activePhotos(r, 'activation').length ? 'In Progress' : 'Not Started'
  }
  const c = stageCounts(r, stage)
  return c.done === c.total ? 'Complete' : c.done > 0 ? 'In Progress' : 'Not Started'
}
/** Current stage = first stage that is not complete. */
export const currentStage = (r: InstallRecord) => STAGES.find((s) => stageState(r, s.key) !== 'Complete') ?? STAGES[5]

/** Overall status — system-calculated (§5.5 E). */
export function overallStatus(r: InstallRecord): 'Complete' | 'Incomplete' {
  const ok = (['readiness', 'equipment', 'documentation'] as const).every((s) => stageCounts(r, s).done === stageCounts(r, s).total) && activationDone(r)
  return ok ? 'Complete' : 'Incomplete'
}

/** Final checklist validation before submission to Admin (stage 6). Returns blocking reasons. */
export function validateForSubmission(r: InstallRecord): string[] {
  const out: string[] = []
  ;(['readiness', 'equipment', 'documentation'] as const).forEach((s) => {
    const c = stageCounts(r, s)
    if (c.done < c.total) out.push(`${stageLabel(s)}: ${c.total - c.done} mandatory item(s) pending`)
  })
  if (!activationDone(r)) out.push('Operational Activation: Tech Live and Cash Live (with dates) and an activation proof are required')
  ;(['readiness', 'equipment', 'documentation', 'activation'] as const).forEach((s) => {
    if (hasCorrection(r, s)) out.push(`${stageLabel(s)}: open correction or rejected photo`)
  })
  const unreviewed = activePhotos(r).filter((p) => p.review === 'Pending Review').length
  if (unreviewed) out.push(`${unreviewed} photo(s) not yet reviewed by CRM`)
  ;(['readiness', 'equipment'] as const).forEach((stage) =>
    checklistItems(stage)
      .filter((i) => i.mandatory && i.photos === 'Multiple')
      .forEach((i) => {
        const e = r[stage][i.key]
        if (e && isDone(e.status) && !activePhotos(r, stage, i.key).some((p) => p.review === 'Accepted')) out.push(`${i.label}: at least one accepted photo is required`)
      }),
  )
  return out
}

// ── Roles (§11) ──────────────────────────────────────────────────────────
export const isAdminRole = (r: Role = currentRole()) => r === 'Super Admin' || r === 'Admin'
/** Project Executive / CRM Executive rights (start, review, reject, submit verified stage). */
export const isCrmRole = (r: Role = currentRole()) => isAdminRole(r) || r === 'Project Head' || r === 'Project Team' || r === 'Operations Team'
export const canReopen = (r: Role = currentRole()) => r === 'Super Admin' || r === 'Admin'
/** Data is editable when not locked and not waiting for Admin. */
export const isEditable = (r: InstallRecord) => !r.locked && r.status !== 'Pending Admin Approval'
/** Running list (§5.1): approved records leave the running list (Site Master + history keep them). */
export const isRunning = (r: InstallRecord) => r.status !== 'Approved'

// ── Mock photo (GPS camera stamp) ────────────────────────────────────────
export function mockPhoto(label: string, gps: string, tone = '#1e3f95') {
  const safe = label.replace(/[<&>"]/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180"><rect width="240" height="180" fill="${tone}"/><rect y="132" width="240" height="48" fill="rgba(0,0,0,.45)"/><text x="12" y="60" fill="#fff" font-family="Arial" font-size="15" font-weight="700">${safe}</text><text x="12" y="152" fill="#fff" font-family="Arial" font-size="10">GPS ${gps}</text><text x="12" y="168" fill="#fff" font-family="Arial" font-size="10">${new Date().toLocaleString('en-IN')}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
export const mockGps = () => `${(18 + Math.random() * 10).toFixed(5)}, ${(72 + Math.random() * 12).toFixed(5)}`

/** Down-scales an image file to a small JPEG data URL so localStorage is not exhausted. */
export function readImage(file: File, max = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onerror = () => reject(fr.error)
    fr.onload = () => {
      const img = new Image()
      img.onerror = () => resolve(String(fr.result))
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * k)
        c.height = Math.round(img.height * k)
        c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', 0.7))
      }
      img.src = String(fr.result)
    }
    fr.readAsDataURL(file)
  })
}

// ── Seed ─────────────────────────────────────────────────────────────────
const DAY = 86400_000
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString()
const ymd = (daysFromNow: number) => new Date(Date.now() + daysFromNow * DAY).toISOString().slice(0, 10)
export const PROJECT_EXECUTIVES = ['Arjun Sethi', 'Rohit Verma', 'Sneha Patil', 'Imran Khan']
export const CRM_EXECUTIVES = ['Kiran Rao', 'Deepak Joshi', 'Sunil Yadav']
const TONES = ['#1e3f95', '#0f766e', '#7c3aed', '#b45309']

type Plan = { status: InstallStatus; level: number; pendingReview?: boolean; rejectPhoto?: boolean; approved?: boolean; reopened?: boolean }
const PLANS: Plan[] = [
  { status: 'In Progress', level: 0.2, pendingReview: true },
  { status: 'Submitted by Franchise', level: 0.55, pendingReview: true },
  { status: 'Correction Requested', level: 0.6, rejectPhoto: true },
  { status: 'Pending Admin Approval', level: 1 },
  { status: 'Rejected by Admin', level: 1 },
  { status: 'Reopened', level: 1, reopened: true },
  { status: 'In Progress', level: 0.35, pendingReview: true },
  { status: 'In Progress', level: 0.75 },
  { status: 'Submitted by Franchise', level: 0.85, pendingReview: true },
  { status: 'In Progress', level: 0.1 },
  { status: 'Correction Requested', level: 0.45, rejectPhoto: true },
  { status: 'Pending Admin Approval', level: 1 },
  { status: 'In Progress', level: 0.5 },
  { status: 'In Progress', level: 0.65, pendingReview: true },
]

function snapshotOf(r: InstallRecord) {
  return JSON.stringify({
    readiness: r.readiness, equipment: r.equipment, documentation: r.documentation, activation: r.activation, finalRemarks: r.finalRemarks,
    photos: activePhotos(r).map((p) => ({ id: p.id, item: `${p.stage}/${p.itemKey}`, name: p.name, review: p.review, uploadedBy: p.uploadedBy, uploadedAt: p.uploadedAt })),
  })
}

function seedRecord(site: Site, n: number, plan: Plan, executive: string, crm: string): InstallRecord {
  const apprAgo = 5 + (n % 5) * 13
  const started = plan.approved ? apprAgo + 25 + (n % 10) : 20 + ((n * 7) % 40)
  const gps = `${(18 + (n % 9)).toFixed(4)}, ${(73 + (n % 7)).toFixed(4)}`
  const photos: InstallPhoto[] = []
  const history: HistoryEntry[] = [{ id: wid('IH'), at: iso(started), by: executive, role: 'CRM', action: 'Installation started', detail: `Linked to Site Master ${site.siteId}` }]
  const fill = (stage: 'readiness' | 'equipment') => {
    const items = checklistItems(stage)
    const out: Record<string, ChecklistEntry> = {}
    const doneN = Math.round(items.length * plan.level)
    items.forEach((it, i) => {
      const done = i < doneN
      const status = it.key === 'vsat_company' ? (done ? 'Company name' : 'N/A') : done ? it.statuses[0] : i === items.length - 1 && n % 3 === 0 && stage === 'readiness' ? 'N/A' : 'Pending'
      const pendingPhoto = !!plan.pendingReview && i >= doneN - 2
      out[it.key] = { status, value: it.key === 'vsat_company' && done ? ['Hughes', 'Airtel', 'Nelco'][n % 3] : undefined, crmReview: done && !pendingPhoto ? 'Verified' : 'Not Reviewed', updatedBy: 'Franchise', updatedAt: iso(Math.max(1, started - 3 - i)) }
      if (done && it.photos === 'Multiple') {
        const count = 1 + ((n + i) % 2)
        for (let k = 0; k < count; k++)
          photos.push({
            id: wid('PH'), siteId: site.siteId, stage, itemKey: it.key, name: `${it.label} ${k + 1}.jpg`, dataUrl: mockPhoto(it.label, gps, TONES[(i + k) % 4]), source: 'GPS Camera', gps,
            uploadedBy: 'Franchise', uploadedByRole: 'Franchise', uploadedAt: iso(Math.max(1, started - 3 - i)), review: pendingPhoto ? 'Pending Review' : 'Accepted',
            reviewedBy: pendingPhoto ? undefined : crm, reviewedAt: pendingPhoto ? undefined : iso(Math.max(1, started - 4 - i)),
          })
      }
    })
    return out
  }
  const readiness = fill('readiness')
  const equipment = plan.level >= 0.5 ? fill('equipment') : Object.fromEntries(checklistItems('equipment').map((i) => [i.key, blank(i.key === 'vsat_company' ? 'N/A' : 'Pending')]))
  const full = plan.level >= 1
  const documentation: Record<string, ChecklistEntry> = Object.fromEntries(
    DOC_FIELDS.map((d, i) => {
      const legalKey = d.key === 'loi' ? 'LOI' : d.key === 'affidavit' ? 'Affidavit' : d.key === 'agreement' ? 'Agreement' : undefined
      const fromLegal = legalKey ? site.legal[legalKey].final === 'Complete' : false
      const status = full || fromLegal || (plan.level > 0.6 && i % 2 === 0) ? 'Complete' : plan.level > 0.3 && i % 3 === 0 ? 'Submitted' : 'Pending'
      const entry: ChecklistEntry = { status, value: d.key === 'payout' && status === 'Complete' ? `PAY-${site.siteId.slice(-4)}` : d.key === 'gst' && status === 'Complete' ? `GST-REG-${site.siteId.slice(-4)}` : undefined, crmReview: status === 'Complete' && !plan.pendingReview ? 'Verified' : 'Not Reviewed' }
      return [d.key, entry]
    }),
  )
  const activation: Activation = full
    ? { techLive: 'Live', techLiveDate: ymd(-6 - n), cashLive: 'Live', cashLiveDate: ymd(-3 - n), projectionDate: ymd(-2), remarks: 'Live with first transaction.', crmReview: 'Verified' }
    : { techLive: plan.level > 0.7 ? 'Live' : 'Pending', techLiveDate: plan.level > 0.7 ? ymd(-2) : '', cashLive: 'Pending', cashLiveDate: '', projectionDate: ymd(-8 + ((n * 5) % 30)), remarks: '', crmReview: 'Not Reviewed' }
  if (full)
    photos.push({ id: wid('PH'), siteId: site.siteId, stage: 'activation', itemKey: 'proof', name: 'Activation proof.jpg', dataUrl: mockPhoto('Activation proof', gps, '#047857'), source: 'GPS Camera', gps, uploadedBy: 'Franchise', uploadedByRole: 'Franchise', uploadedAt: iso(4), review: 'Accepted', reviewedBy: crm, reviewedAt: iso(3) })

  if (plan.rejectPhoto) {
    const p = photos.find((x) => x.stage === 'readiness')
    if (p) {
      p.review = 'Rejected'
      p.reviewedBy = crm
      p.reviewedAt = iso(2)
      p.rejectReason = 'Photo is blurred — signage text not readable. Please re-upload in daylight.'
      readiness[p.itemKey] = { ...readiness[p.itemKey], crmReview: 'Correction Requested', crmRemark: p.rejectReason }
      history.unshift({ id: wid('IH'), at: iso(2), by: crm, role: 'CRM', action: 'Photo rejected · correction requested', detail: `${p.name}: ${p.rejectReason}` })
    }
  }
  const rec: InstallRecord = {
    id: `INS-${String(n + 1).padStart(4, '0')}`, siteId: site.siteId, frId: site.frId, executive, crmExecutive: crm, startedAt: iso(started), startedBy: executive, targetDate: ymd(-10 + ((n * 11) % 50)),
    readiness, equipment, documentation, activation, photos, finalRemarks: full ? 'All stages verified on site visit.' : '', status: plan.status,
    approval: 'Not Submitted', locked: false, versions: [], history, updatedAt: iso(1),
  }
  if (plan.status === 'Submitted by Franchise') {
    rec.franchiseSubmittedAt = iso(1)
    rec.history.unshift({ id: wid('IH'), at: iso(1), by: 'Franchise', role: 'Franchise', action: 'Stage submitted for CRM verification' })
  }
  if (plan.status === 'Pending Admin Approval' || plan.status === 'Rejected by Admin' || plan.approved || plan.reopened) {
    rec.submittedBy = crm
    rec.submittedAt = iso(plan.approved ? apprAgo + 2 : plan.reopened ? 10 : 3)
    rec.approval = 'Pending'
    rec.history.unshift({ id: wid('IH'), at: rec.submittedAt, by: crm, role: 'CRM', action: 'Verified record submitted for Admin approval' })
  }
  if (plan.status === 'Rejected by Admin') {
    rec.approval = 'Rejected'
    rec.adminRemarks = 'Agreement copy uploaded is unsigned — please verify and resubmit.'
    rec.documentation.agreement = { ...rec.documentation.agreement, crmReview: 'Correction Requested', crmRemark: rec.adminRemarks }
    rec.history.unshift({ id: wid('IH'), at: iso(1), by: 'Meera Iyer', role: 'Admin', action: 'Admin rejected', detail: rec.adminRemarks })
  }
  if (plan.approved || plan.reopened) {
    rec.approval = 'Approved'
    rec.approvedBy = 'Meera Iyer'
    rec.approvedAt = iso(plan.approved ? apprAgo : 8)
    rec.locked = true
    rec.versions = [{ version: 1, approvedAt: rec.approvedAt, approvedBy: 'Meera Iyer', remarks: 'Approved after site verification.', snapshot: snapshotOf(rec) }]
    rec.history.unshift({ id: wid('IH'), at: rec.approvedAt, by: 'Meera Iyer', role: 'Admin', action: 'Admin approved · data locked (v1)' })
  }
  if (plan.reopened) {
    rec.locked = false
    rec.approval = 'Not Submitted'
    rec.versions[0] = { ...rec.versions[0], reopenedAt: iso(2), reopenedBy: 'Meera Iyer', reopenReason: 'Payout account changed by franchise — amendment required.' }
    rec.documentation.payout = { ...rec.documentation.payout, status: 'Pending', value: undefined, crmReview: 'Not Reviewed' }
    rec.history.unshift({ id: wid('IH'), at: iso(2), by: 'Meera Iyer', role: 'Admin', action: 'Reopened for amendment', detail: rec.versions[0].reopenReason })
  }
  return rec
}

function seed(): InstallState {
  const sites = siteStore.get().sites
  const running = sites.filter((s) => s.steps.tis?.status === 'Completed' && s.steps.siteSetup?.status !== 'Completed').slice(0, PLANS.length)
  const done = sites.filter((s) => s.steps.siteSetup?.status === 'Completed' && s.steps.assetsDelivery?.status === 'Completed').slice(0, 5)
  const records: InstallRecord[] = []
  running.forEach((s, i) => records.push(seedRecord(s, i, PLANS[i], PROJECT_EXECUTIVES[i % PROJECT_EXECUTIVES.length], CRM_EXECUTIVES[i % 2])))
  done.forEach((s, i) => records.push(seedRecord(s, running.length + i, { status: 'Approved', level: 1, approved: true }, PROJECT_EXECUTIVES[(i + 1) % PROJECT_EXECUTIVES.length], CRM_EXECUTIVES[i % 2])))
  seedTasks(records)
  return { records }
}

/** One-time demo tasks so the escalation / task views have data (normally created by emitWorkflow). */
function seedTasks(records: InstallRecord[]) {
  const existing = new Set(wfStore.get().tasks.map((t) => t.refId))
  const map: Partial<Record<InstallStatus, [string, string]>> = {
    'In Progress': ['Franchise checklist & photo update pending', 'EMP-005'],
    'Submitted by Franchise': ['CRM verification – franchise submission', 'EMP-005'],
    'Correction Requested': ['Franchise correction – rejected photo', 'EMP-005'],
    'Pending Admin Approval': ['Admin approval – Site Installation', 'EMP-002'],
    'Rejected by Admin': ['CRM correction task – Admin rejected', 'EMP-005'],
    Reopened: ['Amendment after reopen', 'EMP-005'],
  }
  const tasks: WfTask[] = []
  records.forEach((r, i) => {
    const m = map[r.status]
    if (!m || existing.has(r.id)) return
    const age = [1, 2, 5, 9, 17, 3, 6, 12][i % 8]
    const created = Date.now() - age * DAY
    const due = created + 2 * DAY
    const overdue = due < Date.now()
    tasks.push({
      id: wid('TSK'), module: 'Site Installation', refId: r.id, siteId: r.siteId, title: `${m[0]} – ${r.siteId}`, assignedTo: m[1], assignedBy: 'System', createdAt: new Date(created).toISOString(), dueAt: new Date(due).toISOString(),
      priority: r.status === 'Pending Admin Approval' ? 'High' : 'Medium', status: overdue ? 'Overdue' : 'Pending', escalationLevel: overdue ? (age > 8 ? 3 : 2) : 1, emailRefs: [], history: [{ at: new Date(created).toISOString(), by: 'System', text: 'Created (demo seed)' }],
    })
  })
  if (tasks.length) wfStore.set((s) => ({ ...s, tasks: [...tasks, ...s.tasks] }))
}

export const siteInstallationStore = createStore<InstallState>(apiEnabled ? 'dexter.siteInstallation.api.v1' : 'dexter.siteInstallation.v2', () => (apiEnabled ? { records: [] } : seed()))
/** Installation records (API mode: hydrated from /installations — or /my/installations for a franchisee — on first use). */
export const useSiteInstallations = () => {
  installLoader.use()
  return siteInstallationStore.use()
}
export const getInstall = (id: string) => siteInstallationStore.get().records.find((r) => r.id === id)
/** Latest installation record of a site (running first). */
export const installForSite = (s: InstallState, siteId: string) =>
  s.records.filter((r) => r.siteId === siteId).sort((a, b) => Number(isRunning(b)) - Number(isRunning(a)) || b.startedAt.localeCompare(a.startedAt))[0]

// ── Mutations ────────────────────────────────────────────────────────────
export type Result = { ok: true } | { ok: false; error: string }
const fail = (error: string): Result => ({ ok: false, error })
const OK: Result = { ok: true }

function patch(id: string, fn: (r: InstallRecord) => InstallRecord) {
  siteInstallationStore.set((s) => ({ records: s.records.map((r) => (r.id === id ? { ...fn(r), updatedAt: nowIso() } : r)) }))
}
/** Central workflow event — mock mode only (the backend emits it in API mode). */
const emitWf = (...a: Parameters<typeof emitWorkflow>) => {
  if (!apiEnabled) emitWorkflow(...a)
}
const hist = (role: ActorRole, action: string, detail?: string): HistoryEntry => ({ id: wid('IH'), at: nowIso(), by: role === 'Franchise' ? 'Franchise' : actorName(), role, action, detail })

function varsFor(r: InstallRecord) {
  const fr = franchiseStore.get().find((f) => f.id === r.frId)
  return { Record_ID: r.id, Site_ID: r.siteId, Site_LOI_Number: r.siteId, Franchise_Name: fr?.name ?? r.frId, Current_Status: r.status }
}
export const franchiseEmail = (frId: string) => {
  const fr = franchiseStore.get().find((f) => f.id === frId)
  return fr ? dossierFor(fr).email : undefined
}
/** In-app / push alert without touching tasks (photo upload, rejection — §12). */
function notify(r: InstallRecord, to: 'Franchise' | 'CRM' | 'Admin', text: string) {
  if (apiEnabled) return // the backend notifies (in-app + push) in API mode
  const addr = to === 'Franchise' ? (franchiseEmail(r.frId) ?? 'franchise@partner.example') : to === 'Admin' ? 'meera.iyer@dexterindia.in' : 'kiran.rao@dexterindia.in'
  const n: Notice = { id: wid('NTF'), at: nowIso(), to: addr, channel: to === 'Franchise' ? 'Mobile push' : 'In-app', module: 'Site Installation', refId: r.id, text, read: false }
  wfStore.set((s) => ({ ...s, notices: [n, ...s.notices].slice(0, 3000) }))
}

/** §5.2 — never creates a duplicate: returns the running record if the site already has one. */
export function startInstallation(siteId: string, input: { executive: string; crmExecutive: string; targetDate: string }): { record: InstallRecord; existed: boolean } | { error: string } {
  const site = siteStore.get().sites.find((s) => s.siteId === siteId)
  if (!site) return { error: 'Site is not in the Site Master. Create the Master Data record first.' }
  const existing = siteInstallationStore.get().records.find((r) => r.siteId === siteId && isRunning(r))
  if (existing) return { record: existing, existed: true }
  const n = siteInstallationStore.get().records.length
  const rec: InstallRecord = {
    id: `INS-${String(n + 1).padStart(4, '0')}`,
    siteId, frId: site.frId, executive: input.executive, crmExecutive: input.crmExecutive, startedAt: nowIso(), startedBy: actorName(), targetDate: input.targetDate,
    readiness: Object.fromEntries(checklistItems('readiness').map((i) => [i.key, blank()])),
    equipment: Object.fromEntries(checklistItems('equipment').map((i) => [i.key, blank(i.key === 'vsat_company' ? 'N/A' : 'Pending')])),
    documentation: Object.fromEntries(
      DOC_FIELDS.map((d) => {
        const legalKey = d.key === 'loi' ? 'LOI' : d.key === 'affidavit' ? 'Affidavit' : d.key === 'agreement' ? 'Agreement' : undefined
        const pre = legalKey && site.legal[legalKey].final === 'Complete' ? 'Complete' : d.key === 'payout' && site.payout?.status === 'Mapped' ? 'Complete' : d.key === 'wla' && site.account?.approval === 'Approved' ? 'Complete' : 'Pending'
        return [d.key, { ...blank(pre), value: d.key === 'payout' && pre === 'Complete' ? site.payout?.accountNo.replace(/\d(?=\d{4})/g, 'X') : undefined }]
      }),
    ),
    activation: { techLive: 'Pending', techLiveDate: '', cashLive: 'Pending', cashLiveDate: '', projectionDate: input.targetDate, remarks: '', crmReview: 'Not Reviewed' },
    photos: [], finalRemarks: '', status: 'In Progress', approval: 'Not Submitted', locked: false, versions: [],
    history: [hist('CRM', 'Installation started', `Linked to Site Master ${siteId} · Executive ${input.executive} · CRM ${input.crmExecutive}`)], updatedAt: nowIso(),
  }
  // ensure unique id even after deletions in other tabs
  while (siteInstallationStore.get().records.some((r) => r.id === rec.id)) rec.id = `${rec.id}A`
  siteInstallationStore.set((s) => ({ records: [rec, ...s.records] }))
  updateSite(siteId, (s) => ({ installation: 'In Progress', steps: { ...s.steps, siteSetup: { ...s.steps.siteSetup, status: s.steps.siteSetup.status === 'Completed' ? 'Completed' : 'In Progress', updatedAt: nowIso() } } }), { action: 'Site Installation started', after: rec.id })
  emitWf({ module: 'Site Installation', event: 'Assign', refId: rec.id, vars: varsFor(rec), nextAction: { title: `Initial readiness checklist pending – ${siteId}`, ownerId: 'EMP-005', dueHours: 72 } })
  notify(rec, 'Franchise', `New site available: ${siteId} — please update the Initial Readiness checklist`)
  notify(rec, 'CRM', `Site ${siteId} assigned — ${input.executive} (Project Executive) informed`)
  return { record: rec, existed: false }
}

export function updateEntry(id: string, stage: EntryStage, key: string, next: Partial<Pick<ChecklistEntry, 'status' | 'value' | 'franchiseRemark'>>, role: ActorRole): Result {
  const r = getInstall(id)
  if (!r) return fail('Record not found')
  if (!isEditable(r)) return fail(r.locked ? 'Approved data is locked. An authorized Admin must reopen it.' : 'Record is with Admin for approval — editing is blocked.')
  const prev = r[stage][key] ?? blank()
  const label = stage === 'documentation' ? DOC_FIELDS.find((d) => d.key === key)?.label : checklistItems(stage).find((i) => i.key === key)?.label
  const changes = [next.status !== undefined && next.status !== prev.status ? `${prev.status} → ${next.status}` : '', next.value !== undefined && next.value !== prev.value ? `value "${next.value}"` : ''].filter(Boolean).join(', ')
  const statusChanged = next.status !== undefined && next.status !== prev.status
  const review: ItemReview = prev.crmReview === 'Correction Requested' && role === 'Franchise' ? 'Not Reviewed' : prev.crmReview === 'Verified' && statusChanged && role === 'Franchise' ? 'Not Reviewed' : prev.crmReview
  patch(id, (x) => ({
    ...x,
    [stage]: { ...x[stage], [key]: { ...prev, ...next, crmReview: review, updatedBy: role === 'Franchise' ? 'Franchise' : actorName(), updatedAt: nowIso() } },
    status: x.status === 'Submitted by Franchise' && role === 'Franchise' ? 'In Progress' : x.status,
    history: changes || next.franchiseRemark ? [hist(role, `${label ?? key} updated`, changes || `Remark: ${next.franchiseRemark}`), ...x.history] : x.history,
  }))
  remote(id, () => apiPatch(`${base(role)}/${id}/entries/${stage}/${key}`, role === 'Franchise' ? next : { status: next.status, value: next.value }))
  return OK
}

export function updateActivation(id: string, next: Partial<Omit<Activation, 'crmReview' | 'crmRemark'>>, role: ActorRole): Result {
  const r = getInstall(id)
  if (!r) return fail('Record not found')
  if (!isEditable(r)) return fail('Record is locked or with Admin.')
  const prev = r.activation as unknown as Record<string, string>
  const detail = Object.entries(next)
    .map(([k, v]) => `${k}: ${prev[k] || '—'} → ${String(v) || '—'}`)
    .join(', ')
  patch(id, (x) => ({ ...x, activation: { ...x.activation, ...next, crmReview: role === 'Franchise' && x.activation.crmReview === 'Correction Requested' ? 'Not Reviewed' : x.activation.crmReview }, history: [hist(role, 'Operational activation updated', detail), ...x.history] }))
  remote(id, () => apiPatch(`${base(role)}/${id}/activation`, next))
  return OK
}

export function setFinalRemarks(id: string, text: string): Result {
  const r = getInstall(id)
  if (!r || !isEditable(r)) return fail('Record is locked.')
  patch(id, (x) => ({ ...x, finalRemarks: text, history: [hist('CRM', 'Final remarks updated (team-only)'), ...x.history] }))
  remote(id, () => put(`/installations/${id}/final-remarks`, { text }))
  return OK
}

export function addPhoto(id: string, input: { stage: PhotoStage; itemKey: string; name: string; dataUrl: string; source: InstallPhoto['source']; gps?: string; role: ActorRole; replacesId?: string; file?: File }): Result {
  const r = getInstall(id)
  if (!r) return fail('Record not found')
  if (!isEditable(r)) return fail('Record is locked or with Admin — uploads are blocked.')
  const fr = input.role === 'Franchise'
  const photo: InstallPhoto = {
    id: wid('PH'), siteId: r.siteId, stage: input.stage, itemKey: input.itemKey, name: input.name, dataUrl: input.dataUrl, source: input.source, gps: input.gps,
    uploadedBy: fr ? 'Franchise' : actorName(), uploadedByRole: input.role, uploadedAt: nowIso(), review: fr ? 'Pending Review' : 'Accepted',
    reviewedBy: fr ? undefined : actorName(), reviewedAt: fr ? undefined : nowIso(), replacesId: input.replacesId,
  }
  patch(id, (x) => {
    const next: InstallRecord = { ...x, photos: [...x.photos.map((p) => (p.id === input.replacesId ? { ...p, replacedById: photo.id } : p)), photo] }
    // a replaced rejected photo clears the correction flag on the franchise side (CRM re-reviews)
    if (fr && input.stage !== 'activation' && next[input.stage][input.itemKey]?.crmReview === 'Correction Requested')
      next[input.stage] = { ...next[input.stage], [input.itemKey]: { ...next[input.stage][input.itemKey], crmReview: 'Not Reviewed' } }
    if (fr && input.stage === 'activation' && next.activation.crmReview === 'Correction Requested') next.activation = { ...next.activation, crmReview: 'Not Reviewed' }
    next.history = [hist(input.role, input.replacesId ? 'Photo replaced' : 'Photo uploaded', `${itemLabel(input.stage, input.itemKey)} · ${input.name}${input.replacesId ? ` (replaces ${input.replacesId}; original kept in audit)` : ''} · ${input.source}${input.gps ? ` · GPS ${input.gps}` : ''}`), ...x.history]
    return next
  })
  remote(id, async () => {
    // real image → POST /files (fileId); the mock GPS stamp has no file and is recorded by name only
    const fileId = input.file ? (await uploadFile(input.file, { purpose: 'installation-photo', entity: 'SiteInstallation', ref: id })).fileId : undefined
    if (fileId) photoCache.set(fileId, input.dataUrl)
    else photoCache.set(`${input.stage}|${input.itemKey}|${input.name}`, input.dataUrl)
    return post(`${base(input.role)}/${id}/photos`, { stage: input.stage, itemKey: input.itemKey, name: input.name, fileId, source: input.source, gps: input.gps, replacesId: input.replacesId })
  })
  if (fr) {
    notify(r, 'CRM', `Photo uploaded for ${r.siteId} (${itemLabel(input.stage, input.itemKey)}) — CRM review pending`)
    notify(r, 'Franchise', `Upload received: ${input.name}`)
  }
  return OK
}

export function reviewPhoto(id: string, photoId: string, decision: 'Accepted' | 'Rejected', reason = ''): Result {
  const r = getInstall(id)
  const p = r?.photos.find((x) => x.id === photoId)
  if (!r || !p) return fail('Photo not found')
  if (!isEditable(r)) return fail('Record is locked.')
  if (decision === 'Rejected' && !reason.trim()) return fail('A rejection reason is required.')
  patch(id, (x) => {
    const next: InstallRecord = { ...x, photos: x.photos.map((q) => (q.id === photoId ? { ...q, review: decision, reviewedBy: actorName(), reviewedAt: nowIso(), rejectReason: decision === 'Rejected' ? reason : undefined } : q)) }
    if (decision === 'Rejected') {
      const stage = p.stage
      if (stage === 'activation') next.activation = { ...next.activation, crmReview: 'Correction Requested', crmRemark: reason }
      else next[stage] = { ...next[stage], [p.itemKey]: { ...(next[stage][p.itemKey] ?? blank()), crmReview: 'Correction Requested', crmRemark: reason } }
      next.status = 'Correction Requested'
    }
    next.history = [hist('CRM', decision === 'Rejected' ? 'Photo rejected · correction requested' : 'Photo accepted', `${p.name}${reason ? `: ${reason}` : ''}`), ...x.history]
    return next
  })
  if (decision === 'Rejected') notify(r, 'Franchise', `Photo rejected for ${r.siteId} (${itemLabel(p.stage, p.itemKey)}): ${reason} — please re-upload`)
  remote(id, () => post(`/installations/${id}/photos/${photoId}/review`, { decision, reason: reason || undefined }))
  return OK
}

/** Soft delete — the original upload, uploader and timestamp stay in the audit (§5.6). */
export function deletePhoto(id: string, photoId: string, reason: string): Result {
  const r = getInstall(id)
  const p = r?.photos.find((x) => x.id === photoId)
  if (!r || !p) return fail('Photo not found')
  if (!isEditable(r)) return fail('Record is locked.')
  if (!reason.trim()) return fail('A reason is required to delete a photo.')
  patch(id, (x) => ({
    ...x,
    photos: x.photos.map((q) => (q.id === photoId ? { ...q, deleted: { by: actorName(), at: nowIso(), reason } } : q)),
    history: [hist('CRM', 'Photo deleted (soft delete)', `${p.name} · uploaded by ${p.uploadedBy} on ${new Date(p.uploadedAt).toLocaleString('en-IN')} · reason: ${reason}`), ...x.history],
  }))
  remote(id, () => api(`/installations/${id}/photos/${photoId}`, { method: 'DELETE', body: { reason } }))
  return OK
}

/** CRM item-wise review (verify / request correction). */
export function reviewEntry(id: string, stage: EntryStage | 'activation', key: string, decision: 'Verified' | 'Correction Requested', remark = ''): Result {
  const r = getInstall(id)
  if (!r || !isEditable(r)) return fail('Record is locked.')
  if (decision === 'Correction Requested' && !remark.trim()) return fail('Enter the correction remark for the franchise.')
  const label = stage === 'activation' ? 'Operational activation' : itemLabel(stage, key)
  patch(id, (x) => {
    const next: InstallRecord = { ...x }
    if (stage === 'activation') next.activation = { ...x.activation, crmReview: decision, crmRemark: remark || undefined }
    else next[stage] = { ...x[stage], [key]: { ...(x[stage][key] ?? blank()), crmReview: decision, crmRemark: remark || undefined } }
    if (decision === 'Correction Requested') next.status = 'Correction Requested'
    next.history = [hist('CRM', decision === 'Verified' ? `Verified: ${label}` : `Correction requested: ${label}`, remark || undefined), ...x.history]
    return next
  })
  if (decision === 'Correction Requested') notify(r, 'Franchise', `Correction requested on ${r.siteId} (${label}): ${remark}`)
  remote(id, () => post(`/installations/${id}/entries/${stage}/${key}/review`, { decision, remark: remark || undefined }))
  return OK
}

/** CRM sends the record back to the franchise (§6 "Request correction"). */
export function requestCorrection(id: string, remark: string): Result {
  const r = getInstall(id)
  if (!r || !isEditable(r)) return fail('Record is locked.')
  if (!remark.trim()) return fail('Enter the correction remark.')
  patch(id, (x) => ({ ...x, status: 'Correction Requested', history: [hist('CRM', 'Correction requested from franchise', remark), ...x.history] }))
  emitWf({ module: 'Site Installation', event: 'Return', refId: r.id, vars: { ...varsFor(r), Current_Status: 'Correction Requested', Pending_Action: remark }, nextAction: { title: `Franchise correction pending – ${r.siteId}`, ownerId: 'EMP-005', dueHours: 48 }, franchiseEmail: franchiseEmail(r.frId) })
  notify(r, 'Franchise', `Correction requested on ${r.siteId}: ${remark}`)
  remote(id, () => post(`/installations/${id}/request-correction`, { remark }))
  return OK
}

/** Franchise (mobile) submits / resubmits for CRM verification (§12 "Stage submitted"). */
export function franchiseSubmit(id: string, remark = ''): Result {
  const r = getInstall(id)
  if (!r || !isEditable(r)) return fail('Record is locked or with Admin.')
  const openRejected = activePhotos(r).filter((p) => p.review === 'Rejected').length
  if (openRejected) return fail(`${openRejected} rejected photo(s) must be replaced before resubmitting.`)
  const resub = r.status === 'Correction Requested' || r.status === 'Rejected by Admin'
  patch(id, (x) => ({ ...x, status: 'Submitted by Franchise', franchiseSubmittedAt: nowIso(), history: [hist('Franchise', resub ? 'Correction resubmitted for CRM verification' : 'Stage submitted for CRM verification', remark || undefined), ...x.history] }))
  emitWf({ module: 'Site Installation', event: 'Pending', refId: r.id, vars: { ...varsFor(r), Current_Status: 'Submitted by Franchise' }, nextAction: { title: `CRM verification – franchise submission ${r.siteId}`, ownerId: 'EMP-005', dueHours: 24 } })
  notify(r, 'Franchise', `Submission received for ${r.siteId} — CRM verification in progress`)
  remote(id, () => post(`${base('Franchise')}/${id}/submit`, { remark: remark || undefined }))
  return OK
}

/** CRM submits the verified record to Admin (§6.1 final submission; §8.4 "CRM submits site"). */
export function submitForApproval(id: string): Result {
  const r = getInstall(id)
  if (!r) return fail('Record not found')
  if (!isCrmRole()) return fail('Only CRM / Project Executive or Admin can submit a verified stage.')
  if (!isEditable(r)) return fail('Record is locked or already with Admin.')
  const issues = validateForSubmission(r)
  if (issues.length) return fail(`Final checklist validation failed: ${issues[0]}${issues.length > 1 ? ` (+${issues.length - 1} more)` : ''}`)
  patch(id, (x) => ({ ...x, status: 'Pending Admin Approval', approval: 'Pending', submittedBy: actorName(), submittedAt: nowIso(), history: [hist('CRM', 'Verified record submitted for Admin approval'), ...x.history] }))
  emitWf({ module: 'Site Installation', event: 'Submit', refId: r.id, vars: { ...varsFor(r), Current_Status: 'Pending Admin Approval' }, nextAction: { title: `Admin approval – Site Installation ${r.siteId}`, ownerId: 'EMP-002', dueHours: 48, priority: 'High' } })
  notify(r, 'Franchise', `${r.siteId} submitted for Admin approval`)
  remote(id, () => post(`/installations/${id}/submit`))
  return OK
}

/** Admin approves (lock + version + Site Master sync) or rejects (correction task). */
export function adminDecision(id: string, decision: 'Approved' | 'Rejected', remarks: string): Result {
  const r = getInstall(id)
  if (!r) return fail('Record not found')
  if (!isAdminRole()) return fail('Only Admin can give the final approval.')
  if (r.status !== 'Pending Admin Approval') return fail('Record is not pending Admin approval.')
  if (decision === 'Rejected' && !remarks.trim()) return fail('Rejection remarks are required.')
  if (decision === 'Rejected') {
    patch(id, (x) => ({ ...x, status: 'Rejected by Admin', approval: 'Rejected', adminRemarks: remarks, history: [hist('Admin', 'Admin rejected', remarks), ...x.history] }))
    emitWf({ module: 'Site Installation', event: 'Reject', refId: r.id, vars: { ...varsFor(r), Current_Status: 'Rejected by Admin', Pending_Action: remarks }, nextAction: { title: `CRM correction task – Admin rejected ${r.siteId}`, ownerId: 'EMP-005', dueHours: 48 }, franchiseEmail: franchiseEmail(r.frId) })
    notify(r, 'Franchise', `Admin returned ${r.siteId} for correction: ${remarks}`)
    remote(id, () => post(`/installations/${id}/decision`, { decision, remarks }))
    return OK
  }
  const at = nowIso()
  patch(id, (x) => {
    const version: ApprovedVersion = { version: x.versions.length + 1, approvedAt: at, approvedBy: actorName(), remarks, snapshot: snapshotOf(x) }
    return { ...x, status: 'Approved', approval: 'Approved', approvedBy: actorName(), approvedAt: at, adminRemarks: remarks, locked: true, versions: [...x.versions, version], history: [hist('Admin', `Admin approved · data locked (v${version.version})`, remarks || undefined), ...x.history] }
  })
  const approved = getInstall(id)
  if (approved) syncToSiteMaster(approved)
  emitWf({ module: 'Site Installation', event: 'Approve', refId: r.id, vars: { ...varsFor(r), Current_Status: 'Approved' } })
  notify(r, 'Franchise', `Final approval: ${r.siteId} installation approved`)
  notify(r, 'CRM', `${r.siteId} approved by Admin — data locked and synced to Site Master`)
  remote(id, () => post(`/installations/${id}/decision`, { decision, remarks }))
  return OK
}

/** Only approved data becomes authoritative Site Master data (§6.1 critical control). */
function syncToSiteMaster(r: InstallRecord) {
  if (apiEnabled) return // the backend syncs the Site Master on approval
  const step = (s: StepState, done: boolean): StepState => (done ? { ...s, status: 'Completed', updatedAt: nowIso(), remark: `Synced from approved installation ${r.id}` } : s)
  const rc = stageCounts(r, 'readiness')
  const ec = stageCounts(r, 'equipment')
  updateSite(
    r.siteId,
    (s) => ({
      installation: 'Completed',
      operational: r.activation.cashLive === 'Live' ? true : s.operational,
      steps: { ...s.steps, siteSetup: step(s.steps.siteSetup, rc.done === rc.total), assetsDelivery: step(s.steps.assetsDelivery, ec.done === ec.total), firstTxn: step(s.steps.firstTxn, r.activation.cashLive === 'Live') },
    }),
    { action: 'Approved installation synced', before: 'Installation in progress', after: `${r.id} v${r.versions.length} approved` },
  )
}

/** Controlled reopen — authorized Admin, reason mandatory; the approved version is kept (§5.6, §6.1). */
export function reopenRecord(id: string, reason: string): Result {
  const r = getInstall(id)
  if (!r) return fail('Record not found')
  if (!canReopen()) return fail('Only an authorized Admin can reopen an approved record.')
  if (!r.locked) return fail('Record is not locked.')
  if (!reason.trim()) return fail('A reopen reason is required.')
  patch(id, (x) => ({
    ...x, status: 'Reopened', approval: 'Not Submitted', locked: false,
    versions: x.versions.map((v, i) => (i === x.versions.length - 1 ? { ...v, reopenedAt: nowIso(), reopenedBy: actorName(), reopenReason: reason } : v)),
    history: [hist('Admin', 'Reopened for amendment', reason), ...x.history],
  }))
  emitWf({ module: 'Site Installation', event: 'Return', refId: r.id, vars: { ...varsFor(r), Current_Status: 'Reopened', Pending_Action: reason }, nextAction: { title: `Amendment after reopen – ${r.siteId}`, ownerId: 'EMP-005', dueHours: 72 } })
  remote(id, () => post(`/installations/${id}/reopen`, { reason }))
  return OK
}

export function reassign(id: string, field: 'executive' | 'crmExecutive', to: string, reason: string): Result {
  const r = getInstall(id)
  if (!r) return fail('Record not found')
  if (!reason.trim()) return fail('A reason is required.')
  if (r.locked) return fail('Record is locked.')
  patch(id, (x) => ({ ...x, [field]: to, history: [hist('CRM', field === 'executive' ? 'Project Executive changed' : 'CRM Executive changed', `${x[field]} → ${to}: ${reason}`), ...x.history] }))
  remote(id, () => post(`/installations/${id}/reassign`, { field, to, reason }))
  return OK
}

// ── Export ───────────────────────────────────────────────────────────────
export function exportInstallations(rows: { r: InstallRecord; franchise: string; location: string; model: string }[], name: string) {
  const rItems = checklistItems('readiness')
  const eItems = checklistItems('equipment')
  downloadCsv(
    name,
    ['Installation ID', 'Site ID', 'Franchise', 'Location', 'Model', 'Project Executive', 'CRM Executive', 'Status', 'Admin Approval', 'Current Stage', 'Completion %', ...rItems.map((i) => i.label), ...eItems.map((i) => i.label), 'Tech Live', 'Tech Live Date', 'Cash Live', 'Cash Live Date', 'Projection Completion Date', ...DOC_FIELDS.map((d) => d.label), 'Overall Status', 'Submitted By', 'Submitted At', 'Approved By', 'Approved At'],
    rows.map(({ r, franchise, location, model }) => [
      r.id, r.siteId, franchise, location, model, r.executive, r.crmExecutive, r.status, r.approval, currentStage(r).label, `${installCompletion(r).pct}%`,
      ...rItems.map((i) => r.readiness[i.key]?.status ?? 'Pending'),
      ...eItems.map((i) => (i.key === 'vsat_company' ? (r.equipment[i.key]?.value ?? 'N/A') : (r.equipment[i.key]?.status ?? 'Pending'))),
      r.activation.techLive, r.activation.techLiveDate, r.activation.cashLive, r.activation.cashLiveDate, r.activation.projectionDate,
      ...DOC_FIELDS.map((d) => `${r.documentation[d.key]?.status ?? 'Pending'}${r.documentation[d.key]?.value ? ` (${r.documentation[d.key]?.value})` : ''}`),
      overallStatus(r), r.submittedBy ?? '', r.submittedAt ?? '', r.approvedBy ?? '', r.approvedAt ?? '',
    ]),
  )
}

// ══════════════════════════════ Backend API (VITE_API_URL) ══════════════════════════════
// Mock mode never reaches this code. In API mode every mutation above applies an optimistic local patch (same
// validation as before), then `remote()` calls the backend and replaces the record with the server copy; on failure
// the error is toasted and the record is re-fetched so the screen never keeps data the server refused.

/** A franchisee works on /my/installations (mobile app); staff on /installations. */
const base = (role?: ActorRole) => (role === 'Franchise' || currentRole() === 'Franchisee' ? '/my/installations' : '/installations')

/** Photo previews: the backend keeps the file (fileId) but no inline image; keep the local preview per upload. */
const photoCache = new Map<string, string>()

type ApiPhoto = Omit<InstallPhoto, 'id' | 'siteId' | 'dataUrl' | 'deleted'> & { photoId: string; fileId?: string; dataUrl?: string; deleted?: { by: string; at: string; reason: string } | null }
type ApiInstall = Omit<InstallRecord, 'id' | 'photos' | 'history' | 'versions'> & {
  installId: string
  photos?: ApiPhoto[]
  history?: Omit<HistoryEntry, 'id'>[]
  versions?: (Omit<ApprovedVersion, 'snapshot'> & { snapshot: unknown })[]
}

function fromApi(x: ApiInstall, prev?: InstallRecord): InstallRecord {
  const tone = TONES[(Number(x.installId.replace(/\D/g, '')) || 0) % TONES.length]
  const photos: InstallPhoto[] = (x.photos ?? []).map((p) => ({
    ...p,
    id: p.photoId,
    siteId: x.siteId,
    dataUrl:
      p.dataUrl ||
      (p.fileId && photoCache.get(p.fileId)) ||
      photoCache.get(`${p.stage}|${p.itemKey}|${p.name}`) ||
      prev?.photos.find((q) => q.id === p.photoId)?.dataUrl ||
      mockPhoto(itemLabel(p.stage, p.itemKey), p.gps ?? '—', tone),
    deleted: p.deleted ?? undefined,
  }))
  return {
    id: x.installId,
    siteId: x.siteId,
    frId: x.frId,
    executive: x.executive,
    crmExecutive: x.crmExecutive,
    startedAt: String(x.startedAt),
    startedBy: x.startedBy,
    targetDate: String(x.targetDate ?? '').slice(0, 10),
    readiness: x.readiness ?? {},
    equipment: x.equipment ?? {},
    documentation: x.documentation ?? {},
    activation: x.activation,
    photos,
    finalRemarks: x.finalRemarks ?? prev?.finalRemarks ?? '',
    status: x.status,
    franchiseSubmittedAt: x.franchiseSubmittedAt,
    submittedBy: x.submittedBy,
    submittedAt: x.submittedAt,
    approval: x.approval,
    approvedBy: x.approvedBy,
    approvedAt: x.approvedAt,
    adminRemarks: x.adminRemarks,
    locked: !!x.locked,
    // the list endpoint omits versions / history — keep what a detail call loaded
    versions: x.versions?.length
      ? x.versions.map((v) => ({ ...v, approvedAt: String(v.approvedAt), snapshot: typeof v.snapshot === 'string' ? v.snapshot : JSON.stringify(v.snapshot ?? {}) }))
      : (prev?.versions ?? []),
    history: x.history?.length ? x.history.map((h, i) => ({ ...h, at: String(h.at), id: `IH-${x.installId}-${x.history!.length - i}` })) : (prev?.history ?? []),
    updatedAt: String(x.updatedAt ?? nowIso()),
  }
}

function upsert(rec: InstallRecord) {
  siteInstallationStore.set((s) => (s.records.some((r) => r.id === rec.id) ? { records: s.records.map((r) => (r.id === rec.id ? rec : r)) } : { records: [rec, ...s.records] }))
}

/** Re-fetch one record (full detail: photos, versions, history). */
export async function refreshInstall(id: string) {
  if (!apiEnabled) return
  const x = await get<ApiInstall>(`${base()}/${encodeURIComponent(id)}`)
  upsert(fromApi(x, getInstall(id)))
}

function remote(id: string, fn: () => Promise<unknown>) {
  if (!apiEnabled) return
  fn()
    .then(() => refreshInstall(id))
    .catch((e) => {
      toastError(e, 'Site Installation')
      refreshInstall(id).catch(() => undefined)
    })
}

export const installLoader = createLoader('site installations', async () => {
  const franchisee = currentRole() === 'Franchisee'
  const [items, cfg] = await Promise.all([
    franchisee ? get<{ items: ApiInstall[] }>('/my/installations').then((r) => r.items) : fetchAll<ApiInstall>('/installations'),
    franchisee ? Promise.resolve(null) : get<{ readiness: ChecklistItem[]; equipment: ChecklistItem[] }>('/installations/checklists').catch(() => null),
  ])
  if (cfg?.readiness && cfg.equipment) checklistStore.set({ readiness: cfg.readiness, equipment: cfg.equipment })
  const prev = new Map(siteInstallationStore.get().records.map((r) => [r.id, r]))
  siteInstallationStore.set({ records: items.map((x) => fromApi(x, prev.get(x.installId))) })
})

/** API-mode start (§5.2): POST /installations → 201 new record, or 200 {existed:true} with the running one. Mock mode: sync start. */
export async function startInstallationAsync(siteId: string, input: { executive: string; crmExecutive: string; targetDate: string }): Promise<{ record: InstallRecord; existed: boolean } | { error: string }> {
  if (!apiEnabled) return startInstallation(siteId, input)
  try {
    const out = await post<{ record: ApiInstall; existed: boolean }>('/installations', { site: siteId, ...input })
    const rec = fromApi(out.record, getInstall(out.record.installId))
    upsert(rec)
    refreshInstall(rec.id).catch(() => undefined)
    return { record: rec, existed: out.existed }
  } catch (e) {
    return { error: `Could not start the installation: ${errMsg(e)}` }
  }
}
