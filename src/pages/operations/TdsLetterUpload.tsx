import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Upload, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { FileDrop, SelectField, TextAreaField, TextField, type FileValue } from '@/components/ui/Form'
import { useRole } from '@/lib/rbac'
import { useFranchises } from '@/data/franchises'
import { CURRENT_FY, FINANCIAL_YEARS, TDS_DOC_TYPES, TDS_MAX_MB, TDS_PERIODS, checksFor, uploadTdsAsync, useTdsLetters, type TdsDocType, type TdsPeriod } from '@/data/tdsLetters'
import { useRawFile } from '@/data/docsApi'
import { opsMeLoader, rightsFor } from './eod2/access'
import { NoAccess, Note, OpsPage, Panel } from './eod2/ui'

const FLOW = ['Upload TDS PDF', 'Franchise / FY mapping', 'Document validation', 'TDS Document Master', 'Franchise app view / download', 'Audit log']

/** CRM / Finance upload of a TDS letter (spec §7). */
export default function TdsLetterUpload() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const role = useRole()
  opsMeLoader.use()
  const rights = rightsFor('TDS Letter', role)
  const docs = useTdsLetters()
  const franchises = useFranchises()
  const replacing = docs.find((d) => d.id === params.get('replace') && d.status === 'Active')
  const [q, setQ] = useState(replacing?.frId ?? '')
  const [frId, setFrId] = useState(replacing?.frId ?? '')
  const [fy, setFy] = useState(replacing?.fy ?? CURRENT_FY)
  const [period, setPeriod] = useState<TdsPeriod | ''>(replacing?.period ?? '')
  const [docType, setDocType] = useState<TdsDocType | ''>(replacing?.docType ?? '')
  const [amount, setAmount] = useState('')
  const [file, setFile] = useState<FileValue>(null)
  const [remarks, setRemarks] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const raw = useRawFile()
  const shown = useMemo(() => franchises.filter((f) => !q.trim() || `${f.id} ${f.name}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 80), [franchises, q])
  const fr = franchises.find((f) => f.id === frId)
  const checks = checksFor({ frId, fy, period, docType, fileName: file?.name ?? '', size: file?.size ?? 0 }, docs, replacing?.id)

  if (!rights.create || role === 'Franchisee') return <NoAccess module="TDS Letter" />

  const submit = async () => {
    setBusy(true)
    const res = await uploadTdsAsync({ frId, fy, period, docType, tdsAmount: amount, fileName: file?.name ?? '', size: file?.size ?? 0, remarks, replacingId: replacing?.id }, role, raw.file())
    setBusy(false)
    if (res.error) return setErr(res.error)
    toast(`${res.doc!.id} saved to the TDS Document Master — visible only to ${res.doc!.franchiseName}`)
    navigate('/operations/tds')
  }

  return (
    <OpsPage title={replacing ? `Replace ${replacing.id}` : 'Upload TDS letter'} sub={FLOW.join(' → ')} back={{ to: '/operations/tds', label: 'TDS Letters' }}>
      {replacing && <Note tone="amber">The new PDF supersedes {replacing.id} (v{replacing.version}); the old version stays in the master as Superseded and disappears from the franchise app.</Note>}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Panel title="Franchise & financial-year mapping">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Search franchise" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Franchise ID or name" disabled={!!replacing} />
            <SelectField label="Franchise (only this franchise can view)" required value={frId} onChange={(e) => setFrId(e.target.value)} options={shown.map((f) => f.id)} disabled={!!replacing} hint={fr ? `${fr.name} · ${fr.city} · ${fr.status}` : undefined} />
            <SelectField label="Financial year" required value={fy} onChange={(e) => setFy(e.target.value)} options={[...FINANCIAL_YEARS]} disabled={!!replacing} />
            <SelectField label="Period" required value={period} onChange={(e) => setPeriod(e.target.value as TdsPeriod)} options={[...TDS_PERIODS]} disabled={!!replacing} />
            <SelectField label="Document type" required value={docType} onChange={(e) => setDocType(e.target.value as TdsDocType)} options={[...TDS_DOC_TYPES]} disabled={!!replacing} />
            <TextField label="TDS amount (₹)" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} hint="Optional — as printed on the letter" />
          </div>
          <div className="mt-3">
            <div {...raw.capture}>
            <FileDrop upload={false} value={file} onChange={setFile} accept=".pdf,application/pdf" maxMb={TDS_MAX_MB} label="Upload TDS PDF" hint={`PDF only · max ${TDS_MAX_MB} MB`} />
            </div>
          </div>
          <div className="mt-3">
            <TextAreaField label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
          {err && (
            <div className="mt-3">
              <Note tone="red">{err}</Note>
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => navigate('/operations/tds')}>
              Cancel
            </Button>
            <Button icon={<Upload size={15} />} onClick={submit} disabled={busy}>
              Validate & save to master
            </Button>
          </div>
        </Panel>
        <Panel title="Document validation">
          <ul className="space-y-2 text-[12px]">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-2">
                {c.ok ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" /> : <XCircle size={14} className="mt-0.5 shrink-0 text-red-500" />}
                <span>
                  {c.label}
                  {c.note && <span className="block text-[11px] text-muted">{c.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </OpsPage>
  )
}
