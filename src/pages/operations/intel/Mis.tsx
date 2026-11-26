import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'
import { opsCan, usePermState } from './opsData'
import { CATEGORIES, REPORTS, type Cell as RCell, type ReportDef, type Row } from './misReports'
import { CBR_SITES, EOD_DATES, PENDING_CASH, toIso, uploadKey, useOpsSources, type OpsSources } from './sources'
import { AccessDenied, IntelShell, Panel, SourceTag, inputCls, selectCls } from './ui'
import { apiEnabled } from '@/lib/api'
import { downloadAuthed } from '@/data/docsApi'

/** Reports the backend can export itself (audited, full data set) — GET /ops-intel/mis/reports/:key?format=csv. */
const SERVER_CSV = new Set(['txn', 'field-dispute', 'chargeback', 'complaint', 'wla', 'tds', 'postal-in', 'postal-out', 'task'])

const C = { navy: '#1e3f95', amber: '#d97706', teal: '#0f766e', violet: '#7c3aed', slate: '#94a3b8' }
const fmtCell = (v: RCell, money?: boolean) => (typeof v === 'number' ? (money ? `₹${v.toLocaleString('en-IN')}` : v.toLocaleString('en-IN')) : v || '—')

function SubmissionTrend({ s }: { s: OpsSources }) {
  const [kind, setKind] = useState<'CBR' | 'Cash Loading'>('CBR')
  const data = useMemo(() => {
    const m = new Map<string, { date: string; Submitted: number; Pending: number }>()
    const add = (d: string, ok: boolean) => {
      if (!d) return
      const r = m.get(d) ?? { date: d, Submitted: 0, Pending: 0 }
      if (ok) r.Submitted += 1
      else r.Pending += 1
      m.set(d, r)
    }
    if (kind === 'CBR') {
      EOD_DATES.forEach((d) => CBR_SITES.forEach((site) => add(d, !!s.uploads[uploadKey(site.atmId, d)]?.uploaded)))
      s.cbr.forEach((r) => add(toIso(r.date), !(r.status === 'Draft' || r.status === 'Returned for Correction')))
    } else {
      s.cl.forEach((r) => add(toIso(r.date), !(r.status === 'Draft' || r.status === 'Returned for Correction')))
      s.register.forEach((r) => add(toIso(r.date), true))
    }
    return [...m.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-12).map((r) => ({ ...r, date: r.date.slice(5) }))
  }, [s, kind])
  return (
    <Panel
      kind="live"
      title="Daily submission trend"
      sub={kind === 'CBR' ? 'CBR Master + franchise daily CBR uploads (Full Funding)' : 'Cash Loading Master + register (Self Funding)'}
      action={
        <select aria-label="Funding source" className={selectCls} value={kind} onChange={(e) => setKind(e.target.value as 'CBR' | 'Cash Loading')}>
          <option>CBR</option>
          <option>Cash Loading</option>
        </select>
      }
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Submitted" stackId="a" fill={C.navy} />
            <Bar dataKey="Pending" stackId="a" fill={C.amber} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

function EodPie({ s }: { s: OpsSources }) {
  const data = [
    { name: 'Routine EOD', value: s.eod.filter((r) => r.type === 'Routine').length, fill: C.navy },
    { name: 'Cash Audit EOD', value: s.eod.filter((r) => r.type === 'Cash Audit').length, fill: C.teal },
    { name: 'Monthly EOD', value: s.monthly.length, fill: C.violet },
  ]
  return (
    <Panel kind="live" title="EOD – type-wise records" sub="EOD Master + Monthly EOD reconciliation rows">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2} label={{ fontSize: 11 }}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

const DISPUTE_STAGES = ['New', 'CRM Review', 'Franchise Response', 'Submitted', 'Closed'] as const
function DisputeBar({ s }: { s: OpsSources }) {
  const data = useMemo(() => {
    const z = () => Object.fromEntries(DISPUTE_STAGES.map((k) => [k, 0])) as Record<(typeof DISPUTE_STAGES)[number], number>
    const field = z()
    const cb = z()
    // Field disputes: §18 status → common dispute stage; chargebacks carry their own stage.
    const ftd = (st: string): (typeof DISPUTE_STAGES)[number] =>
      st === 'Draft' ? 'New' : st === 'Pending Verification' || st === 'Returned for Correction' || st === 'Pending Approval' ? 'CRM Review' : st === 'Approved' || st === 'In Progress' ? 'Submitted' : 'Closed'
    s.disputes.forEach((d) => (field[ftd(d.status)] += 1))
    s.chargebacks.forEach((c) => {
      const k = (DISPUTE_STAGES as readonly string[]).includes(c.stage) ? (c.stage as (typeof DISPUTE_STAGES)[number]) : 'New'
      cb[k] += 1
    })
    return DISPUTE_STAGES.map((k) => ({ stage: k, Field: field[k], Chargeback: cb[k] }))
  }, [s.disputes, s.chargebacks])
  return (
    <Panel kind="live" title="Dispute – status monitoring" sub="Dispute Master (Field + Chargeback)">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Field" fill={C.navy} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Chargeback" fill={C.teal} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

type Filters = { q: string; from: string; to: string; month: string; site: string; franchise: string; status: string; funding: string; minAmt: string; extra: Record<string, string> }
const noFilters = (): Filters => ({ q: '', from: '', to: '', month: '', site: '', franchise: '', status: '', funding: '', minAmt: '', extra: {} })
const distinct = (rows: Row[], k?: string) => (k ? [...new Set(rows.map((r) => String(r[k] ?? '')).filter(Boolean))].sort() : [])

function ReportView({ def, s, now }: { def: ReportDef; s: OpsSources; now: number }) {
  const perms = usePermState()
  const [f, setF] = useState<Filters>(noFilters)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(25)
  const rows = useMemo(() => def.build(s, now), [def, s, now])
  const canExport = opsCan('MIS & Reports', 'Export', perms)
  const needFunding = !!def.fundingFilter && !f.funding
  const filtered = useMemo(() => {
    if (needFunding) return []
    const q = f.q.trim().toLowerCase()
    return rows.filter((r) => {
      if (q && !Object.values(r).some((v) => String(v).toLowerCase().includes(q))) return false
      if (def.date && f.from && String(r[def.date]) < f.from) return false
      if (def.date && f.to && String(r[def.date]) > f.to) return false
      if (def.month && f.month && r[def.month] !== f.month) return false
      if (def.site && f.site && !String(r[def.site]).toLowerCase().includes(f.site.trim().toLowerCase())) return false
      if (def.franchise && f.franchise && r[def.franchise] !== f.franchise) return false
      if (def.status && f.status && r[def.status] !== f.status) return false
      if (def.fundingFilter && r[def.fundingFilter] !== f.funding) return false
      if (def.amount && f.minAmt && Number(r[def.amount]) < Number(f.minAmt)) return false
      return Object.entries(f.extra).every(([k, v]) => !v || String(r[k]) === v)
    })
  }, [rows, f, def, needFunding])
  const pages = Math.max(1, Math.ceil(filtered.length / size))
  const cur = Math.min(page, pages)
  const shown = filtered.slice((cur - 1) * size, cur * size)
  const upd = (p: Partial<Filters>) => {
    setF((x) => ({ ...x, ...p }))
    setPage(1)
  }
  const exportCsv = async () => {
    if (apiEnabled && SERVER_CSV.has(def.key)) {
      const q = new URLSearchParams({ format: 'csv', ...(f.from ? { from: f.from } : {}), ...(f.to ? { to: f.to } : {}), ...(def.fundingFilter && f.funding ? { funding: f.funding } : {}) })
      try {
        await downloadAuthed(`/ops-intel/mis/reports/${def.key}?${q}`, `${def.key}.csv`)
        toast('Report exported from the server (date and funding filters applied)')
      } catch {
        /* toasted */
      }
      return
    }
    downloadCsv(`${def.key}-${new Date().toISOString().slice(0, 10)}`, def.cols.map((c) => c.label), filtered.map((r) => def.cols.map((c) => String(r[c.key] ?? ''))))
    toast(`${filtered.length} rows exported`)
  }
  if (!opsCan(def.module, 'View', perms)) return <AccessDenied what={def.name} reason={`Your role / user permissions have no “View” access to ${def.module}. Reports read only from modules you are authorized for.`} />
  return (
    <Panel
      kind="live"
      title={def.name}
      sub={
        <>
          {def.funding ? `Funding model: ${def.funding} only · ` : def.fundingFilter ? 'Funding model filter is mandatory · ' : ''}
          {rows.length.toLocaleString('en-IN')} records ·{' '}
          <Link to={def.link} className="inline-flex items-center gap-0.5 text-primary hover:underline">
            Open module <ExternalLink size={11} />
          </Link>
        </>
      }
      action={
        <Button size="sm" variant="secondary" icon={<Download size={14} />} disabled={!canExport || needFunding || !filtered.length} onClick={exportCsv} title={canExport ? 'Export to Excel (CSV)' : 'No export permission'}>
          Export
        </Button>
      }
    >
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <input aria-label="Search" className={`${inputCls} w-48`} placeholder="Search…" value={f.q} onChange={(e) => upd({ q: e.target.value })} />
        {def.fundingFilter && (
          <select aria-label="Funding model (mandatory)" className={cn(selectCls, needFunding && 'border-amber-500 bg-amber-50')} value={f.funding} onChange={(e) => upd({ funding: e.target.value })}>
            <option value="">Funding model *</option>
            <option>Full Funding</option>
            <option>Self Funding</option>
          </select>
        )}
        {def.date && (
          <>
            <label className="text-[11px] text-muted">
              From
              <input type="date" className={`${inputCls} ml-1`} value={f.from} onChange={(e) => upd({ from: e.target.value })} />
            </label>
            <label className="text-[11px] text-muted">
              To
              <input type="date" className={`${inputCls} ml-1`} value={f.to} onChange={(e) => upd({ to: e.target.value })} />
            </label>
          </>
        )}
        {def.month && (
          <select aria-label="Month" className={selectCls} value={f.month} onChange={(e) => upd({ month: e.target.value })}>
            <option value="">All months</option>
            {distinct(rows, def.month).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        )}
        {def.site && <input aria-label="ATM / Site" className={`${inputCls} w-36`} placeholder="ATM / Site ID" value={f.site} onChange={(e) => upd({ site: e.target.value })} />}
        {def.franchise && (
          <select aria-label="Franchise" className={`${selectCls} max-w-52`} value={f.franchise} onChange={(e) => upd({ franchise: e.target.value })}>
            <option value="">All franchises</option>
            {distinct(rows, def.franchise).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        )}
        {def.status && (
          <select aria-label="Status" className={selectCls} value={f.status} onChange={(e) => upd({ status: e.target.value })}>
            <option value="">All statuses</option>
            {distinct(rows, def.status).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        )}
        {def.extra?.map((x) => (
          <select key={x.key} aria-label={x.label} className={`${selectCls} max-w-48`} value={f.extra[x.key] ?? ''} onChange={(e) => upd({ extra: { ...f.extra, [x.key]: e.target.value } })}>
            <option value="">{x.label}: all</option>
            {distinct(rows, x.key).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        ))}
        {def.amount && <input aria-label="Minimum amount" type="number" min={0} className={`${inputCls} w-32`} placeholder="Min amount ₹" value={f.minAmt} onChange={(e) => upd({ minAmt: e.target.value })} />}
        <button type="button" className="h-9 text-[12px] font-medium text-primary hover:underline" onClick={() => upd(noFilters())}>
          Reset
        </button>
      </div>
      {needFunding ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-6 text-center text-[12.5px] text-amber-800">Select a funding model to load this report. Full Funding (CBR) and Self Funding (Cash Loading) figures are never shown together (§19.1).</div>
      ) : (
        <>
          <div className="scroll-thin overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-[12px]" style={{ minWidth: Math.max(760, def.cols.length * 120) }}>
              <thead className="sticky top-0 bg-surface text-[11px] font-semibold text-ink-2">
                <tr>
                  {def.cols.map((c) => (
                    <th key={c.key} className={cn('px-3 py-2 whitespace-nowrap', (c.num || c.money) && 'text-right')}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {shown.map((r, i) => (
                  <tr key={`${(cur - 1) * size + i}-${String(r[def.cols[0].key])}`} className="hover:bg-surface/60">
                    {def.cols.map((c) => (
                      <td key={c.key} className={cn('px-3 py-1.5 whitespace-nowrap', (c.num || c.money) && 'text-right tabular-nums', c.money && typeof r[c.key] === 'number' && Number(r[c.key]) < 0 && 'text-red-700')}>{fmtCell(r[c.key] ?? '', c.money)}</td>
                    ))}
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={def.cols.length} className="px-3 py-6 text-center text-muted">No records match the filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={cur} pageSize={size} total={filtered.length} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1) }} noun="rows" />
        </>
      )}
    </Panel>
  )
}

export default function Mis() {
  const s = useOpsSources()
  const perms = usePermState()
  const [cat, setCat] = useState<1 | 2 | 3 | 4>(1)
  const [key, setKey] = useState(REPORTS[0].key)
  const [now] = useState(() => Date.now())
  const list = REPORTS.filter((r) => r.category === cat)
  const def = list.find((r) => r.key === key) ?? list[0]
  const pending = s.cbr.filter((r) => PENDING_CASH.has(r.status)).length + s.cl.filter((r) => PENDING_CASH.has(r.status)).length
  if (!opsCan('MIS & Reports', 'View', perms))
    return (
      <IntelShell title="MIS & Reports" active="/operations/mis">
        <AccessDenied what="Operations MIS & Reports" />
      </IntelShell>
    )
  return (
    <IntelShell
      title="MIS & Reports"
      active="/operations/mis"
      sub="Consolidated Operations reporting (§16): summary charts plus detailed, transaction-level reports from the live masters."
      actions={<SourceTag kind="live" />}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <SubmissionTrend s={s} />
        <EodPie s={s} />
        <DisputeBar s={s} />
      </div>
      <p className="text-[11.5px] text-muted">{pending} CBR / Cash Loading records are still in the verification workflow. Charts read live CBR / Cash Loading, EOD and Dispute masters.</p>

      <div role="tablist" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={cat === c.id}
            onClick={() => {
              setCat(c.id)
              setKey(REPORTS.find((r) => r.category === c.id)!.key)
            }}
            className={cn('rounded-xl border p-3 text-left transition-colors', cat === c.id ? 'border-primary bg-primary-soft' : 'border-line bg-white hover:border-primary/40')}
          >
            <div className={cn('text-[13px] font-semibold', cat === c.id ? 'text-primary' : 'text-ink')}>
              {c.id}. {c.title}
            </div>
            <div className="mt-0.5 text-[11px] text-muted">{c.sub}</div>
            <div className="mt-1 text-[11px] text-ink-2">{REPORTS.filter((r) => r.category === c.id).length} reports</div>
          </button>
        ))}
      </div>

      <div className="scroll-thin flex gap-2 overflow-x-auto">
        {list.map((r) => (
          <button key={r.key} type="button" onClick={() => setKey(r.key)} className={cn('h-9 shrink-0 rounded-lg border px-3 text-[12px] font-medium', def.key === r.key ? 'border-primary bg-white text-primary' : 'border-line bg-white text-ink-2 hover:border-primary/40')}>
            {r.name}
          </button>
        ))}
      </div>

      <ReportView key={def.key} def={def} s={s} now={now} />
      <p className="text-[11px] text-muted">Each module also keeps its own detailed reports. Downloads follow the MIS “Export” permission; the backend must apply the same access rules to report APIs.</p>
    </IntelShell>
  )
}
