import { useState } from 'react'
import {
  Coins,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown
} from 'lucide-react'
import { inrP } from '@/data/payout'
import { useMyPayout } from '../data/mobileFeeds'
import { fmtDate, useMyScope, type MobileUser } from '../data/mobileSession'

interface MobilePayoutScreenProps {
  user?: MobileUser
}

const monthName = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
const maskAcc = (n?: string) => (n && n.length > 4 ? `${n.slice(0, 4)}…${n.slice(-2)}` : n || '—')

/** Monthly payout statements of the signed-in franchise (Finance › Monthly Payout batches / lines). */
export function MobilePayoutScreen({ user }: MobilePayoutScreenProps) {
  const payouts = useMyPayout()
  const { sites } = useMyScope()
  const [open, setOpen] = useState<string | null>(null)
  const paid = payouts.filter((p) => p.credited)
  const last = paid[0]
  const prev = paid[1]
  const change = last && prev && prev.net ? ((last.net - prev.net) / prev.net) * 100 : null
  const payoutAcc = sites.find((s) => s.payout?.status === 'Mapped')?.payout

  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
              Franchise Earnings {user?.frId ? `• ${user.frId}` : ''}
            </span>
            <h1 className="text-xl font-black text-white mt-0.5">Payout & Commissions</h1>
            <p className="text-[11px] text-blue-100 mt-1">
              Monthly payout statements released by Dexter Finance for your sites.
            </p>
          </div>
          <Coins size={30} className="text-amber-300" />
        </div>
      </div>

      {/* Main KPI Card */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/70 to-white p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">Last Payout Disbursed</span>
          <span className={`rounded-full text-[10px] font-extrabold px-2 py-0.5 ${last ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
            {last ? 'Credit Confirmed' : 'No payout credited yet'}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-black text-[#0B2A6B]">{last ? inrP(last.net, 0) : '—'}</div>
          {change !== null && (
            <span className={`text-xs font-bold flex items-center gap-0.5 ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {change >= 0 ? '+' : ''}
              {change.toFixed(1)}% vs {monthName(prev!.month)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
          <div className="bg-white p-2 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-semibold">Credited To Bank</span>
            <span className="font-bold text-slate-800">{payoutAcc ? `${payoutAcc.bank} ${maskAcc(payoutAcc.accountNo)}` : 'Payout account pending'}</span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-semibold">Payout Date</span>
            <span className="font-bold text-slate-800">{last?.paidDate ? fmtDate(last.paidDate) : '—'}</span>
          </div>
        </div>
      </div>

      {/* Monthly Statements History */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-800 flex items-center justify-between">
          <span>Monthly Payout Statements</span>
          <span className="text-[10px] text-slate-500">{payouts[0] ? `FY ${payouts[0].batch.fy}` : ''}</span>
        </div>

        {payouts.length === 0 && (
          <p className="p-4 text-center text-xs text-slate-500">
            No payout statements yet — payouts start after your sites go live ({sites.filter((s) => s.operational).length} of {sites.length} live).
          </p>
        )}

        <div className="divide-y divide-slate-100 text-xs">
          {payouts.map((item) => (
            <div key={item.month} className="p-3.5 hover:bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800">{monthName(item.month)} Payout</h4>
                  <p className="text-[10px] text-slate-400">
                    {item.txns.toLocaleString('en-IN')} Txns • {item.lines.length} ATM{item.lines.length > 1 ? 's' : ''} •{' '}
                    {item.credited ? `Disbursed: ${fmtDate(item.paidDate)}` : `Under processing (${item.batch.status})`}
                  </p>
                  {item.utr && <p className="text-[10px] text-slate-500 font-mono mt-0.5">UTR: {item.utr}</p>}
                </div>

                <div className="text-right">
                  <span className="font-black text-[#0B2A6B] block text-sm">{inrP(item.net, 0)}</span>
                  <button
                    type="button"
                    onClick={() => setOpen(open === item.month ? null : item.month)}
                    className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline"
                  >
                    {open === item.month ? <ChevronDown size={11} /> : <Download size={11} />} Statement
                  </button>
                </div>
              </div>
              {open === item.month && (
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-1 text-[10.5px]">
                  <div className="flex justify-between"><span className="text-slate-500">Gross</span><span className="font-bold">{inrP(item.gross, 0)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">TDS</span><span className="font-bold">− {inrP(item.tds, 0)}</span></div>
                  {item.lines.map((l) => (
                    <div key={l.id} className="flex justify-between border-t border-slate-200 pt-1">
                      <span className="text-slate-600">{l.atmId} · {(l.txn.cash + l.txn.nonCash).toLocaleString('en-IN')} txns</span>
                      <span className="font-bold text-slate-800">{inrP(l.net, 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
