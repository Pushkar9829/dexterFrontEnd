import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCheck, Pencil, Printer, RotateCcw, Upload } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { SITES, dmy } from '@/data/cbrSites'
import { CBR_END, EOD_DATES, counterStore, uploadKey, uploadStore, type CounterClear } from '@/data/cbr'
import { rowMark, useRowNav } from '../finance/shared'

const PRINT_CSS = `
@media print {
  aside, body header.sticky, .no-print { display: none !important; }
  main { padding: 0 !important; }
  body { background: #fff !important; }
  @page { size: A4 portrait; margin: 10mm; }
}`

type UploadRow = { id: string; atmId: string; siteId: string; date: string; uploaded: boolean; fileName?: string; at?: string; by?: string }

const nowLocal = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const fmtDT = (iso?: string) => (iso ? `${dmy(iso.slice(0, 10))} ${iso.slice(11, 16)}` : '')
/** Daily CBR record id for an ATM-day (see data/cbr.ts: `<siteId>-<yyyymmdd>`). */
const dailyPath = (siteId: string, date: string) => `/cbr/consolidated/daily/${siteId}-${date.replace(/-/g, '')}`
/** upload ids contain "|" which is not usable in a class name marker */
const markId = (r: UploadRow) => `${r.siteId}~${r.date}`

/** Figma 209:12015 — "CBR" page: CBR EOD Summary upload tracker + CBR LAST COUNTER CLEARED. View → Edit → Save. */
export default function EodSummary() {
  const uploads = uploadStore.use()
  const counters = counterStore.use()
  const [editing, setEditing] = useState(false)
  const [clearing, setClearing] = useState<{ atmId: string; at: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingUpload = useRef<string[]>([])
  const onRow = useRowNav((id) => {
    const [siteId, d] = id.split('~')
    return dailyPath(siteId, d)
  })

  const all: UploadRow[] = EOD_DATES.slice()
    .reverse()
    .flatMap((d) =>
      SITES.map((s) => {
        const id = uploadKey(s.atmId, d)
        return { id, atmId: s.atmId, siteId: s.siteId, date: d, ...(uploads[id] ?? { uploaded: false }) }
      }),
    )
  const rows = all
  const notCount = all.filter((r) => !r.uploaded).length

  const mark = (ids: string[], fileName?: string) => {
    const at = new Date().toISOString()
    uploadStore.set((m) => {
      const n = { ...m }
      ids.forEach((id) => {
        const [atm, d] = id.split('|')
        n[id] = { uploaded: true, fileName: fileName ?? `CBR_${atm}_${d.replace(/-/g, '')}.xlsx`, at, by: 'Ananya Sharma' }
      })
      return n
    })
    toast(`${ids.length} CBR${ids.length > 1 ? 's' : ''} marked uploaded`)
  }
  const unmark = (id: string) => {
    uploadStore.set((m) => ({ ...m, [id]: { uploaded: false } }))
    toast('Upload status reset to Not uploaded', 'info')
  }
  const pickFile = (ids: string[]) => {
    pendingUpload.current = ids
    fileRef.current?.click()
  }

  const upCols: GridColumn<UploadRow>[] = [
    // Figma 209:12015: plain three-column table, no header glyphs; date / status filtering lives in the toolbar's Filters panel.
    {
      key: 'atmId', header: 'ATM ID', label: 'ATM ID', width: 160, filterable: true,
      render: (r) =>
        editing ? (
          r.atmId
        ) : (
          <Link to={dailyPath(r.siteId, r.date)} className="hover:text-primary hover:underline" aria-label={`Open CBR ${r.atmId} ${dmy(r.date)}`}>
            {r.atmId}
          </Link>
        ),
    },
    { key: 'date', header: 'CBR Date', label: 'CBR Date', width: 140, filterable: true, align: 'right', value: (r) => dmy(r.date) },
    {
      key: 'uploaded', header: 'CBR Uploaded', label: 'CBR Uploaded', width: 160, filterable: true, align: 'right', value: (r) => (r.uploaded ? 'Uploaded' : 'Not uploaded'),
      render: (r) => (r.uploaded ? 'Uploaded' : <span className="text-brand-red">Not uploaded</span>),
    },
    ...(editing
      ? ([
          { key: 'fileName', header: 'File', width: 240, render: (r) => (r.fileName ? <span className="text-ink-2">{r.fileName}</span> : <span className="text-muted">—</span>) },
          {
            key: 'action', header: 'Action', label: 'Action', width: 220, value: () => '',
            render: (r) =>
              r.uploaded ? (
                <button onClick={() => unmark(r.id)} className="text-[12px] text-muted hover:text-brand-red">
                  Reset
                </button>
              ) : (
                <span className="flex gap-3 text-[12px] font-semibold text-primary">
                  <button onClick={() => pickFile([r.id])} className="flex items-center gap-1 hover:underline">
                    <Upload size={13} /> Upload file
                  </button>
                  <button onClick={() => mark([r.id])} className="flex items-center gap-1 hover:underline">
                    <CheckCheck size={13} /> Mark uploaded
                  </button>
                </span>
              ),
          },
        ] as GridColumn<UploadRow>[])
      : []),

  ]

  const ctrCols: GridColumn<CounterClear>[] = [
    { key: 'atmId', header: 'ATM ID', width: 160 },
    { key: 'eodAt', header: 'EOD Date & Time', width: 170, align: 'right', value: (c) => fmtDT(c.eodAt) },
    { key: 'make', header: 'Make', width: 150, align: 'right' },
    {
      key: 'lastClear', header: 'Last Clear Date Time', width: 200, align: 'right', value: (c) => c.lastClear,
      render: (c) => {
        const days = Math.round((Date.parse(`${CBR_END}T23:59`) - Date.parse(c.lastClear)) / 86400000)
        return (
          <span className="flex items-center justify-end gap-2">
            {days > 7 && <span className="text-[10.5px] text-amber-700" title="Not cleared for over 7 days">{days} days ·</span>}
            {fmtDT(c.lastClear)}
          </span>
        )
      },
    },
    ...(editing
      ? ([
          { key: 'by', header: 'Recorded by', width: 150 },
          {
            key: 'action', header: 'Action', label: 'Action', width: 190, value: () => '',
            render: (c) => (
              <button onClick={() => setClearing({ atmId: c.atmId, at: nowLocal() })} className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
                <RotateCcw size={13} /> Record counter clear
              </button>
            ),
          },
        ] as GridColumn<CounterClear>[])
      : []),
  ]

  const saveClear = () => {
    if (!clearing) return
    if (!clearing.atmId || !clearing.at) return toast('Select an ATM and the clear date & time', 'info')
    if (Date.parse(clearing.at) > Date.now()) return toast('Clear date & time cannot be in the future', 'info')
    counterStore.set((cs) => cs.map((c) => (c.atmId === clearing.atmId ? { ...c, lastClear: clearing.at, by: 'Ananya Sharma' } : c)))
    toast(`Counter clear recorded for ${clearing.atmId}`)
    setClearing(null)
  }

  return (
    <div>
      <style>{PRINT_CSS}</style>
      <div className="no-print">
        <PageHeader
          title="CBR"
          sub="Denomination-wise cash movements, balances and switch counter for the selected record."
          actions={
            editing ? (
              <>
                <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={() => setClearing({ atmId: '', at: nowLocal() })}>
                  Record counter clear
                </Button>
                <Button
                  onClick={() => {
                    setEditing(false)
                    toast('CBR EOD Summary saved')
                  }}
                >
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" icon={<Printer size={16} />} onClick={() => window.print()}>
                  Print report
                </Button>
                <Button icon={<Pencil size={16} />} onClick={() => setEditing(true)}>
                  Edit
                </Button>
              </>
            )
          }
        />
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) mark(pendingUpload.current, f.name)
          e.target.value = ''
        }}
      />

      <section className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight">MONEY SPOT ATM DAILY CBR</h2>
            <p className="mt-0.5 text-[12px] text-muted">Daily detail report · CBR upload status per ATM and last counter clear · Last 7 days to {dmy(CBR_END)}</p>
          </div>
          <span className={cn('rounded-md px-2.5 py-1 text-[11px] font-semibold', editing ? 'bg-amber-50 text-amber-700' : 'bg-primary-soft text-primary')}>
            {editing ? 'Editing · uploads and counter clears' : 'Source values preserved'}
          </span>
        </div>

        <div onClick={editing ? undefined : onRow} className="border-t border-line [&>section]:rounded-none [&>section]:border-0">
          <ExcelGrid
            title="CBR EOD Summary"
            countLabel={notCount ? `${notCount} awaiting upload` : 'All uploaded'}
            rows={rows}
            columns={upCols}
            rowId={(r) => r.id}
            rowNumbers={false}
            selectable={editing}
            searchPlaceholder="Search ATM ID"
            noun="ATM-days"
            exportName="cbr-eod-summary"
            pageSize={12}
            rowClassName={(r) => (editing ? undefined : rowMark(markId(r)))}
            bulkActions={(ids, clear) => {
              const open = ids.filter((id) => !uploads[id]?.uploaded)
              return (
                <span className="flex gap-3">
                  <button className="font-semibold text-primary disabled:text-muted" disabled={!open.length} onClick={() => { mark(open); clear() }}>
                    Mark {open.length} uploaded
                  </button>
                  <button className="font-semibold text-primary disabled:text-muted" disabled={!open.length} onClick={() => { pickFile(open); clear() }}>
                    Upload one file for {open.length}
                  </button>
                </span>
              )
            }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-primary-soft/60 px-4 py-3.5 text-[11px]">
          <span className="text-[12px] font-semibold text-ink">CBR LAST COUNTER CLEARED</span>
          <span className="text-muted">Same ATMs · {counters.length} ATMs · Flagged when not cleared for over 7 days</span>
        </div>
        <div className="[&>section]:rounded-none [&>section]:border-0">
          <ExcelGrid title="CBR LAST COUNTER CLEARED" rows={counters} columns={ctrCols} rowId={(c) => c.atmId} rowNumbers={false} hideToolbar pageSize={12} noun="ATMs" exportName="cbr-last-counter-cleared" />
        </div>
      </section>

      {clearing && (
        <Modal
          title="Record counter clear"
          sub="Log when the ATM's cash counters were cleared after EOD."
          onClose={() => setClearing(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setClearing(null)}>
                Cancel
              </Button>
              <Button onClick={saveClear}>Record clear</Button>
            </>
          }
        >
          <div className="grid gap-4">
            <SelectField label="ATM ID" required options={counters.map((c) => c.atmId)} value={clearing.atmId} onChange={(e) => setClearing({ ...clearing, atmId: e.target.value })} placeholder="Select ATM" />
            <TextField label="Clear date & time" required type="datetime-local" value={clearing.at} onChange={(e) => setClearing({ ...clearing, at: e.target.value })} />
            {clearing.atmId && (
              <p className="text-[12px] text-muted">
                Previous clear: {fmtDT(counters.find((c) => c.atmId === clearing.atmId)?.lastClear)} · Make {counters.find((c) => c.atmId === clearing.atmId)?.make}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
