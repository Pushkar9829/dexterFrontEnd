// DPDP Act 2023 + DPDP Rules 2025 compliance — mock model for consent, notices, grievances,
// breaches, data-principal rights, retention / deletion and vendors. Persisted in localStorage
// until the backend exists. Every mutation is also written to the security audit trail.
import { createStore } from '@/lib/store'
import { get, patch, post, put } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { apiEnabled, createLoader, fetchAll, toastError } from '@/data/bizApi'
import { logSecurity } from './security'

const iso = () => new Date().toISOString()
const DAY = 86_400_000
const HOUR = 3_600_000
export const addDays = (at: string, d: number) => new Date(new Date(at).getTime() + d * DAY).toISOString()

// ── Settings: contact + configurable legal timelines ─────────────────────
export type Priority = 'High' | 'Medium' | 'Low'
export type PrivacySettings = {
  dpo: { name: string; designation: string; email: string; phone: string; address: string }
  grievanceSlaDays: Record<Priority, number>
  escalationAuthority: string
  rightsSlaDays: number
  breachDetailedReportHours: number // DPDP Rules 2025, Rule 7 — 72 h unless the Board allows more
  breachAlertRecipients: string[]
  updatedAt: string
  updatedBy: string
}

// ── Consent & notices ────────────────────────────────────────────────────
export type LegalBasis = 'Consent' | 'Legitimate use — employment' | 'Legitimate use — legal obligation' | 'Legitimate use — voluntarily provided'
export type ConsentChannel = 'Mobile App' | 'Web Portal' | 'Paper form' | 'Email'
export type ConsentRecord = {
  id: string
  principal: string
  principalRef: string // account id / franchise code
  contact: string
  principalType: 'Employee' | 'Franchisee' | 'Applicant' | 'Customer'
  purpose: string
  legalBasis: LegalBasis
  givenOn: string
  channel: ConsentChannel
  noticeVersion: string
  status: 'Active' | 'Withdrawn' | 'Expired'
  withdrawnOn?: string
}
export type ConsentEvent = { id: string; consentId: string; principal: string; principalRef: string; at: string; action: 'Given' | 'Withdrawn' | 'Renewed'; purpose: string; channel: string; by: string; note?: string }
export type PrivacyNotice = { id: string; version: string; title: string; language: string; publishedOn?: string; status: 'Draft' | 'Published' | 'Superseded'; summary: string; updatedBy: string }

// ── Grievances (18 parameters) ───────────────────────────────────────────
export const GRIEVANCE_CATEGORIES = ['Consent', 'Data Leak', 'Unauthorized Access', 'Data Correction', 'Data Deletion', 'Other'] as const
export type GrievanceCategory = (typeof GRIEVANCE_CATEGORIES)[number]
export const GRIEVANCE_STATUSES = ['Open', 'Under Review', 'In Progress', 'Resolved', 'Closed'] as const
export type GrievanceStatus = (typeof GRIEVANCE_STATUSES)[number]
export const DEPARTMENTS = ['IT Department', 'Admin Department', 'HR Department', 'Finance Department', 'Operations Department', 'Legal Department', 'Management', 'Customer Support'] as const
export type Attachment = { name: string; size: number }
export type HistoryEntry = { at: string; actor: string; action: string; detail?: string }
export type CommEntry = { at: string; channel: 'Email' | 'SMS' | 'In-app' | 'Phone'; message: string; by: string }
export type Grievance = {
  id: string
  draft: boolean
  createdAt: string
  complainant: { name: string; mobile: string; email: string; ref?: string }
  verification: { method: '' | 'Registered account' | 'Email OTP' | 'Mobile OTP' | 'ID document'; verified: boolean; verifiedAt?: string; by?: string }
  category: GrievanceCategory | ''
  subject: string
  description: string
  evidence: Attachment[]
  acknowledgedAt?: string
  department: string
  officer: string
  priority: Priority
  status: GrievanceStatus
  slaDays: number
  dueAt: string
  escalated: boolean
  escalatedAt?: string
  escalatedTo?: string
  resolutionRemarks?: string
  closure?: { details: string; at: string; by: string; userInformed: boolean }
  reopenCount: number
  communications: CommEntry[]
  history: HistoryEntry[]
  source: 'Admin portal' | 'Self-service' | 'Mobile App'
}

// ── Breaches / security incidents ────────────────────────────────────────
export const BREACH_SOURCES = ['Security alert', 'Monitoring tool', 'User complaint', 'Employee report', 'Vendor notice', 'Internal audit', 'Other'] as const
export const DATA_TYPES = ['Name & contact', 'Mobile number', 'Email', 'Aadhaar / PAN', 'Bank account', 'Financial records', 'Location', 'Login credentials', 'Documents (KYC)', 'Employee records'] as const
export type BreachSeverity = 'Critical' | 'High' | 'Medium' | 'Low'
export type BreachStatus = 'Open' | 'Contained' | 'Under Investigation' | 'Closed'
export type Breach = {
  id: string
  draft: boolean
  title: string
  detectedAt: string
  reportedAt: string
  source: string
  description: string
  severity: BreachSeverity
  dataTypes: string[]
  systems: string
  status: BreachStatus
  alert?: { at: string; recipients: string[]; by: string }
  accessBlocks: { at: string; kind: 'Account' | 'API' | 'System'; target: string; by: string }[]
  evidence: { at: string; item: string; location: string; by: string }[]
  rootCause?: string
  securityGap?: string
  affectedUsers: { name: string; contact: string; dataTypes: string }[]
  userNotification?: { at: string; channel: string; count: number; message: string; by: string }
  boardInitial?: { at: string; ref: string; by: string }
  boardDetailed?: { at: string; ref: string; by: string }
  boardExtension?: { until: string; letterRef: string }
  correctiveActions: { id: string; action: string; owner: string; due: string; done: boolean }[]
  closure?: { at: string; by: string; summary: string }
  history: HistoryEntry[]
}

// ── Data-principal rights ────────────────────────────────────────────────
export const RIGHT_TYPES = ['Access', 'Correction', 'Erasure', 'Grievance redressal', 'Withdraw consent', 'Nominate'] as const
export type RightType = (typeof RIGHT_TYPES)[number]
export type RightsStatus = 'Submitted' | 'Identity Verification' | 'In Progress' | 'Completed' | 'Rejected'
export type RightsRequest = {
  id: string
  createdAt: string
  principal: string
  principalRef: string
  contact: string
  type: RightType
  details: string
  nominee?: { name: string; relation: string; contact: string }
  status: RightsStatus
  dueAt: string
  response?: string
  closedAt?: string
  history: HistoryEntry[]
  source: 'Admin portal' | 'Self-service' | 'Mobile App'
}

// ── Retention & deletion ─────────────────────────────────────────────────
export type RetentionPolicy = { id: string; category: string; purpose: string; legalBasis: string; periodMonths: number; afterExpiry: 'Secure delete' | 'Anonymise' | 'Archive (encrypted)' | 'Review'; owner: string }
export type DeletionItem = {
  id: string
  category: string
  recordRef: string
  principal: string
  collectedOn: string
  expiresOn: string
  status: 'Due' | 'Approved' | 'Deleted' | 'Legal Hold'
  approvedBy?: string
  approvedAt?: string
  deletedAt?: string
  deletedBy?: string
  certificate?: string
  hold?: { reason: string; by: string; at: string }
}

// ── Vendors ──────────────────────────────────────────────────────────────
export type Vendor = {
  id: string
  name: string
  service: 'Cloud' | 'Hosting' | 'SMS Gateway' | 'Email' | 'Payment' | 'Analytics' | 'Backup / DR' | 'Other'
  dataShared: string
  location: string
  dpaStatus: 'Signed' | 'Pending' | 'Expired' | 'Not required'
  dpaSignedOn?: string
  dpaExpiry?: string
  lastReview?: string
  contact: string
  notes?: string
}

export type PrivacyState = {
  settings: PrivacySettings
  consents: ConsentRecord[]
  consentEvents: ConsentEvent[]
  notices: PrivacyNotice[]
  grievances: Grievance[]
  breaches: Breach[]
  rights: RightsRequest[]
  retention: RetentionPolicy[]
  deletion: DeletionItem[]
  vendors: Vendor[]
}

function seed(): PrivacyState {
  const settings: PrivacySettings = {
    dpo: { name: 'Kavita Rao', designation: 'Data Protection Officer (Legal & Audit)', email: 'dpo@dexterindia.com', phone: '9833344455', address: 'Dexter India Pvt. Ltd., Sector 63, Noida, Uttar Pradesh' },
    grievanceSlaDays: { High: 3, Medium: 7, Low: 15 },
    escalationAuthority: 'Director — Legal & Compliance',
    rightsSlaDays: 30,
    breachDetailedReportHours: 72,
    breachAlertRecipients: ['security@dexterindia.com', 'dpo@dexterindia.com', 'parasdubey@gmail.com'],
    updatedAt: '2026-11-19T10:00:00.000Z',
    updatedBy: 'System default',
  }
  const C = (id: string, principal: string, principalRef: string, contact: string, principalType: ConsentRecord['principalType'], purpose: string, legalBasis: LegalBasis, givenOn: string, channel: ConsentChannel, status: ConsentRecord['status'] = 'Active', withdrawnOn?: string): ConsentRecord => ({
    id, principal, principalRef, contact, principalType, purpose, legalBasis, givenOn, channel, noticeVersion: 'v1.2', status, withdrawnOn,
  })
  const consents: ConsentRecord[] = [
    C('CNS-1001', 'Ranjeet Pal', 'USR-009', 'ranjeetpal@gmail.com', 'Franchisee', 'Franchise onboarding & KYC verification', 'Consent', '2026-09-12T10:05:00.000Z', 'Mobile App'),
    C('CNS-1002', 'Ranjeet Pal', 'USR-009', 'ranjeetpal@gmail.com', 'Franchisee', 'Location tracking during site visits', 'Consent', '2026-09-12T10:06:00.000Z', 'Mobile App', 'Withdrawn', '2026-11-02T09:00:00.000Z'),
    C('CNS-1003', 'Ranjeet Pal', 'USR-009', 'ranjeetpal@gmail.com', 'Franchisee', 'Marketing & promotional messages', 'Consent', '2026-09-12T10:06:30.000Z', 'Mobile App'),
    C('CNS-1004', 'Manoj Kumar', 'USR-010', 'manoj.kumar@dexterindia.in', 'Employee', 'Payroll & HR administration', 'Legitimate use — employment', '2026-08-02T10:00:00.000Z', 'Paper form'),
    C('CNS-1005', 'Manoj Kumar', 'USR-010', 'manoj.kumar@dexterindia.in', 'Employee', 'Location tracking during field duty', 'Consent', '2026-08-02T10:10:00.000Z', 'Mobile App'),
    C('CNS-1006', 'Sunita Devi', 'APP-2231', '9811200456', 'Applicant', 'Franchise application processing', 'Consent', '2026-10-28T12:30:00.000Z', 'Web Portal'),
    C('CNS-1007', 'Paras Dubey', 'USR-001', 'parasdubey@gmail.com', 'Employee', 'Payroll & HR administration', 'Legitimate use — employment', '2026-01-05T09:00:00.000Z', 'Paper form'),
    C('CNS-1008', 'Alok Mishra', 'APP-2190', 'alok.m@gmail.com', 'Applicant', 'Franchise application processing', 'Consent', '2025-10-01T09:00:00.000Z', 'Web Portal', 'Expired'),
  ]
  const consentEvents: ConsentEvent[] = consents.flatMap((c) => {
    const ev: ConsentEvent[] = [{ id: `CEV-${c.id.slice(4)}-1`, consentId: c.id, principal: c.principal, principalRef: c.principalRef, at: c.givenOn, action: 'Given', purpose: c.purpose, channel: c.channel, by: c.principal }]
    if (c.withdrawnOn) ev.push({ id: `CEV-${c.id.slice(4)}-2`, consentId: c.id, principal: c.principal, principalRef: c.principalRef, at: c.withdrawnOn, action: 'Withdrawn', purpose: c.purpose, channel: 'Mobile App', by: c.principal })
    return ev
  })
  const notices: PrivacyNotice[] = [
    { id: 'NTC-01', version: 'v1.0', title: 'Privacy Notice — Franchise & Employees', language: 'English + Hindi', publishedOn: '2026-01-10T00:00:00.000Z', status: 'Superseded', summary: 'Initial notice.', updatedBy: 'Kavita Rao' },
    { id: 'NTC-02', version: 'v1.2', title: 'Privacy Notice — Franchise & Employees', language: 'English + Hindi', publishedOn: '2026-08-01T00:00:00.000Z', status: 'Published', summary: 'Itemised purposes, withdrawal process, grievance contact and Board complaint route (DPDP Rules 2025, Rule 3).', updatedBy: 'Kavita Rao' },
    { id: 'NTC-03', version: 'v1.3', title: 'Privacy Notice — Franchise & Employees', language: 'English + Hindi', status: 'Draft', summary: 'Adds location tracking and vendor list.', updatedBy: 'Kavita Rao' },
  ]
  const H = (at: string, actor: string, action: string, detail?: string): HistoryEntry => ({ at, actor, action, detail })
  const sla = settings.grievanceSlaDays
  const grievances: Grievance[] = [
    {
      id: 'DPG-2026-0001', draft: false, createdAt: '2026-11-05T09:30:00.000Z', source: 'Mobile App',
      complainant: { name: 'Ranjeet Pal', mobile: '8126817131', email: 'ranjeetpal@gmail.com', ref: 'USR-009' },
      verification: { method: 'Registered account', verified: true, verifiedAt: '2026-11-05T09:30:00.000Z', by: 'System' },
      category: 'Consent', subject: 'Location still tracked after withdrawal', description: 'I withdrew location-tracking consent on 2 Nov but the app still asks for location in the background.',
      evidence: [{ name: 'screenshot-location.png', size: 182_000 }], acknowledgedAt: '2026-11-05T09:30:00.000Z',
      department: 'IT Department', officer: 'Vikram Mehta', priority: 'High', status: 'Resolved', slaDays: sla.High, dueAt: addDays('2026-11-05T09:30:00.000Z', sla.High),
      escalated: false, resolutionRemarks: 'Background location permission removed in app 2.4.1; consent check added before every location read.', reopenCount: 0,
      communications: [
        { at: '2026-11-05T09:30:00.000Z', channel: 'In-app', message: 'Complaint DPG-2026-0001 received. We will respond within 3 days.', by: 'System' },
        { at: '2026-11-07T15:00:00.000Z', channel: 'Email', message: 'Fix released in app 2.4.1 — please update.', by: 'Vikram Mehta' },
      ],
      history: [H('2026-11-05T09:30:00.000Z', 'Ranjeet Pal', 'Registered', 'Via mobile app'), H('2026-11-05T09:31:00.000Z', 'System', 'Acknowledged'), H('2026-11-05T11:00:00.000Z', 'Kavita Rao', 'Assigned', 'IT Department → Vikram Mehta'), H('2026-11-07T15:00:00.000Z', 'Vikram Mehta', 'Status → Resolved')],
    },
    {
      id: 'DPG-2026-0002', draft: false, createdAt: '2026-11-12T11:00:00.000Z', source: 'Admin portal',
      complainant: { name: 'Sunita Devi', mobile: '9811200456', email: 'sunita.devi@gmail.com', ref: 'APP-2231' },
      verification: { method: 'Mobile OTP', verified: true, verifiedAt: '2026-11-12T11:02:00.000Z', by: 'Meera Iyer' },
      category: 'Data Correction', subject: 'Wrong PAN on application', description: 'My PAN number is captured wrongly on the franchise application.',
      evidence: [{ name: 'pan-card.pdf', size: 240_000 }], acknowledgedAt: '2026-11-12T11:03:00.000Z',
      department: 'Operations Department', officer: 'Vikram Mehta', priority: 'Medium', status: 'In Progress', slaDays: sla.Medium, dueAt: addDays('2026-11-12T11:00:00.000Z', sla.Medium),
      escalated: false, reopenCount: 0,
      communications: [{ at: '2026-11-12T11:03:00.000Z', channel: 'SMS', message: 'Complaint DPG-2026-0002 registered.', by: 'System' }],
      history: [H('2026-11-12T11:00:00.000Z', 'Meera Iyer', 'Registered', 'On behalf of complainant (phone call)'), H('2026-11-12T11:02:00.000Z', 'Meera Iyer', 'Identity verified', 'Mobile OTP'), H('2026-11-12T11:03:00.000Z', 'System', 'Acknowledged'), H('2026-11-13T10:00:00.000Z', 'Vikram Mehta', 'Status → In Progress')],
    },
    {
      id: 'DPG-2026-0003', draft: false, createdAt: '2026-11-18T08:00:00.000Z', source: 'Self-service',
      complainant: { name: 'Manoj Kumar', mobile: '9877788899', email: 'manoj.kumar@dexterindia.in', ref: 'USR-010' },
      verification: { method: 'Registered account', verified: true, verifiedAt: '2026-11-18T08:00:00.000Z', by: 'System' },
      category: 'Unauthorized Access', subject: 'Someone viewed my salary slip', description: 'A colleague mentioned my salary details; I suspect unauthorised access to payroll.',
      evidence: [], acknowledgedAt: '2026-11-18T08:00:00.000Z',
      department: 'HR Department', officer: 'Priya Nair', priority: 'High', status: 'Under Review', slaDays: sla.High, dueAt: addDays('2026-11-18T08:00:00.000Z', sla.High),
      escalated: false, reopenCount: 0,
      communications: [{ at: '2026-11-18T08:00:00.000Z', channel: 'In-app', message: 'Complaint DPG-2026-0003 received.', by: 'System' }],
      history: [H('2026-11-18T08:00:00.000Z', 'Manoj Kumar', 'Registered', 'Self-service'), H('2026-11-18T08:00:00.000Z', 'System', 'Acknowledged'), H('2026-11-18T12:00:00.000Z', 'Kavita Rao', 'Assigned', 'HR Department → Priya Nair')],
    },
  ]
  const breaches: Breach[] = [
    {
      id: 'INC-2026-0001', draft: false, title: 'Brute-force attempt on Sub-Admin account', detectedAt: '2026-11-22T17:42:00.000Z', reportedAt: '2026-11-22T18:00:00.000Z', source: 'Security alert',
      description: '5 failed logins from 182.68.4.90 in 2 minutes against USR-007; account auto-locked. Checking whether any data was accessed.', severity: 'Medium', dataTypes: ['Login credentials'], systems: 'Web portal auth',
      status: 'Under Investigation', alert: { at: '2026-11-22T18:00:00.000Z', recipients: settings.breachAlertRecipients, by: 'System' },
      accessBlocks: [{ at: '2026-11-22T18:05:00.000Z', kind: 'Account', target: 'USR-007 (Arjun Sethi)', by: 'Paras Dubey' }],
      evidence: [{ at: '2026-11-22T18:10:00.000Z', item: 'Auth server logs 17:30–18:00 IST', location: 'Encrypted evidence vault / INC-2026-0001', by: 'Paras Dubey' }],
      affectedUsers: [], correctiveActions: [],
      history: [H('2026-11-22T18:00:00.000Z', 'Paras Dubey', 'Incident registered', 'From alert ALT-301'), H('2026-11-22T18:00:00.000Z', 'System', 'Immediate alert sent')],
    },
  ]
  const rights: RightsRequest[] = [
    { id: 'DSR-2026-0001', createdAt: '2026-11-02T09:00:00.000Z', principal: 'Ranjeet Pal', principalRef: 'USR-009', contact: 'ranjeetpal@gmail.com', type: 'Withdraw consent', details: 'Withdraw location tracking consent.', status: 'Completed', dueAt: addDays('2026-11-02T09:00:00.000Z', 30), response: 'Consent CNS-1002 withdrawn; processing stopped.', closedAt: '2026-11-02T09:05:00.000Z', source: 'Mobile App', history: [H('2026-11-02T09:00:00.000Z', 'Ranjeet Pal', 'Submitted'), H('2026-11-02T09:05:00.000Z', 'System', 'Completed')] },
    { id: 'DSR-2026-0002', createdAt: '2026-11-15T10:00:00.000Z', principal: 'Manoj Kumar', principalRef: 'USR-010', contact: 'manoj.kumar@dexterindia.in', type: 'Access', details: 'Copy of all personal data held about me.', status: 'In Progress', dueAt: addDays('2026-11-15T10:00:00.000Z', 30), source: 'Self-service', history: [H('2026-11-15T10:00:00.000Z', 'Manoj Kumar', 'Submitted'), H('2026-11-16T10:00:00.000Z', 'Kavita Rao', 'Status → In Progress')] },
    { id: 'DSR-2026-0003', createdAt: '2026-11-20T14:00:00.000Z', principal: 'Alok Mishra', principalRef: 'APP-2190', contact: 'alok.m@gmail.com', type: 'Erasure', details: 'Application was rejected; please delete my documents.', status: 'Identity Verification', dueAt: addDays('2026-11-20T14:00:00.000Z', 30), source: 'Admin portal', history: [H('2026-11-20T14:00:00.000Z', 'Meera Iyer', 'Submitted', 'Received by email')] },
  ]
  const retention: RetentionPolicy[] = [
    { id: 'RET-01', category: 'Franchise KYC documents', purpose: 'Onboarding, RBI WLA due diligence', legalBasis: 'RBI KYC Master Direction / PMLA — 5 years after relationship ends', periodMonths: 60, afterExpiry: 'Secure delete', owner: 'Operations Department' },
    { id: 'RET-02', category: 'Rejected franchise applications', purpose: 'Application processing', legalBasis: 'Consent — purpose served on rejection', periodMonths: 6, afterExpiry: 'Secure delete', owner: 'Operations Department' },
    { id: 'RET-03', category: 'Employee personnel files', purpose: 'Employment, payroll, statutory filings', legalBasis: 'Labour codes / Income-tax — 8 years', periodMonths: 96, afterExpiry: 'Archive (encrypted)', owner: 'HR Department' },
    { id: 'RET-04', category: 'Bank & payment records', purpose: 'Settlement, accounting', legalBasis: 'Companies Act s.128 — 8 years', periodMonths: 96, afterExpiry: 'Archive (encrypted)', owner: 'Finance Department' },
    { id: 'RET-05', category: 'Location tracking data', purpose: 'Field duty verification', legalBasis: 'Consent', periodMonths: 3, afterExpiry: 'Secure delete', owner: 'IT Department' },
    { id: 'RET-06', category: 'Security & audit logs', purpose: 'Security monitoring, investigations', legalBasis: 'DPDP Rules 2025 — minimum 1 year; company policy 7 years', periodMonths: 84, afterExpiry: 'Review', owner: 'IT Department' },
    { id: 'RET-07', category: 'Marketing preferences', purpose: 'Promotional messages', legalBasis: 'Consent — until withdrawn', periodMonths: 24, afterExpiry: 'Anonymise', owner: 'Customer Support' },
  ]
  const deletion: DeletionItem[] = [
    { id: 'DEL-0101', category: 'Rejected franchise applications', recordRef: 'APP-2190', principal: 'Alok Mishra', collectedOn: '2025-10-01T09:00:00.000Z', expiresOn: '2026-04-01T09:00:00.000Z', status: 'Due' },
    { id: 'DEL-0102', category: 'Location tracking data', recordRef: 'LOC-USR-009-2026Q3', principal: 'Ranjeet Pal', collectedOn: '2026-08-01T00:00:00.000Z', expiresOn: '2026-11-01T00:00:00.000Z', status: 'Due' },
    { id: 'DEL-0103', category: 'Rejected franchise applications', recordRef: 'APP-2102', principal: 'Harish Chandra', collectedOn: '2025-09-10T09:00:00.000Z', expiresOn: '2026-03-10T09:00:00.000Z', status: 'Legal Hold', hold: { reason: 'Pending consumer court case CC/114/2026', by: 'Kavita Rao', at: '2026-03-08T09:00:00.000Z' } },
    { id: 'DEL-0104', category: 'Location tracking data', recordRef: 'LOC-USR-010-2026Q2', principal: 'Manoj Kumar', collectedOn: '2026-05-01T00:00:00.000Z', expiresOn: '2026-08-01T00:00:00.000Z', status: 'Deleted', approvedBy: 'Kavita Rao', approvedAt: '2026-08-02T10:00:00.000Z', deletedAt: '2026-08-02T11:00:00.000Z', deletedBy: 'Paras Dubey', certificate: 'DC-2026-0042' },
  ]
  const vendors: Vendor[] = [
    { id: 'VND-01', name: 'Amazon Web Services (Mumbai)', service: 'Cloud', dataShared: 'All ERP data (encrypted at rest)', location: 'India (ap-south-1)', dpaStatus: 'Signed', dpaSignedOn: '2026-01-15T00:00:00.000Z', dpaExpiry: '2027-01-14T00:00:00.000Z', lastReview: '2026-07-01T00:00:00.000Z', contact: 'aws-account-team@amazon.com' },
    { id: 'VND-02', name: 'MongoDB Atlas', service: 'Hosting', dataShared: 'Application database', location: 'India (Mumbai)', dpaStatus: 'Signed', dpaSignedOn: '2026-01-20T00:00:00.000Z', dpaExpiry: '2027-01-19T00:00:00.000Z', lastReview: '2026-07-01T00:00:00.000Z', contact: 'privacy@mongodb.com' },
    { id: 'VND-03', name: 'SMS gateway (to be selected)', service: 'SMS Gateway', dataShared: 'Mobile number, OTP text', location: 'India', dpaStatus: 'Pending', contact: '—', notes: 'SMS OTP stays off until the API + DPA are in place.' },
    { id: 'VND-04', name: 'Transactional email provider', service: 'Email', dataShared: 'Email address, name, OTP / notifications', location: 'India / USA', dpaStatus: 'Pending', contact: '—' },
    { id: 'VND-05', name: 'Offsite backup provider', service: 'Backup / DR', dataShared: 'Encrypted backups', location: 'India (Hyderabad)', dpaStatus: 'Expired', dpaSignedOn: '2025-06-01T00:00:00.000Z', dpaExpiry: '2026-05-31T00:00:00.000Z', lastReview: '2025-06-01T00:00:00.000Z', contact: 'dr-support@example.in' },
  ]
  return { settings, consents, consentEvents, notices, grievances, breaches, rights, retention, deletion, vendors }
}

// API mode keeps its own cache key; the seed is only a placeholder until GET /privacy/* hydrates it.
const _privacyStore = createStore<PrivacyState>(apiEnabled ? 'dexter.privacy.api.v1' : 'dexter.privacy.v1', seed)

// ── backend adapter (API mode): /privacy (officers) and /privacy/my (self-service) ──
// Backend documents mirror these types; only the id field differs (consentId, grievanceId, …).
type Doc = Record<string, unknown>
const withId = <T,>(idKey: string) => (d: Doc): T => ({ ...d, id: String(d[idKey]) }) as T
const isOfficer = () => ['Super Admin', 'Admin', 'Legal Team'].includes(getSession()?.role ?? '')
const items = async (path: string) => (await get<{ items: Doc[] }>(path)).items
const all = (path: string) => fetchAll<Doc>(path)
const mapBreach = (d: Doc): Breach => ({ ...withId<Breach>('breachId')(d), correctiveActions: ((d.correctiveActions as Doc[]) ?? []).map((a) => ({ ...(a as object), id: String(a.actionId) }) as Breach['correctiveActions'][number]) })

export const privacyLoader = createLoader('DPDP registers', async () => {
  if (!isOfficer()) {
    // non-officers only see their own rows (and register grievances / breaches through the forms);
    // franchisees cannot read /privacy/settings or /notices (self-service only) — DPO comes from /privacy/my
    const [my, settings, notices] = await Promise.all([
      get<{ dpo: PrivacySettings['dpo']; consents: Doc[]; rights: Doc[]; grievances: Doc[] }>('/privacy/my'),
      get<PrivacySettings>('/privacy/settings').catch(() => null),
      items('/privacy/notices').catch(() => [] as Doc[]),
    ])
    _privacyStore.set((s) => ({
      ...s,
      settings: settings ?? { ...s.settings, dpo: my.dpo },
      notices: notices.map(withId<PrivacyNotice>('noticeId')),
      consents: my.consents.map(withId<ConsentRecord>('consentId')),
      rights: my.rights.map((r) => ({ history: [], ...r }) as Doc).map(withId<RightsRequest>('requestId')),
      grievances: my.grievances.map((g) => ({ history: [], communications: [], ...g }) as Doc).map(withId<Grievance>('grievanceId')),
      consentEvents: [],
      breaches: [],
      retention: [],
      deletion: [],
      vendors: [],
    }))
    return
  }
  const [settings, notices] = await Promise.all([get<PrivacySettings>('/privacy/settings'), items('/privacy/notices')])
  const [consents, consentEvents, grievances, drafts, breaches, rights, retention, deletion, vendors] = await Promise.all([
    all('/privacy/consents'),
    all('/privacy/consents/events'),
    all('/privacy/grievances'),
    fetchAll<Doc>('/privacy/grievances', { draft: 'true' }),
    all('/privacy/breaches'),
    all('/privacy/rights'),
    items('/privacy/retention'),
    items('/privacy/deletion'),
    items('/privacy/vendors'),
  ])
  _privacyStore.set({
    settings,
    notices: notices.map(withId<PrivacyNotice>('noticeId')),
    consents: consents.map(withId<ConsentRecord>('consentId')),
    consentEvents: consentEvents.map(withId<ConsentEvent>('eventId')),
    grievances: [...grievances, ...drafts].map(withId<Grievance>('grievanceId')),
    breaches: breaches.map(mapBreach),
    rights: rights.map(withId<RightsRequest>('requestId')),
    retention: retention.map(withId<RetentionPolicy>('policyId')),
    deletion: deletion.map(withId<DeletionItem>('itemId')),
    vendors: vendors.map(withId<Vendor>('vendorId')),
  })
})

const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b)
const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]))
const isSelf = (source?: string) => source === 'Self-service' || source === 'Mobile App'
const day = (s?: string) => (s ? s.slice(0, 10) : undefined)

/** Translate one store transition into backend calls (in order). */
function callsFor(prev: PrivacyState, next: PrivacyState): (() => Promise<unknown>)[] {
  const calls: (() => Promise<unknown>)[] = []
  if (changed(prev.settings, next.settings)) {
    const { dpo, grievanceSlaDays, escalationAuthority, rightsSlaDays, breachDetailedReportHours, breachAlertRecipients } = next.settings
    calls.push(() => patch('/privacy/settings', { dpo, grievanceSlaDays, escalationAuthority, rightsSlaDays, breachDetailedReportHours, breachAlertRecipients }))
  }
  // consents
  const pc = byId(prev.consents)
  for (const c of next.consents) {
    const o = pc.get(c.id)
    if (!o) calls.push(() => post('/privacy/consents', { principal: c.principal, principalRef: c.principalRef, contact: c.contact, principalType: c.principalType, purpose: c.purpose, legalBasis: c.legalBasis, channel: c.channel, noticeVersion: c.noticeVersion }))
    else if (o.status === 'Active' && c.status === 'Withdrawn') {
      const ev = next.consentEvents.find((e) => e.consentId === c.id && e.action === 'Withdrawn')
      calls.push(() => (isSelf(ev?.channel) ? post(`/privacy/my/consents/${c.id}/withdraw`, { note: ev?.note }) : post(`/privacy/consents/${c.id}/withdraw`, { channel: ev?.channel ?? 'Web Portal', note: ev?.note })))
    }
  }
  // notices (create / publish a new version)
  const pn = byId(prev.notices)
  for (const x of next.notices) if (!pn.has(x.id)) calls.push(() => post('/privacy/notices', { version: x.version, title: x.title, language: x.language, summary: x.summary, publish: x.status === 'Published' }))
  // grievances
  const pg = byId(prev.grievances)
  if (next.grievances.some((g) => g.escalated && pg.get(g.id) && !pg.get(g.id)!.escalated)) calls.push(() => post('/privacy/grievances/escalate-overdue'))
  for (const g of next.grievances) {
    const o = pg.get(g.id)
    if (!o) {
      const body = { category: g.category || 'Other', subject: g.subject, description: g.description, priority: g.priority, evidence: g.evidence.map((e) => ({ name: e.name, size: Math.round(e.size) })), draft: g.draft }
      calls.push(() =>
        isSelf(g.source)
          ? post('/privacy/my/grievances', { ...body, mobile: g.complainant.mobile, source: g.source })
          : post('/privacy/grievances', { ...body, complainant: g.complainant, department: g.department || undefined, officer: g.officer || undefined, verificationMethod: g.verification.method }),
      )
      continue
    }
    if (o.draft && !g.draft) calls.push(() => post(isSelf(g.source) ? `/privacy/my/grievances/${g.id}/submit` : `/privacy/grievances/${g.id}/submit`))
    const body: Doc = {}
    for (const k of ['status', 'department', 'officer', 'priority', 'resolutionRemarks'] as const) if (o[k] !== g[k] && g[k] !== undefined) body[k] = g[k]
    if (!o.verification.verified && g.verification.verified) body.verified = true
    if (g.communications.length > o.communications.length) {
      const c = g.communications[g.communications.length - 1]
      body.communication = { channel: c.channel, message: c.message }
    }
    if (!o.closure && g.closure) body.closure = { details: g.closure.details, userInformed: g.closure.userInformed }
    if (Object.keys(body).length) calls.push(() => patch(`/privacy/grievances/${g.id}`, body))
  }
  // breaches
  const pb = byId(prev.breaches)
  for (const b of next.breaches) {
    const o = pb.get(b.id)
    if (!o) {
      calls.push(() => post('/privacy/breaches', { title: b.title, detectedAt: new Date(b.detectedAt).toISOString(), source: b.source, description: b.description, severity: b.severity, dataTypes: b.dataTypes, systems: b.systems, draft: b.draft }))
      continue
    }
    const act = (body: Doc) => calls.push(() => post(`/privacy/breaches/${b.id}/actions`, body))
    if (o.draft && !b.draft) act({ kind: 'submit' })
    if (o.alert?.at !== b.alert?.at && o.alert && b.alert) act({ kind: 'resend-alert' })
    if (o.status !== b.status && b.status !== 'Closed') act({ kind: 'status', status: b.status })
    for (const x of b.accessBlocks.slice(o.accessBlocks.length)) act({ kind: 'block', blockKind: x.kind, target: x.target })
    for (const x of b.evidence.slice(o.evidence.length)) act({ kind: 'evidence', item: x.item, location: x.location })
    if (o.rootCause !== b.rootCause || o.securityGap !== b.securityGap) act({ kind: 'investigation', rootCause: b.rootCause, securityGap: b.securityGap })
    if (changed(o.affectedUsers, b.affectedUsers)) act({ kind: 'affected', users: b.affectedUsers })
    if (!o.userNotification && b.userNotification) act({ kind: 'notify-users', channel: b.userNotification.channel, message: b.userNotification.message })
    if (!o.boardInitial && b.boardInitial) act({ kind: 'board-initial', ref: b.boardInitial.ref })
    if (!o.boardDetailed && b.boardDetailed) act({ kind: 'board-detailed', ref: b.boardDetailed.ref })
    if (changed(o.boardExtension, b.boardExtension) && b.boardExtension) act({ kind: 'board-extension', until: new Date(b.boardExtension.until).toISOString(), letterRef: b.boardExtension.letterRef })
    const oca = byId(o.correctiveActions)
    for (const ca of b.correctiveActions) {
      const was = oca.get(ca.id)
      if (!was) act({ kind: 'corrective-add', action: ca.action, owner: ca.owner, due: day(ca.due) })
      else if (was.done !== ca.done) act({ kind: 'corrective-toggle', actionId: ca.id, done: ca.done })
    }
    if (!o.closure && b.closure) act({ kind: 'close', summary: b.closure.summary })
  }
  // rights
  const pr = byId(prev.rights)
  for (const r of next.rights) {
    const o = pr.get(r.id)
    if (!o) {
      const body = { type: r.type, details: r.details, ...(r.nominee ? { nominee: r.nominee } : {}) }
      calls.push(() => (isSelf(r.source) ? post('/privacy/my/rights', { ...body, source: r.source }) : post('/privacy/rights', { ...body, principal: r.principal, principalRef: r.principalRef, contact: r.contact })))
    } else if (o.status !== r.status || o.response !== r.response) calls.push(() => patch(`/privacy/rights/${r.id}`, { status: r.status, response: r.response }))
  }
  // retention + vendors (PUT = upsert)
  const pt = byId(prev.retention)
  for (const x of next.retention) if (changed(pt.get(x.id), x)) calls.push(() => put(`/privacy/retention/${x.id}`, { category: x.category, purpose: x.purpose, legalBasis: x.legalBasis, periodMonths: x.periodMonths, afterExpiry: x.afterExpiry, owner: x.owner }))
  const pv = byId(prev.vendors)
  for (const x of next.vendors)
    if (changed(pv.get(x.id), x))
      calls.push(() => put(`/privacy/vendors/${x.id}`, { name: x.name, service: x.service, dataShared: x.dataShared, location: x.location, dpaStatus: x.dpaStatus, dpaSignedOn: day(x.dpaSignedOn), dpaExpiry: day(x.dpaExpiry), lastReview: day(x.lastReview), contact: x.contact, notes: x.notes }))
  // deletion queue
  const pd = byId(prev.deletion)
  for (const x of next.deletion) {
    const o = pd.get(x.id)
    if (!o || o.status === x.status) continue
    const action = x.status === 'Approved' ? 'approve' : x.status === 'Deleted' ? 'delete' : x.status === 'Legal Hold' ? 'hold' : o.status === 'Legal Hold' ? 'release' : null
    if (action) calls.push(() => post(`/privacy/deletion/${x.id}/${action}`, { reason: x.hold?.reason }))
  }
  // removals have no endpoints (registers are append-only)
  return calls
}

let syncing: Promise<void> = Promise.resolve()
/** Store facade: same API as before; in API mode each `set` is mirrored to the backend, then the registers are re-read. */
export const privacyStore = {
  ..._privacyStore,
  set(nextState: PrivacyState | ((p: PrivacyState) => PrivacyState)) {
    const prev = _privacyStore.get()
    _privacyStore.set(nextState)
    if (!apiEnabled) return
    const calls = callsFor(prev, _privacyStore.get())
    if (!calls.length) return
    syncing = syncing
      .then(async () => {
        for (const c of calls) await c()
      })
      .catch((e) => {
        toastError(e, 'DPDP change not saved')
      })
      .finally(() => {
        void privacyLoader.reload()
        if (myPrivacyLoader.getState().loaded) void myPrivacyLoader.reload()
      })
  },
  use(): PrivacyState {
    privacyLoader.use()
    return _privacyStore.use()
  },
}
export const usePrivacy = () => privacyStore.use()
export const usePrivacyLoad = () => privacyLoader.use()

/** API mode: the signed-in user's own privacy data (GET /privacy/my). */
export type MyPrivacy = { principal: { name: string; ref: string; type: string }; dpo: PrivacySettings['dpo']; consents: ConsentRecord[]; rights: RightsRequest[]; grievances: Grievance[] }
const myStore = createStore<MyPrivacy | null>('dexter.privacy.my.api.v1', () => null)
export const myPrivacyLoader = createLoader('My Privacy', async () => {
  const r = await get<{ principal: MyPrivacy['principal']; dpo: MyPrivacy['dpo']; consents: Doc[]; rights: Doc[]; grievances: Doc[] }>('/privacy/my')
  myStore.set({
    principal: r.principal,
    dpo: r.dpo,
    consents: r.consents.map(withId<ConsentRecord>('consentId')),
    rights: r.rights.map((x) => ({ history: [], ...x }) as Doc).map(withId<RightsRequest>('requestId')),
    grievances: r.grievances.map((x) => ({ history: [], communications: [], ...x }) as Doc).map(withId<Grievance>('grievanceId')),
  })
})
export function useMyPrivacy(): MyPrivacy | null {
  myPrivacyLoader.use()
  return myStore.use()
}

/** Every DPDP action also goes to the central (append-only) security audit trail. */
export function logPrivacy(actor: string, action: string, target: string, detail?: string) {
  logSecurity({ actor, action: `DPDP · ${action}`, target, detail })
}

/** Next sequential id like DPG-2026-0004. */
export function nextId(prefix: string, existing: { id: string }[]) {
  const year = new Date().getFullYear()
  const head = `${prefix}-${year}-`
  const max = existing.filter((x) => x.id.startsWith(head)).reduce((m, x) => Math.max(m, Number(x.id.slice(head.length)) || 0), 0)
  return `${head}${String(max + 1).padStart(4, '0')}`
}
let n = 0
export const shortId = (p: string) => `${p}-${Date.now().toString(36).toUpperCase()}${(n++).toString(36).toUpperCase()}`

type Patchable = 'grievances' | 'breaches' | 'rights' | 'consents' | 'deletion' | 'vendors' | 'retention' | 'notices'
export function patchItem<K extends Patchable>(key: K, id: string, fn: (x: PrivacyState[K][number]) => PrivacyState[K][number]) {
  privacyStore.set((s) => ({ ...s, [key]: (s[key] as { id: string }[]).map((x) => (x.id === id ? fn(x as PrivacyState[K][number]) : x)) }))
}

// ── Grievance rules ──────────────────────────────────────────────────────
export const OPEN_STATES: GrievanceStatus[] = ['Open', 'Under Review', 'In Progress']
export const isOverdue = (g: Grievance, now: number) => !g.draft && OPEN_STATES.includes(g.status) && new Date(g.dueAt).getTime() < now

/** Escalate every overdue, not-yet-escalated grievance to the senior authority. Returns the count. */
export function escalateOverdue(now: number) {
  const s = privacyStore.get()
  const due = s.grievances.filter((g) => isOverdue(g, now) && !g.escalated)
  if (due.length === 0) return 0
  const at = iso()
  const to = s.settings.escalationAuthority
  privacyStore.set((st) => ({
    ...st,
    grievances: st.grievances.map((g) =>
      due.some((d) => d.id === g.id)
        ? { ...g, escalated: true, escalatedAt: at, escalatedTo: to, history: [...g.history, { at, actor: 'System', action: 'Escalated', detail: `Resolution timeline (${g.slaDays} days) missed → ${to}` }] }
        : g,
    ),
  }))
  due.forEach((g) => logPrivacy('System', 'Grievance auto-escalated', g.id, `Overdue since ${g.dueAt.slice(0, 10)} → ${to}`))
  return due.length
}

/** Time (ms) by which the detailed Board report is due — detection + N hours, or the Board-granted extension. */
export function boardDeadline(b: Breach, hours: number) {
  const base = new Date(b.detectedAt).getTime() + hours * HOUR
  return b.boardExtension ? Math.max(base, new Date(b.boardExtension.until).getTime()) : base
}

export const rightsOverdue = (r: RightsRequest, now: number) => (r.status === 'Submitted' || r.status === 'Identity Verification' || r.status === 'In Progress') && new Date(r.dueAt).getTime() < now

/** Withdraw a consent: status → Withdrawn, history event, audit entry. Returns false if not active. */
export function withdrawConsent(id: string, by: string, channel: string, note?: string) {
  const c = privacyStore.get().consents.find((x) => x.id === id)
  if (!c || c.status !== 'Active') return false
  const at = iso()
  privacyStore.set((s) => ({
    ...s,
    consents: s.consents.map((x) => (x.id === id ? { ...x, status: 'Withdrawn', withdrawnOn: at } : x)),
    consentEvents: [{ id: shortId('CEV'), consentId: id, principal: c.principal, principalRef: c.principalRef, at, action: 'Withdrawn', purpose: c.purpose, channel, by, note }, ...s.consentEvents],
  }))
  logPrivacy(by, 'Consent withdrawn', id, `${c.principal} — ${c.purpose}${note ? ` (${note})` : ''}`)
  return true
}
