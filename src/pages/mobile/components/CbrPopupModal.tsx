import { useState } from 'react'
import { X, CheckCircle, Calculator } from 'lucide-react'

interface CbrPopupModalProps {
  isOpen: boolean
  onClose: () => void
  atmId: string
  franchise: string
  onConfirm: (data: { physicalTotal: number; difference: number }) => void
}

export function CbrPopupModal({
  isOpen,
  onClose,
  atmId,
  franchise,
  onConfirm
}: CbrPopupModalProps) {
  // Denominations state in popup (hooks must run before any early return)
  const [counts, setCounts] = useState({ 100: 400, 200: 300, 500: 600 })
  if (!isOpen) return null
  const expectedCash = 400000 // System cash balance

  const physicalCashTotal = counts[100] * 100 + counts[200] * 200 + counts[500] * 500
  const difference = physicalCashTotal - expectedCash

  const handleApply = () => {
    onConfirm({ physicalTotal: physicalCashTotal, difference })
    onClose()
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#0B2A6B]">CVR Cash Verification</h3>
              <p className="text-[10px] text-slate-500">ATM: {atmId} • {franchise}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="py-3 space-y-3 text-xs">

          {/* Denomination Table */}
          <table className="w-full text-center text-xs">
            <thead className="bg-slate-50 text-slate-600 text-[10.5px]">
              <tr>
                <th className="py-1">Note (₹)</th>
                <th className="py-1">Physical Count</th>
                <th className="py-1">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {([100, 200, 500] as const).map((denom) => (
                <tr key={denom}>
                  <td className="py-1.5 font-bold text-black">₹{denom}</td>
                  <td className="py-1.5">
                    <input
                      type="number"
                      value={counts[denom]}
                      onChange={(e) =>
                        setCounts({ ...counts, [denom]: Number(e.target.value) || 0 })
                      }
                      className="w-16 text-center rounded-lg border border-slate-300 p-1 font-bold text-slate-800"
                    />
                  </td>
                  <td className="py-1.5 font-bold text-slate-900">
                    ₹{(counts[denom] * denom).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Comparison Cards */}
          <div className="space-y-1.5 rounded-xl bg-slate-50 p-2.5 border border-slate-200 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Physical Cash Total:</span>
              <span className="font-black text-[#0B2A6B]">₹{physicalCashTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Expected System Cash:</span>
              <span className="font-bold text-slate-700">₹{expectedCash.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span className="font-bold text-slate-700">Reconciliation Difference:</span>
              <span className={`font-black ${difference === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {difference === 0 ? '₹0 (Exact Match)' : `₹${difference.toLocaleString()}`}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleApply}
          className="w-full h-10 rounded-xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] text-white font-bold text-xs shadow-md hover:bg-blue-700 flex items-center justify-center gap-1.5"
        >
          <CheckCircle size={15} /> Confirm & Apply to EOD
        </button>
      </div>
    </div>
  )
}
