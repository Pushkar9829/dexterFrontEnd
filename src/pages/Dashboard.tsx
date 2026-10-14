import { Link } from 'react-router-dom'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import {
  ArrowRight, ArrowUp, BarChart3, ChevronRight, ClipboardList, FileText, FolderKanban, Landmark, Megaphone,
  Receipt, ShieldCheck, Store, TicketCheck, UserCheck, Users, Wallet, Zap, AlertCircle, CircleDollarSign,
  ListChecks, IdCard, Building,
} from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { Badge, toneFor } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { activities, dashboardNotices, finance, inr, kpis, moduleTiles, projects, quickAccess, tickets } from '@/data/dashboard'
import { DEMO_USER, getSession } from '@/lib/auth'

const kpiIcons = { users: <Users size={18} />, franchises: <Store size={18} />, approvals: <UserCheck size={18} />, complaints: <TicketCheck size={18} /> }
const financeIcon = { amber: <Wallet size={16} />, purple: <Receipt size={16} />, green: <ShieldCheck size={16} />, blue: <CircleDollarSign size={16} /> }
const financeBg = { amber: 'bg-amber-50 text-amber-600', purple: 'bg-violet-50 text-violet-600', green: 'bg-emerald-50 text-emerald-600', blue: 'bg-blue-50 text-blue-600' }
const quickIcons = [Users, Store, IdCard, Building, TicketCheck, ListChecks, BarChart3]
const tileStyle = {
  blue: { box: 'border-blue-100 bg-blue-50/60', icon: 'bg-primary', link: 'text-primary', Icon: FileText },
  sky: { box: 'border-sky-100 bg-sky-50/60', icon: 'bg-accent-blue', link: 'text-accent-blue', Icon: FolderKanban },
  purple: { box: 'border-violet-100 bg-violet-50/60', icon: 'bg-accent-purple', link: 'text-accent-purple', Icon: BarChart3 },
  red: { box: 'border-red-100 bg-red-50/60', icon: 'bg-brand-red', link: 'text-brand-red', Icon: ShieldCheck },
}

export default function Dashboard() {
  const user = getSession() ?? DEMO_USER
  const firstName = user.name.split(' ')[0]
  const totalTickets = tickets.reduce((s, t) => s + t.value, 0)
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">
      {/* Banner */}
      <section className="relative overflow-hidden rounded-xl bg-banner px-6 py-7 text-white sm:px-7">
        <div className="pointer-events-none absolute inset-y-0 right-[22%] hidden w-64 -skew-x-[35deg] bg-white/5 md:block" />
        <div className="pointer-events-none absolute inset-y-0 right-[18%] hidden w-3 -skew-x-[35deg] bg-brand-red md:block" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold">Dashboard</h1>
            <p className="mt-1.5 text-[15px] text-white/85">Welcome back, {firstName}. Here’s your operations at a glance.</p>
          </div>
          <div className="sm:text-right">
            <div className="text-[20px] font-semibold">Dexter India</div>
            <div className="mt-1 text-[12px] text-white/80">{today}</div>
            <div className="mt-1.5 text-[10px] font-semibold tracking-wider text-white/80">INDIA OPERATIONS</div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_316px]">
        {/* Left column */}
        <div className="min-w-0 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            {kpis.map((k) => (
              <KpiCard key={k.key} icon={kpiIcons[k.key as keyof typeof kpiIcons]} color={k.color} title={k.title} value={k.value} trend={k.trend} up={k.up} caption={k.caption} />
            ))}
          </div>

          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {/* Project status */}
            <Card>
              <CardHeader title="Project Status" icon={<ClipboardList size={18} />} viewAll="/projects/active" />
              <div className="space-y-5 px-5 pt-2 pb-5">
                {projects.map((p) => (
                  <div key={p.name}>
                    <div className="mb-2 flex justify-between text-[12px] text-ink-2">
                      <span>{p.name}</span>
                      <span className="text-muted">{p.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-line-soft">
                      <div className={cn('h-full rounded-full', p.color)} style={{ width: `${p.pct}%` }} />
                    </div>
                  </div>
                ))}
                <p className="pt-2 text-[11px] text-muted">{projects.length} active projects · Implementation progress</p>
              </div>
            </Card>

            {/* Operations overview */}
            <Card>
              <CardHeader title="Operations Overview" viewAll="/operations/complaints" />
              <div className="flex items-center gap-4 px-5">
                <div className="relative h-[130px] w-[130px] shrink-0">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={tickets} dataKey="value" innerRadius={44} outerRadius={62} startAngle={90} endAngle={-270} stroke="none">
                        {tickets.map((t) => (
                          <Cell key={t.name} fill={t.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 grid place-items-center text-center">
                    <div>
                      <div className="text-[10px] text-muted">Total tickets</div>
                      <div className="text-[26px] font-semibold leading-none">{totalTickets}</div>
                    </div>
                  </div>
                </div>
                <ul className="flex-1 space-y-2.5 text-[11px]">
                  {tickets.map((t) => (
                    <li key={t.name} className="flex items-center gap-2 text-muted">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.color }} />
                      <span className="flex-1">{t.name}</span>
                      <span className="font-medium text-ink">{t.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="m-5 mt-4 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-[11px] text-brand-red">
                <AlertCircle size={13} /> {tickets[0].value} complaints need follow-up
              </div>
            </Card>

            {/* Financial summary */}
            <Card>
              <CardHeader title="Financial Summary" viewAll="/finance/gst" />
              <ul className="px-5 pb-3">
                {finance.map((f) => (
                  <li key={f.label} className="flex items-center gap-3 border-b border-line-soft py-2.5 last:border-0">
                    <span className={cn('grid h-7 w-7 place-items-center rounded-md', financeBg[f.tone])}>{financeIcon[f.tone]}</span>
                    <div className="flex-1">
                      <div className="text-[11px] text-muted">{f.label}</div>
                      <div className="text-[14px] font-semibold">{inr(f.amount)}</div>
                    </div>
                    <span className="flex items-center text-[10px] text-emerald-600">
                      <ArrowUp size={11} /> {f.trend}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Recent activities */}
          <Card className="overflow-hidden">
            <CardHeader title="Recent Activities" sub="Latest updates" icon={<Landmark size={18} />} viewAll="/governance/audit" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[12px]">
                <thead className="bg-surface text-left text-[11px] text-ink">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date &amp; Time</th>
                    <th className="px-4 py-3 font-semibold">Activity</th>
                    <th className="px-4 py-3 font-semibold">Module</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a, i) => (
                    <tr key={i} className="border-t border-line-soft">
                      <td className="px-4 py-2 leading-tight text-ink-2">
                        {a.when}
                        <br />
                        {a.time}
                      </td>
                      <td className="px-4 py-2 text-ink">{a.activity}</td>
                      <td className="px-4 py-2 text-primary">{a.module}</td>
                      <td className="px-4 py-2">
                        <Badge tone={toneFor(a.status)}>{a.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Module tiles */}
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            {moduleTiles.map((t) => {
              const s = tileStyle[t.tone]
              return (
                <Link key={t.title} to={t.to} className={cn('group rounded-xl border p-4 transition-shadow hover:shadow-md', s.box)}>
                  <div className="flex items-center gap-2.5">
                    <span className={cn('grid h-8 w-8 place-items-center rounded-lg text-white', s.icon)}>
                      <s.Icon size={16} />
                    </span>
                    <span className="text-[14px] font-semibold">{t.title}</span>
                  </div>
                  <div className={cn('mt-5 flex items-center justify-between text-[11px]', s.link)}>
                    {t.sub}
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Quick Access" icon={<Zap size={18} />} />
            <ul className="space-y-2.5 px-4 pb-4">
              {quickAccess.map((q, i) => {
                const Icon = quickIcons[i]
                return (
                  <li key={q.label}>
                    <Link to={q.to} className="flex items-center gap-3 rounded-lg bg-primary-soft/60 px-3 py-2.5 text-[12px] font-medium text-primary hover:bg-primary-soft">
                      <Icon size={15} />
                      <span className="flex-1">{q.label}</span>
                      <ChevronRight size={14} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Notices" icon={<Megaphone size={18} />} viewAll="/notices" />
            <ul className="px-5 pb-3">
              {dashboardNotices.map((n) => (
                <li key={n.title} className="border-b border-line-soft py-3 last:border-0">
                  <div className="flex items-start gap-2">
                    <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', n.color)} />
                    <div>
                      <div className="text-[12px] font-semibold">{n.title}</div>
                      <div className="mt-1 text-[11px] text-muted">{n.body}</div>
                      <div className="mt-1.5 text-[10px] text-muted">{n.date}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <div className="relative overflow-hidden rounded-xl bg-navy-900 p-5 text-white">
            <div className="pointer-events-none absolute -right-6 -bottom-6 h-40 w-40 rounded-full bg-white/5" />
            <div className="text-[16px] font-semibold">Dexter India</div>
            <div className="mt-5 text-[13px] font-semibold leading-snug">
              Smart Solutions
              <br />
              for a Growing Network
            </div>
            <div className="mt-4 text-[11px] text-white/75">Stronger together. Every day.</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-2 text-[11px] text-muted">
        <span>India operations · All figures across active franchises</span>
        <span>Last updated 06 Oct 2026, 09:14 IST</span>
      </div>
    </div>
  )
}
