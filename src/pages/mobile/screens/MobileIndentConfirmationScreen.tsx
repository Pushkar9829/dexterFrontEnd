import { useMemo, useState } from 'react'
import {
  FileCheck2,
  ArrowLeft,
  Check
} from 'lucide-react'
import { cbrMaster, type CashRecord } from '@/data/cbr'
import { clMaster } from '@/data/cashLoadingRegisterStore'
import { indentConfirmStore } from '../data/mobileFeeds'
import { fmtDate, fmtDateTime, useMobileUser, useMyScope } from '../data/mobileSession'

interface MobileIndentConfirmationScreenProps {
  onBackToMore?: () => void
}

const rs = (v: number) => `₹ ${Math.round(v).toLocaleString('en-IN')}`

/**
 * Indent withdrawal confirmation. Indents come from the franchise's CBR (Full Funding) / Cash Loading (Self Funding)
 * records — Issued = daily indent, Revised = any CRM correction of the indent, Final = cash loaded. The franchise's
 * confirmation is kept in an app store (no indent-confirmation field exists in the operations masters yet).
 */
export function MobileIndentConfirmationScreen({ onBackToMore }: MobileIndentConfirmationScreenProps) {
  const user = useMobileUser()
  const { atmIds, frId } = useMyScope()
  const cbr = cbrMaster.store.use()
  const cl = clMaster.store.use()
  const confirms = indentConfirmStore.use()
  const records = useMemo(
    () =>
      [...cbr, ...cl]
        .filter((r) => (r.frId === frId || atmIds.has(r.atmId)) && r.status !== 'Draft' && r.status !== 'Rejected' && r.dailyIndent > 0)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [cbr, cl, frId, atmIds],
  )
  const [recId, setRecId] = useState('')
  const rec: CashRecord | undefined = records.find((r) => r.id === recId) ?? records[0]
  const revision = rec?.trail.modifications.filter((m) => m.field === 'dailyIndent' || m.field === 'Daily Indent').pop()
  const confirmed = rec ? confirms[rec.id] : undefined

  const confirm = () => {
    if (!rec || !user) return
    indentConfirmStore.set((s) => ({ ...s, [rec.id]: { at: new Date().toISOString(), by: user.name, amount: rec.amount } }))
  }

  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToMore && (
              <button
                onClick={onBackToMore}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h1 className="text-base font-black text-white">Indent Withdrawal Confirmation</h1>
              <p className="text-[11px] text-blue-100 mt-0.5">
                Multi-stage indent tracking linked with CBR & Cash Loading.
              </p>
            </div>
          </div>
          <FileCheck2 size={26} className="text-amber-300 shrink-0" />
        </div>
      </div>

      {/* Indent Select */}
      <div className="rounded-2xl border border-blue-200 bg-white p-3.5 shadow-xs space-y-3">
        <label className="text-[11px] font-bold text-slate-700 block">Select Indent (ATM · date)</label>
        {records.length === 0 ? (
          <p className="text-xs text-slate-500">No indents on your CBR / Cash Loading records yet.</p>
        ) : (
          <select
            value={rec?.id ?? ''}
            onChange={(e) => setRecId(e.target.value)}
            className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800"
          >
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                {r.atmId} · {fmtDate(r.date)} · {r.kind} {r.id} {confirms[r.id] ? '✓' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {rec && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="bg-gradient-to-r from-[#0C3E98] to-[#1453CA] px-3.5 py-2 text-white text-xs font-extrabold flex justify-between">
            <span>Indent Stages & Reconciliation</span>
            <span className="font-semibold text-blue-100">{rec.status}</span>
          </div>

          <div className="p-3.5 space-y-3 text-xs">
            {/* Stage 1: Issued Indent */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[#0B2A6B]">1. Issued Indent (Initial Request)</span>
                <span className="text-[10px] text-slate-400">{fmtDateTime(rec.trail.submittedAt ?? rec.trail.createdAt)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-slate-600">Indent Amount:</span>
                <span className="text-sm font-black text-slate-900">{rs(revision ? Number(revision.oldValue) || rec.dailyIndent : rec.dailyIndent)}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Ref: {rec.id} · {rec.formName}</span>
            </div>

            {/* Stage 2: Revised Indent */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-amber-900">2. Revised Indent (Cash Ops Adjustment)</span>
                <span className="text-[10px] text-slate-400">{revision ? fmtDateTime(revision.at) : '—'}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-slate-600">Adjusted Amount:</span>
                <span className="text-sm font-black text-amber-700">{revision ? rs(rec.dailyIndent) : 'No revision'}</span>
              </div>
              {revision && <span className="text-[10px] text-slate-500">By {revision.by} · {revision.reason}</span>}
            </div>

            {/* Stage 3: Final Withdrawal Indent */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-emerald-900">3. Final Withdrawal Indent Fund</span>
                <span className="text-[10px] text-slate-400">{fmtDate(rec.date)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-slate-600">{rec.kind === 'CBR' ? 'Injected in ATM:' : 'Loaded in ATM:'}</span>
                <span className="text-sm font-black text-emerald-700">{rs(rec.amount)}</span>
              </div>
              <div className="mt-1 pt-1 border-t border-emerald-200/60 flex justify-between text-[10px] text-slate-500">
                <span>{rec.kind} Ref: {rec.id}</span>
                <span>Withdrawal: {rs(rec.cashWithdrawal)}</span>
              </div>
            </div>

            {/* Confirmation Button */}
            <button
              type="button"
              disabled={!!confirmed}
              onClick={confirm}
              className={`w-full h-11 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 ${
                confirmed
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-[#0C3E98] to-[#1453CA] text-white hover:opacity-95'
              }`}
            >
              <Check size={16} />
              <span>{confirmed ? `Confirmed by ${confirmed.by} · ${fmtDateTime(confirmed.at)}` : 'Confirm Withdrawal Indent'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
