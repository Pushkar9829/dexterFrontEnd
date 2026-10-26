import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  FileText,
  Landmark,
  Calendar,
  Clock,
  CreditCard,
  User,
  Phone,
  MapPin,
  Settings,
  List,
  Save,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  X,
  Cpu,
  Home,
} from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import {
  DEPOSIT_CATEGORIES,
  SD_BANKS,
  SD_PAYMENT_TYPES,
  type SdPaymentType,
  type SecurityDeposit,
} from '@/data/financeSd'
import {
  getSecurityDeposit,
  saveSecurityDeposit,
  nextDepositId,
  nextReceiptNo,
} from '@/data/financeSdStore'

const KNOWN_ATM_SITES = [
  {
    atmId: 'DX-MH-01482',
    siteId: 'ST-MH-PUN-00124',
    frName: 'Suresh Kumar',
    frMobileNumber: '9876543210',
    bank: 'HDFC Bank',
    hpyAccount: 'HPY-9921408',
    accountHolder: 'Suresh Kumar',
    frAccount: '50200012347316',
    frIfsc: 'HDFC0001234',
    amount: '250000',
  },
  {
    atmId: 'DX-UP-02391',
    siteId: 'ST-UP-AGR-00219',
    frName: 'Vinod Kumar Bansal',
    frMobileNumber: '9412088210',
    bank: 'State Bank of India',
    hpyAccount: 'HPY-8841029',
    accountHolder: 'Vinod Kumar Bansal',
    frAccount: '310928471928',
    frIfsc: 'SBIN0000412',
    amount: '300000',
  },
  {
    atmId: 'DX-DL-03112',
    siteId: 'ST-DL-NOI-00342',
    frName: 'Gaurav Singhal',
    frMobileNumber: '9811234509',
    bank: 'ICICI Bank',
    hpyAccount: 'HPY-7719204',
    accountHolder: 'Gaurav Singhal',
    frAccount: '002101592810',
    frIfsc: 'ICIC0000021',
    amount: '200000',
  },
  {
    atmId: 'DX-KA-04981',
    siteId: 'ST-KA-BLR-00481',
    frName: 'Naveen Chandrashekar',
    frMobileNumber: '9845012894',
    bank: 'Canara Bank',
    hpyAccount: 'HPY-6629104',
    accountHolder: 'Naveen Chandrashekar',
    frAccount: '04121010049281',
    frIfsc: 'CNRB0000412',
    amount: '250000',
  },
]

export default function SdRecordPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const existing = !isNew ? getSecurityDeposit(id) : undefined

  // Card 1: ATM & Franchise Details
  const [atmId, setAtmId] = useState(existing?.atmId || '')
  const [siteId, setSiteId] = useState(existing?.siteId || '')
  const [transactionDate, setTransactionDate] = useState(
    existing?.transactionDate || existing?.paymentDate || '2026-10-18'
  )
  const [frName, setFrName] = useState(existing?.franchiseeName || 'Suresh Kumar')
  const [frMobileNumber, setFrMobileNumber] = useState(existing?.franchiseeNo || '9876543210')

  // Card 2: Bank & Payment Details
  const [banksList, setBanksList] = useState<string[]>(SD_BANKS)
  const [bank, setBank] = useState(existing?.frBankName || 'HDFC Bank')
  const [hpyAccount, setHpyAccount] = useState(existing?.hpyAccount || 'HPY-9921408')
  const [accountHolder, setAccountHolder] = useState(
    existing?.accountHolder || existing?.franchiseeName || 'Suresh Kumar'
  )
  const [frAccount, setFrAccount] = useState(existing?.frAccount || '')
  const [frIfsc, setFrIfsc] = useState(existing?.frIfsc || '')

  const [paymentDate, setPaymentDate] = useState(
    existing?.paymentDate || new Date().toISOString().slice(0, 10)
  )
  const [transferTime, setTransferTime] = useState(existing?.transferTime || '11:30')
  const [paymentType, setPaymentType] = useState<SdPaymentType>(existing?.paymentType || 'NEFT')
  const [txnNumber, setTxnNumber] = useState(existing?.txnNumber || '')
  const [amount, setAmount] = useState(existing?.amount || '250000')
  const [depositType, setDepositType] = useState(
    existing?.depositCategory || 'Initial Security Deposit'
  )

  // Add Bank Modal state
  const [addBankModalOpen, setAddBankModalOpen] = useState(false)
  const [newBankName, setNewBankName] = useState('')

  // Handle ATM selection auto-fill
  const handleAtmChange = (val: string) => {
    setAtmId(val)
    const match = KNOWN_ATM_SITES.find((k) => k.atmId === val)
    if (match) {
      setSiteId(match.siteId)
      setFrName(match.frName)
      setFrMobileNumber(match.frMobileNumber)
      setBank(match.bank)
      setHpyAccount(match.hpyAccount)
      setAccountHolder(match.accountHolder)
      setFrAccount(match.frAccount)
      setFrIfsc(match.frIfsc)
      setAmount(match.amount)
      toast(`Loaded details for ATM ${val}`)
    }
  }

  // Handle Site selection auto-fill
  const handleSiteChange = (val: string) => {
    setSiteId(val)
    const match = KNOWN_ATM_SITES.find((k) => k.siteId === val)
    if (match) {
      setAtmId(match.atmId)
      setFrName(match.frName)
      setFrMobileNumber(match.frMobileNumber)
      setBank(match.bank)
      setHpyAccount(match.hpyAccount)
      setAccountHolder(match.accountHolder)
      setFrAccount(match.frAccount)
      setFrIfsc(match.frIfsc)
      setAmount(match.amount)
      toast(`Loaded details for Site ${val}`)
    }
  }

  // Add custom bank
  const handleAddBankSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBankName.trim()) return
    const name = newBankName.trim()
    if (!banksList.includes(name)) {
      setBanksList((prev) => [...prev, name])
    }
    setBank(name)
    setNewBankName('')
    setAddBankModalOpen(false)
    toast(`Added bank ${name}`)
  }

  // Save / Submit
  const handleSave = (isDraft: boolean) => {
    if (!siteId.trim() && !isDraft) {
      toast('Please select or enter Site ID')
      return
    }
    if (!atmId.trim() && !isDraft) {
      toast('Please select or enter ATM ID')
      return
    }

    const payload: SecurityDeposit = {
      id: existing?.id || nextDepositId(),
      receiptNo: existing?.receiptNo || nextReceiptNo(),
      siteId: siteId.trim(),
      atmId: atmId.trim(),
      franchiseeName: frName.trim() || '—',
      franchiseeNo: frMobileNumber.trim() || '—',
      cashLiveDate: existing?.cashLiveDate || '2026-02-15',
      hpyAccount: hpyAccount.trim() || 'HPY-9921408',
      paymentType,
      paymentDate,
      transactionDate,
      transferTime,
      txnNumber: txnNumber.trim() || `TXN${Date.now().toString().slice(-8)}`,
      amount: amount.trim() || '0',
      depositCategory: depositType,
      frBankName: bank,
      accountHolder: accountHolder.trim() || frName.trim(),
      frAccount: frAccount.trim(),
      frIfsc: frIfsc.trim(),
      branchName: existing?.branchName || 'Main Branch',
      attachmentName: existing?.attachmentName || '',
      attachmentSize: existing?.attachmentSize || 0,
      status: isDraft ? 'Pending Verification' : 'Verified',
      verifierRemarks: existing?.verifierRemarks || '',
      verifiedBy: existing?.verifiedBy || '',
      verifiedAt: existing?.verifiedAt || '',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    saveSecurityDeposit(payload)
    toast(isDraft ? 'Security deposit draft saved' : 'Security deposit submitted successfully')
    navigate('/finance/sd')
  }

  return (
    <div className="space-y-4 pb-16 max-w-[1400px]">
      {/* Breadcrumb: [Workspace] > [Finance] > Security Deposit Data > new */}
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
        <Link to="/finance/sd" className="hover:text-[#0066FF] transition-colors">
          Security Deposit
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">{isNew ? 'new' : id}</span>
      </div>

      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
          <FileText size={18} />
        </div>
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
            Security Deposit
          </h1>
        </div>
      </div>

      {/* CARD 1: ATM & Franchise Details matching Image 2 */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        {/* Soft Blue Header Banner */}
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <FileText size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">ATM & Franchise Details</h2>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Row 1: ATM ID, Site ID, Transaction Date (3 cols) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ATM ID * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ATM ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Cpu size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                <select
                  value={atmId}
                  onChange={(e) => handleAtmChange(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="">Select ATM ID</option>
                  <option value="DX-MH-01482">DX-MH-01482</option>
                  <option value="DX-UP-02391">DX-UP-02391</option>
                  <option value="DX-DL-03112">DX-DL-03112</option>
                  <option value="DX-KA-04981">DX-KA-04981</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Site ID * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Site ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                <select
                  value={siteId}
                  onChange={(e) => handleSiteChange(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="">Select Site ID</option>
                  <option value="ST-MH-PUN-00124">ST-MH-PUN-00124</option>
                  <option value="ST-UP-AGR-00219">ST-UP-AGR-00219</option>
                  <option value="ST-DL-NOI-00342">ST-DL-NOI-00342</option>
                  <option value="ST-KA-BLR-00481">ST-KA-BLR-00481</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Transaction Date * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Transaction Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>
          </div>

          {/* Row 2: FR Name, FR Mobile Number (2 cols) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FR Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                FR Name
              </label>
              <div className="relative">
                <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                <input
                  type="text"
                  value={frName}
                  onChange={(e) => setFrName(e.target.value)}
                  placeholder="Enter FR Name"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* FR Mobile Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                FR Mobile Number
              </label>
              <div className="relative">
                <Phone size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                <input
                  type="text"
                  value={frMobileNumber}
                  onChange={(e) => setFrMobileNumber(e.target.value)}
                  placeholder="Enter FR Mobile Number"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: Bank & Payment Details matching Image 2 */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        {/* Soft Blue Header Banner */}
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <Landmark size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">Bank & Payment Details</h2>
        </div>

        {/* 2-Column Form Body (Left Column vs Right Column) */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {/* ── Left Column ── */}
          <div className="space-y-4">
            {/* Bank * with + Add Bank button */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Bank <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Landmark size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                  <select
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                  >
                    <option value="">Select Bank</option>
                    {banksList.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={() => setAddBankModalOpen(true)}
                  className="h-8.5 px-3 rounded-lg border border-[#0066FF] bg-white hover:bg-blue-50 text-[#0066FF] text-[12px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
                >
                  <Plus size={14} />
                  <span>Add Bank</span>
                </button>
              </div>
            </div>

            {/* HPY Account Number * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                HPY Account Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CreditCard size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                <select
                  value={hpyAccount}
                  onChange={(e) => setHpyAccount(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="">Select HPY Account Number</option>
                  <option value="HPY-9921408">HPY-9921408</option>
                  <option value="HPY-8841029">HPY-8841029</option>
                  <option value="HPY-7719204">HPY-7719204</option>
                  <option value="HPY-6629104">HPY-6629104</option>
                  <option value="HPY-5510294">HPY-5510294</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Account Holder Name * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Account Holder Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="Enter Account Holder Name"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* FR Account Number * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                FR Account Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CreditCard size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                <input
                  type="text"
                  value={frAccount}
                  onChange={(e) => setFrAccount(e.target.value)}
                  placeholder="Enter FR Account Number"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* FR IFSC * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                FR IFSC <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Settings size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                <input
                  type="text"
                  value={frIfsc}
                  onChange={(e) => setFrIfsc(e.target.value)}
                  placeholder="Enter FR IFSC"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className="space-y-4">
            {/* Payment Date * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Payment Transfer Time * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Payment Transfer Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Clock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                <input
                  type="time"
                  step="1"
                  value={transferTime}
                  onChange={(e) => setTransferTime(e.target.value)}
                  placeholder="Select Transfer Time"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Payment Type * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Payment Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CreditCard size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as SdPaymentType)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="">Select Payment Type</option>
                  {SD_PAYMENT_TYPES.map((pt) => (
                    <option key={pt} value={pt}>{pt}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* TXN Number * & Amount (₹) * in row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  TXN Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                  <input
                    type="text"
                    value={txnNumber}
                    onChange={(e) => setTxnNumber(e.target.value)}
                    placeholder="Enter TXN Number"
                    className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] font-semibold text-[13px] pointer-events-none">
                    ₹
                  </span>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter Amount"
                    className="w-full h-8.5 pl-7 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                  />
                </div>
              </div>
            </div>

            {/* Type * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <List size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                <select
                  value={depositType}
                  onChange={(e) => setDepositType(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="">Select Type</option>
                  {DEPOSIT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar matching Image 2 */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center justify-between shadow-sm">
        {/* Back Button on Left */}
        <button
          type="button"
          onClick={() => navigate('/finance/sd')}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[#0066FF]/30 text-[#0066FF] hover:bg-blue-50/60 text-[13px] font-semibold transition-all shadow-xs"
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>

        {/* Right Action Buttons */}
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
            <span>Submit</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Add Bank Modal */}
      {addBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-[#EAF3FD]">
              <div className="flex items-center gap-2">
                <Landmark size={18} className="text-[#0066FF]" />
                <h3 className="font-bold text-[14px] text-slate-800">Add New Bank</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddBankModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddBankSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="e.g. Bank of Maharashtra"
                  autoFocus
                  className="w-full h-9 px-3 text-[12.5px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddBankModalOpen(false)}
                  className="h-8.5 px-3 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8.5 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12px] font-semibold"
                >
                  Save Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
