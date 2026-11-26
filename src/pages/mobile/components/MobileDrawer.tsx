import { X, User, Settings, Headphones, Ticket, FileText, Shield, LogOut, ChevronRight, CheckCircle } from 'lucide-react'
import { type MobileUser } from '../data/mobileSession'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  currentUser: MobileUser
  onNavigate: (screen: string) => void
  onLogout: () => void
}

export function MobileDrawer({
  isOpen,
  onClose,
  currentUser,
  onNavigate,
  onLogout
}: MobileDrawerProps) {
  if (!isOpen) return null

  const menuItems = [
    { id: 'profile', label: 'My Profile', icon: User, screen: 'profile' },
    { id: 'settings', label: 'Profile Settings', icon: Settings, screen: 'profile' },
    { id: 'support', label: 'Supports', icon: Headphones, screen: 'contact' },
    { id: 'tickets', label: 'Tickets', icon: Ticket, screen: 'complaints' },
    { id: 'terms', label: 'Terms & Conditions', icon: FileText, screen: 'terms' },
    { id: 'privacy', label: 'Privacy Policy', icon: Shield, screen: 'privacy' },
  ]

  return (
    <div className="absolute inset-0 z-50 flex overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative z-10 flex h-full w-[84%] max-w-[320px] flex-col bg-white shadow-2xl transition-transform duration-300 animate-in slide-in-from-left">
        {/* Header Profile Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0C3E98] to-[#1250C4] p-4.5 pt-9 text-white">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 active:scale-95"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/80 bg-white/20 text-lg font-black text-white shadow-md">
              {currentUser.initials}
            </div>
            <div className="leading-tight">
              <h3 className="text-base font-bold text-white">{currentUser.name}</h3>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-blue-100">
                <CheckCircle size={10} className="text-emerald-300" />
                {currentUser.roleTitle}
              </div>
              <p className="mt-1 text-[11px] text-blue-200">
                {currentUser.franchise?.name ?? currentUser.frId} · {currentUser.franchiseCode}
              </p>
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-white/20 flex items-center justify-between text-[11px] text-blue-100">
            <span>{currentUser.phone}</span>
            <span className="truncate max-w-[140px]">{currentUser.email}</span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="px-2 py-1 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
            Account & Support
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.screen)
                  onClose()
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50/70 hover:text-blue-900 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Icon size={17} />
                  </div>
                  <span>{item.label}</span>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>
            )
          })}
        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-200 bg-slate-50/80 p-3.5 pb-6 space-y-2">

          <button
            onClick={() => {
              onLogout()
              onClose()
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
          >
            <LogOut size={14} />
            Logout Session
          </button>
        </div>
      </div>
    </div>
  )
}
