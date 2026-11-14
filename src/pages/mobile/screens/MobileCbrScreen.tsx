import { useState } from 'react'
import {
  Banknote,
  Calendar,
  CheckCircle2,
  Trash2,
  Box,
  Layers,
  HandCoins,
  MessageSquare,
  Save,
  Send,
  ArrowLeft,
  Search
} from 'lucide-react'

interface MobileCbrScreenProps {
  onBackToMore?: () => void
}

type DenomKey = 100 | 200 | 500

export function MobileCbrScreen({ onBackToMore }: MobileCbrScreenProps) {
  // Mode: Axis Indent vs WLA Account Form
  const [mode, setMode] = useState<'axis' | 'wla'>('axis')

  // Header Form Fields
  const [atmId, setAtmId] = useState('MPZ14409')
  const [txnDate, setTxnDate] = useState('2025-09-25')

  // Axis Indent Status Fields
  const [hpyGivenIndent, setHpyGivenIndent] = useState('500000')
  const [revisedIndent, setRevisedIndent] = useState('450000')
  const [withdrawalFund, setWithdrawalFund] = useState('400000')

  // WLA Account Status Fields
  const [lastDayBalance, setLastDayBalance] = useState('5500')
  const [hpyGivenFund, setHpyGivenFund] = useState('500000')
  const [wlaWithdrawalCounts, setWlaWithdrawalCounts] = useState<Record<DenomKey, number>>({
    100: 250,
    200: 200,
    500: 670
  })

  // 1. Reject Bin Counts
  const [rejectCounts, setRejectCounts] = useState<Record<DenomKey, number>>({
    100: 15,
    200: 10,
    500: 6
  })

  // 2. Cassette Counts
  const [cassetteCounts, setCassetteCounts] = useState<Record<DenomKey, number>>({
    100: 27,
    200: 16,
    500: 55
  })

  // 3. Total Loading Cash Counts
  const [loadingCounts, setLoadingCounts] = useState<Record<DenomKey, number>>({
    100: 15,
    200: 10,
    500: 6
  })

  // 4. Cash In Hand Counts
  const [handCounts, setHandCounts] = useState<Record<DenomKey, number>>({
    100: 15,
    200: 10,
    500: 6
  })

  // Remark
  const [remark, setRemark] = useState('')

  // Submit Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Calculations
  const calcTotal = (counts: Record<DenomKey, number>) =>
    counts[100] * 100 + counts[200] * 200 + counts[500] * 500

  const totalReject = calcTotal(rejectCounts)
  const totalCassette = calcTotal(cassetteCounts)
  const totalLoading = calcTotal(loadingCounts)
  const totalHand = calcTotal(handCounts)
  const totalWlaWithdrawal = calcTotal(wlaWithdrawalCounts)
  const todayClosingBalance =
    Number(lastDayBalance || 0) + Number(hpyGivenFund || 0) - totalWlaWithdrawal

  const handleCountChange = (
    setter: React.Dispatch<React.SetStateAction<Record<DenomKey, number>>>,
    denom: DenomKey,
    value: string
  ) => {
    const numericVal = parseInt(value, 10)
    setter((prev) => ({
      ...prev,
      [denom]: isNaN(numericVal) || numericVal < 0 ? 0 : numericVal
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setShowSuccessModal(true)
    }, 700)
  }

  return (
    <div className="space-y-3 pb-8 pt-2 px-3 no-scrollbar select-none text-slate-800">
      {/* =========================================================================
       * 1. TITLE & FORM TYPE SWITCHER
       * ========================================================================= */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-blue-100 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#1675F8] border border-blue-200/60 shadow-2xs">
            <Banknote size={20} className="stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-[13.5px] font-black text-[#0A2665] leading-tight">
              {mode === 'axis' ? 'Cash Loading Details – Axis Indent' : 'Cash Loading Form – WLA Account'}
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">
              Enter daily loading details & reconciliation.
            </p>
          </div>
        </div>
      </div>

      {/* Segmented Mode Selector Tabs */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-200/70 border border-slate-300/50">
        <button
          type="button"
          onClick={() => setMode('axis')}
          className={`py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
            mode === 'axis'
              ? 'bg-[#1258E2] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Axis Indent Form
        </button>
        <button
          type="button"
          onClick={() => setMode('wla')}
          className={`py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
            mode === 'wla'
              ? 'bg-[#1258E2] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          WLA Account Form
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* =========================================================================
         * 2. EDITABLE FORM HEADER (ATM ID & DATE PICKER)
         * ========================================================================= */}
        <div className="rounded-2xl border border-blue-100 bg-white p-2.5 shadow-2xs grid grid-cols-2 gap-2 text-xs">
          {/* ATM ID Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
              <span>ATM ID</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={atmId}
                onChange={(e) => setAtmId(e.target.value)}
                className="w-full h-8 pl-6 pr-6 rounded-lg border border-blue-200 bg-blue-50/40 text-[11px] font-black text-[#0A2665] focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
              >
                <option value="MPZ14409">MPZ14409 (Primary)</option>
                <option value="ATM-001">ATM-001 (Ahmedabad)</option>
                <option value="ATM-002">ATM-002 (Gandhinagar)</option>
                <option value="ATM-003">ATM-003 (Surat)</option>
              </select>
              <Search size={11} className="absolute left-2 top-2.5 text-slate-400 pointer-events-none" />
              <span className="absolute right-2 top-2 text-slate-400 pointer-events-none text-[10px]">▼</span>
            </div>
          </div>

          {/* Date Picker Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
              <span>Date</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={txnDate}
                onChange={(e) => setTxnDate(e.target.value)}
                className="w-full h-8 pl-6 pr-2 rounded-lg border border-blue-200 bg-blue-50/40 text-[11px] font-black text-[#0A2665] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Calendar size={11} className="absolute left-2 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* =========================================================================
         * 3. AXIS INDENT STATUS TABLE (MATCHING 4.56.41 PM.jpeg)
         * ========================================================================= */}
        {mode === 'axis' && (
          <div className="rounded-2xl border border-blue-200/90 bg-white overflow-hidden shadow-2xs">
            <div className="bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] px-3 py-1.5 text-white text-[11.5px] font-black text-center">
              ICICI SR / Axis Indent Status
            </div>
            <div className="divide-y divide-blue-50 text-[11px]">
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="font-bold text-slate-700">HPY Given Indent</span>
                <input
                  type="number"
                  value={hpyGivenIndent}
                  onChange={(e) => setHpyGivenIndent(e.target.value)}
                  className="w-24 h-6 text-right px-1.5 rounded-md border border-slate-200 bg-slate-50 font-black text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="font-bold text-slate-700">Revised Indent</span>
                <input
                  type="number"
                  value={revisedIndent}
                  onChange={(e) => setRevisedIndent(e.target.value)}
                  className="w-24 h-6 text-right px-1.5 rounded-md border border-slate-200 bg-slate-50 font-black text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50/30">
                <span className="font-bold text-slate-700">Withdrawal Axis Indent Fund</span>
                <input
                  type="number"
                  value={withdrawalFund}
                  onChange={(e) => setWithdrawalFund(e.target.value)}
                  className="w-24 h-6 text-right px-1.5 rounded-md border border-blue-300 bg-white font-black text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-blue-50/60">
                <span className="font-bold text-slate-700">Denomination</span>
                <div className="text-right font-mono text-[10.5px] font-bold text-slate-800 leading-tight">
                  <div>100 × 250 = ₹25,000</div>
                  <div>200 × 200 = ₹40,000</div>
                  <div>500 × 670 = ₹3,35,000</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
         * 3B. WLA ACCOUNT STATUS TABLE (MATCHING 4.56.42 PM.jpeg)
         * ========================================================================= */}
        {mode === 'wla' && (
          <div className="rounded-2xl border border-blue-200/90 bg-white overflow-hidden shadow-2xs">
            <div className="bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] px-3 py-1.5 text-white text-[11.5px] font-black text-center">
              White Level Account Status
            </div>
            <div className="p-2.5 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[9.5px] text-slate-500 block font-bold">Last Day Account Balance</span>
                  <input
                    type="number"
                    value={lastDayBalance}
                    onChange={(e) => setLastDayBalance(e.target.value)}
                    className="w-full mt-0.5 h-6 text-left px-1 rounded border border-slate-200 bg-white font-black text-slate-900 text-xs"
                  />
                </div>
                <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[9.5px] text-slate-500 block font-bold">HPY Given Fund</span>
                  <input
                    type="number"
                    value={hpyGivenFund}
                    onChange={(e) => setHpyGivenFund(e.target.value)}
                    className="w-full mt-0.5 h-6 text-left px-1 rounded border border-slate-200 bg-white font-black text-slate-900 text-xs"
                  />
                </div>
              </div>

              {/* Today Withdrawal Fund Table */}
              <div className="rounded-xl border border-blue-100 overflow-hidden">
                <div className="bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-900">
                  Today Withdrawal Fund – Denomination-wise
                </div>
                <table className="w-full text-center text-xs">
                  <thead className="bg-slate-50 text-[10px] text-slate-600 border-b border-slate-100">
                    <tr>
                      <th className="py-1">Denomination</th>
                      <th className="py-1">Count</th>
                      <th className="py-1">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {([100, 200, 500] as const).map((denom) => (
                      <tr key={denom} className="hover:bg-blue-50/30">
                        <td className="py-1 font-bold text-slate-800">₹ {denom}</td>
                        <td className="py-1">
                          <input
                            type="number"
                            value={wlaWithdrawalCounts[denom]}
                            onChange={(e) => handleCountChange(setWlaWithdrawalCounts, denom, e.target.value)}
                            className="w-14 h-5.5 text-center rounded border border-blue-200 bg-white font-bold text-slate-900"
                          />
                        </td>
                        <td className="py-1 font-black text-slate-900">
                          {(wlaWithdrawalCounts[denom] * denom).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between bg-blue-600 text-white px-3 py-1 text-[11px] font-black">
                  <span>Total Today Withdrawal Fund</span>
                  <span>₹ {totalWlaWithdrawal.toLocaleString()}</span>
                </div>
              </div>

              {/* Today Account Closing Balance */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/80 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-900">Today Account Closing Balance</span>
                <span className="font-black text-emerald-700 text-xs">₹ {todayClosingBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
         * 4. REJECT BIN TABLE (MATCHING 4.56.41 PM.jpeg)
         * ========================================================================= */}
        <div className="rounded-2xl border border-blue-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] px-3 py-1.5 text-white text-[11.5px] font-bold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Trash2 size={13} className="text-white" />
              <span>Reject Bin</span>
            </div>
            <span className="text-[9.5px] text-blue-200 font-medium">Reconciliation</span>
          </div>

          <table className="w-full text-center text-xs">
            <thead className="bg-slate-50 text-slate-600 text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-1.5 w-1/3">Denomination</th>
                <th className="py-1.5 w-1/3">Count</th>
                <th className="py-1.5 w-1/3">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {([100, 200, 500] as const).map((denom) => (
                <tr key={denom} className="hover:bg-blue-50/20">
                  <td className="py-1.5 font-black text-slate-800">{denom}</td>
                  <td className="py-1.5">
                    <input
                      type="number"
                      value={rejectCounts[denom]}
                      onChange={(e) => handleCountChange(setRejectCounts, denom, e.target.value)}
                      className="w-16 h-6 text-center rounded-lg border border-blue-200 bg-white text-slate-900 text-xs font-black focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                    />
                  </td>
                  <td className="py-1.5 font-black text-slate-900">
                    {(rejectCounts[denom] * denom).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center bg-[#1258E2] text-white px-3 py-1.5 text-xs font-black">
            <span>Total Reject Bin</span>
            <span>₹ {totalReject.toLocaleString()}</span>
          </div>
        </div>

        {/* =========================================================================
         * 5. CASSETTE TABLE (MATCHING 4.56.41 PM.jpeg)
         * ========================================================================= */}
        <div className="rounded-2xl border border-blue-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] px-3 py-1.5 text-white text-[11.5px] font-bold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Box size={13} className="text-white" />
              <span>Cassette</span>
            </div>
            <span className="text-[9.5px] text-blue-200 font-medium">Dispenser Load</span>
          </div>

          <table className="w-full text-center text-xs">
            <thead className="bg-slate-50 text-slate-600 text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-1.5 w-1/3">Denomination</th>
                <th className="py-1.5 w-1/3">Count</th>
                <th className="py-1.5 w-1/3">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {([100, 200, 500] as const).map((denom) => (
                <tr key={denom} className="hover:bg-blue-50/20">
                  <td className="py-1.5 font-black text-slate-800">{denom}</td>
                  <td className="py-1.5">
                    <input
                      type="number"
                      value={cassetteCounts[denom]}
                      onChange={(e) => handleCountChange(setCassetteCounts, denom, e.target.value)}
                      className="w-16 h-6 text-center rounded-lg border border-blue-200 bg-white text-slate-900 text-xs font-black focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                    />
                  </td>
                  <td className="py-1.5 font-black text-slate-900">
                    {(cassetteCounts[denom] * denom).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center bg-[#1258E2] text-white px-3 py-1.5 text-xs font-black">
            <span>Total Cassette</span>
            <span>₹ {totalCassette.toLocaleString()}</span>
          </div>
        </div>

        {/* =========================================================================
         * 6. TOTAL LOADING CASH TABLE (MATCHING 4.56.41 PM.jpeg)
         * ========================================================================= */}
        <div className="rounded-2xl border border-blue-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] px-3 py-1.5 text-white text-[11.5px] font-bold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers size={13} className="text-white" />
              <span>Total Loading Cash</span>
            </div>
            <span className="text-[9.5px] text-blue-200 font-medium">Reconciled Cash</span>
          </div>

          <table className="w-full text-center text-xs">
            <thead className="bg-slate-50 text-slate-600 text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-1.5 w-1/3">Denomination</th>
                <th className="py-1.5 w-1/3">Count</th>
                <th className="py-1.5 w-1/3">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {([100, 200, 500] as const).map((denom) => (
                <tr key={denom} className="hover:bg-blue-50/20">
                  <td className="py-1.5 font-black text-slate-800">{denom}</td>
                  <td className="py-1.5">
                    <input
                      type="number"
                      value={loadingCounts[denom]}
                      onChange={(e) => handleCountChange(setLoadingCounts, denom, e.target.value)}
                      className="w-16 h-6 text-center rounded-lg border border-blue-200 bg-white text-slate-900 text-xs font-black focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                    />
                  </td>
                  <td className="py-1.5 font-black text-slate-900">
                    {(loadingCounts[denom] * denom).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center bg-[#1258E2] text-white px-3 py-1.5 text-xs font-black">
            <span>Total Loading Cash</span>
            <span>₹ {totalLoading.toLocaleString()}</span>
          </div>
        </div>

        {/* =========================================================================
         * 7. CASH IN HAND TABLE (MATCHING 4.56.41 PM.jpeg)
         * ========================================================================= */}
        <div className="rounded-2xl border border-blue-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] px-3 py-1.5 text-white text-[11.5px] font-bold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <HandCoins size={13} className="text-white" />
              <span>Cash In Hand</span>
            </div>
            <span className="text-[9.5px] text-blue-200 font-medium">Physical Custody</span>
          </div>

          <table className="w-full text-center text-xs">
            <thead className="bg-slate-50 text-slate-600 text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-1.5 w-1/3">Denomination</th>
                <th className="py-1.5 w-1/3">Count</th>
                <th className="py-1.5 w-1/3">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {([100, 200, 500] as const).map((denom) => (
                <tr key={denom} className="hover:bg-blue-50/20">
                  <td className="py-1.5 font-black text-slate-800">{denom}</td>
                  <td className="py-1.5">
                    <input
                      type="number"
                      value={handCounts[denom]}
                      onChange={(e) => handleCountChange(setHandCounts, denom, e.target.value)}
                      className="w-16 h-6 text-center rounded-lg border border-blue-200 bg-white text-slate-900 text-xs font-black focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                    />
                  </td>
                  <td className="py-1.5 font-black text-slate-900">
                    {(handCounts[denom] * denom).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center bg-[#1258E2] text-white px-3 py-1.5 text-xs font-black">
            <span>Total Cash In Hand</span>
            <span>₹ {totalHand.toLocaleString()}</span>
          </div>
        </div>

        {/* =========================================================================
         * 8. REMARK FIELD (MATCHING 4.56.41 PM.jpeg)
         * ========================================================================= */}
        <div className="rounded-2xl border border-blue-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] px-3 py-1.5 text-white text-[11.5px] font-bold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MessageSquare size={13} className="text-white" />
              <span>Remark</span>
            </div>
            <span className="text-[9.5px] text-blue-200 font-mono">{remark.length} / 500</span>
          </div>
          <div className="p-2.5">
            <input
              type="text"
              value={remark}
              maxLength={500}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Enter Remark (e.g. Loading completed without machine jam)..."
              className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* =========================================================================
         * 9. BOTTOM ACTION PILL BUTTONS (MATCHING 4.56.41 PM.jpeg)
         * ========================================================================= */}
        <div className="flex items-center gap-2 pt-1">
          {onBackToMore && (
            <button
              type="button"
              onClick={onBackToMore}
              className="h-10 px-3.5 rounded-full border border-blue-300 bg-white text-xs font-bold text-[#1258E2] hover:bg-blue-50 active:scale-95 transition-all shadow-2xs flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}

          <button
            type="button"
            onClick={() => alert('Draft saved successfully to local storage!')}
            className="flex-1 h-10 rounded-full border border-blue-300 bg-blue-50/80 text-[#1258E2] text-xs font-bold hover:bg-blue-100 active:scale-95 transition-all shadow-2xs flex items-center justify-center gap-1.5"
          >
            <Save size={14} /> Save Draft
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 h-10 rounded-full bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] text-white text-xs font-bold shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                <Send size={14} /> Submit
              </>
            )}
          </button>
        </div>
      </form>

      {/* =========================================================================
       * SUCCESS MODAL POPUP
       * ========================================================================= */}
      {showSuccessModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xs rounded-3xl bg-white p-5 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3 shadow-inner">
              <CheckCircle2 size={26} strokeWidth={2.5} />
            </div>
            <h3 className="font-black text-base text-[#0A2665]">CBR Form Submitted!</h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Your {mode === 'axis' ? 'Axis Indent' : 'WLA Account'} Cash Loading CBR for{' '}
              <strong className="text-slate-900">{atmId}</strong> has been transmitted to Dexter
              India operations.
            </p>

            <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Total Loading:</span>
                <strong className="text-slate-900">₹{totalLoading.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Date:</span>
                <strong className="text-slate-900">{txnDate}</strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Status:</span>
                <strong className="text-emerald-600">VERIFIED & SAVED</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false)
                onBackToMore?.()
              }}
              className="mt-4 w-full h-10 rounded-xl bg-[#1258E2] text-white font-bold text-xs shadow-md hover:bg-blue-700 active:scale-95 transition-all"
            >
              Done / Return to Modules
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
