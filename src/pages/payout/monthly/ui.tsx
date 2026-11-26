// Shared visual pieces for the Monthly Payout workspace (look follows the Dexter payout designs).
import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FileCheck2, FileText, PencilLine, RefreshCw, UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { SelectField, TextField } from '@/components/ui/Form'
import { Badge } from '@/components/ui/Badge'
import { FY_OPTIONS, VERTICALS, useBusiness, type ReconStatus, type Vertical } from '@/data/payout'
import { BENEFICIARIES, MODE_TYPE, RECON_TONE, VERTICAL_LABEL, amt, fyMonths, monthLabel, type Mode } from './lib'

export const thCls = 'border-r border-white/15 px-3 py-2.5 whitespace-nowrap font-semibold'
export const tdCls = 'border-r border-slate-100 px-3 py-2'
export const theadRow = 'bg-[#14213e] text-center text-[11px] text-white'
export const tbodyRow = 'border-b border-slate-100 text-center text-[11.5px] text-slate-700 transition-colors hover:bg-blue-50/30'

/** Light-blue section header bar with a square icon, as in the payout designs. */
export function SectionBar({ icon, title, right, className }: { icon: ReactNode; title: string; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5 rounded-lg bg-[#EEF4FC] px-3 py-2', className)}>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-white">{icon}</span>
      <h3 className="text-[14px] font-semibold text-primary">{title}</h3>
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  )
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('space-y-3 rounded-xl border border-line bg-white p-3', className)}>{children}</section>
}

const MODES: { mode: Mode; label: [string, string]; icon: ReactNode }[] = [
  { mode: 'file', label: ['File-Based', 'Payout'], icon: <UploadCloud size={20} /> },
  { mode: 'manual', label: ['Manual', 'Payout'], icon: <PencilLine size={20} /> },
  { mode: 'auto', label: ['Auto Reconciliation', '& Payout'], icon: <RefreshCw size={20} /> },
]
/** The three processing options at the top-right (spec §9 / §19.3). Only the selected form opens. */
export function ModeButtons({ mode }: { mode: Mode }) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Processing option">
      {MODES.map((m) => (
        <Link
          key={m.mode}
          to={`/finance/payouts/monthly?mode=${m.mode}`}
          role="tab"
          aria-selected={mode === m.mode}
          className={cn(
            'flex h-[52px] w-[176px] items-center gap-2.5 rounded-lg border px-3 text-left text-[13px] leading-tight font-semibold transition-colors',
            mode === m.mode ? 'border-[#0066FF] bg-[#0066FF] text-white' : 'border-[#1e3f95]/40 bg-white text-primary hover:border-[#0066FF]',
          )}
        >
          {m.icon}
          <span>
            {m.label[0]}
            <br />
            {m.label[1]}
          </span>
        </Link>
      ))}
    </div>
  )
}

export type Details = { fy: string; month: string; batchName: string; nameTouched: boolean; nameMode?: Mode; vertical: Vertical; siteCategory: string; beneficiary: string }

/** §9.1 Common Monthly Payout Details. */
export function DetailsCard({ mode, details, onChange, name, nameError, nameHint }: { mode: Mode; details: Details; onChange: (p: Partial<Details>) => void; name: string; nameError?: string; nameHint?: string }) {
  const biz = useBusiness()
  const cats = details.vertical === 'Business Model' ? biz.bmCategories.filter((c) => c.status === 'Active').map((c) => c.name) : biz.franchiseCategories.filter((c) => c.status === 'Active').map((c) => c.name)
  const months = fyMonths(details.fy)
  return (
    <Panel>
      <SectionBar icon={<FileText size={15} />} title="Monthly Payout Details" />
      <div className="grid gap-3 px-1 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="Financial Year" required name="mp-fy" value={details.fy} options={FY_OPTIONS} onChange={(e) => onChange({ fy: e.target.value, month: '' })} />
        <div>
          <label htmlFor="mp-month" className="mb-1.5 block text-[11px] font-semibold text-ink">
            Payout Month <span>*</span>
          </label>
          <select id="mp-month" value={details.month} onChange={(e) => onChange({ month: e.target.value })} className="h-9 w-full rounded-md border border-line bg-white px-[11px] text-[12.5px] text-ink outline-none focus:border-primary">
            <option value="">Select</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </div>
        <SelectField label="Payout Type" name="mp-type" value={MODE_TYPE[mode]} options={[MODE_TYPE[mode]]} disabled onChange={() => undefined} hint="Auto-selected from the processing option" />
        <TextField
          label="Payout Batch Name"
          required
          name="mp-batch"
          value={name}
          maxLength={40}
          error={nameError}
          hint={nameHint}
          onChange={(e) => onChange({ batchName: e.target.value.toUpperCase().replace(/\s+/g, '_'), nameTouched: true })}
        />
        <div>
          <label htmlFor="mp-vertical" className="mb-1.5 block text-[11px] font-semibold text-ink">
            Business Vertical <span>*</span>
          </label>
          <select id="mp-vertical" value={details.vertical} onChange={(e) => onChange({ vertical: e.target.value as Vertical, siteCategory: '' })} className="h-9 w-full rounded-md border border-line bg-white px-[11px] text-[12.5px] text-ink outline-none focus:border-primary">
            {VERTICALS.map((v) => (
              <option key={v} value={v}>
                {VERTICAL_LABEL[v]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-muted">{details.vertical === 'Business Model' ? 'Engine: BM P&L (received payout − expenses)' : 'Engine: Franchise plan (calcFranchise)'}</p>
        </div>
        <SelectField label="Site Category" name="mp-cat" value={details.siteCategory} options={cats} placeholder="All categories" onChange={(e) => onChange({ siteCategory: e.target.value })} />
        <SelectField label="Payout Beneficiary" name="mp-ben" value={details.beneficiary} options={BENEFICIARIES} onChange={(e) => onChange({ beneficiary: e.target.value })} />
      </div>
    </Panel>
  )
}

/** Drop zone that hands back the real File (the kit FileDrop keeps only name/size). */
export function DropZone({ file, accept, onFile, onClear, maxMb, hint, disabled }: { file: File | null; accept: string; onFile: (f: File) => void; onClear: () => void; maxMb: number; hint: string; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!over) setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const f = e.dataTransfer.files[0]
        if (f && !disabled) onFile(f)
      }}
      className={cn('rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors', over ? 'border-[#0066FF] bg-blue-50/60' : 'border-[#93b4e8] bg-[#f8fbff]')}
    >
      <UploadCloud size={34} className="mx-auto text-[#0066FF]" />
      <p className="mt-1 text-[13px] font-semibold text-ink">Drag &amp; Drop or Click to Upload Payout File</p>
      <p className="text-[11px] text-muted">
        {hint} (Max {maxMb} MB)
      </p>
      <button type="button" disabled={disabled} onClick={() => ref.current?.click()} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-[#0066FF] bg-white px-4 text-[12px] font-semibold text-[#0066FF] hover:bg-blue-50 disabled:opacity-50">
        Choose File
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) onFile(f)
        }}
      />
      {file && (
        <div className="mx-auto mt-3 flex max-w-md items-center gap-2 rounded-md bg-[#EEF4FC] px-3 py-1.5 text-left">
          <FileCheck2 size={16} className="shrink-0 text-emerald-600" />
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-primary">
            {file.name} ({file.size > 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`})
          </span>
          <button type="button" onClick={onClear} className="text-muted hover:text-brand-red" aria-label="Remove file">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  )
}

export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_10px_1fr] items-center py-1.5 text-[12px]">
      <span className="font-semibold text-ink">{k}</span>
      <span className="text-muted">:</span>
      <span className="min-w-0 truncate text-ink-2">{v}</span>
    </div>
  )
}

export function ReconBadge({ status, resolved }: { status: ReconStatus; resolved?: boolean }) {
  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      <Badge tone={RECON_TONE[status]} dot={false}>
        {status}
      </Badge>
      {resolved && <span className="text-[10px] font-semibold text-emerald-700">Resolved</span>}
    </span>
  )
}

/** Variance cell: red when non-zero, green at zero, dash when not comparable. */
export function Diff({ v }: { v?: number }) {
  if (v === undefined) return <span className="text-muted">—</span>
  return <span className={cn('rounded px-1.5 py-0.5 font-semibold', v === 0 ? 'text-emerald-700' : 'bg-red-50 text-red-600')}>{amt(v)}</span>
}

/** Amber label cell + right-aligned value, as in the Manual Payout design grid. */
export function GridRow({ label, children, required, strong }: { label: string; children: ReactNode; required?: boolean; strong?: boolean }) {
  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] border-b border-white text-[12px]', strong && 'text-[13px] font-bold')}>
      <div className={cn('flex items-center px-3 py-1', strong ? 'bg-[#fcd96b]' : 'bg-[#fdf0cf]')}>
        {label}
        {required && <span className="ml-0.5 text-brand-red">*</span>}
      </div>
      <div className={cn('flex items-center', strong ? 'bg-[#fcd96b]' : 'bg-white')}>{children}</div>
    </div>
  )
}

export const numBox = 'h-7 w-full border border-slate-200 bg-white px-2 text-right text-[12px] tabular-nums outline-none focus:border-primary disabled:bg-slate-50 disabled:text-ink'
