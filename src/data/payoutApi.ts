// Payout Management ↔ backend (/payout/**, /forecast/**) when VITE_API_URL is set.
// Mock mode (apiEnabled = false): nothing here runs; the seeded stores in ./payout stay the source of truth.
//
// Pattern: the payout pages keep their synchronous store-based actions (local validation + optimistic update).
// In API mode each action also "mirrors" to the backend; on success the affected stores are re-hydrated from
// the server (authoritative ids, statuses, totals), on failure the error is toasted and the re-hydration
// reverts the optimistic change.
import { ApiError, apiEnabled, del, get, patch, post, put } from '@/lib/api'
import { createLoader, fetchAll, toastError, useLoaders, type LoadState } from './opsApi'
import { toast } from '@/components/ui/Toast'
import {
  accountStore, businessStore, financeRulesStore, payoutAuditStore, payoutStore, planMappingStore, planStore, tlStore,
  type AlfRow, type BeneficiaryAccount, type BmCategory, type BmExpense, type BmPayout, type BmSite, type ExpenseStatus, type FinanceRules,
  type ForecastRow, type FranchiseCategory, type PayoutAudit, type PayoutBatch, type PayoutLine, type PayoutPlan, type PlanMapping, type TlRule, type TlShare,
} from './payout'
import { extStore, type FileMeta, type MonthlyExt, type Release } from '@/pages/payout/monthly/lib'
import { tlMetaStore, tlShareMetaStore, type TlMeta, type TlShareMeta } from '@/pages/payout/accounts/model'
import { bmLocal, type MakerMeta } from '@/pages/payout/business/bmStore'

export { apiEnabled }

// ── backend shapes (only the fields we read) ──────────────────────────────
type Trail = { at: string; by?: string; byName?: string; action?: string; note?: string; text?: string; detail?: string }
type Page<T> = { items: T[] }
type BPlan = Omit<PayoutPlan, 'createdBy' | 'approvedBy' | 'history'> & { createdBy?: string; createdByName?: string; submittedBy?: string; approvedByName?: string; history?: Trail[]; incentiveEligibility?: string; incentiveRemarks?: string }
type BMapping = PlanMapping & { mappingId: string; makerName?: string; checkerName?: string; source?: string; rule?: string; remarks?: string; createdAt?: string; decidedAt?: string }
type BAccount = Omit<BeneficiaryAccount, 'id' | 'history'> & { accountId: string; makerName?: string; checkerName?: string; documentFileId?: string; history?: Trail[] }
type BTlRule = TlRule & { ruleId: string; maker?: string; makerName?: string; checker?: string; checkerName?: string; replaces?: string; remarks?: string; history?: Trail[] }
type BTlShare = TlShare & { shareId: string; batchId: string; basis: string; sites: { atmId: string; eligible: number }[]; makerName?: string; maker?: string; checkerName?: string; history?: Trail[] }
type BCategory = (BmCategory | FranchiseCategory) & { vertical: 'Franchise Model' | 'Business Model'; createdBy?: string; createdAt?: string }
type BBmSite = Omit<BmSite, 'mf' | 'superMf' | 'agreement'> & { mfId?: string; mfName?: string; superMfId?: string; superMfName?: string; agreementFileId?: string; maker?: string; makerName?: string; checker?: string; checkerName?: string; createdAt?: string; history?: Trail[] }
type BBmPayout = Omit<BmPayout, 'id' | 'document'> & { payoutId: string; documentFileId?: string; createdBy?: string; createdAt?: string }
type BExpense = Omit<BmExpense, 'id' | 'document'> & { expenseId: string; billFileId?: string; history?: Trail[] }
type BForecast = { forecastId: string; kind: 'BM' | 'FFM'; date: string; atmId: string; state?: string; city?: string; bank?: string; nodalBranch?: string; craFeasibility?: string; morningBalancePaise: number; dispensedPaise: number; todaysIndentPaise: number; requiredIndentPaise: number; reason?: string; status: ForecastRow['status']; makerName?: string; checkerName?: string; createdAt?: string; log?: Trail[] }
type BAlfFc = { alfFcId: string; atmId: string; type: AlfRow['type']; start: string; reversal: string; amountPaise: number; purpose: string; status: AlfRow['status']; makerName?: string; approverName?: string; checkerName?: string; createdAt?: string; log?: Trail[] }
type BBatch = Omit<PayoutBatch, 'id' | 'maker' | 'checker' | 'gst'> & {
  batchId: string; maker?: string; makerName?: string; submittedBy?: string; checkerName?: string; rejectReason?: string; siteCategory?: string; holdFrom?: PayoutBatch['status']; adjustments?: number
  file?: { fileName: string; fileType?: string; sizeBytes?: number; rows?: number; accepted?: number; issues?: { row: number; atmId: string; kind: string; detail: string }[]; uploadedAt?: string; uploadedBy?: string }
  releases?: { releaseId: string; paymentMode: string; debitAccount: string; valueDate: string; releasedAt: string }[]
  resolutions?: { atmId: string; accepted: 'Auto' | 'Manual' | 'File-Based' | 'Custom'; amount: number | null; reason: string; by: string; at: string }[]
  trail?: Trail[]
}
type BLine = Omit<PayoutLine, 'id' | 'cashLiveDate' | 'mfCode'> & {
  lineId: string; flags?: string[]; fileAccountNo?: string; row?: number
  adjustments?: {
    adjId: string; kind: 'Adjustment' | 'Reversal'; before: number; after: number; delta: number; reason: string; byName?: string; by: string; at: string
    status?: 'Pending' | 'Approved' | 'Rejected'; decidedByName?: string; decidedAt?: string; decisionRemark?: string
  }[]
  pay?: Release['pay']; utrStatus?: Release['utrStatus']
  holdReason?: string; failReason?: string; failSource?: Release['failSource']; failMarkedBy?: string
  manualHold?: { reason?: string; by?: string; byName?: string; at?: string } | null
}
type BAudit = { _id: string; at: string; actor?: { name?: string }; entity: string; ref?: string; action: string; detail?: string; before?: unknown; after?: unknown }

// ── helpers ───────────────────────────────────────────────────────────────
/** 403 on an optional section (e.g. Forecasting ops right) → empty instead of an error toast. */
const soft = <T,>(p: Promise<T>, empty: T) => p.catch((e) => (e instanceof ApiError && e.status === 403 ? empty : Promise.reject(e)))
const nm = (name?: string, id?: string) => name || id || '—'
const hist = (t?: Trail[]) => (t ?? []).map((h) => ({ at: String(h.at), by: nm(h.byName, h.by), action: h.action ?? h.text ?? '', detail: h.note ?? h.detail }))
const pRate = (r: number) => Math.round(r * 100) // ₹ decimal per txn → integer paise
const rRate = (p: number) => (Number(p) || 0) / 100 // integer paise → ₹ decimal

// ── adapters: backend → frontend ──────────────────────────────────────────
export function planFromApi(p: BPlan): PayoutPlan & { submittedBy?: string; incentiveEligibility?: string; incentiveRemarks?: string } {
  const submitted = [...(p.history ?? [])].reverse().find((h) => /submit/i.test(h.action ?? ''))
  return {
    ...p,
    txnSlabs: p.txnSlabs.map((s) => ({ from: s.from, to: s.to, fr: { cash: rRate(s.fr.cash), nonCash: rRate(s.fr.nonCash) }, mf: { cash: rRate(s.mf.cash), nonCash: rRate(s.mf.nonCash) }, tl: { cash: rRate(s.tl.cash), nonCash: rRate(s.tl.nonCash) } })),
    depositSlabs: p.depositSlabs.map((s) => ({ from: s.from, to: s.to, fr: rRate(s.fr), mf: rRate(s.mf), tl: rRate(s.tl) })),
    createdBy: nm(p.createdByName, p.createdBy),
    approvedBy: p.approvedByName,
    submittedBy: p.status === 'Pending Approval' ? nm(submitted?.byName, p.createdByName) : undefined,
    history: (p.history ?? []).map((h) => ({ version: p.version, at: String(h.at), by: nm(h.byName, h.by), note: [h.action, h.note].filter(Boolean).join(': ') })),
  }
}
/** Frontend plan → wizard payload (rates ₹ → paise). */
export function planToApi(p: PayoutPlan & { incentiveEligibility?: string; incentiveRemarks?: string }) {
  return {
    name: p.name.trim(), vertical: p.vertical, siteCategory: p.siteCategory, planType: p.planType, modelType: p.modelType, applicableFor: p.applicableFor, eligibility: p.eligibility,
    investment: p.investment, planCategory: p.planCategory,
    txnSlabs: p.txnSlabs.map((s) => ({ from: s.from, to: s.to, fr: { cash: pRate(s.fr.cash), nonCash: pRate(s.fr.nonCash) }, mf: { cash: pRate(s.mf.cash), nonCash: pRate(s.mf.nonCash) }, tl: { cash: pRate(s.tl.cash), nonCash: pRate(s.tl.nonCash) } })),
    depositSlabs: p.depositSlabs.map((s) => ({ from: s.from, to: s.to, fr: pRate(s.fr), mf: pRate(s.mf), tl: pRate(s.tl) })),
    incentives: p.incentives, incentiveEligibility: p.incentiveEligibility || undefined, incentiveRemarks: p.incentiveRemarks || undefined,
    gstApplicable: p.gstApplicable, rentalMg: p.rentalMg, guaranteeType: p.guaranteeType, noFixedMonthlyGuarantee: p.noFixedMonthlyGuarantee,
    fixedFee: p.fixedFee, tdsPct: p.tdsPct, effectiveFrom: p.effectiveFrom, effectiveTo: p.effectiveTo,
  }
}
const mappingFromApi = (m: BMapping): PlanMapping => ({ ...m, id: m.mappingId, maker: nm(m.makerName, m.maker), checker: m.checkerName ?? m.checker })
const accountFromApi = (a: BAccount): BeneficiaryAccount => ({
  ...a, id: a.accountId, maker: nm(a.makerName, a.maker), checker: a.checkerName ?? a.checker, document: a.documentFileId ? 'Document on file' : undefined, history: hist(a.history),
})
const forecastFromApi = (f: BForecast): ForecastRow => ({
  id: f.forecastId, date: f.date, kind: f.kind, atmId: f.atmId, state: f.state ?? '—', city: f.city ?? '—', bank: f.bank ?? '—', nodalBranch: f.nodalBranch ?? '—', craFeasibility: f.craFeasibility ?? '',
  morningBalance: f.morningBalancePaise, dispensed: f.dispensedPaise, todaysIndent: f.todaysIndentPaise, requiredIndent: f.requiredIndentPaise, reason: f.reason ?? '', status: f.status,
})
const alfFromApi = (a: BAlfFc): AlfRow => ({ id: a.alfFcId, atmId: a.atmId, type: a.type, start: a.start, reversal: a.reversal, amount: a.amountPaise, purpose: a.purpose, status: a.status, approvedBy: a.approverName ?? a.checkerName })
const expenseFromApi = (e: BExpense): BmExpense => ({ ...e, id: e.expenseId, document: e.billFileId ? 'Bill on file' : undefined })
const batchFromApi = (b: BBatch): PayoutBatch => {
  const rel = b.releases?.[b.releases.length - 1]
  return {
    id: b.batchId, name: b.name, fy: b.fy, month: b.month, type: b.type, vertical: b.vertical, fileName: b.file?.fileName, fileType: b.file?.fileType,
    fileSizeKb: b.file?.sizeBytes ? Math.round(b.file.sizeBytes / 1024) : undefined, records: b.records, gross: b.gross, gst: 0, tds: b.tds, net: b.net,
    paymentDate: rel?.valueDate, paymentMode: rel?.paymentMode, bankAccount: rel?.debitAccount, status: b.status, maker: nm(b.makerName, b.maker), checker: b.checkerName,
    createdAt: String(b.createdAt), remarks: b.rejectReason,
  }
}
const lineFromApi = (l: BLine): PayoutLine => ({
  ...l, id: l.lineId, cashLiveDate: '', mfCode: '', pan: l.pan ?? '',
  creditStatus: l.utrStatus === 'Reconciled' ? 'Credited' : l.pay === 'Failed' ? 'Failed' : l.pay === 'On Hold' ? 'On Hold' : l.pay === 'Released' ? 'Pending' : undefined,
})

// ── loaders ───────────────────────────────────────────────────────────────
export const rulesLoader = createLoader('finance rules', async () => {
  const r = await get<{ rules: FinanceRules }>('/payout/rules')
  financeRulesStore.set({ ...financeRulesStore.get(), ...r.rules })
})

export const plansLoader = createLoader('payout plans', async () => {
  const [plans, maps] = await Promise.all([fetchAll<BPlan>('/payout/plans', { allVersions: 'true' }), fetchAll<BMapping>('/payout/plan-mappings')])
  planStore.set(plans.map(planFromApi))
  planMappingStore.set(maps.map(mappingFromApi))
})

export const accountsLoader = createLoader('beneficiary accounts', async () => {
  accountStore.set((await fetchAll<BAccount>('/payout/beneficiaries')).map(accountFromApi))
})

export const tlLoader = createLoader('Team Leader sharing', async () => {
  const [rules, shares] = await Promise.all([fetchAll<BTlRule>('/payout/tl/rules'), fetchAll<BTlShare>('/payout/tl/shares')])
  tlStore.set({
    rules: rules.map((r) => ({ id: r.ruleId, tlId: r.tlId, tlName: r.tlName, reportingMf: r.reportingMf, siteAtmIds: r.siteAtmIds, type: r.type, value: r.value, effectiveFrom: r.effectiveFrom, effectiveTo: r.effectiveTo ?? null, status: r.status })),
    shares: shares.map((s) => ({ id: s.shareId, month: s.month, tlId: s.tlId, tlName: s.tlName, eligibleProfit: s.eligibleProfit, share: s.share, approval: s.approval, payment: s.payment, utr: s.utr })),
  })
  const rm: Record<string, TlMeta> = {}
  rules.forEach((r) => (rm[r.ruleId] = { maker: nm(r.makerName, r.maker), checker: r.checkerName, replaces: r.replaces, remarks: r.remarks, history: hist(r.history) }))
  tlMetaStore.set(rm)
  const sm: Record<string, TlShareMeta> = {}
  shares.forEach((s) => (sm[s.shareId] = { maker: nm(s.makerName, s.maker), checker: s.checkerName, basis: s.basis, batchId: s.batchId, sites: s.sites ?? [], history: hist(s.history) }))
  tlShareMetaStore.set(sm)
})

const meta = (maker: string, createdAt?: string, checker?: string, h?: Trail[]): MakerMeta => ({ maker, createdAt: createdAt ?? new Date().toISOString(), checker, history: hist(h).reverse() })
export const businessLoader = createLoader('Business Model data', async () => {
  const [cats, sites, pays, exps] = await Promise.all([
    get<Page<BCategory>>('/payout/bm/categories'),
    fetchAll<BBmSite>('/payout/bm/sites'),
    fetchAll<BBmPayout>('/payout/bm/payouts'),
    fetchAll<BExpense>('/payout/bm/expenses'),
  ])
  businessStore.set((s) => ({
    ...s,
    franchiseCategories: cats.items.filter((c) => c.vertical === 'Franchise Model').map((c) => ({ code: c.code, name: c.name, description: c.description, status: c.status })),
    bmCategories: cats.items.filter((c) => c.vertical === 'Business Model') as BmCategory[],
    bmSites: sites.map((b) => ({ ...b, mf: nm(b.mfName, b.mfId), superMf: nm(b.superMfName, b.superMfId), agreement: b.agreementFileId ? 'Agreement on file' : undefined })),
    bmPayouts: pays.map((p) => ({ ...p, id: p.payoutId, document: p.documentFileId ? 'Document on file' : undefined })),
    expenses: exps.map(expenseFromApi),
  }))
  bmLocal.set((l) => ({
    ...l,
    siteMeta: Object.fromEntries(sites.map((b) => [b.code, meta(nm(b.makerName, b.maker), b.createdAt, b.checkerName ?? b.checker, b.history)])),
    categoryMeta: Object.fromEntries(cats.items.map((c) => [c.code, meta(c.createdBy ?? 'System', c.createdAt)])),
    payoutMeta: Object.fromEntries(pays.map((p) => [p.payoutId, meta(p.createdBy ?? 'System', p.createdAt)])),
  }))
})

export const forecastLoader = createLoader('cash / ALF forecasts', async () => {
  const [cashItems, alfItems] = await Promise.all([soft(fetchAll<BForecast>('/forecast/cash'), []), soft(fetchAll<BAlfFc>('/forecast/alf'), [])])
  const cash = { items: cashItems }
  const alf = { items: alfItems }
  businessStore.set((s) => ({ ...s, forecasts: cash.items.map(forecastFromApi), alf: alf.items.map(alfFromApi) }))
  bmLocal.set((l) => ({
    ...l,
    forecastMeta: Object.fromEntries(cash.items.map((f) => [f.forecastId, meta(nm(f.makerName), f.createdAt, f.checkerName, f.log)])),
    alfMeta: Object.fromEntries(alf.items.map((a) => [a.alfFcId, meta(nm(a.makerName), a.createdAt, a.checkerName ?? a.approverName, a.log)])),
  }))
})

export const monthlyLoader = createLoader('monthly payout batches', async () => {
  const list = await fetchAll<BBatch>('/payout/batches')
  const details = await Promise.all(list.map((b) => get<BBatch>(`/payout/batches/${encodeURIComponent(b.batchId)}`).catch(() => b)))
  const linesPer = await Promise.all(list.map((b) => fetchAll<BLine>(`/payout/batches/${encodeURIComponent(b.batchId)}/lines`)))
  const lines = linesPer.flat()
  payoutStore.set({ batches: details.map(batchFromApi), lines: lines.map(lineFromApi) })
  const ext: MonthlyExt = { files: {}, trail: [], adjustments: [], resolutions: {}, release: {}, lineMeta: {}, meta: {} }
  details.forEach((b) => {
    if (b.file)
      ext.files[b.batchId] = {
        name: b.file.fileName, type: b.file.fileType ?? '', sizeKb: Math.round((b.file.sizeBytes ?? 0) / 1024), uploadedAt: String(b.file.uploadedAt ?? b.createdAt), uploadedBy: b.file.uploadedBy ?? '—',
        status: 'Extracted', kind: 'File Upload', issues: (b.file.issues ?? []).map((i) => ({ row: i.row, atmId: i.atmId, kind: (i.kind === 'Invalid Value' ? 'Data Pending' : i.kind) as FileMeta['issues'][number]['kind'], detail: i.detail })),
      }
    ext.meta[b.batchId] = { siteCategory: b.siteCategory, holdFrom: b.holdFrom, makerId: b.maker, submittedBy: b.submittedBy }
    ;(b.trail ?? []).forEach((t, i) => ext.trail.push({ id: `${b.batchId}-T${i}`, batchId: b.batchId, at: String(t.at), by: nm(t.byName, t.by), action: t.action ?? '', note: t.note }))
    ;(b.resolutions ?? []).forEach((r) => (ext.resolutions[`${b.batchId}|${r.atmId.toUpperCase()}`] = { batchId: b.batchId, atmId: r.atmId, status: 'Variance Found', accepted: r.accepted, amount: r.amount, reason: r.reason, by: r.by, at: String(r.at) }))
  })
  lines.forEach((l) => {
    ext.release[l.lineId] = { pay: l.pay ?? 'Ready', utrStatus: l.utrStatus ?? 'Pending', utr: l.utr, paidDate: l.paidDate, holdReason: l.holdReason, failReason: l.failReason, failSource: l.failSource, failMarkedBy: l.failMarkedBy, manualHold: !!l.manualHold, holdBy: l.manualHold?.by }
    ext.lineMeta[l.lineId] = { flags: (l.flags ?? []) as MonthlyExt['lineMeta'][string]['flags'], accountNo: l.fileAccountNo, row: l.row }
    ;(l.adjustments ?? []).forEach((a) =>
      ext.adjustments.push({
        id: a.adjId, batchId: l.batchId, lineId: l.lineId, atmId: l.atmId, kind: a.kind, before: a.before, after: a.after, delta: a.delta, reason: a.reason, by: nm(a.byName, a.by), byId: a.by, at: String(a.at),
        // entries created before maker-checker carry no status — they were applied directly
        status: a.status ?? 'Approved', decidedBy: a.decidedByName, decidedAt: a.decidedAt ? String(a.decidedAt) : undefined, remark: a.decisionRemark,
      }),
    )
  })
  ext.trail.sort((a, b) => b.at.localeCompare(a.at))
  extStore.set(ext)
})

export const auditLoader = createLoader('payout audit', async () => {
  const r = await soft(get<Page<BAudit>>('/payout/audit', { limit: 200 }), { items: [] })
  payoutAuditStore.set(
    r.items.map((a): PayoutAudit => ({
      id: a._id, at: String(a.at), by: a.actor?.name ?? '—', area: a.entity.replace(/^Payout/, '') || 'Payout', ref: a.ref ?? '', action: a.action,
      before: a.before === undefined ? undefined : short(a.before), after: a.after === undefined ? a.detail : short(a.after),
    })),
  )
})
const short = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v)?.slice(0, 200))

const ALL = [rulesLoader, plansLoader, accountsLoader, tlLoader, businessLoader, forecastLoader, monthlyLoader, auditLoader]
/** Hydrate every payout store (mounted by PayoutShell; a no-op in mock mode). */
export const usePayoutData = (): LoadState => useLoaders(...ALL)

// ── mirror (optimistic local change → backend → re-hydrate) ───────────────
type Reloadable = { reload(): Promise<void> }
export function mirror(label: string, call: () => Promise<unknown>, reload: Reloadable[]): Promise<boolean> {
  if (!apiEnabled) return Promise.resolve(true)
  return call()
    .then(
      () => true,
      (e) => {
        toastError(e, label)
        return false
      },
    )
    .then(async (ok) => {
      await Promise.all([...reload, auditLoader].map((l) => l.reload()))
      return ok
    })
}
const enc = encodeURIComponent

/**
 * API mode: an attachment picked with the shared FileDrop is uploaded right away (value.fileId / uploading / error).
 * Returns a reason to block the save, or null when it is ready (or absent and optional).
 */
export function fileBlock(v: { name?: string; fileId?: string; uploading?: boolean; error?: string } | null | undefined, required = true): string | null {
  if (!apiEnabled) return null
  if (!v) return required ? 'Attach the document first.' : null
  if (v.uploading) return `${v.name ?? 'The file'} is still uploading — wait a moment.`
  if (v.error) return `${v.name ?? 'The file'} could not be uploaded: ${v.error}`
  if (!v.fileId) return required ? `${v.name ?? 'The file'} is not on the server — pick it again.` : null
  return null
}

// ── rules ──
export const apiPatchRules = (changes: Partial<FinanceRules>) => mirror('Finance rule not saved', () => patch('/payout/rules', changes), [rulesLoader])

// ── plans ──
type PlanLike = PayoutPlan & { incentiveEligibility?: string; incentiveRemarks?: string; reactivation?: boolean }
const lastNote = (p: PayoutPlan) => p.history[p.history.length - 1]?.note?.replace(/^[^:]*:\s*/, '') ?? ''
/** Translate an upsert of a plan version into the matching backend call(s). */
export function apiUpsertPlan(prev: PayoutPlan | undefined, next: PlanLike) {
  const v = `/payout/plans/${enc(next.code)}/v/${next.version}`
  return mirror('Plan not saved', async () => {
    if (!prev) {
      const exists = planStore.get().some((x) => x.code === next.code && x.version !== next.version)
      const created = exists ? await post<BPlan>(`/payout/plans/${enc(next.code)}/versions`, planToApi(next)) : await post<BPlan>('/payout/plans', { ...planToApi(next), code: /^PLN\d{6}$/.test(next.code) ? next.code : undefined })
      if (next.status === 'Pending Approval') await post(`/payout/plans/${enc(created.code)}/v/${created.version}/submit`)
      return
    }
    if (prev.status === 'Draft' && (next.status === 'Draft' || next.status === 'Pending Approval')) {
      await patch(v, planToApi(next))
      if (next.status === 'Pending Approval') await post(`${v}/submit`)
    } else if (prev.status === 'Pending Approval' && next.status !== 'Pending Approval' && next.status !== 'Active') await post(`${v}/reject`, { reason: lastNote(next) || 'Rejected' })
    else if (prev.status === 'Active' && next.status === 'Inactive') await post(`${v}/deactivate`, { reason: lastNote(next) || 'Deactivated', effectiveTo: next.effectiveTo ?? undefined })
    else if (next.reactivation) throw new Error('Re-activation of an Inactive plan is not supported by the backend yet — create a new version instead.')
    else if (prev.status === next.status) await patch(v, planToApi(next))
  }, [plansLoader])
}
export const apiApprovePlan = (p: PayoutPlan) => mirror('Plan not approved', () => post(`/payout/plans/${enc(p.code)}/v/${p.version}/approve`, {}), [plansLoader])
export const apiDeletePlan = (p: PayoutPlan) => mirror('Draft not deleted', () => del(`/payout/plans/${enc(p.code)}/v/${p.version}`), [plansLoader])

// ── plan mappings ──
export type MapCreate = { vertical: string; siteCategory: string; planCode: string; beneficiaryType: string; effectiveFrom: string; effectiveTo: string | null; atmIds: string[]; source: string; rule?: string; remarks?: string }
export function apiCreateMappings(body: MapCreate) {
  return mirror('Mapping not saved', async () => {
    const r = await post<{ created: unknown[]; skipped: { atmId: string; reason: string }[] }>('/payout/plan-mappings', body)
    if (r.skipped?.length && !r.created?.length) throw new Error(`Server skipped every site: ${r.skipped[0].reason}`)
  }, [plansLoader])
}
export const apiDecideMapping = (id: string, approve: boolean, remarks?: string) =>
  mirror(approve ? 'Mapping not approved' : 'Mapping not rejected', () => post(`/payout/plan-mappings/${enc(id)}/${approve ? 'approve' : 'reject'}`, approve ? { remarks } : { reason: remarks || 'Rejected' }), [plansLoader])

// ── beneficiary accounts ──
export function apiCreateAccount(a: BeneficiaryAccount, documentFileId?: string) {
  return mirror('Account not saved', () =>
    post('/payout/beneficiaries', {
      beneficiaryType: a.beneficiaryType, beneficiaryId: a.beneficiaryId, name: a.name, atmId: a.atmId || undefined, pan: a.pan, bank: a.bank, holder: a.holder,
      accountNo: a.accountNo, ifsc: a.ifsc, accountType: a.accountType, documentFileId, effectiveFrom: a.effectiveFrom,
    }), [accountsLoader])
}
export const apiDecideAccount = (id: string, approve: boolean, note: string, kycVerified = true) =>
  mirror(approve ? 'Account not approved' : 'Account not rejected', () => post(`/payout/beneficiaries/${enc(id)}/${approve ? 'approve' : 'reject'}`, approve ? { note: note || undefined, kycVerified } : { reason: note }), [accountsLoader])

// ── Team Leader ──
export function apiSaveTlRule(existingId: string | null, r: Pick<TlRule, 'tlId' | 'siteAtmIds' | 'type' | 'value' | 'effectiveFrom' | 'effectiveTo' | 'reportingMf'>) {
  const body = { tlId: r.tlId, siteAtmIds: r.siteAtmIds, type: r.type, value: r.value, effectiveFrom: r.effectiveFrom, effectiveTo: r.effectiveTo || null, reportingMf: r.reportingMf && r.reportingMf !== '—' ? r.reportingMf.slice(0, 120) : undefined }
  return mirror('TL rule not saved', () => (existingId && !existingId.startsWith('TLR-NEW') && tlStore.get().rules.some((x) => x.id === existingId) ? patch(`/payout/tl/rules/${enc(existingId)}`, body) : post('/payout/tl/rules', body)), [tlLoader])
}
export const apiDecideTlRule = (id: string, approve: boolean, note: string) =>
  mirror('TL rule decision failed', () => post(`/payout/tl/rules/${enc(id)}/${approve ? 'approve' : 'reject'}`, approve ? { note: note || undefined } : { reason: note }), [tlLoader])
export const apiCalculateTl = (month: string, batchId?: string) => mirror('TL calculation failed', () => post('/payout/tl/calculation', { month, batchId }), [tlLoader])
export const apiDecideTlShare = (id: string, approve: boolean, note: string) =>
  mirror('TL share decision failed', () => post(`/payout/tl/shares/${enc(id)}/${approve ? 'approve' : 'reject'}`, approve ? { note: note || undefined } : { reason: note }), [tlLoader])
export const apiTlPayment = (id: string, payment: TlShare['payment'], utr: string, remarks: string) =>
  mirror('TL payment not saved', () => post(`/payout/tl/shares/${enc(id)}/payment`, { payment, utr: payment === 'Paid' ? utr : undefined, remarks: remarks || undefined }), [tlLoader])

// ── Business Model ──
export function apiSaveCategory(isNew: boolean, c: BmCategory) {
  const body = { name: c.name, businessModel: c.businessModel, description: c.description, applicablePayout: c.applicablePayout, expenseRules: c.expenseRules, partnerShareRule: c.partnerShareRule, effectiveFrom: c.effectiveFrom, status: c.status }
  return mirror('Category not saved', () => (isNew ? post('/payout/bm/categories', { ...body, code: c.code, vertical: 'Business Model' }) : patch(`/payout/bm/categories/${enc(c.code)}`, body)), [businessLoader])
}
export const apiCategoryStatus = (code: string, status: 'Active' | 'Inactive') => mirror('Category not updated', () => patch(`/payout/bm/categories/${enc(code)}`, { status }), [businessLoader])
export const apiCreateBmSite = (b: { atmId: string; category: string; mfId?: string; superMfId?: string; effectiveFrom: string; effectiveTo?: string | null; agreementFileId?: string }) =>
  mirror('BM site not saved', () => post('/payout/bm/sites', b), [businessLoader])
export const apiDecideBmSite = (code: string, approve: boolean, note: string) =>
  mirror('BM site decision failed', () => post(`/payout/bm/sites/${enc(code)}/${approve ? 'approve' : 'reject'}`, approve ? { note: note || undefined } : { reason: note || 'Rejected' }), [businessLoader])
export const apiBmSiteStatus = (code: string, status: 'Active' | 'Inactive', reason: string) => mirror('BM site status not saved', () => post(`/payout/bm/sites/${enc(code)}/status`, { status, reason: reason || `Set ${status}` }), [businessLoader])
export const apiRecordBmPayout = (p: BmPayout, documentFileId?: string) =>
  mirror('BM payout not saved', () => put('/payout/bm/payouts', { month: p.month, atmId: p.atmId, gross: p.gross, rentDeductedAtSource: p.rentDeductedAtSource, otherSourceDeductions: p.otherSourceDeductions, reference: p.reference, date: p.date, documentFileId }), [businessLoader])
export function apiCreateExpenses(list: BmExpense[], billFileId?: string) {
  return mirror('Expense not saved', async () => {
    for (const e of list) await post('/payout/bm/expenses', { month: e.month, atmId: e.atmId, head: e.head, amount: e.amount, billDate: e.billDate, dueDate: e.dueDate || undefined, vendor: e.vendor || undefined, invoiceNo: e.invoiceNo || undefined, billFileId, remarks: e.remarks || undefined })
  }, [businessLoader])
}
export function apiDecideExpenses(ids: string[], to: ExpenseStatus, note?: string) {
  return mirror('Expense decision failed', async () => {
    for (const id of ids) await post(`/payout/bm/expenses/${enc(id)}/${to === 'Rejected' ? 'reject' : 'approve'}`, to === 'Rejected' ? { reason: note || 'Rejected' } : { note })
  }, [businessLoader])
}
export const apiPayExpense = (id: string, amount: number, paymentDate: string, paymentMode: string, note?: string) =>
  mirror('Payment not saved', () => post(`/payout/bm/expenses/${enc(id)}/payments`, { amount, paymentDate, paymentMode: ['Bank Transfer', 'NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'Cash'].includes(paymentMode) ? paymentMode : 'Bank Transfer', note }), [businessLoader])

// ── forecasts ──
export function apiSaveForecast(id: string | null, f: Omit<ForecastRow, 'id' | 'status'>) {
  const body = { kind: f.kind, date: f.date, atmId: f.atmId, craFeasibility: f.craFeasibility, morningBalancePaise: f.morningBalance, dispensedPaise: f.dispensed, todaysIndentPaise: f.todaysIndent, requiredIndentPaise: f.requiredIndent, reason: f.reason || undefined }
  return mirror('Forecast not saved', () => (id ? patch(`/forecast/cash/${enc(id)}`, body) : post('/forecast/cash', body)), [forecastLoader])
}
const verb = (to: string) => ({ Submitted: 'submit', Approved: 'approve', Rejected: 'reject', Reversed: 'reverse' })[to] ?? 'submit'
export const apiForecastStatus = (ids: string[], to: ForecastRow['status']) => mirror(`Forecasts not ${to.toLowerCase()}`, () => post(`/forecast/cash/${verb(to)}`, { ids }), [forecastLoader])
export function apiSaveAlf(id: string | null, a: Omit<AlfRow, 'id' | 'status' | 'approvedBy'>) {
  const body = { atmId: a.atmId, type: a.type, start: a.start, reversal: a.reversal, amountPaise: a.amount, purpose: a.purpose }
  return mirror('ALF forecast not saved', () => (id ? patch(`/forecast/alf/${enc(id)}`, body) : post('/forecast/alf', body)), [forecastLoader])
}
export const apiDeleteAlf = (id: string) => mirror('ALF forecast not deleted', () => del(`/forecast/alf/${enc(id)}`), [forecastLoader])
export const apiAlfStatus = (ids: string[], to: AlfRow['status']) => mirror(`ALF forecasts not ${to.toLowerCase()}`, () => post(`/forecast/alf/${verb(to)}`, { ids }), [forecastLoader])

// ── monthly batches ──
const B = (id: string) => `/payout/batches/${enc(id)}`
export function apiCreateBatch(b: { name: string; month: string; type: PayoutBatch['type']; vertical: PayoutBatch['vertical']; siteCategory?: string }, then?: (batchId: string) => Promise<unknown>) {
  return mirror('Batch not saved', async () => {
    const created = await post<BBatch>('/payout/batches', { ...b, name: b.name.replace(/[^A-Za-z0-9_-]/g, '_') })
    if (then) await then(created.batchId)
  }, [monthlyLoader])
}
/** CSV text or rows (rupee amounts, template headers) for a File-Based batch. */
export const uploadBatchFile = (batchId: string, fileName: string, data: { csv?: string; rows?: Record<string, string | number>[] }, fileType?: string) => post(`${B(batchId)}/upload`, { fileName, fileType, ...data })
export const upsertManualLine = (batchId: string, l: Pick<PayoutLine, 'atmId' | 'txn' | 'ded' | 'taxPct' | 'remarks'>) => put(`${B(batchId)}/lines`, { atmId: l.atmId, txn: l.txn, ded: l.ded, taxPct: l.taxPct, remarks: l.remarks || undefined })
export const apiDeleteLine = (batchId: string, lineId: string) => mirror('Line not deleted', () => del(`${B(batchId)}/lines/${enc(lineId)}`), [monthlyLoader])
export const apiRecalculate = (batchId: string) => mirror('Recalculation failed', () => post(`${B(batchId)}/recalculate`), [monthlyLoader])
export function apiBatchStatus(batchId: string, action: 'submit' | 'approve' | 'reject' | 'hold' | 'unhold', note?: string) {
  const body = action === 'reject' || action === 'hold' ? { reason: note || action } : action === 'approve' ? { note } : {}
  return mirror(`Batch ${action} failed`, () => post(`${B(batchId)}/${action}`, body), [monthlyLoader])
}
export const apiAdjust = (batchId: string, lineId: string, after: number, reason: string, kind: 'Adjustment' | 'Reversal') =>
  mirror('Adjustment not saved', () => post(`${B(batchId)}/lines/${enc(lineId)}/adjustments`, { after, reason: reason.length >= 5 ? reason : `${reason} (adj)`, kind }), [monthlyLoader])
export const apiResolve = (batchId: string, atmId: string, accepted: 'Auto' | 'Manual' | 'File-Based' | 'Custom', amount: number | null, reason: string) =>
  mirror('Resolution not saved', () => post(`${B(batchId)}/resolutions`, { atmId, accepted, amount: accepted === 'Custom' ? amount : undefined, reason }), [monthlyLoader])
/** Checker decision on a Pending adjustment — never the requester (`MAKER_CHECKER`); large deltas need SA / Admin (`ADMIN_APPROVAL_REQUIRED`). */
export const apiDecideAdjustment = (batchId: string, lineId: string, adjId: string, decision: 'Approved' | 'Rejected', remark?: string) =>
  mirror(`Adjustment not ${decision.toLowerCase()}`, () => post(`${B(batchId)}/lines/${enc(lineId)}/adjustments/${enc(adjId)}/decision`, { decision, ...(remark?.trim() ? { remark: remark.trim() } : {}) }), [monthlyLoader])
/**
 * Release: segregation of duties on the server — never by the batch maker / submitter, nor by a user who requested an
 * adjustment on a line being released (403 `MAKER_CHECKER`). The refusal is shown as-is ("Release refused: …").
 */
export async function apiRelease(batchId: string, paymentMode: string, debitAccount: string, valueDate?: string): Promise<boolean> {
  if (!apiEnabled) return true
  let ok = false
  try {
    const r = await post<{ count: number; held: number; totalPaise: number; providerRef?: string }>(`${B(batchId)}/release`, { paymentMode: ['NEFT', 'RTGS', 'IMPS'].includes(paymentMode) ? paymentMode : 'NEFT', debitAccount, valueDate })
    toast(`Released ${r.count} line(s) to the bank${r.held ? ` · ${r.held} held (account / negative net / pending adjustment / manual hold)` : ''}`, r.held ? 'info' : 'success')
    ok = true
  } catch (e) {
    const refused = e instanceof ApiError && (e.code === 'MAKER_CHECKER' || e.code === 'NOTHING_TO_RELEASE' || e.code === 'NOT_APPROVED')
    toastError(e, refused ? 'Release refused' : 'Release failed')
  }
  await Promise.all([monthlyLoader, auditLoader].map((l) => l.reload()))
  return ok
}
/**
 * Manual bank status (payout approver, e.g. from a bank statement): Credited needs a UTR (`INVALID_UTR`), Failed needs a
 * reason (`REASON_REQUIRED`), a credited line can never be marked Failed (`LINE_CREDITED`). A manual failure is not
 * re-released until a second user confirms it (`apiConfirmFailure`).
 */
export const apiBankStatus = (batchId: string, results: { ref: string; status: 'Credited' | 'Failed' | 'Pending'; utr?: string; reason?: string }[]) =>
  mirror('Bank status not saved', () => post(`${B(batchId)}/bank-status`, { results }), [monthlyLoader])
/** Second-user confirmation of a manually entered failure (≠ the user who entered it) → the line becomes re-releasable. */
export const apiConfirmFailure = (batchId: string, lineId: string, reason: string) =>
  mirror('Failure not confirmed', () => post(`${B(batchId)}/lines/${enc(lineId)}/failure/confirm`, { reason: reason.trim() }), [monthlyLoader])
/**
 * Line-level manual hold / unhold (before release). Hold = maker (Edit right, reason ≥ 3); unhold = checker (Approve right,
 * not the user who held it — the server answers 403 MAKER_CHECKER). Lines are posted one by one; the first backend error is
 * toasted (with the failure count) and the store is reloaded once. Resolves to the number of lines the server accepted.
 */
export async function apiLineHold(batchId: string, lineIds: string[], mode: 'hold' | 'unhold', text?: string): Promise<number> {
  if (!apiEnabled) return lineIds.length
  let ok = 0
  const errors: unknown[] = []
  for (const id of lineIds) {
    try {
      await post(`${B(batchId)}/lines/${enc(id)}/${mode}`, mode === 'hold' ? { reason: (text ?? '').trim() } : text?.trim() ? { note: text.trim() } : {})
      ok++
    } catch (e) {
      errors.push(e)
    }
  }
  if (errors.length) toastError(errors[0], `${mode === 'hold' ? 'Line hold' : 'Hold release'} failed for ${errors.length} of ${lineIds.length} line(s)`)
  await Promise.all([monthlyLoader, auditLoader].map((l) => l.reload()))
  return ok
}
export const apiBankSync = (batchId: string) => mirror('Bank status sync failed', () => post(`${B(batchId)}/bank-status/sync`), [monthlyLoader])

/** Server ids look like BAT-00012 / PL-0000061; locally generated ones (pid) are base-36 stamps. */
export const isServerId = (id: string | null | undefined) => !!id && /^[A-Z]+-\d+$/.test(id)
const DED_LABELS: Record<keyof PayoutLine['ded'], string> = {
  fixedFee: 'Fixed Fee / CRA Cost', negativeFixedFee: 'Negative Fixed Fee', iciciSr: 'ICICI SR Recovery', ntPenalty: 'NT Penalty', alf: 'ALF Charges',
  recovery: 'Recovery', waiver: 'Waiver', additionalRecovery: 'Additional Recovery', credit: 'Credit Amount',
}
/** Parsed file lines → upload rows with the template headers (amounts in rupees, as the backend expects). */
export function uploadRows(lines: Pick<PayoutLine, 'atmId' | 'txn' | 'ded' | 'taxPct' | 'pan' | 'remarks'>[], accountNos: (string | undefined)[] = []) {
  return lines.map((l, i) => {
    const row: Record<string, string | number> = { 'ATM ID': l.atmId, Cash: l.txn.cash, 'Non Cash': l.txn.nonCash, 'Post Cash': l.txn.postCash, 'Post Non Cash': l.txn.postNonCash, Deposit: l.txn.deposit, 'TDS/GST %': l.taxPct }
    ;(Object.keys(DED_LABELS) as (keyof PayoutLine['ded'])[]).forEach((k) => (row[DED_LABELS[k]] = ((l.ded?.[k] ?? 0) / 100).toFixed(2)))
    if (accountNos[i]) row['Acc No'] = accountNos[i]!
    if (l.pan) row.PAN = l.pan
    if (l.remarks) row.Remarks = l.remarks
    return row
  })
}
type NewBatch = { name: string; month: string; vertical: PayoutBatch['vertical']; siteCategory?: string }
/** File-Based batch: create (unless it already exists on the server) → upload rows → optionally submit. */
export function apiSaveFileBatch(existingId: string | null, b: NewBatch, fileName: string, fileType: string | undefined, rows: Record<string, string | number>[], submit: boolean) {
  return mirror('File payout not saved', async () => {
    const id = isServerId(existingId) ? existingId! : (await post<BBatch>('/payout/batches', { ...b, name: b.name.replace(/[^A-Za-z0-9_-]/g, '_'), type: 'File-Based Payout' })).batchId
    if (!rows.length) throw new Error('No rows could be read from the file (PDF extraction is not available on the server) — upload the Excel / CSV file.')
    await uploadBatchFile(id, fileName, { rows }, fileType)
    if (submit) await post(`${B(id)}/submit`)
  }, [monthlyLoader])
}
/** Manual batch: create (unless it exists) → upsert each line per ATM → optionally submit. */
export function apiSaveManualBatch(existingId: string | null, b: NewBatch, lines: Pick<PayoutLine, 'atmId' | 'txn' | 'ded' | 'taxPct' | 'remarks'>[], submit: boolean) {
  return mirror('Manual payout not saved', async () => {
    const id = isServerId(existingId) ? existingId! : (await post<BBatch>('/payout/batches', { ...b, name: b.name.replace(/[^A-Za-z0-9_-]/g, '_'), type: 'Manual Payout' })).batchId
    for (const l of lines) await upsertManualLine(id, l)
    if (submit) await post(`${B(id)}/submit`)
  }, [monthlyLoader])
}
