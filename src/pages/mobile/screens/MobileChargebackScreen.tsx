import { useState } from 'react'
import {
  CreditCard,
  ArrowLeft,
  Calendar,
  Clock,
  Upload,
  Save,
  Send,
  Search,
  FileText,
  Plus,
  X,
  ChevronRight
} from 'lucide-react'
import { useChargeBackStore, type ChargeBackDisputeRecord } from '@/data/chargeBackDisputes'

interface MobileChargebackScreenProps {
  onBackToMore?: () => void
}

export function MobileChargebackScreen({ onBackToMore }: MobileChargebackScreenProps) {
  const [mainTab, setMainTab] = useState<'dispute' | 'logs'>('dispute')
  const [fundingType, setFundingType] = useState<'sf' | 'ffm'>('sf')

  // Global Charge Back Store
  const { records, addRecord } = useChargeBackStore()

  // Form state matching 3.10.44 PM & 3.16.25 PM
  const [atmId, setAtmId] = useState(fundingType === 'sf' ? 'MCRM7303' : 'MBP12121')
  const [natureOfIncident, setNatureOfIncident] = useState('Pre-Arbitration Raise')
  const [cardNo, setCardNo] = useState('6173********6088')
  const [rrn, setRrn] = useState('629118042198')
  const [txnDate] = useState('18-10-2026')
  const [txnTime] = useState('12:00:00')
  const [txnAmount, setTxnAmount] = useState('800')
  const [adjustedAmount, setAdjustedAmount] = useState('0')
  const [disputeAmount, setDisputeAmount] = useState('800')
  const [errorDesc, setErrorDesc] = useState('TRXN STATUS JAM')
  const [filesCount, setFilesCount] = useState(3)

  // Communication & Remarks
  const [wlaoRemark, setWlaoRemark] = useState('Done')
  const [hitachiEmailDate, setHitachiEmailDate] = useState('03-10-2026')
  const [emailResponseDate, setEmailResponseDate] = useState('05-10-2026')
  const [frRemark, setFrRemark] = useState('FR Confirm No Overage Found.')
  const [remarks, setRemarks] = useState('Customer debited but cash jammed in dispenser cassette #2.')

  // Charge Back Logs state
  const [searchQuery, setSearchQuery] = useState('')
  const [logFundingFilter, setLogFundingFilter] = useState<'All' | 'SF' | 'FFM'>('All')
  const [logStatusFilter, setLogStatusFilter] = useState<'All' | 'Pending' | 'In Progress' | 'Resolved'>('All')
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<ChargeBackDisputeRecord | null>(null)

  const handleFundingSwitch = (type: 'sf' | 'ffm') => {
    setFundingType(type)
    if (type === 'sf') {
      setAtmId('MCRM7303')
      setCardNo('6173********6088')
      setRrn('629118042198')
      setTxnAmount('800')
      setDisputeAmount('800')
      setErrorDesc('TRXN STATUS JAM')
    } else {
      setAtmId('MBP12121')
      setCardNo('6682********2456')
      setRrn('GZG215372411')
      setTxnAmount('5000')
      setDisputeAmount('400')
      setErrorDesc('POWER INTERRUPTION D TRXN STATUS JAM')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addRecord({
      fundingType: fundingType === 'sf' ? 'SF' : 'FFM',
      atmId,
      cardNumber: cardNo,
      rrnNumber: rrn,
      txnAmt: txnAmount,
      adjustedAmt: adjustedAmount,
      disputeAmt: disputeAmount,
      mspReferenceNo: '4192',
      sendStatus: 'Send',
      natureOfIncident: fundingType === 'ffm' ? natureOfIncident : 'Chargeback Raised',
      errorDescription: errorDesc,
      txnDate,
      txnTime,
      txnType: 'Withdrawal - Card',
      txnId: `TXN${Math.floor(10000000 + Math.random() * 90000000)}`,
      utr: `UTR${Math.floor(10000000 + Math.random() * 90000000)}`,
      wlaoRemark,
      hitachiEmailDate,
      emailResponseDate,
      frRemark,
      uploadedDocuments: ['dispute_proof.pdf'],
      remarks,
      status: 'Pending'
    })
    alert('Charge Back Dispute submitted and recorded in Charge Back Logs!')
    setMainTab('logs')
  }

  // Filtered Logs
  const filteredLogs = records.filter((r) => {
    if (logFundingFilter !== 'All' && r.fundingType !== logFundingFilter) return false
    if (logStatusFilter !== 'All' && r.status !== logStatusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchTicket = r.ticketNumber?.toLowerCase().includes(q)
      const matchAtm = r.atmId?.toLowerCase().includes(q)
      const matchRrn = r.rrnNumber?.toLowerCase().includes(q)
      const matchCard = r.cardNumber?.toLowerCase().includes(q)
      const matchError = r.errorDescription?.toLowerCase().includes(q)
      if (!matchTicket && !matchAtm && !matchRrn && !matchCard && !matchError) return false
    }
    return true
  })

  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      {/* Top Banner Matching 3.10.44 PM.jpeg */}
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
              <h1 className="text-base font-black text-white">Charge Back Dispute</h1>
            </div>
          </div>
          <CreditCard size={26} className="text-amber-300 shrink-0" />
        </div>

        {/* Main Tab Controls: Dispute Form vs Dispute Logs */}
        <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-white/10 p-1">
          <button
            type="button"
            onClick={() => setMainTab('dispute')}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${mainTab === 'dispute'
              ? 'bg-white text-[#0B2A6B] shadow-sm'
              : 'text-white/80 hover:text-white'
              }`}
          >
            <Plus size={13} />
            <span>Raise Dispute</span>
          </button>
          <button
            type="button"
            onClick={() => setMainTab('logs')}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${mainTab === 'logs'
              ? 'bg-white text-[#0B2A6B] shadow-sm'
              : 'text-white/80 hover:text-white'
              }`}
          >
            <FileText size={13} />
            <span>Charge Back Logs</span>
          </button>
        </div>

        {/* SF vs FFM Switcher Tabs (Shown on Dispute Form tab) */}
        {mainTab === 'dispute' && (
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleFundingSwitch('sf')}
              className={`py-1 px-2 rounded-lg text-[11px] font-bold transition-all ${fundingType === 'sf'
                ? 'bg-white/25 text-white ring-1 ring-white/40'
                : 'bg-black/15 text-blue-100 hover:bg-black/25'
                }`}
            >
              Self Funding (SF)
            </button>
            <button
              type="button"
              onClick={() => handleFundingSwitch('ffm')}
              className={`py-1 px-2 rounded-lg text-[11px] font-bold transition-all ${fundingType === 'ffm'
                ? 'bg-white/25 text-white ring-1 ring-white/40'
                : 'bg-black/15 text-blue-100 hover:bg-black/25'
                }`}
            >
              Full Funding (FFM)
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: RAISE DISPUTE FORM */}
      {mainTab === 'dispute' && (
        <form onSubmit={handleSubmit} className="space-y-3.5 animate-in fade-in">
          {/* Form Container */}
          <div className="rounded-2xl border border-blue-200 bg-white overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-[#0C3E98] to-[#1453CA] px-3.5 py-2 text-white text-xs font-black">
              Charge Back Dispute Details – {fundingType === 'sf' ? 'Self Funding' : 'FFM'}
            </div>

            <div className="p-3.5 space-y-3 text-xs">
              {/* ATM ID */}
              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">ATM ID *</label>
                <input
                  type="text"
                  value={atmId}
                  onChange={(e) => setAtmId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 font-mono font-bold text-slate-800"
                  required
                />
              </div>

              {/* FFM only: Nature of Incident */}
              {fundingType === 'ffm' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">Nature of Incident *</label>
                  <select
                    value={natureOfIncident}
                    onChange={(e) => setNatureOfIncident(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 font-bold text-slate-800"
                  >
                    <option value="Pre-Arbitration Raise">Pre-Arbitration Raise</option>
                    <option value="Good Faith Claim">Good Faith Claim</option>
                    <option value="Chargeback Representation">Chargeback Representation</option>
                  </select>
                </div>
              )}

              {/* Card No & RRN Number */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">Card No *</label>
                  <input
                    type="text"
                    value={cardNo}
                    onChange={(e) => setCardNo(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 font-mono font-bold text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">RRN Number *</label>
                  <input
                    type="text"
                    value={rrn}
                    onChange={(e) => setRrn(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 font-mono font-bold text-slate-800"
                    required
                  />
                </div>
              </div>

              {/* TXN Date & Time */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">TXN Date *</label>
                  <div className="flex items-center justify-between h-9 rounded-xl border border-slate-300 bg-white px-2.5 font-bold text-slate-800">
                    <span>{txnDate}</span>
                    <Calendar size={13} className="text-blue-600" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">TXN Time *</label>
                  <div className="flex items-center justify-between h-9 rounded-xl border border-slate-300 bg-white px-2.5 font-bold text-slate-800">
                    <span>{txnTime}</span>
                    <Clock size={13} className="text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">TXN Amt (₹) *</label>
                  <input
                    type="text"
                    value={txnAmount}
                    onChange={(e) => setTxnAmount(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">Adjusted Amt (₹)</label>
                  <input
                    type="text"
                    value={adjustedAmount}
                    onChange={(e) => setAdjustedAmount(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-slate-50 px-2 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-red-600 block mb-1">Dispute Amt (₹) *</label>
                  <input
                    type="text"
                    value={disputeAmount}
                    onChange={(e) => setDisputeAmount(e.target.value)}
                    className="w-full h-9 rounded-xl border-2 border-red-500 bg-red-50/70 px-2 font-black text-red-600 text-center"
                  />
                </div>
              </div>

              {/* Error Description Dropdown */}
              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">Error Description *</label>
                <select
                  value={errorDesc}
                  onChange={(e) => setErrorDesc(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 font-bold text-slate-800"
                >
                  <option value="TRXN STATUS JAM">TRXN STATUS JAM</option>
                  <option value="POWER INTERRUPTION D TRXN STATUS JAM">POWER INTERRUPTION D TRXN STATUS JAM</option>
                  <option value="CARD RETRACT ERROR">CARD RETRACT ERROR</option>
                  <option value="DISPENSER TIMEOUT">DISPENSER TIMEOUT</option>
                </select>
              </div>

              {/* Upload Video / Documents */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-700 block">Upload Video / Documents</span>
                  <span className="text-[10px] text-slate-400 font-medium">{filesCount} file(s) chosen</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilesCount((prev) => prev + 1)}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold flex items-center gap-1"
                  >
                    <Upload size={12} /> Choose Files
                  </button>
                  <button
                    type="button"
                    onClick={() => alert('Viewing 3 uploaded proof documents')}
                    className="px-2 py-1 rounded-lg border border-blue-600 text-blue-700 text-[10px] font-bold"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Communication & Remarks Container */}
          <div className="rounded-2xl border border-blue-200 bg-white overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-[#0C3E98] to-[#1453CA] px-3.5 py-2 text-white text-xs font-black">
              Communication & Remarks
            </div>

            <div className="p-3.5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Hitachi Email Date</label>
                  <input
                    type="text"
                    value={hitachiEmailDate}
                    onChange={(e) => setHitachiEmailDate(e.target.value)}
                    className="w-full h-8 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Email Response Date</label>
                  <input
                    type="text"
                    value={emailResponseDate}
                    onChange={(e) => setEmailResponseDate(e.target.value)}
                    className="w-full h-8 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">FR Remark</label>
                <input
                  type="text"
                  value={frRemark}
                  onChange={(e) => setFrRemark(e.target.value)}
                  className="w-full h-8 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">WLAO Remark</label>
                <input
                  type="text"
                  value={wlaoRemark}
                  onChange={(e) => setWlaoRemark(e.target.value)}
                  className="w-full h-8 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                  <span>Remarks</span>
                  <span className="text-slate-400">{remarks.length} / 500</span>
                </div>
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
              <Send size={15} /> Submit Dispute
            </button>
          </div>
        </form>
      )}

      {/* VIEW 2: CHARGE BACK LOGS */}
      {mainTab === 'logs' && (
        <div className="space-y-3.5 animate-in fade-in">
          {/* Summary Stat Pills */}
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-2">
              <span className="text-[9px] font-bold text-slate-500 block">Total</span>
              <span className="text-sm font-black text-slate-800">{records.length}</span>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-2">
              <span className="text-[9px] font-bold text-amber-700 block">Pending</span>
              <span className="text-sm font-black text-amber-700">
                {records.filter((r) => r.status === 'Pending').length}
              </span>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-2">
              <span className="text-[9px] font-bold text-blue-700 block">In Progress</span>
              <span className="text-sm font-black text-blue-700">
                {records.filter((r) => r.status === 'In Progress').length}
              </span>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2">
              <span className="text-[9px] font-bold text-emerald-700 block">Resolved</span>
              <span className="text-sm font-black text-emerald-700">
                {records.filter((r) => r.status === 'Resolved').length}
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Ticket #, ATM ID, RRN, or Card..."
              className="w-full h-10 pl-9 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Funding Type & Status Filter Chips */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 overflow-x-auto scroll-none pb-0.5 text-[11px]">
              <span className="text-[10px] font-bold text-slate-500 shrink-0">Funding:</span>
              {(['All', 'SF', 'FFM'] as const).map((ft) => (
                <button
                  key={ft}
                  type="button"
                  onClick={() => setLogFundingFilter(ft)}
                  className={`px-2.5 py-1 rounded-full font-bold transition-all shrink-0 ${logFundingFilter === ft
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  {ft === 'All' ? 'All Funding' : ft === 'SF' ? 'SF (Self)' : 'FFM (Full)'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scroll-none pb-0.5 text-[11px]">
              <span className="text-[10px] font-bold text-slate-500 shrink-0">Status:</span>
              {(['All', 'Pending', 'In Progress', 'Resolved'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setLogStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-full font-bold transition-all shrink-0 ${logStatusFilter === st
                    ? 'bg-[#0B2A6B] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Logs Cards List */}
          <div className="space-y-2.5">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                const isInProgress = log.status === 'In Progress'
                const isResolved = log.status === 'Resolved'

                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedDetailRecord(log)}
                    className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer space-y-2.5 active:bg-blue-50/20"
                  >
                    {/* Top Row: Ticket # + Badges */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-[#0B2A6B]">{log.ticketNumber}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-extrabold border border-blue-100">
                          {log.fundingType}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${isResolved
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isInProgress
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                        >
                          {log.status}
                        </span>
                        <ChevronRight size={14} className="text-slate-400" />
                      </div>
                    </div>

                    {/* Middle Info Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50/80 rounded-xl p-2.5 border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">ATM ID</span>
                        <span className="font-bold text-slate-800 font-mono">{log.atmId}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Dispute Amount</span>
                        <span className="font-black text-rose-600">₹{Number(log.disputeAmt).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">TXN Date</span>
                        <span className="font-semibold text-slate-700">{log.txnDate} {log.txnTime}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Card No</span>
                        <span className="font-mono text-slate-700 font-semibold">{log.cardNumber}</span>
                      </div>
                    </div>

                    {/* Incident / Error Snippet */}
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="text-slate-500 truncate max-w-[240px]">
                        <span className="font-bold text-slate-700">Error: </span>
                        {log.errorDescription}
                      </span>
                      <span className="text-[10px] font-bold text-blue-600">View Details</span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                <FileText size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">No charge back logs found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your filters or raise a new dispute</p>
                <button
                  type="button"
                  onClick={() => setMainTab('dispute')}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1 shadow-xs"
                >
                  <Plus size={13} /> Raise Dispute
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAIL VIEW MODAL FOR SELECTED LOG */}
      {selectedDetailRecord && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-2 backdrop-blur-2xs animate-in fade-in">
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-[#0C3E98] to-[#1453CA] px-4 py-3 text-white">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black">{selectedDetailRecord.ticketNumber}</h3>
                  <span className="px-1.5 py-0.2 rounded bg-white/20 text-[10px] font-bold">
                    {selectedDetailRecord.fundingType}
                  </span>
                </div>
                <p className="text-[10px] text-blue-100">Charge Back Dispute Log Details</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailRecord(null)}
                className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-3.5 text-xs">
              {/* Status Header */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-600">Current Status</span>
                <span
                  className={`px-3 py-0.5 rounded-full text-[11px] font-black border ${selectedDetailRecord.status === 'Resolved'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : selectedDetailRecord.status === 'In Progress'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                >
                  {selectedDetailRecord.status}
                </span>
              </div>

              {/* Financial Amounts Highlight */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[9.5px] font-bold text-slate-500 block">TXN Amount</span>
                  <span className="text-xs font-bold text-slate-800">₹{selectedDetailRecord.txnAmt}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[9.5px] font-bold text-slate-500 block">Adjusted</span>
                  <span className="text-xs font-bold text-slate-800">₹{selectedDetailRecord.adjustedAmt || '0'}</span>
                </div>
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-[9.5px] font-bold text-rose-600 block">Dispute Amount</span>
                  <span className="text-xs font-black text-rose-600">₹{selectedDetailRecord.disputeAmt}</span>
                </div>
              </div>

              {/* Transaction Key Info */}
              <div className="space-y-1.5 rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                <div className="flex justify-between border-b pb-1.5 border-slate-200 text-slate-700">
                  <span className="text-slate-400 font-semibold">ATM ID</span>
                  <span className="font-bold font-mono">{selectedDetailRecord.atmId}</span>
                </div>
                <div className="flex justify-between border-b py-1.5 border-slate-200 text-slate-700">
                  <span className="text-slate-400 font-semibold">Card Number</span>
                  <span className="font-bold font-mono">{selectedDetailRecord.cardNumber}</span>
                </div>
                <div className="flex justify-between border-b py-1.5 border-slate-200 text-slate-700">
                  <span className="text-slate-400 font-semibold">RRN Number</span>
                  <span className="font-bold font-mono">{selectedDetailRecord.rrnNumber}</span>
                </div>
                <div className="flex justify-between border-b py-1.5 border-slate-200 text-slate-700">
                  <span className="text-slate-400 font-semibold">TXN Date & Time</span>
                  <span className="font-bold">{selectedDetailRecord.txnDate} {selectedDetailRecord.txnTime}</span>
                </div>
                <div className="flex justify-between border-b py-1.5 border-slate-200 text-slate-700">
                  <span className="text-slate-400 font-semibold">Transaction ID</span>
                  <span className="font-bold font-mono">{selectedDetailRecord.txnId}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-700">
                  <span className="text-slate-400 font-semibold">UTR Reference</span>
                  <span className="font-bold font-mono">{selectedDetailRecord.utr}</span>
                </div>
              </div>

              {/* Error & Incident */}
              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 space-y-1.5">
                <span className="text-[10px] font-bold text-blue-900 block">Error & Nature of Incident</span>
                <p className="font-bold text-slate-800 text-[11px]">{selectedDetailRecord.errorDescription}</p>
                {selectedDetailRecord.natureOfIncident && (
                  <p className="text-[10.5px] text-blue-700 font-semibold">
                    Incident: {selectedDetailRecord.natureOfIncident}
                  </p>
                )}
              </div>

              {/* Communication Details */}
              <div className="p-3 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
                <span className="text-[10px] font-bold text-slate-600 block">Communication Timeline</span>
                <div className="flex justify-between text-slate-600">
                  <span>Hitachi Email Date:</span>
                  <span className="font-bold text-slate-800">{selectedDetailRecord.hitachiEmailDate || '—'}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Email Response Date:</span>
                  <span className="font-bold text-slate-800">{selectedDetailRecord.emailResponseDate || '—'}</span>
                </div>
                <div className="text-slate-600 pt-1">
                  <span className="font-semibold block text-[10px] text-slate-400">FR Remark:</span>
                  <span className="font-bold text-slate-800">{selectedDetailRecord.frRemark || '—'}</span>
                </div>
                <div className="text-slate-600 pt-1">
                  <span className="font-semibold block text-[10px] text-slate-400">WLAO Remark:</span>
                  <span className="font-bold text-slate-800">{selectedDetailRecord.wlaoRemark || '—'}</span>
                </div>
              </div>

              {/* Remarks */}
              {selectedDetailRecord.remarks && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block mb-0.5">Remarks / Audit Note:</span>
                  <p className="text-slate-700 italic text-[11px]">"{selectedDetailRecord.remarks}"</p>
                </div>
              )}

              {/* Documents */}
              {selectedDetailRecord.uploadedDocuments && selectedDetailRecord.uploadedDocuments.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-600 block mb-1">
                    Attached Evidence ({selectedDetailRecord.uploadedDocuments.length})
                  </span>
                  <div className="space-y-1">
                    {selectedDetailRecord.uploadedDocuments.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                        <span className="font-mono text-slate-700 truncate">{doc}</span>
                        <span className="text-blue-600 font-bold hover:underline cursor-pointer">View</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDetailRecord(null)}
                className="w-full h-9 rounded-xl bg-slate-800 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
