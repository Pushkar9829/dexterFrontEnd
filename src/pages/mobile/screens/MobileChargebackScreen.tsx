import { useMemo, useState } from 'react'
import { ArrowLeft, Bell, Clock, CreditCard, FileText, Film, Receipt, Send, X } from 'lucide-react'
import { apiEnabled, uploadFile } from '@/lib/api'
import { EVIDENCE_KINDS, TXN_CONFIRMATIONS, cbStage, isCbOverdue, submitCbEvidence, submitCbEvidenceAsync, useChargebacks, type ChargeBackDisputeRecord, type EvidenceKind } from '@/data/chargeBackDisputes'
import { fmtDt, fmtLeft, rupees, useNow, useReminderProcessor } from '@/pages/operations/recon2/util'
import { useMobileUser, useMyScope } from '../data/mobileSession'

interface MobileChargebackScreenProps {
  onBackToMore?: () => void
}

type Picked = { key: string; name: string; size: number; kind: EvidenceKind; file?: File }
const KIND_ICON: Record<EvidenceKind, typeof FileText> = { 'Transaction confirmation': Receipt, 'EOD details': FileText, 'Video evidence': Film, Document: FileText }
const KIND_ACCEPT: Record<EvidenceKind, string> = { 'Transaction confirmation': 'image/*,.pdf', 'EOD details': 'image/*,.pdf,.xlsx,.csv', 'Video evidence': 'video/*', Document: 'image/*,.pdf' }
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#1453CA]'
const needsResponse = (r: ChargeBackDisputeRecord) => !r.evidence && !r.closure && !r.report?.submittedAt

function EvidenceForm({ r, now, onDone }: { r: ChargeBackDisputeRecord; now: number; onDone: () => void }) {
  const [confirm, setConfirm] = useState('')
  const [eod, setEod] = useState('')
  const [remarks, setRemarks] = useState('')
  const [files, setFiles] = useState<Picked[]>([])
  const [error, setError] = useState('')
  const left = new Date(r.dueAt).getTime() - now
  const reminders = r.reminders.filter((x) => x.audience === 'Franchise')

  const [busy, setBusy] = useState(false)
  const submit = () => {
    if (apiEnabled) {
      // API mode: upload each picked file (POST /files) and send the file ids with the evidence
      setBusy(true)
      setError('')
      void (async () => {
        try {
          const up = await Promise.all(files.map(async (f) => ({ name: f.name, size: f.size, kind: f.kind, fileId: f.file ? (await uploadFile(f.file, { purpose: 'chargeback-evidence', entity: 'ChargeBack', ref: r.id })).fileId : undefined })))
          const res = await submitCbEvidenceAsync(r.id, { txnConfirmation: confirm, eodDetails: eod, remarks, files: up }, r.franchiseName)
          if (!res.ok) setError(res.error)
          else onDone()
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Upload failed')
        } finally {
          setBusy(false)
        }
      })()
      return
    }
    const res = submitCbEvidence(r.id, { txnConfirmation: confirm, eodDetails: eod, remarks, files }, r.franchiseName)
    if (!res.ok) {
      setError(res.error)
      return
    }
    onDone()
  }
  return (
    <div className="space-y-3">
      <div className={`rounded-2xl p-3 text-white shadow ${left < 0 ? 'bg-red-600' : left < 4 * 3600_000 ? 'bg-amber-500' : 'bg-[#0C3E98]'}`}>
        <div className="flex items-center gap-2 text-[12px] font-bold"><Clock size={14} /> {fmtLeft(left)}</div>
        <div className="mt-0.5 text-[11px] opacity-90">Respond within 24 h of the {r.source} notice ({fmtDt(r.receivedAt)})</div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-3 text-[12px] shadow-sm">
        <div className="text-[13px] font-black text-[#0B2A6B]">{r.id}</div>
        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-slate-600">
          <span>ATM <b className="text-slate-900">{r.atmId}</b></span>
          <span>{r.fundingModel}</span>
          <span>RRN <b className="text-slate-900">{r.rrn}</b></span>
          <span>Txn {r.txnDate} {r.txnTime}</span>
          <span>Card {r.cardNumber || '—'}</span>
          <span>Dispute <b className="text-slate-900">{rupees(r.disputeAmount)}</b></span>
          <span className="col-span-2">Reason: {r.reason}</span>
        </div>
        {r.priorEvidence.length > 0 && <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-[11px] text-amber-800">CRM asked for more evidence: {r.priorEvidence[r.priorEvidence.length - 1].returnedReason}</p>}
        <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500"><Bell size={12} /> {reminders.length} reminder(s) received{reminders.length ? ` · last ${fmtDt(reminders[reminders.length - 1].loggedAt)}` : ''}</p>
      </div>

      <div className="space-y-2.5 rounded-2xl border border-blue-200 bg-white p-3.5 shadow-sm">
        <div className="text-xs font-black text-[#0B2A6B]">Your response</div>
        <label className="block text-[11px] font-semibold text-slate-600">Transaction confirmation *
          <select className={input} value={confirm} onChange={(e) => setConfirm(e.target.value)}>
            <option value="">Select</option>
            {TXN_CONFIRMATIONS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="block text-[11px] font-semibold text-slate-600">EOD details *<textarea rows={3} className={input} placeholder="EOD counters, cash in cassettes, overage / shortage on the txn date…" value={eod} onChange={(e) => setEod(e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-2">
          {EVIDENCE_KINDS.map((k) => {
            const Icon = KIND_ICON[k]
            const n = files.filter((f) => f.kind === k).length
            return (
              <label key={k} className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed px-2 py-2.5 text-center text-[11px] ${n ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-600'}`}>
                <Icon size={16} />
                {k}{n ? ` (${n})` : ''}
                <input
                  type="file"
                  accept={KIND_ACCEPT[k]}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const add = Array.from(e.target.files ?? []).map((x, i) => ({ key: `${k}-${x.name}-${Date.now()}-${i}`, name: x.name, size: x.size, kind: k, file: x }))
                    e.target.value = ''
                    setFiles((fs) => [...fs, ...add])
                  }}
                />
              </label>
            )
          })}
        </div>
        {files.length > 0 && (
          <ul className="space-y-1">
            {files.map((f) => (
              <li key={f.key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1 text-[11px]">
                <span className="truncate">{f.name}</span>
                <span className="text-slate-400">{f.kind}</span>
                <button type="button" aria-label="Remove file" onClick={() => setFiles((fs) => fs.filter((x) => x.key !== f.key))} className="ml-auto text-slate-400"><X size={12} /></button>
              </li>
            ))}
          </ul>
        )}
        <label className="block text-[11px] font-semibold text-slate-600">Remarks<textarea rows={2} className={input} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></label>
      </div>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}
      <button type="button" disabled={busy} onClick={submit} className="flex w-full disabled:opacity-60 items-center justify-center gap-2 rounded-xl bg-[#1453CA] py-3 text-sm font-bold text-white shadow"><Send size={15} /> Submit response & evidence</button>
    </div>
  )
}

/** Franchise app — chargeback response & evidence upload (§11.2 steps 4–5), with the 24 h clock. */
export function MobileChargebackScreen({ onBackToMore }: MobileChargebackScreenProps) {
  const all = useChargebacks()
  const now = useNow(1000)
  useReminderProcessor()
  const franchises = useMemo(() => [...new Set(all.map((r) => r.franchiseName))].sort(), [all])
  const user = useMobileUser()
  const scope = useMyScope()
  const [previewPick, setFranchise] = useState('')
  const franchise = user?.isPreview ? previewPick : (scope.franchise?.name ?? scope.frId)
  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const [openId, setOpenId] = useState<string | null>(null)
  const [done, setDone] = useState('')
  const mine = all.filter((r) => (!franchise && user?.isPreview) || r.franchiseName === franchise || scope.atmIds.has(r.atmId))
  const pending = mine.filter(needsResponse)
  const shown = tab === 'pending' ? pending : mine
  const open = all.find((r) => r.id === openId)

  return (
    <div className="space-y-4 px-3 pt-3 pb-6">
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(onBackToMore || open) && (
              <button type="button" aria-label="Back" onClick={() => (open ? setOpenId(null) : onBackToMore?.())} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"><ArrowLeft size={16} /></button>
            )}
            <div>
              <h1 className="text-base font-black">Chargeback Response</h1>
              <p className="text-[11px] text-blue-100">{pending.length} case(s) need your evidence</p>
            </div>
          </div>
          <CreditCard size={24} className="shrink-0 text-amber-300" />
        </div>
        {!open && (
          <>
            {user?.isPreview && <select aria-label="Franchise" value={franchise} onChange={(e) => setFranchise(e.target.value)} className="mt-3 w-full rounded-lg bg-white/15 px-2 py-1.5 text-[12px] text-white">
              <option value="" className="text-slate-900">All franchises (Admin preview)</option>
              {franchises.map((f) => <option key={f} className="text-slate-900">{f}</option>)}
            </select>}
            <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-xl bg-white/10 p-1">
              {(['pending', 'all'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${tab === t ? 'bg-white text-[#0B2A6B]' : 'text-white/80'}`}>
                  {t === 'pending' ? `Respond (${pending.length})` : `All cases (${mine.length})`}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {done && !open && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">Evidence for {done} submitted — CRM Operations has been notified.</p>}

      {open ? (
        needsResponse(open) ? (
          <EvidenceForm key={open.id} r={open} now={now} onDone={() => { setDone(open.id); setOpenId(null) }} />
        ) : (
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 text-[12px] shadow-sm">
            <div className="text-[13px] font-black text-[#0B2A6B]">{open.id} · {cbStage(open)}</div>
            {open.evidence && <p>Your evidence: {open.evidence.txnConfirmation} · {open.evidence.files.length} file(s) · {fmtDt(open.evidence.submittedAt)}</p>}
            {open.evidenceCheck && <p>CRM check: {open.evidenceCheck.result} vs {open.evidenceCheck.against}</p>}
            {open.report?.submittedAt && <p>Response sent to {open.source} on {fmtDt(open.report.submittedAt)}</p>}
            {open.closure && <p className="font-semibold">Outcome: {open.closure.outcome}</p>}
          </div>
        )
      ) : (
        <div className="space-y-2.5">
          {shown.map((r) => {
            const od = isCbOverdue(r, now)
            return (
              <button key={r.id} type="button" onClick={() => setOpenId(r.id)} className={`w-full rounded-2xl border bg-white p-3 text-left shadow-sm ${od ? 'border-red-300' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[13px] font-black text-[#0B2A6B]">{r.id}</div>
                    <div className="text-[11px] text-slate-500">{r.atmId} · RRN {r.rrn} · {rupees(r.disputeAmount)}</div>
                    <div className="text-[11px] text-slate-500">{r.reason}</div>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{cbStage(r)}</span>
                </div>
                {needsResponse(r) && <div className={`mt-2 text-[11px] font-bold ${od ? 'text-red-600' : 'text-amber-700'}`}><Clock size={11} className="mr-1 inline" />{fmtLeft(new Date(r.dueAt).getTime() - now)}</div>}
              </button>
            )
          })}
          {!shown.length && <p className="py-8 text-center text-[12px] text-slate-500">{tab === 'pending' ? 'No chargeback is waiting for your response.' : 'No chargeback cases.'}</p>}
        </div>
      )}
    </div>
  )
}
