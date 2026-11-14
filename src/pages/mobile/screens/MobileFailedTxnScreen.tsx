import { useState } from 'react'
import {
  RotateCcw,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Building2,
  Upload,
  Send,
  Save
} from 'lucide-react'

interface MobileFailedTxnScreenProps {
  onBackToMore?: () => void
}

export function MobileFailedTxnScreen({ onBackToMore }: MobileFailedTxnScreenProps) {
  const [tab, setTab] = useState<'form' | 'history'>('form')

  // Form states matching 3.31.52 PM.jpeg
  const [atmId, setAtmId] = useState('ATM012345')
  const [siteId] = useState('2014124545')
  const [machineType, setMachineType] = useState('Hitachi H1')
  const [txnType, setTxnType] = useState('Cash Withdrawal')
  const [txnId, setTxnId] = useState('TXN992817')
  const [utr, setUtr] = useState('UTR190284')
  const [txnDate] = useState('19.10.2026')
  const [txnTime] = useState('08:00 PM')

  // Customer
  const [custName, setCustName] = useState('Amitabh Singh')
  const [accountNo, setAccountNo] = useState('981273910291')
  const [bankName, setBankName] = useState('State Bank of India')
  const [ifsc, setIfsc] = useState('SBIN0001092')
  const [cardLast4, setCardLast4] = useState('8812')
  const [branch, setBranch] = useState('Civil Lines')
  const [rrn, setRrn] = useState('629192837190')
  const [amount, setAmount] = useState('2500')
  const [slipUploaded, setSlipUploaded] = useState(false)

  // Status & Remark
  const [complaintNo] = useState('FTX-2026-0918')
  const [complaintStatus, setComplaintStatus] = useState('Under Investigation')
  const [remarks, setRemarks] = useState('Customer debited ₹2500, no cash dispensed from shutter.')

  const [historyList, setHistoryList] = useState([
    {
      id: 'FTX-2026-0918',
      atmId: 'ATM012345',
      name: 'Amitabh Singh',
      amount: '₹2,500',
      date: '19 Oct 2026, 08:00 PM',
      status: 'Under Investigation',
      rrn: '629192837190'
    },
    {
      id: 'FTX-2026-0915',
      atmId: 'ATM012346',
      name: 'Sunita Devi',
      amount: '₹5,000',
      date: '17 Oct 2026, 02:30 PM',
      status: 'Refund Processed',
      rrn: '559102938471'
    }
  ])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newEntry = {
      id: complaintNo,
      atmId,
      name: custName,
      amount: `₹${Number(amount).toLocaleString()}`,
      date: `${txnDate}, ${txnTime}`,
      status: complaintStatus,
      rrn
    }
    setHistoryList([newEntry, ...historyList])
    setTab('history')
    alert(`Failed Transaction complaint ${complaintNo} submitted! Customer ticket logged.`)
  }

  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      {/* Top Banner Matching 3.31.52 PM.jpeg */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToMore && (
              <button
                onClick={onBackToMore}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h1 className="text-base font-black text-white">Failed Transaction Complaint</h1>
              <p className="text-[11px] text-blue-100 mt-0.5">
                Register customer complaints for failed transactions and disputes.
              </p>
            </div>
          </div>
          <RotateCcw size={24} className="text-amber-300 shrink-0" />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTab('form')}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'form' ? 'bg-white text-[#0B2A6B] shadow-xs' : 'bg-white/15 text-white/90'
            }`}
          >
            Complaint Form
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'history' ? 'bg-white text-[#0B2A6B] shadow-xs' : 'bg-white/15 text-white/90'
            }`}
          >
            Failed TXNs Log ({historyList.length})
          </button>
        </div>
      </div>

      {tab === 'form' ? (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Card 1: ATM & Transaction Details */}
          <div className="rounded-2xl border border-blue-200 bg-white overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-[#0C3E98] to-[#1453CA] px-3.5 py-1.5 text-white text-xs font-bold flex items-center gap-1.5">
              <Building2 size={14} /> ATM & Transaction Details
            </div>
            <div className="p-3.5 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">ATM ID *</label>
                  <select
                    value={atmId}
                    onChange={(e) => setAtmId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-bold"
                  >
                    <option value="ATM012345">ATM012345</option>
                    <option value="ATM012346">ATM012346</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">Site ID</label>
                  <input
                    type="text"
                    readOnly
                    value={siteId}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">Machine Type *</label>
                  <select
                    value={machineType}
                    onChange={(e) => setMachineType(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-bold"
                  >
                    <option value="Hitachi H1">Hitachi H1</option>
                    <option value="NCR SelfServ">NCR SelfServ</option>
                    <option value="Diebold 5500">Diebold 5500</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">TXN Type *</label>
                  <select
                    value={txnType}
                    onChange={(e) => setTxnType(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-bold"
                  >
                    <option value="Cash Withdrawal">Cash Withdrawal</option>
                    <option value="Fast Cash">Fast Cash</option>
                    <option value="Balance Inquiry">Balance Inquiry</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">TXN ID *</label>
                  <input
                    type="text"
                    value={txnId}
                    onChange={(e) => setTxnId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">UTR</label>
                  <input
                    type="text"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Date & Time */}
          <div className="rounded-2xl border border-blue-200 bg-white overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-[#0C3E98] to-[#1453CA] px-3.5 py-1.5 text-white text-xs font-bold flex items-center gap-1.5">
              <Calendar size={14} /> Date & Time
            </div>
            <div className="p-3.5 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 font-bold">
                <span>{txnDate}</span>
                <Calendar size={13} className="text-blue-600" />
              </div>
              <div className="flex items-center justify-between h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 font-bold">
                <span>{txnTime}</span>
                <Clock size={13} className="text-blue-600" />
              </div>
            </div>
          </div>

          {/* Card 3: Customer Details */}
          <div className="rounded-2xl border border-blue-200 bg-white overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-[#0C3E98] to-[#1453CA] px-3.5 py-1.5 text-white text-xs font-bold flex items-center gap-1.5">
              <User size={14} /> Customer Details
            </div>
            <div className="p-3.5 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">Name *</label>
                  <input
                    type="text"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">Account No</label>
                  <input
                    type="text"
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">RRN *</label>
                  <input
                    type="text"
                    value={rrn}
                    onChange={(e) => setRrn(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">Card Last 4 Digits</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-red-600 block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-9 rounded-xl border border-red-400 bg-red-50/50 px-2 font-black text-red-600 text-center"
                    required
                  />
                </div>
              </div>

              {/* Upload TXN Slip */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-700 block">TXN Slip</span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {slipUploaded ? 'Customer slip attached' : 'No file chosen'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSlipUploaded(true)}
                  className="px-3 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold flex items-center gap-1"
                >
                  <Upload size={12} /> Choose File
                </button>
              </div>
            </div>
          </div>

          {/* Card 4: Communication & Remark */}
          <div className="rounded-2xl border border-blue-200 bg-white overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-[#0C3E98] to-[#1453CA] px-3.5 py-1.5 text-white text-xs font-bold">
              Communication & Remark
            </div>
            <div className="p-3.5 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">Complaint Number *</label>
                  <input
                    type="text"
                    readOnly
                    value={complaintNo}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2 font-mono font-bold text-blue-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">Complaint Status *</label>
                  <select
                    value={complaintStatus}
                    onChange={(e) => setComplaintStatus(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-bold text-slate-800"
                  >
                    <option value="Under Investigation">Under Investigation</option>
                    <option value="Refund Initiated">Refund Initiated</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 bg-slate-50/50"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-1">
            {onBackToMore && (
              <button
                type="button"
                onClick={onBackToMore}
                className="h-11 px-4 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700"
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={() => alert('Draft saved successfully!')}
              className="flex-1 h-11 rounded-xl border border-blue-600 text-blue-700 text-xs font-bold hover:bg-blue-50 flex items-center justify-center gap-1.5"
            >
              <Save size={15} /> Save Draft
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] text-white text-xs font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
            >
              <Send size={15} /> Submit Complaint
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2.5">
          {historyList.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-[#0B2A6B]">{item.id}</h4>
                  <p className="text-[10px] text-slate-500">ATM: {item.atmId} • Customer: {item.name}</p>
                </div>
                <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10px] font-extrabold">
                  {item.status}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs border-t pt-2">
                <span className="text-[10px] text-slate-400 font-mono">RRN: {item.rrn}</span>
                <span className="text-sm font-black text-rose-600">{item.amount}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
