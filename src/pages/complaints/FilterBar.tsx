import { useState, type ReactNode } from 'react'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { createStore } from '@/lib/store'
import { PROJECT_LIST, STATE_LIST } from '@/data/complaints'
import { Dropdown, MultiCheck } from './shared'
import { RANGE_PRESETS, rangeLabel, type DashFilter } from './filters'

export const DEFAULT_FILTER: DashFilter = { from: '2026-10-01', to: '2026-10-06', projects: [], states: [] }
/** Shared by the Management and Asset dashboards so the filter survives tab switches. */
export const filterStore = createStore<DashFilter>('dexter.complaints.filters.v1', () => DEFAULT_FILTER)

function RangePanel({ value, onApply, close }: { value: DashFilter; onApply: (f: string, t: string) => void; close: () => void }) {
  const [from, setFrom] = useState(value.from)
  const [to, setTo] = useState(value.to)
  const bad = !from || !to || from > to
  return (
    <div className="p-1">
      <div className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">Presets</div>
      {RANGE_PRESETS.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => {
            onApply(p.from, p.to)
            close()
          }}
          className={cn('flex w-full justify-between rounded px-2 py-1.5 text-left text-[13px] hover:bg-surface', value.from === p.from && value.to === p.to && 'bg-primary-soft font-semibold text-primary')}
        >
          <span>{p.label}</span>
          <span className="text-muted">{rangeLabel(p)}</span>
        </button>
      ))}
      <div className="mt-3 mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">Custom range</div>
      <div className="grid grid-cols-2 gap-2">
        <input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-md border border-line px-2 text-[12px]" />
        <input type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-md border border-line px-2 text-[12px]" />
      </div>
      {bad && <p className="mt-1 text-[11px] text-brand-red">Choose a valid range.</p>}
      <Button
        size="sm"
        block
        className="mt-2"
        disabled={bad}
        onClick={() => {
          onApply(from, to)
          close()
        }}
      >
        Apply range
      </Button>
    </div>
  )
}

export function FilterBar({ value, onChange, summary }: { value: DashFilter; onChange: (f: DashFilter) => void; summary?: ReactNode }) {
  const projLabel = value.projects.length === 0 ? 'All projects' : value.projects.length === 1 ? value.projects[0].split(' · ')[0] : `${value.projects.length} projects`
  const stateLabel = value.states.length === 0 ? 'All states' : value.states.length === 1 ? value.states[0] : `${value.states.length} states`
  const dirty = JSON.stringify(value) !== JSON.stringify(DEFAULT_FILTER)
  return (
    <div className="mb-[18px] flex flex-wrap items-center gap-3">
      <Dropdown
        width={300}
        label={
          <>
            <CalendarDays size={15} className="text-primary" /> {rangeLabel(value)}
          </>
        }
      >
        {(close) => <RangePanel value={value} close={close} onApply={(from, to) => onChange({ ...value, from, to })} />}
      </Dropdown>
      <Dropdown label={projLabel}>{() => <MultiCheck allLabel="All projects" options={PROJECT_LIST} value={value.projects} onChange={(projects) => onChange({ ...value, projects })} />}</Dropdown>
      <Dropdown label={stateLabel} width={220}>
        {() => <MultiCheck allLabel="All states" options={STATE_LIST} value={value.states} onChange={(states) => onChange({ ...value, states })} />}
      </Dropdown>
      {dirty && (
        <button type="button" onClick={() => onChange(DEFAULT_FILTER)} className="text-[12px] font-medium text-primary hover:underline">
          Reset filters
        </button>
      )}
      {summary && <span className="text-[11px] text-muted">{summary}</span>}
    </div>
  )
}
