import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Home,
  Menu,
  Building2,
  Landmark,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Save,
} from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import {
  ATM_MASTER_DATA,
  CLF_PAYMENT_TYPES,
  CLF_STATUS,
  createEmptyClfRecord,
  getClfRecord,
  getMasterAccountForAtm,
  nextClfId,
  saveClfRecord,
  type ClfRecord,
} from '@/data/financeClf'

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
      if (found) {
        setRecord(JSON.parse(JSON.stringify(found)))
      }
    }
  }, [id, isNew])

  // When ATM ID or HPY Code changes, auto-fetch Master Data
  const handleAtmChange = (atmId: string) => {
    const master = getMasterAccountForAtm(atmId)
    setRecord((prev) => ({
      ...prev,
      atmId,
      siteId: master.siteId,
      hpyCode: master.hpyCode,
      franchiseeName: master.franchiseName,
      franchiseeNo: master.franchiseNo,
      nameAsPerPan: master.nameAsPerPan,
      panNumber: master.panNumber,
      accountNumber: master.accountNumber,
      beneficiaryName: master.beneficiaryName,
      bankName: master.bankName,
      ifscCode: master.ifscCode,
      hpyAccount: master.hpyAccount,
      holder: master.holder,
    }))
  }

  const handleHpyCodeChange = (hpyCode: string) => {
    const matched = Object.values(ATM_MASTER_DATA).find((m) => m.hpyCode === hpyCode)
    if (matched) {
      handleAtmChange(matched.atmId)
    } else {
      setRecord((prev) => ({ ...prev, hpyCode }))
    }
  }

  const updateField = <K extends keyof ClfRecord>(key: K, value: ClfRecord[K]) => {
    setRecord((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = (isDraft = false) => {
    if (!record.atmId) {
      toast('Please select an ATM ID', 'info')
      return
    }
    if (!isDraft && !record.utr?.trim()) {
      toast('Please enter a UTR Number', 'info')
      return
    }

    const toSave: ClfRecord = {
      ...record,
      isDraft,
      clfStatus: record.clfCount || record.clfStatus || '1st',
    }

    const saved = saveClfRecord(toSave)
    toast(
      isDraft
        ? `CLF Draft for ${saved.atmId} saved successfully!`
        : `CLF record ${saved.id} saved successfully!`
    )
    navigate('/finance/clf')
  }

  return (
    <div className="space-y-4 pb-16 max-w-6xl mx-auto">
      {/* Breadcrumb matching [Workspace] > [Finance] > CLF Data > new */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/finance" className="hover:text-[#0066FF] transition-colors">
          Finance
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/finance/clf" className="hover:text-[#0066FF] transition-colors">
          CLF Data
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">
          {isNew ? 'new' : record.id}
        </span>
      </div>

      {/* Page Title with Blue Icon matching Image 2 */}
      <div className="flex items-center gap-3 pt-1">
        <div className="w-9 h-9 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
          <Menu size={18} strokeWidth={2.4} />
        </div>
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-slate-900 leading-tight">
            Cash Loading Funds (CLF)
          </h1>
        </div>
      </div>

      {/* Section 1: Top 3 Fields Card matching Image 2 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* ATM ID * */}
          <div>
            <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
              ATM ID <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center text-[#0066FF] pointer-events-none">
                <Building2 size={16} />
              </div>
              <select
                value={record.atmId || ''}
                onChange={(e) => handleAtmChange(e.target.value)}
                className="w-full h-10 pl-10 pr-8 text-[12.5px] font-medium rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all"
              >
                <option value="">Select ATM ID</option>
                {Object.keys(ATM_MASTER_DATA).map((atm) => (
                  <option key={atm} value={atm}>
                    {atm}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* HPY Code * */}
          <div>
            <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
              HPY Code <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center text-[#0066FF] pointer-events-none">
                <Landmark size={16} />
              </div>
              <select
                value={record.hpyCode || ''}
                onChange={(e) => handleHpyCodeChange(e.target.value)}
                className="w-full h-10 pl-10 pr-8 text-[12.5px] font-medium rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all"
              >
                <option value="">Select HPY Code</option>
                {Object.values(ATM_MASTER_DATA).map((m) => (
                  <option key={m.hpyCode} value={m.hpyCode}>
                    {m.hpyCode}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Transaction Date * */}
          <div>
            <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
              Transaction Date <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center text-[#0066FF] pointer-events-none">
                <Calendar size={16} />
              </div>
              <input
                type="text"
                value={record.transactionDate || '18-10-2026'}
                onChange={(e) => updateField('transactionDate', e.target.value)}
                placeholder="DD-MM-YYYY"
                className="w-full h-10 pl-10 pr-10 text-[12.5px] font-medium rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none">
                <Calendar size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Daily Settlement Account matching Image 2 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Landmark size={18} className="text-[#0066FF]" />
          <h2 className="text-[15px] font-bold text-[#0066FF]">
            Daily Settlement Account
          </h2>
        </div>

        {/* 7 Fields Table / Grid */}
        <div className="overflow-x-auto scroll-thin border border-slate-200 rounded-lg">
          <table className="w-full text-[11px] text-slate-700 border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-[#EAF2FC] text-slate-800 font-bold border-b border-[#D9E5F5] text-left">
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  HPY Code
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Name As Per Pan (FR)
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Pan Number (FR)
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Account Number (FR)
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Beneficiary name (FR)
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Bank Name
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">
                  IFSC Code
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="p-2 border-r border-slate-100">
                  <input
                    type="text"
                    readOnly
                    value={record.hpyCode || 'HPY001'}
                    className="w-full h-8.5 px-2.5 text-[11.5px] font-medium bg-[#F8FAFC] border border-slate-200 rounded text-slate-700 outline-none"
                  />
                </td>
                <td className="p-2 border-r border-slate-100">
                  <input
                    type="text"
                    readOnly
                    value={record.nameAsPerPan || 'Dexter India Pvt Ltd'}
                    className="w-full h-8.5 px-2.5 text-[11.5px] font-medium bg-[#F8FAFC] border border-slate-200 rounded text-slate-700 outline-none"
                  />
                </td>
                <td className="p-2 border-r border-slate-100">
                  <input
                    type="text"
                    readOnly
                    value={record.panNumber || 'ABCDE1234F'}
                    className="w-full h-8.5 px-2.5 text-[11.5px] font-medium bg-[#F8FAFC] border border-slate-200 rounded text-slate-700 outline-none font-mono"
                  />
                </td>
                <td className="p-2 border-r border-slate-100">
                  <input
                    type="text"
                    readOnly
                    value={record.accountNumber || '123456789012'}
                    className="w-full h-8.5 px-2.5 text-[11.5px] font-medium bg-[#F8FAFC] border border-slate-200 rounded text-slate-700 outline-none font-mono"
                  />
                </td>
                <td className="p-2 border-r border-slate-100">
                  <input
                    type="text"
                    readOnly
                    value={record.beneficiaryName || 'Dexter India Pvt Ltd'}
                    className="w-full h-8.5 px-2.5 text-[11.5px] font-medium bg-[#F8FAFC] border border-slate-200 rounded text-slate-700 outline-none"
                  />
                </td>
                <td className="p-2 border-r border-slate-100">
                  <input
                    type="text"
                    readOnly
                    value={record.bankName || 'HDFC Bank'}
                    className="w-full h-8.5 px-2.5 text-[11.5px] font-medium bg-[#F8FAFC] border border-slate-200 rounded text-slate-700 outline-none"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    readOnly
                    value={record.ifscCode || 'HDFC0001234'}
                    className="w-full h-8.5 px-2.5 text-[11.5px] font-medium bg-[#F8FAFC] border border-slate-200 rounded text-slate-700 outline-none font-mono"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: CLF Transaction Details matching Image 2 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-5">
          <FileText size={18} className="text-[#0066FF]" />
          <h2 className="text-[15px] font-bold text-[#0066FF]">
            CLF Transaction Details
          </h2>
        </div>

        {/* 2-Column Numbered Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {/* Left Column: 1 to 5 */}
          <div className="space-y-3.5">
            {/* 1 Payment Type * */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-blue-50 text-[#0066FF] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                1
              </div>
              <label className="w-36 text-[12px] font-bold text-slate-800 shrink-0">
                Payment Type <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative flex-1">
                <select
                  value={record.paymentType || ''}
                  onChange={(e) => updateField('paymentType', e.target.value)}
                  className="w-full h-9 pl-3 pr-8 text-[12px] font-medium rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all"
                >
                  <option value="">Select Payment Type</option>
                  {CLF_PAYMENT_TYPES.filter((t) => t !== 'Select Payment Type').map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {/* 2 UTR Number * */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-blue-50 text-[#0066FF] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                2
              </div>
              <label className="w-36 text-[12px] font-bold text-slate-800 shrink-0">
                UTR Number <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={record.utr || ''}
                  onChange={(e) => updateField('utr', e.target.value)}
                  placeholder="Enter UTR Number"
                  className="w-full h-9 px-3 text-[12px] font-medium rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all placeholder:text-slate-400 font-mono"
                />
              </div>
            </div>

            {/* 3 CLF Count * */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-blue-50 text-[#0066FF] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                3
              </div>
              <label className="w-36 text-[12px] font-bold text-slate-800 shrink-0">
                CLF Count <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative flex-1">
                <select
                  value={record.clfCount || record.clfStatus || ''}
                  onChange={(e) => {
                    updateField('clfCount', e.target.value)
                    updateField('clfStatus', e.target.value)
                  }}
                  className="w-full h-9 pl-3 pr-8 text-[12px] font-medium rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all"
                >
                  <option value="">Select CLF Count</option>
                  {CLF_STATUS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {/* 4 Sender Name * */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-blue-50 text-[#0066FF] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                4
              </div>
              <label className="w-36 text-[12px] font-bold text-slate-800 shrink-0">
                Sender Name <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={record.senderName || ''}
                  onChange={(e) => updateField('senderName', e.target.value)}
                  placeholder="Enter Sender Name"
                  className="w-full h-9 px-3 text-[12px] font-medium rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* 5 Sender Contact * */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-blue-50 text-[#0066FF] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                5
              </div>
              <label className="w-36 text-[12px] font-bold text-slate-800 shrink-0">
                Sender Contact <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={record.senderContact || ''}
                  onChange={(e) => updateField('senderContact', e.target.value)}
                  placeholder="Enter Sender Contact"
                  className="w-full h-9 px-3 text-[12px] font-medium rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Right Column: 6 to 8 */}
          <div className="space-y-3.5">
            {/* 6 Sender Account Number * */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-blue-50 text-[#0066FF] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                6
              </div>
              <label className="w-44 text-[12px] font-bold text-slate-800 shrink-0">
                Sender Account Number <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={record.senderAccountNumber || ''}
                  onChange={(e) => updateField('senderAccountNumber', e.target.value)}
                  placeholder="Enter Sender Account Number"
                  className="w-full h-9 px-3 text-[12px] font-medium rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all placeholder:text-slate-400 font-mono"
                />
              </div>
            </div>

            {/* 7 Sender IFSC * */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-blue-50 text-[#0066FF] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                7
              </div>
              <label className="w-44 text-[12px] font-bold text-slate-800 shrink-0">
                Sender IFSC <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={record.senderIfsc || ''}
                  onChange={(e) => updateField('senderIfsc', e.target.value)}
                  placeholder="Enter Sender IFSC"
                  className="w-full h-9 px-3 text-[12px] font-medium rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all placeholder:text-slate-400 font-mono uppercase"
                />
              </div>
            </div>

            {/* 8 HPY Account Number * */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-blue-50 text-[#0066FF] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                8
              </div>
              <label className="w-44 text-[12px] font-bold text-slate-800 shrink-0">
                HPY Account Number <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={record.hpyAccount || ''}
                  onChange={(e) => updateField('hpyAccount', e.target.value)}
                  placeholder="Enter HPY Account Number"
                  className="w-full h-9 px-3 text-[12px] font-medium rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all placeholder:text-slate-400 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar matching Image 2 */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 h-9.5 px-5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#0066FF] text-[12.5px] font-semibold transition-all shadow-xs"
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="inline-flex items-center gap-1.5 h-9.5 px-5 rounded-lg border border-[#0066FF] bg-white hover:bg-blue-50/60 text-[#0066FF] text-[12.5px] font-semibold transition-all shadow-xs"
          >
            <Save size={15} />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            className="inline-flex items-center gap-1.5 h-9.5 px-6 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12.5px] font-semibold transition-all shadow-sm"
          >
            <span>Save CLF</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
