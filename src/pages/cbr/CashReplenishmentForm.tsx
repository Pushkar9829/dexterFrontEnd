// New CBR form (Operations §2.1) — Full Funding sites only. Identification fields come from the
// Site / Franchise / Account masters; a Self Funding ATM is refused (UAT 1–3).
import { useLocation, useSearchParams } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { cbrMaster } from '@/data/cbr'
import { CashRecordForm, Crumbs } from './CashRecordUi'
import { cbrBase } from './cashUtils'

export default function CashReplenishmentForm() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const editId = params.get('edit') ?? undefined
  const base = cbrBase(pathname)
  return (
    <div className="max-w-[1280px] space-y-4 pb-16">
      <Crumbs trail={[{ label: 'Operations', to: '/operations' }, { label: 'CBR', to: base }, { label: 'Cash Replacement Management', to: `${base}/replenishment` }, { label: editId ? editId : 'New CBR' }]} />
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0066FF] text-white shadow-sm">
          <FileText size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[26px]">{editId ? `Edit CBR ${editId}` : 'New CBR – Cash Replacement'}</h1>
          <p className="text-[12.5px] text-slate-500">Cash Balance Report for Full Funding sites · Franchise entry → acknowledgement → CRM verification → Admin approval → CBR Master.</p>
        </div>
      </div>
      <CashRecordForm key={editId ?? 'new'} master={cbrMaster} listPath={`${base}/replenishment`} editId={editId} />
    </div>
  )
}
