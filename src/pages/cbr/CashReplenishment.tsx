// Cash Replacement Management (Operations §2) — listing / search / filter / detail of CBR records.
// Full Funding only; reads the CBR Master exclusively (never the Cash Loading Master).
import { useLocation } from 'react-router-dom'
import { cbrMaster } from '@/data/cbr'
import { CashRecordList, Crumbs, FundingChip, SeparationPanel } from './CashRecordUi'
import { cbrBase } from './cashUtils'

export default function CashReplenishment() {
  const { pathname } = useLocation()
  const base = cbrBase(pathname)
  return (
    <div className="max-w-[1440px] space-y-4 pb-12">
      <Crumbs trail={[{ label: 'Operations', to: '/operations' }, { label: 'CBR', to: base }, { label: 'Cash Replacement Management' }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[26px]">Cash Replacement Management</h1>
          <p className="mt-1 text-[13px] text-muted">Create a new CBR and track submitted CBRs through CRM verification, Admin approval and the CBR Master.</p>
        </div>
        <FundingChip kind="CBR" />
      </div>
      <CashRecordList master={cbrMaster} listPath={`${base}/replenishment`} formPath={`${base}/replenishment/new`} intro={<SeparationPanel />} />
    </div>
  )
}
