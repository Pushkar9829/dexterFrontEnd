// DPDP Act 2023 compliance dashboard: 8 modules, priorities, DPO contact, timelines, responsibilities.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Scale } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { maskMobile } from '@/lib/mask'
import { boardDeadline, escalateOverdue, isOverdue, logPrivacy, privacyStore, rightsOverdue, usePrivacy, type PrivacySettings } from '@/data/privacy'
import { DataGrid, FormActions, Note, PageShell, Section, Stat } from '../security/kit'
import { actor, fmtDT, isEmail, isMobile, useNow } from '../security/util'

type ModuleRow = { no: string; module: string; functions: string; priority: 'P1' | 'P2' | 'P3'; status: string; alert: boolean; to: string }

const RESPONSIBILITIES = [
  ['IT Department', 'Database security, encryption, backup and access control'],
  ['Admin Department', 'User permissions and employee access monitoring'],
  ['HR Department', 'Employee personal data protection'],
  ['Finance Department', 'Bank details, payment records and financial documents'],
  ['Operations Department', 'Franchise data and operational documents'],
  ['Legal Department', 'Privacy policy, compliance review and legal documentation'],
  ['Management', 'Compliance monitoring and security governance'],
  ['Customer Support', 'Registration and resolution of data-privacy complaints'],
]
const PENALTIES = [
  ['Failure to implement reasonable security safeguards', '₹250 crore'],
  ['Failure to notify a personal data breach', '₹200 crore'],
  ['Breach of obligations relating to children’s data', '₹200 crore'],
  ['Breach of additional obligations of a Significant Data Fiduciary', '₹150 crore'],
  ['Breach of any other provision / rule', '₹50 crore'],
]

function ContactForm({ s, onClose }: { s: PrivacySettings; onClose: () => void }) {
  const [f, setF] = useState(s.dpo)
  const [err, setErr] = useState<Record<string, string>>({})
  const submit = () => {
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = 'Required.'
    if (!f.designation.trim()) e.designation = 'Required.'
    if (!isEmail(f.email)) e.email = 'Enter a valid email.'
    if (!isMobile(f.phone)) e.phone = 'Enter a valid 10-digit mobile.'
    if (!f.address.trim()) e.address = 'Required.'
    setErr(e)
    if (Object.keys(e).length) return
    const by = actor()
    const changes = (Object.keys(f) as (keyof typeof f)[]).filter((k) => f[k].trim() !== s.dpo[k]).map((k) => `${k}: ${s.dpo[k]} → ${f[k].trim()}`)
    privacyStore.set((st) => ({ ...st, settings: { ...st.settings, dpo: { name: f.name.trim(), designation: f.designation.trim(), email: f.email.trim(), phone: f.phone.trim(), address: f.address.trim() }, updatedAt: new Date().toISOString(), updatedBy: by } }))
    logPrivacy(by, 'Data protection contact updated', 'DPO contact', changes.join('; ') || 'No change')
    toast('Data protection contact updated.')
    onClose()
  }
  return (
    <Modal title="Data protection contact" sub="Published to users in the privacy notice and on the self-service page." onClose={onClose} width={640}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err.name} />
          <TextField label="Designation" required value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })} error={err.designation} />
          <TextField label="Email" required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={err.email} />
          <TextField label="Phone" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} error={err.phone} />
          <TextAreaField label="Address" required className="sm:col-span-2" rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} error={err.address} />
        </div>
        <FormActions onBack={onClose} onSubmit={submit} submitLabel="Save contact" />
      </div>
    </Modal>
  )
}

function TimelineForm({ s, onClose }: { s: PrivacySettings; onClose: () => void }) {
  const [f, setF] = useState({
    high: String(s.grievanceSlaDays.High),
    medium: String(s.grievanceSlaDays.Medium),
    low: String(s.grievanceSlaDays.Low),
    escalation: s.escalationAuthority,
    rights: String(s.rightsSlaDays),
    breachHours: String(s.breachDetailedReportHours),
    recipients: s.breachAlertRecipients.join(', '),
  })
  const [err, setErr] = useState<Record<string, string>>({})
  const int = (v: string, min: number, max: number) => {
    const n = Number(v)
    return Number.isInteger(n) && n >= min && n <= max ? n : null
  }
  const submit = () => {
    const e: Record<string, string> = {}
    const hi = int(f.high, 1, 30)
    const me = int(f.medium, 1, 60)
    const lo = int(f.low, 1, 90)
    const ri = int(f.rights, 1, 90)
    const bh = int(f.breachHours, 1, 72)
    if (hi == null) e.high = '1–30 days.'
    if (me == null) e.medium = '1–60 days.'
    if (lo == null) e.low = '1–90 days.'
    if (hi != null && me != null && lo != null && !(hi <= me && me <= lo)) e.low = 'High ≤ Medium ≤ Low.'
    if (!f.escalation.trim()) e.escalation = 'Required.'
    if (ri == null) e.rights = '1–90 days.'
    if (bh == null) e.breachHours = 'Max 72 hours (DPDP Rules 2025, Rule 7).'
    const rec = f.recipients.split(/[,;\s]+/).filter(Boolean)
    if (rec.length === 0 || rec.some((r) => !isEmail(r))) e.recipients = 'One or more valid email addresses.'
    setErr(e)
    if (Object.keys(e).length || hi == null || me == null || lo == null || ri == null || bh == null) return
    const by = actor()
    const next: PrivacySettings = { ...s, grievanceSlaDays: { High: hi, Medium: me, Low: lo }, escalationAuthority: f.escalation.trim(), rightsSlaDays: ri, breachDetailedReportHours: bh, breachAlertRecipients: rec, updatedAt: new Date().toISOString(), updatedBy: by }
    const changes = [
      s.grievanceSlaDays.High !== hi || s.grievanceSlaDays.Medium !== me || s.grievanceSlaDays.Low !== lo ? `grievance SLA ${s.grievanceSlaDays.High}/${s.grievanceSlaDays.Medium}/${s.grievanceSlaDays.Low} → ${hi}/${me}/${lo} days` : '',
      s.escalationAuthority !== next.escalationAuthority ? `escalation ${s.escalationAuthority} → ${next.escalationAuthority}` : '',
      s.rightsSlaDays !== ri ? `rights SLA ${s.rightsSlaDays} → ${ri} days` : '',
      s.breachDetailedReportHours !== bh ? `Board report ${s.breachDetailedReportHours} → ${bh} h` : '',
      s.breachAlertRecipients.join(',') !== rec.join(',') ? `breach recipients → ${rec.join(', ')}` : '',
    ].filter(Boolean)
    privacyStore.set((st) => ({ ...st, settings: { ...next, dpo: st.settings.dpo } }))
    logPrivacy(by, 'Legal timelines updated', 'DPDP settings', changes.join('; ') || 'No change')
    toast('Timelines saved. New complaints use the new resolution timeline.')
    onClose()
  }
  return (
    <Modal title="Legal timelines & notifications" sub="All legal timelines and notification recipients are configurable." onClose={onClose} width={680}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Grievance SLA — High (days)" required type="number" value={f.high} onChange={(e) => setF({ ...f, high: e.target.value })} error={err.high} />
          <TextField label="Grievance SLA — Medium (days)" required type="number" value={f.medium} onChange={(e) => setF({ ...f, medium: e.target.value })} error={err.medium} />
          <TextField label="Grievance SLA — Low (days)" required type="number" value={f.low} onChange={(e) => setF({ ...f, low: e.target.value })} error={err.low} />
          <TextField label="Escalate overdue complaints to" required className="sm:col-span-3" value={f.escalation} onChange={(e) => setF({ ...f, escalation: e.target.value })} error={err.escalation} />
          <TextField label="Rights request timeline (days)" required type="number" value={f.rights} onChange={(e) => setF({ ...f, rights: e.target.value })} error={err.rights} />
          <TextField label="Board detailed report (hours)" required type="number" value={f.breachHours} onChange={(e) => setF({ ...f, breachHours: e.target.value })} error={err.breachHours} />
          <TextAreaField label="Breach alert recipients" required className="sm:col-span-3" rows={2} value={f.recipients} onChange={(e) => setF({ ...f, recipients: e.target.value })} error={err.recipients} hint="Comma-separated emails" />
        </div>
        <FormActions onBack={onClose} onSubmit={submit} submitLabel="Save timelines" />
      </div>
    </Modal>
  )
}

export default function PrivacyDashboard() {
  const p = usePrivacy()
  const now = useNow(60_000)
  const [editContact, setEditContact] = useState(false)
  const [editTimes, setEditTimes] = useState(false)

  useEffect(() => {
    escalateOverdue(now)
  }, [now])

  const g = p.grievances.filter((x) => !x.draft)
  const openG = g.filter((x) => x.status !== 'Resolved' && x.status !== 'Closed')
  const overdueG = g.filter((x) => isOverdue(x, now))
  const openB = p.breaches.filter((b) => !b.draft && b.status !== 'Closed')
  const lateB = openB.filter((b) => !b.boardDetailed && boardDeadline(b, p.settings.breachDetailedReportHours) < now)
  const openR = p.rights.filter((r) => r.status !== 'Completed' && r.status !== 'Rejected')
  const dueDel = p.deletion.filter((d) => d.status === 'Due' || d.status === 'Approved')
  const vendorGap = p.vendors.filter((v) => v.dpaStatus === 'Pending' || v.dpaStatus === 'Expired')
  const notice = p.notices.find((n) => n.status === 'Published')

  const modules: ModuleRow[] = [
    { no: '01', module: 'Consent Management', functions: 'Consent & withdrawal, consent history', priority: 'P1', status: `${p.consents.filter((c) => c.status === 'Active').length} active consents`, alert: false, to: '/governance/privacy/consent' },
    { no: '02', module: 'Privacy Policy & Notices', functions: 'Versioned privacy notices', priority: 'P1', status: notice ? `Notice ${notice.version} published` : 'No published notice', alert: !notice, to: '/governance/privacy/consent' },
    { no: '03', module: 'Data Security', functions: 'RBAC, MFA, encryption, masking', priority: 'P1', status: 'Security administration', alert: false, to: '/governance/security-admin' },
    { no: '04', module: 'Complaint / Grievance', functions: 'Grievance, SLA & escalation', priority: 'P1', status: `${openG.length} pending · ${overdueG.length} overdue`, alert: overdueG.length > 0, to: '/governance/privacy/grievances' },
    { no: '05', module: 'Data Breach', functions: 'Incident & Board reporting (72 h)', priority: 'P1', status: `${openB.length} open · ${lateB.length} report overdue`, alert: lateB.length > 0, to: '/governance/privacy/breaches' },
    { no: '06', module: 'User Rights', functions: 'Access, correction, erasure, nominate', priority: 'P2', status: `${openR.length} open · ${p.rights.filter((r) => rightsOverdue(r, now)).length} overdue`, alert: p.rights.some((r) => rightsOverdue(r, now)), to: '/governance/privacy/rights' },
    { no: '07', module: 'Data Retention', functions: 'Retention policy & secure deletion', priority: 'P2', status: `${dueDel.length} record(s) due for deletion`, alert: dueDel.length > 0, to: '/governance/privacy/retention' },
    { no: '08', module: 'Audit & Compliance', functions: 'Logs & compliance reports', priority: 'P2', status: 'Append-only audit trail', alert: false, to: '/governance/security-audit' },
    { no: '09', module: 'Vendor Compliance', functions: 'Third-party DPAs', priority: 'P3', status: `${vendorGap.length} vendor(s) without valid DPA`, alert: vendorGap.length > 0, to: '/governance/privacy/vendors' },
  ]

  return (
    <PageShell
      Icon={Scale}
      color="text-rose-600 bg-rose-50 border-rose-200"
      title="DPDP Compliance"
      sub="Digital Personal Data Protection Act 2023 and DPDP Rules 2025 — integrated across admin, sub-admin, field team and the franchise app."
      actions={
        <>
          <Link to="/governance/privacy/my" className="text-[12.5px] font-medium text-primary hover:underline">Self-service page →</Link>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Pending complaints" value={openG.length} tone="blue" />
        <Stat label="Overdue complaints" value={overdueG.length} tone="red" />
        <Stat label="Open incidents" value={openB.length} tone="red" />
        <Stat label="Open rights requests" value={openR.length} tone="purple" />
        <Stat label="Due for deletion" value={dueDel.length} tone="amber" />
      </div>
      {lateB.length > 0 && <Note tone="red">{lateB.length} incident(s) have passed the {p.settings.breachDetailedReportHours}-hour deadline for the detailed Data Protection Board report.</Note>}

      <DataGrid
        rows={modules}
        rowKey={(m) => m.no}
        fileName="dpdp-compliance-modules"
        searchPlaceholder="Search module…"
        filters={[{ key: 'pr', label: 'Priorities', get: (m) => m.priority, options: ['P1', 'P2', 'P3'] }]}
        cols={[
          { key: 'no', label: 'No.', value: (m) => m.no, className: 'font-mono text-muted' },
          { key: 'm', label: 'Module', value: (m) => m.module, render: (m) => <Link to={m.to} className="font-semibold text-[#0066FF] hover:underline">{m.module}</Link> },
          { key: 'f', label: 'Key functions', value: (m) => m.functions, className: 'text-muted' },
          { key: 'pr', label: 'Priority', value: (m) => m.priority, render: (m) => <Badge tone={m.priority === 'P1' ? 'red' : m.priority === 'P2' ? 'amber' : 'blue'}>{m.priority}{m.priority === 'P1' ? ' — build first' : ' — next phase'}</Badge> },
          { key: 'st', label: 'Current status', value: (m) => m.status, render: (m) => <span className={m.alert ? 'font-semibold text-rose-600' : 'text-ink'}>{m.status}</span> },
        ]}
        pageSize={10}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Data protection contact" sub="Parameter 19 — published to data principals." aside={<Button size="sm" variant="secondary" icon={<Pencil size={13} />} onClick={() => setEditContact(true)}>Edit</Button>}>
          <dl className="grid grid-cols-[120px_1fr] gap-y-1.5 text-[12.5px]">
            <dt className="text-muted">Name</dt><dd className="font-medium text-ink">{p.settings.dpo.name}</dd>
            <dt className="text-muted">Designation</dt><dd>{p.settings.dpo.designation}</dd>
            <dt className="text-muted">Email</dt><dd>{p.settings.dpo.email}</dd>
            <dt className="text-muted">Phone</dt><dd>{maskMobile(p.settings.dpo.phone)}</dd>
            <dt className="text-muted">Address</dt><dd>{p.settings.dpo.address}</dd>
          </dl>
        </Section>
        <Section title="Legal timelines & notifications" sub={`Updated ${fmtDT(p.settings.updatedAt)} by ${p.settings.updatedBy}`} aside={<Button size="sm" variant="secondary" icon={<Pencil size={13} />} onClick={() => setEditTimes(true)}>Edit</Button>}>
          <dl className="grid grid-cols-[180px_1fr] gap-y-1.5 text-[12.5px]">
            <dt className="text-muted">Grievance resolution</dt><dd>High {p.settings.grievanceSlaDays.High}d · Medium {p.settings.grievanceSlaDays.Medium}d · Low {p.settings.grievanceSlaDays.Low}d</dd>
            <dt className="text-muted">Escalation authority</dt><dd>{p.settings.escalationAuthority}</dd>
            <dt className="text-muted">Rights requests</dt><dd>{p.settings.rightsSlaDays} days</dd>
            <dt className="text-muted">Board detailed report</dt><dd>{p.settings.breachDetailedReportHours} hours from detection</dd>
            <dt className="text-muted">Breach alert to</dt><dd>{p.settings.breachAlertRecipients.join(', ')}</dd>
          </dl>
        </Section>
      </div>

      <DataGrid
        rows={RESPONSIBILITIES}
        rowKey={(r) => r[0]}
        fileName="dpdp-department-responsibilities"
        searchPlaceholder="Search department or responsibility…"
        filters={[{ key: 'd', label: 'Departments', get: (r) => r[0] }]}
        cols={[
          { key: 'd', label: 'Department', value: (r) => r[0], className: 'font-medium text-ink' },
          { key: 'r', label: 'Compliance responsibility', value: (r) => r[1], className: 'text-muted' },
        ]}
      />

      <DataGrid
        rows={PENALTIES}
        rowKey={(r) => r[0]}
        fileName="dpdp-penalties"
        searchPlaceholder="Search violation…"
        filters={[{ key: 'm', label: 'Penalties', get: (r) => r[1] }]}
        cols={[
          { key: 'v', label: 'Violation (DPDP Act Schedule)', value: (r) => r[0] },
          { key: 'm', label: 'Maximum penalty', value: (r) => r[1], className: 'font-semibold text-rose-600' },
        ]}
      />

      {editContact && <ContactForm s={p.settings} onClose={() => setEditContact(false)} />}
      {editTimes && <TimelineForm s={p.settings} onClose={() => setEditTimes(false)} />}
    </PageShell>
  )
}
