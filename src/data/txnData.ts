// Transaction Data Management (Operations spec §8).
// CRM Executive / authorized users create, import and edit transaction data; Finance / Operations view & analyze;
// Franchise is READ-ONLY for its own mapped sites (mobile app, UAT 14). Every record keeps Site ID, ATM ID, date,
// count, amount, source file / reference, import batch, verification status and audit history.
import { createStore } from '@/lib/store'
import { downloadCsv } from '@/lib/export'
import { siteStore, siteByAtm, type Site } from '@/data/network'
import { siteAt, franchiseNameOf } from '@/lib/siteRef'
import { getFranchise } from '@/data/franchises'
import { eodStore } from '@/data/eodStore'
import { api, get, patch, post } from '@/lib/api'
import { apiCall, apiEnabled, createLoader, fetchAll, fromPaise, toPaise } from '@/data/opsApi'
import { actorName, emitWorkflow, isOwnRecord, logAudit, newTrail, nowIso, type AuditTrail } from '@/data/workflow'

/** @deprecated Legacy ATM list kept for the dispute modules (failedTxnDisputes / chargeBackDisputes / recon2). */
type KnownAtm = { atmId: string; siteId: string; name: string; model: string; type: 'SF' | 'FFM'; cashLiveDate: string; lastMonth: { txnCount: string; txnAmt: string }; currentMonth: { txnCount: string; txnAmt: string } }
// [type, model, cash-live date, last month count/amt, current month count/amt] — each row is a Site Master site of that funding type.
const KNOWN_ROWS: [KnownAtm['type'], string, string, string, string, string, string][] = [
  ['SF', 'Garnet Model', '12.04.2025', '2350', '3 CR', '1170', '2 CR'],
  ['FFM', 'Sapphire Model', '15.06.2025', '2840', '3.6 CR', '1420', '2.4 CR'],
  ['SF', 'Diamond Model', '20.08.2025', '1980', '2.5 CR', '980', '1.6 CR'],
  ['FFM', 'Platinum Model', '05.09.2025', '3120', '4.1 CR', '1590', '2.8 CR'],
  ['SF', 'Garnet Model', '10.10.2025', '2650', '3.4 CR', '1310', '2.1 CR'],
]
/** @deprecated Legacy ATM list kept for the dispute modules (failedTxnDisputes / chargeBackDisputes / recon2) — now real Site Master sites. */
export const KNOWN_ATMS: KnownAtm[] = (() => {
  const k: Record<string, number> = {}
  return KNOWN_ROWS.map(([type, model, cashLiveDate, lc, la, cc, ca]) => {
    const s = siteAt(5 + (k[type] = (k[type] ?? -1) + 1), (x) => x.siteType === type)
    return { atmId: s.atmId, siteId: s.siteId, name: franchiseNameOf(s), model, type, cashLiveDate, lastMonth: { txnCount: lc, txnAmt: la }, currentMonth: { txnCount: cc, txnAmt: ca } }
  })
})()

export type TxnVerification = 'Pending Verification' | 'Verified' | 'Returned for Correction'
export const TXN_VERIFICATION: TxnVerification[] = ['Pending Verification', 'Verified', 'Returned for Correction']

export type TxnRecord = {
  id: string
  siteId: string
  atmId: string
  frId: string
  franchiseName: string
  txnDate: string
  txnCount: number
  amount: number
  withdrawalCount: number
  depositCount: number
  sourceRef: string // source file name or reference
  importBatch?: string
  entryMode: 'Manual' | 'Import'
  verification: TxnVerification
  verifiedBy?: string
  verifiedAt?: string
  returnReason?: string
  trail: AuditTrail
  history: { at: string; by: string; text: string }[]
}

export type ImportBatch = { id: string; fileName: string; at: string; by: string; total: number; accepted: number; rejected: number; errors: string[] }
export type TxnState = { records: TxnRecord[]; batches: ImportBatch[] }

const frNameOf = (id: string) => getFranchise(id)?.name ?? id
const isoAdd = (iso: string, d: number) => {
  const x = new Date(`${iso}T00:00:00Z`)
  x.setUTCDate(x.getUTCDate() + d)
  return x.toISOString().slice(0, 10)
}

function seed(): TxnState {
  const frs = new Set([...eodStore.get().records.map((r) => r.frId), ...[...new Set(siteStore.get().sites.map((s) => s.frId))].slice(0, 10)])
  const sites = siteStore.get().sites.filter((s) => s.operational && frs.has(s.frId)).slice(0, 90)
  const records: TxnRecord[] = []
  const batches: ImportBatch[] = []
  let n = 0
  for (let d = 10; d >= 1; d--) {
    const date = isoAdd('2026-11-25', -d)
    const batchId = d > 2 ? `IMP-${date.replace(/-/g, '')}` : undefined
    sites.forEach((s, i) => {
      const base = Math.max(40, Math.round(s.monthlyTxns / 30))
      const count = base + ((i * 7 + d * 13) % 25) - 12
      const wd = Math.round(count * 0.78)
      const amount = wd * (1800 + ((i * 31 + d * 17) % 9) * 100)
      const by = batchId ? 'Kiran Rao' : 'Sunil Yadav'
      const at = `${date}T23:${String(10 + (i % 40)).padStart(2, '0')}:00.000Z`
      records.push({
        id: `TXN-${String(++n).padStart(5, '0')}`, siteId: s.siteId, atmId: s.atmId, frId: s.frId, franchiseName: frNameOf(s.frId), txnDate: date, txnCount: count, amount, withdrawalCount: wd, depositCount: count - wd,
        sourceRef: batchId ? `switch_report_${date.replace(/-/g, '')}.csv` : 'Manual entry – switch MIS screen', importBatch: batchId, entryMode: batchId ? 'Import' : 'Manual',
        verification: d > 2 ? 'Verified' : 'Pending Verification', verifiedBy: d > 2 ? 'Deepak Joshi' : undefined, verifiedAt: d > 2 ? `${isoAdd(date, 1)}T11:00:00.000Z` : undefined,
        trail: { ...newTrail(), createdBy: by, createdAt: at, submittedBy: by, submittedAt: at }, history: [{ at, by, text: batchId ? `Imported in ${batchId}` : 'Created manually' }],
      })
    })
    if (batchId) batches.push({ id: batchId, fileName: `switch_report_${date.replace(/-/g, '')}.csv`, at: `${date}T23:05:00.000Z`, by: 'Kiran Rao', total: sites.length + (d % 3 === 0 ? 1 : 0), accepted: sites.length, rejected: d % 3 === 0 ? 1 : 0, errors: d % 3 === 0 ? ['Row 25: ATM DX00000 not found in Site Master'] : [] })
  }
  return { records: records.reverse(), batches: batches.reverse() }
}

export const txnStore = createStore<TxnState>('dexter.txn.v2', seed)
/** Hydrates from the backend in API mode (no-op in mock mode). */
export const useTxnStore = () => {
  txnLoader.use()
  return txnStore.use()
}

export type TxnInput = { atmOrSite: string; txnDate: string; txnCount: string; amount: string; withdrawalCount: string; depositCount: string; sourceRef: string }
export const emptyTxnInput = (): TxnInput => ({ atmOrSite: '', txnDate: '', txnCount: '', amount: '', withdrawalCount: '', depositCount: '', sourceRef: '' })

export const resolveSite = (q: string): Site | undefined => {
  const v = q.trim()
  if (!v) return undefined
  return siteByAtm(v) ?? siteStore.get().sites.find((s) => s.siteId.toLowerCase() === v.toLowerCase())
}

export function validateTxn(i: TxnInput, existing: TxnRecord[], ignoreId?: string): Record<string, string> {
  const e: Record<string, string> = {}
  const s = resolveSite(i.atmOrSite)
  if (!s) e.atmOrSite = 'ATM / Site ID not found in Site Master'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.txnDate)) e.txnDate = 'Transaction date is required'
  else if (i.txnDate > new Date().toISOString().slice(0, 10)) e.txnDate = 'Date cannot be in the future'
  const c = Number(i.txnCount)
  if (i.txnCount === '' || !Number.isInteger(c) || c < 0) e.txnCount = 'Whole number ≥ 0'
  if (i.amount === '' || !(Number(i.amount) >= 0)) e.amount = 'Amount ≥ 0'
  const w = Number(i.withdrawalCount || 0)
  const dp = Number(i.depositCount || 0)
  if (!Number.isInteger(w) || w < 0) e.withdrawalCount = 'Whole number ≥ 0'
  if (!Number.isInteger(dp) || dp < 0) e.depositCount = 'Whole number ≥ 0'
  if (!e.txnCount && (i.withdrawalCount || i.depositCount) && w + dp > c) e.withdrawalCount = 'Withdrawal + deposit count exceeds the total count'
  if (!i.sourceRef.trim()) e.sourceRef = 'Source file / reference is required'
  if (s && !e.txnDate && existing.some((r) => r.id !== ignoreId && r.siteId === s.siteId && r.txnDate === i.txnDate)) e.txnDate = 'A record already exists for this ATM and date (duplicate)'
  return e
}

function nextId(st: TxnState, plus = 0) {
  return `TXN-${String(st.records.reduce((m, r) => Math.max(m, Number(r.id.slice(4)) || 0), 0) + 1 + plus).padStart(5, '0')}`
}

export function createTxn(i: TxnInput): { error?: Record<string, string>; rec?: TxnRecord } {
  const st = txnStore.get()
  const e = validateTxn(i, st.records)
  if (Object.keys(e).length) return { error: e }
  const s = resolveSite(i.atmOrSite)!
  const rec: TxnRecord = {
    id: nextId(st), siteId: s.siteId, atmId: s.atmId, frId: s.frId, franchiseName: frNameOf(s.frId), txnDate: i.txnDate, txnCount: Number(i.txnCount), amount: Number(i.amount),
    withdrawalCount: Number(i.withdrawalCount || 0), depositCount: Number(i.depositCount || 0), sourceRef: i.sourceRef.trim(), entryMode: 'Manual', verification: 'Pending Verification',
    trail: { ...newTrail(), submittedBy: actorName(), submittedAt: nowIso() }, history: [{ at: nowIso(), by: actorName(), text: 'Created manually' }],
  }
  txnStore.set((x) => ({ ...x, records: [rec, ...x.records] }))
  emitWorkflow({ module: 'Transaction Data', event: 'Submit', refId: rec.id, vars: { Record_ID: rec.id, Site_ID: rec.siteId, ATM_ID: rec.atmId, Franchise_Name: rec.franchiseName }, nextAction: { title: `Verify transaction data ${rec.atmId} ${rec.txnDate}`, dueHours: 24 } })
  return { rec }
}

const FIELDS: { key: keyof TxnRecord & keyof TxnInput; label: string }[] = [
  { key: 'txnDate', label: 'Transaction date' }, { key: 'txnCount', label: 'Transaction count' }, { key: 'amount', label: 'Amount' },
  { key: 'withdrawalCount', label: 'Withdrawal count' }, { key: 'depositCount', label: 'Deposit count' }, { key: 'sourceRef', label: 'Source reference' },
]

/** Edits are versioned (old / new / reason). A verified record goes back to Pending Verification after an edit. */
export function editTxn(id: string, i: TxnInput, reason: string): { error?: Record<string, string> } {
  const st = txnStore.get()
  const r = st.records.find((x) => x.id === id)
  if (!r) return { error: { form: 'Record not found' } }
  const e = validateTxn({ ...i, atmOrSite: r.atmId }, st.records, id)
  if (!reason.trim()) e.reason = 'Modification reason is required'
  if (Object.keys(e).length) return { error: e }
  const next: Partial<TxnRecord> = { txnDate: i.txnDate, txnCount: Number(i.txnCount), amount: Number(i.amount), withdrawalCount: Number(i.withdrawalCount || 0), depositCount: Number(i.depositCount || 0), sourceRef: i.sourceRef.trim() }
  const mods = FIELDS.filter((f) => String(r[f.key]) !== String(next[f.key])).map((f) => ({ at: nowIso(), by: actorName(), field: f.label, oldValue: String(r[f.key]), newValue: String(next[f.key]), reason: reason.trim() }))
  if (!mods.length) return { error: { form: 'Nothing changed' } }
  txnStore.set((x) => ({
    ...x,
    records: x.records.map((y) => (y.id === id ? {
      ...y, ...next, verification: 'Pending Verification' as const, verifiedBy: undefined, verifiedAt: undefined,
      trail: { ...y.trail, modifications: [...y.trail.modifications, ...mods] },
      history: [...y.history, { at: nowIso(), by: actorName(), text: `Edited ${mods.map((m) => m.field).join(', ')} — ${reason.trim()}${y.verification === 'Verified' ? ' (re-verification required)' : ''}` }],
    } : y)),
  }))
  logAudit('Transaction Data', id, 'Edited', mods.map((m) => `${m.field}: ${m.oldValue} → ${m.newValue}`).join('; '))
  return {}
}

export function verifyTxn(ids: string[]): { done: number; blocked: string[] } {
  const st = txnStore.get()
  const blocked: string[] = []
  const ok = new Set<string>()
  ids.forEach((id) => {
    const r = st.records.find((x) => x.id === id)
    if (!r || r.verification === 'Verified') return
    const lastEditor = r.trail.modifications[r.trail.modifications.length - 1]?.by
    if (isOwnRecord(r.trail) || lastEditor === actorName()) blocked.push(id)
    else ok.add(id)
  })
  if (ok.size)
    txnStore.set((x) => ({ ...x, records: x.records.map((y) => (ok.has(y.id) ? { ...y, verification: 'Verified' as const, verifiedBy: actorName(), verifiedAt: nowIso(), returnReason: undefined, history: [...y.history, { at: nowIso(), by: actorName(), text: 'Verified' }] } : y)) }))
  ok.forEach((id) => emitWorkflow({ module: 'Transaction Data', event: 'Verify', refId: id }))
  return { done: ok.size, blocked }
}

export function returnTxn(id: string, reason: string) {
  if (!reason.trim()) return 'Reason is required'
  const r = txnStore.get().records.find((x) => x.id === id)
  if (!r) return 'Not found'
  if (isOwnRecord(r.trail)) return 'Maker-checker: you created this record'
  txnStore.set((x) => ({ ...x, records: x.records.map((y) => (y.id === id ? { ...y, verification: 'Returned for Correction' as const, returnReason: reason.trim(), history: [...y.history, { at: nowIso(), by: actorName(), text: `Returned: ${reason.trim()}` }] } : y)) }))
  emitWorkflow({ module: 'Transaction Data', event: 'Return', refId: id })
  return null
}

// ── import ───────────────────────────────────────────────────────────────
export const IMPORT_HEADERS = ['atm_id', 'txn_date', 'txn_count', 'amount', 'withdrawal_count', 'deposit_count', 'source_ref']
export type ImportRow = { line: number; input: TxnInput; errors: string[] }

const toIso = (d: string) => {
  const v = d.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const m = v.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : v
}

export function parseImport(text: string, fileName: string): ImportRow[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return []
  const head = lines[0].toLowerCase().split(',').map((h) => h.trim())
  const hasHead = head.includes('atm_id') || head.includes('site_id')
  const idx = (k: string) => (hasHead ? head.indexOf(k) : IMPORT_HEADERS.indexOf(k))
  const existing = txnStore.get().records
  const seen = new Set<string>()
  return lines.slice(hasHead ? 1 : 0).map((l, i) => {
    const c = l.split(',').map((x) => x.trim())
    const get = (k: string) => (idx(k) >= 0 ? (c[idx(k)] ?? '') : '')
    const input: TxnInput = { atmOrSite: get('atm_id') || get('site_id'), txnDate: toIso(get('txn_date')), txnCount: get('txn_count'), amount: get('amount'), withdrawalCount: get('withdrawal_count'), depositCount: get('deposit_count'), sourceRef: get('source_ref') || fileName }
    const errors = Object.values(validateTxn(input, existing))
    const key = `${resolveSite(input.atmOrSite)?.siteId}|${input.txnDate}`
    if (seen.has(key)) errors.push('Duplicate row in this file')
    seen.add(key)
    return { line: i + (hasHead ? 2 : 1), input, errors }
  })
}

export function commitImport(fileName: string, rows: ImportRow[]): ImportBatch {
  const st = txnStore.get()
  const good = rows.filter((r) => !r.errors.length)
  const batchId = `IMP-${Date.now().toString(36).toUpperCase()}`
  const recs: TxnRecord[] = good.map((r, k) => {
    const s = resolveSite(r.input.atmOrSite)!
    return {
      id: nextId(st, k), siteId: s.siteId, atmId: s.atmId, frId: s.frId, franchiseName: frNameOf(s.frId), txnDate: r.input.txnDate, txnCount: Number(r.input.txnCount), amount: Number(r.input.amount),
      withdrawalCount: Number(r.input.withdrawalCount || 0), depositCount: Number(r.input.depositCount || 0), sourceRef: r.input.sourceRef || fileName, importBatch: batchId, entryMode: 'Import', verification: 'Pending Verification',
      trail: { ...newTrail(), submittedBy: actorName(), submittedAt: nowIso() }, history: [{ at: nowIso(), by: actorName(), text: `Imported in ${batchId} (line ${r.line})` }],
    }
  })
  const batch: ImportBatch = { id: batchId, fileName, at: nowIso(), by: actorName(), total: rows.length, accepted: recs.length, rejected: rows.length - recs.length, errors: rows.filter((r) => r.errors.length).map((r) => `Row ${r.line}: ${r.errors.join('; ')}`) }
  txnStore.set((x) => ({ records: [...recs, ...x.records], batches: [batch, ...x.batches] }))
  if (recs.length) emitWorkflow({ module: 'Transaction Data', event: 'Submit', refId: batchId, vars: { Record_ID: batchId, Current_Status: `${recs.length} rows imported` }, nextAction: { title: `Verify import batch ${batchId} (${recs.length} rows)`, dueHours: 24 } })
  return batch
}

export function sampleCsv() {
  const sites = siteStore.get().sites.filter((s) => s.operational).slice(0, 4)
  const d = new Date(Date.now() - 86400_000).toISOString().slice(0, 10)
  return [IMPORT_HEADERS.join(','), ...sites.map((s, i) => [s.atmId, d, 120 + i * 9, (120 + i * 9) * 1500, 95 + i * 7, 25 + i * 2, `switch_report_${d.replace(/-/g, '')}.csv`].join(',')), `DX00000,${d},10,15000,8,2,bad_row.csv`].join('\n')
}

export function exportTxnCsv(rows: TxnRecord[], name = 'transaction-data') {
  downloadCsv(name, ['Record ID', 'Site ID', 'ATM ID', 'Franchise', 'Date', 'Txn count', 'Withdrawals', 'Deposits', 'Amount', 'Source', 'Batch', 'Mode', 'Verification', 'Verified by', 'Created by'], rows.map((r) => [
    r.id, r.siteId, r.atmId, r.franchiseName, r.txnDate, String(r.txnCount), String(r.withdrawalCount), String(r.depositCount), String(r.amount), r.sourceRef, r.importBatch ?? '', r.entryMode, r.verification, r.verifiedBy ?? '', r.trail.createdBy,
  ]))
}

// ── API mode (backend /txn-data) ─────────────────────────────────────────
type ApiVersion = { version: number; at: string; by: string; reason: string; before: Record<string, unknown> }
export type ApiTxn = {
  txnId: string; siteId: string; atmId: string; frId: string; franchiseName: string; funding?: string; txnDate: string; month?: string
  txnCount: number; withdrawalCount: number; depositCount: number; nonFinancialCount?: number; amountPaise: number; sourceRef?: string; importBatch?: string
  entryMode: 'Manual' | 'Import'; verification: TxnVerification; verifiedBy?: string; verifiedByName?: string; verifiedAt?: string; returnReason?: string
  createdBy?: string; createdByName?: string; lastEditedBy?: string; version?: number; versions?: ApiVersion[]; history?: { at: string; by: string; text: string }[]; createdAt?: string; updatedAt?: string
}
type ApiBatch = { batchId: string; fileName: string; at: string; by: string; byName?: string; total: number; accepted: number; rejected: number; rowErrors?: { line: number; messages: string[] }[] }

const FIELD_LABEL: Record<string, string> = { txnDate: 'Transaction date', txnCount: 'Transaction count', amountPaise: 'Amount', withdrawalCount: 'Withdrawal count', depositCount: 'Deposit count', nonFinancialCount: 'Non-financial count', sourceRef: 'Source reference' }

export function fromApiTxn(r: ApiTxn): TxnRecord {
  const createdBy = r.createdByName ?? r.createdBy ?? ''
  const createdAt = r.createdAt ?? ''
  // versions[] keep the "before" values of each correction; the "after" value is the next version's before (or the current record).
  const vs = r.versions ?? []
  const modifications = vs.flatMap((v, i) =>
    Object.entries(v.before ?? {}).map(([k, old]) => {
      const nextVal = i + 1 < vs.length && k in (vs[i + 1].before ?? {}) ? vs[i + 1].before[k] : (r as unknown as Record<string, unknown>)[k]
      const f = (x: unknown) => (k === 'amountPaise' ? String(fromPaise(Number(x))) : String(x ?? ''))
      return { at: v.at, by: v.by, field: FIELD_LABEL[k] ?? k, oldValue: f(old), newValue: f(nextVal), reason: v.reason }
    }),
  )
  return {
    id: r.txnId, siteId: r.siteId, atmId: r.atmId, frId: r.frId, franchiseName: r.franchiseName, txnDate: r.txnDate, txnCount: r.txnCount, amount: fromPaise(r.amountPaise),
    withdrawalCount: r.withdrawalCount ?? 0, depositCount: r.depositCount ?? 0, sourceRef: r.sourceRef ?? '', importBatch: r.importBatch, entryMode: r.entryMode, verification: r.verification,
    verifiedBy: r.verifiedByName ?? r.verifiedBy, verifiedAt: r.verifiedAt, returnReason: r.returnReason,
    trail: { createdBy, createdAt, submittedBy: createdBy, submittedAt: createdAt, modifications, documents: [], taskRefs: [] },
    history: r.history ?? [],
  }
}
const fromApiBatch = (b: ApiBatch): ImportBatch => ({ id: b.batchId, fileName: b.fileName, at: b.at, by: b.byName ?? b.by, total: b.total, accepted: b.accepted, rejected: b.rejected, errors: (b.rowErrors ?? []).map((e) => `Row ${e.line}: ${e.messages.join('; ')}`) })

/** Loads every transaction record + import batches (batches need CRM / Admin; ignored when refused). */
export const txnLoader = createLoader('transaction data', async () => {
  const [recs, batches] = await Promise.all([fetchAll<ApiTxn>('/txn-data', { sort: '-txnDate' }), fetchAll<ApiBatch>('/txn-data/batches').catch(() => [] as ApiBatch[])])
  txnStore.set({ records: recs.map(fromApiTxn), batches: batches.map(fromApiBatch) })
})

const upsertTxn = (r: ApiTxn) => {
  const rec = fromApiTxn(r)
  txnStore.set((x) => ({ ...x, records: x.records.some((y) => y.id === rec.id) ? x.records.map((y) => (y.id === rec.id ? rec : y)) : [rec, ...x.records] }))
  return rec
}

/** Full record with history / versions (list responses omit them). */
export async function fetchTxnDetail(id: string): Promise<TxnRecord | undefined> {
  if (!apiEnabled) return txnStore.get().records.find((r) => r.id === id)
  return upsertTxn(await apiCall(() => get<ApiTxn>(`/txn-data/${encodeURIComponent(id)}`)))
}

const num = (v: string) => (v === '' ? undefined : Number(v))

/** Create (API mode: POST /txn-data; mock: local store). Local field validation runs first either way. */
export async function createTxnAsync(i: TxnInput): Promise<{ error?: Record<string, string>; rec?: TxnRecord }> {
  if (!apiEnabled) return createTxn(i)
  const e = validateTxn(i, txnStore.get().records)
  if (Object.keys(e).length) return { error: e }
  try {
    const r = await apiCall(() =>
      post<ApiTxn>('/txn-data', { atmOrSite: i.atmOrSite.trim(), txnDate: i.txnDate, txnCount: Number(i.txnCount), withdrawalCount: num(i.withdrawalCount), depositCount: num(i.depositCount), amountPaise: toPaise(Number(i.amount)), sourceRef: i.sourceRef.trim() || undefined }),
    )
    return { rec: upsertTxn(r) }
  } catch (err) {
    return { error: { form: (err as Error).message } }
  }
}

export async function editTxnAsync(id: string, i: TxnInput, reason: string): Promise<{ error?: Record<string, string> }> {
  if (!apiEnabled) return editTxn(id, i, reason)
  const r = txnStore.get().records.find((x) => x.id === id)
  if (!r) return { error: { form: 'Record not found' } }
  const e = validateTxn({ ...i, atmOrSite: r.atmId }, txnStore.get().records, id)
  if (reason.trim().length < 3) e.reason = 'Modification reason is required (min 3 characters)'
  if (Object.keys(e).length) return { error: e }
  const body: Record<string, unknown> = { reason: reason.trim() }
  if (i.txnDate !== r.txnDate) body.txnDate = i.txnDate
  if (Number(i.txnCount) !== r.txnCount) body.txnCount = Number(i.txnCount)
  if (Number(i.withdrawalCount || 0) !== r.withdrawalCount) body.withdrawalCount = Number(i.withdrawalCount || 0)
  if (Number(i.depositCount || 0) !== r.depositCount) body.depositCount = Number(i.depositCount || 0)
  if (toPaise(Number(i.amount)) !== toPaise(r.amount)) body.amountPaise = toPaise(Number(i.amount))
  if (i.sourceRef.trim() !== r.sourceRef) body.sourceRef = i.sourceRef.trim()
  if (Object.keys(body).length === 1) return { error: { form: 'Nothing changed' } }
  try {
    upsertTxn(await apiCall(() => patch<ApiTxn>(`/txn-data/${encodeURIComponent(id)}`, body)))
    return {}
  } catch (err) {
    return { error: { form: (err as Error).message } }
  }
}

export async function verifyTxnAsync(ids: string[]): Promise<{ done: number; blocked: string[] }> {
  if (!apiEnabled) return verifyTxn(ids)
  const r = await apiCall(() => post<{ done: number | string[]; blocked: (string | { id?: string; txnId?: string })[] }>('/txn-data/verify', { ids }))
  await txnLoader.reload()
  return { done: Array.isArray(r.done) ? r.done.length : Number(r.done) || 0, blocked: (r.blocked ?? []).map((b) => (typeof b === 'string' ? b : (b.txnId ?? b.id ?? ''))) }
}

export async function returnTxnAsync(id: string, reason: string): Promise<string | null> {
  if (!apiEnabled) return returnTxn(id, reason)
  if (reason.trim().length < 3) return 'Reason is required (min 3 characters)'
  try {
    upsertTxn(await apiCall(() => post<ApiTxn>(`/txn-data/${encodeURIComponent(id)}/return`, { reason: reason.trim() })))
    return null
  } catch (err) {
    return (err as Error).message
  }
}

type ApiImportRow = { line: number; atmId: string; siteId?: string; txnDate: string; txnCount: number; withdrawalCount: number; depositCount: number; nonFinancialCount: number; amountPaise: number; sourceRef: string; errors: string[] }
const importForm = (text: string, fileName: string) => {
  const form = new FormData()
  form.append('file', new File([text], /\.(csv|txt|xlsx?)$/i.test(fileName) ? fileName : `${fileName}.csv`, { type: 'text/csv' }))
  return form
}

/** Dry-run validation (API: POST /txn-data/import?dryRun=true; mock: local parser). */
export async function parseImportAsync(text: string, fileName: string): Promise<ImportRow[]> {
  if (!apiEnabled) return parseImport(text, fileName)
  const r = await apiCall(() => api<{ rows: ApiImportRow[] }>('/txn-data/import', { method: 'POST', form: importForm(text, fileName), query: { dryRun: 'true' } }))
  return r.rows.map((x) => ({
    line: x.line,
    errors: x.errors,
    input: { atmOrSite: x.atmId, txnDate: x.txnDate, txnCount: String(x.txnCount), amount: String(fromPaise(x.amountPaise)), withdrawalCount: String(x.withdrawalCount), depositCount: String(x.depositCount), sourceRef: x.sourceRef || fileName },
  }))
}

/** Commit an import. In API mode the original text is re-sent (the server re-validates). */
export async function commitImportAsync(fileName: string, rows: ImportRow[], text: string): Promise<ImportBatch> {
  if (!apiEnabled) return commitImport(fileName, rows)
  const r = await apiCall(() => api<{ batch: ApiBatch }>('/txn-data/import', { method: 'POST', form: importForm(text, fileName) }))
  await txnLoader.reload()
  return fromApiBatch(r.batch)
}
