// TDS Letter Management (Operations spec §7).
// CRM Executive / authorized Finance user uploads the TDS PDF → Franchise + Financial-Year mapping → document
// validation → TDS Document Master → visible ONLY to the mapped franchise in the mobile app (UAT 16) → every
// view / download is audit-logged.
import { createStore } from '@/lib/store'
import { downloadCsv } from '@/lib/export'
import { franchiseStore } from '@/data/franchises'
import { siteStore } from '@/data/network'
import { eodStore } from '@/data/eodStore'
import { actorName, emitWorkflow, logAudit, nowIso } from '@/data/workflow'
import { get, post } from '@/lib/api'
import { apiCall, apiEnabled, createLoader, fetchAll, fromPaise, toPaise } from '@/data/opsApi'
import { downloadAuthed, uploadDoc, type OcrPreview } from '@/data/docsApi'

export const TDS_DOC_TYPES = ['TDS Certificate (Form 16A)', 'TDS Deduction Letter', 'TDS Statement Summary'] as const
export type TdsDocType = (typeof TDS_DOC_TYPES)[number]
export const TDS_PERIODS = ['Q1 (Apr–Jun)', 'Q2 (Jul–Sep)', 'Q3 (Oct–Dec)', 'Q4 (Jan–Mar)', 'Annual'] as const
export type TdsPeriod = (typeof TDS_PERIODS)[number]
export const FINANCIAL_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'] as const
export const CURRENT_FY = '2026-27'
export const TDS_MAX_MB = 5

export type TdsStatus = 'Active' | 'Superseded' | 'Withdrawn'
export type TdsAccess = { at: string; by: string; action: 'View' | 'Download'; channel: 'Mobile App' | 'Web'; frId: string }
export type TdsCheck = { label: string; ok: boolean; note?: string }

export type TdsDoc = {
  id: string
  frId: string
  franchiseName: string
  fy: string
  period: TdsPeriod
  docType: TdsDocType
  tdsAmount?: number
  file: { name: string; size: number }
  checks: TdsCheck[]
  uploadedBy: string
  uploaderRole: string
  uploadedAt: string
  status: TdsStatus
  version: number
  replaces?: string
  supersededBy?: string
  remarks?: string
  withdrawnReason?: string
  fileId?: string // API mode
  reviewedBy?: string // API mode: Finance review
  reviewedAt?: string
  reviewNote?: string
  access: TdsAccess[]
}

export const frName = (id: string) => franchiseStore.get().find((f) => f.id === id)?.name ?? id

function seed(): TdsDoc[] {
  const ids = [...new Set([...eodStore.get().records.map((r) => r.frId), ...siteStore.get().sites.map((s) => s.frId)])].slice(0, 18)
  const frs = franchiseStore.get().filter((f) => ids.includes(f.id))
  const out: TdsDoc[] = []
  let n = 1000
  frs.forEach((f, i) => {
    const docs: [string, TdsPeriod][] = i % 2 ? [['2025-26', 'Annual'], ['2026-27', 'Q1 (Apr–Jun)']] : [['2026-27', 'Q1 (Apr–Jun)'], ['2026-27', 'Q2 (Jul–Sep)']]
    docs.forEach(([fy, period], k) => {
      const id = `TDS-${fy.replace('-', '')}-${++n}`
      const by = k ? 'Sanjay Gupta' : 'Kiran Rao'
      const at = `2026-${String(8 + k + (i % 3)).padStart(2, '0')}-1${i % 9}T11:00:00.000Z`
      out.push({
        id, frId: f.id, franchiseName: f.name, fy, period, docType: period === 'Annual' ? 'TDS Statement Summary' : 'TDS Certificate (Form 16A)', tdsAmount: 4000 + i * 731 + k * 290,
        file: { name: `Form16A_${f.id}_${fy}_${period.slice(0, 2)}.pdf`, size: 160_000 + i * 7000 }, checks: checksFor({ frId: f.id, fy, period, docType: 'TDS Certificate (Form 16A)', fileName: 'x.pdf', size: 160_000 }, []),
        uploadedBy: by, uploaderRole: k ? 'Finance Team' : 'Operations Team', uploadedAt: at, status: 'Active', version: 1,
        access: i % 3 === 0 ? [{ at: `2026-11-0${(i % 8) + 1}T09:30:00.000Z`, by: `${f.name} (Franchise user)`, action: 'Download', channel: 'Mobile App', frId: f.id }] : [],
      })
    })
  })
  return out.reverse()
}

export const tdsStore = createStore<TdsDoc[]>('dexter.tds.v2', seed)
/** Hydrates from the backend in API mode (no-op in mock mode). */
export const useTdsLetters = () => {
  tdsLoader.use()
  return tdsStore.use()
}

export type TdsInput = { frId: string; fy: string; period: TdsPeriod | ''; docType: TdsDocType | ''; tdsAmount: string; fileName: string; size: number; remarks: string; replacingId?: string }

/** §7 "Document Validation". */
export function checksFor(i: { frId: string; fy: string; period: string; docType: string; fileName: string; size: number }, existing: TdsDoc[], replacingId?: string): TdsCheck[] {
  const fr = franchiseStore.get().find((f) => f.id === i.frId)
  const dup = existing.find((d) => d.frId === i.frId && d.fy === i.fy && d.period === i.period && d.docType === i.docType && d.status === 'Active' && d.id !== replacingId)
  return [
    { label: 'PDF file', ok: /\.pdf$/i.test(i.fileName), note: i.fileName || 'no file' },
    { label: `Size ≤ ${TDS_MAX_MB} MB and not empty`, ok: i.size > 0 && i.size <= TDS_MAX_MB * 1024 * 1024 },
    { label: 'Franchise exists in Franchise Master', ok: !!fr, note: fr ? `${fr.name}${fr.status !== 'Active' ? ' (Inactive)' : ''}` : undefined },
    { label: 'Financial year valid (not future)', ok: (FINANCIAL_YEARS as readonly string[]).includes(i.fy) && i.fy <= CURRENT_FY },
    { label: 'Period & document type selected', ok: !!i.period && !!i.docType },
    { label: 'No active document for the same franchise / FY / period / type', ok: !dup, note: dup ? `${dup.id} — use "Replace" to supersede` : undefined },
  ]
}

export function uploadTds(i: TdsInput, role: string): { error?: string; checks?: TdsCheck[]; doc?: TdsDoc } {
  const list = tdsStore.get()
  const prev = i.replacingId ? list.find((d) => d.id === i.replacingId) : undefined
  if (i.replacingId && (!prev || prev.status !== 'Active')) return { error: 'Only an active document can be replaced' }
  const checks = checksFor({ ...i, period: i.period, docType: i.docType }, list, i.replacingId)
  const failed = checks.filter((c) => !c.ok)
  if (failed.length) return { error: `Validation failed: ${failed.map((c) => c.label).join('; ')}`, checks }
  const id = `TDS-${i.fy.replace('-', '')}-${list.reduce((m, d) => Math.max(m, Number(d.id.split('-').pop()) || 0), 1000) + 1}`
  const doc: TdsDoc = {
    id, frId: i.frId, franchiseName: frName(i.frId), fy: i.fy, period: i.period as TdsPeriod, docType: i.docType as TdsDocType, tdsAmount: Number(i.tdsAmount) || undefined,
    file: { name: i.fileName, size: i.size }, checks, uploadedBy: actorName(), uploaderRole: role, uploadedAt: nowIso(), status: 'Active', version: prev ? prev.version + 1 : 1, replaces: prev?.id, remarks: i.remarks.trim() || undefined, access: [],
  }
  tdsStore.set((l) => [doc, ...l.map((d) => (d.id === prev?.id ? { ...d, status: 'Superseded' as const, supersededBy: id } : d))])
  logAudit('TDS Letter', id, prev ? `Uploaded (replaces ${prev.id})` : 'Uploaded', `${doc.franchiseName} · FY ${doc.fy} · ${doc.period}`)
  emitWorkflow({ module: 'TDS Letter', event: 'Submit', refId: id, vars: { Record_ID: id, Franchise_Name: doc.franchiseName, Current_Status: 'Published to franchise app' } })
  return { doc, checks }
}

export function withdrawTds(id: string, reason: string) {
  if (!reason.trim()) return 'Reason is required'
  const d = tdsStore.get().find((x) => x.id === id)
  if (!d || d.status !== 'Active') return 'Only active documents can be withdrawn'
  tdsStore.set((l) => l.map((x) => (x.id === id ? { ...x, status: 'Withdrawn' as const, withdrawnReason: reason.trim() } : x)))
  logAudit('TDS Letter', id, 'Withdrawn', reason.trim())
  return null
}

/** UAT 16 — only the mapped franchise may open the document. Returns an error for anyone else. */
export function accessTds(id: string, viewerFrId: string, by: string, action: 'View' | 'Download', channel: TdsAccess['channel']) {
  const d = tdsStore.get().find((x) => x.id === id)
  if (!d) return 'Document not found'
  if (d.frId !== viewerFrId) {
    logAudit('TDS Letter', id, 'Access denied', `${by} (${viewerFrId}) is not the mapped franchise`)
    return 'Access denied — this document is mapped to another franchise'
  }
  if (d.status !== 'Active') return `Document is ${d.status}`
  tdsStore.set((l) => l.map((x) => (x.id === id ? { ...x, access: [...x.access, { at: nowIso(), by, action, channel, frId: viewerFrId }] } : x)))
  logAudit('TDS Letter', id, action === 'View' ? 'Viewed' : 'Downloaded', `${by} via ${channel}`)
  return null
}

export function exportTdsCsv(rows: TdsDoc[], name = 'tds-document-master') {
  downloadCsv(name, ['Doc ID', 'Franchise ID', 'Franchise', 'FY', 'Period', 'Type', 'TDS Amount', 'File', 'Uploaded by', 'Role', 'Uploaded at', 'Status', 'Version', 'Replaces', 'Views', 'Downloads'], rows.map((d) => [
    d.id, d.frId, d.franchiseName, d.fy, d.period, d.docType, d.tdsAmount != null ? String(d.tdsAmount) : '', d.file.name, d.uploadedBy, d.uploaderRole, d.uploadedAt, d.status, String(d.version), d.replaces ?? '',
    String(d.access.filter((a) => a.action === 'View').length), String(d.access.filter((a) => a.action === 'Download').length),
  ]))
}

// ── API mode (backend /tds-letters) ──────────────────────────────────────
type ApiTds = {
  tdsId: string; frId: string; franchiseName: string; fy: string; period: TdsPeriod; docType: TdsDocType; tdsAmountPaise?: number; file: { fileId: string; name: string; size: number; mimeType?: string }
  checks?: TdsCheck[]; uploadedBy: string; uploadedByName?: string; uploaderRole?: string; uploadedAt: string; status: TdsStatus; version: number; replaces?: string; supersededBy?: string
  remarks?: string; withdrawnReason?: string; reviewedByName?: string; reviewedAt?: string; reviewNote?: string; access?: { at: string; by: string; action: 'View' | 'Download'; channel: TdsAccess['channel']; frId?: string }[]
}

export function fromApiTds(d: ApiTds): TdsDoc {
  return {
    id: d.tdsId, frId: d.frId, franchiseName: d.franchiseName, fy: d.fy, period: d.period, docType: d.docType, tdsAmount: d.tdsAmountPaise != null ? fromPaise(d.tdsAmountPaise) : undefined,
    file: { name: d.file?.name ?? '', size: d.file?.size ?? 0 }, fileId: d.file?.fileId, checks: d.checks ?? [], uploadedBy: d.uploadedByName ?? d.uploadedBy, uploaderRole: d.uploaderRole ?? '', uploadedAt: d.uploadedAt,
    status: d.status, version: d.version, replaces: d.replaces, supersededBy: d.supersededBy, remarks: d.remarks, withdrawnReason: d.withdrawnReason,
    reviewedBy: d.reviewedByName, reviewedAt: d.reviewedAt, reviewNote: d.reviewNote,
    access: (d.access ?? []).map((a) => ({ at: a.at, by: a.by, action: a.action, channel: a.channel, frId: a.frId ?? '' })),
  }
}

let apiHydrated = false
/** List responses omit the access log; staff detail reads (GET /:id) would log a "View", so the log is filled per row on demand only. */
export const tdsLoader = createLoader('TDS letters', async () => {
  const prev = new Map(apiHydrated ? tdsStore.get().map((d) => [d.id, d.access]) : [])
  tdsStore.set((await fetchAll<ApiTds>('/tds-letters', { sort: '-uploadedAt' })).map((d) => ({ ...fromApiTds(d), access: d.access ? fromApiTds(d).access : (prev.get(d.tdsId) ?? []) })))
  apiHydrated = true
})
const upsertTds = (d: ApiTds) => {
  const doc = fromApiTds(d)
  tdsStore.set((l) => (l.some((x) => x.id === doc.id) ? l.map((x) => (x.id === doc.id ? { ...doc, access: d.access ? doc.access : x.access } : x)) : [doc, ...l]))
  return doc
}

/** Upload (API: POST /files → POST /tds-letters; mock: local). `raw` is the real PDF picked by the user. */
export async function uploadTdsAsync(i: TdsInput, role: string, raw?: File | null): Promise<{ error?: string; checks?: TdsCheck[]; doc?: TdsDoc }> {
  if (!apiEnabled) return uploadTds(i, role)
  if (!i.frId) return { error: 'Select the franchise' }
  if (!i.period || !i.docType) return { error: 'Select the period and document type' }
  if (!/\.pdf$/i.test(i.fileName)) return { error: 'Attach the TDS letter as a PDF' }
  try {
    const fileId = await uploadDoc(raw, { purpose: 'tds', entity: 'TdsDoc' })
    const d = await apiCall(() =>
      post<ApiTds>('/tds-letters', { frId: i.frId, fy: i.fy, period: i.period, docType: i.docType, tdsAmountPaise: i.tdsAmount !== '' ? toPaise(Number(i.tdsAmount)) : undefined, fileId, remarks: i.remarks.trim() || undefined, replacingId: i.replacingId }),
    )
    const doc = upsertTds(d)
    if (i.replacingId) void tdsLoader.reload()
    return { doc, checks: doc.checks }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function withdrawTdsAsync(id: string, reason: string): Promise<string | null> {
  if (!apiEnabled) return withdrawTds(id, reason)
  if (reason.trim().length < 3) return 'Reason is required (min 3 characters)'
  try {
    upsertTds(await apiCall(() => post<ApiTds>(`/tds-letters/${encodeURIComponent(id)}/withdraw`, { reason: reason.trim() })))
    return null
  } catch (e) {
    return (e as Error).message
  }
}

/** Finance review (not the uploader). API mode only. */
export async function reviewTdsAsync(id: string, note: string): Promise<string | null> {
  if (!apiEnabled) return 'Review is available with the backend only'
  try {
    upsertTds(await apiCall(() => post<ApiTds>(`/tds-letters/${encodeURIComponent(id)}/review`, { note: note.trim() })))
    return null
  } catch (e) {
    return (e as Error).message
  }
}

/** Staff view (logged server-side, returns the access log) / download (logged + file). */
export async function openTdsAsync(id: string, action: 'View' | 'Download') {
  if (!apiEnabled) return
  if (action === 'View') {
    upsertTds(await apiCall(() => get<ApiTds>(`/tds-letters/${encodeURIComponent(id)}`)))
    return
  }
  const d = tdsStore.get().find((x) => x.id === id)
  await downloadAuthed(`/tds-letters/${encodeURIComponent(id)}/download`, d?.file.name ?? `${id}.pdf`)
}

type ApiAccessLog = { total: number; views: number; downloads: number; items: { at: string; by?: string; byName?: string; action: 'View' | 'Download'; channel?: TdsAccess['channel']; frId?: string }[] }
/**
 * Staff oversight: GET /tds-letters/:id/access-log ({total, views, downloads, items} newest first) — reading it does
 * not log a View (unlike GET /:id). Fills the document's access list. API mode only.
 */
export async function loadTdsAccessLog(id: string) {
  if (!apiEnabled) return
  const r = await get<ApiAccessLog>(`/tds-letters/${encodeURIComponent(id)}/access-log`)
  const access: TdsAccess[] = [...r.items].reverse().map((a) => ({ at: a.at, by: a.byName ?? a.by ?? '', action: a.action, channel: a.channel ?? 'Web', frId: a.frId ?? '' }))
  tdsStore.set((l) => l.map((x) => (x.id === id ? { ...x, access } : x)))
  return r
}
/** Access logs of many documents (Access audit log tab); failures are skipped. */
export async function loadTdsAccessLogs(ids: string[]) {
  if (!apiEnabled) return
  for (let i = 0; i < ids.length; i += 6) await Promise.all(ids.slice(i, i + 6).map((id) => loadTdsAccessLog(id).catch(() => undefined)))
}

export async function tdsOcrPreview(fileId: string) {
  return apiCall(() => post<OcrPreview>('/tds-letters/ocr-preview', { fileId }))
}
