import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Pencil, Save, X } from 'lucide-react'
import { STATES } from '@/data/applications'
import {
  COMPLETION_STEPS, CURRENT_ACTOR, STEP_STATUSES, completionOf, deptUsers, nowIso, updateSite, useCategories, useSites,
  type Site, type StepStatus, type TisDetails,
} from '@/data/network'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { Bar, KV, Panel, SimpleTable, StatusBadge, Val } from './ui'
import { PIN_RE, daysSince, fmtDate, inrFmt, siteMasterStore, todayIso, useSiteMaster } from './siteData'

export type TabProps = { site: Site; edit: boolean }

// ── Basic & Site details ─────────────────────────────────────────────────
type BasicForm = Pick<Site, 'projectId' | 'projectType' | 'plan' | 'siteType' | 'machineType' | 'location' | 'address' | 'state' | 'district' | 'pin'>
const BASIC_LABEL: Record<keyof BasicForm, string> = {
  projectId: 'Project ID', projectType: 'Project Type', plan: 'Plan', siteType: 'Site Type', machineType: 'Machine Type',
  location: 'Location', address: 'Address', state: 'State', district: 'District', pin: 'PIN Code',
}
const basicOf = (s: Site): BasicForm => ({
  projectId: s.projectId, projectType: s.projectType, plan: s.plan, siteType: s.siteType, machineType: s.machineType,
  location: s.location, address: s.address, state: s.state, district: s.district, pin: s.pin,
})

export function BasicTab({ site, edit }: TabProps) {
  const cats = useCategories()
  const [form, setForm] = useState<BasicForm | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof BasicForm, string>>>({})
  const opts = (k: 'projectTypes' | 'plans' | 'machineTypes', cur: string) => [...new Set([...cats[k].filter((c) => c.active).map((c) => c.name), cur].filter(Boolean))]
  const siteTypeOpts = [...new Set([...cats.siteTypes.filter((c) => c.active).map((c) => c.code), site.siteType].filter(Boolean))]

  const save = () => {
    if (!form) return
    const e: typeof errors = {}
    ;(Object.keys(BASIC_LABEL) as (keyof BasicForm)[]).forEach((k) => {
      if (!String(form[k]).trim()) e[k] = `${BASIC_LABEL[k]} is required.`
    })
    if (form.pin && !PIN_RE.test(form.pin)) e.pin = 'PIN code must be 6 digits.'
    setErrors(e)
    if (Object.keys(e).length) return
    const before = basicOf(site)
    const changed = (Object.keys(BASIC_LABEL) as (keyof BasicForm)[]).filter((k) => before[k] !== form[k].trim())
    if (!changed.length) {
      setForm(null)
      toast('No changes to save', 'info')
      return
    }
    const patch: Partial<Site> = {}
    changed.forEach((k) => {
      patch[k] = form[k].trim()
    })
    updateSite(site.siteId, patch, {
      action: 'Basic / site details updated',
      before: changed.map((k) => `${BASIC_LABEL[k]}: ${before[k] || '—'}`).join('; '),
      after: changed.map((k) => `${BASIC_LABEL[k]}: ${form[k].trim()}`).join('; '),
    })
    setForm(null)
    toast('Site details saved')
  }

  const f = (k: keyof BasicForm) => ({
    name: k,
    value: form?.[k] ?? '',
    error: errors[k],
    onChange: (e: { target: { value: string } }) => {
      const v = k === 'pin' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value
      setForm((x) => (x ? { ...x, [k]: v } : x))
    },
  })

  return (
    <Panel
      title="Basic & Site Details"
      action={
        edit &&
        (form ? (
          <>
            <Button size="sm" variant="secondary" icon={<X size={13} />} onClick={() => { setForm(null); setErrors({}) }}>Cancel</Button>
            <Button size="sm" variant="bright" icon={<Save size={13} />} onClick={save}>Save</Button>
          </>
        ) : (
          <Button size="sm" variant="secondary" icon={<Pencil size={13} />} onClick={() => setForm(basicOf(site))}>Edit</Button>
        ))
      }
    >
      {form ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TextField label="Site ID" value={site.siteId} disabled readOnly name="siteIdRo" hint="Site ID cannot be changed" />
          <TextField label="ATM ID" value={site.atmId} disabled readOnly name="atmIdRo" hint="ATM ID is the base key" />
          <TextField label="Project ID" required {...f('projectId')} />
          <SelectField label="Project Type" required {...f('projectType')} options={opts('projectTypes', site.projectType)} />
          <SelectField label="Plan" required {...f('plan')} options={opts('plans', site.plan)} />
          <SelectField label="Site Type" required {...f('siteType')} options={siteTypeOpts} />
          <SelectField label="Machine Type" required {...f('machineType')} options={opts('machineTypes', site.machineType)} />
          <TextField label="Location" required {...f('location')} />
          <SelectField label="State" required {...f('state')} options={[...new Set([...STATES, site.state].filter(Boolean))]} />
          <TextField label="District" required {...f('district')} />
          <TextField label="PIN Code" required inputMode="numeric" {...f('pin')} />
          <TextAreaField label="Address" required className="sm:col-span-2 lg:col-span-4" {...f('address')} />
        </div>
      ) : (
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <KV k="Site ID">{site.siteId}</KV>
          <KV k="ATM ID">{site.atmId}</KV>
          <KV k="Project ID"><Val v={site.projectId} /></KV>
          <KV k="Project Type"><Val v={site.projectType} /></KV>
          <KV k="Plan"><Val v={site.plan} /></KV>
          <KV k="Site Type"><Val v={site.siteType} /></KV>
          <KV k="ATM Machine Type"><Val v={site.machineType} /></KV>
          <KV k="Installation"><StatusBadge s={site.installation} /></KV>
          <KV k="Location"><Val v={site.location} /></KV>
          <KV k="State"><Val v={site.state} /></KV>
          <KV k="District"><Val v={site.district} /></KV>
          <KV k="PIN Code"><Val v={site.pin} /></KV>
          <div className="sm:col-span-2 lg:col-span-4">
            <KV k="Address"><Val v={site.address} /></KV>
          </div>
          <KV k="Operational">{site.operational ? 'Yes' : 'No'}</KV>
          <KV k="Monthly Transactions">{site.monthlyTxns.toLocaleString('en-IN')}</KV>
        </div>
      )}
    </Panel>
  )
}

// ── Project & Progress (§10) ─────────────────────────────────────────────
export function ProgressTab({ site, edit }: TabProps) {
  const [hold, setHold] = useState<{ key: string; remark: string; error: string } | null>(null)
  const close = useCallback(() => setHold(null), [])
  const c = completionOf(site)

  const applyStatus = (key: string, status: StepStatus, remark?: string) => {
    const step = COMPLETION_STEPS.find((x) => x.key === key)!
    const old = site.steps[key]?.status ?? 'Not Started'
    if (old === status && !remark) return
    const now = nowIso()
    updateSite(
      site.siteId,
      (s) => ({
        steps: { ...s.steps, [key]: { ...s.steps[key], status, since: now, updatedAt: now, remark: status === 'On Hold' ? remark : undefined } },
        ...(key === 'siteSetup' ? { installation: status } : {}),
        ...(key === 'firstTxn' ? { operational: status === 'Completed' } : {}),
      }),
      { action: `Step status changed — ${step.label.split(' (')[0]}`, before: old, after: remark ? `${status} (${remark})` : status },
    )
    toast(`${step.label.split(' (')[0]}: ${status}`)
  }

  const reassign = (key: string, user: string) => {
    const step = COMPLETION_STEPS.find((x) => x.key === key)!
    const old = site.steps[key]?.assignedTo ?? ''
    if (old === user) return
    updateSite(site.siteId, (s) => ({ steps: { ...s.steps, [key]: { ...s.steps[key], assignedTo: user, updatedAt: nowIso() } } }), {
      action: `Step reassigned — ${step.label.split(' (')[0]}`, before: old, after: user,
    })
    toast(`Assigned to ${user}`)
  }

  const sel = 'h-8 rounded-md border border-slate-200 bg-white px-2 text-[11.5px] outline-none focus:border-[#0066FF] disabled:bg-slate-50 disabled:text-slate-500'

  return (
    <Panel title="Project & Progress" action={<span className="text-[12px] text-slate-600">{c.done} of {c.total} steps completed</span>}>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Bar pct={c.pct} className="w-[260px]" />
        <StatusBadge s={c.complete ? 'Completed' : 'Incomplete'} />
        <span className="text-[11.5px] text-slate-500">Project Status stays Incomplete until every mandatory step is Completed (§10.2).</span>
      </div>
      <SimpleTable
        head={['#', 'Step', 'Department', 'Status', 'Assigned To', 'Pending Since', 'Remark']}
        rows={COMPLETION_STEPS.map((st, i) => {
          const s = site.steps[st.key] ?? { status: 'Not Started' as StepStatus, assignedTo: '', since: '' }
          const users = [...new Set([...deptUsers[st.dept], s.assignedTo].filter(Boolean))]
          return {
            key: st.key,
            cells: [
              i + 1,
              <span className="whitespace-normal" key="l">{st.label}</span>,
              st.dept,
              edit ? (
                <select
                  key="s"
                  aria-label={`Status of ${st.label}`}
                  className={sel}
                  value={s.status}
                  onChange={(e) => {
                    const v = e.target.value as StepStatus
                    if (v === 'On Hold') setHold({ key: st.key, remark: '', error: '' })
                    else applyStatus(st.key, v)
                  }}
                >
                  {STEP_STATUSES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              ) : (
                <StatusBadge key="s" s={s.status} />
              ),
              edit ? (
                <select key="a" aria-label={`Assignee of ${st.label}`} className={sel} value={s.assignedTo} onChange={(e) => reassign(st.key, e.target.value)}>
                  {users.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              ) : (
                s.assignedTo || '—'
              ),
              s.status === 'Completed' ? `Done ${fmtDate(s.updatedAt ?? s.since)}` : s.status === 'Not Started' ? '—' : `${fmtDate(s.since)} · ${daysSince(s.since)} d`,
              <span key="r" className="whitespace-normal text-slate-500">{s.remark || '—'}</span>,
            ],
          }
        })}
      />
      {hold && (
        <Modal
          title="Put step on hold"
          sub={COMPLETION_STEPS.find((x) => x.key === hold.key)?.label}
          onClose={close}
          footer={
            <>
              <Button variant="secondary" onClick={close}>Cancel</Button>
              <Button
                variant="bright"
                onClick={() => {
                  if (!hold.remark.trim()) {
                    setHold({ ...hold, error: 'A remark is required to put a step On Hold.' })
                    return
                  }
                  applyStatus(hold.key, 'On Hold', hold.remark.trim())
                  setHold(null)
                }}
              >
                Put On Hold
              </Button>
            </>
          }
        >
          <TextAreaField label="Remark" required name="holdRemark" value={hold.remark} error={hold.error} onChange={(e) => setHold({ ...hold, remark: e.target.value, error: '' })} placeholder="Why is this step on hold?" />
        </Modal>
      )}
    </Panel>
  )
}

// ── Investment ───────────────────────────────────────────────────────────
export function InvestmentTab({ site, edit }: TabProps) {
  const { sites } = useSites()
  const frSites = useMemo(() => sites.filter((s) => s.frId === site.frId), [sites, site.frId])
  const total = frSites.reduce((a, s) => a + (s.investment || 0), 0)
  const [val, setVal] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const save = () => {
    const n = Number(val)
    if (!val || !(n > 0)) {
      setErr('Enter an amount greater than 0.')
      return
    }
    if (n !== site.investment) updateSite(site.siteId, { investment: n }, { action: 'Site investment updated', before: inrFmt(site.investment), after: inrFmt(n) })
    setVal(null)
    toast('Investment saved')
  }

  return (
    <Panel
      title="Investment"
      action={
        edit &&
        (val === null ? (
          <Button size="sm" variant="secondary" icon={<Pencil size={13} />} onClick={() => setVal(String(site.investment || ''))}>Edit</Button>
        ) : (
          <>
            <Button size="sm" variant="secondary" icon={<X size={13} />} onClick={() => { setVal(null); setErr('') }}>Cancel</Button>
            <Button size="sm" variant="bright" icon={<Save size={13} />} onClick={save}>Save</Button>
          </>
        ))
      }
    >
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
        {val === null ? (
          <KV k="Site Investment"><Val v={site.investment ? inrFmt(site.investment) : ''} /></KV>
        ) : (
          <TextField label="Site Investment (₹)" required name="investment" inputMode="numeric" value={val} error={err} onChange={(e) => { setVal(e.target.value.replace(/\D/g, '')); setErr('') }} />
        )}
        <KV k="Franchise Total Investment">{inrFmt(total)}</KV>
        <KV k="Sites under this Franchise">{frSites.length}</KV>
      </div>
      <div className="mt-5">
        <SimpleTable
          head={['Site ID', 'ATM ID', 'Site Type', 'Investment', 'Completion']}
          rows={frSites.map((s) => ({
            key: s.siteId,
            cells: [
              s.siteId === site.siteId ? <b key="id">{s.siteId}</b> : <Link key="id" className="text-[#0066FF] hover:underline" to={`/master-data/sites/${encodeURIComponent(s.siteId)}`}>{s.siteId}</Link>,
              s.atmId,
              s.siteType,
              inrFmt(s.investment || 0),
              <Bar key="b" pct={completionOf(s).pct} className="w-[140px]" />,
            ],
          }))}
        />
      </div>
    </Panel>
  )
}

// ── TIS (§16) ────────────────────────────────────────────────────────────
type TisForm = { createdBy: string; otherName: string; responsible: string; createdOn: string; photos: number; verification: TisDetails['verification']; verifiedBy: string; remarks: string }
export function TisTab({ site, edit }: TabProps) {
  const cats = useCategories()
  const otherName = cats.tisCreatedBy.find((c) => c.code === 'OTHER')?.name ?? 'Other'
  const byOpts = [...new Set([...cats.tisCreatedBy.filter((c) => c.active).map((c) => c.name), site.tis?.createdBy ?? ''].filter(Boolean))]
  const [form, setForm] = useState<TisForm | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof TisForm, string>>>({})
  const t = site.tis

  const open = () =>
    setForm({
      createdBy: t?.createdBy ?? '', otherName: t?.otherName ?? '', responsible: t?.responsible ?? '', createdOn: t?.createdOn ?? todayIso(),
      photos: t?.photos ?? 0, verification: t?.verification ?? 'Pending', verifiedBy: t?.verifiedBy ?? '', remarks: t?.remarks ?? '',
    })

  const save = () => {
    if (!form) return
    const e: typeof errors = {}
    if (!form.createdBy) e.createdBy = 'TIS Created By is mandatory.'
    if (form.createdBy === otherName && !form.otherName.trim()) e.otherName = 'Enter the person / entity name for "Other".'
    if (!form.responsible.trim()) e.responsible = 'Responsible person / entity is required.'
    if (!form.createdOn) e.createdOn = 'TIS creation date is required.'
    if (form.verification === 'Verified' && !form.verifiedBy.trim()) e.verifiedBy = 'Enter who verified the TIS.'
    if (form.verification === 'Rejected' && !form.remarks.trim()) e.remarks = 'A remark is required when rejecting.'
    setErrors(e)
    if (Object.keys(e).length) return
    const tis: TisDetails = {
      createdBy: form.createdBy, otherName: form.createdBy === otherName ? form.otherName.trim() : undefined, responsible: form.responsible.trim(),
      createdOn: form.createdOn, photos: form.photos, verification: form.verification, verifiedBy: form.verification === 'Pending' ? undefined : form.verifiedBy.trim() || undefined,
      remarks: form.remarks.trim() || undefined,
    }
    const now = nowIso()
    updateSite(
      site.siteId,
      (s) => {
        const cur = s.steps.tis
        const status: StepStatus = tis.verification === 'Verified' ? 'Completed' : cur.status === 'Not Started' || cur.status === 'Completed' ? 'In Progress' : cur.status
        return { tis, steps: status === cur.status ? s.steps : { ...s.steps, tis: { ...cur, status, since: now, updatedAt: now } } }
      },
      { action: t ? 'TIS details updated' : 'TIS created', before: t ? `${t.createdBy} · ${t.verification}` : undefined, after: `${tis.createdBy}${tis.otherName ? ` (${tis.otherName})` : ''} · ${tis.verification}` },
    )
    setForm(null)
    toast('TIS details saved')
  }

  const set = <K extends keyof TisForm>(k: K, v: TisForm[K]) => {
    setForm((x) => (x ? { ...x, [k]: v } : x))
    setErrors((x) => ({ ...x, [k]: undefined }))
  }

  return (
    <Panel
      title="TIS Details"
      action={
        edit &&
        (form ? (
          <>
            <Button size="sm" variant="secondary" icon={<X size={13} />} onClick={() => { setForm(null); setErrors({}) }}>Cancel</Button>
            <Button size="sm" variant="bright" icon={<Save size={13} />} onClick={save}>Save</Button>
          </>
        ) : (
          <Button size="sm" variant="secondary" icon={<Pencil size={13} />} onClick={open}>{t ? 'Edit' : 'Create TIS'}</Button>
        ))
      }
    >
      {form ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField label="TIS Created By" required name="tisBy" value={form.createdBy} error={errors.createdBy} options={byOpts} onChange={(e) => set('createdBy', e.target.value)} />
          {form.createdBy === otherName && (
            <TextField label="Other — person / entity name" required name="tisOther" value={form.otherName} error={errors.otherName} onChange={(e) => set('otherName', e.target.value)} />
          )}
          <TextField label="Responsible Person / Entity" required name="tisResp" value={form.responsible} error={errors.responsible} onChange={(e) => set('responsible', e.target.value)} />
          <TextField label="TIS Creation Date" required type="date" name="tisDate" value={form.createdOn} error={errors.createdOn} onChange={(e) => set('createdOn', e.target.value)} />
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold text-ink">TIS Photos</span>
            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-dashed border-line bg-surface/60 px-3 text-[12px] text-primary">
              <Camera size={14} /> Add photos · {form.photos} uploaded
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const n = e.target.files?.length ?? 0
                  if (n) set('photos', form.photos + n)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
          <SelectField label="Verification Status" required name="tisVer" value={form.verification} options={['Pending', 'Verified', 'Rejected']} onChange={(e) => set('verification', (e.target.value || 'Pending') as TisDetails['verification'])} />
          {form.verification !== 'Pending' && (
            <TextField label="Verified By" required name="tisVerBy" value={form.verifiedBy} error={errors.verifiedBy} placeholder={CURRENT_ACTOR} onChange={(e) => set('verifiedBy', e.target.value)} />
          )}
          <TextAreaField label="Remarks" name="tisRemarks" required={form.verification === 'Rejected'} className="sm:col-span-2 lg:col-span-3" value={form.remarks} error={errors.remarks} onChange={(e) => set('remarks', e.target.value)} />
        </div>
      ) : (
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <KV k="Site ID">{site.siteId}</KV>
          <KV k="ATM ID">{site.atmId}</KV>
          <KV k="TIS Created By"><Val v={t ? `${t.createdBy}${t.otherName ? ` — ${t.otherName}` : ''}` : ''} /></KV>
          <KV k="Responsible Person / Entity"><Val v={t?.responsible} /></KV>
          <KV k="TIS Creation Date"><Val v={fmtDate(t?.createdOn)} /></KV>
          <KV k="Photos Uploaded"><Val v={t ? String(t.photos) : ''} /></KV>
          <KV k="Verification Status"><StatusBadge s={t?.verification} /></KV>
          <KV k="Verified By"><Val v={t?.verifiedBy} /></KV>
          <div className="sm:col-span-2 lg:col-span-4">
            <KV k="Remarks">{t?.remarks || '—'}</KV>
          </div>
          <KV k="TIS Step"><StatusBadge s={site.steps.tis?.status} /></KV>
        </div>
      )}
    </Panel>
  )
}

// ── Custom (Admin-added) fields ─────────────────────────────────────────
export function CustomTab({ site, edit }: TabProps) {
  const sm = useSiteMaster()
  const current = sm.values[site.siteId] ?? {}
  const [form, setForm] = useState<Record<string, string> | null>(null)

  const save = () => {
    if (!form) return
    const changed = sm.custom.filter((c) => (current[c.key] ?? '') !== (form[c.key] ?? '').trim())
    if (!changed.length) {
      setForm(null)
      toast('No changes to save', 'info')
      return
    }
    const next = { ...current }
    changed.forEach((c) => {
      next[c.key] = (form[c.key] ?? '').trim()
    })
    siteMasterStore.set((s) => ({ ...s, values: { ...s.values, [site.siteId]: next } }))
    updateSite(site.siteId, {}, {
      action: 'Custom fields updated',
      before: changed.map((c) => `${c.label}: ${current[c.key] || '—'}`).join('; '),
      after: changed.map((c) => `${c.label}: ${next[c.key] || '—'}`).join('; '),
    })
    setForm(null)
    toast('Custom fields saved')
  }

  return (
    <Panel
      title="Custom Fields"
      action={
        edit && sm.custom.length > 0 &&
        (form ? (
          <>
            <Button size="sm" variant="secondary" icon={<X size={13} />} onClick={() => setForm(null)}>Cancel</Button>
            <Button size="sm" variant="bright" icon={<Save size={13} />} onClick={save}>Save</Button>
          </>
        ) : (
          <Button size="sm" variant="secondary" icon={<Pencil size={13} />} onClick={() => setForm(Object.fromEntries(sm.custom.map((c) => [c.key, current[c.key] ?? ''])))}>Edit</Button>
        ))
      }
    >
      {sm.custom.length === 0 ? (
        <p className="text-[12.5px] text-slate-500">No custom fields yet. Super Admin / Admin can add fields from Site Master › Columns.</p>
      ) : form ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sm.custom.map((c) => (
            <TextField key={c.key} label={c.label} name={c.key} value={form[c.key] ?? ''} onChange={(e) => setForm((x) => (x ? { ...x, [c.key]: e.target.value } : x))} />
          ))}
        </div>
      ) : (
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {sm.custom.map((c) => (
            <KV key={c.key} k={c.label}><Val v={current[c.key]} /></KV>
          ))}
        </div>
      )}
    </Panel>
  )
}
