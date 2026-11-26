import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import AddressMasterPanel from '../daak/AddressMasterPanel'
import { ActingAs } from './shared'

/** Onboarding › Setup › Address Master (§10.1) — same master the Outward Dak picker reuses. */
export default function AddressMasterPage() {
  return (
    <div className="mx-auto max-w-[1440px] min-w-0 pb-12">
      <div className="mb-3 flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="shrink-0 text-slate-400" />
        <Link to="/setup" className="hover:text-primary">Setup</Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Address Master</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Address Master</h1>
      <p className="mt-0.5 mb-4 text-[13px] text-muted">Saved dispatch addresses for Postal & Courier. Search and reuse them in Outward Dak; edits keep the history and never alter past dispatch snapshots.</p>
      <div className="mb-4"><ActingAs /></div>
      <AddressMasterPanel />
    </div>
  )
}
