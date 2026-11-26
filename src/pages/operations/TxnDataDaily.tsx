import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, FileUp, Save, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { TextAreaField, TextField } from '@/components/ui/Form'
import { useRole } from '@/lib/rbac'
import { IMPORT_HEADERS, commitImportAsync, createTxnAsync, emptyTxnInput, parseImportAsync, resolveSite, sampleCsv, type ImportRow, type TxnInput } from '@/data/txnData'
import { frNameOf } from '@/data/eodStore'
import { opsMeLoader, rightsFor } from './eod2/access'
import { inr, todayIso } from './eod2/fmt'
import { KV, NoAccess, Note, OpsPage, Panel, TableWrap, TD, TH, TR, Tabs } from './eod2/ui'

/** Transaction Data — authorized manual entry and file import (spec §8). */
export default function TxnDataDaily() {
  const role = useRole()
  opsMeLoader.use()
  const rights = rightsFor('Transaction Data', role)
  const navigate = useNavigate()
  const [tab, setTab] = useState<'manual' | 'import'>('manual')
  if (!rights.create) return <NoAccess module="Transaction Data" />
  return (
    <OpsPage title="Transaction Data — entry & import" sub="Only CRM Executives / authorized users create or import transaction data. Every row is checked against the Site Master and for duplicates (one record per ATM per day)." back={{ to: '/operations/txn-data', label: 'Transaction Data' }}>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'manual', label: 'Manual entry' }, { id: 'import', label: 'Import file' }]} />
      {tab === 'manual' ? <ManualEntry onDone={() => navigate('/operations/txn-data')} /> : <ImportFile onDone={() => navigate('/operations/txn-data')} />}
    </OpsPage>
  )
}

function ManualEntry({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState<TxnInput>(() => ({ ...emptyTxnInput(), txnDate: new Date(Date.now() - 86400_000).toISOString().slice(0, 10) }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (k: keyof TxnInput) => (v: string) => setF((p) => ({ ...p, [k]: v }))
  const site = resolveSite(f.atmOrSite)
  const save = async (again: boolean) => {
    const res = await createTxnAsync(f)
    if (res.error) {
      setErrors(res.error)
      return
    }
    toast(`${res.rec!.id} saved — pending verification by another CRM user`)
    if (again) {
      setF((p) => ({ ...emptyTxnInput(), txnDate: p.txnDate, sourceRef: p.sourceRef }))
      setErrors({})
    } else onDone()
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Panel title="Transaction record">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TextField label="ATM ID / Site ID" required value={f.atmOrSite} onChange={(e) => set('atmOrSite')(e.target.value)} error={errors.atmOrSite} placeholder="e.g. DXMH70007" />
          <TextField label="Transaction date" type="date" required max={todayIso()} value={f.txnDate} onChange={(e) => set('txnDate')(e.target.value)} error={errors.txnDate} />
          <TextField label="Transaction count" type="number" min={0} required value={f.txnCount} onChange={(e) => set('txnCount')(e.target.value)} error={errors.txnCount} />
          <TextField label="Withdrawal count" type="number" min={0} value={f.withdrawalCount} onChange={(e) => set('withdrawalCount')(e.target.value)} error={errors.withdrawalCount} />
          <TextField label="Deposit count" type="number" min={0} value={f.depositCount} onChange={(e) => set('depositCount')(e.target.value)} error={errors.depositCount} />
          <TextField label="Amount (₹)" type="number" min={0} required value={f.amount} onChange={(e) => set('amount')(e.target.value)} error={errors.amount} />
          <TextField className="sm:col-span-2 lg:col-span-3" label="Source file / reference" required value={f.sourceRef} onChange={(e) => set('sourceRef')(e.target.value)} error={errors.sourceRef} placeholder="Switch report name, MIS screen, bank file…" />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" icon={<Save size={15} />} onClick={() => save(true)}>
            Save & add another
          </Button>
          <Button icon={<Save size={15} />} onClick={() => save(false)}>
            Save
          </Button>
        </div>
      </Panel>
      <Panel title="Site Master lookup">
        {site ? (
          <KV cols={2} items={[['Site ID', site.siteId], ['ATM ID', site.atmId], ['Franchise', frNameOf(site.frId)], ['Machine', site.machineType], ['Site type', site.siteType], ['Operational', site.operational ? 'Yes' : 'No']]} />
        ) : (
          <p className="text-[12px] text-muted">Enter an ATM or Site ID from the Site Master.</p>
        )}
      </Panel>
    </div>
  )
}

function ImportFile({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('pasted-data.csv')
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const load = (file?: File) => {
    if (!file) return
    setFileName(file.name)
    const fr = new FileReader()
    fr.onload = () => setText(String(fr.result ?? ''))
    fr.readAsText(file)
  }
  const preview = () => void parseImportAsync(text, fileName).then(setRows).catch(() => undefined)
  const ok = rows?.filter((r) => !r.errors.length).length ?? 0
  const commit = async () => {
    if (!rows) return
    const b = await commitImportAsync(fileName, rows, text).catch(() => null)
    if (!b) return
    toast(`${b.id}: ${b.accepted} row(s) imported, ${b.rejected} rejected — verification task created`, b.rejected ? 'info' : 'success')
    onDone()
  }
  return (
    <div className="space-y-4">
      <Panel title="1 · Load file" sub={`CSV columns: ${IMPORT_HEADERS.join(', ')} (header row optional; dates yyyy-mm-dd or dd-mm-yyyy)`}>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3 text-[12px] font-semibold text-ink hover:bg-surface">
            <FileUp size={15} /> Choose CSV
            <input type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => load(e.target.files?.[0])} />
          </label>
          <Button variant="ghost" size="sm" onClick={() => { setText(sampleCsv()); setFileName('sample_switch_report.csv'); setRows(null) }}>
            Load sample
          </Button>
          <span className="text-[12px] text-muted">{fileName}</span>
        </div>
        <TextAreaField className="mt-3" label="File content" value={text} onChange={(e) => { setText(e.target.value); setRows(null) }} rows={8} />
        <div className="mt-3 flex justify-end">
          <Button onClick={preview} disabled={!text.trim()}>
            Validate rows
          </Button>
        </div>
      </Panel>
      {rows && (
        <Panel
          title={`2 · Preview — ${ok} valid, ${rows.length - ok} with errors`}
          sub="Rows with errors are rejected and listed in the batch log; valid rows go to Pending Verification."
          action={
            <Button onClick={commit} disabled={!ok}>
              Import {ok} row(s)
            </Button>
          }
          pad={false}
        >
          <TableWrap empty={!rows.length}>
            <thead className="bg-slate-50">
              <tr>
                {['Line', 'ATM / Site', 'Date', 'Count', 'Amount', 'Source', 'Result'].map((h) => (
                  <th key={h} className={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.line} className={`${TR} ${r.errors.length ? 'bg-red-50/60' : ''}`}>
                  <td className={TD}>{r.line}</td>
                  <td className={TD}>{r.input.atmOrSite}</td>
                  <td className={TD}>{r.input.txnDate}</td>
                  <td className={TD}>{r.input.txnCount}</td>
                  <td className={TD}>{r.input.amount ? inr(Number(r.input.amount)) : '—'}</td>
                  <td className={TD}>{r.input.sourceRef}</td>
                  <td className={`${TD} whitespace-normal`}>
                    {r.errors.length ? (
                      <span className="inline-flex items-start gap-1 text-red-600">
                        <XCircle size={13} className="mt-0.5 shrink-0" /> {r.errors.join('; ')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 size={13} /> OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Panel>
      )}
      <Note tone="blue">Imported rows keep the source file name and the import batch ID on every record for audit.</Note>
    </div>
  )
}
