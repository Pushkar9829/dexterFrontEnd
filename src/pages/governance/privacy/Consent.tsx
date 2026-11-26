// Consent management (DPDP parameters 1, 5, 6) + privacy notices.
import { useState } from 'react'
import { FileSignature, History, Plus, Undo2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { maskEmail, maskMobile } from '@/lib/mask'
import { logPrivacy, privacyStore, shortId, usePrivacy, withdrawConsent, type ConsentChannel, type ConsentRecord, type LegalBasis, type PrivacyNotice } from '@/data/privacy'
import { ConfirmModal, DataGrid, FormActions, Note, PageShell, Stat, StatRow, Tabs, type Col } from '../security/kit'
import { actor, fmtDT } from '../security/util'

type Tab = 'records' | 'history' | 'notices'
const BASES: LegalBasis[] = ['Consent', 'Legitimate use — employment', 'Legitimate use — legal obligation', 'Legitimate use — voluntarily provided']
const CHANNELS: ConsentChannel[] = ['Mobile App', 'Web Portal', 'Paper form', 'Email']
const maskContact = (v: string) => (v.includes('@') ? maskEmail(v) : maskMobile(v))

function RecordConsent({ onClose }: { onClose: () => void }) {
  const p = usePrivacy()
  const published = p.notices.find((n) => n.status === 'Published')
  const [f, setF] = useState({ principal: '', principalRef: '', contact: '', principalType: '', purpose: '', legalBasis: '', channel: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }))
  const submit = () => {
    const e: Record<string, string> = {}
    ;(['principal', 'principalRef', 'contact', 'principalType', 'purpose', 'legalBasis', 'channel'] as const).forEach((k) => {
      if (!f[k].trim()) e[k] = 'Required.'
    })
    if (!published) e.notice = 'Publish a privacy notice first — consent must be linked to a notice.'
    setErr(e)
    if (Object.keys(e).length || !published) return
    const at = new Date().toISOString()
    const by = actor()
    const id = shortId('CNS')
    const c: ConsentRecord = { id, principal: f.principal.trim(), principalRef: f.principalRef.trim(), contact: f.contact.trim(), principalType: f.principalType as ConsentRecord['principalType'], purpose: f.purpose.trim(), legalBasis: f.legalBasis as LegalBasis, givenOn: at, channel: f.channel as ConsentChannel, noticeVersion: published.version, status: 'Active' }
    privacyStore.set((s) => ({ ...s, consents: [c, ...s.consents], consentEvents: [{ id: shortId('CEV'), consentId: id, principal: c.principal, principalRef: c.principalRef, at, action: 'Given', purpose: c.purpose, channel: c.channel, by }, ...s.consentEvents] }))
    logPrivacy(by, 'Consent recorded', id, `${c.principal} — ${c.purpose} (${c.legalBasis}, notice ${c.noticeVersion})`)
    toast(`Consent ${id} recorded.`)
    onClose()
  }
  return (
    <Modal title="Record consent / legal basis" sub="Record the consent or other lawful basis before collecting personal data." onClose={onClose} width={680}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Data principal" required value={f.principal} onChange={(e) => set('principal', e.target.value)} error={err.principal} />
          <TextField label="Reference (account / application ID)" required value={f.principalRef} onChange={(e) => set('principalRef', e.target.value)} error={err.principalRef} />
          <TextField label="Email or mobile" required value={f.contact} onChange={(e) => set('contact', e.target.value)} error={err.contact} />
          <SelectField label="Principal type" required options={['Employee', 'Franchisee', 'Applicant', 'Customer']} value={f.principalType} onChange={(e) => set('principalType', e.target.value)} error={err.principalType} />
          <TextField label="Purpose" required className="sm:col-span-2" value={f.purpose} onChange={(e) => set('purpose', e.target.value)} error={err.purpose} placeholder="Specific purpose, e.g. Franchise onboarding & KYC verification" />
          <SelectField label="Legal basis" required options={BASES} value={f.legalBasis} onChange={(e) => set('legalBasis', e.target.value)} error={err.legalBasis} />
          <SelectField label="Channel" required options={CHANNELS} value={f.channel} onChange={(e) => set('channel', e.target.value)} error={err.channel} />
        </div>
        {published ? <Note>Linked to the published privacy notice {published.version}.</Note> : <Note tone="red">{err.notice ?? 'No published privacy notice.'}</Note>}
        <FormActions onBack={onClose} onSubmit={submit} submitLabel="Record consent" />
      </div>
    </Modal>
  )
}

function NoticeForm({ onClose }: { onClose: () => void }) {
  const p = usePrivacy()
  const [f, setF] = useState({ version: '', title: 'Privacy Notice — Franchise & Employees', language: 'English + Hindi', summary: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const save = (publish: boolean) => {
    const e: Record<string, string> = {}
    if (!/^v\d+(\.\d+)?$/.test(f.version.trim())) e.version = 'Use a version like v1.4.'
    else if (p.notices.some((n) => n.version === f.version.trim())) e.version = 'This version already exists.'
    if (!f.title.trim()) e.title = 'Required.'
    if (!f.language.trim()) e.language = 'Required.'
    if (f.summary.trim().length < 10) e.summary = 'Summarise what the notice covers / what changed.'
    setErr(e)
    if (Object.keys(e).length) return
    const at = new Date().toISOString()
    const by = actor()
    const n: PrivacyNotice = { id: shortId('NTC'), version: f.version.trim(), title: f.title.trim(), language: f.language.trim(), summary: f.summary.trim(), status: publish ? 'Published' : 'Draft', publishedOn: publish ? at : undefined, updatedBy: by }
    privacyStore.set((s) => ({ ...s, notices: [n, ...s.notices.map((x) => (publish && x.status === 'Published' ? { ...x, status: 'Superseded' as const } : x))] }))
    logPrivacy(by, publish ? 'Privacy notice published' : 'Privacy notice draft saved', n.version, n.summary)
    toast(publish ? `Notice ${n.version} published.` : `Draft ${n.version} saved.`, publish ? 'success' : 'info')
    onClose()
  }
  return (
    <Modal title="New privacy notice version" onClose={onClose} width={640}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Version" required value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} error={err.version} placeholder="v1.4" />
          <TextField label="Title" required className="sm:col-span-2" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} error={err.title} />
          <TextField label="Language(s)" required value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })} error={err.language} />
          <TextAreaField label="Summary / changes" required className="sm:col-span-3" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} error={err.summary} />
        </div>
        <FormActions onBack={onClose} onDraft={() => save(false)} onSubmit={() => save(true)} submitLabel="Publish" />
      </div>
    </Modal>
  )
}

export default function Consent() {
  const p = usePrivacy()
  const [tab, setTab] = useState<Tab>('records')
  const [adding, setAdding] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [withdraw, setWithdraw] = useState<ConsentRecord | null>(null)
  const [person, setPerson] = useState<{ ref: string; name: string } | null>(null)
  const [publishId, setPublishId] = useState<PrivacyNotice | null>(null)

  const cols: Col<ConsentRecord>[] = [
    { key: 'id', label: 'Consent ID', value: (c) => c.id, className: 'font-mono text-[11px] text-muted' },
    { key: 'who', label: 'Data principal', value: (c) => `${c.principal} ${c.principalRef}`, render: (c) => (<><span className="font-medium text-ink">{c.principal}</span><span className="block text-[10.5px] text-muted">{c.principalRef} · {c.principalType} · {maskContact(c.contact)}</span></>) },
    { key: 'purpose', label: 'Purpose', value: (c) => c.purpose, className: 'max-w-[220px]' },
    { key: 'basis', label: 'Legal basis', value: (c) => c.legalBasis, className: 'text-[11.5px] text-muted' },
    { key: 'given', label: 'Given on', value: (c) => fmtDT(c.givenOn), className: 'whitespace-nowrap text-muted' },
    { key: 'ch', label: 'Channel', value: (c) => `${c.channel} · notice ${c.noticeVersion}`, render: (c) => (<>{c.channel}<span className="block text-[10.5px] text-muted">Notice {c.noticeVersion}</span></>) },
    { key: 'st', label: 'Status', value: (c) => c.status, render: (c) => (<><Badge tone={c.status === 'Active' ? 'green' : c.status === 'Withdrawn' ? 'red' : 'gray'}>{c.status}</Badge>{c.withdrawnOn && <span className="mt-0.5 block text-[10.5px] text-muted">{fmtDT(c.withdrawnOn)}</span>}</>) },
  ]

  return (
    <PageShell
      back="/governance/privacy"
      backLabel="Back to DPDP Compliance"
      Icon={FileSignature}
      color="text-emerald-600 bg-emerald-50 border-emerald-200"
      title="Consent Management"
      sub="Consent or other lawful basis before collecting personal data, easy withdrawal and full consent history."
      actions={
        tab === 'notices' ? (
          <Button icon={<Plus size={15} />} onClick={() => setNoticeOpen(true)}>New notice version</Button>
        ) : (
          <Button icon={<Plus size={15} />} onClick={() => setAdding(true)}>Record consent</Button>
        )
      }
    >
      <StatRow>
        <Stat label="Active consents" value={p.consents.filter((c) => c.status === 'Active').length} tone="green" />
        <Stat label="Withdrawn" value={p.consents.filter((c) => c.status === 'Withdrawn').length} tone="red" />
        <Stat label="Data principals" value={new Set(p.consents.map((c) => c.principalRef)).size} tone="blue" />
        <Stat label="Current notice" value={p.notices.find((n) => n.status === 'Published')?.version ?? '—'} tone="purple" />
      </StatRow>
      <Tabs
        tabs={[
          { value: 'records', label: 'Consent records', count: p.consents.length },
          { value: 'history', label: 'Consent history', count: p.consentEvents.length },
          { value: 'notices', label: 'Privacy notices', count: p.notices.length },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'records' && (
        <DataGrid
          rows={p.consents}
          cols={cols}
          rowKey={(c) => c.id}
          fileName="consent-records"
          searchPlaceholder="Search principal, purpose, reference…"
          filters={[
            { key: 'st', label: 'Statuses', get: (c) => c.status, options: ['Active', 'Withdrawn', 'Expired'] },
            { key: 'basis', label: 'Legal bases', get: (c) => c.legalBasis, options: BASES },
            { key: 'type', label: 'Principal types', get: (c) => c.principalType, options: ['Employee', 'Franchisee', 'Applicant', 'Customer'] },
            { key: 'ch', label: 'Channels', get: (c) => c.channel, options: CHANNELS },
          ]}
          date={(c) => c.givenOn}
          actions={(c) => (
            <>
              <Button size="sm" variant="secondary" icon={<History size={13} />} onClick={() => setPerson({ ref: c.principalRef, name: c.principal })}>History</Button>
              {c.status === 'Active' && c.legalBasis === 'Consent' && (
                <Button size="sm" variant="danger" icon={<Undo2 size={13} />} onClick={() => setWithdraw(c)}>Withdraw</Button>
              )}
            </>
          )}
        />
      )}
      {tab === 'history' && (
        <DataGrid
          rows={p.consentEvents}
          rowKey={(e) => e.id}
          fileName="consent-history"
          searchPlaceholder="Search principal, purpose…"
          filters={[
            { key: 'a', label: 'Actions', get: (e) => e.action, options: ['Given', 'Withdrawn', 'Renewed'] },
            { key: 'who', label: 'Principals', get: (e) => e.principal },
          ]}
          date={(e) => e.at}
          cols={[
            { key: 'at', label: 'Date & time', value: (e) => fmtDT(e.at), className: 'whitespace-nowrap text-muted' },
            { key: 'who', label: 'Data principal', value: (e) => `${e.principal} (${e.principalRef})` },
            { key: 'a', label: 'Action', value: (e) => e.action, render: (e) => <Badge tone={e.action === 'Withdrawn' ? 'red' : 'green'}>{e.action}</Badge> },
            { key: 'p', label: 'Purpose', value: (e) => e.purpose },
            { key: 'ch', label: 'Channel', value: (e) => e.channel },
            { key: 'by', label: 'Recorded by', value: (e) => `${e.by}${e.note ? ` — ${e.note}` : ''}`, className: 'text-muted' },
          ]}
        />
      )}
      {tab === 'notices' && (
        <DataGrid
          rows={p.notices}
          rowKey={(n) => n.id}
          fileName="privacy-notices"
          filters={[{ key: 'st', label: 'Statuses', get: (n) => n.status, options: ['Draft', 'Published', 'Superseded'] }]}
          cols={[
            { key: 'v', label: 'Version', value: (n) => n.version, className: 'font-mono font-semibold' },
            { key: 't', label: 'Title', value: (n) => n.title },
            { key: 'l', label: 'Language', value: (n) => n.language },
            { key: 's', label: 'Summary', value: (n) => n.summary, className: 'max-w-[300px] text-muted' },
            { key: 'pub', label: 'Published', value: (n) => fmtDT(n.publishedOn), className: 'whitespace-nowrap text-muted' },
            { key: 'st', label: 'Status', value: (n) => n.status, render: (n) => <Badge tone={n.status === 'Published' ? 'green' : n.status === 'Draft' ? 'amber' : 'gray'}>{n.status}</Badge> },
          ]}
          actions={(n) => (n.status === 'Draft' ? <Button size="sm" onClick={() => setPublishId(n)}>Publish</Button> : <span className="text-[11px] text-muted">—</span>)}
        />
      )}

      {adding && <RecordConsent onClose={() => setAdding(false)} />}
      {noticeOpen && <NoticeForm onClose={() => setNoticeOpen(false)} />}
      {withdraw && (
        <ConfirmModal
          title={`Withdraw consent ${withdraw.id}?`}
          sub={`${withdraw.principal} — ${withdraw.purpose}. Processing based on this consent stops; earlier processing stays lawful.`}
          confirmLabel="Withdraw consent"
          danger
          reasonLabel="How was the withdrawal received?"
          onConfirm={(note) => {
            const ok = withdrawConsent(withdraw.id, actor(), 'Web Portal', note)
            toast(ok ? 'Consent withdrawn.' : 'Consent is no longer active.', ok ? 'success' : 'info')
            setWithdraw(null)
          }}
          onClose={() => setWithdraw(null)}
        />
      )}
      {publishId && (
        <ConfirmModal
          title={`Publish notice ${publishId.version}?`}
          sub="The currently published notice becomes Superseded. New consents link to this version."
          confirmLabel="Publish"
          onConfirm={() => {
            const at = new Date().toISOString()
            const by = actor()
            privacyStore.set((s) => ({ ...s, notices: s.notices.map((x) => (x.id === publishId.id ? { ...x, status: 'Published', publishedOn: at, updatedBy: by } : x.status === 'Published' ? { ...x, status: 'Superseded' } : x)) }))
            logPrivacy(by, 'Privacy notice published', publishId.version)
            toast(`Notice ${publishId.version} published.`)
            setPublishId(null)
          }}
          onClose={() => setPublishId(null)}
        />
      )}
      {person && (
        <Modal title={`Consent history — ${person.name}`} sub={person.ref} onClose={() => setPerson(null)} width={820}>
          <DataGrid
            rows={p.consentEvents.filter((e) => e.principalRef === person.ref)}
            rowKey={(e) => e.id}
            fileName={`consent-history-${person.ref}`}
            pageSize={8}
            filters={[{ key: 'a', label: 'Actions', get: (e) => e.action, options: ['Given', 'Withdrawn', 'Renewed'] }]}
            cols={[
              { key: 'at', label: 'When', value: (e) => fmtDT(e.at), className: 'whitespace-nowrap text-muted' },
              { key: 'a', label: 'Action', value: (e) => e.action, render: (e) => <Badge tone={e.action === 'Withdrawn' ? 'red' : 'green'}>{e.action}</Badge> },
              { key: 'p', label: 'Purpose', value: (e) => e.purpose },
              { key: 'ch', label: 'Channel', value: (e) => e.channel },
              { key: 'by', label: 'By', value: (e) => e.by },
            ]}
          />
        </Modal>
      )}
    </PageShell>
  )
}
