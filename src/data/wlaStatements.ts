// WLA Statement Management (Operations spec §6).
// Franchise uploads the bank statement of its mapped WLA account (mobile app; web on behalf) → validation (file type,
// readability, period, account) → CRM / Finance review → Accepted / Returned / Rejected with reason → WLA Statement
// Master. Returned statements are replaced by a new version (replacement history kept). Upload raises a CRM
// verification task through the workflow engine (UAT 15).
import { createStore } from '@/lib/store'
import { downloadCsv } from '@/lib/export'
import { siteStore, type Site } from '@/data/network'
import { getFranchise } from '@/data/franchises'
import { actorName, emitWorkflow, logAudit, nowIso } from '@/data/workflow'
import { get, post } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { currentRole } from '@/lib/rbac'
import { apiCall, apiEnabled, createLoader, fetchAll } from '@/data/opsApi'
import { downloadAuthed, uploadDoc, type OcrPreview } from '@/data/docsApi'

export type WlaStatus = 'Pending Verification' | 'Accepted' | 'Returned' | 'Rejected' | 'Replaced' | 'Processed' | 'Withdrawn'
/** 'Processed' (Finance, locked) exists only with the backend. */
export const WLA_STATUSES: WlaStatus[] = apiEnabled ? ['Pending Verification', 'Accepted', 'Processed', 'Returned', 'Rejected', 'Replaced', 'Withdrawn'] : ['Pending Verification', 'Accepted', 'Returned', 'Rejected', 'Replaced', 'Withdrawn']
/** The uploader may withdraw a statement until it is processed (backend WLA_WITHDRAWABLE). */
export const WLA_WITHDRAWABLE: WlaStatus[] = ['Pending Verification', 'Returned', 'Accepted']
/** The backend file store accepts PDF / JPG / PNG only. */
export const WLA_FILE_TYPES = apiEnabled ? ['pdf', 'jpg', 'jpeg', 'png'] : ['pdf', 'xlsx', 'xls', 'csv', 'jpg', 'jpeg', 'png']
export const WLA_MAX_MB = 10

export type WlaCheck = { key: 'fileType' | 'size' | 'readable' | 'period' | 'account' | 'duplicate'; label: string; ok: boolean; note?: string }
export type WlaReviewCheck = { readable: boolean; accountVisible: boolean; periodVisible: boolean; chequeVisible: boolean; documentCorrect: boolean }
export const REVIEW_LABELS: Record<keyof WlaReviewCheck, string> = {
  readable: 'Statement is readable',
  accountVisible: 'Account number visible & matches mapped WLA account',
  periodVisible: 'Statement period visible & matches',
  chequeVisible: 'Cheque / transaction reference numbers visible',
  documentCorrect: 'Correct document (bank statement of the WLA account)',
}

export type WlaStatement = {
  id: string
  version: number
  rootId: string // first upload of this site + period (replacement chain)
  replaces?: string
  replacedBy?: string
  frId: string
  franchiseName: string
  siteId: string
  atmId: string
  wlaAccount: string // mapped account reference (masked)
  bank: string
  period: string // yyyy-mm
  periodFrom: string
  periodTo: string
  file: { name: string; size: number; type: string }
  passwordProtected: boolean
  readableFlag: boolean // uploader confirms the file opens / is not blurred
  checks: WlaCheck[]
  channel: 'Mobile App' | 'Web (on behalf)'
  uploadedBy: string
  /** API mode: uploader's userId (withdraw is allowed for the uploader). */
  uploadedById?: string
  uploadedAt: string
  status: WlaStatus
  withdrawnBy?: string
  withdrawnAt?: string
  withdrawReason?: string
  review?: WlaReviewCheck
  reason?: string
  remarks?: string
  verifiedBy?: string
  verifiedAt?: string
  taskId?: string
  fileId?: string // API mode: stored file
  processedBy?: string
  processedAt?: string
  history: { at: string; by: string; action: string; remark?: string }[]
  access: { at: string; by: string; action: 'View' | 'Download' | 'Withdraw' }[]
}

const mask = (n: string) => (n.length > 4 ? `XXXX${n.slice(-4)}` : n)
export const frNameOf = (frId: string) => getFranchise(frId)?.name ?? frId
export const wlaFrUser = (frId: string) => `${frNameOf(frId)} (Franchise user)`
export const accountOf = (s: Site) => (s.account ? { ref: `${s.account.type} · ${mask(s.account.accountNo)}`, bank: s.account.bank, approved: s.account.approval === 'Approved' } : null)
export const periodRange = (p: string) => {
  const [y, m] = p.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { from: `${p}-01`, to: `${p}-${String(last).padStart(2, '0')}` }
}
export const periodLabel = (p: string) => (p ? new Date(`${p}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—')

/** Sites that can have a WLA statement: the franchise's sites with a mapped WLA account. */
export const wlaSitesOf = (sites: Site[], frId?: string) => sites.filter((s) => (!frId || s.frId === frId))

function seed(): WlaStatement[] {
  const sites = siteStore.get().sites.filter((s) => s.account).slice(0, 14)
  const out: WlaStatement[] = []
  const plan: [WlaStatus, string][] = [
    ['Accepted', '2026-09'], ['Accepted', '2026-10'], ['Pending Verification', '2026-10'], ['Returned', '2026-10'], ['Rejected', '2026-09'],
    ['Pending Verification', '2026-10'], ['Accepted', '2026-09'], ['Pending Verification', '2026-10'], ['Accepted', '2026-10'], ['Returned', '2026-09'],
  ]
  plan.forEach(([status, period], i) => {
    const s = sites[i % sites.length]
    if (!s) return
    const acc = accountOf(s)!
    const { from, to } = periodRange(period)
    const fu = wlaFrUser(s.frId)
    const up = `2026-11-${String(2 + i).padStart(2, '0')}T10:${String(10 + i).padStart(2, '0')}:00.000Z`
    const id = `WLA-2026-${String(1001 + i)}`
    const rec: WlaStatement = {
      id, version: 1, rootId: id, frId: s.frId, franchiseName: frNameOf(s.frId), siteId: s.siteId, atmId: s.atmId, wlaAccount: acc.ref, bank: acc.bank, period, periodFrom: from, periodTo: to,
      file: { name: `WLA_${s.atmId}_${period.replace('-', '')}.pdf`, size: 420_000 + i * 13_000, type: 'pdf' }, passwordProtected: i % 4 === 0, readableFlag: true,
      checks: [], channel: i % 3 === 2 ? 'Web (on behalf)' : 'Mobile App', uploadedBy: fu, uploadedAt: up, status,
      history: [{ at: up, by: fu, action: 'Uploaded' }], access: [],
    }
    rec.checks = runChecks({ site: s, period, fileName: rec.file.name, size: rec.file.size, readable: true }, [])
    if (status !== 'Pending Verification') {
      const ok = status === 'Accepted'
      rec.review = { readable: status !== 'Returned', accountVisible: ok || status === 'Returned', periodVisible: true, chequeVisible: ok, documentCorrect: status !== 'Rejected' }
      rec.verifiedBy = i % 2 ? 'Kiran Rao' : 'Sanjay Gupta'
      rec.verifiedAt = `2026-11-${String(4 + i).padStart(2, '0')}T12:00:00.000Z`
      rec.reason = status === 'Returned' ? 'Statement pages 2–3 are blurred; cheque numbers not readable. Upload a clear copy.' : status === 'Rejected' ? 'Uploaded document is a passbook photo of a different account, not the WLA statement.' : undefined
      rec.history.push({ at: rec.verifiedAt, by: rec.verifiedBy, action: status, remark: rec.reason })
    }
    out.push(rec)
  })
  return out.reverse()
}

export const wlaStore = createStore<WlaStatement[]>('dexter.wla.v2', seed)
/** Hydrates from the backend in API mode (no-op in mock mode). */
export const useWlaStatements = () => {
  wlaLoader.use()
  return wlaStore.use()
}

/** §6 step 2 — validation. */
export function runChecks(i: { site?: Site; period: string; fileName: string; size: number; readable: boolean }, existing: WlaStatement[], replacingId?: string): WlaCheck[] {
  const ext = i.fileName.split('.').pop()?.toLowerCase() ?? ''
  const acc = i.site ? accountOf(i.site) : null
  const now = new Date().toISOString().slice(0, 7)
  const dup = existing.find((x) => x.siteId === i.site?.siteId && x.period === i.period && (x.status === 'Pending Verification' || x.status === 'Accepted') && x.id !== replacingId)
  return [
    { key: 'fileType', label: 'File type (PDF / Excel / CSV / image)', ok: WLA_FILE_TYPES.includes(ext), note: ext ? `.${ext}` : 'no file' },
    { key: 'size', label: `Size ≤ ${WLA_MAX_MB} MB and not empty`, ok: i.size > 0 && i.size <= WLA_MAX_MB * 1024 * 1024 },
    { key: 'readable', label: 'Readable (not blurred / corrupt / password shared)', ok: i.readable },
    { key: 'period', label: 'Statement period is a completed month', ok: !!i.period && i.period < now, note: i.period ? periodLabel(i.period) : 'not selected' },
    { key: 'account', label: 'Mapped WLA account exists for the site', ok: !!acc, note: acc ? `${acc.bank} · ${acc.ref}${acc.approved ? '' : ' (mapping approval pending)'}` : 'No account mapped in Site Master' },
    { key: 'duplicate', label: 'No other pending / accepted statement for this site & month', ok: !dup, note: dup ? `${dup.id} (${dup.status}) — use replacement` : undefined },
  ]
}

export type WlaUploadInput = { siteId: string; period: string; file: { name: string; size: number } | null; passwordProtected: boolean; password?: string; readable: boolean; remarks: string; replacingId?: string }

export function uploadWla(i: WlaUploadInput, channel: WlaStatement['channel']): { error?: string; checks?: WlaCheck[]; rec?: WlaStatement } {
  const site = siteStore.get().sites.find((s) => s.siteId === i.siteId)
  if (!site) return { error: 'Select the site / ATM' }
  if (!i.period) return { error: 'Select the statement month' }
  if (!i.file) return { error: 'Attach the statement file' }
  if (i.passwordProtected && !i.password?.trim()) return { error: 'Password-protected file: enter the password so CRM can open it' }
  const list = wlaStore.get()
  const prev = i.replacingId ? list.find((x) => x.id === i.replacingId) : undefined
  if (i.replacingId && (!prev || (prev.status !== 'Returned' && prev.status !== 'Withdrawn'))) return { error: 'Only a Returned or Withdrawn statement can be replaced' }
  const checks = runChecks({ site, period: i.period, fileName: i.file.name, size: i.file.size, readable: i.readable }, list, i.replacingId)
  const failed = checks.filter((c) => !c.ok)
  if (failed.length) return { error: `Validation failed: ${failed.map((c) => c.label).join('; ')}`, checks }
  const acc = accountOf(site)!
  const { from, to } = periodRange(i.period)
  const maker = channel === 'Mobile App' ? wlaFrUser(site.frId) : actorName()
  const n = list.reduce((m, x) => Math.max(m, Number(x.id.split('-').pop()) || 0), 1000) + 1
  const id = `WLA-2026-${n}`
  const ext = i.file.name.split('.').pop()?.toLowerCase() ?? ''
  const rec: WlaStatement = {
    id, version: prev ? prev.version + 1 : 1, rootId: prev?.rootId ?? id, replaces: prev?.id, frId: site.frId, franchiseName: frNameOf(site.frId), siteId: site.siteId, atmId: site.atmId,
    wlaAccount: acc.ref, bank: acc.bank, period: i.period, periodFrom: from, periodTo: to, file: { name: i.file.name, size: i.file.size, type: ext }, passwordProtected: i.passwordProtected, readableFlag: i.readable,
    checks, channel, uploadedBy: maker, uploadedAt: nowIso(), status: 'Pending Verification', remarks: i.remarks.trim() || undefined,
    history: [{ at: nowIso(), by: maker, action: prev ? `Uploaded replacement v${prev.version + 1} for ${prev.id}` : 'Uploaded', remark: i.remarks.trim() || undefined }], access: [],
  }
  const task = emitWorkflow({
    module: 'WLA Statement', event: 'Submit', refId: id,
    vars: { Record_ID: id, Site_ID: site.siteId, ATM_ID: site.atmId, Franchise_Name: rec.franchiseName, Current_Status: 'Pending Verification' },
    nextAction: { title: `Verify WLA statement ${periodLabel(i.period)} – ${site.atmId}`, dueHours: 48, priority: 'Medium' },
  })
  rec.taskId = task?.id
  wlaStore.set((l) => [rec, ...l.map((x) => (x.id === prev?.id ? { ...x, status: 'Replaced' as const, replacedBy: id, history: [...x.history, { at: nowIso(), by: maker, action: `Replaced by ${id}` }] } : x))])
  return { rec, checks }
}

export function reviewWla(id: string, decision: 'Accepted' | 'Returned' | 'Rejected', review: WlaReviewCheck, reason: string) {
  const r = wlaStore.get().find((x) => x.id === id)
  if (!r || r.status !== 'Pending Verification') return 'Only pending statements can be reviewed'
  if (r.uploadedBy === actorName()) return 'Maker-checker: you uploaded this statement'
  if (decision === 'Accepted' && Object.values(review).some((v) => !v)) return 'All review checks must pass to accept — otherwise return or reject with a reason'
  if (decision !== 'Accepted' && !reason.trim()) return `A reason is required to mark the statement ${decision}`
  wlaStore.set((l) => l.map((x) => (x.id === id ? { ...x, status: decision, review, reason: reason.trim() || undefined, verifiedBy: actorName(), verifiedAt: nowIso(), history: [...x.history, { at: nowIso(), by: actorName(), action: decision, remark: reason.trim() || undefined }] } : x)))
  emitWorkflow({ module: 'WLA Statement', event: decision === 'Accepted' ? 'Approve' : decision === 'Returned' ? 'Return' : 'Reject', refId: id, vars: { Record_ID: id, Site_ID: r.siteId, ATM_ID: r.atmId, Franchise_Name: r.franchiseName, Current_Status: decision } })
  return null
}

export function logWlaAccess(id: string, by: string, action: 'View' | 'Download') {
  wlaStore.set((l) => l.map((x) => (x.id === id ? { ...x, access: [...x.access, { at: nowIso(), by, action }] } : x)))
  logAudit('WLA Statement', id, `Statement ${action.toLowerCase()}ed`, by)
}

export function exportWlaCsv(rows: WlaStatement[], name = 'wla-statement-master') {
  downloadCsv(name, ['ID', 'Version', 'Replaces', 'Franchise', 'Site ID', 'ATM ID', 'WLA account', 'Bank', 'Period', 'File', 'Channel', 'Uploaded by', 'Uploaded at', 'Status', 'Reason', 'Verified by', 'Verified at'], rows.map((r) => [
    r.id, String(r.version), r.replaces ?? '', r.franchiseName, r.siteId, r.atmId, r.wlaAccount, r.bank, r.period, r.file.name, r.channel, r.uploadedBy, r.uploadedAt, r.status, r.reason ?? '', r.verifiedBy ?? '', r.verifiedAt ?? '',
  ]))
}

// ── API mode (backend /wla-statements) ───────────────────────────────────
type ApiWla = {
  wlaId: string; version: number; rootId: string; replaces?: string; replacedBy?: string; frId: string; franchiseName: string; siteId: string; atmId: string; wlaAccount: string; bank: string
  period: string; periodFrom: string; periodTo: string; file: { fileId: string; name: string; size: number; mimeType?: string }; passwordProtected: boolean; readable: boolean
  checks: { key: string; label: string; ok: boolean; note?: string }[]; channel: WlaStatement['channel']; uploadedBy: string; uploadedByName?: string; uploadedAt: string; status: WlaStatus
  review?: WlaReviewCheck; reason?: string; remarks?: string; verifiedBy?: string; verifiedByName?: string; verifiedAt?: string; processedByName?: string; processedAt?: string
  withdrawnByName?: string; withdrawnAt?: string; withdrawReason?: string
  history?: { at: string; by: string; text: string }[]; access?: { at: string; by?: string; byName?: string; action: 'View' | 'Download' | 'Withdraw' }[]
}

export function fromApiWla(r: ApiWla): WlaStatement {
  return {
    id: r.wlaId, version: r.version, rootId: r.rootId, replaces: r.replaces, replacedBy: r.replacedBy, frId: r.frId, franchiseName: r.franchiseName, siteId: r.siteId, atmId: r.atmId,
    wlaAccount: r.wlaAccount, bank: r.bank, period: r.period, periodFrom: r.periodFrom, periodTo: r.periodTo,
    file: { name: r.file?.name ?? '', size: r.file?.size ?? 0, type: (r.file?.name ?? '').split('.').pop()?.toLowerCase() ?? '' },
    fileId: r.file?.fileId,
    passwordProtected: r.passwordProtected, readableFlag: r.readable, checks: (r.checks ?? []) as WlaCheck[], channel: r.channel,
    uploadedBy: r.uploadedByName ?? r.uploadedBy, uploadedById: r.uploadedBy, uploadedAt: r.uploadedAt, status: r.status, review: r.review, reason: r.reason, remarks: r.remarks,
    withdrawnBy: r.withdrawnByName, withdrawnAt: r.withdrawnAt, withdrawReason: r.withdrawReason,
    verifiedBy: r.verifiedByName ?? r.verifiedBy, verifiedAt: r.verifiedAt, processedBy: r.processedByName, processedAt: r.processedAt,
    history: (r.history ?? []).map((h) => ({ at: h.at, by: h.by, action: h.text })),
    access: (r.access ?? []).map((a) => ({ at: a.at, by: a.byName ?? a.by ?? '', action: a.action })),
  }
}

export const wlaLoader = createLoader('WLA statements', async () => {
  wlaStore.set((await fetchAll<ApiWla>('/wla-statements', { sort: '-uploadedAt' })).map(fromApiWla))
})
const upsertWla = (r: ApiWla) => {
  const rec = fromApiWla(r)
  wlaStore.set((l) => (l.some((x) => x.id === rec.id) ? l.map((x) => (x.id === rec.id ? rec : x)) : [rec, ...l]))
  return rec
}

/** Upload (API: POST /files → POST /wla-statements; mock: local). `raw` is the real File picked by the user. */
export async function uploadWlaAsync(i: WlaUploadInput, channel: WlaStatement['channel'], raw?: File | null): Promise<{ error?: string; checks?: WlaCheck[]; rec?: WlaStatement }> {
  if (!apiEnabled) return uploadWla(i, channel)
  const site = siteStore.get().sites.find((s) => s.siteId === i.siteId)
  if (!site) return { error: 'Select the site / ATM' }
  if (!i.period) return { error: 'Select the statement month' }
  if (!i.file) return { error: 'Attach the statement file' }
  const ext = i.file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) return { error: 'The server accepts PDF / JPG / PNG statements only' }
  if (i.passwordProtected && !i.password?.trim()) return { error: 'Password-protected file: enter the password so CRM can open it' }
  try {
    const fileId = await uploadDoc(raw, { purpose: 'wla-statement', entity: 'WlaStatement' })
    const r = await apiCall(() => post<ApiWla>('/wla-statements', { site: site.siteId, period: i.period, fileId, readable: i.readable, passwordProtected: i.passwordProtected, remarks: i.remarks.trim() || undefined, replacingId: i.replacingId }))
    const rec = upsertWla(r)
    if (i.replacingId) void wlaLoader.reload()
    return { rec, checks: rec.checks }
  } catch (e) {
    const checks = (e as { details?: { checks?: WlaCheck[] } }).details?.checks
    return { error: (e as Error).message, checks }
  }
}

export async function reviewWlaAsync(id: string, decision: 'Accepted' | 'Returned' | 'Rejected', review: WlaReviewCheck, reason: string): Promise<string | null> {
  if (!apiEnabled) return reviewWla(id, decision, review, reason)
  if (decision !== 'Accepted' && !reason.trim()) return `A reason is required to mark the statement ${decision}`
  try {
    upsertWla(await apiCall(() => post<ApiWla>(`/wla-statements/${encodeURIComponent(id)}/review`, { decision, review, reason: reason.trim() || undefined })))
    return null
  } catch (e) {
    return (e as Error).message
  }
}

/** Finance processing (Accepted → Processed, locked). API mode only. */
export async function processWlaAsync(id: string, note: string): Promise<string | null> {
  if (!apiEnabled) return 'Processing is available with the backend only'
  if (note.trim().length < 3) return 'A processing note is required (min 3 characters)'
  try {
    upsertWla(await apiCall(() => post<ApiWla>(`/wla-statements/${encodeURIComponent(id)}/process`, { note: note.trim() })))
    return null
  } catch (e) {
    return (e as Error).message
  }
}

/** View (logged server-side; returns the record with its access log) / Download (logged + file). */
export async function logWlaAccessAsync(id: string, by: string, action: 'View' | 'Download') {
  if (!apiEnabled) return logWlaAccess(id, by, action)
  if (action === 'View') {
    upsertWla(await apiCall(() => get<ApiWla>(`/wla-statements/${encodeURIComponent(id)}`)))
    await loadWlaAccessLog(id).catch(() => undefined) // authoritative staff access log (does not log another View)
    return
  }
  const x = wlaStore.get().find((s) => s.id === id)
  await downloadAuthed(`/wla-statements/${encodeURIComponent(id)}/download`, x?.file.name ?? `${id}.pdf`)
  void loadWlaAccessLog(id).catch(() => undefined) // refresh without logging another View
}

/**
 * Can the signed-in user withdraw this statement? Not yet processed, and: a franchise user of the statement's
 * franchise, or the staff member who uploaded it on behalf (backend is authoritative).
 */
export function canWithdrawWla(x: WlaStatement) {
  if (!WLA_WITHDRAWABLE.includes(x.status)) return false
  const sess = getSession()
  if (currentRole() === 'Franchisee') return !apiEnabled || !sess?.franchiseId || sess.franchiseId === x.frId
  return apiEnabled ? !!sess?.userId && x.uploadedById === sess.userId : x.uploadedBy === actorName()
}

/** Uploader withdraws a not-yet-processed statement (reason mandatory) → Withdrawn; it can then be replaced. */
export async function withdrawWlaAsync(id: string, reason: string): Promise<string | null> {
  if (reason.trim().length < 3) return 'A reason is required to withdraw (min 3 characters)'
  if (!apiEnabled) {
    const r = wlaStore.get().find((x) => x.id === id)
    if (!r || !WLA_WITHDRAWABLE.includes(r.status)) return `A ${r?.status ?? 'missing'} statement can no longer be withdrawn`
    const by = actorName()
    wlaStore.set((l) => l.map((x) => (x.id === id ? { ...x, status: 'Withdrawn' as const, withdrawnBy: by, withdrawnAt: nowIso(), withdrawReason: reason.trim(), history: [...x.history, { at: nowIso(), by, action: 'Withdrawn', remark: reason.trim() }], access: [...x.access, { at: nowIso(), by, action: 'Withdraw' as const }] } : x)))
    logAudit('WLA Statement', id, 'WLA statement withdrawn', reason.trim())
    return null
  }
  try {
    upsertWla(await apiCall(() => post<ApiWla>(`/wla-statements/${encodeURIComponent(id)}/withdraw`, { reason: reason.trim() })))
    return null
  } catch (e) {
    return (e as Error).message
  }
}

type ApiAccessLog = { total: number; views: number; downloads: number; items: { at: string; by?: string; byName?: string; action: 'View' | 'Download' | 'Withdraw'; channel?: string; frId?: string }[] }
/**
 * Staff oversight: GET /wla-statements/:id/access-log ({total, views, downloads, items} newest first). Reading it does
 * not add a View entry. Fills the record's access list (oldest first, as the local log). API mode only.
 */
export async function loadWlaAccessLog(id: string) {
  if (!apiEnabled) return
  const r = await get<ApiAccessLog>(`/wla-statements/${encodeURIComponent(id)}/access-log`)
  const access = [...r.items].reverse().map((a) => ({ at: a.at, by: a.byName ?? a.by ?? '', action: a.action }))
  wlaStore.set((l) => l.map((x) => (x.id === id ? { ...x, access } : x)))
  return r
}

/** OCR suggestion for an uploaded file (always to be confirmed by the user). */
export async function wlaOcrPreview(fileId: string) {
  return apiCall(() => post<OcrPreview>('/wla-statements/ocr-preview', { fileId }))
}
