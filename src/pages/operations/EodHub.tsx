import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardList, FilePlus2, History } from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'
import { Button } from '@/components/ui/Button'
import { useRole } from '@/lib/rbac'
import { useEod } from '@/data/eodStore'
import { opsMeLoader, rightsFor } from './eod2/access'
import { Kpi, Note, OpsPage, RoleTableCard } from './eod2/ui'
import { NcrMarkModal } from './eod2/NcrMarkModal'
import { todayIso } from './eod2/fmt'

type Tile = { title: string; sub: string; to: string; Icon: typeof ClipboardList; theme: HubTileTheme; tag: string; badge: string; actionText: string }

const TILES: Tile[] = [
  { title: 'EOD MASTER — ROUTINE & CASH AUDIT', sub: 'Common EOD Master for CRM machines: counter slip, ₹40,000 rule, verification, docket, OTC, vault openings, cash acknowledgement.', to: '/operations/eod/crm', Icon: ClipboardList, theme: 'blue', tag: 'Types 1 & 2', badge: 'CRM', actionText: 'Open EOD Master' },
  { title: 'MONTHLY EOD', sub: 'Funding-model source: Full Funding → CBR Master, Self Funding → Cash Loading Master. Mismatch highlight, review & correction.', to: '/operations/eod/monthly', Icon: CalendarDays, theme: 'purple', tag: 'Type 3', badge: 'Monthly', actionText: 'Reconcile Monthly EOD' },
  { title: 'EXCEPTION REVIEW', sub: 'Requests that failed the counter-slip rule or were returned — Operations clears or returns them.', to: '/operations/eod/exceptions', Icon: AlertTriangle, theme: 'amber', tag: 'Queue', badge: 'UAT 9', actionText: 'Review exceptions' },
  { title: 'EOD HISTORY — CBR / CASH LOADING', sub: 'Funding-segregated history ledgers fed by CRM EODs and NCR / Perto "EOD done" marks.', to: '/operations/eod/overview', Icon: History, theme: 'emerald', tag: 'Ledgers', badge: 'History', actionText: 'Open history' },
]

export default function EodHub() {
  const { records, history } = useEod()
  const role = useRole()
  opsMeLoader.use()
  const rights = rightsFor('Routine EOD', role)
  const [ncr, setNcr] = useState(false)
  const navigate = useNavigate()
  const k = useMemo(() => {
    const today = todayIso()
    return {
      verify: records.filter((r) => r.stage === 'Pending Verification').length,
      exception: records.filter((r) => r.stage === 'Exception Review').length,
      inFlow: records.filter((r) => ['Docket Generated', 'OTC Generated', 'Vault Opened'].includes(r.stage)).length,
      approval: records.filter((r) => r.stage === 'Cash Acknowledged').length,
      marks: history.filter((h) => h.source === 'NCR / Perto EOD mark' && h.date >= today.slice(0, 8) + '01').length,
    }
  }, [records, history])

  return (
    <OpsPage
      title="EOD Management"
      sub="Exactly three EOD types for CRM machines — Routine, Cash Audit and Monthly. NCR & Perto dispensers only mark “EOD done”."
      actions={
        <>
          <Button variant="secondary" icon={<CheckCircle2 size={15} />} onClick={() => setNcr(true)} disabled={!rights.create}>
            Mark EOD done (NCR / Perto)
          </Button>
          <Button icon={<FilePlus2 size={15} />} disabled={!rights.create} onClick={() => navigate('/operations/eod/crm/new')}>
            Raise EOD (CRM exceptional)
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Pending verification" value={k.verify} tone="amber" />
        <Kpi label="Exception review" value={k.exception} tone="red" />
        <Kpi label="Docket → OTC → vault" value={k.inFlow} tone="blue" />
        <Kpi label="Awaiting approval" value={k.approval} tone="purple" />
        <Kpi label="NCR / Perto marks (month)" value={k.marks} tone="green" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((t) => (
          <HubTile key={t.title} {...t} />
        ))}
      </div>
      <Note tone="blue">
        EOD requests are raised mainly by the franchise from the mobile app; CRM / Operations may raise one on the web only in exceptional cases (reason recorded). Full Funding and Self Funding EODs share
        this master but keep separate sources and reconciliation (spec §5.1, §19.1).
      </Note>
      <RoleTableCard modules={['Routine EOD', 'Cash Audit EOD', 'Monthly EOD']} />
      {ncr && <NcrMarkModal onClose={() => setNcr(false)} />}
    </OpsPage>
  )
}
