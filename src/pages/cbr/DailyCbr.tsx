import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, CircleCheck, CircleX, Download, Pencil, Printer, Save, Search, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'
import { dmy, getSite, grp } from '@/data/cbrSites'
import { BANDS, DENOS, GROUPS, amountOf, dailyForSite, dailyStore, getDaily, notesOf, reconcile, saveDaily, type DailyCbr, type GroupKey } from '@/data/cbr'
import { Amt, SiteContext } from './shared'

const PRINT_CSS = `
@media print {
  aside, body header.sticky, .no-print { display: none !important; }
  .lg\\:pl-\\[264px\\] { padding-left: 0 !important; }
  main { padding: 0 !important; }
  body { background: #fff !important; }
  .print-sheet { border: 0 !important; }
  .print-sheet table { font-size: 10px; }
  @page { size: A4 landscape; margin: 10mm; }
}`

type MetaKey = 'cra' | 'location' | 'bank' | 'indentNo' | 'eodTime'

function GroupTable({ groups, d, editing, onQty, denoFilter }: { groups: GroupKey[]; d: DailyCbr; editing: boolean; onQty: (g: GroupKey, i: number, v: string) => void; denoFilter: string }) {
  const idxs = DENOS.map((_, i) => i).filter((i) => !denoFilter || String(DENOS[i]).includes(denoFilter))
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line">
            <th className="w-28 border-r border-line px-3 py-3 text-left font-semibold">Denomination</th>
            {groups.map((g) => (
              <th key={g} colSpan={2} className="border-r border-line px-3 py-3 text-center font-semibold last:border-r-0">
                {GROUPS[g]}
              </th>
            ))}
          </tr>
          <tr className="border-b border-line bg-surface text-[12px] text-ink-2">
            <th className="border-r border-line px-3 py-2 text-left font-medium">Deno</th>
            {groups.map((g) => [
              <th key={`${g}q`} className="border-r border-line px-3 py-2 text-right font-medium">Qty</th>,
              <th key={`${g}a`} className="border-r border-line px-3 py-2 text-right font-medium last:border-r-0">Amount</th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {idxs.map((i) => (
            <tr key={DENOS[i]} className="border-b border-line-soft">
              <td className="border-r border-line px-3 py-2.5 font-semibold">{DENOS[i]}</td>
              {groups.map((g) => {
                const q = d.groups[g][i]
                return [
                  <td key={`${g}q`} className={cn('border-r border-line-soft px-3 text-right', editing ? 'bg-blue-50/40 py-1' : 'py-2.5')}>
                    {editing ? (
                      <input
                        aria-label={`${GROUPS[g]} ${DENOS[i]} qty`}
                        inputMode="numeric"
                        value={q == null ? '' : String(q)}
                        placeholder="—"
                        onChange={(e) => onQty(g, i, e.target.value)}
                        className="h-8 w-20 rounded border border-line bg-white px-2 text-right outline-none focus:border-primary"
                      />
                    ) : q == null ? (
                      <span className="text-muted">—</span>
                    ) : (
                      q.toLocaleString('en-IN')
                    )}
                  </td>,
                  <td key={`${g}a`} className="border-r border-line-soft px-3 py-2.5 text-right last:border-r-0">
                    {q == null ? <span className="text-muted">—</span> : <Amt v={q * DENOS[i]} />}
                  </td>,
                ]
              })}
            </tr>
          ))}
          <tr className="bg-primary-soft/60 font-semibold">
            <td className="border-r border-line px-3 py-2.5">Total</td>
            {groups.map((g) => [
              <td key={`${g}q`} className="border-r border-line-soft px-3 py-2.5 text-right">
                <Amt v={notesOf(d.groups[g])} />
              </td>,
              <td key={`${g}a`} className="border-r border-line-soft px-3 py-2.5 text-right last:border-r-0">
                {amountOf(d.groups[g]).toLocaleString('en-IN')}
              </td>,
            ])}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function DailyCbrPage() {
  const { recordId = '' } = useParams()
  dailyStore.use()
  const saved = getDaily(recordId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<DailyCbr | null>(null)
  const [deno, setDeno] = useState('')
  if (!saved) return <Navigate to="/cbr/consolidated" replace />
  const site = getSite(saved.siteId)!
  const d = editing && draft ? draft : saved
  const rec = reconcile(d)
  const days = dailyForSite(site.siteId)
  const pos = days.findIndex((x) => x.id === saved.id)
  const prev = days[pos - 1]
  const next = days[pos + 1]

  const onQty = (g: GroupKey, i: number, v: string) => {
    const clean = v.replace(/\D/g, '')
    setDraft((cur) => {
      const base = cur ?? saved
      const q = [...base.groups[g]]
      q[i] = clean === '' ? null : Number(clean)
      return { ...base, groups: { ...base.groups, [g]: q } }
    })
  }
  const setMeta = (k: MetaKey | 'remarks', v: string) => setDraft((cur) => ({ ...(cur ?? saved), [k]: v }))

  const save = () => {
    if (!draft) return setEditing(false)
    if (draft.eodTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.eodTime)) return toast('EOD Time must be HH:MM (24-hour)', 'info')
    saveDaily(draft)
    setEditing(false)
    setDraft(null)
    const r = reconcile(draft)
    toast(r.diff === 0 ? 'Daily CBR saved · balanced' : `Daily CBR saved · difference ₹ ${grp(r.diff)} flagged`, r.diff === 0 ? 'success' : 'info')
  }

  const exportCsv = () => {
    const keys = Object.keys(GROUPS) as GroupKey[]
    downloadCsv(
      `daily-cbr-${d.atmId}-${d.date}`,
      ['Deno', ...keys.flatMap((k) => [`${GROUPS[k]} Qty`, `${GROUPS[k]} Amount`])],
      [
        ...DENOS.map((dn, i) => [String(dn), ...keys.flatMap((k) => { const q = d.groups[k][i]; return [q == null ? '' : String(q), q == null ? '' : String(q * dn)] })]),
        ['Total', ...keys.flatMap((k) => [String(notesOf(d.groups[k]) ?? ''), String(amountOf(d.groups[k]))])],
      ],
    )
  }

  const meta: { label: string; value: string; key?: MetaKey }[][] = [
    [
      { label: 'Date', value: dmy(d.date) },
      { label: 'CRA', value: d.cra, key: 'cra' },
      { label: 'Location', value: d.location, key: 'location' },
      { label: 'Bank', value: d.bank, key: 'bank' },
    ],
    [
      { label: 'Sr. No', value: d.srNo },
      { label: "ATM's Location", value: d.atmLocation },
      { label: 'ATM ID', value: d.atmId },
      { label: 'Indent /Order Number', value: d.indentNo, key: 'indentNo' },
      { label: 'EOD Time', value: d.eodTime, key: 'eodTime' },
    ],
  ]

  return (
    <div>
      <style>{PRINT_CSS}</style>
      <div className="no-print">
        <Link to={`/cbr/consolidated?site=${site.siteId}`} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
          <ArrowLeft size={15} /> Back to Consolidated Datewise CBR
        </Link>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight">Daily CBR</h1>
            <p className="mt-1 text-[14px] text-muted">Denomination-wise cash movements, balances and switch counter for the selected record.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <Button variant="secondary" onClick={() => { setEditing(false); setDraft(null) }}>
                  Cancel
                </Button>
                <Button variant="bright" icon={<Save size={16} />} onClick={save}>
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" icon={<Printer size={16} />} onClick={() => window.print()}>
                  Print report
                </Button>
                <Button icon={<Pencil size={16} />} onClick={() => { setDraft(saved); setEditing(true) }}>
                  Edit
                </Button>
              </>
            )}
          </div>
        </div>

        <SiteContext
          site={site}
          lead={{ label: 'Selected date record', value: dmy(d.date) }}
          right={
            <div className="flex gap-1">
              <Link to={prev ? `/cbr/consolidated/daily/${prev.id}` : '#'} aria-disabled={!prev} onClick={(e) => (!prev || editing) && e.preventDefault()} className={cn('grid h-8 w-8 place-items-center rounded-md border border-line', (!prev || editing) && 'pointer-events-none opacity-40')} aria-label="Previous day">
                <ChevronLeft size={16} />
              </Link>
              <Link to={next ? `/cbr/consolidated/daily/${next.id}` : '#'} aria-disabled={!next} onClick={(e) => (!next || editing) && e.preventDefault()} className={cn('grid h-8 w-8 place-items-center rounded-md border border-line', (!next || editing) && 'pointer-events-none opacity-40')} aria-label="Next day">
                <ChevronRight size={16} />
              </Link>
            </div>
          }
        />
      </div>

      <div
        className={cn(
          'mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-3 text-[12.5px]',
          rec.diff === 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800',
        )}
      >
        {rec.diff === 0 ? <CircleCheck size={16} /> : <CircleX size={16} />}
        <span className="font-semibold">{rec.diff === 0 ? 'Balanced' : `Difference ₹ ${grp(rec.diff)}`}</span>
        <span className="min-w-0">
          Opening {grp(amountOf(d.groups.opening))} − Dispensed {grp(amountOf(d.groups.dispensed))} − Purge {grp(amountOf(d.groups.purge))} + Replenishment{' '}
          {grp(amountOf(d.groups.replenishment))} + Overage {grp(amountOf(d.groups.overage))} − Shortage {grp(amountOf(d.groups.shortage))} = <b>{grp(rec.expected)}</b> vs Closing{' '}
          <b>{grp(rec.closing)}</b>
        </span>
        {editing && <span className="ml-auto text-[11px] opacity-80">Updates live as you edit</span>}
      </div>

      <section className="print-sheet mt-4 overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight">MONEY SPOT ATM DAILY CBR</h2>
            <p className="mt-0.5 text-[12px] text-muted">
              {site.siteId} · {d.atmId} · {dmy(d.date)}
              {d.updatedBy && ` · Edited by ${d.updatedBy}`}
            </p>
          </div>
          <span className={cn('rounded-md px-2.5 py-1 text-[11px] font-semibold', editing ? 'bg-amber-50 text-amber-700' : 'bg-primary-soft text-primary')}>
            {editing ? 'Editing · Qty cells are editable' : 'Amount = Deno × Qty'}
          </span>
        </div>

        {meta.map((row, ri) => (
          <div key={ri} className={cn('grid grid-cols-2 gap-4 border-t border-line bg-surface/50 px-5 py-3', ri === 0 ? 'md:grid-cols-4' : 'md:grid-cols-5')}>
            {row.map((m) => (
              <div key={m.label} className="min-w-0">
                <div className="text-[11px] text-muted">{m.label}</div>
                {editing && m.key ? (
                  <input
                    aria-label={m.label}
                    value={m.value}
                    placeholder={m.key === 'eodTime' ? 'HH:MM' : ''}
                    onChange={(e) => setMeta(m.key!, e.target.value)}
                    className="mt-1 h-8 w-full rounded border border-line bg-white px-2 text-[13px] outline-none focus:border-primary"
                  />
                ) : (
                  <div className="mt-1 truncate text-[13px] font-medium">{m.value || <span className="text-muted">—</span>}</div>
                )}
              </div>
            ))}
          </div>
        ))}

        <div className="no-print flex flex-wrap items-center gap-3 border-t border-line px-5 py-3">
          <Table2 size={17} className="text-primary" />
          <span className="text-[14px] font-semibold">Daily CBR register</span>
          <span className="text-[12px] text-muted">1 ATM · 5 denominations</span>
          <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-line px-3 text-[13px] text-muted sm:w-[220px]">
            <Search size={15} />
            <input value={deno} onChange={(e) => setDeno(e.target.value.replace(/\D/g, ''))} placeholder="Search denomination" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
          </label>
          <Button variant="secondary" size="sm" className="ml-auto" icon={<Download size={14} />} onClick={exportCsv}>
            Export .csv
          </Button>
        </div>

        {BANDS.slice(0, 2).map((b) => (
          <div key={b.title}>
            <div className="flex flex-wrap justify-between gap-2 border-t border-line bg-primary-soft/60 px-5 py-2 text-[12px]">
              <span className="font-semibold text-primary">{b.title}</span>
              <span className="text-muted">Same ATM · Sr. No. {d.srNo} · Five denominations + Total</span>
            </div>
            <GroupTable groups={b.groups} d={d} editing={editing} onQty={onQty} denoFilter={deno} />
          </div>
        ))}

        <div className="grid border-t border-line lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="border-line lg:border-r">
            <div className="bg-primary-soft/60 px-5 py-2 text-[12px] font-semibold text-primary">Switch counter</div>
            <div className="[&_table]:min-w-0">
              <GroupTable groups={['switch']} d={d} editing={editing} onQty={onQty} denoFilter={deno} />
            </div>
          </div>
          <div>
            <div className="bg-primary-soft/60 px-5 py-2 text-[12px] font-semibold text-primary">Remarks</div>
            <div className="p-5 text-[13px]">
              {editing ? (
                <textarea
                  aria-label="Remarks"
                  rows={4}
                  value={d.remarks}
                  onChange={(e) => setMeta('remarks', e.target.value)}
                  placeholder="Add remarks for this ATM"
                  className="w-full rounded-md border border-line px-3 py-2 outline-none focus:border-primary"
                />
              ) : d.remarks ? (
                <p className="text-ink">{d.remarks}</p>
              ) : (
                <p className="text-muted">— No remarks for ATM Sr. No. {d.srNo}.</p>
              )}
              <div className="mt-5 font-semibold">Reading this report</div>
              <p className="mt-1.5 text-[12px] text-muted">
                Qty and Amount are shown separately for each balance group; Amount = Deno × Qty and the Total row is calculated. “—” denotes a blank cell, not zero. Switch counter
                is the host's expected balance (it does not know about overage / shortage found at EOD count).
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t border-line px-5 py-2.5 text-[12px] text-muted">
          <span>1 ATM group · 5 denominations + Total · All fields shown in three bands</span>
          <span className="text-primary">Totals calculated from denomination quantities</span>
        </div>
      </section>
    </div>
  )
}
