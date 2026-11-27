import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Upload, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { FileDrop, SelectField, TextAreaField, TextField, type FileValue } from '@/components/ui/Form'
import { useRole } from '@/lib/rbac'
import { useSites } from '@/data/network'
import { WLA_FILE_TYPES, WLA_MAX_MB, accountOf, frNameOf, periodLabel, runChecks, uploadWlaAsync, useWlaStatements } from '@/data/wlaStatements'
import { useRawFile } from '@/data/docsApi'
import { opsMeLoader, rightsFor } from './eod2/access'
import { NoAccess, Note, OpsPage, Panel } from './eod2/ui'

/** Web upload of a WLA statement on behalf of a franchise (franchises normally upload from the mobile app). */
export default function WlaStatementUpload() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const role = useRole()
  opsMeLoader.use()
  const rights = rightsFor('WLA Statement', role)
  const list = useWlaStatements()
  const { sites } = useSites()
  const replacing = list.find((x) => x.id === params.get('replace') && (x.status === 'Returned' || x.status === 'Withdrawn'))
  const [q, setQ] = useState(replacing?.atmId ?? '')
  const [siteId, setSiteId] = useState(replacing?.siteId ?? '')
  const [period, setPeriod] = useState(replacing?.period ?? '')
  const [file, setFile] = useState<FileValue>(null)
  const [pwd, setPwd] = useState(false)
  const [password, setPassword] = useState('')
  const [readable, setReadable] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const raw = useRawFile()
  const site = sites.find((s) => s.siteId === siteId)
  const shown = useMemo(() => sites.filter((s) => !q.trim() || `${s.atmId} ${s.siteId} ${frNameOf(s.frId)}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 80), [sites, q])
  const checks = runChecks({ site, period, fileName: file?.name ?? '', size: file?.size ?? 0, readable }, list, replacing?.id)

  if (!(rights.verify || rights.create)) return <NoAccess module="WLA Statement" />

  const submit = async () => {
    setBusy(true)
    const res = await uploadWlaAsync({ siteId, period, file, passwordProtected: pwd, password, readable, remarks, replacingId: replacing?.id }, 'Web (on behalf)', raw.file())
    setBusy(false)
    if (res.error) return setErr(res.error)
    toast(`${res.rec!.id} uploaded — CRM verification task ${res.rec!.taskId ?? 'raised'}`)
    navigate('/operations/wla-statement')
  }

  return (
    <OpsPage title={replacing ? `Replace ${replacing.id} (${replacing.status.toLowerCase()})` : 'Upload WLA statement'} sub="On behalf of a franchise. The statement must belong to the WLA account mapped to the site in the Site Master." back={{ to: '/operations/wla-statement', label: 'WLA Statements' }}>
      {replacing && <Note tone="amber">{replacing.status === 'Withdrawn' ? `Withdrawn by ${replacing.withdrawnBy ?? 'the uploader'}: ${replacing.withdrawReason ?? ''}` : `Returned by ${replacing.verifiedBy}: ${replacing.reason}`}. The new file becomes version {replacing.version + 1}; the old one is kept in the replacement history.</Note>}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Panel title="Statement details">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Search site" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ATM, site or franchise" disabled={!!replacing} />
            <SelectField label="Site / ATM" required value={siteId} onChange={(e) => setSiteId(e.target.value)} options={shown.map((s) => s.siteId)} disabled={!!replacing} />
            <TextField label="Franchise" value={site ? frNameOf(site.frId) : ''} readOnly />
            <TextField label="Mapped WLA account" value={site ? (accountOf(site) ? `${accountOf(site)!.bank} · ${accountOf(site)!.ref}` : 'Not mapped') : ''} readOnly />
            <TextField label="Statement month" type="month" required value={period} onChange={(e) => setPeriod(e.target.value)} disabled={!!replacing} hint={period ? periodLabel(period) : undefined} />
            <div />
          </div>
          <div className="mt-3" {...raw.capture}>
            <FileDrop upload={false} value={file} onChange={setFile} accept={WLA_FILE_TYPES.map((t) => `.${t}`).join(',')} maxMb={WLA_MAX_MB} label="Upload bank statement" hint={`${WLA_FILE_TYPES.join(', ').toUpperCase()} · max ${WLA_MAX_MB} MB`} />
          </div>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-[12.5px]">
              <input type="checkbox" checked={pwd} onChange={(e) => setPwd(e.target.checked)} className="h-4 w-4 accent-[#1e3f95]" /> File is password protected
            </label>
            {pwd && <TextField label="File password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
            <label className="flex items-center gap-2 text-[12.5px]">
              <input type="checkbox" checked={readable} onChange={(e) => setReadable(e.target.checked)} className="h-4 w-4 accent-[#1e3f95]" /> I opened the file — it is readable and not blurred
            </label>
            <TextAreaField label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
          {err && (
            <div className="mt-3">
              <Note tone="red">{err}</Note>
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => navigate('/operations/wla-statement')}>
              Cancel
            </Button>
            <Button icon={<Upload size={15} />} onClick={submit} disabled={busy}>
              Upload & send for verification
            </Button>
          </div>
        </Panel>
        <Panel title="Validation">
          <ul className="space-y-2 text-[12px]">
            {checks.map((c) => (
              <li key={c.key} className="flex items-start gap-2">
                {c.ok ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" /> : <XCircle size={14} className="mt-0.5 shrink-0 text-red-500" />}
                <span>
                  {c.label}
                  {c.note && <span className="block text-[11px] text-muted">{c.note}</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted">On upload a CRM verification task is created automatically (UAT 15).</p>
        </Panel>
      </div>
    </OpsPage>
  )
}
