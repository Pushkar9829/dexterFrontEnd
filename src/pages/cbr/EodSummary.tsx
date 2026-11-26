// CBR EOD Summary (Figma 209:12015) — upload tracker per ATM-day + last counter cleared.
// Now reads the REAL records of the new flow: an ATM-day counts as "Uploaded" once a CBR (CBR Master) or a Cash
// Loading entry (Cash Loading Master) for that ATM and date has been submitted with its supporting document.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, FilePlus2, Pencil, Printer, RotateCcw } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { resolveSite, SiteRef } from '@/lib/siteRef'
import { useReportMode } from '@/hooks/useReportMode'
import { dmy } from '@/data/cbrSites'
import { cbrMaster, counterStore, recordCounterClear, type CashKind, type CashRecord, type CounterClear } from '@/data/cbr'
import { clMaster } from '@/data/cashLoadingRegisterStore'
import { toastError } from '@/data/opsApi'
import { rowMark, useRowNav } from '../finance/shared'
import { StatusBadge } from './CashRecordUi'
import { formPathOf, isUploaded, isoAddDays } from './cashRows'

const PRINT_CSS = `
@media print {
  aside, body header.sticky, .no-print { display: none !important; }
  main { padding: 0 !important; }
  body { background: #fff !important; }
  @page { size: A4 portrait; margin: 10mm; }
}`

type UploadRow = { id: string; kind: CashKind; atmId: string; siteId: string; date: string; uploaded: boolean; rec?: CashRecord }
type CounterRow = CounterClear & { siteId: string }

const DAYS = 7
const nowLocal = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const fmtDT = (iso?: string) => (iso ? `${dmy(iso.slice(0, 10))} ${iso.slice(11, 16)}` : '')
const recPath = (id: string, isRep?: boolean) => `/cbr/consolidated/daily/${id}${isRep ? '?source=report' : ''}`
/** upload ids contain "|" which is not usable in a class name marker */
const markId = (r: UploadRow) => `${r.siteId}~${r.date}`

export default function EodSummary() {
  const { isReport } = useReportMode()
  const cbr = cbrMaster.store.use()
  const cl = clMaster.store.use()
  const counters = counterStore.use()
  const [editing, setEditing] = useState(false)
  const [clearing, setClearing] = useState<{ atmId: string; at: string } | null>(null)

  // ATM-days: every site with a record in either master × the last 7 days up to the latest record date
  const { all, endDate, sites } = useMemo(() => {
    const recs = [...cbr, ...cl]
    const end = recs.reduce((m, r) => (r.date > m ? r.date : m), '') || new Date().toISOString().slice(0, 10)
    const dates = Array.from({ length: DAYS }, (_, i) => isoAddDays(end, -i))
    const siteMap = new Map<string, { siteId: string; atmId: string; kind: CashKind }>()
    recs.forEach((r) => {
      if (!siteMap.has(r.siteId)) siteMap.set(r.siteId, { siteId: r.siteId, atmId: r.atmId, kind: r.kind })
    })
    const best = (list: CashRecord[]) => list.find((r) => isUploaded(r)) ?? list.find((r) => r.status !== 'Rejected') ?? list[0]
    const rows: UploadRow[] = dates.flatMap((d) =>
      [...siteMap.values()].map((s) => {
        const rec = best(recs.filter((r) => r.siteId === s.siteId && r.date === d))
        return { id: `${s.atmId}|${d}`, kind: s.kind, atmId: s.atmId, siteId: s.siteId, date: d, uploaded: !!rec && isUploaded(rec), rec }
      }),
    )
    return { all: rows, endDate: end, sites: [...siteMap.values()] }
  }, [cbr, cl])
  const notCount = all.filter((r) => !r.uploaded).length
  const onRow = useRowNav((id) => {
    const r = all.find((x) => markId(x) === id)
    return r?.rec ? recPath(r.rec.id, isReport) : `/cbr/consolidated?kind=${r?.kind === 'Cash Loading' ? 'cl' : 'cbr'}&site=${r?.siteId ?? ''}`
  })

  const counterRows: CounterRow[] = sites.map((s) => {
    const c = counters.find((x) => x.atmId === s.atmId)
    const site = resolveSite(s.siteId)
    return { siteId: s.siteId, atmId: s.atmId, eodAt: c?.eodAt ?? `${endDate}T21:30`, make: c?.make ?? site?.machineType ?? '—', lastClear: c?.lastClear ?? '', by: c?.by }
  })

  const upCols: GridColumn<UploadRow>[] = [
    {
      key: 'atmId', header: 'ATM ID', label: 'ATM ID', width: 210, filterable: true,
      render: (r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <SiteRef id={r.atmId} />
        </span>
      ),
    },
    { key: 'kind', header: 'Register', label: 'Register', width: 130, filterable: true, value: (r) => (r.kind === 'CBR' ? 'CBR' : 'Cash Loading') },
    { key: 'date', header: 'CBR Date', label: 'CBR Date', width: 130, filterable: true, align: 'right', value: (r) => dmy(r.date) },
    {
      key: 'uploaded', header: 'CBR Uploaded', label: 'CBR Uploaded', width: 150, filterable: true, align: 'right', value: (r) => (r.uploaded ? 'Uploaded' : 'Not uploaded'),
      render: (r) => (r.uploaded ? 'Uploaded' : <span className="text-brand-red">Not uploaded</span>),
    },
    {
      key: 'status', header: 'Record status', label: 'Record status', width: 230, filterable: true, value: (r) => r.rec?.status ?? '—',
      render: (r) => (r.rec ? <StatusBadge status={r.rec.status} locked={r.rec.locked} /> : <span className="text-muted">No record</span>),
    },
    ...(editing
      ? ([
        {
          key: 'action', header: 'Action', label: 'Action', width: 200, value: () => '',
          render: (r) =>
            r.rec ? (
              <Link to={recPath(r.rec.id)} className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
                <ExternalLink size={13} /> Open {r.rec.id}
              </Link>
            ) : (
              <Link to={formPathOf(r.kind)} className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
                <FilePlus2 size={13} /> Create {r.kind === 'CBR' ? 'CBR' : 'cash loading'}
              </Link>
            ),
        },
      ] as GridColumn<UploadRow>[])
      : []),
  ]

  const ctrCols: GridColumn<CounterRow>[] = [
    { key: 'atmId', header: 'ATM ID', width: 210, render: (c) => <SiteRef id={c.atmId} /> },
    { key: 'eodAt', header: 'EOD Date & Time', width: 170, align: 'right', value: (c) => fmtDT(c.eodAt) },
    { key: 'make', header: 'Make', width: 150, align: 'right' },
    {
      key: 'lastClear', header: 'Last Clear Date Time', width: 200, align: 'right', value: (c) => c.lastClear,
      render: (c) => {
        if (!c.lastClear) return <span className="text-amber-700">Not recorded</span>
        const days = Math.round((Date.parse(`${endDate}T23:59`) - Date.parse(c.lastClear)) / 86400000)
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
      ] as GridColumn<CounterRow>[])
      : []),
  ]

  const saveClear = () => {
    if (!clearing) return
    if (!clearing.atmId || !clearing.at) return toast('Select an ATM and the clear date & time', 'info')
    if (Date.parse(clearing.at) > Date.now()) return toast('Clear date & time cannot be in the future', 'info')
    const row = counterRows.find((c) => c.atmId === clearing.atmId)
    const atmId = clearing.atmId
    recordCounterClear(atmId, clearing.at, { eodAt: row?.eodAt ?? `${endDate}T21:30`, make: row?.make ?? '—' })
      .then(() => {
        toast(`Counter clear recorded for ${atmId}`)
        setClearing(null)
      })
      .catch((e) => toastError(e, 'Counter clear not recorded'))
  }

  return (
    <div>
      <style>{PRINT_CSS}</style>
      <div className="no-print">
        <PageHeader
          title="CBR"
          sub="EOD upload status per ATM from the CBR Master and the Cash Loading Master, plus the last counter clear."
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
                {!isReport && (
                  <Button icon={<Pencil size={16} />} onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                )}
              </>
            )
          }
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight">MONEY SPOT ATM DAILY CBR</h2>
            <p className="mt-0.5 text-[12px] text-muted">
              Daily detail report · upload status per ATM from submitted CBR / Cash Loading records · Last {DAYS} days to {dmy(endDate)}
            </p>
          </div>
          <span className={cn('rounded-md px-2.5 py-1 text-[11px] font-semibold', editing ? 'bg-amber-50 text-amber-700' : 'bg-primary-soft text-primary')}>
            {editing ? 'Editing · open / create records and counter clears' : isReport ? 'View-Only Report Mode' : 'Live from the masters'}
          </span>
        </div>

        <div onClick={editing ? undefined : onRow} className="border-t border-line [&>section]:rounded-none [&>section]:border-0">
          <ExcelGrid
            title="CBR EOD Summary"
            countLabel={notCount ? `${notCount} awaiting upload` : 'All uploaded'}
            rows={all}
            columns={upCols}
            rowId={(r) => r.id}
            rowNumbers={false}
            searchPlaceholder="Search ATM ID"
            noun="ATM-days"
            exportName="cbr-eod-summary"
            pageSize={12}
            rowClassName={(r) => (editing ? undefined : rowMark(markId(r)))}
            emptyState="No CBR / Cash Loading records yet."
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-primary-soft/60 px-4 py-3.5 text-[11px]">
          <span className="text-[12px] font-semibold text-ink">CBR LAST COUNTER CLEARED</span>
          <span className="text-muted">Same ATMs · {counterRows.length} ATMs · Flagged when not cleared for over 7 days</span>
        </div>
        <div className="[&>section]:rounded-none [&>section]:border-0 [&_thead_th:not(:first-child)>div>span:first-child]:ml-auto">
          <ExcelGrid title="CBR LAST COUNTER CLEARED" rows={counterRows} columns={ctrCols} rowId={(c) => c.atmId} rowNumbers={false} hideToolbar pageSize={12} noun="ATMs" exportName="cbr-last-counter-cleared" />
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
            <SelectField label="ATM ID" required options={counterRows.map((c) => c.atmId)} value={clearing.atmId} onChange={(e) => setClearing({ ...clearing, atmId: e.target.value })} placeholder="Select ATM" />
            <TextField label="Clear date & time" required type="datetime-local" value={clearing.at} onChange={(e) => setClearing({ ...clearing, at: e.target.value })} />
            {clearing.atmId && (
              <p className="text-[12px] text-muted">
                Previous clear: {fmtDT(counterRows.find((c) => c.atmId === clearing.atmId)?.lastClear) || '—'} · Make {counterRows.find((c) => c.atmId === clearing.atmId)?.make}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
