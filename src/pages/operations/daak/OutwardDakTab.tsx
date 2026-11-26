import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Download, Eye, Lock, MapPin, Plus, Receipt, Search } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SelectField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { addHrmsExpense } from '@/data/hrmsExpenses'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'
import { apiEnabled } from '@/data/opsApi'
import { addressSnapshot, useAddresses, useHierarchy } from '@/data/workflow'
import {
  COURIER_COMPANIES, DELIVERY_STATUSES, DEPARTMENTS, DOCUMENT_TYPES, PAID_BY_KINDS,
  approveOutwardAsync, attachOutwardFileAsync, createDakExpenseAsync, createOutwardAsync, setDeliveryStatusAsync, useDaakState,
  type DeliveryStatus, type OutwardDak, type OutwardInput, type PaidByKind,
} from '@/data/daakData'
import { canApprove, canManageDak, useOpsUser } from '../recon2/opsAccess'
import { AuditPanel, FileChip, FilePick, Info, ReasonBox } from '../recon2/shared'
import { deliveryTone, fmtDt, rupees, searchAddresses, type PickedFile } from '../recon2/util'
import { AddressEditor } from './AddressMasterPanel'

/** Address Master picker — search and reuse a saved address, or add a new one (§10.1). */
function AddressPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const list = useAddresses()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const rows = useMemo(() => searchAddresses(list, q).slice(0, 8), [list, q])
  const picked = list.find((a) => a.id === value)
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[12px] font-semibold">Address Master ID <span className="text-ink">*</span></span>
        <button type="button" onClick={() => setAdding(true)} className="ml-auto text-[11px] font-semibold text-primary hover:underline">+ New address</button>
      </div>
      <div className="relative mb-2">
        <Search size={13} className="absolute top-2.5 left-2.5 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search saved addresses…" className="h-8 w-full rounded-md border border-line pr-2 pl-7 text-[12px] outline-none focus:border-primary" />
      </div>
      <div className="max-h-44 space-y-1 overflow-y-auto">
        {rows.map((a) => (
          <button key={a.id} type="button" onClick={() => onChange(a.id)} className={cn('flex w-full items-start gap-2 rounded-md border px-2.5 py-1.5 text-left text-[12px]', value === a.id ? 'border-primary bg-primary-soft' : 'border-transparent hover:bg-surface')}>
            <MapPin size={13} className="mt-0.5 shrink-0 text-primary" />
            <span className="min-w-0"><b>{a.id}</b> · {a.organization} — {a.name}<span className="block truncate text-muted">{a.line1}, {a.city} - {a.pin}</span></span>
          </button>
        ))}
        {!rows.length && <p className="text-[12px] text-muted">No saved address matches — add a new one.</p>}
      </div>
      {picked && (
        <div className="mt-2 rounded-md bg-emerald-50 px-2.5 py-1.5 text-[11.5px] text-emerald-800">
          <b>Dispatch address snapshot (frozen on save):</b> {addressSnapshot(picked)}
        </div>
      )}
      {adding && <AddressEditor onClose={() => setAdding(false)} onSaved={onChange} />}
    </div>
  )
}

type Draft = Omit<OutwardInput, 'copy' | 'paymentProof'> & { copy: PickedFile | null; paymentProof: PickedFile | null }

function CreateOutwardModal({ onClose, me, people, inwardOptions }: { onClose: () => void; me: string; people: string[]; inwardOptions: string[] }) {
  const addresses = useAddresses()
  const [d, setD] = useState<Draft>(() => ({
    dispatchDate: new Date().toISOString().slice(0, 10), recipientName: '', addressId: '', document: { name: '', type: '', reference: '' }, copy: null,
    courierCompany: '', awb: '', charges: 0, paidBy: { kind: 'Employee', name: me }, paymentProof: null, department: 'Operations', costCentre: '', inwardRef: '',
  }))
  const [err, setErr] = useState('')
  const pickAddress = (id: string) => {
    const a = addresses.find((x) => x.id === id)
    setD((x) => ({ ...x, addressId: id, recipientName: x.recipientName || (a ? `${a.name}, ${a.organization}` : '') }))
  }
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (busy) return
    setBusy(true)
    const res = await createOutwardAsync({ ...d, copy: d.copy ?? undefined, paymentProof: d.paymentProof ?? undefined, inwardRef: d.inwardRef || undefined }).finally(() => setBusy(false))
    if (!res.ok) {
      setErr(res.error)
      return
    }
    toast(`Outward dak ${res.id} saved — address & courier details recorded`)
    onClose()
  }
  const paidByOptions = d.paidBy.kind === 'Employee' ? people : d.paidBy.kind === 'Department' ? DEPARTMENTS : ['Dexter India – Operations', 'Dexter India – Head Office']
  return (
    <Modal title="New Outward Dak" sub="Operations §10 — Outward Dak ID is system generated on save" onClose={onClose} width={920} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>Save & dispatch</Button></>}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Dispatch date" required type="date" value={d.dispatchDate} onChange={(e) => setD((x) => ({ ...x, dispatchDate: e.target.value }))} />
            <TextField label="Recipient name (person / organisation)" required value={d.recipientName} onChange={(e) => setD((x) => ({ ...x, recipientName: e.target.value }))} />
          </div>
          <AddressPicker value={d.addressId} onChange={pickAddress} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Document name" required value={d.document.name} onChange={(e) => setD((x) => ({ ...x, document: { ...x.document, name: e.target.value } }))} />
            <SelectField label="Document type" options={DOCUMENT_TYPES} value={d.document.type} onChange={(e) => setD((x) => ({ ...x, document: { ...x.document, type: e.target.value } }))} />
            <TextField label="Document reference" placeholder="e.g. CBD-2026-1042 / AGR-…" value={d.document.reference} onChange={(e) => setD((x) => ({ ...x, document: { ...x.document, reference: e.target.value } }))} />
            <SelectField label="Dispatching an inward dak? (optional)" options={inwardOptions} value={d.inwardRef ?? ''} onChange={(e) => setD((x) => ({ ...x, inwardRef: e.target.value }))} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold">Document copy</span>
            <FilePick label={d.copy ? 'Replace scan / PDF' : 'Upload scan / PDF'} accept="image/*,.pdf" onPick={(f) => setD((x) => ({ ...x, copy: f[0] }))} />
            {d.copy && <FileChip name={d.copy.name} />}
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Courier / postal company" required options={COURIER_COMPANIES} value={d.courierCompany} onChange={(e) => setD((x) => ({ ...x, courierCompany: e.target.value }))} />
            <TextField label="AWB / tracking number" required={d.courierCompany !== 'By Hand'} value={d.awb} onChange={(e) => setD((x) => ({ ...x, awb: e.target.value }))} />
            <TextField label="Dispatch charges (₹)" type="number" min={0} value={String(d.charges)} onChange={(e) => setD((x) => ({ ...x, charges: Number(e.target.value) }))} />
            <SelectField label="Paid by" options={PAID_BY_KINDS} value={d.paidBy.kind} onChange={(e) => setD((x) => ({ ...x, paidBy: { kind: e.target.value as PaidByKind, name: e.target.value === 'Employee' ? me : e.target.value === 'Department' ? x.department : 'Dexter India – Operations' } }))} />
            <SelectField label={`Paid by — ${d.paidBy.kind.toLowerCase()}`} options={paidByOptions} value={d.paidBy.name} onChange={(e) => setD((x) => ({ ...x, paidBy: { ...x.paidBy, name: e.target.value } }))} />
            <SelectField label="Department" options={DEPARTMENTS} value={d.department} onChange={(e) => setD((x) => ({ ...x, department: e.target.value }))} />
            <TextField label="Project / site (cost centre)" className="sm:col-span-2" value={d.costCentre} onChange={(e) => setD((x) => ({ ...x, costCentre: e.target.value }))} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold">Payment proof</span>
            <FilePick label={d.paymentProof ? 'Replace receipt' : 'Upload receipt'} accept="image/*,.pdf" onPick={(f) => setD((x) => ({ ...x, paymentProof: f[0] }))} />
            {d.paymentProof && <FileChip name={d.paymentProof.name} />}
          </div>
          <p className="rounded-md bg-blue-50 px-3 py-2 text-[11.5px] text-blue-800">After saving, use <b>Create HRMS expense</b> on the record to generate the linked expense / bill (§10.2). Delivery status starts as <b>Dispatched</b>; Admin approval is logged separately.</p>
        </div>
      </div>
      {err && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">{err}</p>}
    </Modal>
  )
}

function OutwardDetail({ rec, onClose, canEdit, canApp, me }: { rec: OutwardDak; onClose: () => void; canEdit: boolean; canApp: boolean; me: string }) {
  const { expenses } = useDaakState()
  const [tab, setTab] = useState<'details' | 'audit'>('details')
  const [status, setStatus] = useState<DeliveryStatus | ''>('')
  const [pod, setPod] = useState<PickedFile | null>(null)
  const [reason, setReason] = useState('')
  const exp = expenses.find((e) => e.ref === rec.expenseRef)
  const own = [rec.trail.createdBy, rec.trail.submittedBy].includes(me)

  const applyStatus = async () => {
    if (!status) return
    const res = await setDeliveryStatusAsync(rec.id, status, { pod: pod ?? undefined, reason })
    if (!res.ok) return toast(res.error, 'error')
    toast(`Delivery status → ${status}`)
    setStatus('')
    setPod(null)
    setReason('')
  }
  const approve = async () => {
    const res = await approveOutwardAsync(rec.id)
    if (res.ok) toast('Dispatch approved')
    else toast(res.error, 'error')
  }
  const expense = async () => {
    const res = await createDakExpenseAsync(rec.id)
    if (res.ok && apiEnabled) toast(rec.charges > 0 ? `HRMS expense link: ${res.id}` : 'No charges — no expense needed')
    else if (res.ok) {
      // Mirror into the shared HRMS expense list (workflow already emitted by createDakExpense)
      addHrmsExpense({
        source: 'Courier', refId: res.id, segment: 'Office', notify: false,
        date: rec.dispatchDate.split('-').reverse().join('.'), category: rec.courierCompany === 'India Post' ? 'Speed Post' : 'Courier & Postage Expenses',
        purpose: `${rec.document.name} to ${rec.recipientName}`, vendorRef: [rec.courierCompany, rec.awb].filter(Boolean).join(' ') || rec.id,
        amount: rec.charges, receiptName: rec.paymentProof?.name, remarks: `Outward ${rec.id}`,
        empName: rec.paidBy.name, department: rec.department,
      })
      toast(`HRMS expense ${res.id} created and linked`)
    }
    else toast(res.error, 'error')
  }

  return (
    <Modal title={rec.id} sub={`${rec.recipientName} · ${rec.courierCompany} ${rec.awb}`} onClose={onClose} width={900}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={deliveryTone(rec.deliveryStatus)}>{rec.deliveryStatus}</Badge>
        <Badge tone={rec.approval === 'Approved' ? 'green' : 'amber'}>{rec.approval === 'Approved' ? 'Approved' : 'Approval pending'}</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          {rec.approval === 'Pending' && canApp && <Button size="sm" icon={<CheckCircle2 size={13} />} onClick={approve} disabled={own} title={own ? 'Maker-checker: you created this dispatch' : undefined}>Approve dispatch</Button>}
          {canEdit && !rec.expenseRef && (!apiEnabled || rec.expenseStatus === 'Pending HRMS') && <Button size="sm" variant="secondary" icon={<Receipt size={13} />} onClick={expense}>{apiEnabled ? 'Retry HRMS expense link' : 'Create HRMS expense'}</Button>}
        </div>
      </div>
      <div className="mb-4 flex gap-1 border-b border-line">
        {(['details', 'audit'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn('-mb-px border-b-2 px-3 py-1.5 text-[12px] font-semibold', tab === t ? 'border-primary text-primary' : 'border-transparent text-muted')}>
            {t === 'audit' ? 'Audit history' : 'Details'}
          </button>
        ))}
      </div>
      {tab === 'details' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Info k="Dispatch date">{rec.dispatchDate}</Info>
            <Info k="Recipient">{rec.recipientName}</Info>
            <Info k="Address Master ID">{rec.addressId}</Info>
            <Info k="Dispatched by">{rec.dispatchedBy}</Info>
            <Info k="Dispatch address (snapshot at dispatch)" className="sm:col-span-4"><span className="rounded bg-emerald-50 px-1.5 py-0.5">{rec.addressSnapshot}</span></Info>
            <Info k="Document">{rec.document.name}</Info>
            <Info k="Type">{rec.document.type}</Info>
            <Info k="Reference">{rec.document.reference}</Info>
            <Info k="Inward ref.">{rec.inwardRef}</Info>
            <Info k="Courier / postal company">{rec.courierCompany}</Info>
            <Info k="AWB / tracking">{rec.awb}</Info>
            <Info k="Charges">{rupees(rec.charges)}</Info>
            <Info k="Paid by">{rec.paidBy.kind}: {rec.paidBy.name}</Info>
            <Info k="Department">{rec.department}</Info>
            <Info k="Project / site">{rec.costCentre}</Info>
            <Info k="Delivered at">{rec.deliveredAt ? fmtDt(rec.deliveredAt) : ''}</Info>
            <Info k="Return reason">{rec.returnReason}</Info>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-28 text-[12px] font-semibold">Document copy</span>
            {rec.copy ? <FileChip name={rec.copy.name} sub={fmtDt(rec.copy.at)} /> : <span className="text-[12px] text-muted">Not uploaded</span>}
            {canEdit && <FilePick label={rec.copy ? 'Replace' : 'Upload'} accept="image/*,.pdf" onPick={(f) => void attachOutwardFileAsync(rec.id, 'copy', f[0]).then((r) => toast(r.ok ? 'Document copy uploaded' : r.error, r.ok ? 'success' : 'error'))} />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-28 text-[12px] font-semibold">Payment proof</span>
            {rec.paymentProof ? <FileChip name={rec.paymentProof.name} sub={fmtDt(rec.paymentProof.at)} /> : <span className="text-[12px] text-muted">Not uploaded</span>}
            {canEdit && <FilePick label={rec.paymentProof ? 'Replace' : 'Upload'} accept="image/*,.pdf" onPick={(f) => void attachOutwardFileAsync(rec.id, 'paymentProof', f[0]).then((r) => toast(r.ok ? 'Payment proof uploaded' : r.error, r.ok ? 'success' : 'error'))} />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-28 text-[12px] font-semibold">Proof of delivery</span>
            {rec.pod ? <FileChip name={rec.pod.name} sub={fmtDt(rec.pod.at)} /> : <span className="text-[12px] text-muted">Not uploaded</span>}
          </div>
          <div className="rounded-lg border border-line p-3">
            <div className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold"><Receipt size={14} /> Expense reference (HRMS)</div>
            {exp ? (
              <div className="flex flex-wrap items-center gap-3 text-[12px]">
                <b className="text-primary">{exp.ref}</b>
                <span>{exp.expenseHead} · {rupees(exp.amount)} · paid by {exp.paidBy}</span>
                <Badge tone={exp.status === 'Reimbursed' || exp.status === 'Approved' ? 'green' : exp.status === 'Rejected' ? 'red' : 'amber'}>{exp.status}</Badge>
                <Link to="/operations/daak/expenses" className="text-primary hover:underline">Linked expenses</Link>
                <Link to="/hrms/expenses" className="text-primary hover:underline">HRMS expense list</Link>
              </div>
            ) : (
              <p className="text-[12px] text-muted">{apiEnabled ? (rec.expenseStatus === 'Not applicable' || !rec.charges ? 'No charges — no expense needed.' : `HRMS expense: ${rec.expenseStatus ?? 'not linked'}.`) : <>No expense linked yet.{canEdit && ' Use “Create HRMS expense” to generate the expense / bill reference.'}</>}</p>
            )}
          </div>
          {canEdit && (
            <div className="rounded-lg border border-line p-3">
              <div className="mb-2 text-[12.5px] font-semibold">Update delivery status</div>
              <div className="flex flex-wrap items-end gap-2">
                <SelectField label="New status" className="w-44" options={DELIVERY_STATUSES.filter((s) => s !== rec.deliveryStatus)} value={status} onChange={(e) => setStatus(e.target.value as DeliveryStatus)} />
                {status === 'Delivered' && (
                  <div className="flex items-center gap-2 pb-0.5">
                    <FilePick label={pod ? 'Replace POD' : 'Upload POD / acknowledgement'} accept="image/*,.pdf" onPick={(f) => setPod(f[0])} />
                    {pod && <FileChip name={pod.name} />}
                  </div>
                )}
                <Button size="sm" onClick={applyStatus} disabled={!status}>Update</Button>
              </div>
              {status === 'Returned' && <div className="mt-2"><ReasonBox value={reason} onChange={setReason} placeholder="Return reason (mandatory)" /></div>}
            </div>
          )}
        </div>
      )}
      {tab === 'audit' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-[12px] font-semibold">Created / approved / dispatched / delivered log</div>
            <ol className="space-y-2">
              {rec.history.map((h, i) => (
                <li key={`${h.at}-${i}`} className="rounded-md border border-line px-3 py-1.5 text-[12px]">
                  <b>{h.action}</b> {h.note && <span className="text-ink-2">— {h.note}</span>}
                  <div className="text-[11px] text-muted">{fmtDt(h.at)} · {h.by}</div>
                </li>
              ))}
            </ol>
          </div>
          <AuditPanel trail={rec.trail} />
        </div>
      )}
    </Modal>
  )
}

export default function OutwardDakTab() {
  const { outward, inward } = useDaakState()
  const h = useHierarchy()
  const u = useOpsUser()
  const canEdit = canManageDak(u)
  const people = useMemo(() => h.employees.filter((e) => e.status === 'Active').map((e) => e.name), [h.employees])
  const inwardOptions = useMemo(() => inward.filter((r) => r.status !== 'Dispatched').map((r) => r.id), [inward])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<DeliveryStatus | ''>('')
  const [creating, setCreating] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const open = outward.find((r) => r.id === openId)

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return outward.filter((r) => (!status || r.deliveryStatus === status) && (!t || [r.id, r.recipientName, r.addressSnapshot, r.awb, r.courierCompany, r.document.name, r.document.reference, r.expenseRef ?? '', r.addressId].join(' ').toLowerCase().includes(t)))
  }, [outward, q, status])

  const exportCsv = () =>
    downloadCsv('outward-dak', ['Outward Dak ID', 'Dispatch date', 'Recipient', 'Address ID', 'Dispatch address', 'Document', 'Doc type', 'Reference', 'Courier', 'AWB', 'Charges', 'Paid by', 'Department', 'Project / site', 'Delivery status', 'POD', 'Expense ref', 'Approval'],
      rows.map((r) => [r.id, r.dispatchDate, r.recipientName, r.addressId, r.addressSnapshot, r.document.name, r.document.type, r.document.reference, r.courierCompany, r.awb, String(r.charges), `${r.paidBy.kind}: ${r.paidBy.name}`, r.department, r.costCentre, r.deliveryStatus, r.pod?.name ?? '', r.expenseRef ?? '', r.approval]))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search size={14} className="absolute top-2.5 left-2.5 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID, recipient, address, AWB, document, expense ref…" className="h-9 w-full rounded-md border border-line bg-white pr-3 pl-8 text-[12.5px] outline-none focus:border-primary" />
        </div>
        <Button variant="secondary" icon={<Download size={14} />} onClick={exportCsv}>Export</Button>
        {canEdit ? <Button icon={<Plus size={14} />} onClick={() => setCreating(true)}>New outward dak</Button> : <span className="inline-flex items-center gap-1 text-[11px] text-muted"><Lock size={12} /> Create / update: Postal / Courier Executive or Admin</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {DELIVERY_STATUSES.map((s) => (
          <button key={s} type="button" onClick={() => setStatus(status === s ? '' : s)} className={cn('rounded-lg border px-3 py-1.5 text-left', status === s ? 'border-primary bg-primary-soft' : 'border-line bg-white')}>
            <div className="text-[11px] text-muted">{s}</div>
            <div className="text-[16px] font-semibold text-ink">{outward.filter((r) => r.deliveryStatus === s).length}</div>
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[1000px] text-[12px]">
          <thead className="bg-surface text-left text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Outward Dak ID</th>
              <th className="px-3 py-2 font-medium">Dispatch</th>
              <th className="px-3 py-2 font-medium">Recipient / address snapshot</th>
              <th className="px-3 py-2 font-medium">Document</th>
              <th className="px-3 py-2 font-medium">Courier / AWB</th>
              <th className="px-3 py-2 font-medium">Charges / paid by</th>
              <th className="px-3 py-2 font-medium">Expense ref.</th>
              <th className="px-3 py-2 font-medium">Delivery</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line/70 align-top hover:bg-surface/50">
                <td className="px-3 py-2 font-semibold text-primary">{r.id}<div className="text-[11px] font-normal text-muted">{r.approval === 'Approved' ? 'Approved' : 'Approval pending'}</div></td>
                <td className="px-3 py-2 whitespace-nowrap">{r.dispatchDate}</td>
                <td className="max-w-[280px] px-3 py-2">{r.recipientName}<div className="line-clamp-2 text-[11px] text-muted">{r.addressId} · {r.addressSnapshot}</div></td>
                <td className="px-3 py-2">{r.document.name}<div className="text-[11px] text-muted">{r.document.reference}</div></td>
                <td className="px-3 py-2">{r.courierCompany}<div className="text-[11px] text-muted">{r.awb || '—'}</div></td>
                <td className="px-3 py-2">{rupees(r.charges)}<div className="text-[11px] text-muted">{r.paidBy.kind}: {r.paidBy.name}</div></td>
                <td className="px-3 py-2">{r.expenseRef ? <span className="font-semibold text-emerald-700">{r.expenseRef}</span> : <span className="text-muted">—</span>}</td>
                <td className="px-3 py-2"><Badge tone={deliveryTone(r.deliveryStatus)}>{r.deliveryStatus}</Badge>{r.pod && <div className="mt-1 text-[10.5px] text-emerald-700">POD ✓</div>}</td>
                <td className="px-3 py-2"><Button size="sm" variant="ghost" icon={<Eye size={13} />} onClick={() => setOpenId(r.id)}>Open</Button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={9} className="px-3 py-8 text-center text-muted">No outward dak matches.</td></tr>}
          </tbody>
        </table>
      </div>
      {creating && <CreateOutwardModal onClose={() => setCreating(false)} me={u.name} people={people} inwardOptions={inwardOptions} />}
      {open && <OutwardDetail key={open.id} rec={open} onClose={() => setOpenId(null)} canEdit={canEdit} canApp={canApprove(u)} me={u.name} />}
    </div>
  )
}
