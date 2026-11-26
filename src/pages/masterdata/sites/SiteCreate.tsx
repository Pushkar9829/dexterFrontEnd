import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Send } from 'lucide-react'
import { useFranchises } from '@/data/franchises'
import { STATES, LOCATIONS } from '@/data/applications'
import { addSite, useCategories, useSites } from '@/data/network'
import { masterAccess, useRole } from '@/lib/rbac'
import { Button } from '@/components/ui/Button'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { Crumbs } from './ui'
import { PIN_RE, emptyDraft, newSiteFrom, siteMasterStore, type SiteDraft } from './siteData'

type Errors = Partial<Record<keyof SiteDraft, string>>

export default function SiteCreate() {
  const navigate = useNavigate()
  const role = useRole()
  const access = masterAccess(role)
  const { sites } = useSites()
  const franchises = useFranchises()
  const cats = useCategories()
  const [form, setForm] = useState<SiteDraft>(() => siteMasterStore.get().draft ?? emptyDraft())
  const [errors, setErrors] = useState<Errors>({})

  const frOnly = useMemo(() => franchises.filter((f) => f.tier === 'Franchise'), [franchises])
  const fr = useMemo(() => frOnly.find((f) => f.id === form.frId.trim()), [frOnly, form.frId])
  const act = (k: keyof typeof cats) => cats[k].filter((c) => c.active)
  const districts = LOCATIONS[form.state]?.cities ?? []

  const set = (k: keyof SiteDraft) => (v: string) => {
    setForm((f) => {
      const next = { ...f, [k]: v }
      if (k === 'frId') {
        const picked = frOnly.find((x) => x.id === v.trim())
        if (picked && !f.state) {
          next.state = picked.state
          next.district = picked.city
        }
      }
      return next
    })
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  function validate(): Errors {
    const e: Errors = {}
    const req = (k: keyof SiteDraft, msg: string) => {
      if (!form[k].trim()) e[k] = msg
    }
    req('siteId', 'Site ID is required.')
    req('atmId', 'ATM ID is required.')
    req('projectId', 'Project ID is required.')
    req('frId', 'Select a franchise.')
    req('projectType', 'Select a project type.')
    req('plan', 'Select a plan.')
    req('siteType', 'Select a site type.')
    req('machineType', 'Select a machine type.')
    req('location', 'Location is required.')
    req('address', 'Address is required.')
    req('state', 'Select a state.')
    req('district', 'District is required.')
    req('pin', 'PIN code is required.')
    req('investment', 'Investment is required.')
    const sid = form.siteId.trim().toLowerCase()
    if (sid && sites.some((s) => s.siteId.toLowerCase() === sid)) e.siteId = 'This Site ID already exists — Site ID must be unique.'
    const aid = form.atmId.trim().toLowerCase()
    if (aid && sites.some((s) => s.atmId.toLowerCase() === aid)) e.atmId = 'This ATM ID is already mapped to another site.'
    if (form.atmId.trim() && !/^[A-Za-z0-9-]{4,20}$/.test(form.atmId.trim())) e.atmId = 'ATM ID: 4–20 letters / digits.'
    if (form.frId.trim() && !fr) e.frId = 'Pick a franchise (FR tier) from the list.'
    if (form.pin.trim() && !PIN_RE.test(form.pin.trim())) e.pin = 'PIN code must be 6 digits.'
    if (form.investment.trim() && !(Number(form.investment) > 0)) e.investment = 'Enter an amount greater than 0.'
    return e
  }

  const saveDraft = () => {
    siteMasterStore.set((s) => ({ ...s, draft: form }))
    toast('Draft saved — it will be restored when you come back to this form', 'info')
  }

  const submit = () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) {
      toast('Please fix the highlighted fields', 'error')
      return
    }
    const site = newSiteFrom(form)
    addSite(site)
    siteMasterStore.set((s) => ({ ...s, draft: null }))
    toast(`Site ${site.siteId} created`)
    navigate(`/master-data/sites/${encodeURIComponent(site.siteId)}`)
  }

  if (access !== 'full' && access !== 'project')
    return (
      <div className="space-y-4">
        <Crumbs items={[{ label: 'Master Data', to: '/master-data' }, { label: 'Site Master', to: '/master-data/sites' }, { label: 'New Site' }]} />
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-[13px] text-slate-600">Only Admin, Project Head and the Project team can create sites.</p>
      </div>
    )

  return (
    <div className="max-w-[1100px] space-y-4 pb-12">
      <Crumbs items={[{ label: 'Master Data', to: '/master-data' }, { label: 'Site Master', to: '/master-data/sites' }, { label: 'New Site' }]} />
      <div>
        <h1 className="text-[26px] leading-tight font-bold tracking-tight text-slate-900">New Site</h1>
        <p className="mt-1 text-[13px] text-slate-500">Create a site under a franchise. Account, legal, TIS and engineer details are added later from the Site Profile.</p>
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="rounded-xl border border-slate-200 bg-white p-5"
      >
        <h3 className="mb-3 text-[14px] font-bold text-slate-900">Identity</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField label="Site ID" required name="siteId" value={form.siteId} error={errors.siteId} onChange={(e) => set('siteId')(e.target.value)} placeholder="Entered manually, e.g. SITE-MH-0901" />
          <TextField label="ATM ID" required name="atmId" value={form.atmId} error={errors.atmId} onChange={(e) => set('atmId')(e.target.value)} placeholder="e.g. DXMH76307" />
          <TextField label="Project ID" required name="projectId" value={form.projectId} error={errors.projectId} onChange={(e) => set('projectId')(e.target.value)} placeholder="PRJ-2026-…" />
          <div className="sm:col-span-2 lg:col-span-3">
            <TextField
              label="Franchise (FR)"
              required
              name="frId"
              list="site-create-fr"
              value={form.frId}
              error={errors.frId}
              hint={fr ? `${fr.name} · ${fr.city}, ${fr.state}` : 'Type an FR ID or name and pick from the list (Franchise tier only)'}
              onChange={(e) => set('frId')(e.target.value)}
              placeholder="FR-…"
            />
            <datalist id="site-create-fr">
              {frOnly.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} — {f.city}
                </option>
              ))}
            </datalist>
          </div>
        </div>

        <h3 className="mt-6 mb-3 text-[14px] font-bold text-slate-900">Project</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField label="Project Type" required name="projectType" value={form.projectType} error={errors.projectType} onChange={(e) => set('projectType')(e.target.value)} options={act('projectTypes').map((c) => c.name)} />
          <SelectField label="Plan Type" required name="plan" value={form.plan} error={errors.plan} onChange={(e) => set('plan')(e.target.value)} options={act('plans').map((c) => c.name)} />
          <SelectField label="Site Type" required name="siteType" value={form.siteType} error={errors.siteType} onChange={(e) => set('siteType')(e.target.value)} options={act('siteTypes').map((c) => c.code)} hint={act('siteTypes').find((c) => c.code === form.siteType)?.name} />
          <SelectField label="ATM Machine Type" required name="machineType" value={form.machineType} error={errors.machineType} onChange={(e) => set('machineType')(e.target.value)} options={act('machineTypes').map((c) => c.name)} />
        </div>

        <h3 className="mt-6 mb-3 text-[14px] font-bold text-slate-900">Location & Investment</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField label="Site Location" required name="location" value={form.location} error={errors.location} onChange={(e) => set('location')(e.target.value)} placeholder="e.g. Station Road, Pune" />
          <SelectField label="State" required name="state" value={form.state} error={errors.state} onChange={(e) => set('state')(e.target.value)} options={STATES} />
          <TextField label="District" required name="district" list="site-create-district" value={form.district} error={errors.district} onChange={(e) => set('district')(e.target.value)} />
          <datalist id="site-create-district">
            {districts.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
          <TextAreaField label="Address" required name="address" className="sm:col-span-2" value={form.address} error={errors.address} onChange={(e) => set('address')(e.target.value)} />
          <div className="grid gap-4">
            <TextField label="PIN Code" required name="pin" inputMode="numeric" maxLength={6} value={form.pin} error={errors.pin} onChange={(e) => set('pin')(e.target.value.replace(/\D/g, ''))} />
            <TextField label="Site Investment (₹)" required name="investment" inputMode="numeric" value={form.investment} error={errors.investment} onChange={(e) => set('investment')(e.target.value.replace(/[^\d]/g, ''))} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
          <Button type="button" variant="secondary" icon={<ArrowLeft size={14} />} onClick={() => navigate('/master-data/sites')}>
            Back
          </Button>
          <Button type="button" variant="secondary" icon={<Save size={14} />} onClick={saveDraft}>
            Save Draft
          </Button>
          <Button type="submit" variant="bright" icon={<Send size={14} />}>
            Submit
          </Button>
        </div>
      </form>
    </div>
  )
}
