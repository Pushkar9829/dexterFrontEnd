import { Home, MapPin, Layers, LayoutGrid } from 'lucide-react'

export type MobileTab = 'home' | 'sites' | 'operations' | 'payout' | 'more'

interface MobileBottomNavProps {
  currentTab: MobileTab
  onTabChange: (tab: MobileTab) => void
}

function RupeeCircleIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full border-[1.8px] border-current flex items-center justify-center font-black text-[11px] leading-none select-none ${className}`}
    >
      ₹
    </div>
  )
}

export function MobileBottomNav({ currentTab, onTabChange }: MobileBottomNavProps) {
  const tabs = [
    { id: 'home' as MobileTab, label: 'Home', icon: Home },
    { id: 'sites' as MobileTab, label: 'My Sites', icon: MapPin },
    { id: 'operations' as MobileTab, label: 'Operations', icon: Layers },
    { id: 'payout' as MobileTab, label: 'Payout', icon: RupeeCircleIcon },
    { id: 'more' as MobileTab, label: 'More', icon: LayoutGrid }
  ]

  return (
    <div className="sticky bottom-0 z-30 w-full border-t border-slate-200/90 bg-white/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.06)] select-none">
      <nav className="flex h-15 items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = currentTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all ${
                isActive ? 'text-[#1675F8]' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div
                className={`relative flex h-7.5 w-11 items-center justify-center rounded-xl transition-all ${
                  isActive ? 'bg-blue-50 scale-105' : ''
                }`}
              >
                <Icon
                  size={19}
                  className={`transition-transform duration-200 ${
                    isActive ? 'stroke-[2.5] text-[#1675F8]' : 'stroke-[1.8]'
                  }`}
                />
              </div>
              <span
                className={`text-[10px] tracking-tight font-medium ${
                  isActive ? 'font-bold text-[#1675F8]' : 'text-slate-500'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-0.5 h-[3px] w-7 rounded-full bg-[#1675F8]" />
              )}
            </button>
          )
        })}
      </nav>

      {/* iOS Home Indicator Bar */}
      <div className="flex h-3.5 w-full items-center justify-center pb-1">
        <div className="h-1 w-28 rounded-full bg-slate-300" />
      </div>
    </div>
  )
}
