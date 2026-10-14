import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, ShieldCheck } from 'lucide-react'
import { ExcelGrid, type GridColumn } from '@/components/grid/ExcelGrid'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { LOCATIONS, STATES } from '@/data/applications'
import { OWNERS, TIERS, addFranchise, franchiseStore, updateFranchises, type Franchise, type Tier } from '@/data/franchises'

const fmtUpdated = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', ',')

export const dossierLink = (id: string) => `/franchise/master-data/${id}`

/** Excel-style franchise register used by Master Data (all tiers) and the three tier lists. */
export function FranchiseGrid({ rows, mode, scope }: { rows: Franchise[]; mode: 'master' | 'tier'; scope?: string }) {
  const columns: GridColumn<Franchise>[] = [
    {
      key: 'id', header: 'Franchise ID', label: 'Franchise ID', width: 130, sortable: true, pinned: true,
      render: (f) => <Link to={dossierLink(f.id)} className="text-primary hover:underline">{f.id}</Link>,
    },
    { key: 'name', header: 'Franchise name', width: 230, sortable: true, filterable: true },
    { key: 'tier', header: 'Tier', width: 120, sortable: true, filterable: true, editable: false },
    { key: 'state', header: 'State', width: 140, sortable: true, filterable: true, options: STATES },
    { key: 'city', header: 'City', width: 130, sortable: true, filterable: true },
    { key: 'atms', header: 'ATMs', width: 70, sortable: true, inputType: 'number', value: (f) => f.atms },
    { key: 'kyc', header: 'KYC status', width: 120, sortable: true, filterable: true, editable: false, render: (f) => <Badge tone={toneFor(f.kyc)}>{f.kyc}</Badge> },
    mode === 'master'
      ? {
          key: 'sd', header: 'SD', label: 'SD', width: 100, editable: false, value: () => '',
          render: (f) => (
            <Link to={`${dossierLink(f.id)}/sd`} className="inline-flex items-center gap-1.5 rounded bg-primary-soft px-2 py-0.5 text-[12px] text-primary hover:underline">
              <Eye size={13} /> View
            </Link>
          ),
        }
      : {
          key: 'status', header: 'Status', width: 100, sortable: true, filterable: true, editable: false,
          render: (f) => <span className={f.status === 'Active' ? 'text-emerald-700' : 'text-muted'}>{f.status}</span>,
        },
    { key: 'updatedAt', header: 'Updated', width: 120, sortable: true, editable: false, render: (f) => fmtUpdated(f.updatedAt) },
  ]

  const [ownerFor, setOwnerFor] = useState<string[] | null>(null)

  return (
    <>
      <ExcelGrid
        title={mode === 'master' ? 'All franchises' : 'Franchise list'}
        countLabel={`${rows.length.toLocaleString('en-IN')} records`}
        rows={rows}
        columns={columns}
        rowId={(f) => f.id}
        searchPlaceholder="Search ID, name or city"
        letters
        selectable
        formulaBar
        editing
        scope={scope}
        onCellChange={(id, key, value) => {
          const patch = key === 'atms' ? { atms: Math.max(0, Number(value) || 0) } : { [key]: value }
          updateFranchises([id], patch as Partial<Franchise>)
        }}
        bulkActions={(ids, clear) => (
          <>
            <button className="text-primary" onClick={() => setOwnerFor(ids)}>
              Assign owner
            </button>
            <button
              className="text-primary"
              onClick={() => {
                const target = franchiseStore.get().find((f) => f.id === ids[0])?.status === 'Active' ? 'Inactive' : 'Active'
                updateFranchises(ids, { status: target })
                toast(`${ids.length} franchise${ids.length > 1 ? 's' : ''} marked ${target}`)
                clear()
              }}
            >
              Update status
            </button>
            <button
              className="text-primary"
              onClick={() => {
                updateFranchises(ids, { kyc: 'Pending' })
                toast(`KYC requested for ${ids.length} franchise${ids.length > 1 ? 's' : ''}`)
                clear()
              }}
            >
              Request KYC
            </button>
            <button className="text-muted" onClick={clear}>
              Clear selection
            </button>
          </>
        )}
        exportName={mode === 'master' ? 'franchise-master-data' : 'franchise-list'}
      />
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-[12px] text-muted">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-primary" /> All edits are versioned and recorded in Governance → Audit.
        </span>
        <span>Source: Franchise registry · Synced every 15 minutes</span>
      </div>
      {ownerFor && (
        <Modal title="Assign owner" sub={`${ownerFor.length} franchise${ownerFor.length > 1 ? 's' : ''} selected`} onClose={() => setOwnerFor(null)}>
          <div className="space-y-1">
            {OWNERS.map((o) => (
              <button
                key={o}
                onClick={() => {
                  updateFranchises(ownerFor, { owner: o })
                  toast(`Owner set to ${o}`)
                  setOwnerFor(null)
                }}
                className="block w-full rounded-md px-3 py-2 text-left text-[13px] hover:bg-surface"
              >
                {o}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  )
}

/** "Add franchise" dialog + "Import .xlsx" (CSV) shared by list pages. */
export function useAddFranchise(defaultTier?: Tier) {
  const [open, setOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const importFile = async (file?: File) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast('Excel (.xlsx) import is handled by the backend. Save the sheet as CSV to import it here.', 'info')
      return
    }
    const lines = (await file.text()).split(/\r?\n/).filter(Boolean)
    const head = lines[0].split(',').map((h) => h.trim().toLowerCase())
    const col = (name: string) => head.findIndex((h) => h.includes(name))
    let n = 0
    for (const line of lines.slice(1)) {
      const c = line.split(',').map((x) => x.trim())
      const name = c[col('name')]
      const state = c[col('state')]
      if (!name || !STATES.includes(state)) continue
      const tier = (TIERS.find((t) => t.toLowerCase() === (c[col('tier')] ?? '').toLowerCase()) ?? defaultTier ?? 'Franchise') as Tier
      addFranchise({ name, tier, state, city: c[col('city')] || LOCATIONS[state].cities[0], atms: Number(c[col('atm')]) || 0 })
      n++
    }
    toast(n ? `Imported ${n} franchise${n > 1 ? 's' : ''}` : 'No valid rows found (needs name, tier, state, city, ATMs columns)', n ? 'success' : 'info')
  }

  const ui = (
    <>
      <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />
      {open && <AddFranchiseModal defaultTier={defaultTier} onClose={() => setOpen(false)} />}
    </>
  )
  return { openAdd: () => setOpen(true), openImport: () => fileRef.current?.click(), ui }
}

function AddFranchiseModal({ defaultTier, onClose }: { defaultTier?: Tier; onClose: () => void }) {
  const [f, setF] = useState({ name: '', tier: defaultTier ?? '', state: '', city: '', atms: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const save = () => {
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = 'Required'
    if (!f.tier) e.tier = 'Required'
    if (!f.state) e.state = 'Required'
    if (!f.city) e.city = 'Required'
    if (f.atms && (Number.isNaN(Number(f.atms)) || Number(f.atms) < 0)) e.atms = 'Enter a number'
    setErr(e)
    if (Object.keys(e).length) return
    const fr = addFranchise({ name: f.name.trim(), tier: f.tier as Tier, state: f.state, city: f.city, atms: Number(f.atms) || 0 })
    toast(`${fr.id} · ${fr.name} added`)
    onClose()
  }
  return (
    <Modal
      title="Add franchise"
      sub="Creates a registry record. KYC starts as Pending."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Add franchise</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField className="sm:col-span-2" label="Franchise name" required name="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err.name} />
        <SelectField label="Tier" required name="tier" options={TIERS} value={f.tier} onChange={(e) => setF({ ...f, tier: e.target.value })} error={err.tier} />
        <TextField label="ATMs" name="atms" inputMode="numeric" value={f.atms} onChange={(e) => setF({ ...f, atms: e.target.value })} error={err.atms} />
        <SelectField label="State" required name="state" options={STATES} value={f.state} onChange={(e) => setF({ ...f, state: e.target.value, city: '' })} error={err.state} />
        <SelectField label="City" required name="city" options={LOCATIONS[f.state]?.cities ?? []} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} error={err.city} />
      </div>
    </Modal>
  )
}
