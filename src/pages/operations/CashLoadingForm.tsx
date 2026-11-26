// Cash Loading entry (Operations §3) — Self Funding sites only. Same workflow pattern as CBR but writes to
// the separate Cash Loading Master; a Full Funding ATM is refused (UAT 2–3).
import { useParams, useSearchParams } from 'react-router-dom'
import { Banknote } from 'lucide-react'
import { clMaster } from '@/data/cashLoadingRegisterStore'
import { CashRecordForm, Crumbs } from '@/pages/cbr/CashRecordUi'

export default function CashLoadingForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const editId = id ?? params.get('edit') ?? undefined
  return (
    <div className="max-w-[1280px] space-y-4 pb-16">
      <Crumbs
        trail={[
          { label: 'Operations', to: '/operations' },
          { label: 'Cash Loading Register', to: '/operations/cash-loading' },
          { label: 'Register', to: '/operations/cash-loading/register' },
          { label: editId ? editId : 'New Cash Loading' },
        ]}
      />
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0066FF] text-white shadow-sm">
          <Banknote size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[26px]">{editId ? `Edit Cash Loading ${editId}` : 'New Cash Loading Entry'}</h1>
          <p className="text-[12.5px] text-slate-500">Self Funding sites · Franchise entry → acknowledgement → CRM verification → Admin approval → Cash Loading Master.</p>
        </div>
      </div>
      <CashRecordForm key={editId ?? 'new'} master={clMaster} listPath="/operations/cash-loading/register" editId={editId} />
    </div>
  )
}
