import { useMemo, useState } from 'react'
import { History, Pencil, Plus, Save } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { can, useRole } from '@/lib/rbac'
import { actorName, addressSnapshot, addressStore, logAudit, nowIso, useAddresses, type Address } from '@/data/workflow'
import { BTN_PRIMARY, BTN_SECONDARY, EmptyRow, FilterCard, FilterSelect, PageHead, TD, THead, TROW, TableCard, WfCrumbs } from './ui'
import { fmtD, fmtDT, usePaged } from './helpers'

const COLS = ['Address ID', 'Name / Attention', 'Organization', 'Address', 'City', 'State', 'PIN', 'Phone', 'Tags', 'Updated', 'Versions', 'Actions']
type Form = { name: string; organization: string; line1: string; city: string; state: string; pin: string; phone: string; tags: string }
type Errors = Partial<Record<keyof Form, string>>
const EMPTY: Form = { name: '', organization: '', line1: '', city: '', state: '', pin: '', phone: '', tags: '' }

export default function AddressMaster() {
  const role = useRole()
  const canCreate = can('Create', role)
  const canEdit = can('Edit', role)
  const list = useAddresses()
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('all')
  const [state, setState] = useState('all')
  const [edit, setEdit] = useState<Address | 'new' | null>(null)
  const [hist, setHist] = useState<Address | null>(null)
  const tags = useMemo(() => [...new Set(list.flatMap((a) => a.tags))].sort(), [list])
  const states = useMemo(() => [...new Set(list.map((a) => a.state))].sort(), [list])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return list.filter((a) => (tag === 'all' || a.tags.includes(tag)) && (state === 'all' || a.state === state) && (!s || addressSnapshot(a).toLowerCase().includes(s) || a.id.toLowerCase().includes(s)))
  }, [list, q, tag, state])
  const pg = usePaged(rows, `${q}|${tag}|${state}`)

  return (
    <div className="space-y-5 pb-16 max-w-[1440px]">
      <WfCrumbs trail={[{ label: 'Address Master' }]} />
      <PageHead
        title="Address Master"
        sub="Saved addresses for outgoing dak / courier and letters — search and reuse instead of typing again. Editing keeps the previous version; dispatch records keep their own snapshot."
        actions={canCreate && <button type="button" className={BTN_PRIMARY} onClick={() => setEdit('new')}><Plus size={16} /> Add Address</button>}
      />
      <FilterCard
        search={q}
        onSearch={setQ}
        placeholder="Name, organisation, city, PIN…"
        onReset={() => {
          setQ('')
          setTag('all')
          setState('all')
        }}
        onDownload={() => downloadCsv('address-master', COLS.slice(0, -2), rows.map((a) => [a.id, a.name, a.organization, a.line1, a.city, a.state, a.pin, a.phone, a.tags.join('; '), a.updatedAt]))}
      >
        <FilterSelect label="Tag" value={tag} onChange={setTag} options={tags} all="All tags" />
        <FilterSelect label="State" value={state} onChange={setState} options={states} all="All states" />
      </FilterCard>
      <TableCard title="Saved addresses" total={rows.length} page={pg.page} pageSize={pg.pageSize} onPage={pg.setPage} onPageSize={pg.setPageSize} noun="addresses" minWidth={1300}>
        <THead cols={COLS} />
        <tbody>
          {pg.slice.length === 0 && <EmptyRow cols={COLS.length} />}
          {pg.slice.map((a) => (
            <tr key={a.id} className={TROW}>
              <td className={`${TD} font-semibold`}>{a.id}</td>
              <td className={TD}>{a.name}</td>
              <td className={TD}>{a.organization}</td>
              <td className={`${TD} max-w-[220px] truncate`} title={a.line1}>{a.line1}</td>
              <td className={TD}>{a.city}</td>
              <td className={TD}>{a.state}</td>
              <td className={TD}>{a.pin}</td>
              <td className={TD}>{a.phone}</td>
              <td className={TD}><span className="flex gap-1">{a.tags.map((t) => <Badge key={t} tone="navy" dot={false}>{t}</Badge>)}</span></td>
              <td className={TD}>{fmtD(a.updatedAt)}</td>
              <td className={TD}>{a.history.length + 1}</td>
              <td className={TD}>
                <div className="flex gap-3 font-semibold text-[#0066FF]">
                  {canEdit && <button type="button" className="inline-flex items-center gap-1 hover:underline" onClick={() => setEdit(a)}><Pencil size={13} /> Edit</button>}
                  <button type="button" className="inline-flex items-center gap-1 hover:underline" onClick={() => setHist(a)}><History size={13} /> History</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </TableCard>
      {edit && <AddressModal addr={edit === 'new' ? undefined : edit} list={list} onClose={() => setEdit(null)} />}
      {hist && (
        <Modal title="Address history" sub={`${hist.id} · ${hist.organization}`} onClose={() => setHist(null)} width={620} footer={<button type="button" className={BTN_PRIMARY} onClick={() => setHist(null)}>Close</button>}>
          <ul className="space-y-2 text-[12px]">
            <li className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3"><div className="font-semibold">Current · {fmtD(hist.updatedAt)}</div>{addressSnapshot(hist)}</li>
            {[...hist.history].reverse().map((x, i) => (
              <li key={`${x.at}-${i}`} className="rounded-lg border border-slate-200 p-3"><div className="font-semibold text-slate-600">Until {fmtDT(x.at)} · changed by {x.by}</div>{x.snapshot}</li>
            ))}
            {hist.history.length === 0 && <li className="text-slate-500">No earlier versions.</li>}
          </ul>
        </Modal>
      )}
    </div>
  )
}

function AddressModal({ addr, list, onClose }: { addr?: Address; list: Address[]; onClose: () => void }) {
  const [f, setF] = useState<Form>(addr ? { ...addr, tags: addr.tags.join(', ') } : EMPTY)
  const [err, setErr] = useState<Errors>({})
  const set = (k: keyof Form, v: string) => {
    setF((p) => ({ ...p, [k]: v }))
    setErr((e) => ({ ...e, [k]: undefined }))
  }
  const save = () => {
    const e: Errors = {}
    if (!f.name.trim()) e.name = 'Name / attention is required.'
    if (!f.organization.trim()) e.organization = 'Organisation is required.'
    if (!f.line1.trim()) e.line1 = 'Address line is required.'
    if (!f.city.trim()) e.city = 'City is required.'
    if (!f.state.trim()) e.state = 'State is required.'
    if (!/^[1-9]\d{5}$/.test(f.pin.trim())) e.pin = 'Enter a valid 6-digit PIN code.'
    if (!/^[0-9+\-\s()]{8,16}$/.test(f.phone.trim())) e.phone = 'Enter a valid phone number.'
    setErr(e)
    if (Object.keys(e).length) return
    const tags = [...new Set(f.tags.split(',').map((t) => t.trim()).filter(Boolean))]
    const data = { name: f.name.trim(), organization: f.organization.trim(), line1: f.line1.trim(), city: f.city.trim(), state: f.state.trim(), pin: f.pin.trim(), phone: f.phone.trim(), tags }
    const dupe = list.find((a) => a.id !== addr?.id && addressSnapshot({ ...a }).toLowerCase() === addressSnapshot({ ...a, ...data }).toLowerCase())
    if (dupe) {
      toast(`This address already exists as ${dupe.id} — reuse it instead.`, 'error')
      return
    }
    const today = nowIso().slice(0, 10)
    if (addr) {
      const changed = (Object.keys(data) as (keyof typeof data)[]).some((k) => JSON.stringify(data[k]) !== JSON.stringify(addr[k]))
      if (!changed) {
        toast('No changes to save.', 'info')
        return
      }
      addressStore.set((l) => l.map((a) => (a.id === addr.id ? { ...a, ...data, updatedAt: today, history: [...a.history, { at: nowIso(), by: actorName(), snapshot: addressSnapshot(a) }] } : a)))
      logAudit('Address Master', addr.id, 'Address updated (old version kept)', addressSnapshot(addr))
      toast(`${addr.id} updated. The previous version is kept in history.`)
    } else {
      const n = list.reduce((m, a) => Math.max(m, Number(a.id.replace(/\D/g, '')) || 0), 0) + 1
      const id = `ADR-${String(n).padStart(3, '0')}`
      addressStore.set((l) => [{ id, ...data, updatedAt: today, history: [] }, ...l])
      logAudit('Address Master', id, 'Address added', `${data.organization}, ${data.city}`)
      toast(`Address ${id} saved.`)
    }
    onClose()
  }
  return (
    <Modal title={addr ? `Edit ${addr.id}` : 'Add address'} sub={addr ? 'Saving keeps the current version in history.' : 'Saved addresses can be searched and reused in dispatch.'} onClose={onClose} width={640} footer={<><button type="button" className={BTN_SECONDARY} onClick={onClose}>Cancel</button><button type="button" className={BTN_PRIMARY} onClick={save}><Save size={15} /> Save</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Name / Attention" required value={f.name} onChange={(e) => set('name', e.target.value)} error={err.name} />
        <TextField label="Organization" required value={f.organization} onChange={(e) => set('organization', e.target.value)} error={err.organization} />
        <TextField className="sm:col-span-2" label="Address line" required value={f.line1} onChange={(e) => set('line1', e.target.value)} error={err.line1} />
        <TextField label="City" required value={f.city} onChange={(e) => set('city', e.target.value)} error={err.city} />
        <TextField label="State" required value={f.state} onChange={(e) => set('state', e.target.value)} error={err.state} />
        <TextField label="PIN code" required inputMode="numeric" maxLength={6} value={f.pin} onChange={(e) => set('pin', e.target.value.replace(/\D/g, ''))} error={err.pin} />
        <TextField label="Phone" required value={f.phone} onChange={(e) => set('phone', e.target.value)} error={err.phone} />
        <TextField className="sm:col-span-2" label="Tags" value={f.tags} onChange={(e) => set('tags', e.target.value)} hint="Comma separated, e.g. Bank, NPCI, Internal" />
      </div>
    </Modal>
  )
}
