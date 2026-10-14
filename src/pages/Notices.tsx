import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, CheckCheck, RefreshCw } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { toast } from '@/components/ui/Toast'
import { NOTICES, NOTICE_TYPES, type Notice, type NoticeType } from '@/data/notices'

const TODAY = '2026-10-06'
const istDay = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10)
// the first notice older than today is tagged "Earlier", as in the design
const FIRST_EARLIER = NOTICES.find((n) => istDay(n.at) < TODAY)?.id

function whenLabel(n: Notice) {
  const d = new Date(n.at)
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Asia/Kolkata' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).toLowerCase()
  const top = istDay(n.at) === TODAY ? `Today · ${date}` : n.id === FIRST_EARLIER ? `Earlier · ${date}` : date
  return { top, time }
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-8 rounded-full border px-3 text-[13px] transition-colors',
        active ? 'border-primary bg-primary font-semibold text-white' : 'border-line bg-white text-ink-2 hover:border-primary/40',
      )}
    >
      {children}
    </button>
  )
}

export default function Notices() {
  const [items, setItems] = useState<Notice[]>(NOTICES)
  const [readFilter, setReadFilter] = useState<'all' | 'unread'>('all')
  const [type, setType] = useState<NoticeType | 'any'>('any')

  const unread = items.filter((n) => !n.read).length
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    items.forEach((n) => (c[n.type] = (c[n.type] ?? 0) + 1))
    return c
  }, [items])

  const rows = items.filter((n) => (readFilter === 'all' || !n.read) && (type === 'any' || n.type === type))

  const markRead = (ids: string[]) => setItems((xs) => xs.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)))

  const columns: GridColumn<Notice>[] = [
    {
      key: 'at', header: 'When', label: 'When', width: 130, sortable: true,
      render: (n) => {
        const w = whenLabel(n)
        return (
          <span className="leading-tight text-muted">
            {w.top}
            <br />
            {w.time}
          </span>
        )
      },
    },
    { key: 'type', header: 'Type', width: 120, filterable: true, render: (n) => <span className="text-primary">{n.type}</span> },
    { key: 'title', header: 'Title', width: 320, render: (n) => <span className={n.read ? 'text-ink-2' : 'font-semibold'}>{n.title}</span> },
    { key: 'details', header: 'Details', width: 300, render: (n) => <span className="text-muted">{n.details}</span> },
    {
      key: 'actions', header: 'Actions', label: 'Actions', width: 130, value: () => '',
      render: (n) => (
        <span className="flex items-center gap-3 text-[12px]">
          <Link to={n.link} onClick={() => markRead([n.id])} className="font-semibold text-primary hover:underline">
            Open ›
          </Link>
          {n.read ? (
            <span className="text-primary/70">Read</span>
          ) : (
            <button onClick={() => markRead([n.id])} className="flex items-center gap-1 text-primary hover:underline">
              <Check size={12} /> Mark read
            </button>
          )}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Notices"
        sub="Stay on top of KYC, daily reporting and tasks that need your attention."
        actions={
          <>
            <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => {
              setItems([...items])
              toast(`Notices refreshed · ${items.filter((n) => !n.read).length} unread`, 'info')
            }}>
              Refresh
            </Button>
            <Button icon={<CheckCheck size={16} />} onClick={() => markRead(items.map((n) => n.id))} disabled={unread === 0}>
              Mark all read
            </Button>
          </>
        }
      />

      <div className="mb-5 rounded-xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={readFilter === 'all'} onClick={() => setReadFilter('all')}>
            All <b className="ml-1">{items.length}</b>
          </Chip>
          <Chip active={readFilter === 'unread'} onClick={() => setReadFilter('unread')}>
            Unread <b className="ml-1">{unread}</b>
          </Chip>
          <span className="ml-auto flex items-center gap-2 text-[12px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {unread} unread · {items.length - unread} read
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip active={type === 'any'} onClick={() => setType('any')}>
            Any type
          </Chip>
          {NOTICE_TYPES.map((t) => (
            <Chip key={t} active={type === t} onClick={() => setType(t)}>
              {t} <b className="ml-1">{counts[t] ?? 0}</b>
            </Chip>
          ))}
        </div>
      </div>

      <ExcelGrid
        key={`${readFilter}-${type}`}
        title="All notices"
        countLabel={`${rows.length} notices`}
        rows={rows}
        columns={columns}
        rowId={(n) => n.id}
        searchPlaceholder="Search notices"
        rowNumbers={false}
        selectable
        toolbarButtons={['columns']}
        selectionLabel={(c) => `${c} ${c === 1 ? 'notice' : 'notices'} selected`}
        selectionHint="Select notices to manage read status"
        noun="notices"
        exportName="notices"
        rowClassName={(n) => (n.read ? undefined : 'shadow-[inset_3px_0_0_var(--color-primary)]')}
        bulkActions={(ids, clear) => (
          <>
            <button
              onClick={() => {
                markRead(ids)
                clear()
              }}
              className="flex items-center gap-1 font-medium text-primary"
            >
              <Check size={13} /> Mark selected read
            </button>
            <button onClick={clear} className="text-muted">
              Clear selection
            </button>
          </>
        )}
        footerLeft={(sel) => `${sel.length ? `Selected: ${sel.length} ${sel.length === 1 ? 'notice' : 'notices'} · ` : ''}${unread} unread · ${items.length - unread} read`}
        footerRight="Newest first · All notice types"
      />

      <div className="mt-3 flex flex-wrap justify-between gap-2 text-[12px] text-muted">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Blue-edged rows are unread. Open a notice to view the related record.
        </span>
        <span>All times in IST</span>
      </div>

      <div className="mt-6 flex flex-wrap justify-between gap-2 text-[12px] text-muted">
        <span>India operations · Notices across your workspace</span>
        <span>Last refreshed 06 Oct 2026, 09:14 IST</span>
      </div>
    </div>
  )
}
