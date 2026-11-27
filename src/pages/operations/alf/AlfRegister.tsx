// ALF Register (Operations §4) — request / verification / email / disbursement / cash loading mapping /
// recovery & outstanding report. ALF Master is separate and linked to Cash Loading Master records.
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, Eye, HandCoins, LineChart, Link2, Mail, Pencil, Plus, Send, ShieldCheck, Wallet, XCircle } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { useRole } from '@/lib/rbac'
import { actorName, isOwnRecord, useWorkflow } from '@/data/workflow'
import { canApproveRole, canCreateRole, canVerifyRole } from '@/data/cbr'
import { clMaster } from '@/data/cashLoadingRegisterStore'
import { dmy } from '@/data/cbrSites'
import { Crumbs, FundingChip, SeparationPanel } from '@/pages/cbr/CashRecordUi'
import { inr } from '@/pages/cbr/cashUtils'
import {
  ALF_STATUSES,
  addRecovery,
  approveDisburseAlf,
  closeAlf,
  mapCashLoading,
  outstandingOf,
  overdueDays,
  recoveredOf,
  rejectAlf,
  submitAlf,
  submitAlfForEmail,
  alfLoader,
  useAlf,
  verifyAlf,
  type AlfRecord,
  type AlfResult,
} from './alfData'

const dt = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
const today = () => new Date().toISOString().slice(0, 10)
const done = async (p: AlfResult | Promise<AlfResult>, ok: string): Promise<AlfResult> => {
  const res = await p
  if (res.ok) toast(ok, 'success')
  else toast(res.error, 'error')
  return res
}

function Panel({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
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
        <div key={i.label}>
          <div className="text-[11px] text-slate-500">{i.label}</div>
          <div className="mt-0.5 text-[12.5px] font-medium text-slate-900">{i.value || '—'}</div>
        </div>
      ))}
    </div>
  )
}

// ── Modals ───────────────────────────────────────────────────────────────
function DisburseModal({ rec, onClose }: { rec: AlfRecord; onClose: () => void }) {
  const [amount, setAmount] = useState(String(rec.requestedAmount))
  const [date, setDate] = useState(today())
  const [ref, setRef] = useState('')
  const [expected, setExpected] = useState('')
  const save = async () => {
    const res = await done(approveDisburseAlf(rec.id, { approvedAmount: Number(amount) || 0, disbursementDate: date, disbursementRef: ref.trim(), expectedRecoveryDate: expected }), `${rec.id} approved — disbursement recorded, recovery task created`)
    if (res.ok) onClose()
  }
  return (
    <Modal title={`Approve & record disbursement — ${rec.id}`} sub={`Requested ${inr(rec.requestedAmount)} · ${rec.purpose}`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Approve & Record</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Approved Amount (₹)" required type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <TextField label="Disbursement Date" required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <TextField label="Disbursement Ref (UTR)" value={ref} onChange={(e) => setRef(e.target.value)} />
        <TextField label="Expected Recovery / Adjustment Date" required type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
      </div>
    </Modal>
  )
}

function RecoveryModal({ rec, onClose }: { rec: AlfRecord; onClose: () => void }) {
  const [date, setDate] = useState(today())
  const [amount, setAmount] = useState(String(outstandingOf(rec)))
  const [mode, setMode] = useState<'Recovery' | 'Adjustment'>('Recovery')
  const [clRef, setClRef] = useState(rec.clRefs[0] ?? '')
  const [remarks, setRemarks] = useState('')
  const save = async () => {
    const res = await done(addRecovery(rec.id, { date, amount: Number(amount) || 0, mode, clRef: clRef || undefined, remarks }), `${mode} recorded on ${rec.id}`)
    if (res.ok) onClose()
  }
  return (
    <Modal title={`Recovery / adjustment — ${rec.id}`} sub={`Outstanding ${inr(outstandingOf(rec))}`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Type" required value={mode} options={['Recovery', 'Adjustment']} onChange={(e) => setMode((e.target.value || 'Recovery') as 'Recovery' | 'Adjustment')} />
        <TextField label="Actual Date" required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <TextField label="Amount (₹)" required type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <SelectField label="Against Cash Loading record" value={clRef} options={rec.clRefs} placeholder="— none —" onChange={(e) => setClRef(e.target.value)} />
        <TextAreaField className="sm:col-span-2" label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </div>
    </Modal>
  )
}

function MappingModal({ rec, onClose }: { rec: AlfRecord; onClose: () => void }) {
  const cl = clMaster.store.use()
  const options = cl.filter((c) => c.atmId === rec.atmId && c.status !== 'Rejected')
  const [sel, setSel] = useState<string[]>(rec.clRefs)
  const save = async () => {
    const res = await done(mapCashLoading(rec.id, sel), `${rec.id} mapped to ${sel.length} Cash Loading record(s)`)
    if (res.ok) onClose()
  }
  return (
    <Modal title={`Map Cash Loading records — ${rec.id}`} sub={`Cash Loading Master records of ATM ${rec.atmId} (Self Funding)`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save mapping</Button></>}>
      {options.length === 0 && <p className="text-[12.5px] text-slate-500">No Cash Loading records exist for this ATM yet.</p>}
      <ul className="divide-y divide-slate-100 text-[12.5px]">
        {options.map((c) => (
          <li key={c.id} className="flex items-center gap-2 py-2">
            <input type="checkbox" checked={sel.includes(c.id)} onChange={(e) => setSel((p) => (e.target.checked ? [...p, c.id] : p.filter((x) => x !== c.id)))} aria-label={`Map ${c.id}`} />
            <span className="font-semibold">{c.id}</span>
            <span className="text-slate-500">{dmy(c.date)} · {inr(c.amount)}</span>
            <Badge tone={toneFor(c.status)}>{c.status}</Badge>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

function RejectModal({ rec, onClose }: { rec: AlfRecord; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const save = async () => {
    const res = await done(rejectAlf(rec.id, reason), `${rec.id} rejected`)
    if (res.ok) onClose()
  }
  return (
    <Modal title={`Reject ${rec.id}`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" disabled={!reason.trim()} onClick={save}>Reject</Button></>}>
      <TextAreaField label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
    </Modal>
  )
}

// ── Detail ───────────────────────────────────────────────────────────────
function AlfDetail({ id }: { id: string }) {
  const list = useAlf()
  const wf = useWorkflow()
  const role = useRole()
  const navigate = useNavigate()
  const [modal, setModal] = useState<'disburse' | 'recovery' | 'map' | 'reject' | null>(null)
  const close = useCallback(() => setModal(null), [setModal])
  const rec = list.find((r) => r.id === id)
  const load = alfLoader.getState()
  if (!rec && load.loading) return <div className="rounded-xl border border-slate-200 bg-white p-6 text-[13px] text-slate-500">Loading {id}…</div>
  if (!rec)
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-[13px]">
        ALF {id} not found. <Link to="/operations/alf" className="text-[#0066FF]">Back</Link>
      </div>
    )
  const checker = canVerifyRole(role)
  const approver = canApproveRole(role)
  const own = isOwnRecord(rec.trail)
  const tasks = wf.tasks.filter((t) => t.refId === rec.id)
  const emails = wf.emails.filter((e) => e.refId === rec.id)
  const od = overdueDays(rec)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" icon={<ArrowLeft size={14} />} onClick={() => navigate('/operations/alf')}>
          Back to register
        </Button>
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900">{rec.id}</h1>
        <Badge tone={toneFor(rec.status)}>{rec.status}</Badge>
        {od > 0 && <Badge tone="red">Recovery overdue {od} d</Badge>}
        <div className="ml-auto flex flex-wrap gap-2">
          {rec.status === 'Draft' && canCreateRole(role) && (
            <>
              <Button size="sm" variant="secondary" icon={<Pencil size={13} />} onClick={() => navigate(`/operations/alf/new?edit=${rec.id}`)}>
                Edit
              </Button>
              <Button size="sm" icon={<Send size={13} />} onClick={() => void done(submitAlf(rec.id), `${rec.id} submitted — verification task created`)}>
                Submit
              </Button>
            </>
          )}
          {rec.status === 'Submitted' && checker && (
            <Button size="sm" icon={<ShieldCheck size={13} />} onClick={() => void done(verifyAlf(rec.id), `${rec.id} verified — submit it for email next`)}>
              Verify (CRM / Ops)
            </Button>
          )}
          {rec.status === 'Verified' && !rec.emailSubmittedAt && checker && (
            <Button size="sm" icon={<Mail size={13} />} onClick={() => void done(submitAlfForEmail(rec.id), `${rec.id} submitted for email — Admin approval task created`)}>
              Submit for Email
            </Button>
          )}
          {rec.status === 'Verified' && rec.emailSubmittedAt && approver && (
            <Button size="sm" icon={<Wallet size={13} />} onClick={() => setModal('disburse')}>
              Approve & Record Disbursement
            </Button>
          )}
          {(rec.status === 'Submitted' || rec.status === 'Verified') && (checker || approver) && (
            <Button size="sm" variant="danger" icon={<XCircle size={13} />} onClick={() => setModal('reject')}>
              Reject
            </Button>
          )}
          {(rec.status === 'Approved' || rec.status === 'Recovered') && checker && (
            <Button size="sm" variant="secondary" icon={<Link2 size={13} />} onClick={() => setModal('map')}>
              Map Cash Loading
            </Button>
          )}
          {rec.status === 'Approved' && checker && (
            <Button size="sm" icon={<HandCoins size={13} />} onClick={() => setModal('recovery')}>
              Recovery / Adjustment
            </Button>
          )}
          {rec.status === 'Recovered' && approver && (
            <Button size="sm" icon={<CheckCircle2 size={13} />} onClick={() => void done(closeAlf(rec.id), `${rec.id} closed`)}>
              Close ALF
            </Button>
          )}
        </div>
      </div>
      {own && ['Submitted', 'Verified', 'Approved'].includes(rec.status) && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          Maker-checker: you ({actorName()}) raised this request, so verification, approval and recovery entry by you are blocked.
        </div>
      )}
      {rec.onBehalfReason && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] text-blue-800">
          Raised on behalf of the franchise by {rec.onBehalfBy ?? rec.trail.createdBy}: {rec.onBehalfReason}
        </div>
      )}
      {rec.status === 'Rejected' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
          Rejected by {rec.trail.returnedBy}: {rec.rejectReason}
        </div>
      )}

      <Panel title="Request" right={<FundingChip kind="Cash Loading" />}>
        <KV
          items={[
            { label: 'ALF Request ID', value: rec.id },
            { label: 'Request Date', value: dmy(rec.requestDate) },
            { label: 'Site ID / ATM ID', value: `${rec.siteId} / ${rec.atmId}` },
            { label: 'Franchise', value: `${rec.franchiseName} · ${rec.frId}` },
            { label: 'Requested Amount', value: inr(rec.requestedAmount) },
            { label: 'Purpose / Reason', value: rec.purpose },
            { label: 'ATM Location', value: rec.atmLocation },
            { label: 'Remarks', value: rec.remarks },
          ]}
        />
      </Panel>
      <Panel title="Disbursement, recovery & outstanding">
        <KV
          items={[
            { label: 'Approved Amount', value: rec.approvedAmount != null ? inr(rec.approvedAmount) : '' },
            { label: 'Disbursement Date', value: rec.disbursementDate ? dmy(rec.disbursementDate) : '' },
            { label: 'Disbursement Ref', value: rec.disbursementRef },
            { label: 'Email submitted', value: rec.emailSubmittedAt ? `${dt(rec.emailSubmittedAt)}${rec.emailRef ? ` · ${rec.emailRef}` : ''}` : '' },
            { label: 'Expected Recovery Date', value: rec.expectedRecoveryDate ? dmy(rec.expectedRecoveryDate) : '' },
            { label: 'Actual Recovery Date', value: rec.actualRecoveryDate ? dmy(rec.actualRecoveryDate) : '' },
            { label: 'Recovered / Adjusted', value: inr(recoveredOf(rec)) },
            { label: 'Outstanding Amount', value: <span className={outstandingOf(rec) > 0 ? 'text-red-600' : 'text-emerald-600'}>{inr(outstandingOf(rec))}</span> },
          ]}
        />
        <h3 className="mt-4 mb-2 text-[12px] font-bold text-slate-700">Recovery / adjustment entries</h3>
        {rec.recoveries.length === 0 ? (
          <p className="text-[12px] text-slate-500">No recovery recorded.</p>
        ) : (
          <table className="w-full text-left text-[12px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {['Date', 'Type', 'Amount', 'Cash Loading ref', 'Remarks', 'By'].map((h) => (
                  <th key={h} className="px-2.5 py-1.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rec.recoveries.map((x) => (
                <tr key={x.id}>
                  <td className="px-2.5 py-1.5">{dmy(x.date)}</td>
                  <td className="px-2.5 py-1.5">{x.mode}</td>
                  <td className="px-2.5 py-1.5">{inr(x.amount)}</td>
                  <td className="px-2.5 py-1.5">{x.clRef ?? '—'}</td>
                  <td className="px-2.5 py-1.5">{x.remarks || '—'}</td>
                  <td className="px-2.5 py-1.5">{x.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <Panel title="Linked Cash Loading records (Cash Loading Master)">
        {rec.clRefs.length === 0 ? (
          <p className="text-[12px] text-slate-500">Not mapped yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {rec.clRefs.map((c) => (
              <li key={c}>
                <Link to={`/operations/cash-loading/register?record=${c}`} className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[12px] font-semibold text-amber-800 hover:underline">
                  <Link2 size={12} /> {c}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Approval & audit">
          <table className="w-full text-[12px]">
            <tbody className="divide-y divide-slate-100">
              {[
                ['Created', rec.trail.createdBy, rec.trail.createdAt],
                ['Submitted', rec.trail.submittedBy, rec.trail.submittedAt],
                ['Verified (CRM / Ops)', rec.trail.verifiedBy, rec.trail.verifiedAt],
                ['Approved (Admin)', rec.trail.approvedBy, rec.trail.approvedAt],
                ['Closed', rec.closedBy, rec.closedAt],
              ].map(([k, by, at]) => (
                <tr key={k}>
                  <td className="py-1.5 pr-3 text-slate-500">{k}</td>
                  <td className="py-1.5 pr-3 font-medium">{by ?? '—'}</td>
                  <td className="py-1.5 text-slate-500">{at ? dt(at) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 className="mt-4 mb-2 text-[12px] font-bold text-slate-700">History</h3>
          <ol className="space-y-1.5 text-[12px]">
            {rec.statusLog.map((s, i) => (
              <li key={`${s.at}-${i}`}>
                <Badge tone={toneFor(s.status)}>{s.status}</Badge> <span className="text-slate-600">by {s.by}</span> <span className="text-slate-400">· {dt(s.at)}</span>
                {s.note && <div className="text-slate-600">{s.note}</div>}
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Tasks & emails">
          {tasks.length === 0 && emails.length === 0 && <p className="text-[12px] text-slate-500">No workflow events yet (seeded record).</p>}
          <ul className="space-y-1.5 text-[12px]">
            {tasks.map((t) => (
              <li key={t.id}>
                <span className="font-semibold">{t.id}</span> · {t.title} · <Badge tone={toneFor(t.status)}>{t.status}</Badge>
              </li>
            ))}
            {emails.map((e) => (
              <li key={e.id} className="text-slate-600">
                <Mail size={12} className="mr-1 inline" />
                {e.templateCode} → {e.to.join(', ')}: {e.subject}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {modal === 'disburse' && <DisburseModal rec={rec} onClose={close} />}
      {modal === 'recovery' && <RecoveryModal rec={rec} onClose={close} />}
      {modal === 'map' && <MappingModal rec={rec} onClose={close} />}
      {modal === 'reject' && <RejectModal rec={rec} onClose={close} />}
    </div>
  )
}

// ── Register + outstanding report ────────────────────────────────────────
export default function AlfRegister() {
  const list = useAlf()
  const role = useRole()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const recordId = params.get('record')
  const view = params.get('view') === 'outstanding' ? 'outstanding' : 'register'
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [fr, setFr] = useState('')

  const franchises = useMemo(() => [...new Set(list.map((r) => r.franchiseName))].sort(), [list])
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase()
    return list
      .filter((r) => !status || r.status === status)
      .filter((r) => !fr || r.franchiseName === fr)
      .filter((r) => !n || [r.id, r.atmId, r.siteId, r.franchiseName].some((v) => v.toLowerCase().includes(n)))
      .sort((a, b) => b.requestDate.localeCompare(a.requestDate))
  }, [list, status, fr, q])
  const outstanding = useMemo(() => list.filter((r) => r.status === 'Approved' && outstandingOf(r) > 0).filter((r) => !fr || r.franchiseName === fr), [list, fr])
  const kpi = useMemo(() => {
    const disbursed = list.filter((r) => r.approvedAmount != null)
    return {
      requested: list.filter((r) => r.status === 'Submitted' || r.status === 'Verified').length,
      disbursed: disbursed.reduce((s, r) => s + (r.approvedAmount ?? 0), 0),
      recovered: disbursed.reduce((s, r) => s + recoveredOf(r), 0),
      outstanding: list.reduce((s, r) => s + (r.status === 'Approved' ? outstandingOf(r) : 0), 0),
      overdue: list.filter((r) => overdueDays(r) > 0).length,
    }
  }, [list])

  if (recordId)
    return (
      <div className="max-w-[1440px] space-y-4 pb-12">
        <Crumbs trail={[{ label: 'Operations', to: '/operations' }, { label: 'Cash Loading Register', to: '/operations/cash-loading' }, { label: 'ALF Register', to: '/operations/alf' }, { label: recordId }]} />
        <AlfDetail id={recordId} />
      </div>
    )

  const exportRegister = () =>
    downloadCsv(
      `alf-register-${today()}`,
      ['Funding Model', 'ALF ID', 'Request Date', 'Site ID', 'ATM ID', 'Franchise ID', 'Franchise', 'Requested', 'Approved', 'Purpose', 'Disbursement Date', 'Expected Recovery', 'Actual Recovery', 'Recovered', 'Outstanding', 'Cash Loading Refs', 'Status'],
      rows.map((r) => [r.fundingModel, r.id, r.requestDate, r.siteId, r.atmId, r.frId, r.franchiseName, String(r.requestedAmount), String(r.approvedAmount ?? ''), r.purpose, r.disbursementDate ?? '', r.expectedRecoveryDate ?? '', r.actualRecoveryDate ?? '', String(recoveredOf(r)), String(outstandingOf(r)), r.clRefs.join(' '), r.status]),
    )
  const exportOutstanding = () =>
    downloadCsv(
      `alf-outstanding-${today()}`,
      ['ALF ID', 'Franchise', 'Site ID', 'ATM ID', 'Disbursed On', 'Approved', 'Recovered', 'Outstanding', 'Expected Recovery', 'Overdue Days'],
      outstanding.map((r) => [r.id, r.franchiseName, r.siteId, r.atmId, r.disbursementDate ?? '', String(r.approvedAmount ?? 0), String(recoveredOf(r)), String(outstandingOf(r)), r.expectedRecoveryDate ?? '', String(overdueDays(r))]),
    )
  const byFranchise = Object.entries(
    outstanding.reduce<Record<string, { count: number; amount: number; overdue: number }>>((m, r) => {
      const x = m[r.franchiseName] ?? { count: 0, amount: 0, overdue: 0 }
      m[r.franchiseName] = { count: x.count + 1, amount: x.amount + outstandingOf(r), overdue: x.overdue + (overdueDays(r) > 0 ? 1 : 0) }
      return m
    }, {}),
  ).sort((a, b) => b[1].amount - a[1].amount)

  return (
    <div className="max-w-[1440px] space-y-4 pb-12">
      <Crumbs trail={[{ label: 'Operations', to: '/operations' }, { label: 'Cash Loading Register', to: '/operations/cash-loading' }, { label: 'ALF Register' }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[26px]">Additional Loading Fund (ALF) Register</h1>
          <p className="mt-1 text-[13px] text-muted">Request, verification, disbursement, Cash Loading mapping, recovery / adjustment and outstanding — ALF Master linked to the Cash Loading Master.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FundingChip kind="Cash Loading" />
          <Link to="/operations/alf-forecast" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50">
            <LineChart size={13} /> ALF Forecast
          </Link>
          {canCreateRole(role) && (
            <Button size="sm" icon={<Plus size={13} />} onClick={() => navigate('/operations/alf/new')}>
              New ALF Request
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'Awaiting verification / approval', value: kpi.requested, tone: 'text-amber-600' },
          { label: 'Total disbursed', value: inr(kpi.disbursed), tone: 'text-slate-900' },
          { label: 'Recovered / adjusted', value: inr(kpi.recovered), tone: 'text-emerald-600' },
          { label: 'Outstanding', value: inr(kpi.outstanding), tone: 'text-red-600' },
          { label: 'Recovery overdue', value: kpi.overdue, tone: 'text-red-600' },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
            <div className="text-[11px] text-slate-500">{t.label}</div>
            <div className={`mt-1 text-[20px] font-bold ${t.tone}`}>{t.value}</div>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          {(['register', 'outstanding'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setParams(v === 'register' ? {} : { view: v })}
              className={`rounded-full px-3 py-1 text-[12px] font-semibold ${view === v ? 'bg-[#0066FF] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {v === 'register' ? `Register (${list.length})` : `Outstanding Report (${list.filter((r) => r.status === 'Approved' && outstandingOf(r) > 0).length})`}
            </button>
          ))}
          <div className="ml-auto">
            <Button size="sm" variant="secondary" icon={<Download size={13} />} onClick={view === 'register' ? exportRegister : exportOutstanding}>
              Export CSV
            </Button>
          </div>
        </div>
        <div className="grid gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
          <TextField label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ALF ID, ATM ID, Site ID, Franchise" />
          <SelectField label="Franchise" value={fr} options={franchises} placeholder="All franchises" onChange={(e) => setFr(e.target.value)} />
          {view === 'register' && <SelectField label="Status" value={status} options={ALF_STATUSES} placeholder="All statuses" onChange={(e) => setStatus(e.target.value)} />}
        </div>

        {view === 'register' ? (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-[12px]">
              <thead className="border-y border-blue-100 bg-[#EAF2FD] text-[11.5px] font-bold text-slate-800">
                <tr>
                  {['ALF ID', 'Request Date', 'ATM ID', 'Site ID', 'Franchise', 'Requested', 'Approved', 'Purpose', 'Outstanding', 'CL Mapping', 'Status', ''].map((h) => (
                    <th key={h || 'act'} className="px-3 py-2.5 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-semibold text-[#0066FF]">
                      <button type="button" className="hover:underline" onClick={() => setParams({ record: r.id })}>
                        {r.id}
                      </button>
                    </td>
                    <td className="px-3 py-2">{dmy(r.requestDate)}</td>
                    <td className="px-3 py-2 font-medium">{r.atmId}</td>
                    <td className="px-3 py-2">{r.siteId}</td>
                    <td className="px-3 py-2">{r.franchiseName}</td>
                    <td className="px-3 py-2 text-right">{inr(r.requestedAmount)}</td>
                    <td className="px-3 py-2 text-right">{r.approvedAmount != null ? inr(r.approvedAmount) : '—'}</td>
                    <td className="px-3 py-2">{r.purpose}</td>
                    <td className="px-3 py-2 text-right">{r.approvedAmount != null ? inr(outstandingOf(r)) : '—'}</td>
                    <td className="px-3 py-2">{r.clRefs.join(', ') || '—'}</td>
                    <td className="px-3 py-2">
                      <Badge tone={toneFor(r.status)}>{r.status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => setParams({ record: r.id })} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0066FF] hover:underline">
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                      No ALF requests match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-4 px-4 pb-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {byFranchise.map(([name, x]) => (
                <div key={name} className="rounded-lg border border-slate-200 px-3 py-2">
                  <div className="text-[12px] font-semibold text-slate-900">{name}</div>
                  <div className="text-[11.5px] text-slate-500">
                    {x.count} open ALF · <span className="font-semibold text-red-600">{inr(x.amount)}</span>
                    {x.overdue > 0 && <span className="text-red-600"> · {x.overdue} overdue</span>}
                  </div>
                </div>
              ))}
              {byFranchise.length === 0 && <p className="text-[12px] text-slate-500">Nothing outstanding.</p>}
            </div>
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-[12px]">
                <thead className="border-y border-blue-100 bg-[#EAF2FD] text-[11.5px] font-bold text-slate-800">
                  <tr>
                    {['ALF ID', 'Franchise', 'Site / ATM', 'Disbursed', 'Approved', 'Recovered', 'Outstanding', 'Expected Recovery', 'Overdue'].map((h) => (
                      <th key={h} className="px-3 py-2.5 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {outstanding.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 font-semibold text-[#0066FF]">
                        <button type="button" className="hover:underline" onClick={() => setParams({ record: r.id })}>
                          {r.id}
                        </button>
                      </td>
                      <td className="px-3 py-2">{r.franchiseName}</td>
                      <td className="px-3 py-2">
                        {r.siteId} / {r.atmId}
                      </td>
                      <td className="px-3 py-2">{r.disbursementDate ? dmy(r.disbursementDate) : '—'}</td>
                      <td className="px-3 py-2 text-right">{inr(r.approvedAmount ?? 0)}</td>
                      <td className="px-3 py-2 text-right">{inr(recoveredOf(r))}</td>
                      <td className="px-3 py-2 text-right font-semibold text-red-600">{inr(outstandingOf(r))}</td>
                      <td className="px-3 py-2">{r.expectedRecoveryDate ? dmy(r.expectedRecoveryDate) : '—'}</td>
                      <td className="px-3 py-2">{overdueDays(r) > 0 ? <Badge tone="red">{overdueDays(r)} d</Badge> : <Badge tone="green">On time</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
      <SeparationPanel />
    </div>
  )
}
