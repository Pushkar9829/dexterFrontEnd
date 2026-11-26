// Self-service privacy page for the signed-in user (also the only governance page a Franchisee can open).
import { useMemo, useState } from 'react'
import { CheckCircle2, ShieldCheck, Undo2 } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { getSession } from '@/lib/auth'
import { useRole } from '@/lib/rbac'
import { maskMobile } from '@/lib/mask'
import { useSecurity } from '@/data/security'
import { apiEnabled } from '@/lib/api'
import { useMyPrivacy, usePrivacy, withdrawConsent, type ConsentRecord, type Grievance, type RightsRequest } from '@/data/privacy'
import { ConfirmModal, DataGrid, Note, PageShell, Section, Tabs } from '../security/kit'
import { fmtD, fmtDT } from '../security/util'
import { GrievanceForm } from './GrievanceForm'
import { RightsForm } from './RightsForm'

type Tab = 'consents' | 'request' | 'grievance' | 'status'
type StatusRow = { id: string; kind: string; at: string; status: string; due: string; detail: string }

export default function MyPrivacy() {
  const role = useRole()
  const sec = useSecurity()
  const pAll = usePrivacy()
  // API mode: own rows come from GET /privacy/my (the officer registers are not readable by everyone)
  const myApi = useMyPrivacy()
  const p = apiEnabled && myApi ? { ...pAll, settings: { ...pAll.settings, dpo: myApi.dpo }, consents: myApi.consents, rights: myApi.rights, grievances: myApi.grievances } : pAll
  const [tab, setTab] = useState<Tab>('consents')
  const [withdraw, setWithdraw] = useState<ConsentRecord | null>(null)
  const [ack, setAck] = useState<string | null>(null)

  const session = getSession()
  const account = sec.accounts.find((a) => (session?.email && a.email.toLowerCase() === session.email.toLowerCase()) || a.name === session?.name)
  const me = {
    name: account?.name ?? session?.name ?? 'Signed-in user',
    ref: (apiEnabled ? myApi?.principal.ref : undefined) ?? account?.id ?? session?.email ?? '',
    email: account?.email ?? session?.email ?? '',
    mobile: account?.mobile ?? '',
  }
  const mine = (ref: string, contact?: string) => (apiEnabled && !!myApi) || ref === me.ref || (!!me.email && contact?.toLowerCase() === me.email.toLowerCase())

  const myDraft = p.grievances.find((g) => g.draft && g.source === 'Self-service' && g.complainant.ref === me.ref)
  const consents = p.consents.filter((c) => mine(c.principalRef, c.contact))
  const statusRows = useMemo<StatusRow[]>(() => {
    const r: StatusRow[] = p.rights
      .filter((x: RightsRequest) => (apiEnabled && !!myApi) || x.principalRef === me.ref || x.contact.toLowerCase() === me.email.toLowerCase())
      .map((x) => ({ id: x.id, kind: `Rights — ${x.type}`, at: x.createdAt, status: x.status, due: fmtD(x.dueAt), detail: x.response ?? x.details }))
    const g: StatusRow[] = p.grievances
      .filter((x: Grievance) => !x.draft && ((apiEnabled && !!myApi) || x.complainant.ref === me.ref || x.complainant.email.toLowerCase() === me.email.toLowerCase()))
      .map((x) => ({ id: x.id, kind: `Grievance — ${x.category}`, at: x.createdAt, status: x.status, due: fmtD(x.dueAt), detail: x.resolutionRemarks ?? x.subject }))
    return [...r, ...g].sort((a, b) => b.at.localeCompare(a.at))
  }, [p.rights, p.grievances, me.ref, me.email, myApi])

  const back = role === 'Franchisee' ? '/dashboard' : '/governance/privacy'
  const done = (id: string) => {
    setAck(id)
    setTab('status')
  }

  return (
    <PageShell back={back} backLabel={role === 'Franchisee' ? 'Back to Dashboard' : 'Back to DPDP Compliance'} Icon={ShieldCheck} color="text-emerald-600 bg-emerald-50 border-emerald-200" title="My Privacy" sub="See and withdraw your consents, exercise your data rights, raise a privacy complaint and track every request.">
      <Note>
        Data protection contact: <strong>{p.settings.dpo.name}</strong> ({p.settings.dpo.designation}) — {p.settings.dpo.email}, {maskMobile(p.settings.dpo.phone)}. If you are not satisfied with our response you may approach the Data Protection Board of India.
      </Note>
      {ack && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[12.5px] text-emerald-800">
          <CheckCircle2 size={16} /> Received. Your reference number is <strong className="font-mono">{ack}</strong> — a confirmation has been sent to your registered email.
        </div>
      )}
      <Tabs
        tabs={[
          { value: 'consents', label: 'My consents', count: consents.length },
          { value: 'request', label: 'Make a request' },
          { value: 'grievance', label: 'Raise a complaint' },
          { value: 'status', label: 'My requests', count: statusRows.length },
        ]}
        value={tab}
        onChange={(t) => {
          setTab(t)
          setAck(null)
        }}
      />

      {tab === 'consents' && (
        <DataGrid
          rows={consents}
          rowKey={(c) => c.id}
          fileName="my-consents"
          searchPlaceholder="Search purpose…"
          filters={[{ key: 'st', label: 'Statuses', get: (c) => c.status, options: ['Active', 'Withdrawn', 'Expired'] }]}
          cols={[
            { key: 'p', label: 'Purpose', value: (c) => c.purpose, className: 'font-medium text-ink' },
            { key: 'b', label: 'Legal basis', value: (c) => c.legalBasis, className: 'text-muted' },
            { key: 'g', label: 'Given on', value: (c) => fmtDT(c.givenOn), className: 'whitespace-nowrap text-muted' },
            { key: 'ch', label: 'Channel', value: (c) => c.channel },
            { key: 'st', label: 'Status', value: (c) => c.status, render: (c) => <Badge tone={c.status === 'Active' ? 'green' : c.status === 'Withdrawn' ? 'red' : 'gray'}>{c.status}</Badge> },
          ]}
          actions={(c) =>
            c.status === 'Active' && c.legalBasis === 'Consent' ? (
              <Button size="sm" variant="danger" icon={<Undo2 size={13} />} onClick={() => setWithdraw(c)}>Withdraw</Button>
            ) : c.status === 'Active' ? (
              <span className="text-[11px] text-muted" title="Processed under a legitimate use, not consent">Not consent-based</span>
            ) : (
              <span className="text-[11px] text-muted">—</span>
            )
          }
          empty="No consent records linked to your account."
        />
      )}

      {tab === 'request' && (
        <Section title="Exercise your rights" sub="Access, correction, erasure, grievance redressal, withdraw consent or nominate someone.">
          <RightsForm identity={{ name: me.name, ref: me.ref, contact: me.email || me.mobile }} source="Self-service" onBack={() => setTab('consents')} onDone={(r) => done(r.id)} />
        </Section>
      )}

      {tab === 'grievance' && (
        <GrievanceForm
          mode="self"
          identity={{ name: me.name, mobile: me.mobile, email: me.email, ref: me.ref }}
          onBack={() => setTab('consents')}
          initial={myDraft}
          onDone={(g) => {
            if (!g.draft) done(g.id)
          }}
        />
      )}

      {tab === 'status' && (
        <DataGrid
          rows={statusRows}
          rowKey={(r) => r.id}
          fileName="my-privacy-requests"
          filters={[{ key: 'st', label: 'Statuses', get: (r) => r.status }]}
          date={(r) => r.at}
          cols={[
            { key: 'id', label: 'Reference', value: (r) => r.id, className: 'font-mono text-[11.5px] font-semibold' },
            { key: 'k', label: 'Type', value: (r) => r.kind },
            { key: 'at', label: 'Submitted', value: (r) => fmtDT(r.at), className: 'whitespace-nowrap text-muted' },
            { key: 'st', label: 'Status', value: (r) => r.status, render: (r) => <Badge tone={toneFor(r.status)}>{r.status}</Badge> },
            { key: 'due', label: 'Response due', value: (r) => r.due, className: 'whitespace-nowrap text-muted' },
            { key: 'd', label: 'Latest note', value: (r) => r.detail, className: 'max-w-[280px] text-muted' },
          ]}
          empty="You have not raised any privacy request yet."
        />
      )}

      {withdraw && (
        <ConfirmModal
          title="Withdraw consent?"
          sub={`${withdraw.purpose}. We will stop this processing; anything done before withdrawal remains lawful.`}
          confirmLabel="Withdraw"
          danger
          onConfirm={() => {
            const ok = withdrawConsent(withdraw.id, me.name, 'Self-service')
            toast(ok ? 'Consent withdrawn.' : 'This consent is no longer active.', ok ? 'success' : 'info')
            setWithdraw(null)
          }}
          onClose={() => setWithdraw(null)}
        />
      )}
    </PageShell>
  )
}
