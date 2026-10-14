import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, FileWarning, Hourglass, ShieldCheck } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { PageHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/KpiCard'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { LEGAL_STATUSES, agreementOf, docsForSite, legalStore, readiness, sendReminder, useLegal, type LegalSite, type LegalState } from '@/data/legal'
import { StatusBadge } from './ui'

const sel = 'h-9 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink outline-none focus:border-primary sm:w-auto'

type Row = LegalSite & { agreement: string; agreementVersion: string; cleared: boolean; approved: number }

function toRows(s: LegalState): Row[] {
  return s.sites.map((site) => {
    const agr = agreementOf(s, site.id)
    const r = readiness(s, site.id)
    return { ...site, agreement: agr?.status ?? 'Action Required', agreementVersion: agr?.version ?? 'v1.0', cleared: r.cleared, approved: r.approved }
  })
}

/** Legal Data — consolidated site legal register. */
export default function LegalData() {
  const state = useLegal()
  const all = useMemo(() => toRows(state), [state])
  const [clearance, setClearance] = useState('')
  const [st, setSt] = useState('')
  const [city, setCity] = useState('')
  const [agr, setAgr] = useState('')

  const states = [...new Set(all.map((r) => r.state))].sort()
  const cities = [...new Set(all.filter((r) => !st || r.state === st).map((r) => r.city))].sort()

  const rows = all.filter(
    (r) =>
      (!clearance || (clearance === 'cleared' ? r.cleared : !r.cleared)) &&
      (!st || r.state === st) &&
      (!city || r.city === city) &&
      (!agr || r.agreement === agr),
  )

  const count = (pred: (r: Row) => boolean) => all.filter(pred).length

  const columns: GridColumn<Row>[] = [
    {
      key: 'id', header: 'Site/LOI Number', width: 190, pinned: true, sortable: true,
      render: (r) => (
        <Link to={`/legal/${r.id}`} className="block leading-tight">
          <span className="font-semibold text-primary hover:underline">{r.id}</span>
          <span className="block text-[11px] text-muted">{r.cleared ? 'Legally cleared' : `${r.approved} of 3 approved`}</span>
        </Link>
      ),
    },
    { key: 'location', header: 'Location', width: 230, sortable: true, render: (r) => <span>{r.location}<span className="block text-[11px] text-muted">{r.city}, {r.state}</span></span> },
    { key: 'franchiseName', header: 'Name of Franchisee', width: 230, sortable: true, filterable: true },
    { key: 'contactNumber', header: 'Contact Number', width: 160 },
    { key: 'model', header: 'Model', width: 130, filterable: true },
    { key: 'mf', header: 'MF', label: 'MF (Master Franchise)', width: 220, filterable: true },
    {
      key: 'agreement', header: 'Agreement Status', width: 200, sortable: true,
      render: (r) => (
        <span className="flex flex-col items-start gap-0.5">
          <StatusBadge status={r.agreement} />
          <span className="text-[11px] text-muted">Agreement {r.agreementVersion}</span>
        </span>
      ),
    },
    {
      key: 'record', header: 'Record', width: 210, value: () => '',
      render: (r) => (
        <Link to={`/legal/${r.id}`} className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
          View Master Site Record <ArrowRight size={13} />
        </Link>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Legal Data" sub="Consolidated site legal register · Open a site to view its Master Site Record." />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Site records" value={all.length} caption="7 core columns · — = Not provided" icon={<ShieldCheck size={18} />} />
        <StatCard label="Legally cleared" value={count((r) => r.cleared)} caption="LOI, Affidavit & Agreement approved" icon={<CheckCircle2 size={18} />} />
        <StatCard label="Agreement action required" value={count((r) => r.agreement === 'Action Required')} caption="Signed copy pending with franchisee" icon={<FileWarning size={18} />} />
        <StatCard label="Under review" value={count((r) => r.agreement === 'Under Review')} caption="Signed agreements awaiting review" icon={<Hourglass size={18} />} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-3">
        <span className="mr-1 text-[12px] font-semibold text-ink-2">Filter by</span>
        <select aria-label="Sites" className={sel} value={clearance} onChange={(e) => setClearance(e.target.value)}>
          <option value="">All sites</option>
          <option value="pending">Compliance pending</option>
          <option value="cleared">Legally cleared</option>
        </select>
        <select
          aria-label="States"
          className={sel}
          value={st}
          onChange={(e) => {
            setSt(e.target.value)
            setCity('')
          }}
        >
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select aria-label="Cities" className={sel} value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select aria-label="Agreement statuses" className={sel} value={agr} onChange={(e) => setAgr(e.target.value)}>
          <option value="">All agreement statuses</option>
          {LEGAL_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {(clearance || st || city || agr) && (
          <button
            className="text-[12px] font-semibold text-primary hover:underline"
            onClick={() => {
              setClearance('')
              setSt('')
              setCity('')
              setAgr('')
            }}
          >
            Clear filters
          </button>
        )}
        <span className="text-[12px] text-muted sm:ml-auto">
          {rows.length} of {all.length} site records · — = Not provided
        </span>
      </div>

      <ExcelGrid
        title="Legal data register"
        countLabel={`${rows.length} record${rows.length === 1 ? '' : 's'}`}
        rows={rows}
        columns={columns}
        rowId={(r) => r.id}
        searchPlaceholder="Search site, location or franchisee"
        selectable
        bulkActions={(ids, clear) => (
          <span className="flex flex-wrap gap-3">
            <button
              className="font-semibold text-primary hover:underline"
              onClick={() => {
                const pick = all.filter((r) => ids.includes(r.id))
                downloadCsv('legal-data-selected', ['Site/LOI Number', 'Location', 'Name of Franchisee', 'Contact Number', 'Model', 'MF', 'Agreement Status'], pick.map((r) => [r.id, r.location, r.franchiseName, r.contactNumber, r.model, r.mf, `${r.agreement} · ${r.agreementVersion}`]))
                clear()
              }}
            >
              Export selected
            </button>
            <button
              className="font-semibold text-primary hover:underline"
              onClick={() => {
                const pending = ids.flatMap((id) => docsForSite(legalStore.get(), id).filter((d) => d.status === 'Action Required' || d.status === 'Resubmission Required'))
                pending.forEach((d) => sendReminder(d.id))
                toast(pending.length ? `${pending.length} reminder${pending.length > 1 ? 's' : ''} sent to franchisees · recorded in audit history` : 'Nothing pending with the selected franchisees', pending.length ? 'success' : 'info')
                clear()
              }}
            >
              Send reminders
            </button>
          </span>
        )}
        noun="sites"
        exportName="legal-data-register"
        emptyState="No site records match these filters."
        footerLeft="7 core columns · Site/LOI Number pinned · Open a row to view its Master Site Record"
        footerRight="Site links open the existing Master Site Record · Legal summary"
      />
    </div>
  )
}
