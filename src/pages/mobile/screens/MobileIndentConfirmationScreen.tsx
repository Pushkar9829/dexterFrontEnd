import { useState } from 'react'
import {
  FileCheck2,
  ArrowLeft,
  Check
} from 'lucide-react'

interface MobileIndentConfirmationScreenProps {
  onBackToMore?: () => void
}

export function MobileIndentConfirmationScreen({ onBackToMore }: MobileIndentConfirmationScreenProps) {
  const [atmId, setAtmId] = useState('ATM012345 (Bewar, Mainpuri)')
  const [confirmed, setConfirmed] = useState(false)

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
              <h1 className="text-base font-black text-white">Indent Withdrawal Confirmation</h1>
              <p className="text-[11px] text-blue-100 mt-0.5">
                Multi-stage indent tracking linked with CBR & Cash Loading.
              </p>
            </div>
          </div>
          <FileCheck2 size={26} className="text-amber-300 shrink-0" />
        </div>
      </div>

      {/* ATM Select */}
      <div className="rounded-2xl border border-blue-200 bg-white p-3.5 shadow-xs space-y-3">
        <label className="text-[11px] font-bold text-slate-700 block">Select ATM Site</label>
        <select
          value={atmId}
          onChange={(e) => setAtmId(e.target.value)}
          className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800"
        >
          <option value="ATM012345 (Bewar, Mainpuri)">ATM012345 (Bewar, Mainpuri)</option>
          <option value="ATM012346 (Mainpuri City)">ATM012346 (Mainpuri City)</option>
        </select>
      </div>

      {/* 3 Indent Stages Card (matching Section 18 in PDF!) */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="bg-gradient-to-r from-[#0C3E98] to-[#1453CA] px-3.5 py-2 text-white text-xs font-extrabold">
          Indent Stages & Reconciliation
        </div>

        <div className="p-3.5 space-y-3 text-xs">
          {/* Stage 1: Issued Indent */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-[#0B2A6B]">1. Issued Indent (Initial Request)</span>
              <span className="text-[10px] text-slate-400">01 Nov 2026, 09:30 AM</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-600">Approved Amount:</span>
              <span className="text-sm font-black text-slate-900">₹ 5,00,000</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Ref: IND-2026-0881</span>
          </div>

          {/* Stage 2: Revised Indent */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-amber-900">2. Revised Indent (Cash Ops Adjustment)</span>
              <span className="text-[10px] text-slate-400">01 Nov 2026, 11:15 AM</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-600">Adjusted Amount:</span>
              <span className="text-sm font-black text-amber-700">₹ 4,50,000</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Ref: REV-IND-0881A</span>
          </div>

          {/* Stage 3: Final Withdrawal Indent */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-emerald-900">3. Final Withdrawal Indent Fund</span>
              <span className="text-[10px] text-slate-400">01 Nov 2026, 02:45 PM</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-600">Disbursed for ATM:</span>
              <span className="text-sm font-black text-emerald-700">₹ 4,00,000</span>
            </div>
            <div className="mt-1 pt-1 border-t border-emerald-200/60 flex justify-between text-[10px] text-slate-500">
              <span>Related CBR Ref: CBR-0912</span>
              <span>Cash Loading Ref: CLF-001</span>
            </div>
          </div>

          {/* Confirmation Button */}
          <button
            type="button"
            onClick={() => {
              setConfirmed(true)
              alert('Final Indent Withdrawal confirmed and synchronized with CRM Backend!')
            }}
            className={`w-full h-11 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 ${
              confirmed
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-[#0C3E98] to-[#1453CA] text-white hover:opacity-95'
            }`}
          >
            <Check size={16} />
            <span>{confirmed ? 'Withdrawal Confirmed & Synced' : 'Confirm Withdrawal Indent'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
