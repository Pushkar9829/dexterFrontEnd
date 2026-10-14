import { useRef, useState } from 'react'
import { Eye, FileText, Paperclip, Upload, X } from 'lucide-react'
import { SheetNote } from '@/components/grid/BandedSheet'
import { Button } from '@/components/ui/Button'
import { fmtSize } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import {
  DEPOSIT_MODES, FFM_MONTHS, dmy, ffmStore, inr, monthEnds, monthLabel, overageStore, parseAttachment,
  type Attachment, type Row,
} from '@/data/reportsFinancial'
import type { SheetCol } from './ReportSheet'
import { HeaderSelect } from './Shell'
import { SheetReport } from './SheetReport'

const sum = (rows: Row[], key: string) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0)

// ── FFM EOD ───────────────────────────────────────────────────────────────
function withVariance(key: string, dmsKey: string) {
  return (r: Row) => {
    const v = r[key]
    if (!v) return <span className="text-muted">—</span>
    const diff = Number(v) - Number(r[dmsKey])
    return (
      <span className="inline-flex items-center justify-end gap-2">
        {r[dmsKey] !== '' && r[dmsKey] != null && diff !== 0 && (
          <span title="Physical balance differs from DMS balance" className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
            Variance {diff > 0 ? '+' : '−'}
            {inr(Math.abs(diff))}
          </span>
        )}
        <span className="font-medium">{inr(v)}</span>
      </span>
    )
  }
}

export function FfmEodReport() {
  const [month, setMonth] = useState('2026-08')
  const { opening: o, closing: c } = monthEnds(month)
  const ml = monthLabel(month)
  const money = (key: string, label: string, extra?: Partial<SheetCol>): SheetCol => ({ key, label, kind: 'money', width: 190, ...extra })
  const varianceCount = (rows: Row[]) =>
    rows.filter((r) => (r.openPhys && r.openDms && r.openPhys !== r.openDms) || (r.closePhys && r.closeDms && r.closePhys !== r.closeDms)).length

  return (
    <SheetReport
      store={ffmStore}
      name="FFM EOD"
      sub={`View opening balances, ${monthLabel(month).split(' ')[0]} funding and month-end positions for full funding sites.`}
      chip="Wrapped column view · All fields visible in three bands"
      title="FFM EOD report"
      idPrefix="FFM"
      noun="sites"
      scope={(r) => r.month === month}
      controls={<HeaderSelect label="Month" value={month} onChange={setMonth} options={FFM_MONTHS.map((m) => ({ value: m, label: monthLabel(m) }))} />}
      bands={[
        {
          title: 'Identity & opening position',
          note: `Opening position as on ${o}`,
          cols: [
            { key: 'atmId', label: 'ATM ID', width: 130 },
            { key: 'frName', label: 'FR Name', width: 220 },
            money('openDms', `Machine Balance as per DMS @11:00 PM (${o})`),
            money('openPhys', `Physical Balance as per FR @11:00 PM (${o})`, { width: 230, render: withVariance('openPhys', 'openDms') }),
            money('openOverage', `Actual Overage as on ${o}`, { width: 170 }),
          ],
        },
        {
          title: `Monthly funding ${ml}`,
          note: `Funding during ${ml}`,
          cols: [money('hpyFund', `HPY Given Fund ${ml}`), money('frLoading', `FR Loading Fund ${ml}`), money('apnaDispense', `Apna App Dispence Fund ${ml}`)],
        },
        {
          title: `Closing position ${c}`,
          note: `Month-end position as on ${c}`,
          cols: [
            money('actualMachine', `Actual Machine Balance ${c}`),
            money('closeDms', `Machine Balance as per DMS @11:00 PM (${c})`),
            money('closePhys', `Physical Balance as per FR @11:00 PM (${c})`, { width: 230, render: withVariance('closePhys', 'closeDms') }),
            money('closeOverage', `Actual Overage as on ${c}`, { width: 170 }),
          ],
        },
      ]}
      newRow={() => ({ month, atmId: '', frName: '', openDms: '', openPhys: '', openOverage: '', hpyFund: '', frLoading: '', apnaDispense: '', actualMachine: '', closeDms: '', closePhys: '', closeOverage: '' })}
      meta={(rows) => (
        <>
          <span className="font-semibold text-ink">
            Full Funding Sites - {ml} - EOD Report {c}
          </span>
          <span className="block">
            {rows.length} sites · 13 source columns · HPY given {inr(sum(rows, 'hpyFund')) || '₹ 0'} · {varianceCount(rows)} with DMS / physical variance
          </span>
        </>
      )}
      notes={() => (
        <>
          <SheetNote title="Variance indicator">
            A “Variance” chip appears when the physical balance reported by the FR differs from the DMS machine balance at 11:00 PM (opening {o} or closing {c}). Source values are not recalculated.
          </SheetNote>
          <SheetNote title="Dated headers">Choosing a month regenerates the dated headers: opening position on the previous month end, funding for the month, closing position on the month end. Source spelling “Dispence” is kept.</SheetNote>
        </>
      )}
    />
  )
}

// ── Overage deposit ───────────────────────────────────────────────────────
function AttachCell({ row, editing, onChange, onView }: { row: Row; editing: boolean; onChange: (v: string) => void; onView: (a: Attachment) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const att = parseAttachment(row.attached)
  const take = (f?: File) => {
    if (!f) return
    if (f.size > 5 * 1024 * 1024) return toast('Attachment must be 5 MB or smaller', 'info')
    const base: Attachment = { name: f.name, size: f.size, uploadedAt: new Date().toISOString().slice(0, 10), by: 'Ananya Sharma' }
    if (f.size > 300 * 1024) return onChange(JSON.stringify(base))
    const reader = new FileReader()
    reader.onload = () => onChange(JSON.stringify({ ...base, dataUrl: String(reader.result) }))
    reader.readAsDataURL(f)
  }
  if (editing)
    return (
      <span className="flex items-center gap-2">
        {att && (
          <span className="flex max-w-[150px] items-center gap-1 truncate text-[12px] text-ink-2" title={att.name}>
            <Paperclip size={13} className="shrink-0" /> <span className="truncate">{att.name}</span>
          </span>
        )}
        <button type="button" onClick={() => ref.current?.click()} className="flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-[12px] font-semibold text-primary hover:bg-primary-soft">
          <Upload size={13} /> {att ? 'Replace' : 'Upload'}
        </button>
        {att && (
          <button type="button" onClick={() => onChange('')} aria-label="Remove attachment" className="text-muted hover:text-brand-red">
            <X size={14} />
          </button>
        )}
        <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => take(e.target.files?.[0])} />
      </span>
    )
  if (!att) return <span className="text-muted">Not attached</span>
  return (
    <button type="button" onClick={() => onView(att)} className="flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
      <Eye size={14} /> View
    </button>
  )
}

export function OverageDepositReport() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [viewing, setViewing] = useState<Attachment | null>(null)
  const inRange = (r: Row) => (!from || r.depositDate >= from) && (!to || r.depositDate <= to)

  return (
    <>
      <SheetReport
        store={overageStore}
        name="Overage deposit"
        sub="View overage deposits, payment references and supporting details across franchise sites."
        chip="All 9 fields visible"
        title="Overage deposit report"
        idPrefix="OD"
        noun="deposits"
        searchPlaceholder="Search deposit records"
        scope={inRange}
        controls={
          <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-lg border border-line bg-white px-3 py-1 text-[13px]">
            <span className="text-muted">Deposit date:</span>
            <input type="date" aria-label="Deposit date from" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="bg-transparent font-medium outline-none" />
            <span className="text-muted">–</span>
            <input type="date" aria-label="Deposit date to" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="bg-transparent font-medium outline-none" />
            {(from || to) && (
              <button onClick={() => { setFrom(''); setTo('') }} aria-label="Clear date range" className="text-muted hover:text-ink">
                <X size={14} />
              </button>
            )}
          </div>
        }
        bands={({ editing, change }) => [
          {
            title: 'Deposit details',
            note: editing ? 'Double-click a cell to edit · use Upload for the Attached file' : 'All 9 fields visible',
            cols: [
              { key: 'depositDate', label: 'Deposit Date', kind: 'date', width: 130 },
              { key: 'atmId', label: 'ATM ID', width: 130 },
              { key: 'frName', label: 'FR Name', width: 220 },
              { key: 'amount', label: 'Overage Amount', kind: 'money', width: 150 },
              { key: 'mode', label: 'Mode', kind: 'enum', options: DEPOSIT_MODES, width: 130 },
              { key: 'utr', label: 'UTR / TXN', width: 200 },
              {
                key: 'attached',
                label: 'Attached',
                editable: false,
                width: 210,
                value: (r) => parseAttachment(r.attached)?.name ?? '',
                render: (r) => <AttachCell row={r} editing={editing} onChange={(v) => change(r.id, 'attached', v)} onView={setViewing} />,
              },
              { key: 'email', label: 'Email', kind: 'email', width: 230 },
            ],
          },
        ]}
        filterDefs={[{ key: 'mode', label: 'Modes', options: DEPOSIT_MODES }]}
        newRow={() => ({ depositDate: new Date().toISOString().slice(0, 10), atmId: '', frName: '', amount: '', mode: 'Cash deposit', utr: '', attached: '', email: '' })}
        meta={(rows) =>
          `${rows.length} deposits · 9 source columns · total overage ${inr(sum(rows, 'amount')) || '₹ 0'}${from || to ? ` · ${from ? dmy(from) : '…'} to ${to ? dmy(to) : '…'}` : ' · all dates'}`
        }
        notes={(rows) => (
          <>
            <SheetNote title={`${rows.filter((r) => !r.attached).length} deposits without proof`}>
              Attached holds the deposit slip or payment screenshot (PDF, JPG or PNG up to 5 MB). Upload or replace it in edit mode; View opens it here.
            </SheetNote>
            <SheetNote title="Payment reference">UTR / TXN is the bank UTR for NEFT / IMPS, the UPI reference for UPI and the cash-deposit machine slip number for cash deposits.</SheetNote>
          </>
        )}
      />
      {viewing && (
        <Modal
          title={viewing.name}
          sub={`${viewing.size ? fmtSize(viewing.size) : 'Size unknown'}${viewing.uploadedAt ? ` · uploaded ${dmy(viewing.uploadedAt)}` : ''}${viewing.by ? ` by ${viewing.by}` : ''}`}
          onClose={() => setViewing(null)}
          width={720}
          footer={
            <>
              {viewing.dataUrl && (
                <a href={viewing.dataUrl} download={viewing.name} className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-[13px] font-semibold hover:bg-surface">
                  Download
                </a>
              )}
              <Button onClick={() => setViewing(null)}>Close</Button>
            </>
          }
        >
          {viewing.dataUrl?.startsWith('data:image') ? (
            <img src={viewing.dataUrl} alt={viewing.name} className="mx-auto max-h-[60vh] rounded-lg border border-line" />
          ) : viewing.dataUrl?.startsWith('data:application/pdf') ? (
            <object data={viewing.dataUrl} type="application/pdf" className="h-[60vh] w-full rounded-lg border border-line">
              <p className="p-4 text-[13px] text-muted">PDF preview is not supported in this browser — use Download.</p>
            </object>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-5 text-[13px]">
              <FileText size={28} className="text-primary" />
              <div>
                <div className="font-semibold text-ink">{viewing.name}</div>
                <div className="text-muted">
                  {viewing.dataUrl ? 'This file type cannot be previewed — use Download.' : 'Stored file reference. Files larger than 300 KB and imported records keep metadata only until the document service is connected.'}
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
