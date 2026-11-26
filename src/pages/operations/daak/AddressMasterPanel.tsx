import { useMemo, useState } from 'react'
import { History, MapPin, Pencil, Plus, Search } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { addressSnapshot, useAddresses, type Address } from '@/data/workflow'
import { saveAddressAsync, useDaakLoad } from '@/data/daakData'
import { canManageDak, useOpsUser } from '../recon2/opsAccess'
import { ReasonBox } from '../recon2/shared'
import { fmtDt, searchAddresses } from '../recon2/util'

type AddrDraft = { id?: string; name: string; organization: string; line1: string; city: string; state: string; pin: string; phone: string; tags: string }
const blank: AddrDraft = { name: '', organization: '', line1: '', city: '', state: '', pin: '', phone: '', tags: '' }

/** Create / edit one Address Master entry. Edits need a reason; old version goes to the address history. */
export function AddressEditor({ initial, onClose, onSaved }: { initial?: Address; onClose: () => void; onSaved?: (id: string) => void }) {
  const [d, setD] = useState<AddrDraft>(() => (initial ? { ...initial, tags: initial.tags.join(', ') } : blank))
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (initial && !reason.trim()) return toast('Reason for the address change is mandatory', 'error')
    if (busy) return
    setBusy(true)
    const res = await saveAddressAsync({ ...d, tags: d.tags.split(',').map((t) => t.trim()).filter(Boolean) }, reason).finally(() => setBusy(false))
    if (!res.ok) return toast(res.error, 'error')
    toast(initial ? 'Address updated — past dispatches keep their snapshot' : `Address ${res.id} saved to the Address Master`)
    onSaved?.(res.id)
    onClose()
  }
  const f = (k: keyof AddrDraft, label: string, req?: boolean, cls?: string) => (
    <TextField label={label} required={req} className={cls} value={d[k] ?? ''} onChange={(e) => setD((x) => ({ ...x, [k]: e.target.value }))} />
  )
  return (
    <Modal title={initial ? `Edit ${initial.id}` : 'New address'} sub="Address Master — Onboarding › Setup (§10.1)" onClose={onClose} width={640} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>Save address</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {f('name', 'Contact person / designation', true)}
        {f('organization', 'Organisation', true)}
        {f('line1', 'Address line', true, 'sm:col-span-2')}
        {f('city', 'City', true)}
        {f('state', 'State')}
        {f('pin', 'PIN code', true)}
        {f('phone', 'Phone')}
        {f('tags', 'Tags (comma separated)', false, 'sm:col-span-2')}
      </div>
      {initial && (
        <div className="mt-3">
          <div className="mb-1 text-[12px] font-semibold">Reason for change</div>
          <ReasonBox value={reason} onChange={setReason} />
        </div>
      )}
    </Modal>
  )
}

export default function AddressMasterPanel() {
  useDaakLoad() // API mode: hydrates the Address Master from /courier/addresses
  const list = useAddresses()
  const u = useOpsUser()
  const canEdit = canManageDak(u)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Address | 'new' | null>(null)
  const [histId, setHistId] = useState<string | null>(null)
  const rows = useMemo(() => searchAddresses(list, q), [list, q])
  const hist = list.find((a) => a.id === histId)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search size={14} className="absolute top-2.5 left-2.5 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search saved addresses — name, organisation, city, PIN, tag…" className="h-9 w-full rounded-md border border-line bg-white pr-3 pl-8 text-[12.5px] outline-none focus:border-primary" />
        </div>
        {canEdit && <Button icon={<Plus size={14} />} onClick={() => setEditing('new')}>New address</Button>}
      </div>
      <p className="text-[12px] text-muted">Saved addresses are reused in Outward Dak. Updating an address never changes past dispatch records — each dispatch keeps the snapshot taken at dispatch time.</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((a) => (
          <div key={a.id} className="rounded-xl border border-line bg-white p-4">
            <div className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-ink">{a.organization}</div>
                <div className="text-[12px] text-ink-2">{a.name}</div>
                <div className="mt-1 text-[12px] text-muted">{a.line1}, {a.city}, {a.state} - {a.pin}</div>
                <div className="text-[12px] text-muted">{a.phone}</div>
              </div>
              <span className="text-[11px] font-semibold text-muted">{a.id}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {a.tags.map((t) => <span key={t} className="rounded bg-slate-100 px-1.5 text-[10.5px]">{t}</span>)}
              <span className="ml-auto text-[11px] text-muted">Updated {a.updatedAt}</span>
            </div>
            <div className="mt-3 flex gap-2">
              {canEdit && <Button size="sm" variant="secondary" icon={<Pencil size={12} />} onClick={() => setEditing(a)}>Edit</Button>}
              <Button size="sm" variant="ghost" icon={<History size={12} />} onClick={() => setHistId(a.id)} className={cn(!a.history.length && 'opacity-60')}>History ({a.history.length})</Button>
            </div>
          </div>
        ))}
        {!rows.length && <p className="text-[12px] text-muted">No address matches.</p>}
      </div>
      {editing && <AddressEditor initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {hist && (
        <Modal title={`${hist.id} history`} sub={hist.organization} onClose={() => setHistId(null)} width={620}>
          <div className="space-y-2 text-[12px]">
            <div className="rounded-md bg-emerald-50 px-3 py-2"><b>Current:</b> {addressSnapshot(hist)}</div>
            {[...hist.history].reverse().map((h, i) => (
              <div key={`${h.at}-${i}`} className="rounded-md border border-line px-3 py-2">
                <div className="text-muted">{fmtDt(h.at)} · {h.by}</div>
                <div className="text-ink-2 line-through decoration-slate-300">{h.snapshot}</div>
              </div>
            ))}
            {!hist.history.length && <p className="text-muted">No changes since creation.</p>}
          </div>
        </Modal>
      )}
    </div>
  )
}
