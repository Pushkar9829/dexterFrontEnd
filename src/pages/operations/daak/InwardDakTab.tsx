import { useMemo, useState } from 'react'
import { ArrowRightLeft, Download, Eye, Lock, Plus, Search, Tag } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'
import { useHierarchy } from '@/data/workflow'
import {
  COURIER_COMPANIES, DAK_MODES, DAK_TAGS, DEPARTMENTS, DOCUMENT_TYPES, ENVELOPE_TYPES, INWARD_STATUSES, RACKS,
  addInwardScansAsync, createInwardAsync, searchInward, setInwardStatusAsync, setInwardTagsAsync, transferCustodyAsync, updateInwardAsync, useDaakState,
  type DakMode, type InwardDak, type InwardInput, type InwardStatus,
} from '@/data/daakData'
import { canManageDak, useOpsUser } from '../recon2/opsAccess'
import { AuditPanel, FileChip, FilePick, Info, ReasonBox } from '../recon2/shared'
import { fmtDt, inwardTone, type PickedFile } from '../recon2/util'

const localNow = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}
const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

type Draft = Omit<InwardInput, 'scans'> & { scans: (PickedFile & { kind: string })[] }
const emptyDraft = (receivedBy: string): Draft => ({
  receivedAt: localNow(), mode: 'Courier', courierCompany: '', docketNo: '',
  sender: { name: '', organization: '', address: '', phone: '' }, envelope: { number: '', type: '', identification: '' },
  documentType: '', description: '', scans: [], receivedBy, department: '', owner: '', rack: '', register: '',
  mapping: { legalRef: '', siteId: '', atmId: '', franchise: '' }, tags: [],
})

function TagPicker({ value, onChange, disabled }: { value: string[]; onChange: (t: string[]) => void; disabled?: boolean }) {
  const [custom, setCustom] = useState('')
  const all = [...new Set([...DAK_TAGS, ...value])]
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {all.map((t) => {
        const on = value.includes(t)
        return (
          <button
            key={t}
            type="button"
            disabled={disabled}
            onClick={() => onChange(on ? value.filter((x) => x !== t) : [...value, t])}
            className={cn('rounded-full border px-2.5 py-0.5 text-[11px]', on ? 'border-primary bg-primary-soft font-semibold text-primary' : 'border-line bg-white text-ink-2', disabled && 'opacity-60')}
          >
            {t}
          </button>
        )
      })}
      {!disabled && (
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && custom.trim()) {
              e.preventDefault()
              onChange([...new Set([...value, custom.trim()])])
              setCustom('')
            }
          }}
          placeholder="+ custom tag ↵"
          className="h-6 w-28 rounded-full border border-dashed border-line px-2 text-[11px] outline-none"
        />
      )}
    </div>
  )
}

/** All §9 fields — used for both create and edit. */
function InwardFields({ d, set, people, lockedReceivedBy }: { d: Draft; set: (fn: (d: Draft) => Draft) => void; people: string[]; lockedReceivedBy?: boolean }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-[12px] font-semibold text-ink">Receipt</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Received date & time" required type="datetime-local" value={d.receivedAt} onChange={(e) => set((x) => ({ ...x, receivedAt: e.target.value }))} />
          <SelectField label="Courier / postal mode" required options={DAK_MODES} value={d.mode} onChange={(e) => set((x) => ({ ...x, mode: e.target.value as DakMode, courierCompany: e.target.value === 'Hand Delivery' ? 'By Hand' : x.courierCompany }))} />
          <SelectField label="Courier / postal company" options={COURIER_COMPANIES} value={d.courierCompany} onChange={(e) => set((x) => ({ ...x, courierCompany: e.target.value }))} />
          <TextField label="Docket / consignment no." value={d.docketNo} onChange={(e) => set((x) => ({ ...x, docketNo: e.target.value }))} />
          <SelectField label="Received by" required options={people} value={d.receivedBy} disabled={lockedReceivedBy} onChange={(e) => set((x) => ({ ...x, receivedBy: e.target.value }))} />
          <TextField label="Register reference" placeholder="Inward Register Vol-7 / Pg 49" value={d.register} onChange={(e) => set((x) => ({ ...x, register: e.target.value }))} />
        </div>
      </div>
      <div>
        <div className="mb-2 text-[12px] font-semibold text-ink">Sender details</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Sender name" required value={d.sender.name} onChange={(e) => set((x) => ({ ...x, sender: { ...x.sender, name: e.target.value } }))} />
          <TextField label="Organisation" value={d.sender.organization} onChange={(e) => set((x) => ({ ...x, sender: { ...x.sender, organization: e.target.value } }))} />
          <TextField label="Address" className="sm:col-span-2" value={d.sender.address} onChange={(e) => set((x) => ({ ...x, sender: { ...x.sender, address: e.target.value } }))} />
          <TextField label="Phone" value={d.sender.phone} onChange={(e) => set((x) => ({ ...x, sender: { ...x.sender, phone: e.target.value } }))} />
        </div>
      </div>
      <div>
        <div className="mb-2 text-[12px] font-semibold text-ink">Envelope & document</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Envelope number" value={d.envelope.number} onChange={(e) => set((x) => ({ ...x, envelope: { ...x.envelope, number: e.target.value } }))} />
          <SelectField label="Envelope type" options={ENVELOPE_TYPES} value={d.envelope.type} onChange={(e) => set((x) => ({ ...x, envelope: { ...x.envelope, type: e.target.value } }))} />
          <TextField label="Identification marks" value={d.envelope.identification} onChange={(e) => set((x) => ({ ...x, envelope: { ...x.envelope, identification: e.target.value } }))} />
          <SelectField label="Document type" options={DOCUMENT_TYPES} value={d.documentType} onChange={(e) => set((x) => ({ ...x, documentType: e.target.value }))} />
          <TextAreaField label="Document description (what was received)" required className="sm:col-span-2" value={d.description} onChange={(e) => set((x) => ({ ...x, description: e.target.value }))} />
        </div>
      </div>
      <div>
        <div className="mb-2 text-[12px] font-semibold text-ink">Ownership & storage</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <SelectField label="Department" options={DEPARTMENTS} value={d.department} onChange={(e) => set((x) => ({ ...x, department: e.target.value }))} />
          <SelectField label="Owner (responsible person)" options={people} value={d.owner} onChange={(e) => set((x) => ({ ...x, owner: e.target.value }))} />
          <SelectField label="Rack / storage location" options={RACKS} value={d.rack} onChange={(e) => set((x) => ({ ...x, rack: e.target.value }))} />
        </div>
      </div>
      <div>
        <div className="mb-2 text-[12px] font-semibold text-ink">Legal / site / franchise mapping</div>
        <div className="grid gap-3 sm:grid-cols-4">
          <TextField label="Legal ref." value={d.mapping.legalRef} onChange={(e) => set((x) => ({ ...x, mapping: { ...x.mapping, legalRef: e.target.value } }))} />
          <TextField label="Site ID" value={d.mapping.siteId} onChange={(e) => set((x) => ({ ...x, mapping: { ...x.mapping, siteId: e.target.value } }))} />
          <TextField label="ATM ID" value={d.mapping.atmId} onChange={(e) => set((x) => ({ ...x, mapping: { ...x.mapping, atmId: e.target.value } }))} />
          <TextField label="Franchise ID" value={d.mapping.franchise} onChange={(e) => set((x) => ({ ...x, mapping: { ...x.mapping, franchise: e.target.value } }))} />
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-ink"><Tag size={13} /> Tags</div>
        <TagPicker value={d.tags} onChange={(tags) => set((x) => ({ ...x, tags }))} />
      </div>
    </div>
  )
}

function CreateInwardModal({ onClose, people, me }: { onClose: () => void; people: string[]; me: string }) {
  const [d, setD] = useState<Draft>(() => emptyDraft(people.includes(me) ? me : people[0] ?? me))
  const [err, setErr] = useState('')
  const set = (fn: (d: Draft) => Draft) => setD(fn)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (busy) return
    setBusy(true)
    const res = await createInwardAsync({ ...d, receivedAt: new Date(d.receivedAt).toISOString() }).finally(() => setBusy(false))
    if (!res.ok) {
      setErr(res.error)
      return
    }
    toast(`Inward dak ${res.id} recorded`)
    onClose()
  }
  return (
    <Modal title="New Inward Dak" sub="Operations §9 — Inward Dak ID is system generated on save" onClose={onClose} width={900} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>Save inward dak</Button></>}>
      <InwardFields d={d} set={set} people={people} />
      <div className="mt-4">
        <div className="mb-2 text-[12px] font-semibold text-ink">Scanned copy (envelope and document — photo / PDF)</div>
        <div className="flex flex-wrap items-center gap-2">
          <FilePick label="Envelope scan" accept="image/*,.pdf" multiple onPick={(fs) => setD((x) => ({ ...x, scans: [...x.scans, ...fs.map((f) => ({ ...f, kind: 'Envelope' }))] }))} />
          <FilePick label="Document scan" accept="image/*,.pdf" multiple onPick={(fs) => setD((x) => ({ ...x, scans: [...x.scans, ...fs.map((f) => ({ ...f, kind: 'Document' }))] }))} />
          {d.scans.map((s, i) => (
            <FileChip key={`${s.name}-${i}`} name={s.name} sub={s.kind} />
          ))}
        </div>
      </div>
      {err && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">{err}</p>}
    </Modal>
  )
}

function InwardDetail({ rec, onClose, people, canEdit }: { rec: InwardDak; onClose: () => void; people: string[]; canEdit: boolean }) {
  const [tab, setTab] = useState<'details' | 'custody' | 'audit'>('details')
  const [editing, setEditing] = useState<Draft | null>(null)
  const [reason, setReason] = useState('')
  const [to, setTo] = useState('')
  const [loc, setLoc] = useState('')
  const [note, setNote] = useState('')
  const nextStatus = INWARD_STATUSES[INWARD_STATUSES.indexOf(rec.status) + 1]

  const startEdit = () => {
    setEditing({
      receivedAt: toLocalInput(rec.receivedAt), mode: rec.mode, courierCompany: rec.courierCompany, docketNo: rec.docketNo, sender: rec.sender, envelope: rec.envelope,
      documentType: rec.documentType, description: rec.description, scans: [], receivedBy: rec.receivedBy, department: rec.department, owner: rec.owner, rack: rec.rack,
      register: rec.register, mapping: rec.mapping, tags: rec.tags,
    })
    setReason('')
  }
  const saveEdit = async () => {
    if (!editing) return
    // the edit form re-submits the receipt time as entered; keep the stored value when it did not change (minute precision)
    const receivedAt = toLocalInput(rec.receivedAt) === editing.receivedAt ? rec.receivedAt : new Date(editing.receivedAt).toISOString()
    const res = await updateInwardAsync(rec.id, { ...editing, scans: rec.scans, receivedAt }, reason)
    if (!res.ok) return toast(res.error, 'error')
    toast('Inward dak updated — changes logged')
    setEditing(null)
  }
  const advance = async () => {
    if (!nextStatus || nextStatus === 'Dispatched') return
    const res = await setInwardStatusAsync(rec.id, nextStatus)
    if (res.ok) toast(`Marked ${nextStatus}`)
    else toast(res.error, 'error')
  }
  const addScans = async (fs: PickedFile[], kind: string) => {
    const res = await addInwardScansAsync(rec.id, fs, kind)
    if (res.ok) toast('Scan uploaded')
    else toast(res.error, 'error')
  }
  const doTransfer = async () => {
    const res = await transferCustodyAsync(rec.id, to, loc, note)
    if (!res.ok) return toast(res.error, 'error')
    toast(`Custody transferred to ${to}`)
    setTo('')
    setLoc('')
    setNote('')
  }

  return (
    <Modal title={rec.id} sub={`${rec.sender.name}${rec.sender.organization ? ` · ${rec.sender.organization}` : ''}`} onClose={onClose} width={940}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={inwardTone(rec.status)}>{rec.status}</Badge>
        <span className="text-[12px] text-muted">Custodian <b className="text-ink">{rec.custodian}</b>{rec.rack && <> · {rec.rack}</>}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          {canEdit && !editing && nextStatus && nextStatus !== 'Dispatched' && <Button size="sm" onClick={advance}>Mark {nextStatus}</Button>}
          {canEdit && !editing && <Button size="sm" variant="secondary" onClick={startEdit}>Edit</Button>}
          {!canEdit && <span className="inline-flex items-center gap-1 text-[11px] text-muted"><Lock size={12} /> Read only — Postal / Courier Executive or Admin can update</span>}
        </div>
      </div>
      <div className="mb-4 flex gap-1 border-b border-line">
        {(['details', 'custody', 'audit'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn('-mb-px border-b-2 px-3 py-1.5 text-[12px] font-semibold capitalize', tab === t ? 'border-primary text-primary' : 'border-transparent text-muted')}>
            {t === 'custody' ? 'Custody & movement' : t === 'audit' ? 'Audit' : 'Details'}
          </button>
        ))}
      </div>

      {tab === 'details' && editing && (
        <div>
          <InwardFields d={editing} set={(fn) => setEditing((x) => (x ? fn(x) : x))} people={people} />
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
            <div className="mb-1 text-[12px] font-semibold">Modification reason</div>
            <ReasonBox value={reason} onChange={setReason} />
            <div className="mt-2 flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button size="sm" onClick={saveEdit} disabled={!reason.trim()}>Save changes</Button>
            </div>
          </div>
        </div>
      )}

      {tab === 'details' && !editing && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Info k="Received">{fmtDt(rec.receivedAt)}</Info>
            <Info k="Mode / company">{rec.mode} · {rec.courierCompany || '—'}</Info>
            <Info k="Docket no.">{rec.docketNo}</Info>
            <Info k="Received by">{rec.receivedBy}</Info>
            <Info k="Sender" className="sm:col-span-2">{rec.sender.name}{rec.sender.organization && `, ${rec.sender.organization}`}<div className="text-[11px] text-muted">{rec.sender.address} {rec.sender.phone}</div></Info>
            <Info k="Envelope">{[rec.envelope.number, rec.envelope.type].filter(Boolean).join(' · ')}<div className="text-[11px] text-muted">{rec.envelope.identification}</div></Info>
            <Info k="Document type">{rec.documentType}</Info>
            <Info k="Document description" className="sm:col-span-4">{rec.description}</Info>
            <Info k="Department / owner">{[rec.department, rec.owner].filter(Boolean).join(' · ')}</Info>
            <Info k="Rack / storage">{rec.rack}</Info>
            <Info k="Register reference">{rec.register}</Info>
            <Info k="Outward ref.">{rec.outwardRef}</Info>
            <Info k="Legal ref.">{rec.mapping.legalRef}</Info>
            <Info k="Site ID">{rec.mapping.siteId}</Info>
            <Info k="ATM ID">{rec.mapping.atmId}</Info>
            <Info k="Franchise">{rec.mapping.franchise}</Info>
          </div>
          <div>
            <div className="mb-1.5 text-[12px] font-semibold">Tags</div>
            <TagPicker value={rec.tags} disabled={!canEdit} onChange={(t) => void setInwardTagsAsync(rec.id, t).then((r) => !r.ok && toast(r.error, 'error'))} />
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold">
              Scanned copies
              {canEdit && (
                <>
                  <FilePick label="Add envelope scan" accept="image/*,.pdf" multiple onPick={(fs) => void addScans(fs, 'Envelope')} />
                  <FilePick label="Add document scan" accept="image/*,.pdf" multiple onPick={(fs) => void addScans(fs, 'Document')} />
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {rec.scans.length ? rec.scans.map((s) => <FileChip key={s.name} name={s.name} sub={`${s.kind} · ${fmtDt(s.at)}`} />) : <span className="text-[12px] text-muted">No scan uploaded yet.</span>}
            </div>
          </div>
        </div>
      )}

      {tab === 'custody' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="text-left text-muted">
                <tr>
                  <th className="py-1.5 pr-2 font-medium">When</th>
                  <th className="py-1.5 pr-2 font-medium">Action</th>
                  <th className="py-1.5 pr-2 font-medium">From → To</th>
                  <th className="py-1.5 pr-2 font-medium">Location</th>
                  <th className="py-1.5 pr-2 font-medium">By</th>
                  <th className="py-1.5 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {rec.history.map((h, i) => (
                  <tr key={`${h.at}-${i}`} className="border-t border-line/60 align-top">
                    <td className="py-1.5 pr-2 whitespace-nowrap">{fmtDt(h.at)}</td>
                    <td className="py-1.5 pr-2 font-medium">{h.action}</td>
                    <td className="py-1.5 pr-2">{h.from || h.to ? `${h.from ?? '—'} → ${h.to ?? '—'}` : '—'}</td>
                    <td className="py-1.5 pr-2">{h.location ?? '—'}</td>
                    <td className="py-1.5 pr-2">{h.by}</td>
                    <td className="py-1.5">{h.note ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-line p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold"><ArrowRightLeft size={14} /> Transfer custody</div>
            {canEdit ? (
              <div className="space-y-2.5">
                <SelectField label="Hand over to" options={people.filter((p) => p !== rec.custodian)} value={to} onChange={(e) => setTo(e.target.value)} />
                <SelectField label="New storage location (optional)" options={RACKS} value={loc} onChange={(e) => setLoc(e.target.value)} />
                <TextField label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
                <Button size="sm" block onClick={doTransfer} disabled={!to}>Transfer custody</Button>
              </div>
            ) : (
              <p className="text-[12px] text-muted">Only the Postal / Courier Executive or Admin can transfer custody.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'audit' && <AuditPanel trail={rec.trail} />}
    </Modal>
  )
}

export default function InwardDakTab() {
  const { inward } = useDaakState()
  const h = useHierarchy()
  const u = useOpsUser()
  const canEdit = canManageDak(u)
  const people = useMemo(() => h.employees.filter((e) => e.status === 'Active').map((e) => e.name), [h.employees])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<InwardStatus | ''>('')
  const [tag, setTag] = useState('')
  const [creating, setCreating] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const open = inward.find((r) => r.id === openId)

  const rows = useMemo(() => searchInward(inward, q).filter((r) => (!status || r.status === status) && (!tag || r.tags.includes(tag))), [inward, q, status, tag])
  const tags = useMemo(() => [...new Set(inward.flatMap((r) => r.tags))].sort(), [inward])

  const exportCsv = () =>
    downloadCsv('inward-dak', ['Inward Dak ID', 'Received', 'Mode', 'Company', 'Docket', 'Sender', 'Organisation', 'Envelope', 'Document', 'Received by', 'Department', 'Owner', 'Custodian', 'Rack', 'Register', 'Legal ref', 'Site', 'ATM', 'Franchise', 'Tags', 'Status'],
      rows.map((r) => [r.id, fmtDt(r.receivedAt), r.mode, r.courierCompany, r.docketNo, r.sender.name, r.sender.organization, `${r.envelope.number} ${r.envelope.type}`, r.description, r.receivedBy, r.department, r.owner, r.custodian, r.rack, r.register, r.mapping.legalRef, r.mapping.siteId, r.mapping.atmId, r.mapping.franchise, r.tags.join('; '), r.status]))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search size={14} className="absolute top-2.5 left-2.5 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID, sender, docket, description, register, rack, ATM, tag…" className="h-9 w-full rounded-md border border-line bg-white pr-3 pl-8 text-[12.5px] outline-none focus:border-primary" />
        </div>
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as InwardStatus | '')} className="h-9 rounded-md border border-line bg-white px-2 text-[12px]">
          <option value="">All statuses</option>
          {INWARD_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select aria-label="Tag" value={tag} onChange={(e) => setTag(e.target.value)} className="h-9 rounded-md border border-line bg-white px-2 text-[12px]">
          <option value="">All tags</option>
          {tags.map((t) => <option key={t}>{t}</option>)}
        </select>
        <Button variant="secondary" icon={<Download size={14} />} onClick={exportCsv}>Export</Button>
        {canEdit ? <Button icon={<Plus size={14} />} onClick={() => setCreating(true)}>New inward dak</Button> : <span className="inline-flex items-center gap-1 text-[11px] text-muted"><Lock size={12} /> Create / update: Postal / Courier Executive or Admin</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        {INWARD_STATUSES.map((s) => (
          <button key={s} type="button" onClick={() => setStatus(status === s ? '' : s)} className={cn('rounded-lg border px-3 py-1.5 text-left', status === s ? 'border-primary bg-primary-soft' : 'border-line bg-white')}>
            <div className="text-[11px] text-muted">{s}</div>
            <div className="text-[16px] font-semibold text-ink">{inward.filter((r) => r.status === s).length}</div>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[1000px] text-[12px]">
          <thead className="bg-surface text-left text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Inward Dak ID</th>
              <th className="px-3 py-2 font-medium">Received</th>
              <th className="px-3 py-2 font-medium">Mode / docket</th>
              <th className="px-3 py-2 font-medium">Sender</th>
              <th className="px-3 py-2 font-medium">Document</th>
              <th className="px-3 py-2 font-medium">Dept / owner</th>
              <th className="px-3 py-2 font-medium">Custodian / rack</th>
              <th className="px-3 py-2 font-medium">Tags</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line/70 align-top hover:bg-surface/50">
                <td className="px-3 py-2 font-semibold text-primary">{r.id}<div className="text-[11px] font-normal text-muted">{r.register || 'Not inwarded'}</div></td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDt(r.receivedAt)}</td>
                <td className="px-3 py-2">{r.mode}<div className="text-[11px] text-muted">{[r.courierCompany, r.docketNo].filter(Boolean).join(' · ')}</div></td>
                <td className="px-3 py-2">{r.sender.name}<div className="text-[11px] text-muted">{r.sender.organization}</div></td>
                <td className="max-w-[240px] px-3 py-2"><div className="line-clamp-2">{r.description}</div><div className="text-[11px] text-muted">{r.documentType} · {r.scans.length} scan(s)</div></td>
                <td className="px-3 py-2">{r.department || '—'}<div className="text-[11px] text-muted">{r.owner}</div></td>
                <td className="px-3 py-2">{r.custodian}<div className="text-[11px] text-muted">{r.rack}</div></td>
                <td className="px-3 py-2"><div className="flex max-w-[160px] flex-wrap gap-1">{r.tags.map((t) => <span key={t} className="rounded bg-slate-100 px-1.5 text-[10.5px]">{t}</span>)}</div></td>
                <td className="px-3 py-2"><Badge tone={inwardTone(r.status)}>{r.status}</Badge></td>
                <td className="px-3 py-2"><Button size="sm" variant="ghost" icon={<Eye size={13} />} onClick={() => setOpenId(r.id)}>Open</Button></td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-muted">No inward dak matches the filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && <CreateInwardModal onClose={() => setCreating(false)} people={people} me={u.name} />}
      {open && <InwardDetail key={open.id} rec={open} onClose={() => setOpenId(null)} people={people} canEdit={canEdit} />}
    </div>
  )
}
