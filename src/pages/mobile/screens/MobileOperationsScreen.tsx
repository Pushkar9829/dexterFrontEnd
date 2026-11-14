import {
  Layers,
  FileSpreadsheet,
  CalendarDays,
  Banknote,
  FileCheck2,
  ChevronRight
} from 'lucide-react'
import { CardCornerAccent } from '../components/CardCornerAccent'

interface MobileOperationsScreenProps {
  onNavigate: (screen: string) => void
}

export function MobileOperationsScreen({ onNavigate }: MobileOperationsScreenProps) {
  const opCards = [
    {
      id: 'cbr',
      title: 'Cash Loading / CBR Module',
      desc: 'Submit Axis Indent & WLA daily cash loading with reject bin & cassette audit',
      icon: FileSpreadsheet,
      badge: 'Daily Activity'
    },
    {
      id: 'eod',
      title: 'End of Day (EOD) & CVR Popup',
      desc: 'Submit daily closing with physical cash verification register and switch match',
      icon: CalendarDays,
      badge: 'Closing Mandatory'
    },
    {
      id: 'indent-confirmation',
      title: 'Indent Withdrawn Confirmation',
      desc: 'Review Issued Indent, Revised Indent and Final Withdrawal Indent synchronization',
      icon: FileCheck2,
      badge: 'CBR Linked'
    },
    {
      id: 'cash-balance',
      title: 'Cash Balance Confirmation',
      desc: 'Verify switch balance against physical cash in cassettes for all active sites',
      icon: Banknote,
      badge: 'Reconciliation'
    }
  ]

  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
              ATM Operations Hub
            </span>
            <h1 className="text-xl font-black text-white mt-0.5">Field Operations</h1>
            <p className="text-[11px] text-blue-100 mt-1">
              Direct access to cash loading, day closing and indent reconciliation modules.
            </p>
          </div>
          <Layers size={30} className="text-amber-300" />
        </div>
      </div>

      {/* Operations Quick Cards */}
      <div className="space-y-3">
        {opCards.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className="group relative flex w-full flex-col justify-between rounded-2xl border border-blue-200/90 bg-white p-4 text-left shadow-xs hover:border-blue-400 hover:shadow-md active:scale-[0.99] transition-all overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Icon size={22} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#0B2A6B] group-hover:text-blue-700">
                      {item.title}
                    </h3>
                    <span className="mt-0.5 inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[9px] font-extrabold text-blue-700">
                      {item.badge}
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>

              <p className="mt-2 text-[11px] text-slate-500 leading-relaxed pr-8">
                {item.desc}
              </p>

              <CardCornerAccent />
            </button>
          )
        })}
      </div>
    </div>
  )
}
