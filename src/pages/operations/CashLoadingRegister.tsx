// Detailed Cash Loading Register (Operations §3) — Self Funding only; reads the Cash Loading Master
// exclusively. Linked ALF requests (§4) are shown per ATM from the ALF Master.
import { Link } from 'react-router-dom'
import { HandCoins } from 'lucide-react'
import { clMaster } from '@/data/cashLoadingRegisterStore'
import { CashRecordList, Crumbs, FundingChip, SeparationPanel } from '@/pages/cbr/CashRecordUi'

export default function CashLoadingRegister() {
  return (
    <div className="max-w-[1440px] space-y-4 pb-12">
      <Crumbs trail={[{ label: 'Operations', to: '/operations' }, { label: 'Cash Loading Register', to: '/operations/cash-loading' }, { label: 'Register' }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[26px]">Detailed Cash Loading Register</h1>
          <p className="mt-1 text-[13px] text-muted">Self Funding cash loading entries through CRM verification, Admin approval and the Cash Loading Master.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/operations/alf" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50">
            <HandCoins size={13} /> ALF Register
          </Link>
          <FundingChip kind="Cash Loading" />
        </div>
      </div>
      <CashRecordList master={clMaster} listPath="/operations/cash-loading/register" formPath="/operations/cash-loading/new" intro={<SeparationPanel />} />
    </div>
  )
}
