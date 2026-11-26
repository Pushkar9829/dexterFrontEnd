import { useState } from 'react'
import {
  Bell,
  ArrowLeft,
  CheckCircle2,
  Wrench,
  Coins,
  Clock,
  ChevronRight,
} from 'lucide-react'
import { useMobileAlerts, type MobileAlert } from '../data/mobileFeeds'
import { fmtDateTime, relTime } from '../data/mobileSession'

interface MobileAlertsScreenProps {
  onBackToHome?: () => void
  onNavigateToScreen: (screen: string) => void
}

export function MobileAlertsScreen({ onBackToHome, onNavigateToScreen }: MobileAlertsScreenProps) {
  const { alerts, markRead, markAllRead } = useMobileAlerts()
  const [filter, setFilter] = useState<'All' | 'Unread' | 'Read'>('All')

  const handleAlertClick = (alertItem: MobileAlert) => {
    markRead(alertItem)
    if (alertItem.targetRoute) {
      onNavigateToScreen(alertItem.targetRoute)
    }
  }

  const unreadCount = alerts.filter((a) => !a.read).length
  const readCount = alerts.filter((a) => a.read).length

  const filtered = alerts.filter((a) => {
    if (filter === 'Unread') return !a.read
    if (filter === 'Read') return a.read
    return true
  })

  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      {/* Top Banner matching 9.28.44 AM.jpeg */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h1 className="text-base font-black text-white">Alerts / Notifications</h1>
              <p className="text-[11px] text-blue-100 mt-0.5">
                Stay updated with your important alerts and updates.
              </p>
            </div>
          </div>
          <Bell size={26} className="text-amber-300 shrink-0" />
        </div>

        {/* 3 Tabs: All (4), Unread (3), Read (1) */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            {[
              { id: 'All' as const, label: `All (${alerts.length})` },
              { id: 'Unread' as const, label: `Unread (${unreadCount})` },
              { id: 'Read' as const, label: `Read (${readCount})` }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id)}
                className={`py-1 px-3 rounded-full text-xs font-bold transition-all ${filter === t.id
                  ? 'bg-white text-[#0B2A6B] shadow-xs'
                  : 'bg-white/15 text-white/90 hover:bg-white/20'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button type="button" onClick={markAllRead} className="text-[10px] font-bold text-blue-100 underline">
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {filtered.map((item) => {
          let Icon = Bell
          let iconBg = 'bg-blue-100 text-blue-700'
          if (item.type === 'approved') {
            Icon = CheckCircle2
            iconBg = 'bg-emerald-100 text-emerald-700'
          } else if (item.type === 'updated') {
            Icon = Wrench
            iconBg = 'bg-blue-100 text-blue-700'
          } else if (item.type === 'payout') {
            Icon = Coins
            iconBg = 'bg-amber-100 text-amber-700'
          } else if (item.type === 'reminder') {
            Icon = Clock
            iconBg = 'bg-purple-100 text-purple-700'
          }

          return (
            <div
              key={item.id}
              onClick={() => handleAlertClick(item)}
              className={`rounded-2xl border p-3.5 shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 ${!item.read
                ? 'border-blue-300 bg-blue-50/40 hover:bg-blue-50/70'
                : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-slate-800 truncate">{item.title}</h4>
                    {!item.read && (
                      <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-slate-600 mt-0.5">{item.subtitle}</p>
                  <span className="text-[10px] text-slate-400 mt-1 block" title={fmtDateTime(item.at)}>{relTime(item.at)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black ${!item.read ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                >
                  {item.read ? 'Read' : 'Unread'}
                </span>
                <ChevronRight size={15} className="text-slate-400" />
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Bell size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold">No alerts found in this tab.</p>
          </div>
        )}
      </div>
    </div>
  )
}
