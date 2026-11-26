import { useState } from 'react'
import {
  Megaphone,
  ArrowLeft,
  Pin,
  CheckCircle,
  FileText,
  Check
} from 'lucide-react'
import { broadcastCategory, useFranchiseBroadcasts } from '../data/mobileFeeds'
import { fmtDateTime } from '../data/mobileSession'

interface MobileBroadcastsScreenProps {
  onBackToMore?: () => void
}

export function MobileBroadcastsScreen({ onBackToMore }: MobileBroadcastsScreenProps) {
  // Published broadcasts addressed to franchisees (Communication › Broadcasts); acknowledgement kept per user.
  const { list, acks, acknowledge: handleAcknowledge } = useFranchiseBroadcasts()
  const [filterCategory, setFilterCategory] = useState<string>('All')
  const [openId, setOpenId] = useState<string | null>(null)
  const broadcasts = list.map((b) => ({
    id: b.id,
    title: b.title,
    subtitle: b.subject,
    message: b.message,
    attachment: b.attachment,
    category: broadcastCategory(b),
    categoryLabel: b.type,
    date: b.date,
    department: b.createdBy,
    pinned: b.priority === 'Critical' || b.priority === 'Urgent',
    ackRequired: b.ackRequired,
    acknowledged: !!acks[b.id],
    ackAt: acks[b.id],
  }))

  const acknowledgedCount = broadcasts.filter((b) => b.acknowledged).length
  const pendingCount = broadcasts.filter((b) => !b.acknowledged).length

  const filtered = broadcasts.filter((b) => {
    return filterCategory === 'All' || b.category === filterCategory
  })

  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      {/* Banner matching 9.28.28 AM.jpeg */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToMore && (
              <button
                onClick={onBackToMore}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h1 className="text-base font-black text-white">Broadcasts / Notice Board</h1>
              <p className="text-[11px] text-blue-100 mt-0.5">
                View all important announcements, policies, circulars and updates.
              </p>
            </div>
          </div>
          <Megaphone size={26} className="text-amber-300 shrink-0" />
        </div>

        {/* Filter Pills */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scroll-thin">
          {['All', 'Policies', 'Circulars', 'Holidays', 'Compliance', 'Greetings'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                filterCategory === cat
                  ? 'bg-white text-[#0B2A6B] shadow-xs'
                  : 'bg-white/15 text-white/90 hover:bg-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Broadcasts List */}
      <div className="space-y-2.5">
        {filtered.length === 0 && <p className="rounded-xl bg-white p-4 text-center text-xs text-slate-500">No published broadcasts for franchisees in this category.</p>}
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-blue-300 transition-all space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-[#0B2A6B] leading-tight">{item.title}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.subtitle}</p>
                  <button type="button" onClick={() => setOpenId(openId === item.id ? null : item.id)} className="mt-0.5 text-[10px] font-bold text-blue-600">
                    {openId === item.id ? 'Hide message' : 'Read message'}
                  </button>
                  {openId === item.id && (
                    <div className="mt-1 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700 whitespace-pre-line">
                      {item.message}
                      {item.attachment && <div className="mt-1 text-[10px] font-bold text-blue-700">📎 {item.attachment.name} ({item.attachment.size})</div>}
                    </div>
                  )}
                </div>
              </div>
              {item.pinned && (
                <span className="flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-[9px] font-black">
                  <Pin size={10} /> Pinned
                </span>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10.5px]">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-blue-50 px-1.5 py-0.5 font-bold text-blue-700">
                  {item.categoryLabel}
                </span>
                <span className="text-slate-400">{item.date}</span>
                <span className="text-slate-400">• {item.department}</span>
              </div>

              {!item.ackRequired && !item.acknowledged ? (
                <span className="text-[10px] font-semibold text-slate-400">For information</span>
              ) : item.acknowledged ? (
                <span className="flex items-center gap-1 font-bold text-emerald-600">
                  <CheckCircle size={13} /> <span title={fmtDateTime(item.ackAt)}>Acknowledged</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAcknowledge(item.id)}
                  className="rounded-lg bg-blue-600 px-2.5 py-1 text-white font-bold text-[10px] shadow-xs hover:bg-blue-700 flex items-center gap-1"
                >
                  <Check size={11} /> Acknowledge
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Summary Counters matching 9.28.28 AM.jpeg */}
      <div className="grid grid-cols-3 gap-2 text-center pt-2">
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-2.5">
          <span className="text-[9.5px] font-bold text-slate-500 block">Total Broadcasts</span>
          <span className="text-base font-black text-[#0B2A6B]">{broadcasts.length}</span>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-2.5">
          <span className="text-[9.5px] font-bold text-emerald-700 block">Acknowledged</span>
          <span className="text-base font-black text-emerald-600">{acknowledgedCount}</span>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-2.5">
          <span className="text-[9.5px] font-bold text-amber-700 block">Pending</span>
          <span className="text-base font-black text-amber-600">{pendingCount}</span>
        </div>
      </div>
    </div>
  )
}
