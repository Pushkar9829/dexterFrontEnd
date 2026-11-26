import { useMemo, useState, type SelectHTMLAttributes } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Save, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FileDrop, RadioGroup, SectionTitle, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { TRANSFER_TYPES, nowIso, portabilityStore, useNetwork, useSites, type TransferRequest, type TransferScope, type TransferType } from '@/data/network'
import {
  TYPE_RULES,
  actor,
  addTransferAsync,
  currentParentFor,
  fmtDate,
  liveChildren,
  mappingView,
  membersFor,
  nameOf,
  nextTransferId,
  portExtraStore,
  refLabel,
  saveTransferDraft,
  scopeHelp,
  subjectOptions,
  subjectSites,
  targetOptions,
  today,
  type TransferDraft,
} from './model'
import { Crumbs, InfoGrid, PageTitle, Panel } from './ui'

const BLANK: TransferDraft = {
  type: '', subjectId: '', targetId: '', scope: '', memberIds: [], siteIds: [], reason: '',
  noc: null, letter: null, supporting: null, emailRef: '', correspondence: '', effectiveDate: '',
}
type Errors = Partial<Record<keyof TransferDraft | 'mapping', string>>

/** Select with id/label options (same look as Form.tsx SelectField). */
function PickField({ label, required, error, options, placeholder = 'Select', hint, ...rest }: { label: string; required?: boolean; error?: string; hint?: string; options: { id: string; label: string }[]; placeholder?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label htmlFor={rest.id} className="mb-1.5 block text-[11px] font-semibold text-ink">
        {label}
        {required && ' *'}
      </label>
      <div className="relative">
        <select {...rest} className={cn('h-9 w-full appearance-none rounded-md border bg-white px-[11px] pr-8 text-[12.5px] text-ink outline-none focus:border-primary disabled:bg-surface disabled:text-muted', error ? 'border-brand-red' : 'border-line')}>
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute top-2.5 right-2.5 text-muted" />
      </div>
      {error ? <p className="mt-1 text-[11px] text-brand-red">{error}</p> : hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </div>
  )
}

export default function TransferForm() {
  const navigate = useNavigate()
  const net = useNetwork()
  const sites = useSites()
  const [id] = useState(nextTransferId)
  const [requestDate] = useState(today)
  const [f, setF] = useState<TransferDraft>(() => ({ ...BLANK, ...(portExtraStore.get().transferDraft ?? {}) }))
  const [errors, setErrors] = useState<Errors>({})
  const set = <K extends keyof TransferDraft>(k: K, v: TransferDraft[K]) => {
    setF((p) => ({ ...p, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined, mapping: undefined }))
  }

  const type = f.type || null
  const rules = type ? TYPE_RULES[type] : null
  const subjects = useMemo(() => (type ? subjectOptions(type, net) : []), [type, net])
  const current = type ? currentParentFor(type, f.subjectId, f.scope, net) : null
  const targets = useMemo(() => (type && f.subjectId ? targetOptions(type, f.subjectId, current, net) : []), [type, f.subjectId, current, net])
  const target = targets.find((t) => t.id === f.targetId) ?? null
  const subjectNode = f.subjectId ? net.nodes[f.subjectId] : undefined
  const smfMembers = rules?.subject === 'SMF' && f.subjectId ? liveChildren(net, f.subjectId) : []
  const siteList = type && f.subjectId && f.scope === 'Selected Sites' ? subjectSites(type, f.subjectId, net, sites) : []
  const cur = current ? mappingView(current, current, net) : null
  const nxt = target ? mappingView(target, target, net) : null

  const pickType = (t: TransferType) => {
    const r = TYPE_RULES[t]
    setF((p) => ({ ...p, type: t, subjectId: '', targetId: r.target === 'Company' ? 'DEXTER' : '', scope: r.scopes[0], memberIds: [], siteIds: [] }))
    setErrors({})
  }
  const pickSubject = (sid: string) => {
    setF((p) => ({ ...p, subjectId: sid, targetId: p.type && TYPE_RULES[p.type].target === 'Company' ? 'DEXTER' : '', memberIds: [], siteIds: [] }))
    setErrors((e) => ({ ...e, subjectId: undefined, targetId: undefined, mapping: undefined }))
  }
  const toggle = (k: 'memberIds' | 'siteIds', v: string) => set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v])

  const validate = (): Errors => {
    const e: Errors = {}
    if (!f.type) e.type = 'Select the transfer type'
    if (!f.subjectId) e.subjectId = 'Select who is being transferred'
    if (!f.targetId || !target) e.targetId = 'Select the new parent'
    if (!f.scope) e.scope = 'Select the transfer scope'
    if (!f.reason.trim()) e.reason = 'Transfer reason is required'
    if (!f.letter) e.letter = 'Request letter is required'
    if (!f.emailRef.trim()) e.emailRef = 'Email reference is required'
    if (!f.effectiveDate) e.effectiveDate = 'Effective date is required'
    else if (f.effectiveDate < requestDate) e.effectiveDate = 'Effective date cannot be before the request date'
    if (current && target && current.id === target.id) e.mapping = 'Current parent and new parent are the same — choose a different new parent.'
    if (f.scope === 'Selected Sites' && f.siteIds.length === 0) e.siteIds = 'Select at least one site'
    if (rules?.subject === 'SMF' && f.scope === 'MF' && f.memberIds.length === 0) e.memberIds = 'Select at least one MF'
    if (type && f.subjectId && f.scope && current && target && !e.siteIds && !e.memberIds) {
      const probe = { type, scope: f.scope, subjectIds: [f.subjectId], siteIds: f.siteIds } as TransferRequest
      if (membersFor(probe, { subjectKind: rules?.subject, memberIds: f.memberIds }, net, sites).length === 0) e.mapping = 'Nothing would move — this party has no active network for the selected scope.'
    }
    const open = portabilityStore.get().transfers.find((t) => t.subjectIds.includes(f.subjectId) && ['Pending', 'Under Review', 'Approved'].includes(t.status))
    if (f.subjectId && open) e.subjectId = `An open transfer (${open.id}) already exists for this party`
    return e
  }

  const saveDraft = () => {
    saveTransferDraft(f)
    toast('Draft saved — it will be restored next time you open this form')
  }

  const submit = () => {
    const e = validate()
    setErrors(e)
    if (Object.values(e).some(Boolean) || !type || !current || !target || !f.scope) {
      toast('Please fix the highlighted fields', 'error')
      return
    }
    const at = nowIso()
    const by = actor()
    const t: TransferRequest = {
      id, type, requestedOn: at, requestedBy: by, subjectIds: [f.subjectId], siteIds: f.scope === 'Selected Sites' ? f.siteIds : [], scope: f.scope as TransferScope,
      current, next: target, reason: f.reason.trim(),
      documents: { noc: f.noc?.name, requestLetter: f.letter?.name, supporting: f.supporting ? [f.supporting.name] : [] },
      emailRef: f.emailRef.trim(), correspondence: f.correspondence.trim(), crmVerified: false, newParentAccepted: false, nocOverride: false,
      effectiveDate: f.effectiveDate, stage: f.noc ? 2 : 1, status: f.noc ? 'Under Review' : 'Pending',
      log: [{ at, by, text: 'Transfer request raised' }, ...(f.noc ? [{ at, by, text: `NOC uploaded with the request (${f.noc.name})` }] : [])],
    }
    addTransferAsync(t, { subjectKind: rules?.subject, memberIds: f.scope === 'MF' && rules?.subject === 'SMF' ? f.memberIds : undefined, snapshot: mappingView(current, target, net) }).then((newId) => {
      if (!newId) return
      saveTransferDraft(null)
      toast(`Transfer request ${newId} submitted`)
      navigate(`/franchise/transfers/${newId}`)
    })
  }

  return (
    <div className="max-w-[1200px] space-y-4 pb-12">
      <Crumbs trail={[{ label: 'Transfer & Portability', to: '/franchise/transfers' }, { label: 'New Transfer Request' }]} />
      <PageTitle title="Transfer Request" sub="NOC-based transfer (§6.2). The request goes through NOC, new parent acceptance, CRM verification and Super Admin approval." />

      <Panel title="Request Details">
        <SectionTitle num="1" title="Request details" />
        <InfoGrid items={[['Transfer Request ID', <span key="id" className="font-semibold">{id}</span>], ['Request Date', fmtDate(requestDate)], ['Requested By', actor()]]} />
      </Panel>

      <Panel title="Transfer Type" sub="Choose one of the seven transfer types (§6.1).">
        <div role="radiogroup" className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {TRANSFER_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              role="radio"
              aria-checked={f.type === t.type}
              onClick={() => pickType(t.type)}
              className={cn('cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-colors', f.type === t.type ? 'border-primary bg-primary-soft' : 'border-line bg-white hover:border-primary/40')}
            >
              <div className={cn('text-[12.5px] font-semibold', f.type === t.type ? 'text-primary' : 'text-ink')}>{t.type}</div>
              <div className="mt-0.5 text-[11px] text-muted">{t.desc}</div>
            </button>
          ))}
        </div>
        {errors.type && <p className="mt-2 text-[11px] text-brand-red">{errors.type}</p>}
      </Panel>

      {type && rules && (
        <>
          <Panel title="Subject & Scope" sub={`Who is being transferred (${rules.subject}) and how much of the network moves.`}>
            <div className="grid gap-4 md:grid-cols-2">
              <PickField
                id="trf-subject"
                label={rules.subject === 'Team Leader' ? 'Team Leader' : `${rules.subject} to transfer`}
                required
                value={f.subjectId}
                onChange={(e) => pickSubject(e.target.value)}
                options={subjects}
                error={errors.subjectId}
                hint={subjectNode ? `Status: ${subjectNode.status} · Current parent: ${subjectNode.parent.name}` : undefined}
              />
              <RadioGroup<TransferScope> label="Transfer Scope *" value={f.scope} onChange={(v) => { setF((p) => ({ ...p, scope: v, memberIds: [], siteIds: [] })); setErrors((e) => ({ ...e, scope: undefined, mapping: undefined })) }} options={rules.scopes} error={errors.scope} />
            </div>
            {f.scope && <p className="mt-2 text-[11.5px] text-muted">{scopeHelp(type, f.scope)}</p>}

            {rules.subject === 'SMF' && f.scope === 'MF' && f.subjectId && (
              <div className="mt-4">
                <div className="mb-1.5 text-[11px] font-semibold text-ink">MFs to move *</div>
                <div className="scroll-thin grid max-h-56 gap-1.5 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2">
                  {smfMembers.map((m) => (
                    <label key={m.frId} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] hover:bg-surface">
                      <input type="checkbox" className="accent-[#0066FF]" checked={f.memberIds.includes(m.frId)} onChange={() => toggle('memberIds', m.frId)} />
                      {nameOf(m.frId)} <span className="text-muted">({m.code})</span>
                    </label>
                  ))}
                  {smfMembers.length === 0 && <span className="px-2 py-1.5 text-[12px] text-muted">This SMF has no active MFs.</span>}
                </div>
                {errors.memberIds && <p className="mt-1 text-[11px] text-brand-red">{errors.memberIds}</p>}
              </div>
            )}

            {f.scope === 'Selected Sites' && f.subjectId && (
              <div className="mt-4">
                <div className="mb-1.5 text-[11px] font-semibold text-ink">Sites to transfer * <span className="font-normal text-muted">({f.siteIds.length} selected)</span></div>
                <div className="scroll-thin grid max-h-64 gap-1.5 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2">
                  {siteList.map((s) => (
                    <label key={s.siteId} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] hover:bg-surface">
                      <input type="checkbox" className="accent-[#0066FF]" checked={f.siteIds.includes(s.siteId)} onChange={() => toggle('siteIds', s.siteId)} />
                      <span className="font-medium">{s.siteId}</span> <span className="text-muted">ATM {s.atmId} · {s.location}</span>
                    </label>
                  ))}
                  {siteList.length === 0 && <span className="px-2 py-1.5 text-[12px] text-muted">No sites found for this party in Site Master.</span>}
                </div>
                {errors.siteIds && <p className="mt-1 text-[11px] text-brand-red">{errors.siteIds}</p>}
              </div>
            )}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Existing Mapping" sub="Auto-filled from the current parent of what moves.">
              <InfoGrid cols={2} items={[['Current SMF', refLabel(cur?.curSmf ?? undefined)], ['Current MF', refLabel(cur?.curMf ?? undefined)], ['Current Parent', current ? `${refLabel(current)} · ${current.kind}` : '—']]} />
            </Panel>
            <Panel title="New Mapping" sub={`New parent must be a ${rules.target}.`}>
              <PickField
                id="trf-target"
                label={`New Parent (${rules.target})`}
                required
                value={f.targetId}
                disabled={!f.subjectId || rules.target === 'Company'}
                onChange={(e) => set('targetId', e.target.value)}
                options={targets.map((t) => ({ id: t.id, label: `${t.name} (${t.id})` }))}
                placeholder={f.subjectId ? 'Select new parent' : 'Select the subject first'}
                error={errors.targetId}
              />
              <div className="mt-3">
                <InfoGrid cols={2} items={[['New SMF', refLabel(nxt?.newSmf ?? undefined)], ['New MF', refLabel(nxt?.newMf ?? undefined)], ['New Parent', target ? `${refLabel(target)} · ${target.kind}` : '—']]} />
              </div>
            </Panel>
          </div>
          {errors.mapping && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{errors.mapping}</p>}

          <Panel title="Reason, Documents & Communication">
            <div className="grid gap-4 md:grid-cols-2">
              <TextAreaField label="Transfer Reason" required name="trf-reason" value={f.reason} onChange={(e) => set('reason', e.target.value)} error={errors.reason} className="md:col-span-2" />
              <div>
                <div className="mb-1.5 text-[11px] font-semibold text-ink">NOC (from current parent)</div>
                <FileDrop entity="Transfer" purpose="noc" value={f.noc} onChange={(v) => set('noc', v)} accept=".pdf,image/*" hint="Can also be uploaded at the NOC stage" />
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-semibold text-ink">Request Letter *</div>
                <FileDrop entity="Transfer" purpose="transfer-letter" value={f.letter} onChange={(v) => set('letter', v)} accept=".pdf,image/*" />
                {errors.letter && <p className="mt-1 text-[11px] text-brand-red">{errors.letter}</p>}
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-semibold text-ink">Supporting Document</div>
                <FileDrop entity="Transfer" purpose="transfer-supporting" value={f.supporting} onChange={(v) => set('supporting', v)} />
              </div>
              <TextField label="Email Reference" required name="trf-email" placeholder="e.g. CRM/2026/512" value={f.emailRef} onChange={(e) => set('emailRef', e.target.value)} error={errors.emailRef} />
              <TextAreaField label="Correspondence" name="trf-corr" placeholder="Summary of the email thread / letters with both parents" value={f.correspondence} onChange={(e) => set('correspondence', e.target.value)} className="md:col-span-2" />
              <TextField label="Transfer Effective Date" required type="date" name="trf-eff" min={requestDate} value={f.effectiveDate} onChange={(e) => set('effectiveDate', e.target.value)} error={errors.effectiveDate} />
            </div>
          </Panel>
        </>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <Button variant="secondary" icon={<ArrowLeft size={14} />} onClick={() => navigate('/franchise/transfers')}>Back</Button>
        <Button variant="secondary" icon={<Save size={14} />} onClick={saveDraft}>Save Draft</Button>
        <Button icon={<Send size={14} />} onClick={submit}>Submit</Button>
      </div>
    </div>
  )
}
