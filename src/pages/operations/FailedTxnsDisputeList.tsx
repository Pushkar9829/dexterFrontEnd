import { useMemo, useState } from 'react'
import { SiteRef } from '@/lib/siteRef'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronRight, Download, Home, Plus, Search } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/KpiCard'
import { FTD_STATUSES, exportDisputesToCsv, ftdLoader, useFailedTxnDisputes, useFtdLoad, type FtdStatus } from '@/data/failedTxnDisputes'
import { apiEnabled } from '@/data/opsApi'
import { canCrmAct, useOpsUser } from './recon2/opsAccess'
import { ActingAs, LoadBanner, StageChart } from './recon2/shared'
import { fmtDt, rupees } from './recon2/util'

export default function FailedTxnsDisputeList() {
  const list = useFailedTxnDisputes()
  const load = useFtdLoad()
  const navigate = useNavigate()
  const u = useOpsUser()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<FtdStatus | ''>('')
  const [funding, setFunding] = useState('')
  const [via, setVia] = useState('')

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return list.filter(
      (r) =>
        (!status || r.status === status) &&
        (!funding || r.fundingModel === funding) &&
        (!via || r.raisedVia === via) &&
        (!t || [r.id, r.atmId, r.siteId, r.rrn, r.txnId, r.utr, r.customerName, r.franchiseName, r.bankName].join(' ').toLowerCase().includes(t)),
    )
  }, [list, q, status, funding, via])
  const counts = useMemo(() => Object.fromEntries(FTD_STATUSES.map((s) => [s, list.filter((r) => r.status === s).length])) as Record<FtdStatus, number>, [list])
  const open = list.filter((r) => !['Closed', 'Rejected', 'Resolved'].includes(r.status))

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 pb-12">
      <div className="mb-3 flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="shrink-0 text-slate-400" />
        <Link to="/operations" className="hover:text-primary">Operations</Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/operations/reconciliation" className="hover:text-primary">Reconciliation</Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Failed Transaction Disputes</span>
      </div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Failed Transaction Disputes</h1>
          <p className="mt-0.5 text-[13px] text-muted">Raised by CRM (web) or Franchise (mobile) → CRM verification → Admin approval → email → bank response → follow-up → closure.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<Download size={14} />} onClick={() => exportDisputesToCsv(rows)}>Export</Button>
          {canCrmAct(u) && <Button icon={<Plus size={14} />} onClick={() => navigate('/operations/reconciliation/failed-txns/new')}>Raise dispute</Button>}
        </div>
      </div>
      <div className="mb-4"><ActingAs hint="Kiran Rao / Sunil Yadav = CRM · Meera Iyer = Admin" /></div>
      <LoadBanner state={load} onRetry={() => ftdLoader.reload()} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open disputes" value={open.length} caption={rupees(open.reduce((s, r) => s + r.amount, 0)) + ' under dispute'} icon={<AlertTriangle size={16} />} />
        <StatCard label="Pending CRM verification" value={counts['Pending Verification']} caption="Maker-checker — not by the raiser" />
        {apiEnabled ? (
          <StatCard label="Pending processing / approval" value={(counts['Verified'] ?? 0) + (counts['Processed'] ?? 0)} caption="Operations process → Admin approves" />
        ) : (
          <StatCard label="Pending Admin approval" value={counts['Pending Approval']} caption="Approval triggers the bank email" />
        )}
        <StatCard label="Self Funding share" value={`${list.length ? Math.round((list.filter((r) => r.fundingModel === 'Self Funding').length / list.length) * 100) : 0}%`} caption="§11.1 — mainly Self Funding sites" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search size={14} className="absolute top-2.5 left-2.5 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID, ATM, RRN, txn, customer, franchise…" className="h-9 w-full rounded-md border border-line bg-white pr-3 pl-8 text-[12.5px] outline-none focus:border-primary" />
            </div>
            <select aria-label="Funding" value={funding} onChange={(e) => setFunding(e.target.value)} className="h-9 rounded-md border border-line bg-white px-2 text-[12px]">
              <option value="">All funding</option>
              <option>Self Funding</option>
              <option>Full Funding</option>
            </select>
            <select aria-label="Raised via" value={via} onChange={(e) => setVia(e.target.value)} className="h-9 rounded-md border border-line bg-white px-2 text-[12px]">
              <option value="">CRM + Franchise</option>
              <option>CRM Web</option>
              <option>Franchise Mobile</option>
            </select>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[960px] text-[12px]">
              <thead className="bg-surface text-left text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Dispute ID</th>
                  <th className="px-3 py-2 font-medium">Raised</th>
                  <th className="px-3 py-2 font-medium">ATM / franchise</th>
                  <th className="px-3 py-2 font-medium">Funding</th>
                  <th className="px-3 py-2 font-medium">Txn / RRN</th>
                  <th className="px-3 py-2 font-medium">Customer / bank</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} onClick={() => navigate(`/operations/reconciliation/failed-txns/${r.id}`)} className="cursor-pointer border-t border-line/70 align-top hover:bg-surface/60">
                    <td className="px-3 py-2 font-semibold text-primary">{r.id}</td>
                    <td className="px-3 py-2">{fmtDt(r.createdAt)}<div className="text-[11px] text-muted">{r.raisedVia} · {r.raisedBy}</div></td>
                    <td className="px-3 py-2"><span onClick={(e) => e.stopPropagation()}><SiteRef id={r.atmId} /></span><div className="text-[11px] text-muted">{r.franchiseName}</div></td>
                    <td className="px-3 py-2"><Badge tone={r.fundingModel === 'Self Funding' ? 'purple' : 'navy'} dot={false}>{r.fundingModel}</Badge></td>
                    <td className="px-3 py-2">{r.txnType}<div className="text-[11px] text-muted">{r.txnDate} {r.txnTime} · RRN {r.rrn || '—'}</div></td>
                    <td className="px-3 py-2">{r.customerName}<div className="text-[11px] text-muted">{r.bankName}</div></td>
                    <td className="px-3 py-2 text-right font-semibold">{rupees(r.amount)}</td>
                    <td className="px-3 py-2"><Badge tone={toneFor(r.status)}>{r.status}</Badge></td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={8} className="px-3 py-8 text-center text-muted">No disputes match.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-white p-4">
          <div className="mb-3 text-[13px] font-semibold">Status</div>
          <StageChart stages={FTD_STATUSES} counts={counts} active={status} onPick={setStatus} />
        </div>
      </div>
    </div>
  )
}
