import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Info, List, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PayoutPage } from '../PayoutShell'
import { BulkMapping, IndividualMapping, RuleMapping } from './MappingForms'
import { MappingList } from './MappingList'

type Mode = 'Individual' | 'Bulk' | 'Rule-based'
const MODES: { key: Mode; label: string }[] = [
  { key: 'Individual', label: 'Individual Mapping' },
  { key: 'Bulk', label: 'Bulk Mapping' },
  { key: 'Rule-based', label: 'Rule-based Mapping' },
]

/** Site-wise Plan Mapping (§10.2) with the §10.3 controls. */
export default function PlanMapping() {
  const [mode, setMode] = useState<Mode>('Individual')
  return (
    <PayoutPage
      title="Site-wise Plan Mapping"
      sub="Map approved plan versions to ATM sites and beneficiaries. One plan per site, beneficiary and period; every mapping needs a checker."
      crumbs={['Plan Mapping', 'Site-wise Mapping']}
      actions={
        <>
          <Link to="/finance/payouts/plans/new" className="flex h-10 w-[150px] items-center justify-center gap-2 rounded-lg border border-line bg-white text-[13px] font-semibold text-ink hover:bg-surface"><Plus size={15} className="text-[#0066FF]" /> Create Plan</Link>
          <Link to="/finance/payouts/plans" className="flex h-10 w-[150px] items-center justify-center gap-2 rounded-lg border-2 border-[#0b2a6b] bg-white text-[13px] font-semibold text-[#0b2a6b] hover:bg-surface"><List size={16} /> Plan List</Link>
        </>
      }
    >
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Mapping mode">
        {MODES.map((m) => (
          <button key={m.key} type="button" role="tab" aria-selected={mode === m.key} onClick={() => setMode(m.key)}
            className={cn('h-10 w-[190px] rounded-lg border text-[12.5px] font-semibold transition-colors', mode === m.key ? 'border-[#0066FF] bg-[#0066FF] text-white' : 'border-line bg-white text-ink-2 hover:border-[#0066FF]/40')}>
            {m.label}
          </button>
        ))}
      </div>
      <p className="flex items-start gap-2 rounded-lg bg-[#eaf1ff] px-3 py-2 text-[12px] text-ink-2">
        <Info size={15} className="mt-px shrink-0 text-[#0066FF]" />
        Only Active (approved) plan versions can be mapped and the version is stored on the mapping for historical calculations. Franchise Model and Business Model sites are never mixed; Franchisees cannot be mapped to BM sites.
      </p>
      {mode === 'Individual' && <IndividualMapping />}
      {mode === 'Bulk' && <BulkMapping />}
      {mode === 'Rule-based' && <RuleMapping />}
      <MappingList />
    </PayoutPage>
  )
}
