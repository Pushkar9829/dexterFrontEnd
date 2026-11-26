import { useMemo, useState } from 'react'
import { ArrowLeft, Database, Eye, Lock } from 'lucide-react'
import { useSites } from '@/data/network'
import { useTxnStore } from '@/data/txnData'
import { dmy, inr, useMobileFr } from '@/pages/operations/eod2/fmt'
import { MobileFranchiseBar } from '../components/MobileFranchiseBar'

interface MobileTransactionsScreenProps {
  onBackToMore?: () => void
}

/** Transaction Data for the franchise — READ-ONLY, own mapped sites only (spec §8, UAT 14). No create / edit / delete. */
export function MobileTransactionsScreen({ onBackToMore }: MobileTransactionsScreenProps) {
  const frId = useMobileFr()
  const { records } = useTxnStore()
  const { sites } = useSites()
  const mySites = useMemo(() => sites.filter((s) => s.frId === frId), [sites, frId])
  const [siteId, setSiteId] = useState('')
  const [days, setDays] = useState(7)
  const [now] = useState(() => Date.now())
  const mine = useMemo(() => {
    const ids = new Set(mySites.map((s) => s.siteId))
    const cutoff = new Date(now - days * 86400_000).toISOString().slice(0, 10)
    return records.filter((r) => ids.has(r.siteId) && (!siteId || r.siteId === siteId) && r.txnDate >= cutoff).sort((a, b) => b.txnDate.localeCompare(a.txnDate) || a.atmId.localeCompare(b.atmId))
  }, [records, mySites, siteId, days, now])
  const totals = mine.reduce((t, r) => ({ count: t.count + r.txnCount, amount: t.amount + r.amount, wd: t.wd + r.withdrawalCount, dp: t.dp + r.depositCount }), { count: 0, amount: 0, wd: 0, dp: 0 })

  return (
    <div className="space-y-3 px-3 pt-3 pb-6">
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          {onBackToMore && (
            <button type="button" onClick={onBackToMore} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15" aria-label="Back">
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black">Transaction Data</h1>
            <p className="mt-0.5 text-[11px] text-blue-100">Your mapped sites only · entered by Dexter CRM</p>
          </div>
          <Database size={24} className="shrink-0 text-amber-300" />
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-bold">
          <Lock size={11} /> Read-only access
        </div>
      </div>
      <MobileFranchiseBar />

      <div className="grid grid-cols-2 gap-2">
        <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800">
          <option value="">All my ATMs ({mySites.length})</option>
          {mySites.map((s) => (
            <option key={s.siteId} value={s.siteId}>
              {s.atmId}
            </option>
          ))}
        </select>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800">
          {[7, 15, 30].map((d) => (
            <option key={d} value={d}>
              Last {d} days
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          ['Transactions', totals.count.toLocaleString('en-IN')],
          ['Amount', inr(totals.amount)],
          ['Withdrawals', totals.wd.toLocaleString('en-IN')],
          ['Deposits', totals.dp.toLocaleString('en-IN')],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">{k}</div>
            <div className="mt-0.5 text-sm font-black text-[#0B2A6B]">{v}</div>
          </div>
        ))}
      </div>

      {!mine.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">No transaction data for your sites in this period.</div>
      ) : (
        <div className="space-y-2">
          {mine.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">
                  {r.atmId} <span className="font-bold text-slate-400">· {dmy(r.txnDate)}</span>
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${r.verification === 'Verified' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{r.verification === 'Verified' ? 'Verified' : 'Provisional'}</span>
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <div className="text-slate-400">Count</div>
                  <div className="font-bold text-slate-800">{r.txnCount}</div>
                </div>
                <div>
                  <div className="text-slate-400">W / D</div>
                  <div className="font-bold text-slate-800">
                    {r.withdrawalCount} / {r.depositCount}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Amount</div>
                  <div className="font-bold text-slate-800">{inr(r.amount)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="flex items-center gap-1.5 text-[10.5px] text-slate-400">
        <Eye size={11} /> You can view only. Contact your CRM executive for corrections.
      </p>
    </div>
  )
}
