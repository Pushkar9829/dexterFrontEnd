import { Link } from 'react-router-dom'
import { ArrowRight, ArrowDown } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { fundingOf } from '@/data/workflow'
import { useComplaintMaster } from './opsData'
import { useOpsSources } from './sources'
import { IntelShell, Panel, SourceTag, Table } from './ui'

type MasterRow = { no: number; name: string; purpose: string; linked: string; count: number; detail: string; to: string }

export default function Masters() {
  const s = useOpsSources()
  const categories = useComplaintMaster()
  const frs = s.franchises.filter((f) => f.tier === 'Franchise')
  const groups = s.franchises.filter((f) => f.tier !== 'Franchise')
  const funding = s.sites.reduce<Record<string, number>>((m, x) => ({ ...m, [fundingOf(x.siteType)]: (m[fundingOf(x.siteType)] ?? 0) + 1 }), {})
  const rows: MasterRow[] = [
    { no: 1, name: 'Site Master', purpose: 'ATM Site Information', linked: 'All ERP Modules', count: s.sites.length, detail: `${s.sites.filter((x) => x.operational).length} operational`, to: '/master-data/sites' },
    { no: 2, name: 'Franchise Master', purpose: 'Franchise Information', linked: 'CBR, Cash Loading, EOD, Complaint', count: frs.length, detail: `${frs.filter((f) => f.status === 'Active').length} active`, to: '/franchise/franchise' },
    { no: 3, name: 'Master Franchise / Group Master', purpose: 'Franchise Group Mapping', linked: 'Site Master, Forecasting, Reports', count: groups.length, detail: `${groups.filter((f) => f.tier === 'Super Master').length} super master · ${groups.filter((f) => f.tier === 'Master').length} master`, to: '/franchise/master' },
    { no: 4, name: 'CBR Master', purpose: 'Full Funding Cash Replacement Records', linked: 'CBR, Monthly EOD, MIS', count: s.cbr.length + s.cbrDaily.length, detail: `${s.cbr.length} CBR / cash replacement records · ${s.cbrDaily.length} daily CBR rows`, to: '/cbr' },
    { no: 5, name: 'Cash Loading Master', purpose: 'Self Funding Cash Loading Records', linked: 'Cash Loading, Monthly EOD, MIS', count: s.cl.length + s.register.length, detail: `${s.cl.length} master records · ${s.register.length} register rows`, to: '/operations/cash-loading' },
    { no: 6, name: 'ALF Master', purpose: 'Additional Loading Fund Records', linked: 'Cash Loading, Forecasting', count: s.alf.length, detail: `${s.alf.filter((a) => a.status === 'Approved').length} approved`, to: '/operations/alf-forecast' },
    { no: 7, name: 'EOD Master', purpose: 'Routine, Cash Audit & Monthly EOD', linked: 'CBR, Cash Loading, MIS', count: s.eod.length + s.monthly.length, detail: `${s.eod.filter((r) => r.type === 'Routine').length} routine · ${s.eod.filter((r) => r.type === 'Cash Audit').length} cash audit · ${s.monthly.length} monthly`, to: '/operations/eod' },
    { no: 8, name: 'Transaction Master', purpose: 'ATM Transaction Records', linked: 'Forecasting, Disputes, MIS', count: s.txn.length, detail: `${new Set(s.txn.map((t) => t.atmId)).size} sites · ${s.txn.filter((t) => t.status === 'Verified').length} verified`, to: '/operations/txn-data' },
    { no: 9, name: 'Complaint Master', purpose: 'Complaint Records', linked: 'Operations, Task, Escalation', count: s.complaints.length, detail: `${s.complaints.filter((c) => c.status === 'Open').length} open · ${categories.filter((c) => c.active).length} categories`, to: '/operations/complaints' },
    { no: 10, name: 'Reconciliation / Dispute Master', purpose: 'Field & Chargeback Disputes', linked: 'CBR, Cash Loading, Transaction', count: s.disputes.length + s.chargebacks.length, detail: `${s.disputes.length} field · ${s.chargebacks.length} chargeback`, to: '/operations/reconciliation' },
    { no: 11, name: 'Postal / Courier Master', purpose: 'Inward & Outward Dak', linked: 'Legal, Finance, HRMS', count: s.inward.length + s.outward.length, detail: `${s.inward.length} inward · ${s.outward.length} outward`, to: '/operations/daak' },
    { no: 12, name: 'WLA Statement Master', purpose: 'Uploaded Bank Statements', linked: 'Finance, Accounts', count: s.wla.length, detail: `${s.wla.filter((w) => w.status === 'Accepted').length} accepted · ${s.wla.filter((w) => w.status === 'Pending Verification').length} pending verification`, to: '/operations/wla-statement' },
    { no: 13, name: 'TDS Document Master', purpose: 'TDS Letters', linked: 'Finance, Franchise App', count: s.tds.length, detail: `${s.tds.filter((w) => w.status === 'Active').length} active · ${new Set(s.tds.map((t) => t.fy)).size} financial years`, to: '/operations/tds' },
    { no: 14, name: 'DMS Dashboard Master', purpose: 'DMS Operational Records', linked: 'MIS & Reports', count: s.monthly.length, detail: 'DMS vs physical closing per site-month (Monthly EOD reconciliation)', to: '/operations/mis' },
    { no: 15, name: 'Address Master', purpose: 'Reusable Address Records', linked: 'Onboarding Setup, Postal, Legal', count: s.addresses.length, detail: 'Snapshot frozen on each dispatch', to: '/operations/daak' },
  ]
  const chain = ['Dexter India Site Master', 'Master Franchise / Group', 'Master Franchise', 'Franchise', 'ATM Sites']
  return (
    <IntelShell
      title="Operations Master Data"
      active="/operations/masters"
      sub="Operations Master Data architecture (§13.1). Common entities (Site, Franchise, Group) are referenced from the central masters — modules keep only their own transactions."
      actions={<SourceTag kind="live" />}
    >
      <Panel title="Required master data · 15 masters" sub="Record counts are read live from each module's store">
        <Table head={['S.N.', 'Master Data', 'Purpose', 'Linked Modules', 'Records', 'Detail', '']} minWidth={980}>
          {rows.map((r) => (
            <tr key={r.no}>
              <td className="px-3 py-2 text-muted">{r.no}</td>
              <td className="px-3 py-2 font-semibold text-ink">{r.name}</td>
              <td className="px-3 py-2">{r.purpose}</td>
              <td className="px-3 py-2 text-ink-2">{r.linked}</td>
              <td className="px-3 py-2 text-[14px] font-semibold text-primary tabular-nums">{r.count.toLocaleString('en-IN')}</td>
              <td className="px-3 py-2 text-[11.5px] text-muted">{r.detail}</td>
              <td className="px-3 py-2">
                <Link to={r.to} className="inline-flex items-center gap-1 text-[12px] font-medium whitespace-nowrap text-primary hover:underline">
                  Open <ArrowRight size={13} />
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Site Master – common data relationship (§13.2)" sub="Site ID / ATM ID is the primary reference; Franchise ID, Master Franchise ID, funding model and operational status come from Site Master">
          <div className="flex flex-col items-start gap-1">
            {chain.map((c, i) => (
              <div key={c} className="flex flex-col items-start">
                <span className="rounded-md border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink" style={{ marginLeft: i * 16 }}>{c}</span>
                <ArrowDown size={14} className="text-muted" style={{ marginLeft: i * 16 + 12 }} />
              </div>
            ))}
            <div className="flex flex-wrap gap-1.5" style={{ marginLeft: chain.length * 16 }}>
              {['CBR', 'Cash Loading', 'EOD', 'Transaction', 'Complaint', 'Dispute', 'Installation', 'Forecasting'].map((m) => (
                <Badge key={m} tone="navy" dot={false}>{m}</Badge>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[11.5px] text-muted">When a site's franchise changes, historical transactions keep their original mapping (history preserved in Site Master).</p>
        </Panel>
        <Panel title="Funding model segregation (§19.1)" sub="CBR and Cash Loading financial records never mix">
          <div className="mb-3 flex flex-wrap gap-2">
            {Object.entries(funding).map(([k, v]) => (
              <Badge key={k} tone={k === 'Full Funding' ? 'blue' : k === 'Self Funding' ? 'green' : 'gray'} dot={false}>{k}: {v} sites</Badge>
            ))}
          </div>
          <div className="space-y-2 text-[12px]">
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-blue-900"><b>FULL FUNDING:</b> Site Master → CBR Master → Full Funding EOD → Monthly CBR Reconciliation → MIS</div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900"><b>SELF FUNDING:</b> Site Master → Cash Loading Master → Self Funding EOD → Monthly Cash Loading Reconciliation → MIS</div>
            <div className="rounded-md border border-line bg-surface px-3 py-2 text-ink-2"><b>COMMON:</b> Transaction, Site and Franchise Masters are linked to both models through controlled references.</div>
          </div>
        </Panel>
      </div>
    </IntelShell>
  )
}
