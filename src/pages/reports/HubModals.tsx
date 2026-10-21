import { useState } from 'react'
import { BookmarkCheck, CalendarClock, Pause, Play, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SelectField, TextField } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { CATEGORIES, DATE_RANGES, REPORTS, getReport, nextRun, savedViewStore, scheduleStore, type SavedView, type Schedule } from '@/data/reportsHub'

const fmtDate = (v: string) => new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
const reportName = (id: string) => getReport(id)?.name ?? id

function ReportSelect({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div>
      <label htmlFor="sch-report" className="mb-1.5 block text-[12px] font-semibold text-ink">
        Report *
      </label>
      <select
        id="sch-report"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 w-full rounded-md border bg-white px-3 text-[13px] outline-none focus:border-primary ${error ? 'border-brand-red' : 'border-line'}`}
      >
        <option value="">Select a report</option>
        {CATEGORIES.map((c) => (
          <optgroup key={c.id} label={c.name}>
            {REPORTS.filter((r) => r.category === c.id).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {error && <p className="mt-1 text-[11px] text-brand-red">{error}</p>}
    </div>
  )
}

// ── Scheduled exports ─────────────────────────────────────────────────────
export function ScheduledExportsModal({ onClose, defaultReport }: { onClose: () => void; defaultReport: string }) {
  const list = scheduleStore.use()
  const [form, setForm] = useState({ reportId: defaultReport, frequency: 'Weekly' as Schedule['frequency'], time: '09:00', format: '.xlsx' as Schedule['format'], recipients: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const add = () => {
    const e: Record<string, string> = {}
    if (!form.reportId) e.reportId = 'Choose a report'
    if (!form.time) e.time = 'Choose a time'
    const emails = form.recipients.split(/[,;\s]+/).filter(Boolean)
    if (!emails.length) e.recipients = 'Add at least one recipient'
    else if (emails.some((m) => !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m))) e.recipients = 'One or more email addresses are invalid'
    setErrors(e)
    if (Object.keys(e).length) return
    const s: Schedule = { id: `SCH-${Date.now().toString(36)}`, ...form, recipients: emails.join(', '), createdBy: 'Paras Dubey', createdAt: new Date().toISOString().slice(0, 10), active: true }
    scheduleStore.set((l) => [s, ...l])
    setForm((f) => ({ ...f, recipients: '' }))
    toast(`${reportName(s.reportId)} scheduled ${s.frequency.toLowerCase()} at ${s.time}`)
  }

  return (
    <Modal title="Scheduled exports" sub={`${list.length} schedules · exports are emailed and recorded in the audit trail`} onClose={onClose} width={760} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      <div className="space-y-2">
        {list.length === 0 && <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-[13px] text-muted">No scheduled exports yet.</p>}
        {list.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line px-3 py-2.5">
            <CalendarClock size={18} className="shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
                {reportName(s.reportId)} <Badge tone={s.active ? 'green' : 'gray'}>{s.active ? 'Active' : 'Paused'}</Badge>
              </div>
              <div className="truncate text-[12px] text-muted">
                {s.frequency} at {s.time} · {s.format} · {s.recipients}
              </div>
              <div className="text-[11px] text-muted">
                Next run: {nextRun(s)} · created by {s.createdBy}
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              icon={s.active ? <Pause size={13} /> : <Play size={13} />}
              onClick={() => {
                scheduleStore.set((l) => l.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)))
                toast(`${reportName(s.reportId)} schedule ${s.active ? 'paused' : 'resumed'}`, 'info')
              }}
            >
              {s.active ? 'Pause' : 'Resume'}
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={<Trash2 size={13} />}
              onClick={() => {
                scheduleStore.set((l) => l.filter((x) => x.id !== s.id))
                toast('Schedule removed', 'info')
              }}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-line bg-surface/60 p-4">
        <div className="mb-3 text-[13px] font-semibold">Add schedule</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ReportSelect value={form.reportId} onChange={(v) => setForm((f) => ({ ...f, reportId: v }))} error={errors.reportId} />
          <SelectField label="Frequency" required options={['Daily', 'Weekly', 'Monthly']} value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: (e.target.value || 'Weekly') as Schedule['frequency'] }))} />
          <TextField label="Time (IST)" required type="time" value={form.time} error={errors.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
          <SelectField label="Format" required options={['.xlsx', '.csv']} value={form.format} onChange={(e) => setForm((f) => ({ ...f, format: (e.target.value || '.xlsx') as Schedule['format'] }))} />
          <TextField
            className="sm:col-span-2"
            label="Recipients"
            required
            placeholder="finance@dexterindia.in, meera.iyer@dexterindia.in"
            value={form.recipients}
            error={errors.recipients}
            hint="Separate addresses with commas"
            onChange={(e) => setForm((f) => ({ ...f, recipients: e.target.value }))}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Button icon={<CalendarClock size={15} />} onClick={add}>
            Add schedule
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Saved reports ─────────────────────────────────────────────────────────
export type HubView = { reportId: string; category: string; range: string; query: string }

export function SavedReportsModal({ onClose, current, onOpen }: { onClose: () => void; current: HubView; onOpen: (v: SavedView) => void }) {
  const list = savedViewStore.use()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const rangeLabel = (id: string) => DATE_RANGES.find((r) => r.id === id)?.label ?? id
  const catLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.name ?? 'All categories'

  const save = () => {
    const n = name.trim()
    if (!n) return setError('Name this view')
    if (list.some((v) => v.name.toLowerCase() === n.toLowerCase())) return setError('A saved report with this name already exists')
    const v: SavedView = { id: `SV-${Date.now().toString(36)}`, name: n, ...current, savedAt: new Date().toISOString(), by: 'Paras Dubey' }
    savedViewStore.set((l) => [v, ...l])
    setName('')
    setError('')
    toast(`Saved “${n}”`)
  }

  return (
    <Modal title="My saved reports" sub="Saved report views with their category, date range and search" onClose={onClose} width={680} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      <div className="rounded-lg border border-line bg-surface/60 p-4">
        <div className="text-[13px] font-semibold">Save current view</div>
        <p className="mt-0.5 text-[12px] text-muted">
          {reportName(current.reportId)} · {catLabel(current.category)} · {rangeLabel(current.range)}
          {current.query ? ` · search “${current.query}”` : ''}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
          <TextField label="View name" className="flex-1" placeholder="e.g. Pune network — this month" value={name} error={error} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
          <Button className="sm:mt-6" icon={<BookmarkCheck size={15} />} onClick={save}>
            Save current view
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {list.length === 0 && <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-[13px] text-muted">No saved reports yet.</p>}
        {list.map((v) => (
          <div key={v.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line px-3 py-2.5">
            <BookmarkCheck size={18} className="shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold">{v.name}</div>
              <div className="text-[12px] text-muted">
                {reportName(v.reportId)} · {rangeLabel(v.range)} · saved {fmtDate(v.savedAt)}
              </div>
            </div>
            <Button size="sm" onClick={() => onOpen(v)}>
              Open
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={<Trash2 size={13} />}
              onClick={() => {
                savedViewStore.set((l) => l.filter((x) => x.id !== v.id))
                toast('Saved report removed', 'info')
              }}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    </Modal>
  )
}
