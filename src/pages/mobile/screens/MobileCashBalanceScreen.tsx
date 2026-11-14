import { useState } from 'react'
import {
  Banknote,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'

interface MobileCashBalanceScreenProps {
  onBackToMore?: () => void
}

export function MobileCashBalanceScreen({ onBackToMore }: MobileCashBalanceScreenProps) {
  const [selectedAtm, setSelectedAtm] = useState('ATM012345')

  const sitesCashData: Record<string, { switchCash: number; physicalCash: number; lastChecked: string }> = {
    ATM012345: { switchCash: 400000, physicalCash: 400000, lastChecked: '10 Nov 2026, 08:00 PM' },
    ATM012346: { switchCash: 335000, physicalCash: 334000, lastChecked: '09 Nov 2026, 04:15 PM' },
    MPZ14409: { switchCash: 500000, physicalCash: 500000, lastChecked: '10 Nov 2026, 11:30 AM' }
  }

  const current = sitesCashData[selectedAtm] || sitesCashData['ATM012345']
  const diff = current.physicalCash - current.switchCash

  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      {/* Banner */}
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
              <h1 className="text-base font-black text-white">Cash Balance Confirmation</h1>
              <p className="text-[11px] text-blue-100 mt-0.5">
                Physical cassette cash vs Switch ledger confirmation.
              </p>
            </div>
          </div>
          <Banknote size={26} className="text-amber-300 shrink-0" />
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3.5 text-xs">
        <div>
          <label className="text-[10px] font-bold text-slate-700 block mb-1">Select ATM Machine</label>
          <select
            value={selectedAtm}
            onChange={(e) => setSelectedAtm(e.target.value)}
            className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 font-bold text-slate-800"
          >
            <option value="ATM012345">ATM012345 (Bewar, Mainpuri)</option>
            <option value="ATM012346">ATM012346 (Mainpuri City Center)</option>
            <option value="MPZ14409">MPZ14409 (Civil Lines)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100">
            <span className="text-[10px] text-slate-500 font-bold block">Switch System Ledger</span>
            <span className="text-base font-black text-[#0B2A6B]">₹{current.switchCash.toLocaleString()}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold block">Physical Cassette Total</span>
            <span className="text-base font-black text-slate-900">₹{current.physicalCash.toLocaleString()}</span>
          </div>
        </div>

        {/* Status result */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between ${
            diff === 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {diff === 0 ? <CheckCircle size={18} className="text-emerald-600" /> : <AlertTriangle size={18} className="text-rose-600" />}
            <div>
              <span className="font-bold block">
                {diff === 0 ? 'Cash Reconciled (100% Match)' : `Discrepancy: ₹${diff.toLocaleString()}`}
              </span>
              <span className="text-[10px] opacity-75">Last checked: {current.lastChecked}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => alert(`Reconciliation re-checked with switch for ${selectedAtm}. Balances verified!`)}
          className="w-full h-10 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs hover:bg-blue-700"
        >
          <RefreshCw size={14} /> Refresh Switch Ledger
        </button>
      </div>
    </div>
  )
}
