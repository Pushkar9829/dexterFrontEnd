import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Save, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { RadioGroup, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { TIERS, TIER_TITLE, franchiseStore, useFranchises, type Tier } from '@/data/franchises'
import { nowIso, portabilityStore, useNetwork, type ExitRequest, type ParentKind } from '@/data/network'
import { HANDOVER_KINDS, actor, addExitAsync, fmtDate, handoverOptions, liveChildren, nameOf, nextExitId, portExtraStore, saveExitDraft, today, type ExitDraft } from './model'
import { Crumbs, InfoGrid, PageTitle, Panel } from './ui'

const BLANK: ExitDraft = { frId: '', reason: '', effectiveDate: '', targetKind: '', targetId: '', remark: '' }
type Errors = Partial<Record<keyof ExitDraft, string>>

function Pick({ label, value, onChange, options, error, disabled, placeholder = 'Select', id }: { id: string; label: string; value: string; onChange: (v: string) => void; options: { id: string; label: string }[]; error?: string; disabled?: boolean; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-semibold text-ink">{label}</label>
      <div className="relative">
        <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={cn('h-9 w-full appearance-none rounded-md border bg-white px-[11px] pr-8 text-[12.5px] text-ink outline-none focus:border-primary disabled:bg-surface disabled:text-muted', error ? 'border-brand-red' : 'border-line')}>
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute top-2.5 right-2.5 text-muted" />
      </div>
      {error && <p className="mt-1 text-[11px] text-brand-red">{error}</p>}
    </div>
  )
}

export default function ExitForm() {
  const navigate = useNavigate()
  const net = useNetwork()
  const frs = useFranchises()
  const [id] = useState(nextExitId)
  const [requestDate] = useState(today)
  const [f, setF] = useState<ExitDraft>(() => ({ ...BLANK, ...(portExtraStore.get().exitDraft ?? {}) }))
  const [tier, setTier] = useState<Tier | ''>(() => franchiseStore.get().find((x) => x.id === f.frId)?.tier ?? '')
  const [errors, setErrors] = useState<Errors>({})
  const set = <K extends keyof ExitDraft>(k: K, v: ExitDraft[K]) => {
    setF((p) => ({ ...p, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const parties = useMemo(
    () => (tier ? frs.filter((x) => x.tier === tier && net.nodes[x.id] && net.nodes[x.id].status !== 'Exited').map((x) => ({ id: x.id, label: `${x.name} (${net.nodes[x.id]?.code} · ${x.id})` })) : []),
    [tier, frs, net],
  )
  const node = f.frId ? net.nodes[f.frId] : undefined
  const kids = f.frId ? liveChildren(net, f.frId) : []
  const kinds = tier ? HANDOVER_KINDS(tier) : []
  const targets = handoverOptions(f.targetKind, f.frId, net)

  const validate = (): Errors => {
    const e: Errors = {}
    if (!f.frId) e.frId = 'Select the exiting party'
    if (!f.reason.trim()) e.reason = 'Exit reason is required'
    if (!f.effectiveDate) e.effectiveDate = 'Effective date is required'
    else if (f.effectiveDate < requestDate) e.effectiveDate = 'Effective date cannot be before the request date'
    if (kids.length > 0) {
      if (!f.targetKind) e.targetKind = 'Hand-over target is mandatory — this party has an active network'
      else if (!f.targetId) e.targetId = 'Select who receives the network'
    }
    const open = portabilityStore.get().exits.find((x) => x.frId === f.frId && ['Requested', 'Under Review', 'Approved'].includes(x.status))
    if (f.frId && open) e.frId = `An open exit request (${open.id}) already exists for this party`
    return e
  }

  const submit = () => {
    const e = validate()
    setErrors(e)
    const target = targets.find((t) => t.id === f.targetId)
    if (Object.values(e).some(Boolean) || !node) {
      toast('Please fix the highlighted fields', 'error')
      return
    }
    const at = nowIso()
    const by = actor()
    const req: ExitRequest = {
      id, frId: f.frId, tier: node.tier, requestedOn: at, reason: f.reason.trim(), networkTo: kids.length ? target : undefined,
      settlementCleared: false, documentsReturned: false, nocIssued: false, status: 'Requested',
      log: [{ at, by, text: `Exit requested${kids.length && target ? ` — ${kids.length} child node(s) to be handed over to ${target.name}` : ''}` }],
    }
    addExitAsync(req, { effectiveDate: f.effectiveDate, requestedBy: by, remark: f.remark.trim() || undefined }).then((newId) => {
      if (!newId) return
      saveExitDraft(null)
      toast(`Exit request ${newId} submitted`)
      navigate(`/franchise/exits/${newId}`)
    })
  }

  return (
    <div className="max-w-[1100px] space-y-4 pb-12">
      <Crumbs trail={[{ label: 'Exit Management', to: '/franchise/exits' }, { label: 'New Exit Request' }]} />
      <PageTitle title="Exit Request" sub="Admin raises the exit; Super Admin approves (§25). One flow for SMF, MF and FR (§3.2 note)." />

      <Panel title="Request Details">
        <InfoGrid items={[['Exit Request ID', <span key="id" className="font-semibold">{id}</span>], ['Request Date', fmtDate(requestDate)], ['Requested By', actor()]]} />
      </Panel>

      <Panel title="Exiting Party">
        <div className="grid gap-4 md:grid-cols-2">
          <RadioGroup<Tier>
            label="Tier *"
            value={tier}
            onChange={(v) => {
              setTier(v)
              setF((p) => ({ ...p, frId: '', targetKind: '', targetId: '' }))
            }}
            options={TIERS}
          />
          <Pick id="exit-party" label="Party *" value={f.frId} onChange={(v) => setF((p) => ({ ...p, frId: v, targetKind: '', targetId: '' }))} options={parties} disabled={!tier} placeholder={tier ? `Select ${TIER_TITLE[tier]}` : 'Select the tier first'} error={errors.frId} />
        </div>
        {node && (
          <div className="mt-4">
            <InfoGrid cols={4} items={[['Code', node.code], ['Status', node.status], ['Current Parent', `${node.parent.name} (${node.parent.kind})`], ['Active network', kids.length ? `${kids.length} node(s)` : 'None']]} />
          </div>
        )}
      </Panel>

      {kids.length > 0 && (
        <Panel title="Network Hand-over" sub="Mandatory: on exit the whole network goes to another SMF / MF, a Team Leader or the Company (§27 rule 9).">
          <div className="grid gap-4 md:grid-cols-2">
            <RadioGroup<ParentKind> label="Hand over to *" value={f.targetKind} onChange={(v) => setF((p) => ({ ...p, targetKind: v, targetId: v === 'Company' ? 'DEXTER' : '' }))} options={kinds} error={errors.targetKind} />
            <Pick id="exit-target" label="Receiving party *" value={f.targetId} onChange={(v) => set('targetId', v)} options={targets.map((t) => ({ id: t.id, label: `${t.name} (${t.id})` }))} disabled={!f.targetKind || f.targetKind === 'Company'} error={errors.targetId} />
          </div>
          <p className="mt-3 text-[11.5px] text-muted">
            Moves on exit: {kids.slice(0, 8).map((k) => nameOf(k.frId)).join(', ')}
            {kids.length > 8 ? ` and ${kids.length - 8} more` : ''}
          </p>
        </Panel>
      )}

      <Panel title="Exit Details">
        <div className="grid gap-4 md:grid-cols-2">
          <TextAreaField label="Exit Reason" required name="exit-reason" value={f.reason} onChange={(e) => set('reason', e.target.value)} error={errors.reason} className="md:col-span-2" />
          <TextField label="Effective Date" required type="date" name="exit-eff" min={requestDate} value={f.effectiveDate} onChange={(e) => set('effectiveDate', e.target.value)} error={errors.effectiveDate} />
          <TextField label="Remark" name="exit-remark" value={f.remark} onChange={(e) => set('remark', e.target.value)} />
        </div>
        <p className="mt-3 text-[11.5px] text-muted">The exit checklist (settlement cleared, documents returned, NOC issued) is completed on the request page before approval.</p>
      </Panel>

      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <Button variant="secondary" icon={<ArrowLeft size={14} />} onClick={() => navigate('/franchise/exits')}>Back</Button>
        <Button variant="secondary" icon={<Save size={14} />} onClick={() => { saveExitDraft(f); toast('Draft saved — it will be restored next time you open this form') }}>Save Draft</Button>
        <Button icon={<Send size={14} />} onClick={submit}>Submit</Button>
      </div>
    </div>
  )
}
