// Finance registers ↔ backend (/finance/<module>) when VITE_API_URL is set. Mock mode: nothing here runs.
//
// The backend keeps every register record as { recordId, status: Draft|Submitted|Approved|Rejected, data, siteId, atmId }
// with money in integer paise and ISO dates. The frontend registers keep display values (rupee strings such as
// "2,50,000", DD-MM-YYYY dates, 12-hour times) and a domain status field. One adapter per module config converts
// both ways. Saves mirror to the backend (create / patch / submit / approve / reject / correct) and re-hydrate.
import { ApiError, apiEnabled, del, get, patch, post } from '@/lib/api'
import { createLoader, fetchAll, toastError, type LoadState } from './opsApi'
import { getSession } from '@/lib/auth'
import { toast } from '@/components/ui/Toast'

/**
 * Franchisee sessions (mobile app) are refused on /finance/* (no franchise self-service endpoints for the finance
 * registers yet) — for them the registers stay local to the device (mock path), nothing is sent.
 */
const franchiseeLocal = () => getSession()?.role === 'Franchisee'
let localNoticeShown = false
const noteLocal = () => {
  if (localNoticeShown) return
  localNoticeShown = true
  toast('Saved on this device — finance submissions from the franchise app are not on the server yet.', 'info')
}

/** Same mapping as pages/finance/finWorkflow.statusEvent (kept local to avoid an import cycle). */
function statusEvent(prev: string | undefined, next: string | undefined): 'Submit' | 'Approve' | 'Reject' | undefined {
  if (!next || prev === next) return undefined
  if (/reject|declin/i.test(next)) return 'Reject'
  if (/approv|verified|^active$|^paid$|completed|opened/i.test(next)) return 'Approve'
  if (/pending|submit|review|process/i.test(next)) return 'Submit'
  return undefined
}

export { apiEnabled }

export type BRec = { recordId: string; module: string; status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected'; data: Record<string, unknown>; siteId?: string; atmId?: string; frId?: string; version: number; createdByName?: string; approvedByName?: string; createdAt?: string; updatedAt?: string; ext?: Record<string, unknown> }
type AnyRec = { id: string }
const R = (x: unknown) => x as Record<string, unknown>

export type FinCfg<F extends AnyRec> = {
  key: string // backend module key
  label: string
  get: () => F[]
  set: (list: F[]) => void
  /** backend body keys that may be sent (computed fields excluded) */
  fields: string[]
  /** money fields held as rupee strings ("2,50,000.50") / rupee numbers on the frontend */
  money?: string[]
  moneyNum?: string[]
  /** rupee-string format: grouped "2,50,000" (default), grouped2 "50,000.00", plain "250000" */
  moneyFmt?: 'grouped' | 'grouped2' | 'plain'
  /** date fields and the frontend format */
  dates?: string[]
  dateOut?: 'dmy' | 'iso'
  /** HH:mm (backend) ↔ "hh:mm AM" (frontend) */
  times?: string[]
  /** frontend key → backend key */
  rename?: Record<string, string>
  /** frontend domain status field (drives submit / approve / reject via finWorkflow.statusEvent) */
  statusField?: string
  /** custom status → workflow event mapping (default: finWorkflow.statusEvent on statusField) */
  event?: (prev: F | undefined, next: F) => 'Submit' | 'Approve' | 'Reject' | undefined
  /** frontend boolean draft flag */
  draftField?: string
  /** extra conversions */
  fromExtra?: (r: BRec, f: Record<string, unknown>) => Record<string, unknown>
  toExtra?: (f: F, body: Record<string, unknown>) => Record<string, unknown>
  /** blank frontend record used as the base when adapting (keeps required keys present) */
  blank?: () => F
}

// ── converters ────────────────────────────────────────────────────────────
export const paiseToStr = (p: unknown) => ((Number(p) || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })
const fmtMoney = (p: unknown, f: FinCfg<AnyRec>['moneyFmt']) => {
  const r = (Number(p) || 0) / 100
  if (f === 'plain') return String(Math.round(r * 100) / 100)
  return r.toLocaleString('en-IN', f === 'grouped2' ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 2 })
}
export const strToPaise = (s: unknown) => {
  if (s === '' || s === null || s === undefined) return undefined
  const n = Number(String(s).replace(/[,₹\s]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : undefined
}
const isoToDmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}` : iso)
export const toIso = (s: unknown) => {
  if (!s) return undefined
  const v = String(s).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
  const m = v.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : undefined
}
const to24 = (s: unknown) => {
  const m = String(s ?? '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i)
  if (!m) return undefined
  let h = Number(m[1])
  if (m[3]) {
    const pm = m[3].toUpperCase() === 'PM'
    if (h > 12) return `${String(h).padStart(2, '0')}:${m[2]}` // "16:29 PM" seed quirk
    if (pm && h < 12) h += 12
    if (!pm && h === 12) h = 0
  }
  return `${String(h).padStart(2, '0')}:${m[2]}`
}
const to12 = (s: unknown) => {
  const m = String(s ?? '').match(/^(\d{2}):(\d{2})/)
  if (!m) return String(s ?? '')
  const h = Number(m[1])
  return `${String(h % 12 || 12).padStart(2, '0')}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`
}

// ── server state per record (workflow status, version) ────────────────────
const serverMeta = new Map<string, { status: BRec['status']; version: number }>()
const mk = (key: string, id: string) => `${key}|${id}`
export const serverStatusOf = (key: string, id: string) => serverMeta.get(mk(key, id))?.status

export function fromApi<F extends AnyRec>(cfg: FinCfg<F>, r: BRec): F {
  const inv = Object.fromEntries(Object.entries(cfg.rename ?? {}).map(([a, b]) => [b, a]))
  const out: Record<string, unknown> = { ...R(cfg.blank?.() ?? {}) }
  Object.entries(r.data ?? {}).forEach(([k, v]) => {
    const fk = inv[k] ?? k
    if (cfg.money?.includes(fk)) out[fk] = v === undefined || v === null ? '' : fmtMoney(v, cfg.moneyFmt)
    else if (cfg.moneyNum?.includes(fk)) out[fk] = (Number(v) || 0) / 100
    else if (cfg.dates?.includes(fk)) out[fk] = v ? (cfg.dateOut === 'iso' ? String(v).slice(0, 10) : isoToDmy(String(v))) : ''
    else if (cfg.times?.includes(fk)) out[fk] = to12(v)
    else out[fk] = v ?? ''
  })
  out.id = r.recordId
  if (r.siteId) out.siteId = r.siteId
  if (r.atmId) out.atmId = r.atmId
  if (cfg.draftField) out[cfg.draftField] = r.status === 'Draft'
  if ('createdAt' in out) out.createdAt = r.createdAt ?? out.createdAt
  if ('updatedAt' in out) out.updatedAt = r.updatedAt ?? out.updatedAt
  return { ...out, ...(cfg.fromExtra?.(r, out) ?? {}) } as unknown as F
}

export function toApi<F extends AnyRec>(cfg: FinCfg<F>, f: F): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  const allowed = new Set(cfg.fields)
  Object.entries(R(f)).forEach(([fk, v]) => {
    const bk = cfg.rename?.[fk] ?? fk
    if (!allowed.has(bk)) return
    let val: unknown = v
    if (cfg.money?.includes(fk) || cfg.moneyNum?.includes(fk)) val = typeof v === 'number' ? Math.round(v * 100) : strToPaise(v)
    else if (cfg.dates?.includes(fk)) val = toIso(v)
    else if (cfg.times?.includes(fk)) val = to24(v)
    else if (typeof v === 'string') val = v.trim()
    if (val === '' || val === undefined || val === null) return
    body[bk] = val
  })
  const fa = R(f).atmId
  const fs = R(f).siteId
  const site = { atmId: typeof fa === 'string' && fa.trim() ? fa.trim() : undefined, siteId: typeof fs === 'string' && fs.trim() ? fs.trim() : undefined }
  return { ...body, ...site, ...(cfg.toExtra?.(f, body) ?? {}) }
}

// ── loaders + mirror ──────────────────────────────────────────────────────
const loaders = new Map<string, ReturnType<typeof createLoader>>()
export function finLoader<F extends AnyRec>(cfg: FinCfg<F>) {
  let l = loaders.get(cfg.key)
  if (!l) {
    l = createLoader(cfg.label, async () => {
      if (franchiseeLocal()) return
      const recs = await fetchAll<BRec>(`/finance/${cfg.key}`)
      recs.forEach((r) => serverMeta.set(mk(cfg.key, r.recordId), { status: r.status, version: r.version }))
      cfg.set(recs.map((r) => fromApi(cfg, r)))
    })
    loaders.set(cfg.key, l)
  }
  return l
}
/** Hook for the register's `use…()` data hook: hydrates once in API mode. */
export const useFinLoad = <F extends AnyRec>(cfg: FinCfg<F>): LoadState => finLoader(cfg).use()

/**
 * Mirror a save of one register record. `prev` is the frontend record before the change (undefined = new).
 * Workflow: new → create (submit unless it is a draft); server Draft / Rejected → patch (+ submit);
 * Submitted → approve / reject when the domain status moved that way; Approved → controlled correction.
 */
export function finSave<F extends AnyRec>(cfg: FinCfg<F>, prev: F | undefined, next: F, reason?: string): Promise<boolean> {
  if (!apiEnabled) return Promise.resolve(true)
  if (franchiseeLocal()) {
    noteLocal()
    return Promise.resolve(true)
  }
  const base = `/finance/${cfg.key}`
  const isDraft = cfg.draftField ? Boolean(R(next)[cfg.draftField]) : false
  const ev = cfg.event ? cfg.event(prev, next) : cfg.statusField ? statusEvent(prev ? String(R(prev)[cfg.statusField] ?? '') : undefined, String(R(next)[cfg.statusField] ?? '')) : undefined
  return run(cfg, `${cfg.label} not saved`, async () => {
    const meta = prev ? serverMeta.get(mk(cfg.key, prev.id)) : undefined
    const body = toApi(cfg, next)
    if (!meta) {
      const created = await post<BRec>(base, { ...body, submit: !isDraft })
      if (ev === 'Approve' && created.status === 'Submitted') await post(`${base}/${created.recordId}/approve`, {})
      return
    }
    const id = encodeURIComponent(prev!.id)
    if (meta.status === 'Draft' || meta.status === 'Rejected') {
      await patch(`${base}/${id}`, body)
      if (!isDraft || ev === 'Submit' || ev === 'Approve') await post(`${base}/${id}/submit`)
      if (ev === 'Approve') await post(`${base}/${id}/approve`, {})
    } else if (meta.status === 'Submitted') {
      if (ev === 'Approve') await post(`${base}/${id}/approve`, {})
      else if (ev === 'Reject') await post(`${base}/${id}/reject`, { reason: reason || `Rejected (${String(R(next)[cfg.statusField!] ?? '')})` })
      else throw new Error('This record is waiting for checker approval on the server — approve or reject it before editing.')
    } else {
      await post(`${base}/${id}/correct`, { reason: reason && reason.length >= 5 ? reason : 'Corrected in the register', changes: body })
    }
  })
}
export function finDelete<F extends AnyRec>(cfg: FinCfg<F>, id: string): Promise<boolean> {
  if (!apiEnabled || franchiseeLocal()) return Promise.resolve(true)
  if (!serverMeta.has(mk(cfg.key, id))) return Promise.resolve(true)
  return run(cfg, `${cfg.label} not deleted`, () => del(`/finance/${cfg.key}/${encodeURIComponent(id)}`))
}
/** Explicit workflow action (checker buttons). */
export function finAction<F extends AnyRec>(cfg: FinCfg<F>, id: string, action: 'submit' | 'approve' | 'reject', reason?: string): Promise<boolean> {
  if (!apiEnabled) return Promise.resolve(true)
  const body = action === 'reject' ? { reason: reason && reason.length >= 3 ? reason : 'Rejected' } : action === 'approve' ? { note: reason } : undefined
  return run(cfg, `${cfg.label} ${action} failed`, () => post(`/finance/${cfg.key}/${encodeURIComponent(id)}/${action}`, body))
}
async function run<F extends AnyRec>(cfg: FinCfg<F>, label: string, fn: () => Promise<unknown>): Promise<boolean> {
  let ok = true
  try {
    await fn()
  } catch (e) {
    ok = false
    toastError(e instanceof ApiError && e.code === 'MAKER_CHECKER' ? new Error('Maker-checker: another user must approve this record.') : e, label)
  }
  await finLoader(cfg).reload()
  return ok
}
/** Server summary (GET /finance/summary) for hub cards. */
export const financeSummary = () => get<Record<string, unknown>>('/finance/summary')
