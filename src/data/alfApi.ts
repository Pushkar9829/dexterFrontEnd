// API adapters for the ALF register (backend /alf, franchise /my/alf). Only used when apiEnabled.
// Type-only import of the frontend ALF types keeps this module free of a runtime import cycle.
import { get, patch, post } from '@/lib/api'
import { errMsg, fetchAll, fromPaise, toPaise } from './opsApi'
import { isFranchiseeSession } from './cbrApi'
import type { AlfInput, AlfRecord, AlfResult, AlfStatus } from '@/pages/operations/alf/alfData'
import type { FundingModel } from './workflow'

const base = () => (isFranchiseeSession() ? '/my/alf' : '/alf')

type ApiAlf = {
  alfId: string
  siteId: string; atmId: string; frId: string; franchiseName: string; atmLocation: string; bank: string
  wlaAccount: string; settlementExercise: string; siteType: string; fundingModel: FundingModel
  requestDate: string; requestedAmountPaise: number; purpose: string; remarks?: string
  approvedAmountPaise?: number; disbursementDate?: string; disbursementRef?: string; expectedRecoveryDate?: string; actualRecoveryDate?: string
  clRefs?: string[]
  recoveries?: { recoveryId: string; date: string; amountPaise: number; mode: 'Recovery' | 'Adjustment'; clRef?: string; remarks?: string; by?: string; byName?: string; at: string }[]
  status: AlfStatus
  emailSubmittedAt?: string; emailRef?: string; closedBy?: string; closedAt?: string; rejectReason?: string
  channel?: AlfRecord['channel']; onBehalfReason?: string; onBehalfBy?: string; onBehalfByName?: string
  trail?: {
    createdBy: string; createdByName?: string; createdAt: string; submittedBy?: string; submittedByName?: string; submittedAt?: string
    verifiedBy?: string; verifiedByName?: string; verifiedAt?: string; approvedBy?: string; approvedByName?: string; approvedAt?: string; returnedBy?: string; returnReason?: string
  }
  statusLog?: { at: string; by: string; status: AlfStatus; note?: string }[]
  taskRefs?: string[]
}

export function toAlfRecord(a: ApiAlf): AlfRecord {
  const t = a.trail ?? ({ createdBy: '', createdAt: '' } as NonNullable<ApiAlf['trail']>)
  return {
    siteId: a.siteId, atmId: a.atmId, frId: a.frId, franchiseName: a.franchiseName, atmLocation: a.atmLocation, bank: a.bank,
    wlaAccount: a.wlaAccount, settlementExercise: a.settlementExercise, siteType: a.siteType, fundingModel: a.fundingModel,
    id: a.alfId,
    requestDate: a.requestDate,
    requestedAmount: fromPaise(a.requestedAmountPaise),
    purpose: a.purpose,
    remarks: a.remarks ?? '',
    approvedAmount: a.approvedAmountPaise == null ? undefined : fromPaise(a.approvedAmountPaise),
    disbursementDate: a.disbursementDate,
    disbursementRef: a.disbursementRef,
    expectedRecoveryDate: a.expectedRecoveryDate,
    actualRecoveryDate: a.actualRecoveryDate,
    clRefs: a.clRefs ?? [],
    recoveries: (a.recoveries ?? []).map((r) => ({ id: r.recoveryId, date: r.date, amount: fromPaise(r.amountPaise), mode: r.mode, clRef: r.clRef, remarks: r.remarks ?? '', by: r.byName ?? r.by ?? '', at: String(r.at) })),
    status: a.status,
    emailSubmittedAt: a.emailSubmittedAt ? String(a.emailSubmittedAt) : undefined,
    emailRef: a.emailRef,
    closedBy: a.closedBy,
    closedAt: a.closedAt ? String(a.closedAt) : undefined,
    rejectReason: a.rejectReason,
    channel: a.channel,
    onBehalfReason: a.onBehalfReason,
    onBehalfBy: a.onBehalfByName ?? a.onBehalfBy,
    trail: {
      createdBy: t.createdByName ?? t.createdBy,
      createdAt: String(t.createdAt ?? ''),
      submittedBy: t.submittedByName ?? t.submittedBy,
      submittedAt: t.submittedAt ? String(t.submittedAt) : undefined,
      verifiedBy: t.verifiedByName ?? t.verifiedBy,
      verifiedAt: t.verifiedAt ? String(t.verifiedAt) : undefined,
      approvedBy: t.approvedByName ?? t.approvedBy,
      approvedAt: t.approvedAt ? String(t.approvedAt) : undefined,
      returnedBy: t.returnedBy,
      returnReason: t.returnReason,
      modifications: [],
      documents: [],
      taskRefs: a.taskRefs ?? [],
    },
    statusLog: (a.statusLog ?? []).map((s) => ({ at: String(s.at), by: s.by, status: s.status, note: s.note })),
  }
}

/** ALF operations against the backend; each returns AlfResult and hands the fresh record to `put`. */
export function alfApi(putRec: (r: AlfRecord) => void) {
  const run = async (p: Promise<ApiAlf>): Promise<AlfResult> => {
    try {
      const rec = toAlfRecord(await p)
      putRec(rec)
      return { ok: true, id: rec.id }
    } catch (e) {
      return { ok: false, error: errMsg(e) }
    }
  }
  const body = (i: AlfInput) => ({ atmId: i.atmId.trim(), requestDate: i.requestDate, requestedAmountPaise: toPaise(i.requestedAmount), purpose: i.purpose, remarks: i.remarks ?? '' })
  return {
    list: async () => (await fetchAll<ApiAlf>(`${base()}/records`)).map(toAlfRecord),
    kpis: () => get<{ requested: number; disbursedPaise: number; recoveredPaise: number; outstandingPaise: number; overdue: number; byStatus: Record<string, number> }>(`${base()}/kpis`),
    save: async (input: AlfInput, opts: { id?: string; submit?: boolean }): Promise<AlfResult> => {
      if (!opts.id) {
        // staff (CRM / Admin) raise on behalf of a franchise: optional franchise + mandatory reason
        const onBehalf = isFranchiseeSession() ? {} : { frId: input.frId || undefined, onBehalfReason: input.onBehalfReason?.trim() || undefined }
        return run(post<ApiAlf>(`${base()}/records`, { ...body(input), ...onBehalf, submit: opts.submit || undefined }))
      }
      const r = await run(patch<ApiAlf>(`${base()}/records/${opts.id}`, body(input)))
      if (!r.ok || !opts.submit) return r
      return run(post<ApiAlf>(`${base()}/records/${opts.id}/submit`, {}))
    },
    submit: (id: string) => run(post<ApiAlf>(`${base()}/records/${id}/submit`, {})),
    verify: (id: string, remark?: string) => run(post<ApiAlf>(`/alf/records/${id}/verify`, { remark: remark || undefined })),
    submitEmail: (id: string) => run(post<ApiAlf>(`/alf/records/${id}/submit-email`, {})),
    approve: (id: string, d: { approvedAmount: number; disbursementDate: string; disbursementRef: string; expectedRecoveryDate: string }) =>
      run(post<ApiAlf>(`/alf/records/${id}/approve`, { approvedAmountPaise: toPaise(d.approvedAmount), disbursementDate: d.disbursementDate, disbursementRef: d.disbursementRef || undefined, expectedRecoveryDate: d.expectedRecoveryDate })),
    reject: (id: string, reason: string) => run(post<ApiAlf>(`/alf/records/${id}/reject`, { reason: reason.trim() })),
    mapCashLoading: (id: string, clIds: string[]) => run(post<ApiAlf>(`/alf/records/${id}/cash-loading`, { clIds })),
    addRecovery: (id: string, x: { date: string; amount: number; mode: 'Recovery' | 'Adjustment'; clRef?: string; remarks: string }) =>
      run(post<ApiAlf>(`/alf/records/${id}/recoveries`, { date: x.date, amountPaise: toPaise(x.amount), mode: x.mode, clRef: x.clRef || undefined, remarks: x.remarks ?? '' })),
    close: (id: string) => run(post<ApiAlf>(`/alf/records/${id}/close`, {})),
  }
}
