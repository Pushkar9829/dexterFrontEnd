import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowUpRight, CalendarDays, ChevronDown, ClipboardList, Clock, Copy, Download, MoreHorizontal, Plus, Search, ShieldCheck, CircleCheck, SlidersHorizontal, X } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { Sparkline } from '@/components/ui/Sparkline'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/export'
import { APPLICANT_TYPES, STATUSES, type Application, type AppStatus } from '@/data/applications'
import { deleteApplication, getApplication, setStatus, useApplications } from '@/data/applicationStore'
import { ApplicationWizard } from './wizard/ApplicationWizard'

const TABS: { key: AppStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All applications' },
  { key: 'Under review', label: 'Under review' },
  { key: 'KYC pending', label: 'KYC pending' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Rejected', label: 'Rejected' },
  { key: 'Draft', label: 'Drafts' },
]

const statusTone: Record<AppStatus, 'blue' | 'amber' | 'green' | 'red' | 'gray'> = {
  'Under review': 'blue',
  'KYC pending': 'amber',
  Approved: 'green',
  Rejected: 'red',
  Draft: 'gray',
}

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  }
}
const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

function RowMenu({ app, onOpen }: { app: Application; onOpen: () => void }) {
  const [open, setOpen] = useState(false)
  const act = (fn: () => void) => () => {
    fn()
    setOpen(false)
  }
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-surface" aria-label="More actions">
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-1 w-48 rounded-lg border border-line bg-white py-1 text-[13px] shadow-lg">
            <button className="block w-full px-3 py-2 text-left hover:bg-surface" onClick={act(onOpen)}>
              {app.status === 'Draft' ? 'Resume draft' : 'View application'}
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface"
              onClick={act(() => {
                navigator.clipboard?.writeText(app.id)
                toast(`${app.id} copied`, 'info')
              })}
            >
              <Copy size={13} /> Copy App ID
            </button>
            {app.status === 'Under review' && (
              <button className="block w-full px-3 py-2 text-left hover:bg-surface" onClick={act(() => { setStatus([app.id], 'KYC pending'); toast(`${app.id} moved to KYC pending`) })}>
                Move to KYC pending
              </button>
            )}
            {(app.status === 'Under review' || app.status === 'KYC pending') && (
              <>
                <button className="block w-full px-3 py-2 text-left text-emerald-700 hover:bg-surface" onClick={act(() => { setStatus([app.id], 'Approved'); toast(`${app.id} approved`) })}>
                  Approve
                </button>
                <button className="block w-full px-3 py-2 text-left text-brand-red hover:bg-surface" onClick={act(() => { setStatus([app.id], 'Rejected'); toast(`${app.id} rejected`, 'info') })}>
                  Reject
                </button>
              </>
            )}
            {app.status === 'Draft' && (
              <button
                className="block w-full px-3 py-2 text-left text-brand-red hover:bg-surface"
                onClick={act(() => {
                  if (confirm(`Delete draft ${app.id}? This cannot be undone.`)) {
                    deleteApplication(app.id)
                    toast(`Draft ${app.id} deleted`, 'info')
                  }
                })}
              >
                Delete draft
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function Applications() {
  const apps = useApplications()
  const navigate = useNavigate()
  const { appId } = useParams()
  const [tab, setTab] = useState<AppStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const [status, setStatusFilter] = useState<AppStatus | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [type, setType] = useState('')
  const [showDates, setShowDates] = useState(false)
  const [showMore, setShowMore] = useState(false)

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: apps.length }
    apps.forEach((a) => (c[a.status] = (c[a.status] ?? 0) + 1))
    return c
  }, [apps])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return apps.filter((a) => {
      if (tab !== 'all' && a.status !== tab) return false
      if (status && a.status !== status) return false
      if (type && a.type !== type) return false
      const day = a.submittedAt.slice(0, 10)
      if (from && day < from) return false
      if (to && day > to) return false
      return !q || a.id.toLowerCase().includes(q) || a.applicantName.toLowerCase().includes(q) || a.applicantEmail.toLowerCase().includes(q)
    })
  }, [apps, tab, status, type, from, to, query])

  const wizardOpen = appId !== undefined
  const wizardApp = appId && appId !== 'new' ? getApplication(appId) ?? null : null
  const open = (a: Application) => navigate(`/onboarding/applications/${a.id}`)

  const now = new Date('2026-10-06T23:59:00+05:30').getTime()
  const overdueReview = apps.filter((a) => (a.status === 'Under review' || a.status === 'KYC pending') && now - new Date(a.submittedAt).getTime() > 48 * 3600_000).length
  const kycOld = apps.filter((a) => a.status === 'KYC pending' && now - new Date(a.submittedAt).getTime() > 48 * 3600_000).length
  const thisMonth = apps.filter((a) => a.submittedAt.startsWith('2026-10')).length
  const approvedThisMonth = apps.filter((a) => a.status === 'Approved' && a.updatedAt.startsWith('2026-10')).length

  const kpis = [
    { label: 'Total applications', value: apps.length, cap: `↑ ${thisMonth} new applications this month`, icon: <Copy size={16} />, pts: [3, 4, 3.6, 5, 4.8, 6, 6.5, 8], color: '#1e3f95', capCls: 'text-muted' },
    { label: 'Under review', value: counts['Under review'] ?? 0, cap: `${Math.min(12, counts['Under review'] ?? 0)} awaiting assignment`, icon: <ClipboardList size={16} />, pts: [2, 3, 2.6, 4, 3.8, 5, 5.2, 7], color: '#1e3f95', capCls: 'text-muted' },
    { label: 'Pending KYC', value: counts['KYC pending'] ?? 0, cap: `${kycOld} pending for more than 48 hours`, icon: <ShieldCheck size={16} />, pts: [7, 6.6, 7, 5.6, 6, 4.6, 4.8, 3.8], color: '#a16207', capCls: 'text-amber-700' },
    { label: 'Approved this month', value: approvedThisMonth, cap: '↑ 12.4% vs. previous month', icon: <CircleCheck size={16} />, pts: [2, 2.6, 2.2, 3.8, 3.4, 5, 4.8, 7], color: '#047857', capCls: 'text-muted' },
  ]

  const columns: GridColumn<Application>[] = [
    { key: 'id', header: 'App ID', width: 150, sortable: true, render: (a) => <button onClick={() => open(a)} className="font-medium text-primary hover:underline">{a.id}</button> },
    {
      key: 'applicantName', header: 'Applicant Name', width: 380, sortable: true,
      render: (a) => (
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface text-[10px] font-semibold text-ink-2">{initials(a.applicantName)}</span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[13px] text-ink">{a.applicantName}</div>
            <div className="text-[11px] text-muted">{a.applicantEmail}</div>
          </div>
          <span className="hidden text-[10px] text-muted md:inline">{a.type}</span>
        </div>
      ),
    },
    { key: 'status', header: 'Status', width: 150, sortable: true, render: (a) => <Badge tone={statusTone[a.status]}>{a.status}</Badge> },
    {
      key: 'submittedAt', header: 'Date Submitted', width: 150, sortable: true,
      render: (a) => {
        const d = fmtDate(a.submittedAt)
        return (
          <span className="leading-tight">
            {d.date}
            <br />
            <span className="text-[11px] text-muted">{d.time}</span>
          </span>
        )
      },
    },
    {
      key: 'actions', header: 'Actions', label: 'Actions', width: 200, value: () => '',
      render: (a) => (
        <div className="flex items-center gap-4">
          <button onClick={() => open(a)} className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline">
            {a.status === 'Draft' ? 'Resume draft' : 'View application'} <ArrowUpRight size={14} />
          </button>
          <RowMenu app={a} onOpen={() => open(a)} />
        </div>
      ),
    },
  ]

  const exportRows = () =>
    downloadCsv(
      'applications',
      ['App ID', 'Applicant Name', 'Email', 'Type', 'Status', 'Date Submitted'],
      rows.map((a) => [a.id, a.applicantName, a.applicantEmail, a.type, a.status, new Date(a.submittedAt).toLocaleString('en-IN')]),
    )

  const activeFilters = [status, from || to, type].filter(Boolean).length

  return (
    <div>
      <PageHeader
        title="Applications"
        sub="Manage franchise applications from submission to approval."
        actions={
          <>
            <Button variant="secondary" icon={<Download size={16} />} onClick={exportRows}>
              Export
            </Button>
            <Button icon={<Plus size={16} />} onClick={() => navigate('/onboarding/applications/new')}>
              New Application
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-line bg-white p-5">
            <div className="flex items-start justify-between text-[13px] text-muted">
              {k.label}
              <span className="text-primary">{k.icon}</span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <span className="text-[28px] font-semibold leading-none">{k.value}</span>
              <Sparkline points={k.pts} color={k.color} />
            </div>
            <div className={cn('mt-3 text-[12px]', k.capCls)}>{k.cap}</div>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-line bg-white">
        {/* tabs */}
        <div className="scroll-thin flex gap-6 overflow-x-auto border-b border-line px-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn('-mb-px border-b-2 py-3.5 text-[13px] whitespace-nowrap', tab === t.key ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted hover:text-ink')}
            >
              {t.label} <span className="ml-1.5">{counts[t.key] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* filters */}
        <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
          <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-line px-3 text-[13px] text-muted sm:w-[300px]">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search applicant or App ID" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
          </label>
          <label className="relative">
            <select
              value={status}
              onChange={(e) => setStatusFilter(e.target.value as AppStatus | '')}
              className="h-10 appearance-none rounded-lg border border-line bg-white pr-4 pl-9 text-[13px] font-semibold outline-none"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute top-3 left-3 text-ink-2" />
          </label>
          <button onClick={() => setShowDates((s) => !s)} className={cn('flex h-10 items-center gap-2 rounded-lg border px-3 text-[13px] font-semibold', from || to ? 'border-primary text-primary' : 'border-line')}>
            <CalendarDays size={15} /> {from || to ? `${from || '…'} → ${to || '…'}` : 'Date submitted'}
          </button>
          <button onClick={() => setShowMore((s) => !s)} className={cn('flex h-10 items-center gap-2 rounded-lg border px-3 text-[13px] font-semibold', type ? 'border-primary text-primary' : 'border-line')}>
            <SlidersHorizontal size={15} /> More filters
          </button>
          {activeFilters > 0 && (
            <button
              onClick={() => {
                setStatusFilter('')
                setFrom('')
                setTo('')
                setType('')
              }}
              className="flex items-center gap-1 text-[12px] text-muted hover:text-ink"
            >
              <X size={13} /> Clear filters
            </button>
          )}
          <span className="ml-auto text-[12px] text-muted">{rows.length} applications</span>

          {showDates && (
            <div className="absolute top-14 left-4 z-20 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-3 shadow-lg sm:left-[480px]">
              <label className="text-[12px] text-muted">
                From
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block h-9 rounded-md border border-line px-2 text-[13px] text-ink" />
              </label>
              <label className="text-[12px] text-muted">
                To
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block h-9 rounded-md border border-line px-2 text-[13px] text-ink" />
              </label>
              <Button size="sm" onClick={() => setShowDates(false)}>
                Apply
              </Button>
            </div>
          )}
          {showMore && (
            <div className="absolute top-14 left-4 z-20 w-64 rounded-lg border border-line bg-white p-3 shadow-lg sm:left-[640px]">
              <div className="mb-2 text-[12px] font-semibold">Applicant type</div>
              {['', ...APPLICANT_TYPES].map((t) => (
                <label key={t || 'any'} className="flex items-center gap-2 py-1 text-[13px]">
                  <input type="radio" checked={type === t} onChange={() => setType(t)} /> {t || 'Any type'}
                </label>
              ))}
              <Button size="sm" className="mt-2" onClick={() => setShowMore(false)}>
                Done
              </Button>
            </div>
          )}
        </div>

        <div className="border-t border-line [&>section]:rounded-none [&>section]:border-0">
          <ExcelGrid
            key={`${tab}-${status}-${type}-${from}-${to}-${query}`}
            title="Applications"
            rows={rows}
            columns={columns}
            rowId={(a) => a.id}
            rowNumbers={false}
            selectable
            hideToolbar
            pageSize={8}
            noun="applications"
            bulkActions={(ids, clear) => (
              <>
                <button className="font-medium text-emerald-700" onClick={() => { setStatus(ids.filter((i) => ['Under review', 'KYC pending'].includes(getApplication(i)?.status ?? '')), 'Approved'); toast('Selected applications approved'); clear() }}>
                  Approve
                </button>
                <button className="font-medium text-brand-red" onClick={() => { setStatus(ids.filter((i) => ['Under review', 'KYC pending'].includes(getApplication(i)?.status ?? '')), 'Rejected'); toast('Selected applications rejected', 'info'); clear() }}>
                  Reject
                </button>
                <button className="text-muted" onClick={clear}>
                  Clear selection
                </button>
              </>
            )}
            emptyState="No applications match these filters."
          />
        </div>
      </section>

      <div className="mt-4 flex flex-wrap justify-between gap-2 text-[12px] text-muted">
        <span className="flex items-center gap-2">
          <Clock size={14} /> Review SLA: 48 hours · {overdueReview} applications need your attention
        </span>
        <span>Last updated 06 Oct 2026, 09:14 IST</span>
      </div>

      {wizardOpen && (appId === 'new' || wizardApp) && (
        <ApplicationWizard key={appId} app={wizardApp} onClose={() => navigate('/onboarding/applications')} />
      )}
    </div>
  )
}
