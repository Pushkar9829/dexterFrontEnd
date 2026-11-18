import {
  Landmark,
  Calculator,
  CreditCard,
  Headphones,
  Download,
  CalendarDays,
  RotateCcw,
  Scale,
  AlertTriangle,
  Building,
  ArrowLeftRight,
  UploadCloud,
  Search
} from 'lucide-react'
import { CardCornerAccent } from '../components/CardCornerAccent'

interface MobileMoreScreenProps {
  onNavigate: (screen: string) => void
  searchQuery?: string
}

export function MobileMoreScreen({ onNavigate, searchQuery = '' }: MobileMoreScreenProps) {
  const modules = [
    {
      id: 'accounts',
      title: 'Accounts',
      icon: Landmark,
      color: 'text-[#0B56D0]',
      screen: 'accounts'
    },
    {
      id: 'complaints',
      title: 'Raise Complaint',
      icon: AlertTriangle,
      color: 'text-[#E52429]',
      screen: 'complaints'
    },
    {
      id: 'cbr',
      title: 'CBR',
      icon: Calculator,
      color: 'text-[#0B56D0]',
      screen: 'cbr'
    },
    {
      id: 'eod',
      title: 'EOD',
      icon: CalendarDays,
      color: 'text-[#0B56D0]',
      screen: 'eod'
    },
    {
      id: 'chargeback',
      title: 'Chargeback Dispute Transaction',
      icon: CreditCard,
      color: 'text-[#0B56D0]',
      screen: 'chargeback'
    },
    {
      id: 'failed-txns',
      title: 'Failed Transaction',
      icon: RotateCcw,
      color: 'text-[#0B56D0]',
      screen: 'failed-txns'
    },
    {
      id: 'transactions',
      title: 'Transaction Details',
      icon: ArrowLeftRight,
      color: 'text-[#0B56D0]',
      screen: 'transactions'
    },
    {
      id: 'sites',
      title: 'Site',
      icon: Building,
      color: 'text-[#0B56D0]',
      screen: 'sites'
    },
    {
      id: 'contact',
      title: 'Helpdesk',
      icon: Headphones,
      color: 'text-[#0B56D0]',
      screen: 'contact'
    },
    {
      id: 'legal',
      title: 'Legal',
      icon: Scale,
      color: 'text-[#0B56D0]',
      screen: 'legal'
    },
    {
      id: 'downloads',
      title: 'Download Center',
      icon: Download,
      color: 'text-[#0B56D0]',
      screen: 'downloads'
    },
    {
      id: 'uploads',
      title: 'Upload Center',
      icon: UploadCloud,
      color: 'text-[#0B56D0]',
      screen: 'uploads'
    }
  ]

  const filtered = searchQuery.trim()
    ? modules.filter((m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
    )
    : modules

  return (
    <div className="pb-8 pt-3 px-3.5">
      {/* 14 Core Module Tiles with Dexter Blue Accent and Enhanced Dual-Wave Corner */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.screen)}
              className="group relative flex flex-col items-center justify-between min-h-[112px] rounded-2xl border border-[#BED7FA] bg-gradient-to-b from-[#F2F7FE] via-[#F8FBFF] to-[#E8F2FC] p-3 pt-4 pb-3 text-center shadow-[0_4px_14px_rgba(20,70,170,0.06)] hover:border-[#86B9F8] hover:from-[#EDF5FE] hover:to-[#E1EEFB] hover:shadow-[0_6px_20px_rgba(20,70,170,0.12)] active:scale-[0.98] transition-all duration-150 overflow-hidden"
            >
              {/* Centered Large Icon and Bold Navy Title */}
              <div className="flex flex-col items-center justify-center flex-1 w-full z-10">
                <Icon
                  size={36}
                  className={`${item.color} stroke-[2.1] transition-transform duration-200 group-hover:scale-105`}
                />
                <h3 className="mt-2 text-[12.5px] font-black text-[#061D52] leading-tight text-center px-1">
                  {item.title}
                </h3>
              </div>

              {/* Enhanced Dexter Signature Dual-Wave Corner Pattern */}
              <CardCornerAccent width={58} height={38} />
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Search size={32} className="mx-auto text-blue-300 mb-2" />
          <p className="text-xs font-semibold text-slate-600">No module matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  )
}
