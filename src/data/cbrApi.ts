// API adapters for the CBR / Cash Loading masters, the daily denomination CBR and the counter clears
// (backend /cbr, /cash-loading, /cbr/daily, /my/cbr, /my/cash-loading). Only used when apiEnabled.
// Type-only imports from ./cbr keep this module free of a runtime import cycle.
import { api, get, patch, post, put, uploadFile } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { fromPaise, toPaise, errMsg, fetchAll } from './opsApi'
import type { CashDoc, CashInput, CashKind, CashRecord, CorrectableKey, CounterClear, DailyCbr, GroupKey, Qty, Result } from './cbr'
import type { FundingModel, OpsStatus } from './workflow'

export const isFranchiseeSession = () => getSession()?.role === 'Franchisee'

/** Staff register or franchise self-service prefix for a master. */
export const cashBase = (kind: CashKind) => {
  const k = kind === 'CBR' ? 'cbr' : 'cash-loading'
  return isFranchiseeSession() ? `/my/${k}` : `/${k}`
}

type ApiDoc = { fileId: string; name: string; size: number; at: string; by?: string; byName?: string }
type ApiTrail = {
  createdBy: string; createdByName?: string; createdAt: string
  submittedBy?: string; submittedByName?: string; submittedAt?: string
  acknowledgement?: { text: string; version: string; lang: 'Hindi' | 'English'; at: string; by: string; byName?: string }
  verifiedBy?: string; verifiedByName?: string; verifiedAt?: string
  approvedBy?: string; approvedByName?: string; approvedAt?: string
  returnedBy?: string; returnedByName?: string; returnReason?: string
}
export type ApiCashRecord = {
  recordId: string
  kind: CashKind
  siteId: string; atmId: string; frId: string; franchiseName: string; atmLocation: string; bank: string
  wlaAccount: string; settlementExercise: string; siteType: string; machineType?: string; fundingModel: FundingModel
  formName?: string; date: string; lastDate?: string
  amountPaise: number; dailyIndentPaise: number; cashWithdrawalPaise: number; openingBalancePaise: number
  remarks?: string
  documents: ApiDoc[]
  docHistory: { at: string; by: string; name: string; fileId: string; action: 'Uploaded' | 'Replaced' | 'Deleted'; reason?: string }[]
  status: OpsStatus
  locked: boolean
  version?: number
  channel: CashRecord['channel']
  trail: ApiTrail
  statusLog: { at: string; by: string; status: OpsStatus; note?: string }[]
  modifications: { at: string; by: string; byName?: string; field: string; oldValue: string; newValue: string; reason: string }[]
  rejectReason?: string
  taskRefs?: string[]
}

const iso = (v?: string | null) => (v ? String(v) : '')

const PAISE_FIELDS = new Set(['amountPaise', 'dailyIndentPaise', 'cashWithdrawalPaise', 'openingBalancePaise'])
const fieldLabel: Record<string, string> = {
  amountPaise: 'Injection / Loading Amount', dailyIndentPaise: 'Daily Indent', cashWithdrawalPaise: 'Cash Withdrawal', openingBalancePaise: 'Opening Balance',
}
const fmtMod = (field: string, v: string) => (PAISE_FIELDS.has(field) && v !== '' && !Number.isNaN(Number(v)) ? String(fromPaise(Number(v))) : v)

export function toCashRecord(a: ApiCashRecord): CashRecord {
  const t = a.trail ?? ({} as ApiTrail)
  const docs: CashDoc[] = (a.documents ?? []).map((d) => ({ id: d.fileId, name: d.name, size: d.size ?? 0, at: iso(d.at), by: d.byName ?? d.by ?? '' }))
  return {
    siteId: a.siteId, atmId: a.atmId, frId: a.frId, franchiseName: a.franchiseName, atmLocation: a.atmLocation, bank: a.bank,
    wlaAccount: a.wlaAccount, settlementExercise: a.settlementExercise, siteType: a.siteType, fundingModel: a.fundingModel,
    id: a.recordId,
    kind: a.kind,
    formName: a.formName ?? '',
    date: a.date,
    lastDate: a.lastDate ?? '',
    amount: fromPaise(a.amountPaise),
    dailyIndent: fromPaise(a.dailyIndentPaise),
    cashWithdrawal: fromPaise(a.cashWithdrawalPaise),
    openingBalance: fromPaise(a.openingBalancePaise),
    remarks: a.remarks ?? '',
    documents: docs,
    status: a.status,
    locked: !!a.locked,
    channel: a.channel,
    trail: {
      // names (not user ids) so the frontend maker-checker hint (isOwnRecord vs actorName()) keeps working
      createdBy: t.createdByName ?? t.createdBy ?? '',
      createdAt: iso(t.createdAt),
      submittedBy: t.submittedByName ?? t.submittedBy,
      submittedAt: t.submittedAt ? iso(t.submittedAt) : undefined,
      verifiedBy: t.verifiedByName ?? t.verifiedBy,
      verifiedAt: t.verifiedAt ? iso(t.verifiedAt) : undefined,
      approvedBy: t.approvedByName ?? t.approvedBy,
      approvedAt: t.approvedAt ? iso(t.approvedAt) : undefined,
      returnedBy: t.returnedByName ?? t.returnedBy,
      returnReason: t.returnReason,
      acknowledgement: t.acknowledgement ? { text: t.acknowledgement.text, version: t.acknowledgement.version, lang: t.acknowledgement.lang, at: iso(t.acknowledgement.at), by: t.acknowledgement.byName ?? t.acknowledgement.by } : undefined,
      modifications: (a.modifications ?? []).map((m) => ({ at: iso(m.at), by: m.byName ?? m.by, field: fieldLabel[m.field] ?? m.field, oldValue: fmtMod(m.field, m.oldValue), newValue: fmtMod(m.field, m.newValue), reason: m.reason })),
      documents: (a.docHistory ?? []).map((h) => ({ at: iso(h.at), by: h.by, name: h.name, action: h.action })),
      taskRefs: a.taskRefs ?? [],
    },
    statusLog: (a.statusLog ?? []).map((s) => ({ at: iso(s.at), by: s.by, status: s.status, note: s.note })),
    rejectReason: a.rejectReason,
  }
}

const ok = (id: string): Result => ({ ok: true, id })
const fail = (e: unknown): Result => ({ ok: false, error: errMsg(e) })

/** Body for POST / PATCH /records from the frontend input (rupees → paise, documents → fileIds). */
function recordBody(kind: CashKind, input: CashInput, create: boolean, asFranchise?: boolean) {
  const b: Record<string, unknown> = {
    formName: input.formName || undefined,
    date: input.date,
    lastDate: input.lastDate || undefined,
    amountPaise: toPaise(input.amount),
    dailyIndentPaise: toPaise(input.dailyIndent),
    cashWithdrawalPaise: toPaise(input.cashWithdrawal),
    remarks: input.remarks ?? '',
  }
  if (kind === 'Cash Loading') b.openingBalancePaise = toPaise(input.openingBalance)
  if (input.documents) b.fileIds = input.documents.map((d) => d.id)
  if (create) {
    b.atmId = input.atmId.trim()
    if (asFranchise && !isFranchiseeSession()) b.onBehalfOfFranchise = true
  }
  return b
}

/** API operations of one master; each returns the frontend Result and hands the fresh record to `put`. */
export function cashApi(kind: CashKind, putRec: (r: CashRecord) => void) {
  const base = () => cashBase(kind)
  const run = async (p: Promise<ApiCashRecord>): Promise<Result> => {
    try {
      const rec = toCashRecord(await p)
      putRec(rec)
      return ok(rec.id)
    } catch (e) {
      return fail(e)
    }
  }
  return {
    list: async () => (await fetchAll<ApiCashRecord>(`${base()}/records`)).map(toCashRecord),
    saveDraft: (input: CashInput, opts: { id?: string; asFranchise?: boolean } = {}) =>
      run(opts.id ? patch<ApiCashRecord>(`${base()}/records/${opts.id}`, recordBody(kind, input, false)) : post<ApiCashRecord>(`${base()}/records`, recordBody(kind, input, true, opts.asFranchise))),
    submit: (id: string, lang: 'Hindi' | 'English') => run(post<ApiCashRecord>(`${base()}/records/${id}/submit`, { lang, accepted: true })),
    verify: (id: string, remark?: string) => run(post<ApiCashRecord>(`${base()}/records/${id}/verify`, { remark: remark || undefined })),
    returnForCorrection: (id: string, reason: string) => run(post<ApiCashRecord>(`${base()}/records/${id}/return`, { reason: reason.trim() })),
    approve: (id: string, remark?: string) => run(post<ApiCashRecord>(`${base()}/records/${id}/approve`, { remark: remark || undefined })),
    reject: (id: string, reason: string) => run(post<ApiCashRecord>(`${base()}/records/${id}/reject`, { reason: reason.trim() })),
    correct: (id: string, field: CorrectableKey, value: string, reason: string) => {
      const key = { amount: 'amountPaise', dailyIndent: 'dailyIndentPaise', cashWithdrawal: 'cashWithdrawalPaise', openingBalance: 'openingBalancePaise' }[field as string]
      const v = key ? toPaise(Number(value)) : value
      return run(post<ApiCashRecord>(`${base()}/records/${id}/correct`, { field: key ?? field, value: v, reason: reason.trim() }))
    },
    /** Document upload / replace / delete; `fileId` = the new file from POST /files. */
    docAction: (id: string, action: 'Uploaded' | 'Replaced' | 'Deleted', doc: { docId?: string; fileId?: string }, reason?: string) => {
      const r = reason?.trim() || undefined
      if (action === 'Uploaded') return run(post<ApiCashRecord>(`${base()}/records/${id}/documents`, { fileId: doc.fileId, reason: r }))
      if (action === 'Replaced') return run(put<ApiCashRecord>(`${base()}/records/${id}/documents/${doc.docId}`, { fileId: doc.fileId, reason: r }))
      return run(api<ApiCashRecord>(`${base()}/records/${id}/documents/${doc.docId}`, { method: 'DELETE', body: { reason: r } }))
    },
  }
}

// ── Daily denomination CBR ──────────────────────────────────────────────
type ApiDaily = {
  dailyId: string; siteId: string; atmId: string; frId?: string; date: string; cra?: string; mfName?: string; bank?: string; atmLocation?: string
  indentNo?: string; eodTime?: string; remarks?: string; groups: Partial<Record<GroupKey, Qty>>; updatedBy?: string; updatedByName?: string; uploadedByName?: string; updatedAt?: string
}
const GROUP_KEYS: GroupKey[] = ['opening', 'dispensed', 'purge', 'overage', 'shortage', 'physical', 'replenishment', 'closing', 'switch']
const blankQty = (): Qty => [null, null, null, null, null]

export function toDailyCbr(a: ApiDaily, city = ''): DailyCbr {
  return {
    id: a.dailyId,
    siteId: a.siteId,
    date: a.date,
    cra: a.cra ?? '',
    location: city,
    bank: a.bank ?? '',
    srNo: '1',
    atmLocation: a.atmLocation ?? '',
    atmId: a.atmId,
    indentNo: a.indentNo ?? '',
    eodTime: a.eodTime ?? '',
    mfName: a.mfName ?? '',
    remarks: a.remarks ?? '',
    groups: Object.fromEntries(GROUP_KEYS.map((k) => [k, a.groups?.[k] ?? blankQty()])) as Record<GroupKey, Qty>,
    updatedBy: a.updatedByName ?? a.updatedBy,
    updatedAt: a.updatedAt,
  }
}

const dailyBase = () => (isFranchiseeSession() ? '/my/cbr/daily' : '/cbr/daily')

export const listDaily = async () => (await fetchAll<ApiDaily>(dailyBase())).map((d) => toDailyCbr(d))

/**
 * PUT a daily row. A locked day (older than the lock window, or its CBR master record approved) answers 409
 * `DAILY_LOCKED` (`details.reason`); staff resend with `correctionReason` (5–300 chars, kept in `corrections[]`).
 * A franchise can neither change a locked day nor overwrite a staff entry (403 `STAFF_ENTRY`).
 */
export async function saveDailyApi(d: DailyCbr, correctionReason?: string): Promise<DailyCbr> {
  const r = await put<ApiDaily>(`${dailyBase()}/${encodeURIComponent(d.atmId)}/${d.date}`, {
    cra: d.cra || undefined, mfName: d.mfName || undefined, indentNo: d.indentNo || undefined, eodTime: d.eodTime || undefined, remarks: d.remarks || undefined, groups: d.groups,
    ...(correctionReason?.trim() ? { correctionReason: correctionReason.trim() } : {}),
  })
  return toDailyCbr(r, d.location)
}

// ── Counter clears / EOD upload tracker ────────────────────────────────
type ApiCounter = { atmId: string; make?: string; clearedAt: string; eodAt?: string; byName?: string; by?: string }

/** ISO instant → 'yyyy-mm-ddTHH:mm' in IST (the frontend's local datetime convention). */
export const toIstLocal = (v?: string) => {
  if (!v) return ''
  const t = Date.parse(v)
  if (Number.isNaN(t)) return v
  return new Date(t + 330 * 60_000).toISOString().slice(0, 16)
}

/** Latest clear per ATM (the endpoint returns the clear history, newest first). */
export async function listCounters(): Promise<CounterClear[]> {
  // ?latest=true → one row per ATM (its latest clear); the dedup below stays as a guard.
  const r = await get<{ items: ApiCounter[] }>(isFranchiseeSession() ? '/my/cbr/daily/counters' : '/cbr/daily/counters', { latest: true })
  const seen = new Map<string, CounterClear>()
  for (const c of r.items ?? [])
    if (!seen.has(c.atmId)) seen.set(c.atmId, { atmId: c.atmId, eodAt: toIstLocal(c.eodAt), make: c.make ?? '—', lastClear: toIstLocal(c.clearedAt), by: c.byName ?? c.by })
  return [...seen.values()]
}

export async function recordCounterClearApi(atmId: string, clearedLocal: string, eodLocal?: string): Promise<CounterClear> {
  const withTz = (s: string) => (s.length === 16 ? `${s}:00+05:30` : s)
  const c = await post<ApiCounter>(isFranchiseeSession() ? '/my/cbr/daily/counters' : '/cbr/daily/counters', { atmId, clearedAt: withTz(clearedLocal), eodAt: eodLocal ? withTz(eodLocal) : undefined })
  return { atmId: c.atmId, eodAt: toIstLocal(c.eodAt), make: c.make ?? '—', lastClear: toIstLocal(c.clearedAt), by: c.byName ?? c.by }
}

type ApiEodSummary = { dates: string[]; items: { siteId: string; atmId: string; days: { date: string; uploaded: boolean; by?: string; at?: string }[] }[] }
export async function eodSummaryApi(): Promise<ApiEodSummary> {
  return get<ApiEodSummary>(isFranchiseeSession() ? '/my/cbr/daily/eod-summary' : '/cbr/daily/eod-summary')
}

/** Upload one supporting document (POST /files) → a CashDoc whose id is the backend fileId. */
export async function uploadCashDoc(file: File, purpose: string, entity?: 'CbrRecord' | 'CashLoadingRecord', ref?: string): Promise<CashDoc> {
  const f = (await uploadFile(file, { purpose, entity, ref })) as { fileId: string; name?: string; originalName?: string; size: number; createdAt?: string; uploadedByName?: string }
  return { id: f.fileId, name: f.originalName ?? f.name ?? file.name, size: f.size ?? file.size, at: f.createdAt ?? new Date().toISOString(), by: f.uploadedByName ?? '' }
}
