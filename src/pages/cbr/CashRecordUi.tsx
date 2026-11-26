// Shared UI for the two funding-model cash registers (Operations §2 CBR / §3 Cash Loading).
// The components take a master (cbrMaster | clMaster) so each page reads ONLY its own store.
import { useCallback, useMemo, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Home,
  Info,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { FileDrop, SelectField, TextAreaField, TextField, fmtSize, type FileValue } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { useRole } from '@/lib/rbac'
import { useSites } from '@/data/network'
import { ACK_TEXT, ACK_VERSION, actorName, isOwnRecord, useWorkflow, type OpsStatus } from '@/data/workflow'
import {
  CORRECTABLE,
  KIND_META,
  canApproveRole,
  canCreateRole,
  canVerifyRole,
  checkSiteFor,
  clBalance,
  newDoc,
  type CashDoc,
  type CashKind,
  type CashMaster,
  type CashRecord,
  type CorrectableKey,
  type Result,
  cbrMaster,
} from '@/data/cbr'
import { uploadCashDoc } from '@/data/cbrApi'
import { apiEnabled, toastError } from '@/data/opsApi'
import { clMaster } from '@/data/cashLoadingRegisterStore'
import { dmy } from '@/data/cbrSites'
import { inr } from './cashUtils'

const dt = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
const today = () => new Date().toISOString().slice(0, 10)

/**
 * FileDrop only reports name / size; in API mode the real File is needed for POST /files. Wrap the drop zone in
 * the returned handlers to capture the File the user picked / dropped (captured before FileDrop's own handler).
 */
function useFileCapture() {
  const ref = useRef<File | null>(null)
  const capture = {
    onChangeCapture: (e: FormEvent<HTMLDivElement>) => {
      const t = e.target as HTMLInputElement
      if (t.type === 'file') ref.current = t.files?.[0] ?? null
    },
    onDropCapture: (e: DragEvent<HTMLDivElement>) => {
      ref.current = e.dataTransfer.files[0] ?? null
    },
  }
  return { ref, capture }
}

/** API mode: upload the file and return a document whose id is the backend fileId; mock mode: local doc. */
async function makeDoc(file: File | null, v: { name: string; size: number }, purpose: string, kind: CashKind, ref?: string): Promise<CashDoc | null> {
  if (!apiEnabled) return newDoc(v.name, v.size)
  if (!file) {
    toastError(new Error('Could not read the selected file — pick it again.'))
    return null
  }
  try {
    return await uploadCashDoc(file, purpose, kind === 'CBR' ? 'CbrRecord' : 'CashLoadingRecord', ref)
  } catch (e) {
    toastError(e, 'Upload failed')
    return null
  }
}

// ── small building blocks ────────────────────────────────────────────────
export function Crumbs({ trail }: { trail: { label: string; to?: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500">
      <Home size={14} className="shrink-0 text-slate-400" />
      <Link to="/dashboard" className="transition-colors hover:text-[#0066FF]">
        Workspace
      </Link>
      {trail.map((t) => (
        <span key={t.label} className="flex items-center gap-1.5">
          <ChevronRight size={12} className="text-slate-400" />
          {t.to ? (
            <Link to={t.to} className="transition-colors hover:text-[#0066FF]">
              {t.label}
            </Link>
          ) : (
            <span className="font-semibold text-slate-800">{t.label}</span>
          )}
        </span>
      ))}
    </div>
  )
}

export function StatusBadge({ status, locked }: { status: OpsStatus | string; locked?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Badge tone={status === 'Returned for Correction' ? 'amber' : toneFor(status)}>{status}</Badge>
      {locked && (
        <span title="Approved & locked in master" className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
          <Lock size={10} /> Locked
        </span>
      )}
    </span>
  )
}

export function FundingChip({ kind }: { kind: CashKind }) {
  const m = KIND_META[kind]
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${kind === 'CBR' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
      {m.funding} only · {m.master}
    </span>
  )
}

function Panel({ title, icon, children, right }: { title: string; icon?: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
        {icon && <span className="text-[#0066FF]">{icon}</span>}
        <h2 className="text-[14px] font-bold text-slate-900">{title}</h2>
        {right && <div className="ml-auto">{right}</div>}
      </div>
      {children}
    </section>
  )
}

function KV({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <div className="text-[11px] text-slate-500">{i.label}</div>
          <div className="mt-0.5 text-[12.5px] font-medium break-words text-slate-900">{i.value || '—'}</div>
        </div>
      ))}
    </div>
  )
}

// ── §3.2 data separation help panel ──────────────────────────────────────
export function SeparationPanel({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const rows: [string, string][] = [
    ['CBR / Cash Balance Report', 'Cash Loading Register'],
    ['CBR Master', 'Cash Loading Master'],
    ['Full Funding EOD', 'Self Funding EOD'],
    ['Monthly CBR Reconciliation', 'Monthly Cash Loading Reconciliation'],
    ['Detailed CBR Register', 'Detailed Cash Loading Register'],
  ]
  return (
    <section className="rounded-xl border border-blue-100 bg-blue-50/40">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <Info size={16} className="text-[#0066FF]" />
        <span className="text-[13px] font-bold text-slate-900">Data Separation Rule — Full Funding vs Self Funding (§3.2 / §19.1)</span>
        <span className="ml-auto text-[11px] font-semibold text-[#0066FF]">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4">
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[#EAF2FD] text-[11.5px] font-bold text-slate-800">
                <tr>
                  <th className="px-3 py-2">Full Funding Model (FFM)</th>
                  <th className="px-3 py-2">Self Funding Model (SF)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rows.map(([a, b]) => (
                  <tr key={a}>
                    <td className="px-3 py-2">{a}</td>
                    <td className="px-3 py-2">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-[12px] text-slate-600">
            <li>The funding model comes from the Site Master (Type of Site: FFM / SF). A Full Funding ATM can only be used in CBR; a Self Funding ATM only in the Cash Loading Register.</li>
            <li>CBR and Cash Loading have separate masters, record IDs (CBR-… / CL-…), validations, approvals and reports — their financial data never mixes.</li>
            <li>Reports always need a funding model; there is no combined CBR + Cash Loading total.</li>
          </ul>
        </div>
      )}
    </section>
  )
}

// ── KPI strip + funding-model report ─────────────────────────────────────
function summarise(list: CashRecord[]) {
  const by = (s: OpsStatus) => list.filter((r) => r.status === s).length
  const approved = list.filter((r) => r.locked)
  return {
    total: list.length,
    pendingVerification: by('Pending Verification'),
    pendingApproval: by('Pending Approval'),
    returned: by('Returned for Correction'),
    approved: approved.length,
    rejected: by('Rejected'),
    drafts: by('Draft'),
    approvedAmount: approved.reduce((s, r) => s + r.amount, 0),
    approvedWithdrawal: approved.reduce((s, r) => s + r.cashWithdrawal, 0),
  }
}

export function CashKpis({ master }: { master: CashMaster }) {
  const list = master.store.use()
  const s = summarise(list)
  const m = master.meta
  const tiles: { label: string; value: ReactNode; tone: string }[] = [
    { label: 'Pending Verification', value: s.pendingVerification, tone: 'text-amber-600' },
    { label: 'Pending Approval', value: s.pendingApproval, tone: 'text-blue-600' },
    { label: 'Returned for Correction', value: s.returned, tone: 'text-orange-600' },
    { label: `${m.master} (Approved & Locked)`, value: s.approved, tone: 'text-emerald-600' },
    { label: `Approved ${m.amountLabel}`, value: inr(s.approvedAmount), tone: 'text-slate-900' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
          <div className="text-[11px] text-slate-500">{t.label}</div>
          <div className={`mt-1 text-[20px] font-bold ${t.tone}`}>{t.value}</div>
        </div>
      ))}
    </div>
  )
}

/** Reports must be filtered by funding model (§19.1) — the selector has no "All" option. */
export function FundingReport({ initial }: { initial: CashKind }) {
  const [model, setModel] = useState<'Full Funding' | 'Self Funding'>(KIND_META[initial].funding === 'Full Funding' ? 'Full Funding' : 'Self Funding')
  const cbr = cbrMaster.store.use()
  const cl = clMaster.store.use()
  const kind: CashKind = model === 'Full Funding' ? 'CBR' : 'Cash Loading'
  const list = kind === 'CBR' ? cbr : cl
  const s = summarise(list)
  const m = KIND_META[kind]
  const exportIt = () =>
    downloadCsv(
      `${m.master.toLowerCase().replace(/\s+/g, '-')}-summary-${today()}`,
      ['Funding Model', 'Master', 'Total Records', 'Pending Verification', 'Pending Approval', 'Returned', 'Approved & Locked', 'Rejected', `Approved ${m.amountLabel}`, 'Approved Cash Withdrawal'],
      [[m.funding, m.master, String(s.total), String(s.pendingVerification), String(s.pendingApproval), String(s.returned), String(s.approved), String(s.rejected), String(s.approvedAmount), String(s.approvedWithdrawal)]],
    )
  return (
    <Panel
      title="MIS Summary by Funding Model"
      icon={<FileText size={16} />}
      right={
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold text-slate-600" htmlFor="funding-model-report">
            Funding Model *
          </label>
          <select id="funding-model-report" value={model} onChange={(e) => setModel(e.target.value as typeof model)} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[12px]">
            <option>Full Funding</option>
            <option>Self Funding</option>
          </select>
          <Button size="sm" variant="secondary" icon={<Download size={13} />} onClick={exportIt}>
            CSV
          </Button>
        </div>
      }
    >
      <p className="mb-3 text-[12px] text-slate-500">
        Source: <strong className="text-slate-800">{m.master}</strong> only ({m.register}). Figures are never combined across funding models.
      </p>
      <KV
        items={[
          { label: 'Total records', value: s.total },
          { label: 'Pending verification / approval', value: `${s.pendingVerification} / ${s.pendingApproval}` },
          { label: 'Approved & locked', value: s.approved },
          { label: 'Returned / Rejected', value: `${s.returned} / ${s.rejected}` },
          { label: `Approved ${m.amountLabel}`, value: inr(s.approvedAmount) },
          { label: 'Approved cash withdrawal', value: inr(s.approvedWithdrawal) },
          { label: 'Drafts', value: s.drafts },
        ]}
      />
    </Panel>
  )
}

// ── Bilingual acknowledgement popup (§2.2) ───────────────────────────────
export function AckModal({ kind, atmId, amount, onConfirm, onClose }: { kind: CashKind; atmId: string; amount: number; onConfirm: (lang: 'Hindi' | 'English') => void; onClose: () => void }) {
  const [lang, setLang] = useState<'Hindi' | 'English'>('English')
  const [agree, setAgree] = useState(false)
  return (
    <Modal
      title="Acknowledgement / पावती"
      sub={`${kind} · ATM ${atmId} · ${KIND_META[kind].amountLabel} ${inr(amount)} · ${ACK_VERSION}`}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!agree} icon={<Send size={14} />} onClick={() => onConfirm(lang)}>
            Confirm & Submit
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-[13px]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-1 text-[11px] font-bold tracking-wide text-slate-500 uppercase">English</div>
          <p className="text-slate-800">{ACK_TEXT.English}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-1 text-[11px] font-bold tracking-wide text-slate-500 uppercase">हिन्दी</div>
          <p className="text-slate-800">{ACK_TEXT.Hindi}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[12px]">
          <span className="font-semibold text-slate-700">Confirmed in:</span>
          {(['English', 'Hindi'] as const).map((l) => (
            <label key={l} className="flex items-center gap-1.5">
              <input type="radio" name="ack-lang" checked={lang === l} onChange={() => setLang(l)} />
              {l === 'Hindi' ? 'हिन्दी (Hindi)' : 'English'}
            </label>
          ))}
        </div>
        <label className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-[12.5px]">
          <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>I agree / मैं सहमत हूँ — the text, version ({ACK_VERSION}) and confirmation time are stored with this submission.</span>
        </label>
      </div>
    </Modal>
  )
}

// ── Reason modal (return / reject) ───────────────────────────────────────
function ReasonModal({ title, cta, danger, onSubmit, onClose }: { title: string; cta: string; danger?: boolean; onSubmit: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('')
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} disabled={!reason.trim()} onClick={() => onSubmit(reason)}>
            {cta}
          </Button>
        </>
      }
    >
      <TextAreaField label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason is mandatory and is stored in the audit trail" />
    </Modal>
  )
}

// ── Controlled correction (Admin, approved records — UAT 24) ─────────────
function CorrectionModal({ master, rec, onClose }: { master: CashMaster; rec: CashRecord; onClose: () => void }) {
  const fields = CORRECTABLE.filter((c) => !c.kinds || c.kinds.includes(rec.kind))
  const [field, setField] = useState<CorrectableKey>(fields[0].key)
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const def = fields.find((f) => f.key === field) ?? fields[0]
  const label = (k: CorrectableKey, l: string) => (k === 'amount' ? master.meta.amountLabel : l)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    const res = await master.correctAsync(rec.id, field, value, reason)
    setBusy(false)
    if (!res.ok) {
      toast(res.error, 'error')
      return
    }
    toast(`${rec.id}: correction saved with old / new value and reason`, 'success')
    onClose()
  }
  return (
    <Modal
      title="Controlled correction"
      sub={`${rec.id} is approved & locked — changes are logged (field, old value, new value, reason).`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy || !reason.trim() || value === ''} onClick={save}>
            Save correction
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold text-ink" htmlFor="corr-field">
            Field *
          </label>
          <select
            id="corr-field"
            value={field}
            onChange={(e) => {
              setField(e.target.value as CorrectableKey)
              setValue('')
            }}
            className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px]"
          >
            {fields.map((f) => (
              <option key={f.key} value={f.key}>
                {label(f.key, f.label)}
              </option>
            ))}
          </select>
        </div>
        <TextField label="Old value" value={String(rec[field])} disabled />
        <TextField label="New value" required type={def.num ? 'number' : field === 'date' || field === 'lastDate' ? 'date' : 'text'} value={value} onChange={(e) => setValue(e.target.value)} />
        <TextAreaField label="Modification reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </Modal>
  )
}

// ── Record detail with §2.3 record controls ──────────────────────────────
export function CashRecordDetail({ master, id, listPath, formPath }: { master: CashMaster; id: string; listPath: string; formPath: string }) {
  const list = master.store.use()
  const wf = useWorkflow()
  const role = useRole()
  const navigate = useNavigate()
  const rec = list.find((r) => r.id === id)
  const [modal, setModal] = useState<'return' | 'reject' | 'correct' | null>(null)
  const [docReason, setDocReason] = useState('')
  const [upload, setUpload] = useState<FileValue>(null)
  const [busy, setBusy] = useState(false)
  const picked = useFileCapture()
  const close = useCallback(() => setModal(null), [setModal])
  const m = master.meta
  const load = master.loader.use()

  if (!rec && load.loading) return <div className="rounded-xl border border-slate-200 bg-white p-6 text-[13px] text-slate-500">Loading {id}…</div>
  if (!rec)
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-[13px]">
        Record <strong>{id}</strong> was not found in the {m.master}.{' '}
        <Link to={listPath} className="text-[#0066FF]">
          Back to list
        </Link>
      </div>
    )

  const own = isOwnRecord(rec.trail)
  const checker = canVerifyRole(role)
  const approver = canApproveRole(role)
  const run = async (p: Promise<Result>, ok: string) => {
    setBusy(true)
    const res = await p
    setBusy(false)
    if (!res.ok) toast(res.error, 'error')
    else toast(ok, 'success')
  }
  const tasks = wf.tasks.filter((t) => t.refId === rec.id)
  const emails = wf.emails.filter((e) => e.refId === rec.id)
  const docLocked = rec.locked && !approver
  const docEditable = rec.status !== 'Rejected' && !docLocked && (rec.locked || ['Draft', 'Returned for Correction', 'Pending Verification'].includes(rec.status))
  const docRun = async (action: 'Uploaded' | 'Replaced' | 'Deleted', doc: { docId?: string; name?: string; size?: number; file?: File | null }) => {
    let fileId: string | undefined
    if (apiEnabled && action !== 'Deleted') {
      const up = await makeDoc(doc.file ?? null, { name: doc.name ?? 'document', size: doc.size ?? 0 }, `${master.kind} document`, master.kind, rec.id)
      if (!up) return
      fileId = up.id
    }
    const res = await master.docActionAsync(rec.id, action, { docId: doc.docId, name: doc.name, size: doc.size, fileId }, docReason)
    if (!res.ok) toast(res.error, 'error')
    else {
      toast(`Document ${action.toLowerCase()} — history updated`, 'success')
      setDocReason('')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" icon={<ArrowLeft size={14} />} onClick={() => navigate(listPath)}>
          Back to list
        </Button>
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900">{rec.id}</h1>
        <StatusBadge status={rec.status} locked={rec.locked} />
        <FundingChip kind={rec.kind} />
        <div className="ml-auto flex flex-wrap gap-2">
          {(rec.status === 'Draft' || rec.status === 'Returned for Correction') && canCreateRole(role) && (
            <Button size="sm" icon={<Pencil size={13} />} onClick={() => navigate(`${formPath}?edit=${rec.id}`)}>
              {rec.status === 'Draft' ? 'Edit & Submit' : 'Correct & Resubmit'}
            </Button>
          )}
          {rec.status === 'Pending Verification' && checker && (
            <Button size="sm" icon={<ShieldCheck size={13} />} disabled={busy} onClick={() => run(master.verifyAsync(rec.id), `${rec.id} verified — Admin approval task created`)}>
              Verify (CRM)
            </Button>
          )}
          {rec.status === 'Pending Approval' && approver && (
            <Button size="sm" icon={<CheckCircle2 size={13} />} disabled={busy} onClick={() => run(master.approveAsync(rec.id), `${rec.id} approved — saved & locked in ${m.master}`)}>
              Approve & Lock
            </Button>
          )}
          {(rec.status === 'Pending Verification' || rec.status === 'Pending Approval') && (rec.status === 'Pending Verification' ? checker : approver) && (
            <>
              <Button size="sm" variant="secondary" icon={<RotateCcw size={13} />} onClick={() => setModal('return')}>
                Return for Correction
              </Button>
              <Button size="sm" variant="danger" icon={<XCircle size={13} />} onClick={() => setModal('reject')}>
                Reject
              </Button>
            </>
          )}
          {rec.locked && approver && (
            <Button size="sm" variant="secondary" icon={<Pencil size={13} />} onClick={() => setModal('correct')}>
              Controlled correction
            </Button>
          )}
        </div>
      </div>

      {own && (rec.status === 'Pending Verification' || rec.status === 'Pending Approval') && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          Maker-checker: you ({actorName()}) created / submitted this record, so verification, approval, return and rejection by you are blocked.
        </div>
      )}
      {rec.status === 'Returned for Correction' && (
        <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-[12px] text-orange-800">
          <RotateCcw size={15} className="mt-0.5 shrink-0" />
          Returned by {rec.trail.returnedBy}: {rec.trail.returnReason}
        </div>
      )}
      {rec.status === 'Rejected' && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
          <XCircle size={15} className="mt-0.5 shrink-0" />
          Rejected by {rec.trail.returnedBy}: {rec.rejectReason}
        </div>
      )}

      <Panel title="Identification (from Site / Franchise / Account masters)" icon={<FileText size={16} />}>
        <KV
          items={[
            { label: `${rec.kind === 'CBR' ? 'CBR' : 'Loading'} Date`, value: dmy(rec.date) },
            { label: 'Form Name', value: rec.formName },
            { label: 'Site ID', value: rec.siteId },
            { label: 'ATM ID', value: rec.atmId },
            { label: 'Franchise', value: `${rec.franchiseName} · ${rec.frId}` },
            { label: 'ATM Location', value: rec.atmLocation },
            { label: 'Bank', value: rec.bank },
            { label: 'WLA Account', value: rec.wlaAccount },
            { label: 'Settlement Exercise', value: rec.settlementExercise },
            { label: 'Funding Model', value: `${rec.fundingModel} (${rec.siteType})` },
            { label: 'Last Date', value: dmy(rec.lastDate) },
            { label: 'Entry Channel', value: rec.channel },
          ]}
        />
      </Panel>

      <Panel title="Cash details" icon={<FileText size={16} />}>
        <KV
          items={[
            { label: m.amountLabel, value: inr(rec.amount) },
            { label: 'Daily Indent', value: inr(rec.dailyIndent) },
            { label: 'Cash Withdrawal', value: inr(rec.cashWithdrawal) },
            ...(rec.kind === 'Cash Loading'
              ? [
                  { label: 'Opening Balance', value: inr(rec.openingBalance) },
                  { label: 'Balance (provisional formula)', value: inr(clBalance(rec)) },
                ]
              : []),
            { label: 'Remarks', value: rec.remarks },
          ]}
        />
        {rec.kind === 'Cash Loading' && <p className="mt-3 text-[11px] text-slate-500">Balance = Opening + Loading − Withdrawal. Provisional — the exact formula is to be frozen with Finance / Operations (§3.1).</p>}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Submitted / Verified / Approved" icon={<ShieldCheck size={16} />}>
          <table className="w-full text-[12px]">
            <tbody className="divide-y divide-slate-100">
              {[
                ['Created', rec.trail.createdBy, rec.trail.createdAt],
                ['Submitted', rec.trail.submittedBy, rec.trail.submittedAt],
                ['Verified (CRM)', rec.trail.verifiedBy, rec.trail.verifiedAt],
                ['Approved (Admin)', rec.trail.approvedBy, rec.trail.approvedAt],
                ['Returned / Rejected', rec.trail.returnedBy ? `${rec.trail.returnedBy} — ${rec.trail.returnReason ?? ''}` : undefined, undefined],
              ].map(([k, by, at]) => (
                <tr key={k}>
                  <td className="py-1.5 pr-3 text-slate-500">{k}</td>
                  <td className="py-1.5 pr-3 font-medium text-slate-900">{by ?? '—'}</td>
                  <td className="py-1.5 text-slate-500">{at ? dt(at) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Acknowledgement record" icon={<CheckCircle2 size={16} />}>
          {rec.trail.acknowledgement ? (
            <div className="space-y-2 text-[12px]">
              <KV
                items={[
                  { label: 'Version', value: rec.trail.acknowledgement.version },
                  { label: 'Confirmed in', value: rec.trail.acknowledgement.lang },
                  { label: 'Confirmed by', value: rec.trail.acknowledgement.by },
                  { label: 'Confirmation time', value: dt(rec.trail.acknowledgement.at) },
                ]}
              />
              <p className="rounded-md bg-slate-50 p-2 whitespace-pre-line text-slate-700">{rec.trail.acknowledgement.text}</p>
            </div>
          ) : (
            <p className="text-[12px] text-slate-500">Not yet acknowledged — the bilingual popup appears on submission.</p>
          )}
        </Panel>
      </div>

      <Panel title="Supporting documents" icon={<Upload size={16} />}>
        {rec.documents.length === 0 && <p className="mb-2 text-[12px] text-slate-500">No documents attached.</p>}
        <ul className="mb-3 divide-y divide-slate-100 text-[12px]">
          {rec.documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 py-2">
              <FileText size={14} className="text-[#0066FF]" />
              <span className="font-medium text-slate-900">{d.name}</span>
              <span className="text-slate-500">
                {fmtSize(d.size)} · {d.by} · {dt(d.at)}
              </span>
              {docEditable && (
                <span className="ml-auto flex gap-2">
                  <label className="cursor-pointer text-[11px] font-semibold text-[#0066FF] hover:underline">
                    Replace
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) void docRun('Replaced', { docId: d.id, name: f.name, size: f.size, file: f })
                        e.target.value = ''
                      }}
                    />
                  </label>
                  <button type="button" className="text-[11px] font-semibold text-red-600 hover:underline" onClick={() => void docRun('Deleted', { docId: d.id })}>
                    Delete
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
        {docEditable && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div {...picked.capture}>
              <FileDrop
                compact
                upload={false}
                value={upload}
                onChange={(f) => {
                  if (f) {
                    void docRun('Uploaded', { ...f, file: picked.ref.current })
                    setUpload(null)
                  } else setUpload(null)
                }}
                label="Upload supporting document"
              />
            </div>
            {rec.locked && <TextField label="Reason (required — record is locked)" required value={docReason} onChange={(e) => setDocReason(e.target.value)} />}
          </div>
        )}
        <h3 className="mt-4 mb-2 text-[12px] font-bold text-slate-700">Document upload / replacement / deletion history</h3>
        <HistoryTable heads={['When', 'By', 'Action', 'Document']} rows={rec.trail.documents.map((d) => [dt(d.at), d.by, d.action, d.name])} empty="No document activity." />
      </Panel>

      <Panel title="Modification log (old value / new value / reason)" icon={<Pencil size={16} />}>
        <HistoryTable heads={['When', 'By', 'Field', 'Old value', 'New value', 'Reason']} rows={rec.trail.modifications.map((x) => [dt(x.at), x.by, x.field, x.oldValue, x.newValue, x.reason])} empty="No modifications after approval." />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Status & approval trail" icon={<RotateCcw size={16} />}>
          <ol className="space-y-2 text-[12px]">
            {rec.statusLog.map((s, i) => (
              <li key={`${s.at}-${i}`} className="flex gap-2">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#0066FF]" />
                <div>
                  <StatusBadge status={s.status} /> <span className="text-slate-600">by {s.by}</span> <span className="text-slate-400">· {dt(s.at)}</span>
                  {s.note && <div className="text-slate-600">{s.note}</div>}
                </div>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Tasks & email references (workflow engine)" icon={<Send size={16} />}>
          <HistoryTable heads={['Task', 'Title', 'Status']} rows={tasks.map((t) => [t.id, t.title, t.status])} empty="No tasks yet (seeded records predate the engine)." />
          <div className="h-3" />
          <HistoryTable heads={['Email', 'Template', 'To', 'Subject']} rows={emails.map((e) => [e.id, e.templateCode, e.to.join(', '), e.subject])} empty="No emails yet." />
        </Panel>
      </div>

      {modal === 'return' && (
        <ReasonModal
          title={`Return ${rec.id} for correction`}
          cta="Return for Correction"
          onClose={close}
          onSubmit={(reason) => {
            void run(master.returnAsync(rec.id, reason), `${rec.id} returned for correction`)
            setModal(null)
          }}
        />
      )}
      {modal === 'reject' && (
        <ReasonModal
          title={`Reject ${rec.id}`}
          cta="Reject"
          danger
          onClose={close}
          onSubmit={(reason) => {
            void run(master.rejectAsync(rec.id, reason), `${rec.id} rejected`)
            setModal(null)
          }}
        />
      )}
      {modal === 'correct' && <CorrectionModal master={master} rec={rec} onClose={close} />}
    </div>
  )
}

function HistoryTable({ heads, rows, empty }: { heads: string[]; rows: string[][]; empty: string }) {
  if (!rows.length) return <p className="text-[12px] text-slate-500">{empty}</p>
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-100">
      <table className="w-full text-left text-[11.5px]">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {heads.map((h) => (
              <th key={h} className="px-2.5 py-1.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-800">
          {rows.map((r, i) => (
            <tr key={`${r[0]}-${i}`}>
              {r.map((c, j) => (
                <td key={`${heads[j]}`} className="px-2.5 py-1.5 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Listing / search / filter (+ detail via ?record=) ────────────────────
const TABS: { key: string; label: string; match: (r: CashRecord) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'pv', label: 'Pending Verification', match: (r) => r.status === 'Pending Verification' },
  { key: 'pa', label: 'Pending Approval', match: (r) => r.status === 'Pending Approval' },
  { key: 'ret', label: 'Returned', match: (r) => r.status === 'Returned for Correction' },
  { key: 'master', label: 'Master (Approved & Locked)', match: (r) => r.locked },
  { key: 'rej', label: 'Rejected', match: (r) => r.status === 'Rejected' },
  { key: 'draft', label: 'Draft', match: (r) => r.status === 'Draft' },
]

export function CashRecordList({ master, listPath, formPath, intro }: { master: CashMaster; listPath: string; formPath: string; intro?: ReactNode }) {
  const list = master.store.use()
  const load = master.loader.use()
  const role = useRole()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const recordId = params.get('record')
  const [tab, setTab] = useState(params.get('tab') ?? 'all')
  const [q, setQ] = useState('')
  const [fr, setFr] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const m = master.meta
  const isCl = master.kind === 'Cash Loading'

  const franchises = useMemo(() => [...new Set(list.map((r) => r.franchiseName))].sort(), [list])
  const rows = useMemo(() => {
    const t = TABS.find((x) => x.key === tab) ?? TABS[0]
    const needle = q.trim().toLowerCase()
    return list
      .filter(t.match)
      .filter((r) => !needle || [r.id, r.atmId, r.siteId, r.franchiseName, r.frId].some((v) => v.toLowerCase().includes(needle)))
      .filter((r) => !fr || r.franchiseName === fr)
      .filter((r) => (!from || r.date >= from) && (!to || r.date <= to))
      .sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)))
  }, [list, tab, q, fr, from, to])
  const shown = rows.slice((page - 1) * pageSize, page * pageSize)

  if (recordId) return <CashRecordDetail master={master} id={recordId} listPath={listPath} formPath={formPath} />

  const open = (id: string) => setParams({ record: id })
  const exportCsv = () =>
    downloadCsv(
      `${m.master.toLowerCase().replace(/\s+/g, '-')}-${today()}`,
      ['Funding Model', 'Record ID', 'Date', 'Form', 'ATM ID', 'Site ID', 'Franchise ID', 'Franchise', 'Bank', 'WLA Account', m.amountLabel, 'Daily Indent', 'Cash Withdrawal', ...(isCl ? ['Opening Balance', 'Balance (provisional)'] : []), 'Status', 'Locked', 'Channel', 'Submitted By', 'Verified By', 'Approved By'],
      rows.map((r) => [
        r.fundingModel, r.id, r.date, r.formName, r.atmId, r.siteId, r.frId, r.franchiseName, r.bank, r.wlaAccount, String(r.amount), String(r.dailyIndent), String(r.cashWithdrawal),
        ...(isCl ? [String(r.openingBalance), String(clBalance(r))] : []),
        r.status, r.locked ? 'Yes' : 'No', r.channel, r.trail.submittedBy ?? '', r.trail.verifiedBy ?? '', r.trail.approvedBy ?? '',
      ]),
    )
  const reset = () => {
    setQ('')
    setFr('')
    setFrom('')
    setTo('')
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {intro}
      {apiEnabled && (load.loading || load.error) && (
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] ${load.error ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
          {load.error ? `Could not load the ${m.master}: ${load.error}` : `Loading the ${m.master}…`}
          {load.error && (
            <button type="button" className="ml-auto font-semibold underline" onClick={() => void master.loader.reload()}>
              Retry
            </button>
          )}
        </div>
      )}
      <CashKpis master={master} />
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key)
                setPage(1)
              }}
              className={`rounded-full px-3 py-1 text-[12px] font-semibold ${tab === t.key ? 'bg-[#0066FF] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {t.label} <span className="opacity-75">({list.filter(t.match).length})</span>
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="secondary" icon={<Download size={13} />} onClick={exportCsv}>
              Export CSV
            </Button>
            {canCreateRole(role) && (
              <Button size="sm" icon={<Plus size={13} />} onClick={() => navigate(formPath)}>
                New {master.kind === 'CBR' ? 'CBR' : 'Cash Loading'}
              </Button>
            )}
          </div>
        </div>
        <div className="grid gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-[11px] font-semibold text-ink" htmlFor={`${m.prefix}-search`}>
              Search
            </label>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute top-2.5 left-2.5 text-slate-400" />
              <input
                id={`${m.prefix}-search`}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setPage(1)
                }}
                placeholder="Record ID, ATM ID, Site ID, Franchise"
                className="h-9 w-full rounded-md border border-line bg-white pr-2 pl-8 text-[12.5px] outline-none focus:border-primary"
              />
            </div>
          </div>
          <SelectField label="Franchise" value={fr} options={franchises} placeholder="All franchises" onChange={(e) => { setFr(e.target.value); setPage(1) }} />
          <TextField label="From date" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} />
          <TextField label="To date" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} />
          <div className="flex items-end gap-2">
            <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-semibold text-slate-600" title="Funding model is fixed for this register (§19.1)">
              <Lock size={11} className="mr-1" /> {m.funding}
            </div>
            <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={reset}>
              Reset
            </Button>
          </div>
        </div>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-[12px]">
            <thead className="border-y border-blue-100 bg-[#EAF2FD] text-[11.5px] font-bold text-slate-800">
              <tr>
                {['Record ID', 'Date', 'ATM ID', 'Site ID', 'Franchise', 'Form', m.amountLabel, 'Daily Indent', 'Withdrawal', ...(isCl ? ['Balance*'] : []), 'Status', 'Channel', ''].map((h) => (
                  <th key={h || 'action'} className="px-3 py-2.5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {shown.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2 font-semibold text-[#0066FF]">
                    <button type="button" onClick={() => open(r.id)} className="hover:underline">
                      {r.id}
                    </button>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{dmy(r.date)}</td>
                  <td className="px-3 py-2 font-medium">{r.atmId}</td>
                  <td className="px-3 py-2">{r.siteId}</td>
                  <td className="px-3 py-2">{r.franchiseName}</td>
                  <td className="px-3 py-2">{r.formName}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{inr(r.amount)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{inr(r.dailyIndent)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{inr(r.cashWithdrawal)}</td>
                  {isCl && <td className="px-3 py-2 text-right whitespace-nowrap">{inr(clBalance(r))}</td>}
                  <td className="px-3 py-2">
                    <StatusBadge status={r.status} locked={r.locked} />
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-500">{r.channel}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => open(r.id)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0066FF] hover:underline">
                      <Eye size={13} /> View
                    </button>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={isCl ? 13 : 12} className="px-3 py-8 text-center text-slate-500">
                    No {m.master} records match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={rows.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} />
        {isCl && <p className="px-4 pb-3 text-[11px] text-slate-500">* Balance = Opening + Loading − Withdrawal (provisional; formula to be frozen with Finance / Operations).</p>}
      </section>
    </div>
  )
}

// ── New / edit form (§2.1) ───────────────────────────────────────────────
type FormState = { atmId: string; formName: string; date: string; lastDate: string; amount: string; dailyIndent: string; cashWithdrawal: string; openingBalance: string; remarks: string; documents: CashDoc[] }

export function CashRecordForm(props: { master: CashMaster; listPath: string; editId?: string }) {
  props.master.store.use()
  const load = props.master.loader.use()
  const existing = props.editId ? props.master.get(props.editId) : undefined
  if (props.editId && !existing && (load.loading || !load.loaded)) return <div className="rounded-xl border border-slate-200 bg-white p-6 text-[13px] text-slate-500">Loading {props.editId}…</div>
  return <CashRecordFormInner key={existing ? 'loaded' : 'new'} {...props} />
}

function CashRecordFormInner({ master, listPath, editId }: { master: CashMaster; listPath: string; editId?: string }) {
  const role = useRole()
  const navigate = useNavigate()
  const sites = useSites()
  const list = master.store.use()
  const m = master.meta
  const existing = editId ? master.get(editId) : undefined
  const [f, setF] = useState<FormState>(() => ({
    atmId: existing?.atmId ?? '',
    formName: existing?.formName ?? m.formNames[0],
    date: existing?.date ?? today(),
    lastDate: existing?.lastDate ?? '',
    amount: existing ? String(existing.amount) : '',
    dailyIndent: existing ? String(existing.dailyIndent) : '',
    cashWithdrawal: existing ? String(existing.cashWithdrawal) : '',
    openingBalance: existing ? String(existing.openingBalance) : '',
    remarks: existing?.remarks ?? '',
    documents: existing?.documents ?? [],
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [ack, setAck] = useState<null | { asFranchise: boolean }>(null)
  const [upload, setUpload] = useState<FileValue>(null)
  const [busy, setBusy] = useState(false)
  const picked = useFileCapture()
  const closeAck = useCallback(() => setAck(null), [setAck])
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }))

  const check = useMemo(() => (f.atmId.trim() ? checkSiteFor(master.kind, f.atmId) : null), [f.atmId, master.kind])
  const allowed = useMemo(() => sites.sites.filter((s) => s.siteType === m.siteType).slice(0, 60), [sites, m.siteType])
  const wrongExample = useMemo(() => sites.sites.find((s) => s.siteType === (m.siteType === 'FFM' ? 'SF' : 'FFM'))?.atmId, [sites, m.siteType])
  const lastApproved = useMemo(() => (check?.ok ? list.filter((r) => r.atmId === check.snap.atmId && r.locked && r.id !== editId).sort((a, b) => b.date.localeCompare(a.date))[0] : undefined), [check, list, editId])
  const snap = check?.snap
  const isCl = master.kind === 'Cash Loading'
  const n = (v: string) => (v === '' ? 0 : Number(v))

  if (editId && !existing)
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-[13px]">
        Record {editId} not found. <Link to={listPath} className="text-[#0066FF]">Back</Link>
      </div>
    )
  if (existing && existing.status !== 'Draft' && existing.status !== 'Returned for Correction')
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-[13px]">
        {existing.id} is {existing.status}
        {existing.locked ? ' and locked — use Controlled correction on the detail page (Admin only).' : ' and cannot be edited.'}{' '}
        <Link to={`${listPath}?record=${existing.id}`} className="text-[#0066FF]">
          Open record
        </Link>
      </div>
    )
  if (!canCreateRole(role))
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-[13px]">Your role ({role}) can view {m.master} records but cannot create entries.</div>

  const validate = () => {
    const e: Record<string, string> = {}
    if (!check) e.atmId = 'ATM ID is required.'
    else if (!check.ok) e.atmId = check.error
    if (!f.date) e.date = 'Date is required.'
    if (!(n(f.amount) > 0)) e.amount = `${m.amountLabel} must be greater than 0.`
    for (const k of ['dailyIndent', 'cashWithdrawal', 'openingBalance'] as const) if (f[k] !== '' && (Number.isNaN(Number(f[k])) || Number(f[k]) < 0)) e[k] = 'Enter a valid amount.'
    if (f.lastDate && f.date && f.lastDate > f.date) e.lastDate = 'Last date cannot be after the record date.'
    setErrors(e)
    return Object.keys(e).length === 0
  }
  const input = () => ({ atmId: f.atmId, formName: f.formName, date: f.date, lastDate: f.lastDate || lastApproved?.date || '', amount: n(f.amount), dailyIndent: n(f.dailyIndent), cashWithdrawal: n(f.cashWithdrawal), openingBalance: isCl ? n(f.openingBalance) : 0, remarks: f.remarks, documents: f.documents })

  const saveDraft = async () => {
    if (!check?.ok) {
      setErrors({ atmId: check ? check.error : 'ATM ID is required.' })
      toast(check ? check.error : 'ATM ID is required.', 'error')
      return
    }
    setBusy(true)
    const res = await master.saveDraftAsync(input(), { id: editId })
    setBusy(false)
    if (!res.ok) toast(res.error, 'error')
    else {
      toast(`Draft ${res.id} saved`, 'info')
      navigate(`${listPath}?record=${res.id}`)
    }
  }
  const startSubmit = (asFranchise: boolean) => {
    if (!validate()) {
      toast(check && !check.ok ? check.error : 'Please fix the highlighted fields.', 'error')
      return
    }
    if (!f.documents.length) {
      setErrors((p) => ({ ...p, documents: 'Attach at least one supporting document.' }))
      toast('Attach at least one supporting document (counter slip / proof).', 'error')
      return
    }
    setAck({ asFranchise })
  }
  const confirm = async (lang: 'Hindi' | 'English') => {
    const asFranchise = ack?.asFranchise ?? false
    setAck(null)
    setBusy(true)
    const saved = await master.saveDraftAsync(input(), { id: editId, asFranchise })
    if (!saved.ok) {
      setBusy(false)
      toast(saved.error, 'error')
      return
    }
    const res = await master.submitAsync(saved.id, { lang, asFranchise })
    setBusy(false)
    if (!res.ok) {
      toast(`${res.error} (saved as draft ${saved.id})`, 'error')
      navigate(`${listPath}?record=${saved.id}`)
      return
    }
    toast(`${saved.id} submitted — Pending Verification; CRM verification task created`, 'success')
    navigate(`${listPath}?record=${saved.id}`)
  }

  const ro = (label: string, value?: string) => <TextField label={label} value={value ?? ''} disabled placeholder="Fetched from master" />

  return (
    <div className="space-y-4">
      {existing?.status === 'Returned for Correction' && (
        <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-[12px] text-orange-800">
          <RotateCcw size={15} className="mt-0.5 shrink-0" />
          Returned by {existing.trail.returnedBy}: {existing.trail.returnReason} — correct the data and resubmit (acknowledgement is taken again).
        </div>
      )}
      <Panel title="ATM & Franchise (fetched from Site / Franchise / Bank masters)" icon={<Search size={16} />} right={<FundingChip kind={master.kind} />}>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <TextField
              label="ATM ID"
              required
              list={`${m.prefix}-atm-list`}
              value={f.atmId}
              onChange={(e) => set('atmId', e.target.value)}
              placeholder="Search ATM ID / Site ID"
              error={errors.atmId}
              disabled={!!existing}
              hint={existing ? 'ATM cannot change after creation' : undefined}
            />
            <datalist id={`${m.prefix}-atm-list`}>
              {allowed.map((s) => (
                <option key={s.siteId} value={s.atmId}>
                  {s.siteId} · {s.location}
                </option>
              ))}
            </datalist>
          </div>
          {ro('CRM / Franchise Name', snap ? `${snap.franchiseName} · ${snap.frId}` : '')}
          <SelectField label="Form Name" required value={f.formName} options={m.formNames} onChange={(e) => set('formName', e.target.value)} />
          {ro('Site ID', snap?.siteId)}
          {ro('ATM Location', snap?.atmLocation)}
          {ro('Bank Name', snap?.bank)}
          {ro('WLA Account', snap?.wlaAccount)}
          {ro('Settlement Exercise', snap?.settlementExercise)}
        </div>
        {check && !check.ok && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            {check.error}
          </div>
        )}
        {check?.ok && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
            <CheckCircle2 size={15} /> {snap?.fundingModel} site — {master.kind} form opened. Identification fields are read-only (from masters).
          </div>
        )}
        {!f.atmId && wrongExample && (
          <p className="mt-2 text-[11px] text-slate-500">
            Only {m.funding} ATMs are listed. Typing a {m.otherFunding} ATM (e.g. {wrongExample}) is refused.
          </p>
        )}
      </Panel>

      <Panel title="Cash details" icon={<FileText size={16} />}>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <TextField label={isCl ? 'Loading Date' : 'CBR Date'} required type="date" value={f.date} onChange={(e) => set('date', e.target.value)} error={errors.date} />
          <TextField label="Last Date" type="date" value={f.lastDate} onChange={(e) => set('lastDate', e.target.value)} error={errors.lastDate} hint={lastApproved ? `Last approved: ${dmy(lastApproved.date)} (${lastApproved.id})` : 'Last cash replacement / relevant date'} />
          <TextField label={`${m.amountLabel} (₹)`} required type="number" min={0} value={f.amount} onChange={(e) => set('amount', e.target.value)} error={errors.amount} hint={isCl ? 'Cash loaded' : 'Cash replenished amount'} />
          <TextField label="Daily Indent (₹)" type="number" min={0} value={f.dailyIndent} onChange={(e) => set('dailyIndent', e.target.value)} error={errors.dailyIndent} hint="Submitted by franchise (app)" />
          <TextField label="Cash Withdrawal (₹)" type="number" min={0} value={f.cashWithdrawal} onChange={(e) => set('cashWithdrawal', e.target.value)} error={errors.cashWithdrawal} hint="Submitted by franchise (app)" />
          {isCl && (
            <>
              <TextField label="Opening Balance (₹)" type="number" min={0} value={f.openingBalance} onChange={(e) => set('openingBalance', e.target.value)} error={errors.openingBalance} />
              <TextField label="Balance (₹) — provisional" value={inr(clBalance({ openingBalance: n(f.openingBalance), amount: n(f.amount), cashWithdrawal: n(f.cashWithdrawal) }))} disabled hint="Opening + Loading − Withdrawal (to be frozen with Finance / Ops)" />
            </>
          )}
          <TextAreaField className="sm:col-span-2" label="Remarks" value={f.remarks} onChange={(e) => set('remarks', e.target.value)} />
        </div>
      </Panel>

      <Panel title="Supporting documents" icon={<Upload size={16} />}>
        <ul className="mb-3 divide-y divide-slate-100 text-[12px]">
          {f.documents.map((d) => (
            <li key={d.id} className="flex items-center gap-2 py-2">
              <FileText size={14} className="text-[#0066FF]" />
              <span className="font-medium">{d.name}</span>
              <span className="text-slate-500">{fmtSize(d.size)}</span>
              <button type="button" className="ml-auto text-red-600" aria-label={`Remove ${d.name}`} onClick={() => set('documents', f.documents.filter((x) => x.id !== d.id))}>
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
        <div {...picked.capture}>
          <FileDrop
            compact
            upload={false}
            value={upload}
            disabled={busy}
            onChange={(v) => {
              setUpload(null)
              if (!v) return
              const file = picked.ref.current
              setBusy(true)
              void makeDoc(file, v, `${master.kind} supporting document`, master.kind).then((doc) => {
                setBusy(false)
                if (!doc) return
                setF((p) => ({ ...p, documents: [...p.documents, doc] }))
                setErrors((p) => ({ ...p, documents: '' }))
              })
            }}
            label="Upload counter slip / proof"
            hint="PDF / image, max 5 MB — upload, replace and delete history is kept on the record"
          />
        </div>
        {errors.documents && <p className="mt-1 text-[11px] text-brand-red">{errors.documents}</p>}
      </Panel>

      <Panel title="Acknowledgement" icon={<CheckCircle2 size={16} />}>
        <p className="text-[12px] text-slate-600">
          On submit a Hindi + English acknowledgement popup ({ACK_VERSION}) is shown; the text, version and confirmation timestamp are stored with the record. <strong>Submit as Franchise</strong> records the franchise as maker (as from the mobile app); <strong>Submit (authorized entry)</strong> records you as maker — you then cannot verify it (maker-checker).
        </p>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" icon={<ArrowLeft size={15} />} onClick={() => navigate(listPath)}>
          Back
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => void saveDraft()}>
            Save Draft
          </Button>
          <Button variant="secondary" disabled={busy} icon={<Send size={14} />} onClick={() => startSubmit(false)}>
            Submit (authorized entry)
          </Button>
          <Button disabled={busy} icon={<Send size={14} />} onClick={() => startSubmit(true)}>
            Submit as Franchise
          </Button>
        </div>
      </div>

      {ack && <AckModal kind={master.kind} atmId={f.atmId} amount={n(f.amount)} onConfirm={(l) => void confirm(l)} onClose={closeAck} />}
    </div>
  )
}
