import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  Home,
  IndianRupee,
  Info,
  Landmark,
  MapPin,
  Save,
  Scan,
  User,
  Users,
} from 'lucide-react'
import { toast } from '@/components/ui/Toast'

interface CashReplenishmentFormProps {
  onBack?: () => void
  onSave?: (data: any) => void
  initialData?: any
}

const PARTICULARS = [
  { key: 'opening', label: 'Opening Balance', info: 'Cash balance available at the beginning of the replenishment cycle' },
  { key: 'dispensed', label: 'Cash Dispensed', info: 'Total amount dispensed by the ATM since last reconciliation' },
  { key: 'purge', label: 'Cash in Purge Bin', info: 'Notes diverted to purge/reject bin due to pick/sensor errors' },
  { key: 'cassettes', label: 'Cash in Cassettes', info: 'Current physical currency residing inside currency cassettes' },
  { key: 'physical', label: 'Physical Cash Before Replenishment', info: 'Actual physical count verified in the ATM before adding fresh notes' },
  { key: 'overage', label: 'Overage', info: 'Excess cash detected beyond system switch records' },
  { key: 'shortage', label: 'Shortage', info: 'Deficit cash detected compared to system switch records' },
  { key: 'replenishment', label: 'Cash Replenishment', info: 'Fresh currency loaded during the current cycle' },
  { key: 'closing', label: 'Closing Balance', info: 'Final verified balance following replenishment' },
  { key: 'switch', label: 'Switch Counter', info: 'Terminal electronic balance recorded by the host switch' },
]

export default function CashReplenishmentForm({
  onBack,
  onSave,
  initialData,
}: CashReplenishmentFormProps) {
  const navigate = useNavigate()

  // Header metadata matching Image 02
  const [cbrDate, setCbrDate] = useState(initialData?.date || '18-10-2026')
  const [cbrTime, setCbrTime] = useState(
    initialData?.eodTime && initialData.eodTime !== '00:00'
      ? initialData.eodTime
      : '10:30 AM'
  )

  // Section 1: ATM & Franchise Information matching Image 02
  const [craName, setCraName] = useState('Select CRA Name')
  const [franchiseFirm, setFranchiseFirm] = useState('Select Franchise Firm')
  const [frName, setFrName] = useState('Suresh Kumar')
  const [atmId, setAtmId] = useState(
    initialData?.atmId && initialData.atmId !== '0'
      ? initialData.atmId
      : 'Select ATM ID'
  )

  // -- fields matching Image 02
  const [location, setLocation] = useState('')
  const [bank, setBank] = useState('')
  const [lastTxnCount, setLastTxnCount] = useState('')
  const [lastTxnAmount, setLastTxnAmount] = useState('')
  const [issuedIndent, setIssuedIndent] = useState('')
  const [revisedIndent, setRevisedIndent] = useState('')
  const [withdrawalIndent, setWithdrawalIndent] = useState('')
  const [loadedAmount, setLoadedAmount] = useState('')
  const [cashInHand, setCashInHand] = useState('')

  // Section 2: Cash & Transaction Details
  // Types: [Type 1 - 200, Type 2 - 100, Type 3 - 500, Type 4 - 2000]
  // In Image 02, Opening Balance displays --, other cells are blank, Totals are 0
  const [matrix, setMatrix] = useState<Record<string, (string | number)[]>>({
    opening: ['', '', '', ''],
    dispensed: ['', '', '', ''],
    purge: ['', '', '', ''],
    cassettes: ['', '', '', ''],
    physical: ['', '', '', ''],
    overage: ['', '', '', ''],
    shortage: ['', '', '', ''],
    replenishment: ['', '', '', ''],
    closing: ['', '', '', ''],
    switch: ['', '', '', ''],
  })

  // Remarks
  const [remarks, setRemarks] = useState('')

  const handleCellChange = (
    key: string,
    colIndex: number,
    value: string
  ) => {
    setMatrix((prev) => {
      const current = prev[key] ? [...prev[key]] : ['', '', '', '']
      current[colIndex] = value
      return { ...prev, [key]: current }
    })
  }

  const calcRowTotal = (key: string) => {
    const row = matrix[key] || ['', '', '', '']
    const q200 = Number(row[0]) || 0
    const q100 = Number(row[1]) || 0
    const q500 = Number(row[2]) || 0
    const q2000 = Number(row[3]) || 0
    return q200 * 200 + q100 * 100 + q500 * 500 + q2000 * 2000
  }

  const handleAtmChange = (selectedId: string) => {
    setAtmId(selectedId)
    if (selectedId === 'MBP13124') {
      setLocation('Kothrud · Paud Road, Pune')
      setBank('Axis Bank')
      setLastTxnCount('142')
      setLastTxnAmount('3,45,000')
      setIssuedIndent('IND-13124-001')
      setRevisedIndent('IND-13124-001-R')
      setWithdrawalIndent('WTH-13124-09')
      setLoadedAmount('8,00,000')
      setCashInHand('2,50,000')
      setFranchiseFirm('Shree Sai Financial Services')
      setCraName('CMS Info Systems')
    } else if (selectedId === 'Select ATM ID') {
      setLocation('')
      setBank('')
      setLastTxnCount('')
      setLastTxnAmount('')
      setIssuedIndent('')
      setRevisedIndent('')
      setWithdrawalIndent('')
      setLoadedAmount('')
      setCashInHand('')
    } else {
      setLocation('Kothrud · Paud Road, Pune')
      setBank('Axis Bank')
      setLastTxnCount('120')
      setLastTxnAmount('2,90,000')
      setIssuedIndent(`IND-${selectedId.slice(-4)}-001`)
      setRevisedIndent(`IND-${selectedId.slice(-4)}-001-R`)
      setWithdrawalIndent(`WTH-${selectedId.slice(-4)}-01`)
      setLoadedAmount('6,50,000')
      setCashInHand('2,00,000')
    }
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate('/cbr/replenishment')
    }
  }

  const handleSaveDraft = () => {
    toast('Draft saved successfully', 'info')
    if (onSave) {
      onSave({ status: 'Draft', atmId, date: cbrDate })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast('Daily ATM CBR & Replenishment submitted successfully', 'success')
    if (onSave) {
      onSave({
        status: 'Replenished',
        atmId,
        date: cbrDate,
        amount: calcRowTotal('replenishment'),
      })
    } else {
      navigate('/cbr/replenishment')
    }
  }

  return (
    <div className="space-y-4 pb-16 max-w-[1440px]">
      {/* Breadcrumb matching other pages: Workspace > Operations > CBR > Daily ATM Cash Loading / CBR */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/operations" className="hover:text-[#0066FF] transition-colors">
          Operations
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/cbr" className="hover:text-[#0066FF] transition-colors">
          CBR
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <button
          type="button"
          onClick={handleBack}
          className="hover:text-[#0066FF] transition-colors cursor-pointer"
        >
          Daily ATM Cash Loading
        </button>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">CBR</span>
      </div>

      {/* Page Title & CBR Date/Time in top right */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shadow-sm shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
              Daily ATM Cash Loading / Replenishment / CBR
            </h1>
          </div>
        </div>

        {/* Date and Time selectors in top right matching Image 02 */}
        <div className="flex items-center gap-4 self-end lg:self-auto">
          {/* CBR Date * */}
          <div className="flex flex-col">
            <label className="text-[11.5px] font-bold text-slate-800 mb-1">
              CBR Date <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <Calendar
                size={14}
                className="absolute left-2.5 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={cbrDate}
                onChange={(e) => setCbrDate(e.target.value)}
                className="h-9 w-[136px] pl-8 pr-8 text-[12px] font-semibold text-slate-800 rounded-lg border border-slate-200 bg-white shadow-2xs outline-none focus:border-[#0066FF]"
              />
              <Calendar
                size={14}
                className="absolute right-2.5 text-[#0066FF] pointer-events-none"
              />
            </div>
          </div>

          {/* CBR Time * */}
          <div className="flex flex-col">
            <label className="text-[11.5px] font-bold text-slate-800 mb-1">
              CBR Time <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <Clock
                size={14}
                className="absolute left-2.5 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={cbrTime}
                onChange={(e) => setCbrTime(e.target.value)}
                className="h-9 w-[124px] pl-8 pr-8 text-[12px] font-semibold text-slate-800 rounded-lg border border-slate-200 bg-white shadow-2xs outline-none focus:border-[#0066FF]"
              />
              <Clock
                size={14}
                className="absolute right-2.5 text-[#0066FF] pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: ATM & Franchise Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <Building2 size={18} className="text-[#0066FF]" />
            <h2 className="text-[15px] font-bold text-[#0066FF]">
              ATM & Franchise Information
            </h2>
          </div>

          {/* Grid Row 1: CRA Name, Franchise Firm Name, FR Name, ATM ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                CRA Name
              </label>
              <div className="relative">
                <Users
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <select
                  value={craName}
                  onChange={(e) => setCraName(e.target.value)}
                  className="w-full h-9.5 pl-9 pr-8 rounded-lg border border-slate-200 text-[12.5px] font-medium text-slate-800 bg-white focus:border-[#0066FF] outline-none appearance-none shadow-2xs"
                >
                  <option value="Select CRA Name">Select CRA Name</option>
                  <option value="CMS Info Systems">CMS Info Systems</option>
                  <option value="Writer Safeguard">Writer Safeguard</option>
                  <option value="SIS Prosegur">SIS Prosegur</option>
                  <option value="Brinks India">Brinks India</option>
                  <option value="FR">FR</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Franchise Firm Name
              </label>
              <div className="relative">
                <Building2
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <select
                  value={franchiseFirm}
                  onChange={(e) => setFranchiseFirm(e.target.value)}
                  className="w-full h-9.5 pl-9 pr-8 rounded-lg border border-slate-200 text-[12.5px] font-medium text-slate-800 bg-white focus:border-[#0066FF] outline-none appearance-none shadow-2xs"
                >
                  <option value="Select Franchise Firm">Select Franchise Firm</option>
                  <option value="Shree Sai Financial Services">Shree Sai Financial Services</option>
                  <option value="Patel Cash Solutions">Patel Cash Solutions</option>
                  <option value="Namma ATM Network">Namma ATM Network</option>
                  <option value="Awadh Banking Point">Awadh Banking Point</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                FR Name
              </label>
              <div className="relative">
                <User
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={frName}
                  onChange={(e) => setFrName(e.target.value)}
                  className="w-full h-9.5 pl-9 pr-3 rounded-lg border border-slate-200 text-[12.5px] font-medium text-slate-800 bg-white focus:border-[#0066FF] outline-none shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ATM ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Scan
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <select
                  value={atmId}
                  onChange={(e) => handleAtmChange(e.target.value)}
                  className="w-full h-9.5 pl-9 pr-8 rounded-lg border border-slate-200 text-[12.5px] font-medium text-slate-800 bg-white focus:border-[#0066FF] outline-none appearance-none shadow-2xs"
                >
                  <option value="Select ATM ID">Select ATM ID</option>
                  <option value="MBP13124">MBP13124</option>
                  <option value="DX-MH-01482">DX-MH-01482</option>
                  <option value="DX-MH-01497">DX-MH-01497</option>
                  <option value="DX-MH-01503">DX-MH-01503</option>
                  <option value="DX-GJ-02187">DX-GJ-02187</option>
                  <option value="DX-KA-00761">DX-KA-00761</option>
                  <option value="DX-UP-03051">DX-UP-03051</option>
                </select>
              </div>
            </div>
          </div>

          {/* Grid Row 2: ATM Location, Bank, Last Day TXN Count, Last Day TXN Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ATM Location
              </label>
              <div className="relative">
                <MapPin
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="--"
                  className="w-full h-9.5 pl-9 pr-3 rounded-lg border border-slate-200 text-[12.5px] text-slate-800 placeholder:text-slate-500 bg-slate-50/70 focus:bg-white focus:border-[#0066FF] outline-none shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Bank
              </label>
              <div className="relative">
                <Landmark
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  placeholder="--"
                  className="w-full h-9.5 pl-9 pr-3 rounded-lg border border-slate-200 text-[12.5px] text-slate-800 placeholder:text-slate-500 bg-slate-50/70 focus:bg-white focus:border-[#0066FF] outline-none shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Last Day TXN Count
              </label>
              <div className="relative">
                <FileText
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={lastTxnCount}
                  onChange={(e) => setLastTxnCount(e.target.value)}
                  placeholder="--"
                  className="w-full h-9.5 pl-9 pr-3 rounded-lg border border-slate-200 text-[12.5px] text-slate-800 placeholder:text-slate-500 bg-slate-50/70 focus:bg-white focus:border-[#0066FF] outline-none shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Last Day TXN Amount (₹)
              </label>
              <div className="relative">
                <IndianRupee
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={lastTxnAmount}
                  onChange={(e) => setLastTxnAmount(e.target.value)}
                  placeholder="--"
                  className="w-full h-9.5 pl-9 pr-3 rounded-lg border border-slate-200 text-[12.5px] text-slate-800 placeholder:text-slate-500 bg-slate-50/70 focus:bg-white focus:border-[#0066FF] outline-none shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Grid Row 3: Issued Indent, Revised Indent, Withdrawal Indent, Loaded Amount, Cash in Hand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Issued Indent
              </label>
              <div className="relative">
                <FileText
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={issuedIndent}
                  onChange={(e) => setIssuedIndent(e.target.value)}
                  placeholder="--"
                  className="w-full h-9.5 pl-9 pr-3 rounded-lg border border-slate-200 text-[12.5px] text-slate-800 placeholder:text-slate-500 bg-slate-50/70 focus:bg-white focus:border-[#0066FF] outline-none shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Revised Indent
              </label>
              <div className="relative">
                <FileText
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={revisedIndent}
                  onChange={(e) => setRevisedIndent(e.target.value)}
                  placeholder="--"
                  className="w-full h-9.5 pl-9 pr-3 rounded-lg border border-slate-200 text-[12.5px] text-slate-800 placeholder:text-slate-500 bg-slate-50/70 focus:bg-white focus:border-[#0066FF] outline-none shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Withdrawal Indent
              </label>
              <div className="relative">
                <FileText
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={withdrawalIndent}
                  onChange={(e) => setWithdrawalIndent(e.target.value)}
                  placeholder="--"
                  className="w-full h-9.5 pl-9 pr-3 rounded-lg border border-slate-200 text-[12.5px] text-slate-800 placeholder:text-slate-500 bg-slate-50/70 focus:bg-white focus:border-[#0066FF] outline-none shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Loaded Amount (₹)
              </label>
              <div className="relative">
                <IndianRupee
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={loadedAmount}
                  onChange={(e) => setLoadedAmount(e.target.value)}
                  placeholder="--"
                  className="w-full h-9.5 pl-9 pr-3 rounded-lg border border-slate-200 text-[12.5px] text-slate-800 placeholder:text-slate-500 bg-slate-50/70 focus:bg-white focus:border-[#0066FF] outline-none shadow-2xs"
                />
              </div>
            </div>

            {/* Cash in Hand (₹) - Highlighted with red border box matching Image 02 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1">
                Cash in Hand (₹)
              </label>
              <div className="relative rounded-lg bg-slate-50/70 overflow-hidden shadow-2xs">
                <IndianRupee
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={cashInHand}
                  onChange={(e) => setCashInHand(e.target.value)}
                  placeholder="--"
                  className="w-full h-8.5 pl-9 pr-3 text-[12.5px] font-semibold text-slate-800 placeholder:text-slate-500 bg-transparent focus:bg-white outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Cash & Transaction Details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Banknote size={16} />
            </div>
            <h2 className="text-[15px] font-bold text-slate-900">
              Cash & Transaction Details
            </h2>
          </div>

          <div className="overflow-x-auto scroll-thin">
            <table className="w-full border-collapse text-left text-[12px]">
              <thead>
                <tr className="border-b border-blue-100 bg-[#EAF2FD] text-[11.5px] font-bold text-slate-800">
                  <th className="py-2.5 px-3.5 w-[280px] border-r border-blue-100/60">
                    Particular
                  </th>
                  <th className="py-2.5 px-3 text-center min-w-[140px] border-r border-blue-100/60">
                    <div>Type 1 - 200</div>
                    <div className="text-[11px] font-medium text-slate-600">(₹200)</div>
                  </th>
                  <th className="py-2.5 px-3 text-center min-w-[140px] border-r border-blue-100/60">
                    <div>Type 2 - 100</div>
                    <div className="text-[11px] font-medium text-slate-600">(₹100)</div>
                  </th>
                  <th className="py-2.5 px-3 text-center min-w-[140px] border-r border-blue-100/60">
                    <div>Type 3 - 500</div>
                    <div className="text-[11px] font-medium text-slate-600">(₹500)</div>
                  </th>
                  <th className="py-2.5 px-3 text-center min-w-[140px] border-r border-blue-100/60">
                    <div>Type 4 - 2000</div>
                    <div className="text-[11px] font-medium text-slate-600">(₹2,000)</div>
                  </th>
                  <th className="py-2.5 px-3.5 text-center w-[120px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {PARTICULARS.map((p) => {
                  const values = matrix[p.key] || ['', '', '', '']
                  const rowTotal = calcRowTotal(p.key)
                  const isOpening = p.key === 'opening'

                  return (
                    <tr key={p.key} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2 px-3.5 font-medium text-slate-800 whitespace-nowrap border-r border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span>{p.label}</span>
                          <span title={p.info} className="cursor-help">
                            <Info size={13} className="text-[#0066FF] shrink-0" />
                          </span>
                        </div>
                      </td>

                      {/* 4 Denomination inputs */}
                      {[0, 1, 2, 3].map((colIdx) => (
                        <td key={colIdx} className="py-2 px-2.5 text-center border-r border-slate-100">
                          <input
                            type="text"
                            placeholder={isOpening ? '--' : ''}
                            value={values[colIdx]}
                            onChange={(e) =>
                              handleCellChange(p.key, colIdx, e.target.value)
                            }
                            className={`w-full h-8 px-2 text-center text-[12px] font-medium text-slate-800 rounded-md border border-slate-200 bg-white hover:border-slate-300 focus:border-[#0066FF] outline-none shadow-2xs ${isOpening ? 'placeholder:text-slate-400 placeholder:font-normal' : ''
                              }`}
                          />
                        </td>
                      ))}

                      {/* Total */}
                      <td className="py-2 px-3.5 text-center font-bold text-slate-800">
                        {rowTotal}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Remarks */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2.5">
            <FileText size={17} className="text-[#0066FF]" />
            <label className="text-[13px] font-bold text-slate-800">
              Remarks
            </label>
          </div>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter remarks (if any)"
            className="w-full p-3 rounded-lg border border-slate-200 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:border-[#0066FF] outline-none resize-none shadow-2xs"
          />
        </div>

        {/* Bottom Actions matching Image 02 */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-semibold transition-all shadow-2xs cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg border border-[#0066FF] text-[#0066FF] hover:bg-blue-50/50 bg-white text-[13px] font-semibold transition-all shadow-2xs cursor-pointer"
            >
              <Save size={16} />
              <span>Save Draft</span>
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 h-10 px-6 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold transition-all shadow-sm hover:shadow cursor-pointer"
            >
              <span>Submit CBR</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
