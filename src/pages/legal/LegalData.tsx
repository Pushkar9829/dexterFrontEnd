import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronDown, Table2 } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { PageHeader } from '@/components/ui/Card'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { LEGAL_STATUSES, agreementOf, docsForSite, legalStore, readiness, sendReminder, useLegal, type LegalSite, type LegalState } from '@/data/legal'
import { legalTone } from './ui'

const sel = 'h-[34px] w-full appearance-none rounded-md border border-line bg-white pr-8 pl-3 text-[12px] font-medium text-ink outline-none [field-sizing:content] focus:border-primary sm:w-auto'

const AGR_CELL: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-700',
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-700',
}
const CORE_LABEL = { contactNumber: 'Contact Number', model: 'Model', mf: 'MF' } as const

type Row = LegalSite & { agreement: string; agreementVersion: string; cleared: boolean; approved: number }

function toRows(s: LegalState): Row[] {
  return s.sites.map((site) => {
    const agr = agreementOf(s, site.id)
    const r = readiness(s, site.id)
    return { ...site, agreement: agr?.status ?? 'Action Required', agreementVersion: agr?.version ?? 'v1.0', cleared: r.cleared, approved: r.approved }
  })
}

/** Legal Data — consolidated site legal register (Figma 91:7783). */
export default function LegalData() {
  const state = useLegal()
  const navigate = useNavigate()
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

  const missing = (Object.keys(CORE_LABEL) as (keyof typeof CORE_LABEL)[]).filter((k) => rows.some((r) => !r[k])).map((k) => CORE_LABEL[k])
  const missingNote = missing.length
    ? `${missing.length > 1 ? `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]} are` : `${missing[0]} is`} not provided for some sites.`
    : 'Contact Number, Model and MF are provided for every site shown.'

  const columns: GridColumn<Row>[] = [
    {
      key: 'id', header: 'Site/LOI Number', width: 148, pinned: true, sortable: true,
      render: (r) => (
        <Link to={`/legal/${r.id}`} className="block leading-snug font-medium text-primary underline underline-offset-2">
          {r.id}
          <span className="block">Existing site record</span>
        </Link>
      ),
    },
    {
      key: 'location', header: 'Location', width: 148, sortable: true, filterable: true,
      render: (r) => (
        <span className="block leading-snug whitespace-normal">
          {r.location}
          <span className="block">
            {r.city}, {r.state}
          </span>
        </span>
      ),
    },
    { key: 'franchiseName', header: <span className="block leading-tight whitespace-normal">Name of<br />Franchisee</span>, label: 'Name of Franchisee', width: 148, sortable: true, filterable: true, render: (r) => <span className="block whitespace-normal">{r.franchiseName}</span> },
    { key: 'contactNumber', header: 'Contact Number', width: 148, sortable: true, filterable: true },
    { key: 'model', header: 'Model', width: 148, sortable: true, filterable: true },
    { key: 'mf', header: 'MF', label: 'MF (Master Franchise)', width: 148, sortable: true, render: (r) => (r.mf ? <span className="block whitespace-normal">{r.mf}</span> : <span className="text-muted">—</span>) },
    {
      key: 'agreement', header: 'Agreement Status', width: 148, sortable: true, filterable: true,
      render: (r) => (
        <span className={`block rounded-md px-2 py-1.5 leading-snug ${AGR_CELL[legalTone(r.agreement)] ?? 'bg-surface text-ink-2'}`}>
          {r.agreement}
          <span className="block">Agreement {r.agreementVersion}</span>
        </span>
      ),
    },
    {
      key: 'record', header: 'Record', width: 148, value: () => '',
      render: (r) => (
        <Link to={`/legal/${r.id}`} className="block leading-snug text-primary hover:underline">
          View Master
          <span className="flex items-center gap-1">
            Site Record <ArrowRight size={13} />
          </span>
        </Link>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Legal Data" sub="Consolidated site legal register · Open a site to view its Master Site Record." />
      <div className="-mt-2 mb-4 flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
        <span className="flex items-center gap-1.5">
          <Table2 size={14} className="text-primary" />
          {all.length} existing site record{all.length === 1 ? '' : 's'} · 7 core columns
        </span>
        <span>— = Not provided</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[12px] text-muted">Filter by</span>
        <Dropdown label="Sites" value={clearance} onChange={setClearance}>
          <option value="">All sites</option>
          <option value="pending">Compliance pending</option>
          <option value="cleared">Legally cleared</option>
        </Dropdown>
        <Dropdown
          label="States"
          value={st}
          onChange={(v) => {
            setSt(v)
            setCity('')
          }}
        >
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Dropdown>
        <Dropdown label="Cities" value={city} onChange={setCity}>
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Dropdown>
        <Dropdown label="Agreement statuses" value={agr} onChange={setAgr}>
          <option value="">All agreement statuses</option>
          {LEGAL_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Dropdown>
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
      </div>

      {/* rows open the Master Site Record ("Open a row to view its Master Site Record") */}
      <div
        className="[&_tbody_tr]:cursor-pointer"
        onClick={(e) => {
          const t = e.target as HTMLElement
          if (t.closest('a,button,input,select,label,thead')) return
          const href = t.closest('tr')?.querySelector('a[href^="/legal/"]')?.getAttribute('href')
          if (href) navigate(href)
        }}
      >
        <ExcelGrid
          title="Legal data register"
          countLabel={`${rows.length} record${rows.length === 1 ? '' : 's'}`}
          rows={rows}
          columns={columns}
          rowId={(r) => r.id}
          searchPlaceholder="Search site, location or franchisee"
          letters
          selectable
          hideSelectionBar
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
          noun={rows.length === 1 ? 'existing site record' : 'existing site records'}
          exportName="legal-data-register"
          emptyState="No site records match these filters."
          footerLeft={(sel) => `Selected: ${sel.length} record${sel.length === 1 ? '' : 's'} · 7 core columns · Site/LOI Number pinned`}
          footerRight="Open a row to view its Master Site Record"
        />
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-[12px] text-muted">
        <span>{missingNote}</span>
        <span>Site links open the existing Master Site Record · Legal summary</span>
      </div>
    </div>
  )
}

function Dropdown({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <label className="relative w-full sm:w-auto">
      <select aria-label={label} className={sel} value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute top-[10px] right-2.5 text-ink-2" />
    </label>
  )
}
