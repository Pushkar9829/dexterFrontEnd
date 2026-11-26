import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, History, Search, X } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FileDrop, TextField, type FileValue } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { apiBmSiteStatus, apiCreateBmSite, apiDecideBmSite, apiEnabled, fileBlock } from '@/data/payoutApi'
import { useFranchises } from '@/data/franchises'
import { siteByAtm, useNetwork, useSites } from '@/data/network'
import { businessStore, logPayout, useBusiness, type BmSite, nowIso } from '@/data/payout'
import { PayoutPage } from '../PayoutShell'
import {
  FRANCHISEE_BM_REJECTION, actor, checkerBlock, clearDraft, eligibleEntities, fmtDateTime, getDraft, metaOf, saveDraft, touchMeta, useBmLocal,
} from './bmStore'
import { FormActions, InfoCell, Note, Panel, PickField } from './ui'

type Level = 'MF' | 'SMF' | 'Franchisee'
type Form = {
  atmId: string
  siteId: string
  city: string
  state: string
  category: string
  level: Level
  mfId: string
  smfId: string
  franchiseeId: string
  businessModel: string
  effectiveFrom: string
  effectiveTo: string
  agreement: FileValue
  status: 'Active' | 'Inactive'
}
const EMPTY: Form = { atmId: '', siteId: '', city: '', state: '', category: '', level: 'MF', mfId: '', smfId: '', franchiseeId: '', businessModel: '', effectiveFrom: '', effectiveTo: '', agreement: null, status: 'Active' }

export default function BmSiteForm() {
  const { code } = useParams()
  const isNew = !code
  const navigate = useNavigate()
  const b = useBusiness()
  const net = useNetwork()
  const frs = useFranchises()
  const local = useBmLocal()
  const existing = code ? b.bmSites.find((s) => s.code === code) : undefined
  const ents = useMemo(() => eligibleEntities(net, frs), [net, frs])
  const draftKey = isNew ? 'site-new' : `site-${code}`

  const [f, setF] = useState<Form>(() => {
    const d = getDraft<Form>(draftKey)
    if (d) return d
    if (!existing) return EMPTY
    const mf = ents.mfs.find((m) => m.name === existing.mf)
    const smf = ents.smfs.find((m) => m.name === existing.superMf)
    return {
      atmId: existing.atmId, siteId: existing.siteId, city: existing.city, state: existing.state, category: existing.category,
      level: mf ? 'MF' : 'SMF', mfId: mf?.id ?? '', smfId: smf?.id ?? '', franchiseeId: '', businessModel: existing.businessModel,
      effectiveFrom: existing.effectiveFrom, effectiveTo: existing.effectiveTo ?? '', agreement: existing.agreement ? { name: existing.agreement, size: 245760 } : null, status: existing.status,
    }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [atmQuery, setAtmQuery] = useState(f.atmId)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))

  const mfSel = ents.mfs.find((m) => m.id === f.mfId)
  const derivedSmf = f.level === 'MF' ? (mfSel?.parentSmf ?? '') : (ents.smfs.find((s) => s.id === f.smfId)?.name ?? '')
  const activeCats = b.bmCategories.filter((c) => c.status === 'Active' || c.code === f.category)
  const models = useMemo(() => [...new Set(['Owned & Operated', 'Partner Operated', ...b.bmCategories.map((c) => c.businessModel)])], [b.bmCategories])
  const siteState = useSites()
  const suggestions = useMemo(() => {
    const mapped = new Set(b.bmSites.filter((s) => s.approval !== 'Rejected').map((s) => s.atmId))
    return siteState.sites.filter((s) => s.siteType === 'BM' && !mapped.has(s.atmId)).slice(0, 50).map((s) => s.atmId)
  }, [b.bmSites, siteState.sites])

  if (code && !existing) {
    return (
      <PayoutPage title="BM site not found" crumbs={['Business Model', 'BM Site Master', code]}>
        <Note tone="red">No BM site with code {code}.</Note>
        <Button variant="secondary" onClick={() => navigate('/finance/payouts/business/sites')}>Back to BM Site Master</Button>
      </PayoutPage>
    )
  }

  const searchAtm = () => {
    const atm = atmQuery.trim()
    if (!atm) {
      setErrors((e) => ({ ...e, atmId: 'Enter an ATM ID to search' }))
      return
    }
    const s = siteByAtm(atm)
    if (!s) {
      setErrors((e) => ({ ...e, atmId: `ATM ID ${atm} was not found in Site Master` }))
      setF((x) => ({ ...x, atmId: '', siteId: '', city: '', state: '' }))
      return
    }
    if (s.siteType !== 'BM') {
      setErrors((e) => ({ ...e, atmId: `ATM ${s.atmId} is a ${s.siteType} site in Site Master — only Business Model (BM) sites can be mapped in this vertical.` }))
      setF((x) => ({ ...x, atmId: '', siteId: '', city: '', state: '' }))
      return
    }
    setErrors((e) => ({ ...e, atmId: '' }))
    setF((x) => ({ ...x, atmId: s.atmId, siteId: s.siteId, city: s.district, state: s.state }))
  }

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {}
    if (!f.atmId) e.atmId = 'Search and select an ATM ID from Site Master'
    if (!f.category) e.category = 'Select a BM site category'
    else if (!b.bmCategories.some((c) => c.code === f.category && c.status === 'Active')) e.category = 'Category is inactive'
    if (f.level === 'Franchisee') e.level = FRANCHISEE_BM_REJECTION
    if (f.level === 'MF' && !f.mfId) e.mfId = 'Select an eligible Master Franchise'
    if (f.level === 'SMF' && !f.smfId) e.smfId = 'Select an eligible Super Master Franchise'
    if (!f.businessModel) e.businessModel = 'Select the business model'
    if (!f.effectiveFrom) e.effectiveFrom = 'Effective from date is required'
    if (f.effectiveTo && f.effectiveFrom && f.effectiveTo < f.effectiveFrom) e.effectiveTo = 'Effective to must be on or after effective from'
    if (!f.agreement) e.agreement = 'Upload the supporting agreement'
    if (f.atmId && f.effectiveFrom) {
      const end = (d: string | null | undefined) => d || '9999-12-31'
      const clash = b.bmSites.find((s) => s.code !== code && s.atmId === f.atmId && s.approval !== 'Rejected' && s.status === 'Active' && s.effectiveFrom <= end(f.effectiveTo) && f.effectiveFrom <= end(s.effectiveTo))
      if (clash) e.atmId = `ATM ${f.atmId} already has an active BM mapping (${clash.code}) for an overlapping period`
    }
    return Object.fromEntries(Object.entries(e).filter(([, v]) => v))
  }

  const onDraft = () => {
    saveDraft(draftKey, f)
    toast('Draft saved')
  }

  const onSubmit = () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) {
      toast(e.level ?? 'Please fix the highlighted fields', 'error')
      return
    }
    const agreementBlock = isNew ? fileBlock(f.agreement) : null
    if (agreementBlock) {
      toast(agreementBlock, 'error')
      return
    }
    const mfName = f.level === 'MF' ? (mfSel?.name ?? '') : '—'
    const next: Omit<BmSite, 'code'> = {
      atmId: f.atmId, siteId: f.siteId, category: f.category, superMf: derivedSmf || '—', mf: mfName, businessModel: f.businessModel,
      effectiveFrom: f.effectiveFrom, effectiveTo: f.effectiveTo || null, agreement: f.agreement?.name, approval: 'Pending', status: f.status, city: f.city, state: f.state,
    }
    if (isNew) {
      const max = b.bmSites.reduce((m, s) => Math.max(m, Number(s.code.replace(/\D/g, '')) || 0), 200)
      const newCode = `BMS-${max + 1}`
      businessStore.set((s) => ({ ...s, bmSites: [{ code: newCode, ...next }, ...s.bmSites] }))
      bmLocalCreate(newCode, `${f.atmId} → ${mfName !== '—' ? `MF ${mfName}` : `Super MF ${derivedSmf}`}`)
      logPayout({ by: actor(), area: 'BM Site Master', ref: newCode, action: 'Mapping created (pending approval)', after: `${f.atmId} / ${mfName} / ${derivedSmf}` })
      clearDraft(draftKey)
      if (apiEnabled) {
        void apiCreateBmSite({ atmId: f.atmId, category: f.category, mfId: f.level === 'MF' ? f.mfId || undefined : undefined, superMfId: f.level === 'SMF' ? f.smfId || undefined : undefined, effectiveFrom: f.effectiveFrom, effectiveTo: f.effectiveTo || null, agreementFileId: f.agreement?.fileId }).then(
          (ok) => ok && toast('BM site submitted for approval'),
        )
        navigate('/finance/payouts/business/sites')
        return
      }
      toast(`BM site ${newCode} submitted for approval`)
      navigate(`/finance/payouts/business/sites/${newCode}`)
      return
    }
    if (!existing) return
    if (apiEnabled) {
      // the backend only supports the Active / Inactive status change on an existing BM site mapping
      if (f.status !== existing.status) void apiBmSiteStatus(existing.code, f.status, 'Status changed from the BM site form')
      else toast('Editing an existing BM site mapping is not supported by the server — reject it and create a new mapping.', 'error')
      return
    }
    const changed = (Object.keys(next) as (keyof typeof next)[]).filter((k) => k !== 'approval' && String(next[k] ?? '') !== String(existing[k] ?? ''))
    if (!changed.length) {
      toast('No changes to submit', 'info')
      return
    }
    const detail = changed.map((k) => `${k}: ${existing[k] ?? '—'} → ${next[k] ?? '—'}`).join('; ')
    businessStore.set((s) => ({ ...s, bmSites: s.bmSites.map((x) => (x.code === existing.code ? { ...x, ...next } : x)) }))
    touchMeta('siteMeta', existing.code, 'Mapping changed — re-submitted for approval', detail, { checker: undefined, checkedAt: undefined })
    logPayout({ by: actor(), area: 'BM Site Master', ref: existing.code, action: 'Mapping changed', before: changed.map((k) => `${k}=${existing[k] ?? ''}`).join(', '), after: changed.map((k) => `${k}=${next[k] ?? ''}`).join(', ') })
    clearDraft(draftKey)
    toast(`${existing.code} updated and sent for approval`)
  }

  const meta = existing ? metaOf(local, 'siteMeta', existing.code) : undefined
  const block = meta ? checkerBlock(meta.maker) : null
  const decide = (decision: 'Approved' | 'Rejected') => {
    if (!existing || !meta) return
    if (block) {
      toast(block, 'error')
      return
    }
    businessStore.set((s) => ({ ...s, bmSites: s.bmSites.map((x) => (x.code === existing.code ? { ...x, approval: decision } : x)) }))
    touchMeta('siteMeta', existing.code, decision, undefined, { checker: actor(), checkedAt: nowIso() })
    if (apiEnabled) void apiDecideBmSite(existing.code, decision === 'Approved', decision === 'Rejected' ? 'Rejected by checker' : '')
    logPayout({ by: actor(), area: 'BM Site Master', ref: existing.code, action: `Mapping ${decision.toLowerCase()}` })
    toast(`${existing.code} ${decision.toLowerCase()}`, decision === 'Approved' ? 'success' : 'info')
  }

  const pickFranchisee = (v: string) => {
    set('franchiseeId', v)
    if (v) setErrors((e) => ({ ...e, level: FRANCHISEE_BM_REJECTION }))
  }

  return (
    <PayoutPage
      title={isNew ? 'Map BM Site' : `BM Site ${existing?.code}`}
      sub="BM Site Mapping (§6.1) — Business Vertical: Business Model."
      crumbs={['Business Model', 'BM Site Master', isNew ? 'New' : (existing?.code ?? '')]}
      actions={existing && <Badge tone={toneFor(existing.approval)}>{existing.approval}</Badge>}
    >
      <datalist id="bm-unmapped-atms">
        {suggestions.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <Panel title="Site details" sub="ATM ID is searched from Site Master; Site ID is fetched automatically.">
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold text-ink">ATM ID *</span>
            <div className="flex gap-2">
              <input
                value={atmQuery}
                onChange={(e) => setAtmQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchAtm()}
                placeholder="Search ATM ID"
                list="bm-unmapped-atms"
                className={`h-9 w-full rounded-md border bg-white px-3 text-[12.5px] outline-none focus:border-primary ${errors.atmId ? 'border-brand-red' : 'border-line'}`}
              />
              <Button size="md" icon={<Search size={14} />} onClick={searchAtm}>Search</Button>
            </div>
            {errors.atmId && <span className="mt-1 block text-[11px] text-brand-red">{errors.atmId}</span>}
          </div>
          <InfoCell label="Site ID (auto)" value={f.siteId || '—'} />
          <InfoCell label="City / State" value={f.city ? `${f.city}, ${f.state}` : '—'} />
          <InfoCell label="Business Vertical" value={<Badge tone="navy">Business Model</Badge>} />
          <InfoCell label="BM Site Code" value={existing?.code ?? 'Auto-generated on submit'} />
        </div>
      </Panel>

      <Panel title="Mapping" sub="Select from the BM Category Master and eligible MF / Super MF entities only (§2.2, §14.4).">
        <div className="grid gap-4 md:grid-cols-3">
          <PickField
            label="BM Site Category"
            required
            value={f.category}
            error={errors.category}
            onChange={(v) => {
              const c = b.bmCategories.find((x) => x.code === v)
              setF((x) => ({ ...x, category: v, businessModel: x.businessModel || c?.businessModel || '' }))
            }}
            options={activeCats.map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` }))}
            hint="BM Category Master only — Franchise categories are not offered."
          />
          <PickField label="Business Model" required value={f.businessModel} error={errors.businessModel} onChange={(v) => set('businessModel', v)} options={models} />
          <PickField label="Site Status" required value={f.status} onChange={(v) => set('status', (v || 'Active') as Form['status'])} options={['Active', 'Inactive']} />
        </div>
        <div className="mt-4">
          <span className="mb-1.5 block text-[11px] font-semibold text-ink">Map to *</span>
          <div className="flex flex-wrap gap-2">
            {([['MF', 'Master Franchise'], ['SMF', 'Super Master Franchise (direct)'], ['Franchisee', 'Franchisee']] as [Level, string][]).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setF((x) => ({ ...x, level: k, franchiseeId: '' }))
                  setErrors((e) => ({ ...e, level: k === 'Franchisee' ? FRANCHISEE_BM_REJECTION : '' }))
                }}
                className={`h-9 w-[230px] rounded-md border px-3 text-[12px] font-medium ${f.level === k ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-white text-ink-2'}`}
              >
                {l}
              </button>
            ))}
          </div>
          {errors.level && <Note tone="red">{errors.level}</Note>}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {f.level === 'MF' && (
            <>
              <PickField label="Master Franchise" required value={f.mfId} error={errors.mfId} onChange={(v) => set('mfId', v)} options={ents.mfs.map((m) => ({ value: m.id, label: `${m.name} (${m.code})` }))} hint="Active MFs from the franchise network." />
              <InfoCell label="Super MF (from hierarchy)" value={derivedSmf || 'None — MF reports directly to Dexter India'} />
            </>
          )}
          {f.level === 'SMF' && (
            <PickField label="Super Master Franchise" required value={f.smfId} error={errors.smfId} onChange={(v) => set('smfId', v)} options={ents.smfs.map((m) => ({ value: m.id, label: `${m.name} (${m.code})` }))} />
          )}
          {f.level === 'Franchisee' && (
            <PickField label="Franchisee" value={f.franchiseeId} onChange={pickFranchisee} options={ents.franchisees.map((m) => ({ value: m.id, label: `${m.name} (${m.code})` }))} error={FRANCHISEE_BM_REJECTION} />
          )}
        </div>
      </Panel>

      <Panel title="Validity & agreement">
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="Effective From" required type="date" value={f.effectiveFrom} error={errors.effectiveFrom} onChange={(e) => set('effectiveFrom', e.target.value)} />
          <TextField label="Effective To" type="date" value={f.effectiveTo} error={errors.effectiveTo} min={f.effectiveFrom || undefined} onChange={(e) => set('effectiveTo', e.target.value)} hint="Leave blank for an open-ended mapping." />
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold text-ink">Supporting Agreement *</span>
            <FileDrop entity="PayoutRecord" purpose="bm-site-agreement" value={f.agreement} onChange={(v) => set('agreement', v)} accept=".pdf,.jpg,.jpeg,.png" maxMb={10} compact hint="PDF / JPG / PNG, max 10 MB" />
            {errors.agreement && <span className="mt-1 block text-[11px] text-brand-red">{errors.agreement}</span>}
          </div>
        </div>
        <div className="mt-4">
          <FormActions onBack={() => navigate('/finance/payouts/business/sites')} onDraft={onDraft} onSubmit={onSubmit} submitLabel={isNew ? 'Submit for approval' : 'Submit changes'} />
        </div>
      </Panel>

      {existing && meta && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <Panel title="Approval (maker-checker)" sub={`Maker: ${meta.maker}${meta.checker ? ` · Checker: ${meta.checker} (${fmtDateTime(meta.checkedAt)})` : ''}`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[12.5px]">Current status:</span>
              <Badge tone={toneFor(existing.approval)}>{existing.approval}</Badge>
            </div>
            {existing.approval === 'Pending' ? (
              <div className="mt-4 space-y-3">
                {block && <Note tone="amber">{block}</Note>}
                <div className="flex gap-2">
                  <Button icon={<Check size={14} />} disabled={!!block} onClick={() => decide('Approved')}>Approve</Button>
                  <Button variant="danger" icon={<X size={14} />} disabled={!!block} onClick={() => decide('Rejected')}>Reject</Button>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-[12px] text-slate-500">Any change to this mapping sends it back to Pending.</p>
            )}
          </Panel>
          <Panel title="Mapping history" icon={History} sub="Previous mappings are preserved (§7.2).">
            {meta.history.length === 0 ? (
              <p className="text-[12px] text-slate-500">Original mapping effective {existing.effectiveFrom} — no changes recorded.</p>
            ) : (
              <ol className="space-y-2.5">
                {meta.history.map((h, i) => (
                  <li key={h.at + i} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[12px]">
                    <div className="flex flex-wrap justify-between gap-2">
                      <b className="text-slate-800">{h.action}</b>
                      <span className="text-slate-500">{fmtDateTime(h.at)} · {h.by}</span>
                    </div>
                    {h.detail && <div className="mt-1 break-words text-slate-600">{h.detail}</div>}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      )}
    </PayoutPage>
  )
}

function bmLocalCreate(code: string, detail: string) {
  touchMeta('siteMeta', code, 'Mapping created', detail)
}
