import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCheck, ClipboardCheck, RotateCcw, Upload } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { SITES, dmy } from '@/data/cbrSites'
import { CBR_END, EOD_DATES, counterStore, uploadKey, uploadStore, type CounterClear } from '@/data/cbr'
import { Chip } from '../finance/shared'

type UploadRow = { id: string; atmId: string; siteId: string; date: string; uploaded: boolean; fileName?: string; at?: string; by?: string }

const nowLocal = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const fmtDT = (iso?: string) => (iso ? `${dmy(iso.slice(0, 10))} ${iso.slice(11, 16)}` : '')

export default function EodSummary() {
  const uploads = uploadStore.use()
  const counters = counterStore.use()
  const [date, setDate] = useState('')
  const [status, setStatus] = useState<'all' | 'up' | 'not'>('all')
  const [clearing, setClearing] = useState<{ atmId: string; at: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingUpload = useRef<string[]>([])

  const all: UploadRow[] = EOD_DATES.slice()
    .reverse()
    .flatMap((d) =>
      SITES.map((s) => {
        const id = uploadKey(s.atmId, d)
        return { id, atmId: s.atmId, siteId: s.siteId, date: d, ...(uploads[id] ?? { uploaded: false }) }
      }),
    )
  const byDate = all.filter((r) => !date || r.date === date)
  const rows = byDate.filter((r) => status === 'all' || (status === 'up' ? r.uploaded : !r.uploaded))
  const notCount = byDate.filter((r) => !r.uploaded).length

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
    { key: 'atmId', header: 'ATM ID', width: 140, sortable: true, filterable: true, render: (r) => <Link to={`/cbr/consolidated?site=${r.siteId}`} className="font-medium text-primary hover:underline">{r.atmId}</Link> },
    { key: 'date', header: 'CBR Date', width: 120, sortable: true, value: (r) => r.date, render: (r) => dmy(r.date) },
    {
      key: 'uploaded', header: 'CBR Uploaded', width: 150, filterable: true, value: (r) => (r.uploaded ? 'Uploaded' : 'Not uploaded'),
      render: (r) => <Badge tone={r.uploaded ? 'green' : 'red'}>{r.uploaded ? 'Uploaded' : 'Not uploaded'}</Badge>,
    },
    { key: 'fileName', header: 'File', width: 240, render: (r) => (r.fileName ? <span className="text-ink-2">{r.fileName}</span> : <span className="text-muted">—</span>) },
    { key: 'at', header: 'Uploaded at', width: 170, value: (r) => fmtDT(r.at), render: (r) => (r.at ? <span className="text-muted">{new Date(r.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span> : <span className="text-muted">—</span>) },
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
  ]

  const ctrCols: GridColumn<CounterClear>[] = [
    { key: 'atmId', header: 'ATM ID', width: 140, sortable: true, filterable: true },
    { key: 'eodAt', header: 'EOD Date & Time', width: 170, sortable: true, value: (c) => fmtDT(c.eodAt) },
    { key: 'make', header: 'Make', width: 150, filterable: true },
    {
      key: 'lastClear', header: 'Last Clear Date Time', width: 190, sortable: true, value: (c) => c.lastClear,
      render: (c) => {
        const days = Math.round((Date.parse(`${CBR_END}T23:59`) - Date.parse(c.lastClear)) / 86400000)
        return (
          <span className="flex items-center gap-2">
            {fmtDT(c.lastClear)}
            {days > 7 && <Badge tone="amber">{days} days</Badge>}
          </span>
        )
      },
    },
    { key: 'by', header: 'Recorded by', width: 150 },
    {
      key: 'action', header: 'Action', label: 'Action', width: 170, value: () => '',
      render: (c) => (
        <button onClick={() => setClearing({ atmId: c.atmId, at: nowLocal() })} className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
          <RotateCcw size={13} /> Record counter clear
        </button>
      ),
    },
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
      <PageHeader
        title="CBR EOD Summary"
        sub="Track daily CBR uploads per ATM and when each ATM's counters were last cleared."
        actions={
          <Button icon={<RotateCcw size={16} />} onClick={() => setClearing({ atmId: '', at: nowLocal() })}>
            Record counter clear
          </Button>
        }
      />
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

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="block w-full sm:w-48">
          <span className="mb-1.5 block text-[12px] font-semibold">CBR Date</span>
          <select value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-full rounded-md border border-line bg-white px-3 text-[13px]">
            <option value="">All dates (last 7 days)</option>
            {EOD_DATES.slice().reverse().map((d) => (
              <option key={d} value={d}>
                {dmy(d)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          <Chip active={status === 'all'} onClick={() => setStatus('all')} count={byDate.length}>All</Chip>
          <Chip active={status === 'up'} onClick={() => setStatus('up')} count={byDate.length - notCount}>Uploaded</Chip>
          <Chip active={status === 'not'} onClick={() => setStatus('not')} count={notCount}>Not uploaded</Chip>
        </div>
        <span className="ml-auto text-[12px] text-muted">
          {notCount ? `${notCount} CBR${notCount > 1 ? 's' : ''} awaiting upload` : 'All CBRs uploaded'}
        </span>
      </div>

      <ExcelGrid
        title="CBR upload tracker"
        countLabel={`${rows.length} ATM-days`}
        rows={rows}
        columns={upCols}
        rowId={(r) => r.id}
        selectable
        searchPlaceholder="Search ATM ID or date"
        noun="ATM-days"
        exportName="cbr-upload-tracker"
        pageSize={12}
        rowClassName={(r) => (r.uploaded ? undefined : 'bg-red-50/30')}
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

      <div className="mt-8 mb-3 flex items-center gap-2">
        <ClipboardCheck size={18} className="text-primary" />
        <h2 className="text-[16px] font-semibold tracking-tight">CBR LAST COUNTER CLEARED</h2>
        <span className="text-[12px] text-muted">Flagged when counters have not been cleared for over 7 days</span>
      </div>
      <ExcelGrid title="Last counter cleared" countLabel={`${counters.length} ATMs`} rows={counters} columns={ctrCols} rowId={(c) => c.atmId} searchPlaceholder="Search ATM ID or make" noun="ATMs" exportName="cbr-last-counter-cleared" />

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
