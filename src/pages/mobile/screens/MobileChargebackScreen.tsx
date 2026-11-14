import { useState } from 'react'
import {
  CreditCard,
  ArrowLeft,
  Calendar,
  Clock,
  Upload,
  Save,
  Send
} from 'lucide-react'

interface MobileChargebackScreenProps {
  onBackToMore?: () => void
}

export function MobileChargebackScreen({ onBackToMore }: MobileChargebackScreenProps) {
  const [fundingType, setFundingType] = useState<'sf' | 'ffm'>('sf')

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
    const ref = `DSP-${Math.floor(100000 + Math.random() * 900000)}`
    alert(`Charge Back Dispute submitted with Reference No: ${ref}! CRM backend verification initiated.`)
  }

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
              <p className="text-[11px] text-blue-100 mt-0.5">
                Register & manage disputes for {fundingType === 'sf' ? 'Self Funding (SF)' : 'Full Funding (FFM)'} sites.
              </p>
            </div>
          </div>
          <CreditCard size={26} className="text-amber-300 shrink-0" />
        </div>

        {/* SF vs FFM Switcher Tabs */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleFundingSwitch('sf')}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
              fundingType === 'sf'
                ? 'bg-white text-[#0B2A6B] shadow-xs'
                : 'bg-white/15 text-white/90'
            }`}
          >
            Self Funding (SF)
          </button>
          <button
            type="button"
            onClick={() => handleFundingSwitch('ffm')}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
              fundingType === 'ffm'
                ? 'bg-white text-[#0B2A6B] shadow-xs'
                : 'bg-white/15 text-white/90'
            }`}
          >
            Full Funding (FFM)
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
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
    </div>
  )
}
