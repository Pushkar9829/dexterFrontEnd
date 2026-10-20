import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import {
  ArrowRight, ArrowUp, BarChart3, ChevronLeft, ChevronRight, ClipboardList, FileText, FolderKanban, Landmark, Megaphone,
  Receipt, ShieldCheck, Store, TicketCheck, UserCheck, Users, Wallet, Zap, AlertCircle, CircleDollarSign,
  ListChecks, IdCard, Building, X,
} from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { Badge, toneFor } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { activities, dashboardNotices, finance, inr, kpis, moduleTiles, projects, quickAccess, tickets } from '@/data/dashboard'
import { DEMO_USER, getSession } from '@/lib/auth'

import type { ReactNode } from 'react'

const kpiIcons: Record<string, ReactNode> = {
  users: <Users size={16} />,
  franchises: <Store size={16} />,
  approvals: <UserCheck size={16} />,
  complaints: <TicketCheck size={16} />,
  atms: <Building size={16} />,
  revenue: <CircleDollarSign size={16} />,
  tasks: <ListChecks size={16} />,
  sla: <ShieldCheck size={16} />,
}
const financeIcon = { amber: <Wallet size={14} />, purple: <Receipt size={14} />, green: <ShieldCheck size={14} />, blue: <CircleDollarSign size={14} /> }
const financeBg = { amber: 'bg-amber-50 text-amber-600', purple: 'bg-violet-50 text-violet-600', green: 'bg-emerald-50 text-emerald-600', blue: 'bg-blue-50 text-blue-600' }
const quickIcons = [Users, Store, IdCard, Building, TicketCheck, ListChecks, BarChart3]
const tileStyle = {
  blue: { box: 'border-blue-100 bg-blue-50/60', icon: 'bg-primary', link: 'text-primary', Icon: FileText },
  sky: { box: 'border-sky-100 bg-sky-50/60', icon: 'bg-accent-blue', link: 'text-accent-blue', Icon: FolderKanban },
  purple: { box: 'border-violet-100 bg-violet-50/60', icon: 'bg-accent-purple', link: 'text-accent-purple', Icon: BarChart3 },
  red: { box: 'border-red-100 bg-red-50/60', icon: 'bg-brand-red', link: 'text-brand-red', Icon: ShieldCheck },
}

export default function Dashboard() {
  const [showAd, setShowAd] = useState(true)
  const kpiScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkKpiScroll = () => {
    const el = kpiScrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 6)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6)
  }

  useEffect(() => {
    checkKpiScroll()
    const handleResize = () => checkKpiScroll()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const scrollKpis = (direction: 'left' | 'right' = 'right') => {
    const el = kpiScrollRef.current
    if (!el) return
    const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 10
    const scrollAmount = (el.clientWidth + 12) / 4
    if (direction === 'right') {
      if (isAtEnd) {
        el.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        el.scrollBy({ left: scrollAmount, behavior: 'smooth' })
      }
    } else {
      el.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
    }
  }

  const user = getSession() ?? DEMO_USER
  const firstName = user.name.split(' ')[0]
  const totalTickets = tickets.reduce((s, t) => s + t.value, 0)
  const today = 'Tuesday, 06 October 2026' // business date of the demo data (matches "Last updated 06 Oct 2026")

  return (
    <div className="space-y-4">
      {/* Banner */}
      <section className="relative overflow-hidden rounded-xl bg-banner px-6 py-[19px] text-white">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[340px] -skew-x-[38deg] bg-white/[0.06] md:block" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[11px] -skew-x-[38deg] bg-brand-red md:block" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-tight font-semibold">Dashboard</h1>
            <p className="mt-1.5 text-[14px] text-white/90">Welcome back, {firstName}. Here’s your operations at a glance.</p>
          </div>
          <div className="sm:text-right">
            <div className="text-[18px] font-semibold">Dexter India</div>
            <div className="mt-1 text-[11.5px] text-white/85">{today}</div>
            <div className="mt-1.5 text-[9px] font-medium tracking-wide text-white/85">INDIA OPERATIONS</div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_312px]">
        {/* Left column */}
        <div className="min-w-0 space-y-4">
          {/* Scrollable KPI Carousel */}
          <div className="relative">
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollKpis('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 grid h-8 w-8 place-items-center rounded-full border border-line bg-white shadow-md text-ink hover:bg-[#edf4ff] hover:text-primary transition-all cursor-pointer"
                title="Scroll previous"
                aria-label="Scroll left"
              >
                <ChevronLeft size={16} />
              </button>
            )}

            <div
              ref={kpiScrollRef}
              onScroll={checkKpiScroll}
              className="flex items-center gap-3 overflow-x-auto py-1 scroll-smooth no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
            >
              {kpis.map((k) => (
                <div key={k.key} className="w-[calc((100%-12px)/2)] sm:w-[calc((100%-36px)/4)] shrink-0 snap-start">
                  <KpiCard
                    icon={kpiIcons[k.key as keyof typeof kpiIcons]}
                    color={k.color}
                    title={k.title}
                    value={k.value}
                    trend={k.trend}
                    up={k.up}
                    caption={k.caption}
                  />
                </div>
              ))}
            </div>

            {/* Circular side arrow overlapping half the last tile and half outside */}
            <button
              type="button"
              onClick={() => scrollKpis('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 grid h-8 w-8 place-items-center rounded-full border border-line bg-white shadow-md text-ink hover:bg-[#edf4ff] hover:text-primary transition-all cursor-pointer"
              title={canScrollRight ? 'Scroll next' : 'Scroll to start'}
              aria-label="Scroll right"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {/* Project status */}
            <Card>
              <CardHeader title="Project Status" icon={<ClipboardList size={16} />} viewAll="/projects/active" />
              <div className="space-y-[22px] px-4 pt-2 pb-4">
                {projects.map((p) => (
                  <div key={p.name}>
                    <div className="mb-2.5 flex justify-between text-[10.5px] text-ink">
                      <span>{p.name}</span>
                      <span className="text-ink-2">{p.pct}%</span>
                    </div>
                    <div className="h-[5px] rounded-full bg-line-soft">
                      <div className={cn('h-full rounded-full', p.color)} style={{ width: `${p.pct}%` }} />
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-[10px] text-muted">{projects.length} active projects · Implementation progress</p>
              </div>
            </Card>

            {/* Operations overview */}
            <Card>
              <CardHeader title="Operations Overview" viewAll="/operations/complaints" />
              <div className="flex items-center gap-4 px-4 pt-1">
                <div className="relative h-[124px] w-[124px] shrink-0">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={tickets} dataKey="value" innerRadius={44} outerRadius={61} startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
                        {tickets.map((t) => (
                          <Cell key={t.name} fill={t.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 grid place-items-center text-center">
                    <div>
                      <div className="text-[10px] text-muted">Total tickets</div>
                      <div className="mt-0.5 text-[26px] font-semibold leading-none">{totalTickets}</div>
                    </div>
                  </div>
                </div>
                <ul className="flex-1 space-y-3 text-[10px]">
                  {tickets.map((t) => (
                    <li key={t.name} className="flex items-center gap-2 text-ink-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.color }} />
                      <span className="flex-1">{t.name}</span>
                      <span className="text-[11px] font-medium text-ink">{t.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mx-4 mt-5 mb-4 flex h-[27px] items-center gap-2 rounded-md bg-red-50 px-3 text-[10px] text-brand-red">
                <AlertCircle size={12} /> {tickets[0].value} complaints need follow-up
              </div>
            </Card>

            {/* Financial summary */}
            <Card>
              <CardHeader title="Financial Summary" viewAll="/finance/gst" />
              <ul className="px-4 pb-2">
                {finance.map((f) => (
                  <li key={f.label} className="flex items-center gap-3 border-b border-line-soft py-[5px] last:border-0">
                    <span className={cn('grid h-[26px] w-[26px] place-items-center rounded-md', financeBg[f.tone])}>{financeIcon[f.tone]}</span>
                    <div className="flex-1">
                      <div className="text-[10px] text-muted">{f.label}</div>
                      <div className="text-[13.5px] font-semibold">{inr(f.amount)}</div>
                    </div>
                    <span className="flex items-center gap-0.5 text-[10px] text-emerald-600">
                      <ArrowUp size={10} /> {f.trend}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Recent activities */}
          <Card className="overflow-hidden">
            <CardHeader title="Recent Activities" sub="Latest updates" icon={<Landmark size={16} />} viewAll="/governance/audit" className="pr-6 pb-3.5" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[11px]">
                <thead className="bg-surface text-left text-[10px] text-ink">
                  <tr>
                    <th className="w-[131px] px-2 py-3 font-semibold">Date &amp; Time</th>
                    <th className="px-2 py-3 font-semibold">Activity</th>
                    <th className="w-[129px] px-2 py-3 font-semibold">Module</th>
                    <th className="w-[106px] px-2 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a, i) => (
                    <tr key={i} className="h-[33.5px] border-t border-line-soft">
                      <td className="px-2 py-0.5 text-[10px] leading-[11px] text-muted">
                        {a.when}
                        <br />
                        {a.time}
                      </td>
                      <td className="px-2 py-0.5 text-ink">{a.activity}</td>
                      <td className="px-2 py-0.5 text-primary">{a.module}</td>
                      <td className="px-2 py-0.5">
                        <Badge tone={toneFor(a.status)}>{a.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Module tiles */}
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            {moduleTiles.map((t) => {
              const s = tileStyle[t.tone]
              return (
                <Link key={t.title} to={t.to} className={cn('group flex h-[92px] flex-col justify-between rounded-xl border p-3 transition-shadow hover:shadow-md', s.box)}>
                  <div className="flex items-center gap-2.5">
                    <span className={cn('grid h-[26px] w-[26px] place-items-center rounded-md text-white', s.icon)}>
                      <s.Icon size={14} />
                    </span>
                    <span className="text-[12.5px] font-semibold">{t.title}</span>
                  </div>
                  <div className={cn('flex items-center justify-between pb-2.5 text-[9.5px]', s.link)}>
                    {t.sub}
                    <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Notices" icon={<Megaphone size={16} />} viewAll="/notices" className="pb-1" />
            <ul className="px-4 pb-2">
              {dashboardNotices.slice(0, 2).map((n) => (
                <li key={n.title} className="border-b border-line-soft py-2.5 last:border-0">
                  <div className="flex items-start gap-2">
                    <span className={cn('mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full', n.color)} />
                    <div>
                      <div className="text-[11px] font-semibold">{n.title}</div>
                      <div className="mt-1 text-[10px] text-muted">{n.body}</div>
                      <div className="mt-1 text-[9px] text-muted">{n.date}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Quick Access" icon={<Zap size={16} />} className="pb-3.5" />
            <ul className="space-y-2 px-4 pb-4">
              {quickAccess.map((q, i) => {
                const Icon = quickIcons[i]
                return (
                  <li key={q.label}>
                    <Link to={q.to} className="flex h-[33.5px] items-center gap-3 rounded-md bg-primary-soft/70 px-3 text-[11px] font-medium text-primary hover:bg-primary-soft">
                      <Icon size={14} />
                      <span className="flex-1">{q.label}</span>
                      <ChevronRight size={13} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-2 pt-1 text-[11px] text-muted">
        <span>India operations · All figures across active franchises</span>
        <span>Last updated 06 Oct 2026, 09:14 IST</span>
      </div>

      {/* Sticky Bottom-Right Ad Tile */}
      {showAd && (
        <aside
          role="complementary"
          aria-label="Promotional Announcement"
          className="fixed right-4 bottom-4 z-40 w-[240px] sm:w-[255px] overflow-hidden rounded-xl bg-navy-900 p-3 text-white shadow-xl ring-1 ring-white/15 transition-all duration-300 hover:shadow-2xl animate-in fade-in slide-in-from-bottom-3"
        >
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[58%] bg-gradient-to-br from-[#4a6aa3] via-[#22396a] to-navy-900" />
          <div className="pointer-events-none absolute right-4 bottom-0 h-[76px] w-[46px] rounded-t-sm bg-white/10" />
          <div className="pointer-events-none absolute right-[58px] bottom-0 h-[48px] w-[32px] rounded-t-sm bg-white/[0.07]" />

          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold tracking-tight">Dexter India</span>
                <span className="rounded bg-white/15 px-1 py-0.5 text-[7.5px] font-semibold tracking-wider text-white/80 uppercase">
                  Sponsored
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAd(false)}
                className="grid h-5 w-5 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/15 hover:text-white"
                title="Dismiss"
                aria-label="Dismiss advertisement"
              >
                <X size={12} />
              </button>
            </div>

            <div className="mt-2 text-[11px] leading-[15px] font-semibold">
              Smart Solutions
              <br />
              for a Growing Network
            </div>
            <div className="mt-1 text-[8.5px] text-white/75">Stronger together. Every day.</div>
          </div>
        </aside>
      )}
    </div>
  )
}
