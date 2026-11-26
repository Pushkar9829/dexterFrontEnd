import type { ReactNode } from 'react'
import { BadgeIndianRupee, ClipboardList, Coins, FileText, Gift, Landmark } from 'lucide-react'
import { totalInvestment } from '@/data/payout'
import { fmtDate, rs, type PlanX } from './model'
import { SectionBar, StatusBadge, tdCls, theadCls, thCls } from './ui'

function KV({ k, v, wide }: { k: string; v: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2 lg:col-span-3' : undefined}>
      <div className="text-[11px] font-semibold text-muted">{k}</div>
      <div className="mt-0.5 text-[13px] break-words text-ink">{v || '—'}</div>
    </div>
  )
}

function Tbl({ heads, rows, empty }: { heads: string[]; rows: ReactNode[][]; empty: string }) {
  return (
    <div className="scroll-thin overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr className={theadCls}>{heads.map((h) => <th key={h} className={thCls}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`r-${i}`} className="border-t border-line-soft">
              {r.map((c, k) => <td key={`c-${k}`} className={tdCls}>{c}</td>)}
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={heads.length} className="px-3 py-5 text-center text-[12px] text-muted">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

const upto = (to: number | null, from: number) => (to === null ? `Above ${from - 1}` : String(to))

/** Read-only summary of every wizard step (Preview & Save and the plan view). */
export function PlanSummary({ plan }: { plan: PlanX }) {
  const t = totalInvestment(plan)
  return (
    <div className="space-y-4">
      <SectionBar icon={<FileText size={16} />} title="Plan Details" />
      <div className="grid gap-4 px-1 sm:grid-cols-2 lg:grid-cols-3">
        <KV k="Plan Name" v={plan.name} />
        <KV k="Plan Code / Version" v={`${plan.code} · v${plan.version}`} />
        <KV k="Status" v={<StatusBadge status={plan.status} />} />
        <KV k="Business Vertical" v={plan.vertical} />
        <KV k="Site Category" v={plan.siteCategory} />
        <KV k="Plan Type" v={plan.planType} />
        <KV k="Model Type" v={plan.modelType} />
        <KV k="Applicable For" v={plan.applicableFor} />
        <KV k="Effective" v={`${fmtDate(plan.effectiveFrom)} – ${plan.effectiveTo ? fmtDate(plan.effectiveTo) : 'Open'}`} />
        <KV k="Eligibility Criteria" v={plan.eligibility} wide />
      </div>

      <SectionBar icon={<Landmark size={16} />} title="Investment Details" />
      <div className="grid gap-4 px-1 sm:grid-cols-2 lg:grid-cols-3">
        <KV k="Initial Investment (₹)" v={rs(plan.investment.initial)} />
        <KV k="Refundable Deposit (₹)" v={rs(plan.investment.refundableDeposit)} />
        <KV k="Upfront Fee (₹)" v={rs(plan.investment.upfrontFee)} />
        <KV k="GST Rate" v={`${plan.investment.gstRate}%`} />
        <KV k="GST Amount (₹)" v={rs(t.gst)} />
        <KV k="Total Investment (₹)" v={<span className="rounded bg-amber-100 px-2 py-0.5 font-bold">{rs(t.total)}</span>} />
        <KV k="Fixed Fee / CRA Cost per month (₹)" v={rs(plan.fixedFee)} />
        <KV k="TDS" v={`${plan.tdsPct}%`} />
      </div>
      {!t.consistent && <p className="px-1 text-[12px] text-amber-700">Initial investment does not equal Refundable Deposit + Upfront Fee.</p>}

      <SectionBar icon={<ClipboardList size={16} />} title={`Transaction Slab · ${plan.planCategory}`} />
      <Tbl
        heads={['S.N.', 'From', 'To', 'TXN Count', 'Franchise Cash', 'Franchise Non Cash', 'MF Cash', 'MF Non Cash', 'TL Cash', 'TL Non Cash']}
        empty="No transaction slabs."
        rows={plan.txnSlabs.map((s, i) => [i + 1, s.from, s.to ?? 'Above', s.to === null ? '—' : s.to - s.from + 1, s.fr.cash, s.fr.nonCash, s.mf.cash, s.mf.nonCash, s.tl.cash, s.tl.nonCash])}
      />
      <SectionBar icon={<Coins size={16} />} title="Deposit Commission" />
      <Tbl heads={['S.N.', 'From', 'To', 'Franchise (Cash TXN)', 'Master Franchise (Cash TXN)', 'Team Leader (Cash TXN)']} empty="No deposit commission slabs."
        rows={plan.depositSlabs.map((s, i) => [i + 1, s.from, upto(s.to, s.from), s.fr, s.mf, s.tl])} />

      <SectionBar icon={<Gift size={16} />} title="Incentive Configuration" />
      <Tbl
        heads={['S.N.', 'Incentive Name', 'Incentive Type', 'Applicable To', 'Calculation Basis', 'Transaction Type', 'Threshold', 'Rate / Amount (₹)', 'Payment Frequency']}
        empty="No incentives configured."
        rows={plan.incentives.map((x, i) => [i + 1, x.name, x.type, x.applicableTo, x.basis, x.txnType, x.threshold ?? '—', rs(x.amount, x.type === 'Per Transaction' ? 2 : 0), x.frequency])}
      />
      <div className="grid gap-4 px-1 sm:grid-cols-3">
        <KV k="GST Applicable" v={plan.gstApplicable ? 'Yes' : 'No'} />
        <KV k="Incentive Eligibility" v={plan.incentiveEligibility} />
        <KV k="Remarks" v={plan.incentiveRemarks} />
      </div>

      <SectionBar icon={<BadgeIndianRupee size={16} />} title="Rental / MG Configuration" />
      {plan.noFixedMonthlyGuarantee ? (
        <p className="rounded-lg bg-surface px-3 py-2 text-[12.5px] text-ink-2">No fixed monthly guarantee (UF model) — Rental / MG slabs do not apply.</p>
      ) : (
        <>
          <Tbl heads={['S.N.', 'Configuration Type', 'Cash TXN Slab From', 'Cash TXN Slab To', 'Monthly Rental / MG Amount (₹)', 'Applicable To']} empty="No Rental / MG slabs."
            rows={plan.rentalMg.map((r, i) => [i + 1, r.kind, r.from, r.to ?? 'Above', r.amount === 0 ? '0 (NIL)' : rs(r.amount), r.applicableTo])} />
          <div className="px-1 text-[12.5px]"><span className="font-semibold text-muted">Guarantee Type:</span> {plan.guaranteeType}</div>
        </>
      )}
    </div>
  )
}
