import { useMemo, useState } from 'react'
import {
  Banknote,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'
import { cbrMaster, dailyForSite, reconcile, amountOf } from '@/data/cbr'
import { SITES } from '@/data/cbrSites'
import { fmtDate, useMyScope } from '../data/mobileSession'
import { clMaster } from '@/data/cashLoadingRegisterStore'

interface MobileCashBalanceScreenProps {
  onBackToMore?: () => void
}

export function MobileCashBalanceScreen({ onBackToMore }: MobileCashBalanceScreenProps) {
  // Daily CBR (Operations › CBR) of the franchise's Full-Funding ATMs: system (expected) vs physical closing
  const { siteIds, sites } = useMyScope()
  const cbrSites = useMemo(() => SITES.filter((x) => siteIds.has(x.siteId)), [siteIds])
  const [selectedSite, setSelectedSite] = useState('')
  const site = cbrSites.find((x) => x.siteId === selectedSite) ?? cbrSites[0]
  const [refreshKey, setRefreshKey] = useState(0)
  const latest = useMemo(() => {
    void refreshKey
    if (!site) return undefined
    const days = dailyForSite(site.siteId).filter((d) => amountOf(d.groups.closing) > 0 || amountOf(d.groups.switch) > 0)
    return days[days.length - 1]
  }, [site, refreshKey])
  const rec = latest ? reconcile(latest) : undefined
  const current = { switchCash: rec?.expected ?? 0, physicalCash: rec?.closing ?? 0, lastChecked: latest ? `${fmtDate(latest.date)}${latest.eodTime ? `, ${latest.eodTime}` : ''}` : '—' }
  const diff = current.physicalCash - current.switchCash
  const selectedAtm = site?.atmId ?? ''

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
              <h1 className="text-base font-black text-white">Cash Balance Confirmation</h1>
              <p className="text-[11px] text-blue-100 mt-0.5">
                Physical cassette cash vs Switch ledger confirmation.
              </p>
            </div>
          </div>
          <Banknote size={26} className="text-amber-300 shrink-0" />
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3.5 text-xs">
        <div>
          <label className="text-[10px] font-bold text-slate-700 block mb-1">Select ATM Machine</label>
          <select
            value={site?.siteId ?? ''}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 font-bold text-slate-800"
          >
            {cbrSites.length === 0 && <option value="">No Full-Funding CBR ATM ({sites.length} site(s) mapped)</option>}
            {cbrSites.map((x) => (
              <option key={x.siteId} value={x.siteId}>
                {x.atmId} ({x.location})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100">
            <span className="text-[10px] text-slate-500 font-bold block">System / Expected (CBR)</span>
            <span className="text-base font-black text-[#0B2A6B]">₹{current.switchCash.toLocaleString()}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold block">Physical Closing Count</span>
            <span className="text-base font-black text-slate-900">₹{current.physicalCash.toLocaleString()}</span>
          </div>
        </div>

        {/* Status result */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between ${
            diff === 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {diff === 0 ? <CheckCircle size={18} className="text-emerald-600" /> : <AlertTriangle size={18} className="text-rose-600" />}
            <div>
              <span className="font-bold block">
                {diff === 0 ? 'Cash Reconciled (100% Match)' : `Discrepancy: ₹${diff.toLocaleString()}`}
              </span>
              <span className="text-[10px] opacity-75">Last checked: {current.lastChecked}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={!selectedAtm}
          className="w-full h-10 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs hover:bg-blue-700"
        >
          <RefreshCw size={14} /> Refresh Switch Ledger
        </button>
      </div>

      <MySubmissions />
    </div>
  )
}

/** Franchise "View Own" (Operations §17): app submissions with their workflow status, per funding model. */
function MySubmissions() {
  const cbr = cbrMaster.store.use()
  const cl = clMaster.store.use()
  const [tab, setTab] = useState<'CBR' | 'Cash Loading'>('CBR')
  const { frId, atmIds } = useMyScope()
  const rows = (tab === 'CBR' ? cbr : cl).filter((r) => r.frId === frId || atmIds.has(r.atmId)).slice(0, 8)
  return (
    <div className="rounded-2xl border border-blue-200 bg-white p-3 shadow-sm space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-black text-[#0A2665]">My submissions</span>
        <div className="flex gap-1">
          {(['CBR', 'Cash Loading'] as const).map((k) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tab === k ? 'bg-[#1258E2] text-white' : 'bg-slate-100 text-slate-600'}`}>
              {k === 'CBR' ? 'CBR (FFM)' : 'Cash Loading (SF)'}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 && <p className="text-[11px] text-slate-500">No submissions yet.</p>}
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-1.5">
            <div>
              <div className="font-bold text-slate-900">{r.id}</div>
              <div className="text-[10px] text-slate-500">
                {r.atmId} · {r.date} · ₹{r.amount.toLocaleString('en-IN')}
              </div>
              {r.status === 'Returned for Correction' && <div className="text-[10px] text-orange-600">{r.trail.returnReason}</div>}
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ${r.locked ? 'bg-emerald-50 text-emerald-700' : r.status === 'Rejected' ? 'bg-rose-50 text-rose-700' : r.status === 'Returned for Correction' ? 'bg-orange-50 text-orange-700' : 'bg-amber-50 text-amber-700'}`}>
              {r.locked ? 'Approved · Locked' : r.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
