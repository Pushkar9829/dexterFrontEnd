import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Signal, Wifi, BatteryFull } from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { dotDate, grp } from '@/data/cbrSites'
import { MOBILE_FIELDS, mobileComputed, mobileStore, type MobileCbr } from '@/data/cbr'

type EditableKey = Exclude<keyof MobileCbr, 'id' | 'date' | 'fundingType' | 'atmId'>

function Value({ v, tone }: { v: number | null; tone?: string }) {
  if (v == null) return <span className="text-muted">—</span>
  return <span className={cn(v < 0 ? 'text-brand-red' : tone)}>{grp(v)}</span>
}

function AtmCard({ rec }: { rec: MobileCbr }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<MobileCbr>(rec)
  const cur = editing ? draft : rec
  const calc = mobileComputed(cur)
  const fields = MOBILE_FIELDS[cur.fundingType]

  const save = () => {
    mobileStore.set((all) => all.map((m) => (m.id === rec.id ? draft : m)))
    setEditing(false)
    toast(`Daily CBR saved for ${rec.atmId}`)
  }

  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white">
      <header className="flex items-start justify-between gap-3 bg-navy-900 px-4 py-3.5 text-white">
        <div>
          <div className="text-[12px] text-white/80">Date</div>
          <div className="mt-1 text-[11px] text-white/70">{cur.fundingType}</div>
        </div>
        <div className="text-right">
          <div className="text-[17px] font-semibold">{dotDate(cur.date)}</div>
          {!editing && (
            <button onClick={() => { setDraft(rec); setEditing(true) }} className="mt-1 inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[11px] font-semibold hover:bg-white/20">
              <Pencil size={11} /> Edit
            </button>
          )}
        </div>
      </header>
      <div className="flex justify-between bg-surface px-4 py-2 text-[10px] font-medium text-muted">
        <span>
          S.N. <span className="ml-2">Details</span>
        </span>
        <span>Value</span>
      </div>
      <ol>
        {fields.map((f, i) => {
          const computed = f.computed
          const highlight = f.key === 'closingWla' || f.key === 'loadingAmount'
          let value: React.ReactNode
          if (f.key === 'atmId') value = <span className="text-[15px] font-bold text-primary">{cur.atmId}</span>
          else if (f.key === 'closingWla') value = <Value v={calc.closingWla} />
          else if (f.key === 'difference') value = <Value v={calc.difference} />
          else if (editing)
            value = (
              <input
                aria-label={f.label}
                inputMode="numeric"
                value={String(draft[f.key as EditableKey])}
                placeholder="—"
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value.replace(/[^\d]/g, '') }))}
                className="h-8 w-28 rounded-md border border-line bg-white px-2 text-right text-[13px] outline-none focus:border-primary"
              />
            )
          else {
            const raw = cur[f.key as EditableKey]
            value = <Value v={raw === '' ? null : Number(raw)} tone={f.key === 'loadingAmount' ? 'text-primary' : undefined} />
          }
          return (
            <li key={f.key} className={cn('flex items-start gap-3 border-t border-line-soft px-4 py-3', highlight && 'bg-primary-soft/70')}>
              <span className="w-5 shrink-0 pt-0.5 text-[12px] text-muted">{i + 1}</span>
              <span className={cn('min-w-0 flex-1 text-[13px] leading-snug', (highlight || f.key === 'atmId') && 'font-semibold')}>
                {f.label}
                {computed && (
                  <span className="mt-0.5 block text-[10.5px] font-normal text-muted">
                    {f.key === 'closingWla'
                      ? 'Auto · Opening + Fund Given − Withdrawal'
                      : cur.fundingType === 'WLA account'
                        ? 'Auto · Fund Given by HPY − Loading Amount'
                        : `Auto · (1st Lot + 2nd Lot = ${calc.expected == null ? '—' : grp(calc.expected)}) − Loading Amount`}
                  </span>
                )}
              </span>
              <span className="shrink-0 pt-0.5 text-right text-[14px] font-semibold">{value}</span>
            </li>
          )
        })}
      </ol>
      {editing && (
        <div className="flex gap-2 border-t border-line px-4 py-3">
          <button onClick={() => setEditing(false)} className="h-9 flex-1 rounded-lg border border-line text-[13px] font-semibold">
            Cancel
          </button>
          <button onClick={save} className="h-9 flex-1 rounded-lg bg-primary text-[13px] font-semibold text-white">
            Save
          </button>
        </div>
      )}
    </article>
  )
}

export default function MobileCbr() {
  const all = mobileStore.use()
  const dates = [...new Set(all.map((m) => m.date))].sort().reverse()
  const [date, setDate] = useState(dates[0] ?? '')
  const recs = all.filter((m) => m.date === date)

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[412px] overflow-hidden rounded-[28px] border-[6px] border-navy-950 bg-surface shadow-xl">
        <div className="flex items-center justify-between bg-navy-900 px-5 pt-3 pb-1 text-[12px] font-semibold text-white">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <Signal size={13} /> <Wifi size={13} /> <BatteryFull size={15} />
          </span>
        </div>
        <div className="bg-navy-900 px-5 pt-2 pb-4">
          <div className="border-l-[3px] border-brand-red pl-2.5">
            <div className="text-[17px] font-bold text-white">Dexter India</div>
            <div className="text-[9px] tracking-wide text-white/70">OPERATOR CRM</div>
          </div>
        </div>

        <div className="px-4 pt-4 pb-5">
          <Link to="/cbr/consolidated" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-primary">
            <ArrowLeft size={14} /> Consolidated Datewise CBR
          </Link>
          <div className="mt-2 flex items-end justify-between gap-2">
            <h1 className="text-[22px] font-bold tracking-tight">Daily CBR</h1>
            <span className="pb-1 text-[12px] text-muted">
              {recs.length} ATM record{recs.length === 1 ? '' : 's'}
            </span>
          </div>
          <label className="mt-3 flex items-center gap-2 text-[12px] text-muted">
            Date
            <select value={date} onChange={(e) => setDate(e.target.value)} className="h-8 flex-1 rounded-md border border-line bg-white px-2 text-[13px] text-ink">
              {dates.map((d) => (
                <option key={d} value={d}>
                  {dotDate(d)}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4 space-y-4">
            {recs.map((r) => (
              <AtmCard key={r.id} rec={r} />
            ))}
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-muted">
            Blank values are retained as supplied, not zero. Highlighted rows are the closing and loading balances; negative differences are shown in red.
          </p>
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800">
            Assumed formulas — needs client confirmation: Closing Balance in WLA = Opening + Fund Given by HPY − Withdrawal; Loading Amount Difference = expected funding (WLA: Fund Given by HPY ·
            Axis: 1st Lot + 2nd Lot) − Loading Amount.
          </p>
          <div className="mt-3 text-[11px] text-muted">Dexter India · Daily CBR</div>
        </div>
      </div>
    </div>
  )
}
