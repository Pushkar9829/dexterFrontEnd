import { useState } from 'react'
import {
  Landmark,
  Coins,
  Banknote,
  FileBarChart,
  FileText,
  Percent,
  ShieldCheck,
  Sliders,
  ChevronRight,
  ArrowLeft,
  Upload,
  Download,
  CheckCircle,
  PlusCircle,
  FileCheck,
  Building2,
  Calendar
} from 'lucide-react'
import { CardCornerAccent } from '../components/CardCornerAccent'
import { INITIAL_CLF_RECORDS, type ClfConsolidatedRecord } from '../data/mobileMockData'

interface MobileAccountsScreenProps {
  onBackToMore: () => void
}

type AccountSubmodule =
  | 'list'
  | 'settlement'
  | 'payout'
  | 'clf'
  | 'wla'
  | 'tds'
  | 'gst'
  | 'security-deposit'
  | 'dynamic-limit'

export function MobileAccountsScreen({ onBackToMore }: MobileAccountsScreenProps) {
  const [activeSub, setActiveSub] = useState<AccountSubmodule>('list')

  // CLF state
  const [clfRecords, setClfRecords] = useState<ClfConsolidatedRecord[]>(INITIAL_CLF_RECORDS)
  const [showClfDepositForm, setShowClfDepositForm] = useState(false)
  const [newClfAmount, setNewClfAmount] = useState('50000')
  const [newClfUtr, setNewClfUtr] = useState('UTR883920')
  const [newClfSite, setNewClfSite] = useState('ATM-1001')

  // WLA Statement state (matching 4.57.59 PM.jpeg)
  const [wlaAtmId] = useState('MPZ14645')
  const [wlaMonthYear] = useState('September - 2026')
  const [isPasswordProtected, setIsPasswordProtected] = useState<'yes' | 'no'>('no')
  const [wlaStatements] = useState([
    { month: 'MAY 2026', status: 'GENERATED', remarks: '-' },
    { month: 'JANUARY 2025', status: 'GENERATED', remarks: '-' }
  ])

  // Security Deposit state (matching 5.00.45 PM.jpeg)
  const [sdAtmId, setSdAtmId] = useState('ATM-1001 (Bewar)')
  const [sdAmount, setSdAmount] = useState('100000')
  const [sdDate, setSdDate] = useState('10/10/2026')
  const [sdUtr, setSdUtr] = useState('AXISDEX99120')
  const [sdBank, setSdBank] = useState('Axis Bank')
  const [sdHistory] = useState([
    { site: 'ATM-1001', amount: '₹1,00,000', utr: 'AXISDEX99120', status: 'Approved', date: '10 Oct 2026' },
    { site: 'ATM-1002', amount: '₹1,00,000', utr: 'HDFCDEX44819', status: 'Verified', date: '01 Nov 2026' }
  ])

  const submodules = [
    { id: 'settlement' as AccountSubmodule, title: 'Settlement Account', icon: Landmark, desc: 'Franchise settlement account & verification' },
    { id: 'payout' as AccountSubmodule, title: 'Payout Account', icon: Coins, desc: 'Registered payout accounts & passbook' },
    { id: 'clf' as AccountSubmodule, title: 'Cash Loading Fund (CLF)', icon: Banknote, desc: 'CLF deposit, verification, refund & history' },
    { id: 'wla' as AccountSubmodule, title: 'WLA Statement', icon: FileBarChart, desc: 'Month-wise WLA statements upload & download' },
    { id: 'tds' as AccountSubmodule, title: 'TDS Letters', icon: FileText, desc: 'Backend uploaded TDS certificates history' },
    { id: 'gst' as AccountSubmodule, title: 'GST', icon: Percent, desc: 'Monthly GST returns & compliance documents' },
    { id: 'security-deposit' as AccountSubmodule, title: 'Security Deposit', icon: ShieldCheck, desc: 'Site-wise security deposit entry & approval' },
    { id: 'dynamic-limit' as AccountSubmodule, title: 'Dynamic Limit', icon: Sliders, desc: 'Live credit limit calculated on CLF refund' }
  ]

  const handleAddClfDeposit = (e: React.FormEvent) => {
    e.preventDefault()
    const record: ClfConsolidatedRecord = {
      sn: clfRecords.length + 1,
      clfReference: `CLF-00${clfRecords.length + 1}`,
      siteId: newClfSite,
      depositAmount: Number(newClfAmount),
      depositDate: new Date().toLocaleDateString('en-GB'),
      txnId: newClfUtr,
      expectedRefundDate: '25-11-2026',
      refundAmount: 0,
      outstandingAmount: Number(newClfAmount),
      status: 'Pending Verification'
    }
    setClfRecords([record, ...clfRecords])
    setShowClfDepositForm(false)
    alert(`CLF Deposit ${record.clfReference} submitted for CRM verification!`)
  }

  // Render Submodule List (Main screen matching WhatsApp Image 2026-11-09 at 10.29.42 PM.jpeg)
  if (activeSub === 'list') {
    return (
      <div className="space-y-4 pb-6 pt-3 px-3">
        {/* Banner with Wallet / Accounts Header */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToMore}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-blue-200 font-semibold">
                <Landmark size={14} />
                <span>Financial Management</span>
              </div>
              <h1 className="text-xl font-black text-white">Accounts</h1>
            </div>
          </div>
          <span className="rounded-xl bg-white/20 px-2.5 py-1 text-xs font-bold text-white border border-white/20">
            8 Sub-modules
          </span>
        </div>

        {/* 8 Full-width Submodule Cards matching screenshot */}
        <div className="space-y-2.5">
          {submodules.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSub(item.id)}
                className="group relative flex w-full items-center justify-between rounded-2xl border border-blue-200/90 bg-white p-3.5 shadow-xs hover:border-blue-400 hover:shadow-md active:scale-[0.99] transition-all overflow-hidden text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50/80 group-hover:bg-blue-100 transition-colors">
                    <Icon size={24} className="text-[#0C3E98] stroke-[2]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0B2A6B] group-hover:text-blue-700">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-blue-600">
                  <ChevronRight size={18} />
                </div>

                <CardCornerAccent />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 1. Settlement Account Detail View
  if (activeSub === 'settlement') {
    return (
      <div className="space-y-4 pb-6 pt-3 px-3">
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSub('list')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="font-bold text-base">Settlement Account</h2>
          </div>
          <span className="rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold">
            Active Approved
          </span>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-xs font-bold text-slate-700">Primary Settlement Bank</span>
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5">
              Verified & Mapped
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 block">Account Holder</span>
              <span className="font-bold text-slate-800">Ranjeet Pal (Proprietor)</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 block">Bank Name</span>
              <span className="font-bold text-slate-800">HDFC Bank Ltd</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 block">Masked Account No</span>
              <span className="font-bold text-slate-800 font-mono">50200048******19</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 block">IFSC Code</span>
              <span className="font-bold text-slate-800 font-mono">HDFC0001892</span>
            </div>
            <div className="col-span-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 block">Branch Address</span>
              <span className="font-bold text-slate-800">Main Market, Mainpuri Branch, UP</span>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between text-[11px] text-slate-600 bg-blue-50/70 p-2 rounded-xl">
              <span className="flex items-center gap-1.5 font-medium">
                <FileCheck size={14} className="text-blue-600" /> Cancelled Cheque (Cheque_502.pdf)
              </span>
              <span className="text-blue-700 font-bold underline cursor-pointer">View</span>
            </div>
          </div>
        </div>

        {/* Change Request Card */}
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
          <p className="text-xs text-slate-600 font-medium">
            Need to update your settlement bank? Per CRM policy, changes require Admin verification. Old verified accounts remain permanently archived in history.
          </p>
          <button
            onClick={() => alert('Change Settlement Account Request opened')}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
          >
            <PlusCircle size={14} /> Submit New Account Request
          </button>
        </div>
      </div>
    )
  }

  // 2. Payout Account Detail View
  if (activeSub === 'payout') {
    return (
      <div className="space-y-4 pb-6 pt-3 px-3">
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSub('list')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="font-bold text-base">Payout Account</h2>
          </div>
          <span className="rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold">
            Verified
          </span>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-xs space-y-3">
          <p className="text-xs text-slate-500">
            Monthly franchise commissions and fee disbursements are credited directly to this verified payout account.
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 p-2 rounded-xl">
              <span className="text-[10px] text-slate-500 block">Bank Name</span>
              <span className="font-bold text-slate-800">State Bank of India</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl">
              <span className="text-[10px] text-slate-500 block">Account Number</span>
              <span className="font-bold text-slate-800 font-mono">3129845******01</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl">
              <span className="text-[10px] text-slate-500 block">IFSC</span>
              <span className="font-bold text-slate-800 font-mono">SBIN0004921</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl">
              <span className="text-[10px] text-slate-500 block">Status</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle size={12} /> Approved
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 3. Cash Loading Fund (CLF) Detail View (matching Section 3.3 and Page 4 Table!)
  if (activeSub === 'clf') {
    const totalDeposited = clfRecords.reduce((acc, r) => acc + r.depositAmount, 0)
    const totalRefunded = clfRecords.reduce((acc, r) => acc + r.refundAmount, 0)
    const totalOutstanding = clfRecords.reduce((acc, r) => acc + r.outstandingAmount, 0)

    return (
      <div className="space-y-4 pb-6 pt-3 px-3">
        {/* Header */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSub('list')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="font-bold text-base leading-tight">Cash Loading Fund (CLF)</h2>
              <span className="text-[10px] text-blue-200">Consolidated Transaction Cycle</span>
            </div>
          </div>
          <button
            onClick={() => setShowClfDepositForm(!showClfDepositForm)}
            className="rounded-xl bg-white px-2.5 py-1 text-xs font-bold text-blue-900 shadow-xs hover:bg-blue-50"
          >
            {showClfDepositForm ? 'View Table' : '+ Deposit CLF'}
          </button>
        </div>

        {/* Dashboard Summary Cards (matching Section 3.3.E) */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-2">
            <span className="text-[9.5px] font-bold text-slate-500 block">Total Deposited</span>
            <span className="text-sm font-black text-[#0B2A6B]">₹{totalDeposited.toLocaleString()}</span>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2">
            <span className="text-[9.5px] font-bold text-slate-500 block">Total Refunded</span>
            <span className="text-sm font-black text-emerald-600">₹{totalRefunded.toLocaleString()}</span>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-2">
            <span className="text-[9.5px] font-bold text-slate-500 block">Outstanding</span>
            <span className="text-sm font-black text-amber-600">₹{totalOutstanding.toLocaleString()}</span>
          </div>
        </div>

        {/* CLF Deposit Entry Form */}
        {showClfDepositForm && (
          <form
            onSubmit={handleAddClfDeposit}
            className="rounded-2xl border border-blue-200 bg-white p-4 shadow-md space-y-3 animate-in fade-in"
          >
            <h3 className="text-xs font-bold text-[#0B2A6B] border-b pb-1.5 flex items-center gap-1.5">
              <PlusCircle size={15} className="text-blue-600" /> New CLF Deposit Entry
            </h3>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">ATM / Site ID *</label>
              <select
                value={newClfSite}
                onChange={(e) => setNewClfSite(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800"
              >
                <option value="ATM-1001">ATM-1001 (Bewar Mainpuri)</option>
                <option value="ATM-1002">ATM-1002 (City Center)</option>
                <option value="ATM-1003">ATM-1003 (Green Plaza)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  value={newClfAmount}
                  onChange={(e) => setNewClfAmount(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">UTR Number *</label>
                <input
                  type="text"
                  value={newClfUtr}
                  onChange={(e) => setNewClfUtr(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Upload Payment Slip / Receipt</label>
              <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center bg-slate-50">
                <Upload size={18} className="mx-auto text-blue-600 mb-1" />
                <span className="text-[11px] text-slate-500 font-medium">Tap to select receipt image or PDF</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-10 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700"
            >
              Submit Deposit for Verification
            </button>
          </form>
        )}

        {/* Consolidated Transaction History Table (exact columns from PDF Page 4!) */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="bg-slate-100 px-3 py-2 border-b text-xs font-bold text-slate-800 flex items-center justify-between">
            <span>CLF Deposit & Refund Consolidated Table</span>
            <span className="text-[10px] text-slate-500">{clfRecords.length} Entries</span>
          </div>

          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-[#0C3E98] text-white">
                <tr>
                  <th className="py-2 px-2.5">CLF Ref</th>
                  <th className="py-2 px-2.5">Site ID</th>
                  <th className="py-2 px-2.5">Deposit (₹)</th>
                  <th className="py-2 px-2.5">Dep. Date</th>
                  <th className="py-2 px-2.5">UTR</th>
                  <th className="py-2 px-2.5">Refund (₹)</th>
                  <th className="py-2 px-2.5">Outstanding</th>
                  <th className="py-2 px-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clfRecords.map((r) => (
                  <tr key={r.clfReference} className="hover:bg-blue-50/40">
                    <td className="py-2.5 px-2.5 font-bold text-blue-700 font-mono">{r.clfReference}</td>
                    <td className="py-2.5 px-2.5 font-semibold text-slate-700">{r.siteId}</td>
                    <td className="py-2.5 px-2.5 font-bold text-slate-800">₹{r.depositAmount.toLocaleString()}</td>
                    <td className="py-2.5 px-2.5 text-slate-500">{r.depositDate}</td>
                    <td className="py-2.5 px-2.5 text-slate-600 font-mono">{r.txnId}</td>
                    <td className="py-2.5 px-2.5 font-bold text-emerald-600">₹{r.refundAmount.toLocaleString()}</td>
                    <td className="py-2.5 px-2.5 font-bold text-amber-600">₹{r.outstandingAmount.toLocaleString()}</td>
                    <td className="py-2.5 px-2.5">
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold whitespace-nowrap ${
                        r.status === 'Fully Refunded'
                          ? 'bg-emerald-100 text-emerald-700'
                          : r.status === 'Partially Refunded'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // 4. WLA Statement Screen (Matching WhatsApp Image 2026-11-12 at 4.57.59 PM.jpeg)
  if (activeSub === 'wla') {
    return (
      <div className="space-y-4 pb-6 pt-3 px-3">
        {/* Top Header */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSub('list')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="font-bold text-base">Statement Upload</h2>
          </div>
          <span className="text-xs text-blue-200">WLA Account</span>
        </div>

        {/* Form Container */}
        <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3.5">
          {/* ATM ID Field */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Building2 size={16} className="text-blue-600" />
              <span>ATM ID</span>
            </div>
            <span className="font-mono font-bold text-xs text-slate-900">{wlaAtmId}</span>
          </div>

          {/* Month-Year Field */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Calendar size={16} className="text-blue-600" />
              <span>MONTH-YEAR</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
              <span>{wlaMonthYear}</span>
              <Calendar size={14} className="text-blue-600" />
            </div>
          </div>

          {/* Upload PDF Box */}
          <div className="rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/30 p-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Upload size={22} />
            </div>
            <p className="mt-2 text-xs font-bold text-[#0B2A6B]">UPLOAD STATEMENT (PDF only allowed)</p>
            <button
              type="button"
              onClick={() => alert('File selector opened (PDF only)')}
              className="mt-2 inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-xs"
            >
              <Upload size={12} /> Upload PDF
            </button>
          </div>

          {/* Password Protected Radio */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <span className="text-[11px] font-bold text-slate-700 block mb-2">
              🔒 IS THE DOCUMENT PASSWORD PROTECTED?
            </span>
            <div className="flex items-center gap-6 text-xs font-semibold text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="pwdProtected"
                  checked={isPasswordProtected === 'yes'}
                  onChange={() => setIsPasswordProtected('yes')}
                  className="text-blue-600"
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="pwdProtected"
                  checked={isPasswordProtected === 'no'}
                  onChange={() => setIsPasswordProtected('no')}
                  className="text-blue-600"
                />
                <span>No</span>
              </label>
            </div>
          </div>

          {/* Upload Button */}
          <button
            type="button"
            onClick={() => alert('WLA Statement uploaded successfully!')}
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2"
          >
            <Upload size={16} /> UPLOAD
          </button>

          {/* Statement History Header Button */}
          <div className="flex items-center justify-center rounded-xl border border-blue-300 bg-blue-50/60 py-2 text-xs font-extrabold text-[#0B2A6B] gap-1.5">
            <FileBarChart size={15} />
            STATEMENT HISTORY
          </div>

          {/* Statement History Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-center text-xs">
              <thead className="bg-blue-100/70 text-[#0B2A6B] font-bold text-[11px]">
                <tr>
                  <th className="py-2">MONTH</th>
                  <th className="py-2">STATUS</th>
                  <th className="py-2">REMARKS</th>
                  <th className="py-2">DOWNLOAD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {wlaStatements.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 font-bold text-slate-800">{s.month}</td>
                    <td className="py-2.5">
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400">{s.remarks}</td>
                    <td className="py-2.5">
                      <button
                        onClick={() => alert(`Downloading ${s.month} Statement PDF`)}
                        className="text-red-600 hover:text-red-700 mx-auto"
                      >
                        <Download size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // 5. Security Deposit Screen (Matching WhatsApp Image 2026-11-12 at 5.00.45 PM.jpeg)
  if (activeSub === 'security-deposit') {
    return (
      <div className="space-y-4 pb-6 pt-3 px-3">
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSub('list')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="font-bold text-base">Security Deposits</h2>
          </div>
          <span className="text-xs text-blue-200">Site-wise Record</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            alert('Security Deposit entry updated successfully!')
          }}
          className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3"
        >
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Select ATM ID</label>
            <select
              value={sdAtmId}
              onChange={(e) => setSdAtmId(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800"
            >
              <option value="ATM-1001 (Bewar)">ATM-1001 (Bewar Mainpuri)</option>
              <option value="ATM-1002 (Mainpuri)">ATM-1002 (Mainpuri City)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">FUND AMOUNT</label>
            <input
              type="text"
              value={sdAmount}
              onChange={(e) => setSdAmount(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">DATE (dd/mm/yyyy)</label>
              <input
                type="text"
                value={sdDate}
                onChange={(e) => setSdDate(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">UTR NO</label>
              <input
                type="text"
                value={sdUtr}
                onChange={(e) => setSdUtr(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Select Bank</label>
            <select
              value={sdBank}
              onChange={(e) => setSdBank(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800"
            >
              <option value="Axis Bank">Axis Bank</option>
              <option value="HDFC Bank">HDFC Bank</option>
              <option value="ICICI Bank">ICICI Bank</option>
              <option value="State Bank of India">State Bank of India</option>
            </select>
          </div>

          <div className="rounded-xl border border-dashed border-red-300 bg-red-50/20 p-4 text-center">
            <span className="text-[11px] font-bold text-slate-700 block mb-2">
              UPLOAD CONFIRMATION SLIP (IMAGE OR PDF)
            </span>
            <button
              type="button"
              onClick={() => alert('Slip upload picker')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs"
            >
              <Upload size={13} /> Upload Image or Pdf
            </button>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">VERIFICATION STATUS</label>
            <div className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 flex items-center text-xs font-bold text-emerald-600">
              Approved by Authorized CRM Finance Team
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-2xl border-2 border-red-600 text-red-600 font-extrabold text-xs hover:bg-red-50 tracking-wider"
          >
            UPDATE
          </button>
        </form>

        {/* History Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
          <span className="text-xs font-bold text-slate-800 block border-b pb-1">Security Deposit History</span>
          {sdHistory.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-1 text-xs">
              <div>
                <span className="font-bold text-slate-800">{item.site}</span>
                <span className="text-[10px] text-slate-400 block">{item.utr} • {item.date}</span>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-[#0B2A6B] block">{item.amount}</span>
                <span className="text-[10px] font-bold text-emerald-600">{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 6, 7, 8: TDS, GST, Dynamic Limit screens
  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveSub('list')}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
          >
            <ArrowLeft size={16} />
          </button>
          <h2 className="font-bold text-base capitalize">{activeSub.replace('-', ' ')}</h2>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3">
        {activeSub === 'tds' && (
          <div>
            <p className="text-xs text-slate-600 mb-3">
              Quarterly TDS Certificates uploaded by Backend Finance Team for FY 2025-26:
            </p>
            <div className="space-y-2">
              {['Q1 (Apr - Jun 2026)', 'Q2 (Jul - Sep 2026)', 'Q4 (Jan - Mar 2026)'].map((q, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-blue-600" />
                    <span className="font-bold text-slate-800">Form 16A – {q}</span>
                  </div>
                  <button onClick={() => alert(`Downloading TDS Certificate ${q}`)} className="text-blue-600 font-bold hover:underline">
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSub === 'gst' && (
          <div>
            <p className="text-xs text-slate-600 mb-3">
              Month-wise GST Invoices synchronized with CRM Web Application:
            </p>
            <div className="space-y-2">
              {['October 2026', 'September 2026', 'August 2026'].map((m, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs">
                  <div>
                    <span className="font-bold text-slate-800">GST Return - {m}</span>
                    <span className="text-[10px] text-emerald-600 block">Filed & Verified</span>
                  </div>
                  <button onClick={() => alert(`Downloading GST Invoice for ${m}`)} className="text-blue-600 font-bold hover:underline">
                    Download PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSub === 'dynamic-limit' && (
          <div className="space-y-3">
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-xs text-slate-700">
              <span className="font-bold text-[#0B2A6B] block mb-1">Dynamic Limit System Logic</span>
              Dynamic Limit is computed dynamically based on eligible CLF refunds returned by the company. It allows franchise partners to forecast cash operations with 100% transparency.
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-500 block">Active Dynamic Limit</span>
                <span className="text-base font-extrabold text-blue-700">₹4,00,000</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-500 block">Available Headroom</span>
                <span className="text-base font-extrabold text-emerald-600">₹1,80,000</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
