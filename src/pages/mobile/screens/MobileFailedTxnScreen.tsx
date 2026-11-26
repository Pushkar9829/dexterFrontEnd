import { useMemo, useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, History, Paperclip, RotateCcw, Send } from 'lucide-react'
import { apiEnabled } from '@/lib/api'
import { FTD_TXN_TYPES, raiseFtd, raiseFtdAsync, useFailedTxnDisputes, validateFtd, BANK_RECIPIENTS, type FtdInput } from '@/data/failedTxnDisputes'
import { atmInfo, atmOptions } from '@/pages/operations/recon2/atmDirectory'
import { fmtDt, rupees } from '@/pages/operations/recon2/util'
import { useMyScope } from '../data/mobileSession'

interface MobileFailedTxnScreenProps {
  onBackToMore?: () => void
}

const blank = (atmId: string): FtdInput => ({
  raisedVia: 'Franchise Mobile', atmId, machineType: 'ATM', txnType: 'Withdrawal - Card', txnId: '', utr: '', txnDate: new Date().toISOString().slice(0, 10), txnTime: '',
  customerName: '', customerMobile: '', accountNo: '', bankName: '', ifscCode: '', cardDetails: '', branch: '', rrn: '', amount: 0, remarks: '', recipient: BANK_RECIPIENTS[0],
})
const statusColor = (s: string) => (s === 'Closed' || s === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : s === 'Rejected' ? 'bg-red-100 text-red-700' : s === 'Returned for Correction' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700')
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#1453CA]'

/** Franchise app — raise a failed transaction dispute (§11.1) and track it through CRM / Admin / bank stages. */
export function MobileFailedTxnScreen({ onBackToMore }: MobileFailedTxnScreenProps) {
  const { frId, sites } = useMyScope()
  const atms = useMemo(() => {
    const own = [...new Set([...sites.map((s) => s.atmId), ...atmOptions().filter((a) => atmInfo(a).franchiseId === frId)])]
    return own
  }, [sites, frId])
  const all = useFailedTxnDisputes()
  const [tab, setTab] = useState<'form' | 'history'>('form')
  const [f, setF] = useState<FtdInput>(() => blank(atms.find((a) => atmInfo(a).funding === 'Self Funding') ?? atms[0] ?? ''))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<string | null>(null)
  const info = useMemo(() => atmInfo(f.atmId), [f.atmId])
  const set = <K extends keyof FtdInput>(k: K, v: FtdInput[K]) => setF((x) => ({ ...x, [k]: v }))
  const mine = useMemo(() => all.filter((r) => r.franchiseName === info.franchiseName || r.raisedBy === `Franchise: ${info.franchiseName}`), [all, info.franchiseName])

  const submit = () => {
    const e = validateFtd(f)
    setErrors(e)
    if (Object.keys(e).length) return
    if (apiEnabled) {
      void raiseFtdAsync(f, { franchiseActor: info.franchiseName }).then((res) => {
        if (!res.ok) return setErrors({ form: res.error })
        setF(blank(f.atmId))
        setOpen(res.id)
        setTab('history')
      })
      return
    }
    const res = raiseFtd(f, { franchiseActor: info.franchiseName })
    if (!res.ok) {
      setErrors({ form: res.error })
      return
    }
    setF(blank(f.atmId))
    setOpen(res.id)
    setTab('history')
  }
  const err = (k: string) => errors[k] && <p className="mt-0.5 text-[11px] text-red-600">{errors[k]}</p>

  return (
    <div className="space-y-4 px-3 pt-3 pb-6">
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToMore && (
              <button type="button" onClick={onBackToMore} aria-label="Back" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"><ArrowLeft size={16} /></button>
            )}
            <div>
              <h1 className="text-base font-black">Failed Transaction Dispute</h1>
              <p className="text-[11px] text-blue-100">{info.franchiseName} · {info.funding}</p>
            </div>
          </div>
          <RotateCcw size={24} className="shrink-0 text-amber-300" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-white/10 p-1">
          {(['form', 'history'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${tab === t ? 'bg-white text-[#0B2A6B]' : 'text-white/80'}`}>
              {t === 'form' ? 'Raise Dispute' : `My Disputes (${mine.length})`}
            </button>
          ))}
        </div>
      </div>

      {tab === 'form' && (
        <div className="space-y-3">
          <div className="space-y-2.5 rounded-2xl border border-blue-200 bg-white p-3.5 shadow-sm">
            <div className="text-xs font-black text-[#0B2A6B]">ATM & transaction</div>
            <label className="block text-[11px] font-semibold text-slate-600">ATM ID
              <select className={input} value={f.atmId} onChange={(e) => set('atmId', e.target.value)}>{atms.map((a) => <option key={a}>{a}</option>)}</select>
            </label>
            <p className="text-[11px] text-slate-500">Site {info.siteId} · {info.funding}{info.funding !== 'Self Funding' && ' (failed txn disputes are mainly for Self Funding sites)'}</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] font-semibold text-slate-600">Txn type<select className={input} value={f.txnType} onChange={(e) => set('txnType', e.target.value)}>{FTD_TXN_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
              <label className="block text-[11px] font-semibold text-slate-600">Amount (₹) *<input className={input} inputMode="numeric" value={f.amount ? String(f.amount) : ''} onChange={(e) => set('amount', Number(e.target.value.replace(/\D/g, '')))} />{err('amount')}</label>
              <label className="block text-[11px] font-semibold text-slate-600">Txn date *<input type="date" className={input} value={f.txnDate} onChange={(e) => set('txnDate', e.target.value)} /></label>
              <label className="block text-[11px] font-semibold text-slate-600">Txn time<input type="time" className={input} value={f.txnTime} onChange={(e) => set('txnTime', e.target.value)} /></label>
              <label className="col-span-2 block text-[11px] font-semibold text-slate-600">RRN (12 digits) *<input className={input} inputMode="numeric" maxLength={12} value={f.rrn} onChange={(e) => set('rrn', e.target.value.replace(/\D/g, ''))} />{err('rrn')}</label>
              <label className="block text-[11px] font-semibold text-slate-600">Txn ID<input className={input} value={f.txnId} onChange={(e) => set('txnId', e.target.value)} /></label>
              <label className="block text-[11px] font-semibold text-slate-600">UTR<input className={input} value={f.utr} onChange={(e) => set('utr', e.target.value)} /></label>
            </div>
          </div>
          <div className="space-y-2.5 rounded-2xl border border-blue-200 bg-white p-3.5 shadow-sm">
            <div className="text-xs font-black text-[#0B2A6B]">Customer</div>
            <label className="block text-[11px] font-semibold text-slate-600">Customer name *<input className={input} value={f.customerName} onChange={(e) => set('customerName', e.target.value)} />{err('customerName')}</label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] font-semibold text-slate-600">Mobile<input className={input} inputMode="tel" value={f.customerMobile} onChange={(e) => set('customerMobile', e.target.value)} /></label>
              <label className="block text-[11px] font-semibold text-slate-600">Bank *<input className={input} value={f.bankName} onChange={(e) => set('bankName', e.target.value)} />{err('bankName')}</label>
              <label className="block text-[11px] font-semibold text-slate-600">Card / UPI<input className={input} value={f.cardDetails} onChange={(e) => set('cardDetails', e.target.value)} /></label>
              <label className="block text-[11px] font-semibold text-slate-600">Account (last 4)<input className={input} value={f.accountNo} onChange={(e) => set('accountNo', e.target.value)} /></label>
            </div>
            <label className="block text-[11px] font-semibold text-slate-600">What happened? *<textarea rows={3} className={input} value={f.remarks} onChange={(e) => set('remarks', e.target.value)} />{err('remarks')}</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-[12px] text-slate-600">
              <Paperclip size={14} /> {f.txnSlipName ?? 'Attach txn slip / customer receipt'}
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const x = e.target.files?.[0]; if (x) set('txnSlipName', x.name); e.target.value = '' }} />
            </label>
          </div>
          {errors.form && <p className="rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-700">{errors.form}</p>}
          <button type="button" onClick={submit} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1453CA] py-3 text-sm font-bold text-white shadow"><Send size={15} /> Submit dispute</button>
          <p className="text-center text-[11px] text-slate-500">A dispute ID is generated instantly. CRM verifies, Admin approves and the bank is emailed — track it under My Disputes.</p>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2.5">
          {mine.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="flex w-full items-start justify-between gap-2 text-left">
                <div>
                  <div className="text-[13px] font-black text-[#0B2A6B]">{r.id}</div>
                  <div className="text-[11px] text-slate-500">{r.atmId} · {rupees(r.amount)} · {r.customerName || '—'}</div>
                  <div className="text-[11px] text-slate-500">{fmtDt(r.createdAt)}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor(r.status)}`}>{r.status}</span>
                  {open === r.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>
              {open === r.id && (
                <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                  {r.trail.returnReason && r.status === 'Returned for Correction' && <p className="rounded-lg bg-amber-50 px-2 py-1 text-[11px] text-amber-800">Returned: {r.trail.returnReason} — CRM will correct with you.</p>}
                  {r.resolution && <p className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800">{r.resolution.outcome}</p>}
                  {[...r.history].reverse().map((h, i) => (
                    <div key={`${h.at}-${i}`} className="flex gap-2 text-[11px]"><History size={12} className="mt-0.5 shrink-0 text-slate-400" /><span>{h.text}<span className="block text-slate-400">{fmtDt(h.at)}</span></span></div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!mine.length && <p className="py-8 text-center text-[12px] text-slate-500">No disputes for {info.franchiseName} yet.</p>}
        </div>
      )}
    </div>
  )
}
