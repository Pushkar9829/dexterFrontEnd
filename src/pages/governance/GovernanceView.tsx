import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  History,
  Laptop,
  Power,
  Scale,
  Search,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'

export type GovernanceSection = 'audit' | 'sessions' | 'security' | 'compliance'

interface SectionMeta {
  title: string
  sub: string
  Icon: LucideIcon
  color: string
}

const SECTION_META: Record<GovernanceSection, SectionMeta> = {
  audit: {
    title: 'Audit Trail & Event Ledger',
    sub: 'Immutable, tamper-evident audit logs tracking administrative actions, security changes, and system events.',
    Icon: History,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  sessions: {
    title: 'Active User Sessions',
    sub: 'Real-time monitoring of authenticated personnel, device fingerprints, active IP locations, and security tokens.',
    Icon: Laptop,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
  },
  security: {
    title: 'Security Policies & Access Controls',
    sub: 'Corporate security policies, role-based access control (RBAC), authentication rules, and session governance.',
    Icon: ShieldAlert,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  compliance: {
    title: 'Regulatory & RBI Compliance',
    sub: 'RBI White Label ATM guidelines, statutory audits, cash handling checklists, and periodic certification compliance.',
    Icon: Scale,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
  },
}

// ── Mock Data: Audit Trail ─────────────────────────────────────────────────
const AUDIT_DATA = [
  { id: 'AUD-94021', time: '2026-10-21 17:42:10', actor: 'Paras Dubey', email: 'Paras.Dubey@dexterindia.in', action: 'FRANCHISE_UPDATE', entity: 'FR-MH-1024', desc: 'Updated franchise banking mandate & account details', ip: '103.24.112.4', severity: 'Info' },
  { id: 'AUD-94020', time: '2026-10-21 16:15:33', actor: 'Vikram Shah', email: 'vikram.shah@dexterindia.in', action: 'SD_ADJUSTMENT', entity: 'SD-FR-0891', desc: 'Approved SD top-up adjustment of ₹2,50,000 via RTGS', ip: '103.24.112.9', severity: 'Info' },
  { id: 'AUD-94019', time: '2026-10-21 15:50:02', actor: 'System Worker', email: 'system@dexterindia.in', action: 'CBR_AUTO_SYNC', entity: 'CBR-BATCH-88', desc: 'Processed and validated daily switch transactions for 42 ATMs', ip: '10.0.4.12', severity: 'Info' },
  { id: 'AUD-94018', time: '2026-10-21 14:22:45', actor: 'Rahul Kumar', email: 'rahul.kumar@dexterindia.in', action: 'KYC_VERIFICATION', entity: 'KYC-2026-0341', desc: 'Verified Aadhaar OTP and PAN check for applicant Rajesh Gupta', ip: '49.36.128.92', severity: 'Info' },
  { id: 'AUD-94017', time: '2026-10-21 13:05:18', actor: 'Suresh Nair', email: 'suresh.nair@dexterindia.in', action: 'SECURITY_POLICY_EDIT', entity: 'POL-SEC-04', desc: 'Modified session idle timeout threshold to 15 minutes', ip: '103.24.112.4', severity: 'Warning' },
  { id: 'AUD-94016', time: '2026-10-21 11:40:50', actor: 'Priya Menon', email: 'priya.menon@dexterindia.in', action: 'LEGAL_LOI_SIGN', entity: 'LOI-PUN-0294', desc: 'Uploaded notarized LOI agreement counter-signed by Super Master', ip: '103.21.244.18', severity: 'Info' },
  { id: 'AUD-94015', time: '2026-10-21 10:12:04', actor: 'Security Daemon', email: 'daemon@dexterindia.in', action: 'FAILED_LOGIN_ALERT', entity: 'EMP-0310', desc: '3 consecutive invalid OTP attempts from unrecognized IP (182.74.88.19)', ip: '182.74.88.19', severity: 'Critical' },
  { id: 'AUD-94014', time: '2026-10-21 09:30:11', actor: 'Amit Jadhav', email: 'amit.jadhav@dexterindia.in', action: 'PAYOUT_DISBURSE', entity: 'PAY-PO-26-084', desc: 'Generated vendor payout batch for CMS Cash Logistics', ip: '103.24.112.4', severity: 'Info' },
]

// ── Mock Data: User Sessions ───────────────────────────────────────────────
const INITIAL_SESSIONS = [
  { id: 'SES-26-8812', user: 'Paras Dubey', empId: 'EMP-0102', role: 'Operations Lead', device: 'Chrome 129 · macOS Sonoma', ip: '103.24.112.4', location: 'Mumbai, MH', loginTime: 'Today, 08:30 AM', lastActive: 'Just now', mfa: true, status: 'Active' },
  { id: 'SES-26-8813', user: 'Vikram Shah', empId: 'EMP-0189', role: 'Finance Controller', device: 'Edge 128 · Windows 11', ip: '103.24.112.9', location: 'Mumbai, MH', loginTime: 'Today, 09:12 AM', lastActive: '3 mins ago', mfa: true, status: 'Active' },
  { id: 'SES-26-8814', user: 'Rahul Kumar', empId: 'EMP-0142', role: 'KYC Verification Lead', device: 'Chrome 129 · Windows 11', ip: '49.36.128.92', location: 'Pune, MH', loginTime: 'Today, 09:45 AM', lastActive: '12 mins ago', mfa: true, status: 'Active' },
  { id: 'SES-26-8815', user: 'Priya Menon', empId: 'EMP-0118', role: 'Legal Counsel', device: 'Safari 18 · macOS Sonoma', ip: '103.21.244.18', location: 'Bangalore, KA', loginTime: 'Today, 10:00 AM', lastActive: '25 mins ago', mfa: true, status: 'Active' },
  { id: 'SES-26-8816', user: 'Suresh Nair', empId: 'EMP-0045', role: 'Governance & CISO', device: 'Firefox 131 · Ubuntu Linux', ip: '103.24.112.4', location: 'Mumbai, MH', loginTime: 'Today, 07:45 AM', lastActive: '1 hr ago', mfa: true, status: 'Idle' },
  { id: 'SES-26-8817', user: 'Amit Jadhav', empId: 'EMP-0205', role: 'Treasury Analyst', device: 'Chrome 129 · Windows 11', ip: '103.24.112.4', location: 'Mumbai, MH', loginTime: 'Today, 11:15 AM', lastActive: '5 mins ago', mfa: true, status: 'Active' },
  { id: 'SES-26-8818', user: 'Meera Iyer', empId: 'EMP-0231', role: 'ATM Operations', device: 'Chrome 129 · Windows 11', ip: '103.24.112.4', location: 'Mumbai, MH', loginTime: 'Today, 08:50 AM', lastActive: '18 mins ago', mfa: true, status: 'Active' },
]

// ── Mock Data: Security Policies ───────────────────────────────────────────
const SECURITY_POLICIES = [
  { code: 'POL-SEC-01', name: 'Multi-Factor Authentication (MFA)', category: 'Authentication', level: 'Mandatory', audience: 'All Personnel', compliance: '100% Enforced', lastAudit: '2026-10-01', desc: 'TOTP hardware or authenticator app authentication required for every dashboard access.' },
  { code: 'POL-SEC-02', name: 'RBAC Segregation of Duties', category: 'Access Control', level: 'Mandatory', audience: 'Finance & Treasury', compliance: 'Compliant', lastAudit: '2026-09-15', desc: 'Dual authorization (Maker-Checker) strictly enforced for payouts, CBR reconciliations, and SD adjustments.' },
  { code: 'POL-SEC-03', name: 'Corporate VPN & IP Whitelisting', category: 'Network', level: 'Mandatory', audience: 'Super Admins', compliance: 'Enforced', lastAudit: '2026-10-10', desc: 'Direct administrative and database access is restricted exclusively to authorized Dexter subnet gateways.' },
  { code: 'POL-SEC-04', name: 'Session Idle Timeout Governance', category: 'Session Management', level: 'Strict', audience: 'All Sessions', compliance: '15 min Active', lastAudit: '2026-10-21', desc: 'Automatic token revocation and screen lock triggered after 15 minutes of zero input activity.' },
  { code: 'POL-SEC-05', name: 'Sensitive Data Masking & Watermarking', category: 'Data Protection', level: 'Mandatory', audience: 'Export & Viewers', compliance: 'Active', lastAudit: '2026-09-28', desc: 'Aadhaar, PAN, and bank account numbers masked to last 4 digits; CSV exports watermarked with requester ID.' },
  { code: 'POL-SEC-06', name: 'Password Lifecycle & Entropy Standard', category: 'Authentication', level: 'Strict', audience: 'All Accounts', compliance: 'Compliant', lastAudit: '2026-10-05', desc: 'Minimum 12 characters with alphanumeric and special symbols; mandatory 90-day rotation cadence.' },
]

// ── Mock Data: Regulatory Compliance ───────────────────────────────────────
const COMPLIANCE_CHECKLISTS = [
  { ref: 'RBI-WLA-01', standard: 'Daily CBR Reconciliation SLA', authority: 'RBI / NPCI', cadence: 'Daily', dueDate: '2026-10-22', score: '99.4%', status: 'Compliant', notes: 'Daily settlement data balanced against sponsor bank switch logs within 24 hours.' },
  { ref: 'RBI-WLA-02', standard: 'ATM CCTV & Physical Alarm 90-Day Retention', authority: 'RBI Security Cell', cadence: 'Continuous', dueDate: '2026-10-31', score: '98.8%', status: 'Compliant', notes: 'Continuous surveillance footage and panic trigger health checks transmitted to central NOC.' },
  { ref: 'RBI-WLA-03', standard: 'Quarterly Net Worth & Capital Adequacy', authority: 'RBI Department of Payment Systems', cadence: 'Quarterly', dueDate: '2026-11-15', score: '100%', status: 'Compliant', notes: 'Statutory auditor certified net worth certificate filed with regional RBI office.' },
  { ref: 'RBI-WLA-04', standard: 'Clean Note Policy & Fake Currency Reporting', authority: 'RBI Currency Mgmt', cadence: 'Monthly', dueDate: '2026-11-05', score: '100%', status: 'Compliant', notes: 'Note sorting and zero-counterfeit tolerance protocol followed during all CRA cash replenishment runs.' },
  { ref: 'RBI-WLA-05', standard: 'Customer Grievance Redressal (TAT ≤ 48h)', authority: 'Banking Ombudsman', cadence: 'Monthly', dueDate: '2026-10-31', score: '96.2%', status: 'In Review', notes: 'ATM transaction dispute resolution tracking; 96.2% closed within regulatory turnaround time.' },
  { ref: 'DPDP-2023', standard: 'Data Protection & Consent Architecture', authority: 'MeitY / Data Board', cadence: 'Annual', dueDate: '2026-12-01', score: '100%', status: 'Compliant', notes: 'Partner and applicant KYC biometric and identity consent logs securely stored in encrypted vault.' },
]

export default function GovernanceView({ section: propSection }: { section?: GovernanceSection }) {
  const { section: routeSection } = useParams<{ section?: string }>()
  const activeSection: GovernanceSection = propSection || (routeSection as GovernanceSection) || 'audit'
  const meta = SECTION_META[activeSection] || SECTION_META.audit

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [sessions, setSessions] = useState(INITIAL_SESSIONS)

  // ── Handlers ─────────────────────────────────────────────────────────────
  const terminateSession = (id: string, user: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
    toast(`Session ${id} for ${user} has been revoked successfully.`)
  }

  const exportCurrentData = () => {
    if (activeSection === 'audit') {
      downloadCsv(
        'governance-audit-trail',
        ['Event ID', 'Timestamp', 'Actor', 'Email', 'Action', 'Entity', 'Description', 'IP Address', 'Severity'],
        AUDIT_DATA.map((r) => [r.id, r.time, r.actor, r.email, r.action, r.entity, r.desc, r.ip, r.severity])
      )
    } else if (activeSection === 'sessions') {
      downloadCsv(
        'governance-active-sessions',
        ['Session ID', 'User', 'Employee ID', 'Role', 'Device', 'IP', 'Location', 'Login Time', 'Status'],
        sessions.map((r) => [r.id, r.user, r.empId, r.role, r.device, r.ip, r.location, r.loginTime, r.status])
      )
    } else if (activeSection === 'security') {
      downloadCsv(
        'governance-security-policies',
        ['Policy Code', 'Policy Name', 'Category', 'Enforcement Level', 'Audience', 'Compliance', 'Last Audit', 'Description'],
        SECURITY_POLICIES.map((r) => [r.code, r.name, r.category, r.level, r.audience, r.compliance, r.lastAudit, r.desc])
      )
    } else {
      downloadCsv(
        'governance-compliance-register',
        ['Reference ID', 'Standard', 'Authority', 'Cadence', 'Due Date', 'Score', 'Status', 'Notes'],
        COMPLIANCE_CHECKLISTS.map((r) => [r.ref, r.standard, r.authority, r.cadence, r.dueDate, r.score, r.status, r.notes])
      )
    }
    toast(`Exported ${meta.title} records to CSV`)
  }

  const { Icon } = meta

  return (
    <div className="max-w-[1040px] pb-12">
      {/* Back button */}
      <Link
        to="/governance"
        className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0066FF] hover:underline"
      >
        <ArrowLeft size={15} /> Back to Governance
      </Link>

      {/* Page Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className={`grid h-9 w-9 place-items-center rounded-lg border ${meta.color}`}>
              <Icon size={19} />
            </span>
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#1E293B]">
              {meta.title}
            </h1>
          </div>
          <p className="mt-1 text-[13px] text-[#64748B]">{meta.sub}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<Download size={15} />} onClick={exportCurrentData}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── 1. AUDIT VIEW ──────────────────────────────────────────────────── */}
      {activeSection === 'audit' && (
        <div className="space-y-4">
          {/* Stat Pills */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-muted uppercase tracking-wider">Total Events Logged</div>
              <div className="mt-1 text-2xl font-bold text-ink">1,428</div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">Successful Actions</div>
              <div className="mt-1 text-2xl font-bold text-emerald-600">1,412</div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">Policy Warnings</div>
              <div className="mt-1 text-2xl font-bold text-amber-600">14</div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-rose-600 uppercase tracking-wider">Security Alerts</div>
              <div className="mt-1 text-2xl font-bold text-rose-600">2</div>
            </div>
          </div>

          {/* Search Bar */}
          <Card className="p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search by actor, action, entity or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-[#0066FF] focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="h-9 rounded-lg border border-line bg-white px-3 text-[12.5px] font-medium text-ink outline-none focus:border-[#0066FF]"
                >
                  <option value="All">All Severities</option>
                  <option value="Info">Info Only</option>
                  <option value="Warning">Warning</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead className="border-b border-line bg-surface text-[11px] font-semibold text-muted uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Event ID</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Actor / User</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3 text-right">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {AUDIT_DATA.filter((r) => {
                    const q = search.toLowerCase()
                    const matchQ = !q || r.actor.toLowerCase().includes(q) || r.action.toLowerCase().includes(q) || r.entity.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q)
                    const matchF = filter === 'All' || r.severity === filter
                    return matchQ && matchF
                  }).map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-surface/50">
                      <td className="px-4 py-3 font-mono text-[11.5px] font-semibold text-[#0066FF]">{r.id}</td>
                      <td className="px-4 py-3 text-muted text-[11.5px] whitespace-nowrap">{r.time}</td>
                      <td className="px-4 py-3 font-medium text-ink">
                        {r.actor}
                        <span className="block text-[10.5px] text-muted font-normal">{r.email}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#334155]">{r.action}</td>
                      <td className="px-4 py-3 font-semibold text-ink text-[11.5px]">{r.entity}</td>
                      <td className="px-4 py-3 text-muted max-w-[260px] truncate" title={r.desc}>{r.desc}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted">{r.ip}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge tone={r.severity === 'Info' ? 'blue' : r.severity === 'Warning' ? 'amber' : 'red'}>
                          {r.severity}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. SESSIONS VIEW ───────────────────────────────────────────────── */}
      {activeSection === 'sessions' && (
        <div className="space-y-4">
          {/* Stat Pills */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-muted uppercase tracking-wider">Active Sessions</div>
              <div className="mt-1 text-2xl font-bold text-ink">{sessions.length}</div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-purple-600 uppercase tracking-wider">MFA Compliance</div>
              <div className="mt-1 text-2xl font-bold text-purple-600">100%</div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">Trusted Locations</div>
              <div className="mt-1 text-2xl font-bold text-emerald-600">3 Regions</div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-blue-600 uppercase tracking-wider">Max Session Limit</div>
              <div className="mt-1 text-2xl font-bold text-blue-600">15 min idle</div>
            </div>
          </div>

          {/* Search Bar */}
          <Card className="p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search user, employee ID, role or IP address..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-[#0066FF] focus:bg-white"
                />
              </div>

              <span className="text-[12px] font-medium text-muted">
                {sessions.length} sessions online
              </span>
            </div>
          </Card>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead className="border-b border-line bg-surface text-[11px] font-semibold text-muted uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Session ID</th>
                    <th className="px-4 py-3">Personnel / Role</th>
                    <th className="px-4 py-3">Device & Browser</th>
                    <th className="px-4 py-3">IP / Location</th>
                    <th className="px-4 py-3">Sign-in Time</th>
                    <th className="px-4 py-3">Last Active</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {sessions.filter((s) => {
                    const q = search.toLowerCase()
                    return !q || s.user.toLowerCase().includes(q) || s.empId.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || s.ip.includes(q)
                  }).map((s) => (
                    <tr key={s.id} className="transition-colors hover:bg-surface/50">
                      <td className="px-4 py-3 font-mono text-[11.5px] font-semibold text-purple-700">{s.id}</td>
                      <td className="px-4 py-3 font-medium text-ink">
                        {s.user}
                        <span className="block text-[10.5px] text-muted font-normal">{s.empId} · {s.role}</span>
                      </td>
                      <td className="px-4 py-3 text-ink text-[12px]">{s.device}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11.5px] text-[#334155]">{s.ip}</span>
                        <span className="block text-[10.5px] text-muted">{s.location}</span>
                      </td>
                      <td className="px-4 py-3 text-muted text-[11.5px]">{s.loginTime}</td>
                      <td className="px-4 py-3 text-muted text-[11.5px] font-medium">{s.lastActive}</td>
                      <td className="px-4 py-3">
                        <Badge tone={s.status === 'Active' ? 'green' : 'amber'}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<Power size={13} />}
                          onClick={() => terminateSession(s.id, s.user)}
                        >
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted">
                        No active sessions matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. SECURITY VIEW ───────────────────────────────────────────────── */}
      {activeSection === 'security' && (
        <div className="space-y-4">
          {/* Stat Pills */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-muted uppercase tracking-wider">Active Security Policies</div>
              <div className="mt-1 text-2xl font-bold text-ink">6 Enforced</div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">Compliance Index</div>
              <div className="mt-1 text-2xl font-bold text-emerald-600">100% Pass</div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-blue-600 uppercase tracking-wider">Dual Authorization</div>
              <div className="mt-1 text-2xl font-bold text-blue-600">Maker-Checker</div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-purple-600 uppercase tracking-wider">Next Audit Due</div>
              <div className="mt-1 text-2xl font-bold text-purple-600">15 Nov 2026</div>
            </div>
          </div>

          {/* Policy Cards Grid */}
          <div className="grid gap-3.5 sm:grid-cols-2">
            {SECURITY_POLICIES.map((p) => (
              <div
                key={p.code}
                className="rounded-xl border border-line bg-white p-4 shadow-xs transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold text-[#0066FF]">{p.code}</span>
                  <Badge tone={p.level === 'Mandatory' ? 'blue' : 'green'}>{p.level}</Badge>
                </div>
                <h3 className="mt-1.5 text-[14.5px] font-bold text-ink">{p.name}</h3>
                <p className="mt-1 text-[12px] text-muted leading-relaxed">{p.desc}</p>
                <div className="mt-3.5 pt-2.5 border-t border-line-soft flex items-center justify-between text-[11px] text-muted">
                  <span>Scope: <strong className="text-ink font-medium">{p.audience}</strong></span>
                  <span className="font-semibold text-emerald-600">✓ {p.compliance}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. COMPLIANCE VIEW ─────────────────────────────────────────────── */}
      {activeSection === 'compliance' && (
        <div className="space-y-4">
          {/* Stat Pills */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-muted uppercase tracking-wider">Statutory Checklists</div>
              <div className="mt-1 text-2xl font-bold text-ink">{COMPLIANCE_CHECKLISTS.length} Controls</div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">Compliant Standards</div>
              <div className="mt-1 text-2xl font-bold text-emerald-600">5 / 6</div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">Under Periodic Review</div>
              <div className="mt-1 text-2xl font-bold text-amber-600">1 Item</div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-medium text-rose-600 uppercase tracking-wider">Critical Breaches</div>
              <div className="mt-1 text-2xl font-bold text-rose-600">0</div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead className="border-b border-line bg-surface text-[11px] font-semibold text-muted uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Control Reference</th>
                    <th className="px-4 py-3">Standard / Requirement</th>
                    <th className="px-4 py-3">Regulatory Body</th>
                    <th className="px-4 py-3">Cadence</th>
                    <th className="px-4 py-3">Next Due Date</th>
                    <th className="px-4 py-3">Audit Score</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {COMPLIANCE_CHECKLISTS.map((c) => (
                    <tr key={c.ref} className="transition-colors hover:bg-surface/50">
                      <td className="px-4 py-3 font-mono text-[11.5px] font-semibold text-rose-700">{c.ref}</td>
                      <td className="px-4 py-3 font-medium text-ink">
                        {c.standard}
                        <span className="block text-[11px] text-muted font-normal max-w-[320px]">{c.notes}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#334155]">{c.authority}</td>
                      <td className="px-4 py-3 text-muted text-[11.5px]">{c.cadence}</td>
                      <td className="px-4 py-3 text-muted text-[11.5px] whitespace-nowrap">{c.dueDate}</td>
                      <td className="px-4 py-3 font-semibold text-ink">{c.score}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge tone={c.status === 'Compliant' ? 'green' : 'amber'}>
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
