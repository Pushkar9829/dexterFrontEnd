import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileBarChart2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { logPayout, monthLabel } from '@/data/payout'
import { PayoutPage } from '../PayoutShell'
import { actor, buildView, emptyFilters, fyOfMonth, optionLists, useModel, type Filters, type VerticalSel } from './compute'
import { REPORTS, type ReportGroup } from './reportDefs'
import { FInput, FSelect, ProvisionalNote, ResultTable } from './ui'

const GROUPS: ReportGroup[] = ['Franchise Model', 'Business Model', 'Consolidated']

/** Report catalogue (§13) — used on the MIS & Reports tab and the Reports page. */
export function ReportCatalogue({ group = '' }: { group?: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {GROUPS.filter((g) => !group || g === group).map((g) => (
        <section key={g} className="rounded-xl border border-line bg-white">
          <h3 className="border-b border-line-soft px-4 py-3 text-[14px] font-semibold text-ink">{g} Reports <span className="text-[11px] font-normal text-muted">({REPORTS.filter((r) => r.group === g).length})</span></h3>
          <ul className="divide-y divide-line-soft">
            {REPORTS.filter((r) => r.group === g).map((r) => (
              <li key={r.id}>
                <Link to={`/finance/payouts/reports?r=${r.id}`} className="flex items-center gap-2 px-4 py-2 text-[12.5px] text-ink-2 hover:bg-surface hover:text-primary">
                  <FileBarChart2 size={14} className="shrink-0 text-primary" />
                  {r.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default function ReportsPage() {
  const m = useModel()
  const [params, setParams] = useSearchParams()
  const id = params.get('r') ?? ''
  const report = REPORTS.find((r) => r.id === id)
  const [f, setF] = useState<Filters>(() => emptyFilters(m.latestMonth, fyOfMonth(m.latestMonth || '2026-09')))
  const [vf, setVf] = useState('')
  const opts = useMemo(() => optionLists(m), [m])
  const set = (k: keyof Filters) => (val: string) => setF((x) => ({ ...x, [k]: val }))
  const vertical: VerticalSel = report ? (report.group === 'Consolidated' ? ((vf || 'Consolidated') as VerticalSel) : report.group) : 'Consolidated'
  const eff = useMemo(() => ({ ...f, vertical }), [f, vertical])
  const view = useMemo(() => (report ? buildView(m, eff) : null), [m, eff, report])
  const data = useMemo(() => (report && view ? report.build(m, view, f.month) : null), [report, view, m, f.month])
  const cats = vertical === 'Business Model' ? opts.bmCategories : vertical === 'Franchise Model' ? opts.frCategories.map((c) => ({ value: `FR|${c}`, label: `FR · ${c}` })) : [...opts.frCategories.map((c) => ({ value: `FR|${c}`, label: `FR · ${c}` })), ...opts.bmCategories]
  const mfs = vertical === 'Business Model' ? opts.mfBm : vertical === 'Franchise Model' ? opts.mfFr : [...new Set([...opts.mfFr, ...opts.mfBm])].sort()
  const smfs = vertical === 'Business Model' ? opts.smfBm : vertical === 'Franchise Model' ? opts.smfFr : [...new Set([...opts.smfFr, ...opts.smfBm])].sort()
  return (
    <PayoutPage title="MIS & Reports" sub="Franchise Model, Business Model and Consolidated reports generated from payout records (§13). Every export is recorded in the payout audit log." crumbs={['Payout Overview', 'MIS & Reports']}>
      {!report ? (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <FSelect label="Vertical" value={vf} onChange={setVf} options={GROUPS} all="All verticals" className="w-[220px]" />
          </div>
          <ReportCatalogue group={vf} />
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" icon={<ArrowLeft size={14} />} onClick={() => setParams({})}>All reports</Button>
            <h2 className="text-[20px] font-semibold text-ink">{report.name}</h2>
            <span className="rounded bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">{report.group}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-4 xl:grid-cols-8">
            <FSelect label="Financial Year" value={f.fy} onChange={set('fy')} options={m.fys} all="All years" />
            <FSelect label="Month" value={f.month} onChange={set('month')} options={m.months.map((x) => ({ value: x, label: monthLabel(x) }))} all="All months" />
            {report.group === 'Consolidated' ? <FSelect label="Vertical" value={vf} onChange={setVf} options={['Franchise Model', 'Business Model']} all="Consolidated" /> : <FInput label="Vertical" value={report.group} onChange={() => undefined} />}
            <FSelect label="Site Category" value={f.category} onChange={set('category')} options={cats} />
            <FInput label="ATM ID / Site ID" value={f.atm} onChange={set('atm')} placeholder="Search" />
            <FSelect label="Master Franchise" value={f.mf} onChange={set('mf')} options={mfs} />
            <FSelect label="Super MF" value={f.smf} onChange={set('smf')} options={smfs} />
            <div className="flex items-end">
              <Button variant="secondary" icon={<RotateCcw size={14} />} onClick={() => { setF(emptyFilters(m.latestMonth, fyOfMonth(m.latestMonth || '2026-09'))); setVf('') }}>Reset</Button>
            </div>
          </div>
          {data?.note && <ProvisionalNote>{data.note}</ProvisionalNote>}
          {data && (
            <ResultTable
              key={report.id}
              title={`${report.name} · ${f.month ? monthLabel(f.month) : 'All months'}`}
              data={data}
              fileName={`${report.name}_${f.month || 'all'}`}
              onExport={(n) => logPayout({ by: actor(), area: 'MIS & Reports', ref: report.name, action: `Exported ${n} rows (CSV)`, after: `FY ${f.fy || 'all'} · ${f.month || 'all months'} · ${vertical}${f.category ? ` · ${f.category}` : ''}${f.atm ? ` · ${f.atm}` : ''}${f.mf ? ` · MF ${f.mf}` : ''}${f.smf ? ` · SMF ${f.smf}` : ''}` })}
            />
          )}
        </div>
      )}
    </PayoutPage>
  )
}
