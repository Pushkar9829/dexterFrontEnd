// §9.2 File-Based Payout: upload (CSV / .xlsx parsed in the browser; PDF → server OCR, simulated),
// file details, summary from file, validation report, payout processing.
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CircleCheck, Download, FileSpreadsheet, IndianRupee, Play, RotateCcw, Save, Settings2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { can } from '@/lib/rbac'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SelectField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { apiEnabled, apiSaveFileBatch, uploadRows } from '@/data/payoutApi'
import { payoutStore, logPayout, nowIso, pid, sumP, usePayout, type PayoutBatch, type PayoutLine, type ReconStatus } from '@/data/payout'
import {
  COMPANY_ACCOUNTS, PAYMENT_MODES, REMARK_MAX, actor, addTrail, amt, atmInfo, batchNameTaken, downloadTemplate, extStore, fmtDateTime, isMapped, monthLabel, storeOriginal,
  type FileKind, type FileMeta, type Issue, type ProcStatus,
} from './lib'
import { mapGrid, readTable, toRecord, type FileRecord } from './parse'
import { DetailsCard, DropZone, KV, Panel, SectionBar, tbodyRow, tdCls, thCls, theadRow, type Details } from './ui'

const KINDS: FileKind[] = ['File Upload', 'PDF Statement', 'Excel File']
const ACCEPT: Record<FileKind, string> = { 'File Upload': '.xlsx,.csv,.pdf', 'PDF Statement': '.pdf', 'Excel File': '.xlsx,.csv' }
const HINT: Record<FileKind, string> = { 'File Upload': 'Upload Excel / CSV / PDF', 'PDF Statement': 'Upload payout PDF statement', 'Excel File': 'Upload Excel (.xlsx) / CSV' }
const MAX_MB = 10
const PROC_TONE: Record<ProcStatus, 'blue' | 'amber' | 'green' | 'red'> = { Uploaded: 'blue', Processing: 'amber', Extracted: 'green', Failed: 'red' }
const fileTypeOf = (f: File) => (/\.pdf$/i.test(f.name) ? 'PDF Statement (.pdf)' : /\.xlsx$/i.test(f.name) ? 'Excel (.xlsx)' : 'CSV (.csv)')
const ISSUE_TONE: Record<Issue['kind'], 'red' | 'amber' | 'gray' | 'purple'> = { 'Unmapped Site': 'red', Duplicate: 'red', 'Data Pending': 'gray', 'Duplicate File': 'amber' }

type Up = { file: File; status: ProcStatus; at: string; error?: string; records: FileRecord[]; mapped: number }
type Pay = { date: string; mode: string; account: string; remark: string }
const EMPTY_PAY: Pay = { date: '', mode: 'NEFT', account: COMPANY_ACCOUNTS[0], remark: '' }

export function FilePanel({ details, setDetails, name, resetName }: { details: Details; setDetails: (p: Partial<Details>) => void; name: string; resetName: () => void }) {
  const { batches } = usePayout()
  const [kind, setKind] = useState<FileKind>('File Upload')
  const [up, setUp] = useState<Up | null>(null)
  const [pay, setPay] = useState<Pay>(EMPTY_PAY)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showAll, setShowAll] = useState(false)
  const token = useRef(0)
  useEffect(
    () => () => {
      token.current++ // ignore a parse that finishes after unmount
    },
    [],
  )

  const isPdf = !!up && /\.pdf$/i.test(up.file.name)
  const nameTaken = !!name && batchNameTaken(name, draftId ?? undefined)

  const onFile = async (f: File) => {
    const ok = ACCEPT[kind].split(',').some((ext) => f.name.toLowerCase().endsWith(ext))
    if (!ok) {
      toast(`${kind} accepts ${ACCEPT[kind]} only.`, 'error')
      return
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast(`File is larger than ${MAX_MB} MB.`, 'error')
      return
    }
    const t = ++token.current
    const at = nowIso()
    if (/\.pdf$/i.test(f.name)) {
      // PDF extraction (OCR) runs on the server — simulated: the batch waits in Processing.
      setUp({ file: f, status: 'Processing', at, records: [], mapped: 0 })
      return
    }
    setUp({ file: f, status: 'Processing', at, records: [], mapped: 0 })
    try {
      const grid = await readTable(f)
      const { rows, mapped } = mapGrid(grid)
      const records = rows.map(toRecord)
      if (t !== token.current) return
      if (!records.length) throw new Error('No data rows below the header.')
      setUp({ file: f, status: 'Extracted', at, records, mapped: mapped.length })
      toast(`${records.length} record(s) extracted from ${f.name}`)
    } catch (e) {
      if (t !== token.current) return
      setUp({ file: f, status: 'Failed', at, records: [], mapped: 0, error: e instanceof Error ? e.message : 'File could not be read.' })
    }
  }

  // ── validation report ──
  const issues = useMemo<Issue[]>(() => {
    if (!up) return []
    const out: Issue[] = []
    const sameFile = batches.find((b) => b.id !== draftId && b.fileName && b.fileName.toLowerCase() === up.file.name.toLowerCase())
    if (sameFile) out.push({ row: 0, atmId: '—', kind: 'Duplicate File', detail: `File name already processed in batch ${sameFile.name} (${sameFile.status})` })
    if (nameTaken) out.push({ row: 0, atmId: '—', kind: 'Duplicate File', detail: `Batch name ${name} already exists` })
    const seen = new Map<string, number>()
    up.records.forEach((r) => r.atmId && seen.set(r.atmId, (seen.get(r.atmId) ?? 0) + 1))
    up.records.forEach((r) => {
      if (!r.atmId) {
        out.push({ row: r.row, atmId: '—', kind: 'Data Pending', detail: 'ATM ID missing' })
        return
      }
      if (!isMapped(r.atmId, details.vertical)) out.push({ row: r.row, atmId: r.atmId, kind: 'Unmapped Site', detail: `ATM not in ${details.vertical === 'Business Model' ? 'BM site' : 'site'} master` })
      if ((seen.get(r.atmId) ?? 0) > 1) out.push({ row: r.row, atmId: r.atmId, kind: 'Duplicate', detail: `ATM appears ${seen.get(r.atmId)} times in the file` })
      if (r.missing.length) out.push({ row: r.row, atmId: r.atmId, kind: 'Data Pending', detail: `Missing: ${r.missing.join(', ')}` })
      if (r.month && details.month && r.month !== details.month) out.push({ row: r.row, atmId: r.atmId, kind: 'Data Pending', detail: `Row month ${monthLabel(r.month)} ≠ payout month ${monthLabel(details.month)}` })
    })
    return out
  }, [up, batches, draftId, nameTaken, name, details.vertical, details.month])

  const recs = up?.records.filter((r) => r.atmId) ?? []
  const summary = { records: recs.length, gross: sumP(recs.map((r) => r.gross)), gst: sumP(recs.map((r) => r.gst)), tds: sumP(recs.map((r) => r.taxAmt)), net: sumP(recs.map((r) => r.net)) }
  const counts = issues.reduce<Record<string, number>>((m, i) => ({ ...m, [i.kind]: (m[i.kind] ?? 0) + 1 }), {})

  const reset = () => {
    token.current++
    setUp(null)
    setPay(EMPTY_PAY)
    setErrors({})
    setDraftId(null)
    setKind('File Upload')
  }

  const save = async (process: boolean) => {
    const e: Record<string, string> = {}
    if (!details.fy) e.fy = 'Required'
    if (!details.month) e.month = 'Select the payout month'
    if (!name.trim()) e.name = 'Required'
    else if (nameTaken) e.name = 'Batch name already exists — use a unique name'
    if (!up) e.file = 'Upload the payout file'
    else if (up.status === 'Failed') e.file = 'File could not be read — fix and re-upload'
    else if (!isPdf && up.status !== 'Extracted') e.file = 'Wait for extraction to finish'
    if (process) {
      if (!pay.date) e.date = 'Required'
      if (!pay.mode) e.mode = 'Required'
      if (!pay.account) e.account = 'Required'
    }
    if (pay.remark.length > REMARK_MAX) e.remark = `Max ${REMARK_MAX} characters`
    setErrors(e)
    if (Object.keys(e).length || !up) {
      toast(Object.values(e)[0] ?? 'Check the form', 'error')
      return
    }
    if (!can('Create')) {
      toast('Your role cannot create payout batches.', 'error')
      return
    }
    const id = draftId ?? pid('BAT')
    const status: PayoutBatch['status'] = process ? 'Pending Approval' : 'Draft'
    const flagsFor = (row: number): ReconStatus[] =>
      issues.filter((i) => i.row === row && i.kind !== 'Duplicate File' && !i.detail.startsWith('Row month')).map((i) => i.kind as ReconStatus)
    const lines: PayoutLine[] = recs.map((r) => {
      const info = atmInfo(r.atmId)
      return {
        id: pid('PL'), batchId: id, source: 'File-Based', month: r.month || details.month, atmId: r.atmId, siteId: info?.site.siteId ?? (r.siteId || '—'), model: r.model || '—', cashLiveDate: r.cashLiveDate,
        frId: info?.site.frId ?? '', frName: r.frName || info?.frName || '—', mfName: r.mfName || info?.mf || '—', smfName: r.smfName || info?.smf || '—', mfCode: r.mfCode, city: r.city || info?.site.district || '',
        state: r.state || info?.site.state || '', txn: r.txn, ded: r.ded, gross: r.gross, mfRevenue: r.mfRevenue, taxPct: r.taxPct, taxAmt: r.taxAmt, withoutTds: r.withoutTds, net: r.net, pan: r.pan,
        releaseDate: r.releaseDate, creditStatus: r.creditStatus, paidDate: r.paidDate, utr: r.utr, remarks: r.remarks,
      }
    })
    const batch: PayoutBatch = {
      id, name: name.trim(), fy: details.fy, month: details.month, type: 'File-Based Payout', vertical: details.vertical, fileName: up.file.name, fileType: fileTypeOf(up.file),
      fileSizeKb: Math.max(1, Math.round(up.file.size / 1024)), records: lines.length, gross: summary.gross, gst: summary.gst, tds: summary.tds, net: summary.net,
      paymentDate: pay.date || undefined, paymentMode: pay.mode || undefined, bankAccount: pay.account || undefined, status, maker: actor(), createdAt: nowIso(), remarks: pay.remark || undefined,
    }
    const meta: FileMeta = {
      name: up.file.name, type: fileTypeOf(up.file), sizeKb: batch.fileSizeKb ?? 0, uploadedAt: up.at, uploadedBy: actor(), status: up.status, kind, issues,
      note: isPdf ? 'PDF extraction (OCR) runs on the server — simulated. Lines appear after extraction.' : undefined,
    }
    payoutStore.set((s) => ({ batches: [batch, ...s.batches.filter((b) => b.id !== id)], lines: [...s.lines.filter((l) => l.batchId !== id), ...lines] }))
    const lineMeta = Object.fromEntries(lines.map((l, i) => [l.id, { flags: flagsFor(recs[i].row), accountNo: recs[i].accountNo, row: recs[i].row }]))
    extStore.set((x) => ({ ...x, files: { ...x.files, [id]: meta }, lineMeta: { ...x.lineMeta, ...lineMeta }, meta: { ...x.meta, [id]: { siteCategory: details.siteCategory || undefined, beneficiary: details.beneficiary || undefined } } }))
    addTrail(id, process ? 'Submitted for approval' : draftId ? 'Draft updated' : 'Draft saved', `${up.file.name} · ${lines.length} record(s) · ${issues.length} validation issue(s)`)
    logPayout({ by: actor(), area: 'Monthly Payout', ref: batch.name, action: process ? 'File payout processed' : 'File payout draft saved', after: `${lines.length} lines, net ${amt(summary.net)}` })
    if (apiEnabled)
      void apiSaveFileBatch(draftId, { name: batch.name, month: batch.month, vertical: batch.vertical, siteCategory: details.siteCategory || undefined }, up.file.name, batch.fileType, uploadRows(recs, recs.map((r) => r.accountNo)), process)
    const stored = await storeOriginal(id, up.file)
    if (stored) extStore.set((x) => ({ ...x, files: { ...x.files, [id]: { ...x.files[id], stored: true } } }))
    if (process) {
      toast(`${batch.name} sent for approval (${lines.length} records)`)
      reset()
      resetName()
    } else {
      setDraftId(id)
      toast(`Draft ${batch.name} saved`)
    }
  }

  const shown = showAll ? issues : issues.slice(0, 8)

  return (
    <div className="space-y-4">
      <DetailsCard mode="file" details={details} onChange={setDetails} name={name} nameError={errors.name ?? (nameTaken ? 'Batch name already exists — use a unique name' : undefined)} nameHint={draftId ? 'Editing saved draft' : 'Must be unique'} />
      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr_1fr]">
        <Panel>
          <div className="flex rounded-lg bg-slate-50 p-1" role="radiogroup" aria-label="File area option">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => {
                  setKind(k)
                  if (up && !ACCEPT[k].split(',').some((x) => up.file.name.toLowerCase().endsWith(x))) reset()
                }}
                className={cn('flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium', kind === k ? 'bg-primary text-white' : 'text-ink-2 hover:text-primary')}
              >
                <span className={cn('grid h-3.5 w-3.5 place-items-center rounded-full border', kind === k ? 'border-white' : 'border-slate-400')}>{kind === k && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>
                {k}
              </button>
            ))}
          </div>
          <DropZone file={up?.file ?? null} accept={ACCEPT[kind]} onFile={onFile} onClear={reset} maxMb={MAX_MB} hint={HINT[kind]} />
          {errors.file && <p className="text-[11px] text-brand-red">{errors.file}</p>}
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>Headers follow the Dexter payout workbook (case / space-insensitive).</span>
            <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1 font-semibold text-[#0066FF] hover:underline">
              <Download size={12} /> Download template
            </button>
          </div>
        </Panel>
        <Panel>
          <SectionBar icon={<FileSpreadsheet size={15} />} title="File Details" />
          <div className="px-1">
            <KV k="File Name" v={up?.file.name ?? '—'} />
            <KV k="File Type" v={up ? fileTypeOf(up.file) : '—'} />
            <KV k="File Size" v={up ? `${(up.file.size / 1024).toFixed(1)} KB` : '—'} />
            <KV k="Records Count" v={up ? (isPdf ? 'After extraction' : summary.records.toLocaleString('en-IN')) : '—'} />
            <KV k="Upload Date & Time" v={up ? fmtDateTime(up.at) : '—'} />
            <KV k="Uploaded By" v={up ? actor() : '—'} />
            <KV k="Processing Status" v={up ? <Badge tone={PROC_TONE[up.status]}>{up.status}</Badge> : '—'} />
          </div>
          {isPdf && <p className="rounded-md bg-amber-50 px-3 py-2 text-[11.5px] text-amber-800">PDF extraction (OCR) runs on the server — simulated. Processing the payout creates a pending batch; lines appear once the server extracts them.</p>}
          {up?.error && <p className="rounded-md bg-red-50 px-3 py-2 text-[11.5px] text-red-700">{up.error}</p>}
          {up?.status === 'Extracted' && <p className="text-[11px] text-muted">{up.mapped} column(s) recognised.</p>}
        </Panel>
        <Panel>
          <SectionBar icon={<IndianRupee size={15} />} title="Payout Summary (From File)" />
          <div className="divide-y divide-line-soft px-1 text-[12.5px]">
            {[
              ['Total Records', summary.records.toLocaleString('en-IN')],
              ['Total Payout Amount (₹)', amt(summary.gross)],
              ['Total GST (₹)', amt(summary.gst)],
              ['Total TDS (₹)', amt(summary.tds)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2">
                <span className="text-ink-2">{k}</span>
                <span className="font-semibold tabular-nums">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-lg bg-[#EEF4FC] px-3 py-2.5">
            <span className="text-[13px] font-semibold text-primary">Net Payout Amount (₹)</span>
            <span className="text-[16px] font-bold text-primary tabular-nums">{amt(summary.net)}</span>
          </div>
          {up?.status === 'Extracted' && summary.gst === 0 && <p className="text-[11px] text-muted">No separate GST column in the file — the TDS / GST amount column is shown under TDS.</p>}
        </Panel>
      </div>

      {up && up.status !== 'Processing' && (
        <Panel>
          <SectionBar
            icon={issues.length ? <AlertTriangle size={15} /> : <CircleCheck size={15} />}
            title="Validation Report"
            right={
              <span className="flex flex-wrap gap-1.5">
                {issues.length === 0 ? (
                  <Badge tone="green">All rows valid</Badge>
                ) : (
                  Object.entries(counts).map(([k, n]) => (
                    <Badge key={k} tone={ISSUE_TONE[k as Issue['kind']]}>
                      {k}: {n}
                    </Badge>
                  ))
                )}
              </span>
            }
          />
          {issues.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-line">
              <table className="w-full border-collapse">
                <thead>
                  <tr className={theadRow}>
                    {['Row', 'ATM ID', 'Issue', 'Detail'].map((h) => (
                      <th key={h} className={thCls}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((i, n) => (
                    <tr key={`${i.row}-${i.kind}-${n}`} className={tbodyRow}>
                      <td className={tdCls}>{i.row || 'File'}</td>
                      <td className={`${tdCls} font-semibold`}>{i.atmId}</td>
                      <td className={tdCls}>
                        <Badge tone={ISSUE_TONE[i.kind]}>{i.kind}</Badge>
                      </td>
                      <td className={`${tdCls} text-left`}>{i.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {issues.length > 8 && (
                <button type="button" onClick={() => setShowAll((s) => !s)} className="w-full py-2 text-[11.5px] font-semibold text-[#0066FF] hover:bg-blue-50/40">
                  {showAll ? 'Show fewer' : `Show all ${issues.length} issues`}
                </button>
              )}
            </div>
          )}
          {issues.length > 0 && <p className="px-1 text-[11px] text-muted">Rows with issues are still imported and flagged; Auto Reconciliation blocks approval until they are resolved.</p>}
        </Panel>
      )}

      <Panel>
        <SectionBar icon={<Settings2 size={15} />} title="Payout Processing" />
        <div className="grid gap-3 px-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.3fr_2fr]">
          <TextField label="Payment Date" required type="date" name="mp-paydate" value={pay.date} error={errors.date} onChange={(e) => setPay((p) => ({ ...p, date: e.target.value }))} />
          <SelectField label="Payment Mode" required name="mp-paymode" value={pay.mode} options={PAYMENT_MODES} error={errors.mode} onChange={(e) => setPay((p) => ({ ...p, mode: e.target.value }))} />
          <SelectField label="Bank Account" required name="mp-account" value={pay.account} options={COMPANY_ACCOUNTS} error={errors.account} onChange={(e) => setPay((p) => ({ ...p, account: e.target.value }))} hint="Approved company debit accounts" />
          <div>
            <label htmlFor="mp-remark" className="mb-1.5 flex justify-between text-[11px] font-semibold text-ink">
              Remark <span className="font-normal text-muted">{pay.remark.length}/{REMARK_MAX}</span>
            </label>
            <input id="mp-remark" value={pay.remark} maxLength={REMARK_MAX} placeholder="Enter Remark (Optional)" onChange={(e) => setPay((p) => ({ ...p, remark: e.target.value }))} className="h-9 w-full rounded-md border border-line bg-white px-[11px] text-[12.5px] outline-none focus:border-primary" />
          </div>
        </div>
      </Panel>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" icon={<RotateCcw size={14} />} onClick={reset}>
          Reset
        </Button>
        <Button variant="secondary" icon={<Save size={14} />} onClick={() => void save(false)}>
          Save Draft
        </Button>
        <Button variant="bright" icon={<Play size={14} />} onClick={() => void save(true)}>
          Process Payout
        </Button>
      </div>
    </div>
  )
}
