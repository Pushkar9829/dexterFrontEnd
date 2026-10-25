import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building,
  CreditCard,
  Landmark,
  Save,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import {
  CLF_SETTLEMENT_BANKS,
  CLF_STATUS,
  createEmptyClfRecord,
  deleteClfRecord,
  getClfRecord,
  nextClfId,
  saveClfRecord,
  type ClfRecord,
} from '@/data/financeClf'
import { inr } from '@/data/financeSd'

export default function ClfRecordPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'

  const [record, setRecord] = useState<ClfRecord>(() => {
    if (!isNew && id) {
      const found = getClfRecord(id)
      if (found) return JSON.parse(JSON.stringify(found))
    }
    const empty = createEmptyClfRecord()
    empty.id = nextClfId()
    return empty
  })

  useEffect(() => {
    if (!isNew && id) {
      const found = getClfRecord(id)
      if (found) setRecord(JSON.parse(JSON.stringify(found)))
    }
  }, [id, isNew])

  const updateField = <K extends keyof ClfRecord>(key: K, value: ClfRecord[K]) => {
    setRecord((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    if (!record.franchiseeName.trim()) {
      toast('Franchisee Name is required', 'info')
      return
    }
    if (!record.siteId.trim()) {
      toast('Site ID is required', 'info')
      return
    }
    if (!record.clfAmount.trim() || Number(record.clfAmount) <= 0) {
      toast('Valid CLF Amount is required', 'info')
      return
    }

    const saved = saveClfRecord(record)
    toast(`CLF record ${saved.id} saved successfully!`)
    navigate('/finance/clf')
  }

  const handleDelete = () => {
    if (confirm(`Delete CLF record ${record.id}? This cannot be undone.`)) {
      deleteClfRecord(record.id)
      toast(`Deleted CLF record ${record.id}`, 'info')
      navigate('/finance/clf')
    }
  }

  return (
    <div className="mx-auto max-w-[1080px] pb-16">
      {/* Top Header Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => navigate('/finance/clf')}
            className="h-8 border-[#CBD5E1] bg-white px-2.5 text-[#475569] hover:bg-[#F8FAFC]"
          >
            <ArrowLeft size={14} className="mr-1" /> Back to CLF List
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold tracking-tight text-[#1E293B]">
                {isNew ? 'New Cash Loading Fund (CLF) Entry' : `CLF Record · ${record.id}`}
              </h1>
              <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                {record.clfStatus} Installment
              </span>
            </div>
            <p className="text-[12px] text-[#64748B]">
              {isNew
                ? 'Create a new cash loading fund installment record for an active franchisee ATM terminal.'
                : `Review and update CLF payment reference, sender bank, and reconciliation for ${record.franchiseeName || 'franchisee'}.`}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleDelete}
              className="border-red-200 bg-white text-red-600 hover:bg-red-50 text-[12.5px]"
            >
              <Trash2 size={14} className="mr-1.5" /> Delete
            </Button>
          )}

          <Button
            type="button"
            size="md"
            onClick={handleSave}
            className="bg-[#0066FF] px-4 font-semibold text-white shadow-sm hover:bg-[#0052cc] text-[12.5px]"
          >
            <Save size={14} className="mr-1.5" /> Save Record
          </Button>
        </div>
      </div>

      {/* Main Form Cards */}
      <div className="space-y-6">
        {/* Section 1: Franchisee & Site */}
        <div className="overflow-hidden rounded-xl border border-[#DCE8F6] bg-white shadow-xs">
          <div className="flex items-center gap-2 border-b border-[#E2EEFB] bg-[#F8FAFD] px-5 py-3">
            <Building size={16} className="text-[#0066FF]" />
            <h2 className="text-[14px] font-bold text-[#1E293B]">
              1. Franchisee &amp; Site Details
            </h2>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[#475569]">
                Franchisee Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={record.franchiseeName}
                onChange={(e) => updateField('franchiseeName', e.target.value)}
                placeholder="e.g. Rameshwar Kulkarni"
                className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[#475569]">
                Franchisee Contact No
              </label>
              <input
                type="text"
                value={record.franchiseeNo}
                onChange={(e) => updateField('franchiseeNo', e.target.value)}
                placeholder="e.g. 98220 41765"
                className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[#475569]">
                Site ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={record.siteId}
                onChange={(e) => updateField('siteId', e.target.value)}
                placeholder="e.g. ST-MH-PUN-00124"
                className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[#475569]">
                ATM ID
              </label>
              <input
                type="text"
                value={record.atmId}
                onChange={(e) => updateField('atmId', e.target.value)}
                placeholder="e.g. DX-MH-01482"
                className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12.5px] font-mono text-[#1E293B] outline-none focus:border-[#0066FF]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[#475569]">
                Cash Live Date
              </label>
              <input
                type="date"
                value={record.cashLiveDate}
                onChange={(e) => updateField('cashLiveDate', e.target.value)}
                className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[#475569]">
                HPY Account Number
              </label>
              <input
                type="text"
                value={record.hpyAccount}
                onChange={(e) => updateField('hpyAccount', e.target.value)}
                placeholder="e.g. 920003104500"
                className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12.5px] font-mono text-[#1E293B] outline-none focus:border-[#0066FF]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: CLF Payment & Transfer */}
        <div className="overflow-hidden rounded-xl border border-[#DCE8F6] bg-white shadow-xs">
          <div className="flex items-center gap-2 border-b border-[#E2EEFB] bg-[#F8FAFD] px-5 py-3">
            <CreditCard size={16} className="text-[#0066FF]" />
            <h2 className="text-[14px] font-bold text-[#1E293B]">
              2. CLF Payment &amp; Transfer Details
            </h2>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[#475569]">
                CLF Installment / Status
              </label>
              <select
                value={record.clfStatus}
                onChange={(e) => updateField('clfStatus', e.target.value)}
                className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
              >
                {CLF_STATUS.map((st) => (
                  <option key={st} value={st}>
                    {st} Installment
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[#475569]">
                CLF Amount (INR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={record.clfAmount}
                onChange={(e) => updateField('clfAmount', e.target.value)}
                placeholder="e.g. 250000"
                className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12.5px] font-bold text-[#1E293B] outline-none focus:border-[#0066FF]"
              />
              <div className="mt-1 text-[11px] text-[#64748B]">
                Formatted: <strong className="text-[#1E293B]">{inr(record.clfAmount)}</strong>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[#475569]">
                Payment Date
              </label>
              <input
                type="date"
                value={record.paymentDate}
                onChange={(e) => updateField('paymentDate', e.target.value)}
                className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[#475569]">
                Transfer Time
              </label>
              <input
                type="time"
                value={record.transferTime}
                onChange={(e) => updateField('transferTime', e.target.value)}
                className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11.5px] font-semibold text-[#475569]">
                NEFT-UTR-IMPS Number
              </label>
              <input
                type="text"
                value={record.utr}
                onChange={(e) => updateField('utr', e.target.value)}
                placeholder="e.g. HDFCN2026081249102"
                className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12.5px] font-mono text-[#1E293B] outline-none focus:border-[#0066FF]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Sender & Settlement Bank */}
        <div className="overflow-hidden rounded-xl border border-[#DCE8F6] bg-white shadow-xs">
          <div className="flex items-center gap-2 border-b border-[#E2EEFB] bg-[#F8FAFD] px-5 py-3">
            <Landmark size={16} className="text-[#0066FF]" />
            <h2 className="text-[14px] font-bold text-[#1E293B]">
              3. Sender &amp; Settlement Bank Details
            </h2>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[#475569]">
                FR Bank Name
              </label>
              <input
                type="text"
                value={record.frBank}
                onChange={(e) => updateField('frBank', e.target.value)}
                placeholder="e.g. HDFC Bank"
                className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[#475569]">
                Account Holder Name
              </label>
              <input
                type="text"
                value={record.holder}
                onChange={(e) => updateField('holder', e.target.value)}
                placeholder="e.g. Sandeep Kulkarni"
                className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[#475569]">
                Settlement Bank Name
              </label>
              <select
                value={record.settlementBank}
                onChange={(e) => updateField('settlementBank', e.target.value)}
                className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
              >
                {CLF_SETTLEMENT_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
