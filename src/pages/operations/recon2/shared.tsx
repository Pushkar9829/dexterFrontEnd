import { useRef, type ReactNode } from 'react'
import { Clock, FileText, Paperclip, UserCog } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { AuditTrail } from '@/data/workflow'
import { PERSONAS, actAs, useOpsUser } from './opsAccess'
import { fmtDt, fmtLeft, type PickedFile } from './util'
import { apiEnabled, type LoadState } from '@/data/opsApi'

/** API mode: loading / error strip for a page backed by a loader (renders nothing in mock mode or when loaded). */
export function LoadBanner({ state, onRetry }: { state: LoadState; onRetry?: () => void }) {
  if (!apiEnabled || (!state.loading && !state.error)) return null
  return (
    <div className={cn('mb-3 flex items-center gap-2 rounded-md px-3 py-2 text-[12px]', state.error ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700')}>
      {state.error ? <>Could not load from the server: {state.error}{onRetry && <button type="button" onClick={onRetry} className="ml-auto font-semibold underline">Retry</button>}</> : 'Loading from the server…'}
    </div>
  )
}

/** Live 24 h countdown chip; red when overdue, amber under 4 h. */
export function Countdown({ dueAt, now, stoppedAt, className }: { dueAt: string; now: number; stoppedAt?: string; className?: string }) {
  const due = new Date(dueAt).getTime()
  if (stoppedAt) {
    const late = new Date(stoppedAt).getTime() > due
    return <span className={cn('inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold', late ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700', className)}><Clock size={12} />{late ? 'Submitted late' : 'Within 24 h'}</span>
  }
  const left = due - now
  const tone = left < 0 ? 'bg-red-600 text-white' : left < 4 * 3600_000 ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'
  return (
    <span className={cn('inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold tabular-nums', tone, className)}>
      <Clock size={12} />
      {fmtLeft(left)}
    </span>
  )
}

/** Demo persona switcher — lets one browser play maker, checker and approver (Operations §1.2 / §17). */
export function ActingAs({ hint }: { hint?: string }) {
  const u = useOpsUser()
  if (apiEnabled)
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-line bg-surface/60 px-3 py-2 text-[12px]">
        <UserCog size={15} className="text-primary" />
        <span className="text-muted">Signed in as</span> <b className="text-ink">{u.name}</b>
        <span className="text-muted">
          Role <b className="text-ink">{u.role}</b>
          {u.designation && u.designation !== u.role && <> · {u.designation}</>}
        </span>
        {hint && <span className="ml-auto text-[11px] text-muted">Maker-checker is enforced by the server</span>}
      </div>
    )
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-line bg-surface/60 px-3 py-2 text-[12px]">
      <UserCog size={15} className="text-primary" />
      <span className="text-muted">Acting as</span>
      <select
        aria-label="Acting as"
        value={PERSONAS.some((p) => p.name === u.name) ? u.name : ''}
        onChange={(e) => {
          const p = PERSONAS.find((x) => x.name === e.target.value)
          if (p) actAs(p)
        }}
        className="h-7 rounded-md border border-line bg-white px-2 text-[12px]"
      >
        {!PERSONAS.some((p) => p.name === u.name) && <option value="">{u.name}</option>}
        {PERSONAS.map((p) => (
          <option key={p.empId} value={p.name}>
            {p.name} — {p.designation}
          </option>
        ))}
      </select>
      <span className="text-muted">
        Role <b className="text-ink">{u.role}</b>
        {u.designation && <> · {u.designation}</>}
      </span>
      {hint && <span className="ml-auto text-[11px] text-muted">{hint}</span>}
    </div>
  )
}

export type HistoryItem = { at: string; by: string; text: string }
export function Timeline({ items, empty = 'No history yet.' }: { items: HistoryItem[]; empty?: string }) {
  if (!items.length) return <p className="text-[12px] text-muted">{empty}</p>
  return (
    <ol className="relative space-y-3 border-l border-line pl-4">
      {items.map((h, i) => (
        <li key={`${h.at}-${i}`} className="relative">
          <span className="absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-white bg-primary" />
          <div className="text-[12px] text-ink">{h.text}</div>
          <div className="text-[11px] text-muted">
            {fmtDt(h.at)} · {h.by}
          </div>
        </li>
      ))}
    </ol>
  )
}

/** Operations §18 common audit fields. */
export function AuditPanel({ trail }: { trail: AuditTrail }) {
  const row = (k: string, v?: string, at?: string) => (
    <div key={k} className="flex justify-between gap-3 border-b border-line/60 py-1.5 text-[12px] last:border-0">
      <span className="text-muted">{k}</span>
      <span className="text-right text-ink">{v ? `${v}${at ? ` · ${fmtDt(at)}` : ''}` : '—'}</span>
    </div>
  )
  return (
    <div className="space-y-3">
      <div>
        {row('Created', trail.createdBy, trail.createdAt)}
        {row('Submitted', trail.submittedBy, trail.submittedAt)}
        {row('Verified', trail.verifiedBy, trail.verifiedAt)}
        {row('Approved', trail.approvedBy, trail.approvedAt)}
        {row('Returned / Rejected', trail.returnedBy ? `${trail.returnedBy} — ${trail.returnReason ?? ''}` : undefined)}
      </div>
      {trail.modifications.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] font-semibold text-ink">Modifications (old → new, reason)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead className="text-left text-muted">
                <tr>
                  <th className="py-1 pr-2 font-medium">When / by</th>
                  <th className="py-1 pr-2 font-medium">Field</th>
                  <th className="py-1 pr-2 font-medium">Old</th>
                  <th className="py-1 pr-2 font-medium">New</th>
                  <th className="py-1 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {trail.modifications.map((m, i) => (
                  <tr key={`${m.at}-${m.field}-${i}`} className="border-t border-line/60 align-top">
                    <td className="py-1 pr-2 whitespace-nowrap">{fmtDt(m.at)} · {m.by}</td>
                    <td className="py-1 pr-2">{m.field}</td>
                    <td className="py-1 pr-2 text-red-700 line-through">{m.oldValue || '—'}</td>
                    <td className="py-1 pr-2 text-emerald-700">{m.newValue || '—'}</td>
                    <td className="py-1">{m.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {trail.documents.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] font-semibold text-ink">Document upload / replacement history</div>
          <ul className="space-y-1 text-[11.5px]">
            {trail.documents.map((d, i) => (
              <li key={`${d.at}-${d.name}-${i}`} className="flex items-center gap-1.5">
                <Paperclip size={12} className="text-muted" />
                <span className="font-medium">{d.action}</span> {d.name} <span className="text-muted">· {fmtDt(d.at)} · {d.by}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Small "choose file" button that keeps only name / size (no backend yet). */
export function FilePick({ label, onPick, accept, disabled, multiple }: { label: string; onPick: (f: PickedFile[]) => void; accept?: string; disabled?: boolean; multiple?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => ref.current?.click()}
        className="inline-flex h-[30px] items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[11px] font-semibold text-ink hover:bg-surface disabled:cursor-not-allowed disabled:text-muted"
      >
        <Paperclip size={13} />
        {label}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).map((f) => ({ name: f.name, size: f.size, file: f }))
          e.target.value = ''
          if (files.length) onPick(files)
        }}
      />
    </>
  )
}

export function FileChip({ name, sub }: { name: string; sub?: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-[11.5px]">
      <FileText size={13} className="shrink-0 text-primary" />
      <span className="truncate">{name}</span>
      {sub && <span className="shrink-0 text-muted">· {sub}</span>}
    </span>
  )
}

export function Info({ k, children, className }: { k: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-[11px] text-muted">{k}</div>
      <div className="mt-0.5 text-[12.5px] break-words text-ink">{children || '—'}</div>
    </div>
  )
}

/** Horizontal stage chart (counts per stage). */
export function StageChart<T extends string>({ stages, counts, active, onPick, colors }: { stages: readonly T[]; counts: Record<T, number>; active?: T | ''; onPick?: (s: T | '') => void; colors?: Partial<Record<T, string>> }) {
  const max = Math.max(1, ...stages.map((s) => counts[s] ?? 0))
  return (
    <div className="space-y-2">
      {stages.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick?.(active === s ? '' : s)}
          className={cn('grid w-full grid-cols-[130px_1fr_36px] items-center gap-2 rounded-md px-1 py-0.5 text-left text-[12px] hover:bg-surface', active === s && 'bg-primary-soft')}
        >
          <span className="truncate text-ink-2">{s}</span>
          <span className="h-3 overflow-hidden rounded bg-slate-100">
            <span className="block h-full rounded" style={{ width: `${((counts[s] ?? 0) / max) * 100}%`, background: colors?.[s] ?? '#1e3f95' }} />
          </span>
          <span className="text-right font-semibold tabular-nums text-ink">{counts[s] ?? 0}</span>
        </button>
      ))}
    </div>
  )
}

/** Mandatory-reason prompt used for every modification / return / rejection. */
export function ReasonBox({ value, onChange, placeholder = 'Reason (mandatory)' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-md border border-line px-2.5 py-1.5 text-[12px] outline-none focus:border-primary" />
}
