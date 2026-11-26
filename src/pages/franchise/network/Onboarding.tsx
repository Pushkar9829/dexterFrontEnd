import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, Copy, FileText, Lock, Mail, MessageSquare, Plus, ShieldCheck, Smartphone, Unlock } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { RadioGroup, SelectField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { maskMobile } from '@/lib/mask'
import { STATES } from '@/data/applications'
import { ENTITY_TYPES, nowIso, useNetwork, type EntityType, type ParentKind } from '@/data/network'
import { TIERS, useFranchises, type Tier } from '@/data/franchises'
import {
  ONBOARD_STAGES, PARENT_KINDS, PARENT_KIND_LABEL, TIER_SHORT, TIER_SLUGS, districtsOf, emptyRegForm, fmtDateTime, newRegistration, paged, parentOptions,
  patchRegistration, requiredDocs, saveRegistration, sendForApprovalAsync, useMod, validateBasic, type RegErrors, type RegForm, type Registration,
} from './model'
import { BTN_PRIMARY, BTN_SECONDARY, Crumbs, EmptyRow, FilterCard, FilterSelect, PageHead, PickField, TD, THead, TROW, TableCard, Tabs } from './shared'

const GROUPS = ['All', 'In progress', 'Pending Approval', 'Approved', 'Rejected / Returned'] as const
type Group = (typeof GROUPS)[number]
const inGroup = (r: Registration, g: Group) =>
  g === 'All' ||
  (g === 'In progress' && ['Draft', 'Link Generated', 'Link Sent', 'KYC Uploaded', 'Documents Verified'].includes(r.stage)) ||
  (g === 'Pending Approval' && r.stage === 'Pending Approval') ||
  (g === 'Approved' && r.stage === 'Approved') ||
  (g === 'Rejected / Returned' && (r.stage === 'Rejected' || r.stage === 'Returned'))
const methodLabel = (m: 'A' | 'B') => (m === 'A' ? 'A · App link + self KYC' : 'B · CRM full form')

/** §13–§14 CRM onboarding list (Method A / Method B) → Admin approval gate. */
export default function Onboarding() {
  const mod = useMod()
  const [group, setGroup] = useState<Group>('All')
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState('all')
  const [method, setMethod] = useState('all')
  const [stage, setStage] = useState('all')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const [basicFor, setBasicFor] = useState<Registration | 'new' | null>(null)
  const [pickTier, setPickTier] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const open = openId ? mod.registrations.find((r) => r.id === openId) : undefined

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return mod.registrations
      .filter((r) => inGroup(r, group) && (tier === 'all' || r.tier === tier) && (method === 'all' || methodLabel(r.method) === method) && (stage === 'all' || r.stage === stage))
      .filter((r) => !q || [r.id, r.code ?? '', r.frId ?? '', r.form.companyName, r.form.contactName, r.form.mobile, r.form.email].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [mod.registrations, group, search, tier, method, stage])

  const download = () => {
    if (!rows.length) {
      toast('No records to download', 'info')
      return
    }
    downloadCsv(`franchise-onboarding-${new Date().toISOString().slice(0, 10)}`, ['Registration', 'Code', 'Tier', 'Company', 'Contact', 'Method', 'Stage', 'Access', 'Created by', 'Updated'], rows.map((r) => [r.id, r.code ?? '', r.tier, r.form.companyName, r.form.contactName, methodLabel(r.method), r.stage, r.stage === 'Approved' ? 'Unlocked' : 'Locked', r.createdBy, r.updatedAt]))
    toast(`${rows.length} row(s) downloaded`)
  }

  return (
    <div className="space-y-4 pb-12 max-w-[1500px]">
      <Crumbs trail={[{ label: 'Onboarding Workflow' }]} />
      <PageHead
        title="Franchise Onboarding"
        sub="Manual registration form → CRM verification → Method A (mobile app link + self KYC) or Method B (CRM completes the form) → mandatory Admin approval."
        actions={
          <>
            <Link to="/franchise/onboarding/approvals" className={BTN_SECONDARY}><ShieldCheck size={14} className="text-[#0066FF]" /> Admin approvals</Link>
            <button type="button" onClick={() => setPickTier(true)} className={BTN_SECONDARY}><FileText size={14} className="text-[#0066FF]" /> Method B · Full form</button>
            <button type="button" onClick={() => setBasicFor('new')} className={BTN_PRIMARY}><Plus size={16} /> Method A · New registration</button>
          </>
        }
      />
      <Tabs tabs={GROUPS} value={group} onChange={(g) => { setGroup(g); setPage(1) }} />
      <FilterCard search={search} onSearch={(v) => { setSearch(v); setPage(1) }} placeholder="Registration, name, mobile, email…" onReset={() => { setSearch(''); setTier('all'); setMethod('all'); setStage('all'); setPage(1) }} onDownload={download}>
        <FilterSelect label="Tier" value={tier} onChange={(v) => { setTier(v); setPage(1) }} options={TIERS} all="All tiers" />
        <FilterSelect label="Method" value={method} onChange={(v) => { setMethod(v); setPage(1) }} options={[methodLabel('A'), methodLabel('B')]} all="All methods" />
        <FilterSelect label="Stage" value={stage} onChange={(v) => { setStage(v); setPage(1) }} options={ONBOARD_STAGES} all="All stages" />
      </FilterCard>
      <TableCard title="Onboarding registrations" total={rows.length} page={page} pageSize={size} onPage={setPage} onPageSize={setSize} minWidth={1150}>
        <THead cols={['Registration', 'Tier', 'Company / Contact', 'Mobile', 'Method', 'Stage', 'Access', 'Created by', 'Updated', 'Action']} />
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow cols={10} text="No registrations. Start one with Method A or Method B." />
          ) : (
            paged(rows, page, size).map((r) => (
              <tr key={r.id} className={TROW}>
                <td className={TD}>
                  <div className="font-semibold text-slate-900">{r.id}</div>
                  {r.frId && <Link to={`/franchise/network/${r.frId}`} className="text-[10.5px] text-[#0066FF] hover:underline">{r.code} · {r.frId}</Link>}
                </td>
                <td className={TD}>{TIER_SHORT[r.tier]}</td>
                <td className={TD}>
                  <div className="font-semibold text-slate-900">{r.form.companyName || '—'}</div>
                  <div className="text-[10.5px] text-slate-400">{r.form.contactName || '—'}</div>
                </td>
                <td className={TD}>{maskMobile(r.form.mobile)}</td>
                <td className={TD}>{methodLabel(r.method)}</td>
                <td className={TD}><Badge tone={toneFor(r.stage)}>{r.stage}</Badge></td>
                <td className={TD}>{r.stage === 'Approved' ? <span className="inline-flex items-center gap-1 text-emerald-700"><Unlock size={12} /> Unlocked</span> : <span className="inline-flex items-center gap-1 text-slate-500"><Lock size={12} /> Locked</span>}</td>
                <td className={TD}>{r.createdBy}</td>
                <td className={TD}>{fmtDateTime(r.updatedAt)}</td>
                <td className={TD}><Button size="sm" variant="secondary" onClick={() => setOpenId(r.id)}>Open</Button></td>
              </tr>
            ))
          )}
        </tbody>
      </TableCard>

      {basicFor && (
        <BasicInfoModal
          existing={basicFor === 'new' ? undefined : basicFor}
          onClose={() => setBasicFor(null)}
          onSaved={(id) => {
            setBasicFor(null)
            setOpenId(id)
          }}
        />
      )}
      {pickTier && <TierPickModal onClose={() => setPickTier(false)} />}
      {open && <WorkflowModal reg={open} onClose={() => setOpenId(null)} onEditBasic={() => { setBasicFor(open); setOpenId(null) }} />}
    </div>
  )
}

function TierPickModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  return (
    <Modal title="Method B — CRM full registration" sub="Choose the tier to register. The CRM user fills the full form and uploads KYC." onClose={onClose}>
      <div className="grid gap-2">
        {TIERS.map((t) => (
          <button key={t} type="button" onClick={() => navigate(`/franchise/register/${TIER_SLUGS[t]}`)} className="flex h-11 items-center justify-between rounded-lg border border-slate-200 px-4 text-[13px] font-semibold text-slate-800 hover:border-[#0066FF] hover:bg-blue-50/40">
            {t === 'Franchise' ? 'Franchise (FR)' : `${t} Franchise (${TIER_SHORT[t]})`}
            <span className="text-[11px] font-normal text-slate-500">Open form</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}

/** Method A — CRM captures basic info only. */
function BasicInfoModal({ existing, onClose, onSaved }: { existing?: Registration; onClose: () => void; onSaved: (id: string) => void }) {
  const net = useNetwork()
  const frs = useFranchises()
  const [tier, setTier] = useState<Tier>(existing?.tier ?? 'Franchise')
  const [form, setForm] = useState<RegForm>(() => existing?.form ?? emptyRegForm('Franchise'))
  const [errors, setErrors] = useState<RegErrors>({})
  const set = (p: Partial<RegForm>) => {
    setForm((f) => ({ ...f, ...p }))
    setErrors((e) => {
      const keys = Object.keys(p).filter((k) => k in e)
      if (!keys.length) return e
      const n = { ...e }
      keys.forEach((k) => delete n[k as keyof RegErrors])
      return n
    })
  }
  const changeTier = (t: Tier) => {
    setTier(t)
    set({ parentKind: t === 'Super Master' ? 'Company' : '', parentId: '' })
  }
  const save = () => {
    const errs = validateBasic(form, tier)
    setErrors(errs)
    if (Object.keys(errs).length) return
    if (existing) {
      patchRegistration(existing.id, { tier, form }, 'Basic information updated')
      toast('Basic information updated')
      onSaved(existing.id)
    } else {
      const r = newRegistration(tier, 'A', form)
      saveRegistration({ ...r, log: [{ at: nowIso(), by: r.createdBy, text: 'Basic information captured (Method A)' }] })
      toast(`Registration ${r.id} created — generate the app activation link next`)
      onSaved(r.id)
    }
  }
  const tierLabel = (t: Tier) => TIER_SHORT[t]
  return (
    <Modal
      title={existing ? `Edit basic information · ${existing.id}` : 'Method A — Basic information'}
      sub="The franchisee completes KYC in the mobile app after receiving the activation link."
      onClose={onClose}
      width={760}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Back</Button>
          <Button onClick={save}>{existing ? 'Save' : 'Save & continue'}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <RadioGroup<string> label="Tier *" value={tierLabel(tier)} onChange={(v) => changeTier(TIERS.find((t) => TIER_SHORT[t] === v) ?? 'Franchise')} options={TIERS.map(tierLabel)} className="sm:col-span-2" />
        <TextField label="Name (contact person)" required name="b-contact" value={form.contactName} error={errors.contactName} onChange={(e) => set({ contactName: e.target.value })} />
        <TextField label="Company / Firm / Trade name" required name="b-company" value={form.companyName} error={errors.companyName} onChange={(e) => set({ companyName: e.target.value })} />
        <TextField label="Mobile" required name="b-mobile" inputMode="numeric" maxLength={10} value={form.mobile} error={errors.mobile} onChange={(e) => set({ mobile: e.target.value.replace(/\D/g, '') })} />
        <TextField label="Email" required type="email" name="b-email" value={form.email} error={errors.email} onChange={(e) => set({ email: e.target.value })} />
        <RadioGroup<EntityType> label="Entity type *" value={form.entity} onChange={(v) => set({ entity: v })} options={ENTITY_TYPES} error={errors.entity} className="sm:col-span-2" />
        <SelectField label="State" required name="b-state" options={STATES} value={form.state} error={errors.state} onChange={(e) => set({ state: e.target.value, district: '' })} />
        <SelectField label="District" required name="b-district" options={districtsOf(form.state)} value={form.district} error={errors.district} disabled={!form.state} onChange={(e) => set({ district: e.target.value })} />
        <PickField label="Parent mapping" required name="b-parent-kind" options={PARENT_KINDS[tier].map((k) => ({ value: k, label: PARENT_KIND_LABEL[k] }))} value={form.parentKind} error={errors.parentKind} disabled={tier === 'Super Master'} onChange={(e) => set({ parentKind: e.target.value as ParentKind | '', parentId: '' })} />
        {form.parentKind && form.parentKind !== 'Company' ? (
          <PickField label={PARENT_KIND_LABEL[form.parentKind]} required name="b-parent-id" options={parentOptions(form.parentKind, net.nodes, frs)} value={form.parentId} error={errors.parentId} onChange={(e) => set({ parentId: e.target.value })} />
        ) : (
          <div />
        )}
      </div>
    </Modal>
  )
}

const code8 = () => Array.from({ length: 8 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')

function WorkflowModal({ reg, onClose, onEditBasic }: { reg: Registration; onClose: () => void; onEditBasic: () => void }) {
  const navigate = useNavigate()
  const docs = requiredDocs(reg.form.entity)
  const submitted = reg.stage === 'Pending Approval' || reg.stage === 'Approved' || reg.stage === 'Rejected'
  const basicOk = Object.keys(validateBasic(reg.form, reg.tier)).length === 0

  const generate = () => {
    patchRegistration(reg.id, { link: `https://app.dexterindia.in/activate/${code8()}`, stage: 'Link Generated' }, 'Mobile app activation link generated')
    toast('Activation link generated')
  }
  const send = (via: 'SMS' | 'Email') => {
    patchRegistration(reg.id, { sentVia: [...new Set([...reg.sentVia, via])], stage: reg.kycFromApp ? reg.stage : 'Link Sent' }, `Activation link sent via ${via} (${via === 'SMS' ? maskMobile(reg.form.mobile) : reg.form.email})`)
    toast(`Link sent via ${via} (simulated)`)
  }
  const markKyc = () => {
    const files = Object.fromEntries(docs.map((d) => [d, { name: `${d.replace(/[^\w]+/g, '_')}_from_app.pdf`, size: 180_000 + d.length * 9_000 }]))
    patchRegistration(reg.id, { kycFromApp: true, stage: 'KYC Uploaded', form: { ...reg.form, docs: { ...reg.form.docs, ...files } } }, `Franchisee uploaded KYC from the mobile app (${docs.join(', ')})`)
    toast('KYC upload from the app recorded')
  }
  const verify = () => {
    const missing = docs.filter((d) => !reg.form.docs[d])
    if (missing.length) {
      toast(`Missing documents: ${missing.join(', ')}`, 'error')
      return
    }
    patchRegistration(reg.id, { docsVerified: true, stage: 'Documents Verified' }, 'CRM verified the KYC documents')
    toast('Documents verified')
  }
  const forApproval = () => {
    if (!basicOk) {
      toast('Complete the basic information first', 'error')
      return
    }
    if (!reg.docsVerified) {
      toast('Verify the KYC documents before sending for approval', 'error')
      return
    }
    sendForApprovalAsync(reg.id).then((frId) => {
      if (frId) toast('Sent for Admin approval')
    })
  }

  type Step = { title: string; done: boolean; body: ReactNode }
  const stepsA: Step[] = [
    { title: 'Basic information (CRM)', done: basicOk, body: <span>{reg.form.companyName} · {reg.form.contactName} · {reg.form.entity || '—'} · {reg.form.district}, {reg.form.state}{!submitted && <button type="button" onClick={onEditBasic} className="ml-2 font-semibold text-[#0066FF] hover:underline">Edit</button>}</span> },
    {
      title: 'Generate mobile app activation link',
      done: !!reg.link,
      body: reg.link ? (
        <div className="flex flex-wrap items-center gap-2">
          <input readOnly value={reg.link} className="h-8 w-[340px] max-w-full rounded-md border border-slate-200 bg-slate-50 px-2 font-mono text-[11.5px]" />
          <Button
            size="sm"
            variant="secondary"
            icon={<Copy size={12} />}
            onClick={() => {
              navigator.clipboard?.writeText(reg.link ?? '').then(() => toast('Link copied'), () => toast('Copy failed — select the link manually', 'error'))
            }}
          >
            Copy
          </Button>
        </div>
      ) : (
        <Button size="sm" icon={<Smartphone size={12} />} onClick={generate} disabled={submitted || !basicOk}>Generate mobile app activation link</Button>
      ),
    },
    {
      title: 'Send link to the franchisee',
      done: reg.sentVia.length > 0,
      body: (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" icon={<MessageSquare size={12} />} disabled={!reg.link || submitted} onClick={() => send('SMS')}>Send via SMS</Button>
          <Button size="sm" variant="secondary" icon={<Mail size={12} />} disabled={!reg.link || submitted} onClick={() => send('Email')}>Send via Email</Button>
          {reg.sentVia.length > 0 && <span className="text-[11px] text-slate-500">Sent via {reg.sentVia.join(', ')}</span>}
          <span className="w-full text-[11px] text-slate-500">Sending the link does not activate the account — only registration / KYC is available until Admin approval.</span>
        </div>
      ),
    },
    {
      title: 'Franchisee self-KYC from the app',
      done: reg.kycFromApp,
      body: reg.kycFromApp ? <span>Uploaded: {docs.filter((d) => reg.form.docs[d]).join(', ')}</span> : <Button size="sm" variant="secondary" disabled={!reg.sentVia.length || submitted} onClick={markKyc}>Mark KYC uploaded from app</Button>,
    },
    { title: 'CRM verifies documents', done: reg.docsVerified, body: reg.docsVerified ? <span>Verified</span> : <Button size="sm" variant="secondary" disabled={!reg.kycFromApp || submitted} onClick={verify}>Verify documents</Button> },
  ]
  const stepsB: Step[] = [
    {
      title: 'CRM fills the full form & uploads KYC',
      done: !!reg.frId,
      body: submitted ? <span>Completed</span> : <Button size="sm" onClick={() => navigate(`/franchise/register/${TIER_SLUGS[reg.tier]}?reg=${reg.id}`)}>{reg.stage === 'Returned' ? 'Correct & resubmit' : 'Continue full form'}</Button>,
    },
  ]
  const steps = [
    ...(reg.method === 'A' ? stepsA : stepsB),
    {
      title: 'Send for Admin approval',
      done: submitted,
      body:
        reg.method === 'A' && !submitted ? (
          <Button size="sm" onClick={forApproval} disabled={!reg.docsVerified}>Send for Admin approval</Button>
        ) : reg.stage === 'Pending Approval' ? (
          <span>Waiting for Admin · <Link to="/franchise/onboarding/approvals" className="font-semibold text-[#0066FF] hover:underline">Open approvals</Link></span>
        ) : submitted ? (
          <span>Sent</span>
        ) : (
          <span>Submitted from the full form</span>
        ),
    },
    {
      title: 'Admin approval (mandatory gate)',
      done: reg.stage === 'Approved',
      body: reg.decision ? (
        <span>
          {reg.decision.action} by {reg.decision.by} · {fmtDateTime(reg.decision.at)}{reg.decision.reason ? ` — ${reg.decision.reason}` : ''}
          {reg.stage === 'Approved' && <b className="ml-1 text-emerald-700">Project Mapping now available.</b>}
        </span>
      ) : (
        <span>Pending</span>
      ),
    },
  ]

  return (
    <Modal title={`${reg.id} · ${reg.form.companyName || 'New registration'}`} sub={`${TIER_SHORT[reg.tier]} · Method ${methodLabel(reg.method)} · ${reg.stage}`} onClose={onClose} width={760} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      <div className="space-y-4">
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] ${reg.stage === 'Approved' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
          {reg.stage === 'Approved' ? <Unlock size={14} /> : <Lock size={14} />}
          {reg.stage === 'Approved' ? 'Mobile app login & ERP access unlocked.' : 'Mobile app login & ERP access locked until Admin approval.'}
          {reg.frId && <Link to={`/franchise/network/${reg.frId}`} className="ml-auto font-semibold text-[#0066FF] hover:underline">Network profile</Link>}
        </div>
        {reg.stage === 'Returned' && reg.decision && <div className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">Returned for correction: <b>{reg.decision.reason}</b></div>}
        {reg.stage === 'Returned' && reg.method === 'A' && (
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => patchRegistration(reg.id, { docsVerified: false, stage: reg.kycFromApp ? 'KYC Uploaded' : reg.sentVia.length ? 'Link Sent' : 'Draft' }, 'Reopened after return for correction')}>Reopen for correction</Button>
          </div>
        )}
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              {s.done ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" /> : <Circle size={18} className="mt-0.5 shrink-0 text-slate-300" />}
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold text-slate-900">{i + 1}. {s.title}</div>
                <div className="mt-1 text-[12px] text-slate-600">{s.body}</div>
              </div>
            </li>
          ))}
        </ol>
        <div>
          <div className="mb-1.5 text-[12px] font-semibold text-slate-800">Activity log</div>
          <ul className="max-h-[160px] space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 text-[11.5px] text-slate-600">
            {reg.log.map((l, i) => (
              <li key={`${l.at}-${i}`}>{fmtDateTime(l.at)} · {l.by} — {l.text}</li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  )
}
