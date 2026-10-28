import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  ArrowLeftRight,
  Banknote,
  Building2,
  CalendarCheck,
  ChevronRight,
  FileText,
  Landmark,
  Mail,
  MessageSquare,
  X,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/cn'

export const QUICK_ACCESS_ITEMS = [
  {
    label: 'Complaints',
    to: '/operations/complaints',
    Icon: MessageSquare,
  },
  {
    label: 'CBR',
    to: '/operations/cbr',
    Icon: Landmark,
  },
  {
    label: 'EOD',
    to: '/cbr/eod-summary',
    Icon: CalendarCheck,
  },
  {
    label: 'Cash Loading Register',
    to: '/operations/cash-loading',
    Icon: Banknote,
  },
  {
    label: 'Bank Statement',
    to: '/operations/bank-statement',
    Icon: Building2,
  },
  {
    label: 'TDS Letters',
    to: '/operations/tds',
    Icon: FileText,
  },
  {
    label: 'TXN Data',
    to: '/operations/txn-data',
    Icon: ArrowLeftRight,
  },
  {
    label: 'Daak Management',
    to: '/operations/daak',
    Icon: Mail,
  },
]

export function OperationsQuickAccess() {
  const [open, setOpen] = useState(true)

  return (
    <>
      {/* Floating Toggle Button on Right Edge */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-0 top-32 z-40 flex items-center gap-2 rounded-l-2xl border border-r-0 border-blue-200/80 bg-white/95 px-3 py-2.5 text-blue-600 shadow-xl shadow-blue-500/10 backdrop-blur-md transition-all hover:bg-blue-50 hover:px-3.5 hover:shadow-2xl cursor-pointer group"
          title="Open Quick Access"
          aria-label="Toggle Quick Access"
        >
          <Zap size={18} className="text-[#0066FF] fill-[#0066FF] group-hover:scale-110 transition-transform" />
          <span className="text-[12px] font-semibold text-slate-800">Quick Access</span>
        </button>
      )}

      {/* Overlapping Quick Access Panel */}
      <aside
        className={cn(
          'fixed right-4 top-24 z-40 w-[280px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200/90 bg-white/98 p-4 shadow-2xl backdrop-blur-md transition-all duration-300 ease-out flex flex-col',
          open
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : 'translate-x-[320px] opacity-0 pointer-events-none'
        )}
        style={{ maxHeight: 'calc(100vh - 120px)' }}
        aria-label="Operations Quick Access"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <Zap size={18} className="text-[#0066FF] fill-[#0066FF]" />
            </div>
            <div>
              <div className="text-[15px] font-bold tracking-tight text-slate-900 leading-tight">
                Quick Access
              </div>
              <div className="text-[11px] text-slate-500 leading-tight">
                Get to your important reports faster
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            aria-label="Close Quick Access"
            title="Collapse Quick Access"
          >
            <X size={16} />
          </button>
        </div>

        {/* Item List */}
        <nav className="scroll-thin mt-2 flex-1 space-y-0.5 overflow-y-auto pr-1 py-1">
          {QUICK_ACCESS_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group flex items-center justify-between rounded-xl px-2.5 py-2 text-[12.5px] font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 font-semibold text-blue-700'
                    : 'text-slate-700 hover:bg-blue-50/70 hover:text-blue-700'
                )
              }
            >
              <div className="flex items-center gap-2.5 truncate">
                <item.Icon size={16} className="text-blue-600 shrink-0" strokeWidth={1.8} />
                <span className="truncate">{item.label}</span>
              </div>
              <ChevronRight
                size={14}
                className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0"
              />
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
