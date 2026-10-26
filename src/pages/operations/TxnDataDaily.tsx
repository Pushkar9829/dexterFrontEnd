import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  CalendarDays,
  Building2,
  MapPin,
  User,
  Settings,
  Layers,
  Calendar,
  CreditCard,
  ChevronDown,
  BarChart3,
  ArrowLeftRight,
  PieChart,
  LayoutGrid,
  Database,
  ArrowLeft,
  ArrowRight,
  Save,
} from 'lucide-react'
import {
  useTxnStore,
  saveTxnRecord,
  KNOWN_ATMS,
  type AtmTxnRecord,
} from '@/data/txnData'
import { toast } from '@/components/ui/Toast'

const DATES_4 = ['16.10.2026', '17.10.2026', '18.10.2026', '19.10.2026']

const PARTICULARS_11 = [
  { key: 'cashCount', label: 'Total Card & UPI Cash Count' },
  { key: 'dispensedAmt', label: 'Total Card & UPI AMT Dispensed' },
  { key: 'depositCount', label: 'Total Card & UPI Deposit Count' },
  { key: 'depositAmt', label: 'Total Card & UPI aMT Deposit' },
  { key: 'nonCashCount', label: 'Total Card & UPI Non Cash Count' },
  { key: 'totalTxns', label: 'Total TXNs' },
  { key: 'totalAmt', label: 'Total Amount' },
  { key: 'issuedIndent', label: 'Issued Indent' },
  { key: 'revisedIndent', label: 'Revised Indent' },
  { key: 'withdrawalAmt', label: 'Withdrawal Amount' },
  { key: 'loadedAmt', label: 'Loaded Amount' },
] as const

export default function TxnDataDaily() {
  const navigate = useNavigate()
  const { atmId } = useParams<{ atmId?: string }>()
  const { records } = useTxnStore()

  // Find record or default to first
  const existingRecord = atmId
    ? records.find((r) => r.atmId === atmId)
    : records.find((r) => r.atmId === 'ATM-100234') || records[0]

  // Form states for Site Information
  const [selectedAtmId, setSelectedAtmId] = useState(existingRecord?.atmId || 'ATM-100234')
  const [siteId, setSiteId] = useState(existingRecord?.siteId || '')
  const [name, setName] = useState(existingRecord?.name || '')
  const [model, setModel] = useState(existingRecord?.model || '')
  const [type, setType] = useState<'SF' | 'FFM'>(existingRecord?.type || 'SF')
  const [cashLiveDate, setCashLiveDate] = useState(existingRecord?.cashLiveDate || '')

  // Summary counts
  const [lastMonth, setLastMonth] = useState(
    existingRecord?.lastMonth || { txnCount: '2350', txnAmt: '3 CR' }
  )
  const [currentMonth, setCurrentMonth] = useState(
    existingRecord?.currentMonth || { txnCount: '1170', txnAmt: '2 CR' }
  )

  // 4-day particulars matrix state: { [date]: { [key]: value } }
  const [matrix, setMatrix] = useState<Record<string, Record<string, string>>>(() => {
    const init: Record<string, Record<string, string>> = {}
    DATES_4.forEach((date) => {
      init[date] = {}
      PARTICULARS_11.forEach((p) => {
        init[date][p.key] = existingRecord?.dailyValues?.[date]?.[p.key as keyof typeof existingRecord.dailyValues[string]] || ''
      })
    })
    return init
  })

  // Handle ATM ID selection to auto-fetch details
  const handleAtmChange = (newAtmId: string) => {
    setSelectedAtmId(newAtmId)
    const match = records.find((r) => r.atmId === newAtmId) || KNOWN_ATMS.find((k) => k.atmId === newAtmId)
    if (match) {
      setSiteId(match.siteId)
      setName(match.name)
      setModel(match.model)
      setType(match.type)
      setCashLiveDate(match.cashLiveDate)
      setLastMonth(match.lastMonth)
      setCurrentMonth(match.currentMonth)

      // If existing in records, fill matrix
      const existing = records.find((r) => r.atmId === newAtmId)
      if (existing) {
        const nextMatrix: Record<string, Record<string, string>> = {}
        DATES_4.forEach((date) => {
          nextMatrix[date] = {}
          PARTICULARS_11.forEach((p) => {
            nextMatrix[date][p.key] = existing.dailyValues?.[date]?.[p.key as keyof typeof existing.dailyValues[string]] || ''
          })
        })
        setMatrix(nextMatrix)
      }
      toast(`Loaded details for ${match.atmId}`)
    }
  }

  // Handle cell edits in Transaction History
  const handleCellChange = (date: string, key: string, value: string) => {
    setMatrix((prev) => ({
      ...prev,
      [date]: {
        ...(prev[date] || {}),
        [key]: value,
      },
    }))
  }

  const handleSave = (isDraft: boolean) => {
    if (!selectedAtmId) {
      toast('Please select an ATM ID')
      return
    }

    const payload: AtmTxnRecord = {
      id: existingRecord?.id || `TXN-${Date.now()}`,
      atmId: selectedAtmId,
      siteId: siteId || 'ST-MH-PUN-00124',
      name: name || 'Om Sai Enterprises',
      model: model || 'Garnet Model',
      type: type || 'SF',
      cashLiveDate: cashLiveDate || '12.04.2025',
      lastMonth,
      currentMonth,
      dailyValues: {
        ...(existingRecord?.dailyValues || {}),
        ...matrix as any,
      },
    }

    saveTxnRecord(payload)
    toast(isDraft ? 'Daily TXN draft saved' : 'Daily TXN data saved successfully', 'success')
    navigate('/operations/txn-data')
  }

  return (
    <div className="space-y-4 pb-12 max-w-[1500px]">
      {/* Breadcrumb matching Page 02: Operations / Daily Operations / Daily TXN Data */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Link to="/operations" className="hover:text-[#0066FF] transition-colors">
          Operations
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-600">Daily Operations</span>
        <span className="text-slate-400">/</span>
        <span className="font-semibold text-slate-800">Daily TXN Data</span>
      </div>

      {/* Page Title with Blue Calendar Icon matching Page 02 */}
      <div className="flex items-center gap-3 pt-1">
        <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
          <CalendarDays size={22} />
        </div>
        <h1 className="text-[24px] sm:text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
          Daily TXN Data
        </h1>
      </div>

      {/* Top 2 Columns Layout: Site Information (Left) & Transaction Summary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (8 cols): Site Information */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-[#0066FF]" />
            <h2 className="text-[14px] font-bold text-[#0066FF]">Site Information</h2>
          </div>

          {/* Form Fields: 2 Columns inside Left Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {/* 1. ATM ID * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1">
                ATM ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CreditCard
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <select
                  value={selectedAtmId}
                  onChange={(e) => handleAtmChange(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="">Enter ATM ID</option>
                  {KNOWN_ATMS.map((atm) => (
                    <option key={atm.atmId} value={atm.atmId}>
                      {atm.atmId}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
              </div>
            </div>

            {/* 2. Site ID */}
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1">Site ID</label>
              <div className="relative">
                <MapPin
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  placeholder="Enter Site ID"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* 3. Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1">Name</label>
              <div className="relative">
                <User
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Auto Fetch"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* 4. Model */}
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1">Model</label>
              <div className="relative">
                <Settings
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Enter Model"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* 5. Type * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Layers
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'SF' | 'FFM')}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="">Select Type</option>
                  <option value="SF">SF</option>
                  <option value="FFM">FFM</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
              </div>
            </div>

            {/* 6. Cash Live Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1">
                Cash Live Date
              </label>
              <div className="relative">
                <Calendar
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={cashLiveDate}
                  onChange={(e) => setCashLiveDate(e.target.value)}
                  placeholder="Select cash live date"
                  className="w-full h-8.5 pl-8 pr-8 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
                <Calendar
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Transaction Summary */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={18} className="text-[#0066FF]" />
            <h2 className="text-[14px] font-bold text-[#0066FF]">Transaction Summary</h2>
          </div>

          <div className="space-y-3">
            {/* Last Month Card (Light Blue) */}
            <div className="rounded-lg bg-[#EAF3FD] p-3 border border-[#D0E3F8]">
              <div className="text-[12px] font-bold text-slate-700 mb-2">Last Month</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2 text-slate-600 font-medium">
                    <ArrowLeftRight size={14} className="text-[#0066FF]" />
                    <span>TXN Count</span>
                  </div>
                  <span className="font-bold text-slate-900 text-[14px]">
                    {lastMonth.txnCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2 text-slate-600 font-medium">
                    <PieChart size={14} className="text-[#0066FF]" />
                    <span>TXN AMT</span>
                  </div>
                  <span className="font-bold text-slate-900 text-[14px]">
                    {lastMonth.txnAmt}
                  </span>
                </div>
              </div>
            </div>

            {/* Current Month Card (Light Green) */}
            <div className="rounded-lg bg-[#E8F8F0] p-3 border border-[#CDEED6]">
              <div className="text-[12px] font-bold text-slate-700 mb-2">Current Month</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2 text-slate-600 font-medium">
                    <LayoutGrid size={14} className="text-emerald-600" />
                    <span>Total TXN</span>
                  </div>
                  <span className="font-bold text-slate-900 text-[14px]">
                    {currentMonth.txnCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2 text-slate-600 font-medium">
                    <PieChart size={14} className="text-emerald-600" />
                    <span>TXN AMT</span>
                  </div>
                  <span className="font-bold text-slate-900 text-[14px]">
                    {currentMonth.txnAmt}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Card: Transaction History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <Database size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">Transaction History</h2>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-[11px] text-slate-700 border-collapse">
            <thead>
              <tr className="bg-[#104886] text-white font-bold border-b border-blue-900 text-center">
                <th className="py-2.5 px-4 border-r border-blue-400/30 text-left min-w-[240px]">
                  Particulars
                </th>
                {DATES_4.map((d) => (
                  <th
                    key={d}
                    className="py-2.5 px-4 border-r border-blue-400/30 whitespace-nowrap min-w-[130px]"
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {PARTICULARS_11.map((p) => (
                <tr key={p.key} className="border-b border-slate-100 transition-colors">
                  {/* Particulars Title with Light Blue background matching Image 1 */}
                  <td className="py-2.5 px-4 border-r border-slate-200 bg-[#EAF3FD] text-[#1D58A7] font-bold text-left whitespace-nowrap">
                    {p.label}
                  </td>

                  {/* 4 Editable Date Inputs */}
                  {DATES_4.map((d) => (
                    <td key={d} className="py-1.5 px-3 border-r border-slate-100 text-center">
                      <input
                        type="text"
                        value={matrix[d]?.[p.key] || ''}
                        onChange={(e) => handleCellChange(d, p.key, e.target.value)}
                        placeholder="—"
                        className="w-full h-7 px-2.5 text-[11px] rounded-md border border-slate-200 bg-white text-slate-800 font-medium outline-none focus:border-[#0066FF] focus:bg-blue-50/20 text-center transition-colors"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Action Bar matching Page 02 */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center justify-between shadow-sm">
        {/* Back Button on Left */}
        <button
          type="button"
          onClick={() => navigate('/operations/txn-data')}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[#0066FF]/30 text-[#0066FF] hover:bg-blue-50/60 text-[13px] font-semibold transition-all shadow-xs"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        {/* Right Action Buttons: Save Draft & Save Daily TXN */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[#0066FF]/30 text-[#0066FF] hover:bg-blue-50/60 text-[13px] font-semibold transition-all shadow-xs"
          >
            <Save size={15} />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold transition-all shadow-sm hover:shadow"
          >
            <span>Save Daily TXN</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
