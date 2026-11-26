import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { useRole } from '@/lib/rbac'
import { useSites } from '@/data/network'
import { crmEodSites, dispenserEodSites, eodFundingOf, exportHistoryCsv, frNameOf, ledgerOf, useEod, type Ledger } from '@/data/eodStore'
import { opsMeLoader, rightsFor } from './eod2/access'
import { contains, dmy, dt, inr } from './eod2/fmt'
import { Kpi, NoAccess, OpsPage, Panel, SearchBox, Sel, Status, TableWrap, TD, TH, TR, Tabs } from './eod2/ui'
import { NcrMarkModal } from './eod2/NcrMarkModal'

type Tab = Ledger | 'Compliance'

/** EOD history — CBR History (Full Funding) and Cash Loading History (Self Funding) are separate ledgers (§19.1). */
export default function EodOverview() {
  const [params] = useSearchParams()
  const { records, history } = useEod()
  const { sites } = useSites()
  const role = useRole()
  opsMeLoader.use()
  const rights = rightsFor('Routine EOD', role)
  const [tab, setTab] = useState<Tab>(params.get('ledger') === 'Cash Loading History' ? 'Cash Loading History' : 'CBR History')
  const [q, setQ] = useState(params.get('q') ?? '')
  const [machine, setMachine] = useState('')
  const [source, setSource] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [day, setDay] = useState(() => new Date(Date.now() - 86400_000).toISOString().slice(0, 10))
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(15)
  const [ncr, setNcr] = useState(false)

  const ledgerRows = useMemo(
    () => (tab === 'Compliance' ? [] : history.filter((h) => h.ledger === tab && (!machine || h.machineType === machine) && (!source || h.source === source) && (!from || h.date >= from) && (!to || h.date <= to) && contains(q, h.atmId, h.siteId, h.refId, h.docketNo, h.otc, frNameOf(h.frId)))),
    [history, tab, machine, source, from, to, q],
  )
  const compliance = useMemo(() => {
    const eodSites = [...crmEodSites(sites), ...dispenserEodSites(sites)]
    return eodSites
      .map((s) => {
        const crm = s.machineType === 'CRM'
        const rec = crm ? records.find((r) => r.siteId === s.siteId && r.eodDate === day && r.stage !== 'Rejected') : undefined
        const mark = !crm ? history.find((h) => h.refId === `${s.atmId}|${day}`) : undefined
        return { s, crm, funding: eodFundingOf(s)!, done: crm ? !!rec : !!mark, ref: rec?.id ?? mark?.id, stage: rec?.stage }
      })
      .filter((x) => contains(q, x.s.atmId, x.s.siteId, frNameOf(x.s.frId)) && (!machine || x.s.machineType === machine))
  }, [sites, records, history, day, q, machine])

  if (!rights.view) return <NoAccess module="Routine EOD" />
  const all = (l: Ledger) => history.filter((h) => h.ledger === l)
  const pagedLedger = ledgerRows.slice((page - 1) * size, page * size)
  const pagedComp = compliance.slice((page - 1) * size, page * size)
  const reset = () => setPage(1)

  return (
    <OpsPage
      title="EOD History — CBR / Cash Loading"
      sub="Every CRM EOD (after cash acknowledgement) and every NCR / Perto “EOD done” mark is written to the history of its own funding model. The two ledgers never mix."
      back={{ to: '/operations/eod', label: 'EOD Management' }}
      actions={
        <>
          {rights.export && tab !== 'Compliance' && (
            <Button variant="secondary" icon={<Download size={15} />} onClick={() => exportHistoryCsv(ledgerRows, tab.toLowerCase().replace(/\s+/g, '-'))}>
              Export {tab}
            </Button>
          )}
          {rights.create && (
            <Button icon={<CheckCircle2 size={15} />} onClick={() => setNcr(true)}>
              Mark EOD done (NCR / Perto)
            </Button>
          )}
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="CBR History entries" value={all('CBR History').length} hint="Full Funding" onClick={() => { setTab('CBR History'); reset() }} active={tab === 'CBR History'} />
        <Kpi label="Cash Loading History entries" value={all('Cash Loading History').length} hint="Self Funding" tone="green" onClick={() => { setTab('Cash Loading History'); reset() }} active={tab === 'Cash Loading History'} />
        <Kpi label="NCR / Perto marks" value={history.filter((h) => h.source === 'NCR / Perto EOD mark').length} hint="no docket" tone="purple" />
        <Kpi label="CRM EODs written" value={history.filter((h) => h.source !== 'NCR / Perto EOD mark').length} hint="after cash acknowledgement" tone="blue" />
      </div>

      <Tabs value={tab} onChange={(t) => { setTab(t); reset() }} tabs={[{ id: 'CBR History', label: 'CBR History (Full Funding)' }, { id: 'Cash Loading History', label: 'Cash Loading History (Self Funding)' }, { id: 'Compliance', label: 'Daily EOD compliance' }]} />

      <Panel>
        <div className="flex flex-wrap items-end gap-3">
          <SearchBox value={q} onChange={(v) => { setQ(v); reset() }} placeholder="ATM, site, franchise, EOD ID, docket, OTC" />
          <Sel label="Machine" value={machine} onChange={(v) => { setMachine(v); reset() }} options={['CRM', 'NCR', 'Perto']} />
          {tab === 'Compliance' ? (
            <label className="flex flex-col gap-1">
              <span className="text-[10.5px] font-semibold tracking-wide text-slate-500 uppercase">EOD date</span>
              <input type="date" value={day} onChange={(e) => { setDay(e.target.value); reset() }} className="h-9 rounded-lg border border-line px-2 text-[12px]" />
            </label>
          ) : (
            <>
              <Sel label="Source" value={source} onChange={(v) => { setSource(v); reset() }} options={['CRM Routine EOD', 'CRM Cash Audit EOD', 'NCR / Perto EOD mark']} />
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-semibold tracking-wide text-slate-500 uppercase">From</span>
                <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); reset() }} className="h-9 rounded-lg border border-line px-2 text-[12px]" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-semibold tracking-wide text-slate-500 uppercase">To</span>
                <input type="date" value={to} onChange={(e) => { setTo(e.target.value); reset() }} className="h-9 rounded-lg border border-line px-2 text-[12px]" />
              </label>
            </>
          )}
        </div>
      </Panel>

      {tab === 'Compliance' ? (
        <Panel title={`EOD compliance for ${dmy(day)}`} sub={`${compliance.filter((c) => !c.done).length} of ${compliance.length} sites without an EOD`} pad={false}>
          <TableWrap empty={!compliance.length}>
            <thead className="bg-slate-50">
              <tr>
                {['ATM / Site', 'Franchise', 'Machine', 'Funding', 'Ledger', 'Process', 'EOD', 'Reference'].map((h) => (
                  <th key={h} className={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedComp.map((c) => (
                <tr key={c.s.siteId} className={TR}>
                  <td className={TD}>
                    {c.s.atmId}
                    <div className="text-[11px] text-muted">{c.s.siteId}</div>
                  </td>
                  <td className={TD}>{frNameOf(c.s.frId)}</td>
                  <td className={TD}>{c.s.machineType}</td>
                  <td className={TD}>{c.funding}</td>
                  <td className={TD}>{ledgerOf(c.funding)}</td>
                  <td className={TD}>{c.crm ? 'CRM EOD request + docket' : 'EOD done mark only'}</td>
                  <td className={TD}>
                    <Status text={c.done ? (c.stage ?? 'Done') : 'Pending EOD'} tone={c.done ? 'green' : 'red'} />
                  </td>
                  <td className={TD}>{c.ref ? c.crm ? <Link className="text-primary hover:underline" to={`/operations/eod/record/${c.ref}`}>{c.ref}</Link> : c.ref : '—'}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <Pagination page={page} pageSize={size} total={compliance.length} onPage={setPage} onPageSize={(n) => { setSize(n); reset() }} noun="sites" />
        </Panel>
      ) : (
        <Panel title={tab} sub={tab === 'CBR History' ? 'Full Funding sites only (CBR Master).' : 'Self Funding sites only (Cash Loading Master).'} pad={false}>
          <TableWrap empty={!ledgerRows.length}>
            <thead className="bg-slate-50">
              <tr>
                {['Date', 'ATM / Site', 'Franchise', 'Machine', 'Source', 'Reference', 'Docket', 'OTC', 'Amount', 'Detail', 'Recorded by'].map((h) => (
                  <th key={h} className={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedLedger.map((h) => (
                <tr key={h.id} className={TR}>
                  <td className={TD}>{dmy(h.date)}</td>
                  <td className={TD}>
                    {h.atmId}
                    <div className="text-[11px] text-muted">{h.siteId}</div>
                  </td>
                  <td className={TD}>{frNameOf(h.frId)}</td>
                  <td className={TD}>{h.machineType}</td>
                  <td className={TD}>
                    <Status text={h.source} tone={h.source === 'NCR / Perto EOD mark' ? 'purple' : 'blue'} />
                  </td>
                  <td className={TD}>{h.source === 'NCR / Perto EOD mark' ? h.refId : <Link className="text-primary hover:underline" to={`/operations/eod/record/${h.refId}`}>{h.refId}</Link>}</td>
                  <td className={TD}>{h.docketNo ?? '—'}</td>
                  <td className={TD}>{h.otc ?? '—'}</td>
                  <td className={TD}>{h.amount != null ? inr(h.amount) : '—'}</td>
                  <td className={`${TD} max-w-[280px] whitespace-normal`}>{h.text}</td>
                  <td className={TD}>
                    {h.by}
                    <div className="text-[11px] text-muted">{dt(h.at)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <Pagination page={page} pageSize={size} total={ledgerRows.length} onPage={setPage} onPageSize={(n) => { setSize(n); reset() }} noun="entries" />
        </Panel>
      )}
      {ncr && <NcrMarkModal onClose={() => setNcr(false)} />}
    </OpsPage>
  )
}
