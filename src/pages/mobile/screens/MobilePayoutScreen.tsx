import {
  Coins,
  Download,
  ArrowUpRight
} from 'lucide-react'
import type { MobileUser } from '../data/mobileMockData'

interface MobilePayoutScreenProps {
  user?: MobileUser
}

export function MobilePayoutScreen({ user }: MobilePayoutScreenProps) {

  const payouts = [
    { month: 'Aug 2026', amount: '₹1,25,600', txns: '8,420', status: 'Processed', date: '07 Oct 2026', utr: 'AXISPAY991823' },
    { month: 'Jul 2026', amount: '₹1,18,400', txns: '7,910', status: 'Processed', date: '05 Sep 2026', utr: 'AXISPAY881721' },
    { month: 'Jun 2026', amount: '₹1,22,100', txns: '8,150', status: 'Processed', date: '06 Aug 2026', utr: 'AXISPAY771610' }
  ]

  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
              Franchise Earnings {user?.franchiseId ? `• ${user.franchiseId}` : ''}
            </span>
            <h1 className="text-xl font-black text-white mt-0.5">Payout & Commissions</h1>
            <p className="text-[11px] text-blue-100 mt-1">
              Monthly interchange fee sharing and transaction commission records.
            </p>
          </div>
          <Coins size={30} className="text-amber-300" />
        </div>
      </div>

      {/* Main KPI Card */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/70 to-white p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">Last Payout Disbursed</span>
          <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5">
            Credit Confirmed
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-black text-[#0B2A6B]">₹1,25,600</div>
          <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
            <ArrowUpRight size={14} /> +6.1% vs Jul
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
          <div className="bg-white p-2 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-semibold">Credited To Bank</span>
            <span className="font-bold text-slate-800">HDFC 5020...19</span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-semibold">Payout Date</span>
            <span className="font-bold text-slate-800">07 Oct 2026</span>
          </div>
        </div>
      </div>

      {/* Monthly Statements History */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-800 flex items-center justify-between">
          <span>Monthly Payout Statements</span>
          <span className="text-[10px] text-slate-500">FY 2026-27</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {payouts.map((item, idx) => (
            <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
              <div>
                <h4 className="font-bold text-slate-800">{item.month} Payout</h4>
                <p className="text-[10px] text-slate-400">
                  {item.txns} Txns • Disbursed: {item.date}
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">UTR: {item.utr}</p>
              </div>

              <div className="text-right">
                <span className="font-black text-[#0B2A6B] block text-sm">{item.amount}</span>
                <button
                  type="button"
                  onClick={() => alert(`Downloading Commission Statement for ${item.month}`)}
                  className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline"
                >
                  <Download size={11} /> Statement
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
