import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Download, FilePlus2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { useRole } from '@/lib/rbac'
import { EOD_CATEGORIES, EOD_STAGES, exportEodCsv, useEod, type EodStage } from '@/data/eodStore'
import { opsMeLoader, rightsFor } from './eod2/access'
import { nextActionOf } from './eod2/flow'
import { contains, dmy, inr } from './eod2/fmt'
import { Kpi, NoAccess, OpsPage, Panel, RoleTableCard, SearchBox, Sel, Status, TableWrap, TD, TH, TR } from './eod2/ui'

/** Common EOD Master (spec §5.1.2) — Routine + Cash Audit EODs of CRM machines, both funding models. */
export default function CrmEodDocketList() {
  const { records } = useEod()
  const role = useRole()
  opsMeLoader.use()
  const rights = rightsFor('Routine EOD', role)
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [funding, setFunding] = useState('')
  const [stage, setStage] = useState('')
  const [category, setCategory] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)

  const rows = useMemo(
    () =>
      records.filter(
        (r) =>
          (!type || r.type === type) &&
          (!funding || r.funding === funding) &&
          (!stage || r.stage === stage) &&
          (!category || r.category === category) &&
          (!from || r.eodDate >= from) &&
          (!to || r.eodDate <= to) &&
          contains(q, r.id, r.atmId, r.siteId, r.franchiseName, r.docket?.no, r.otc?.code),
      ),
    [records, type, funding, stage, category, from, to, q],
  )
  const count = (s: EodStage) => records.filter((r) => r.stage === s).length
  const pick = (s: string) => {
    setStage((cur) => (cur === s ? '' : s))
    setPage(1)
  }
  if (!rights.view) return <NoAccess module="Routine EOD" />
  const paged = rows.slice((page - 1) * size, page * size)

  return (
    <OpsPage
      title="EOD Master — Routine & Cash Audit"
      sub="CRM machines only. Full Funding (CBR) and Self Funding (Cash Loading) records are listed together but reconcile against their own sources."
      back={{ to: '/operations/eod', label: 'EOD Management' }}
      actions={
        <>
          {rights.export && (
            <Button variant="secondary" icon={<Download size={15} />} onClick={() => exportEodCsv(rows)}>
              Export
            </Button>
          )}
          {rights.create && (
            <Button icon={<FilePlus2 size={15} />} onClick={() => navigate('/operations/eod/crm/new')}>
              Raise EOD (exceptional)
            </Button>
          )}
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {(['Pending Verification', 'Exception Review', 'Returned for Correction', 'Docket Generated', 'OTC Generated', 'Vault Opened', 'Cash Acknowledged'] as EodStage[]).map((s) => (
          <Kpi key={s} label={s} value={count(s)} tone={s === 'Exception Review' ? 'red' : s === 'Returned for Correction' ? 'amber' : 'navy'} onClick={() => pick(s)} active={stage === s} />
        ))}
      </div>

      <Panel pad>
        <div className="flex flex-wrap items-end gap-3">
          <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1) }} placeholder="EOD ID, ATM, site, franchise, docket, OTC" />
          <Sel label="EOD type" value={type} onChange={(v) => { setType(v); setPage(1) }} options={['Routine', 'Cash Audit']} />
          <Sel label="Funding model" value={funding} onChange={(v) => { setFunding(v); setPage(1) }} options={['Full Funding', 'Self Funding']} />
          <Sel label="Stage" value={stage} onChange={(v) => { setStage(v); setPage(1) }} options={EOD_STAGES} />
          <Sel label="Category" value={category} onChange={(v) => { setCategory(v); setPage(1) }} options={EOD_CATEGORIES} />
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-semibold tracking-wide text-slate-500 uppercase">From</span>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} className="h-9 rounded-lg border border-line px-2 text-[12px]" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-semibold tracking-wide text-slate-500 uppercase">To</span>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} className="h-9 rounded-lg border border-line px-2 text-[12px]" />
          </label>
        </div>
      </Panel>

      <Panel title={`${rows.length} EOD record(s)`} sub="Click a row to open the full workflow, OTC, vault events and history." pad={false}>
        <TableWrap empty={!rows.length}>
          <thead className="bg-slate-50">
            <tr>
              {['EOD ID', 'Type', 'ATM / Site', 'Franchise', 'Funding', 'Category', 'EOD date', 'Counter slip', 'Docket', 'OTC', 'Openings', 'Stage', 'Next action'].map((h) => (
                <th key={h} className={TH}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr key={r.id} className={`${TR} cursor-pointer`} onClick={() => navigate(`/operations/eod/record/${r.id}`)}>
                <td className={TD}>
                  <Link to={`/operations/eod/record/${r.id}`} className="font-semibold text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                    {r.id}
                  </Link>
                  {r.channel !== 'Mobile App' && <div className="text-[10.5px] text-amber-700">CRM exceptional</div>}
                </td>
                <td className={TD}>
                  <Status text={r.type} tone={r.type === 'Routine' ? 'blue' : 'purple'} />
                </td>
                <td className={TD}>
                  <div className="font-medium">{r.atmId}</div>
                  <div className="text-[11px] text-muted">{r.siteId}</div>
                </td>
                <td className={TD}>{r.franchiseName}</td>
                <td className={TD}>
                  <Status text={r.funding} tone={r.funding === 'Full Funding' ? 'navy' : 'green'} />
                </td>
                <td className={TD}>{r.category ?? <span className="text-muted">n/a (SF)</span>}</td>
                <td className={TD}>{dmy(r.eodDate)}</td>
                <td className={TD}>
                  {inr(r.counterSlip.amount)}
                  <div className={`text-[10.5px] ${r.rule.passed ? 'text-emerald-700' : 'text-red-600'}`}>{r.rule.passed ? 'Rule passed' : `Rule failed${r.rule.decision ? ` · ${r.rule.decision}` : ''}`}</div>
                </td>
                <td className={TD}>{r.docket?.no ?? '—'}</td>
                <td className={TD}>{r.otc?.code ?? '—'}</td>
                <td className={TD}>{r.events.length}</td>
                <td className={TD}>
                  <Status text={r.stage} />
                </td>
                <td className={`${TD} text-[11.5px] text-muted`}>{nextActionOf(r)}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <Pagination page={page} pageSize={size} total={rows.length} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1) }} noun="EOD records" />
      </Panel>
      <RoleTableCard modules={['Routine EOD', 'Cash Audit EOD']} />
    </OpsPage>
  )
}
