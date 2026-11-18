import { useState, useRef, useEffect } from 'react'
import {
  Bell,
  Search,
  Wifi,
  X,
  FileSpreadsheet,
  Building2,
  Coins,
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  ShieldAlert,
  XCircle,
  Wallet,
  FileText,
  UploadCloud,
  DownloadCloud,
  Headphones
} from 'lucide-react'
import type { MobileUser } from '../data/mobileMockData'

interface MobileHeaderProps {
  user: MobileUser
  title?: string
  icon?: React.ReactNode
  showBack?: boolean
  onBack?: () => void
  onOpenMenu: () => void
  onOpenAlerts: () => void
  onOpenProfile: () => void
  onNavigate?: (screen: string) => void
  searchValue?: string
  onSearchChange?: (val: string) => void
  searchPlaceholder?: string
  showSearch?: boolean
  unreadAlertsCount?: number
}

// Quick searchable modules for instant navigation from header search bar
const SEARCHABLE_MODULES = [
  { id: 'cbr', title: 'Submit CBR', sub: 'Cash Balance Register & Indent', icon: FileSpreadsheet, color: 'text-blue-600 bg-blue-50' },
  { id: 'sites', title: 'My ATM Sites', sub: 'Booths, Stepper & Readiness', icon: Building2, color: 'text-emerald-600 bg-emerald-50' },
  { id: 'payout', title: 'Payout & Commission', sub: 'WLA monthly disbursement', icon: Coins, color: 'text-purple-600 bg-purple-50' },
  { id: 'complaints', title: 'Tickets & Complaints', sub: 'Hitachi & Booth Faults', icon: AlertTriangle, color: 'text-rose-600 bg-rose-50' },
  { id: 'transactions', title: 'Transaction History', sub: 'Cash & Non-Cash Switch TXNs', icon: ArrowLeftRight, color: 'text-cyan-600 bg-cyan-50' },
  { id: 'eod', title: 'Daily EOD Recon', sub: 'End of Day Balance Summary', icon: CheckCircle2, color: 'text-indigo-600 bg-indigo-50' },
  { id: 'chargeback', title: 'Chargeback & Dispute', sub: 'Customer dispute resolution', icon: ShieldAlert, color: 'text-amber-600 bg-amber-50' },
  { id: 'failed-txn', title: 'Failed Transactions', sub: 'Decline reason & switch logs', icon: XCircle, color: 'text-red-600 bg-red-50' },
  { id: 'accounts', title: 'Accounts & Banking', sub: 'Franchise settlement account', icon: Wallet, color: 'text-blue-600 bg-blue-50' },
  { id: 'legal', title: 'Legal & Agreement', sub: 'Franchise MSA & Stamp paper', icon: FileText, color: 'text-slate-600 bg-slate-50' },
  { id: 'uploads', title: 'Upload Documents', sub: 'CBR, Electricity, Bills', icon: UploadCloud, color: 'text-emerald-600 bg-emerald-50' },
  { id: 'downloads', title: 'Download Center', sub: 'Circulars, SOPs & Forms', icon: DownloadCloud, color: 'text-indigo-600 bg-indigo-50' },
  { id: 'contact', title: 'Helpdesk & Support', sub: 'Field Manager & Ops hotline', icon: Headphones, color: 'text-sky-600 bg-sky-50' }
]

export function MobileHeader({
  user,
  onOpenAlerts,
  onOpenProfile,
  onNavigate,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search modules, sites...',
  unreadAlertsCount = 3
}: MobileHeaderProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [internalSearch, setInternalSearch] = useState(searchValue)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Sync internal search with prop
  useEffect(() => {
    setInternalSearch(searchValue)
  }, [searchValue])

  // Handle outside click to close search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentSearchTerm = (onSearchChange ? searchValue : internalSearch).trim().toLowerCase()

  const filteredModules = currentSearchTerm
    ? SEARCHABLE_MODULES.filter(
      (m) =>
        m.title.toLowerCase().includes(currentSearchTerm) ||
        m.sub.toLowerCase().includes(currentSearchTerm)
    )
    : []

  const handleInputChange = (val: string) => {
    setInternalSearch(val)
    onSearchChange?.(val)
  }

  const handleSelectModule = (screenId: string) => {
    onNavigate?.(screenId)
    setIsSearchFocused(false)
    handleInputChange('')
  }

  // =========================================================================
  // UNIFIED TOP NAVBAR (EXACT SAME DASHBOARD HEADER ON EVERY SINGLE PAGE)
  // =========================================================================
  return (
    <header className="sticky top-0 z-40 w-full bg-gradient-to-b from-[#CDE0F5] via-[#D6E6F7] to-[#E1ECF9] relative overflow-hidden select-none">      <div className="relative w-full h-10 overflow-hidden">
      {/* Layered Organic Blue Wave Graphics */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 390 40"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="headerTopWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#053584" />
            <stop offset="35%" stopColor="#0B57D4" />
            <stop offset="70%" stopColor="#156DEF" />
            <stop offset="100%" stopColor="#094CBF" />
          </linearGradient>
          <linearGradient id="headerCyanStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#67E8F9" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        {/* Layer 1: Soft light blue swoosh dipping down under the wave */}
        <path
          d="M0,0 L390,0 L390,38 C320,44 250,33 185,36 C120,40 55,44 0,38 Z"
          fill="#BAE6FD"
          fillOpacity="0.8"
        />
        {/* Layer 2: Main royal blue wave fill */}
        <path
          d="M0,0 L390,0 L390,30 C325,38 260,27 195,30 C130,33 65,40 0,32 Z"
          fill="url(#headerTopWaveGrad)"
        />
        {/* Layer 3: Cyan wave glowing highlight edge */}
        <path
          d="M0,32 C65,40 130,33 195,30 C260,27 325,38 390,30"
          stroke="url(#headerCyanStroke)"
          strokeWidth="2"
          fill="none"
        />
      </svg>

      {/* Status Bar Indicators */}
      <div className="relative z-10 flex h-7 items-center justify-between px-6 pt-1 text-[12px] font-semibold tracking-tight text-white/95 select-none">
        <span>9:41</span>
        <div className="flex items-center gap-1.5">
          {/* Cellular Signal bars */}
          <div className="flex items-end gap-[1.5px] h-2.5">
            <span className="w-[2.5px] h-1 bg-white rounded-xs" />
            <span className="w-[2.5px] h-1.5 bg-white rounded-xs" />
            <span className="w-[2.5px] h-2 bg-white rounded-xs" />
            <span className="w-[2.5px] h-2.5 bg-white rounded-xs" />
          </div>
          {/* Wi-Fi */}
          <Wifi size={13} className="text-white" />
          {/* Battery Indicator */}
          <div className="flex items-center">
            <div className="w-5 h-2.5 rounded-[3px] border border-white/90 p-[1px] flex items-center">
              <div className="h-full w-full bg-white rounded-[1.5px]" />
            </div>
            <div className="w-[1.5px] h-1 bg-white/90 rounded-r-[1px]" />
          </div>
        </div>
      </div>
    </div>

      {/* Main Header Action Row: [Logo] [Search Bar] [Alert Bell] [Avatar] on Soft Light Blue Canvas */}
      <div className="relative z-10 flex h-13 items-center justify-between gap-2.5 px-3.5 pb-1 pt-0.5 bg-transparent">
        {/* Left: Dexter India Shield Logo */}
        <div className="shrink-0 flex items-center">
          <img
            src="/dexter-logo.png"
            alt="Dexter India"
            className="h-7 w-auto object-contain drop-shadow-2xs"
          />
        </div>

        {/* Center: Search Bar */}
        <div ref={searchContainerRef} className="flex-1 min-w-0 relative">
          <div className="relative flex items-center h-8.5 w-full rounded-full bg-white hover:bg-slate-50/80 focus-within:bg-white text-slate-800 border border-slate-200 focus-within:border-blue-500 shadow-2xs px-2.5 transition-all duration-200">
            <Search
              size={13.5}
              className="text-slate-500 focus-within:text-blue-600 mr-1.5 shrink-0 transition-colors"
            />
            <input
              type="text"
              value={onSearchChange ? searchValue : internalSearch}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-[11px] font-medium text-slate-800 placeholder-slate-400 focus:placeholder-slate-400 outline-none truncate"
            />
            {(onSearchChange ? searchValue : internalSearch) && (
              <button
                type="button"
                onClick={() => handleInputChange('')}
                className="text-slate-400 hover:text-slate-600 p-0.5 ml-1 transition-colors"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Interactive Instant Search Dropdown */}
          {isSearchFocused && currentSearchTerm.length > 0 && (
            <div className="absolute left-0 right-0 top-10 z-50 rounded-2xl bg-white p-1.5 shadow-2xl border border-blue-100 max-h-60 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-1 text-slate-800">
              <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Matching Modules ({filteredModules.length})
              </div>
              {filteredModules.length > 0 ? (
                filteredModules.map((mod) => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => handleSelectModule(mod.id)}
                    className="flex items-center gap-2 w-full p-2 rounded-xl hover:bg-blue-50 text-left transition-colors"
                  >
                    <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${mod.color} shrink-0`}>
                      <mod.icon size={13} />
                    </div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="text-[11px] font-bold text-slate-800 truncate">{mod.title}</p>
                      <p className="text-[9px] text-slate-400 truncate">{mod.sub}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-[10.5px] text-slate-500 font-medium">
                  No modules match &quot;{currentSearchTerm}&quot;
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Section: Alert Bell & Profile Avatar */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Alert Bell Button */}
          <button
            type="button"
            onClick={onOpenAlerts}
            className="relative flex h-8 w-8 items-center justify-center text-slate-800 hover:text-blue-700 active:scale-95 transition-all"
            aria-label="Notifications"
          >
            <Bell size={18} className="stroke-[2.2]" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E52429] px-1 text-[9px] font-black text-white shadow-xs">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Profile Avatar Button */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-slate-300 hover:ring-blue-500 active:scale-95 transition-all"
            aria-label="Profile"
          >
            <img
              src="/mobile-user-avatar.png"
              alt={user.name}
              onError={(e) => {
                e.currentTarget.src = user.avatar
              }}
              className="h-full w-full object-cover"
            />
          </button>
        </div>
      </div>
    </header>
  )
}
