// Vendor / third-party data-processor management (DPDP parameter 16, priority P3).
import { useState } from 'react'
import { Building, Pencil, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { logPrivacy, patchItem, privacyStore, shortId, usePrivacy, type Vendor } from '@/data/privacy'
import { DataGrid, FormActions, Note, PageShell, Stat, StatRow, type Col } from '../security/kit'
import { actor, fmtD, useNow } from '../security/util'

const SERVICES: Vendor['service'][] = ['Cloud', 'Hosting', 'SMS Gateway', 'Email', 'Payment', 'Analytics', 'Backup / DR', 'Other']
const DPA: Vendor['dpaStatus'][] = ['Signed', 'Pending', 'Expired', 'Not required']
const day = (iso?: string) => (iso ? iso.slice(0, 10) : '')

function VendorForm({ initial, onClose }: { initial: Vendor | null; onClose: () => void }) {
  const [f, setF] = useState({
    name: initial?.name ?? '',
    service: initial?.service ?? '',
    dataShared: initial?.dataShared ?? '',
    location: initial?.location ?? '',
    dpaStatus: initial?.dpaStatus ?? '',
    dpaSignedOn: day(initial?.dpaSignedOn),
    dpaExpiry: day(initial?.dpaExpiry),
    lastReview: day(initial?.lastReview),
    contact: initial?.contact ?? '',
    notes: initial?.notes ?? '',
  })
  const [err, setErr] = useState<Record<string, string>>({})
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }))
  const submit = () => {
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = 'Required.'
    if (!f.service) e.service = 'Required.'
    if (!f.dataShared.trim()) e.dataShared = 'Which personal data does the vendor process?'
    if (!f.location.trim()) e.location = 'Where is the data stored / processed?'
    if (!f.dpaStatus) e.dpaStatus = 'Required.'
    if (f.dpaStatus === 'Signed') {
      if (!f.dpaSignedOn) e.dpaSignedOn = 'Signing date is required for a signed DPA.'
      if (!f.dpaExpiry) e.dpaExpiry = 'Expiry / renewal date is required.'
      else if (f.dpaSignedOn && f.dpaExpiry <= f.dpaSignedOn) e.dpaExpiry = 'Expiry must be after the signing date.'
    }
    setErr(e)
    if (Object.keys(e).length) return
    const toIso = (d: string) => (d ? new Date(`${d}T00:00:00`).toISOString() : undefined)
    const v: Vendor = { id: initial?.id ?? shortId('VND'), name: f.name.trim(), service: f.service as Vendor['service'], dataShared: f.dataShared.trim(), location: f.location.trim(), dpaStatus: f.dpaStatus as Vendor['dpaStatus'], dpaSignedOn: toIso(f.dpaSignedOn), dpaExpiry: toIso(f.dpaExpiry), lastReview: toIso(f.lastReview), contact: f.contact.trim() || '—', notes: f.notes.trim() || undefined }
    const by = actor()
    if (initial) {
      patchItem('vendors', initial.id, () => v)
      logPrivacy(by, 'Vendor updated', v.name, initial.dpaStatus !== v.dpaStatus ? `DPA ${initial.dpaStatus} → ${v.dpaStatus}` : undefined)
    } else {
      privacyStore.set((s) => ({ ...s, vendors: [...s.vendors, v] }))
      logPrivacy(by, 'Vendor added', v.name, `${v.service}, DPA ${v.dpaStatus}`)
    }
    toast('Vendor saved.')
    onClose()
  }
  return (
    <Modal title={initial ? `Edit — ${initial.name}` : 'Add vendor'} onClose={onClose} width={700}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Vendor name" required value={f.name} onChange={(e) => set('name', e.target.value)} error={err.name} />
          <SelectField label="Service" required options={SERVICES} value={f.service} onChange={(e) => set('service', e.target.value)} error={err.service} />
          <TextField label="Personal data shared" required className="sm:col-span-2" value={f.dataShared} onChange={(e) => set('dataShared', e.target.value)} error={err.dataShared} />
          <TextField label="Data location" required value={f.location} onChange={(e) => set('location', e.target.value)} error={err.location} />
          <SelectField label="Data protection agreement" required options={DPA} value={f.dpaStatus} onChange={(e) => set('dpaStatus', e.target.value)} error={err.dpaStatus} />
          <TextField label="DPA signed on" type="date" required={f.dpaStatus === 'Signed'} value={f.dpaSignedOn} onChange={(e) => set('dpaSignedOn', e.target.value)} error={err.dpaSignedOn} />
          <TextField label="DPA expiry / renewal" type="date" required={f.dpaStatus === 'Signed'} value={f.dpaExpiry} onChange={(e) => set('dpaExpiry', e.target.value)} error={err.dpaExpiry} />
          <TextField label="Last compliance review" type="date" value={f.lastReview} onChange={(e) => set('lastReview', e.target.value)} />
          <TextField label="Privacy contact" value={f.contact} onChange={(e) => set('contact', e.target.value)} />
          <TextAreaField label="Notes" className="sm:col-span-2" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
        <FormActions onBack={onClose} onSubmit={submit} submitLabel="Save vendor" />
      </div>
    </Modal>
  )
}

export default function Vendors() {
  const p = usePrivacy()
  const now = useNow(60_000)
  const [editing, setEditing] = useState<Vendor | null | 'new'>(null)
  const expired = (v: Vendor) => v.dpaStatus === 'Expired' || (v.dpaStatus === 'Signed' && !!v.dpaExpiry && new Date(v.dpaExpiry).getTime() < now)
  const effective = (v: Vendor) => (expired(v) ? 'Expired' : v.dpaStatus)
  const cols: Col<Vendor>[] = [
    { key: 'name', label: 'Vendor', value: (v) => v.name, render: (v) => (<><span className="font-medium text-ink">{v.name}</span>{v.notes && <span className="block max-w-[220px] text-[10.5px] text-muted">{v.notes}</span>}</>) },
    { key: 'svc', label: 'Service', value: (v) => v.service },
    { key: 'data', label: 'Personal data shared', value: (v) => v.dataShared, className: 'max-w-[220px] text-muted' },
    { key: 'loc', label: 'Location', value: (v) => v.location, className: 'text-[11.5px]' },
    { key: 'dpa', label: 'DPA status', value: effective, render: (v) => <Badge tone={effective(v) === 'Signed' ? 'green' : effective(v) === 'Pending' ? 'amber' : effective(v) === 'Expired' ? 'red' : 'gray'}>{effective(v)}</Badge> },
    { key: 'exp', label: 'DPA expiry', value: (v) => fmtD(v.dpaExpiry), className: 'whitespace-nowrap text-muted' },
    { key: 'rev', label: 'Last review', value: (v) => fmtD(v.lastReview), className: 'whitespace-nowrap text-muted' },
    { key: 'contact', label: 'Contact', value: (v) => v.contact, className: 'text-[11px] text-muted' },
  ]
  return (
    <PageShell back="/governance/privacy" backLabel="Back to DPDP Compliance" Icon={Building} color="text-slate-600 bg-slate-50 border-slate-200" title="Vendors & Third Parties" sub="Cloud, hosting, SMS, email and other processors that handle personal data, with their data-protection agreement status." actions={<Button icon={<Plus size={15} />} onClick={() => setEditing('new')}>Add vendor</Button>}>
      <StatRow>
        <Stat label="Vendors" value={p.vendors.length} />
        <Stat label="DPA signed" value={p.vendors.filter((v) => effective(v) === 'Signed').length} tone="green" />
        <Stat label="DPA pending" value={p.vendors.filter((v) => effective(v) === 'Pending').length} tone="amber" />
        <Stat label="DPA expired" value={p.vendors.filter(expired).length} tone="red" />
      </StatRow>
      <Note>Priority P3. A vendor without a signed DPA should not receive personal data — e.g. SMS OTP stays off until the SMS gateway DPA is signed.</Note>
      <DataGrid
        rows={p.vendors}
        cols={cols}
        rowKey={(v) => v.id}
        fileName="privacy-vendors"
        searchPlaceholder="Search vendor, data, location…"
        filters={[
          { key: 'svc', label: 'Services', get: (v) => v.service, options: SERVICES },
          { key: 'dpa', label: 'DPA statuses', get: effective, options: DPA },
        ]}
        actions={(v) => <Button size="sm" variant="secondary" icon={<Pencil size={13} />} onClick={() => setEditing(v)}>Edit</Button>}
      />
      {editing && <VendorForm initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </PageShell>
  )
}
