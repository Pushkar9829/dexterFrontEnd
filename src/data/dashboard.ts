// Mock dashboard data taken from the Figma (Dashboard 56:3667). Replace with API calls later.

export const kpis = [
  { key: 'users', title: 'Total Users', value: '248', trend: '12%', up: true, caption: 'Active employees', color: 'blue' as const },
  { key: 'franchises', title: 'Franchises', value: '86', trend: '8%', up: true, caption: 'Active franchise partners', color: 'green' as const },
  { key: 'approvals', title: 'Pending Approvals', value: '14', trend: '5%', up: false, caption: 'Requires your attention', color: 'purple' as const },
  { key: 'complaints', title: 'Open Complaints', value: '7', trend: '2%', up: true, caption: 'Tickets raised', color: 'red' as const },
  { key: 'atms', title: 'Total ATMs', value: '1,284', trend: '14%', up: true, caption: 'Operational nationwide', color: 'navy' as const },
  { key: 'tasks', title: 'Active Tasks', value: '42', trend: '6%', up: false, caption: 'Assigned to technicians', color: 'purple' as const },
]

export const projects = [
  { name: 'HRMS', pct: 75, color: 'bg-accent-blue' },
  { name: 'Dexter CRM & Lead Management', pct: 60, color: 'bg-brand-red' },
  { name: 'WhatsApp CRM', pct: 45, color: 'bg-accent-purple' },
]

export const tickets = [
  { name: 'Complaints', value: 7, color: '#e52429' },
  { name: 'CBR', value: 5, color: '#1675f8' },
  { name: 'EOD', value: 4, color: '#009b73' },
  { name: 'Cash Loading', value: 3, color: '#f5a524' },
  { name: 'Others', value: 5, color: '#7439ed' },
]

export const finance = [
  { label: 'Payouts (Total)', amount: 1250000, trend: '10%', tone: 'amber' },
  { label: 'GST', amount: 230000, trend: '8%', tone: 'purple' },
  { label: 'Security Deposit', amount: 875000, trend: '5%', tone: 'green' },
  { label: 'Salary Payments', amount: 640000, trend: '7%', tone: 'blue' },
] as const

export const activities = [
  { when: '27 Aug 2025', time: '12:45 PM', activity: 'New user registered · Rahul Dubey', module: 'Onboarding', status: 'Completed' },
  { when: '27 Aug 2025', time: '11:32 AM', activity: 'Complaint raised · Site ID 1024', module: 'Operations', status: 'In Progress' },
  { when: '27 Aug 2025', time: '10:15 AM', activity: 'Payout processed · MF', module: 'Finance', status: 'Completed' },
  { when: '26 Aug 2025', time: '04:20 PM', activity: 'Document verified · Franchise', module: 'KYC', status: 'Completed' },
  { when: '26 Aug 2025', time: '01:10 PM', activity: 'Attendance updated · 45 employees', module: 'HRMS', status: 'Completed' },
  { when: '26 Aug 2025', time: '11:05 AM', activity: 'Agreement uploaded · ABC Franchise', module: 'Legal', status: 'Pending' },
]

export const quickAccess = [
  { label: 'Franchise Management', to: '/franchise' },
  { label: 'KYC Management', to: '/kyc/verification' },
  { label: 'Site Installation', to: '/projects/active' },
  { label: 'Raise Complaint', to: '/operations/complaints' },
  { label: 'Task Management', to: '/tasks/my' },
  { label: 'Reports Dashboard', to: '/reports' },
]

export const dashboardNotices = [
  { title: 'System Maintenance Scheduled', body: 'Platform will be down on 30 Aug 2025 (Sat).', date: '27 Aug 2025', color: 'bg-brand-red' },
  { title: 'New Policy Update', body: 'Please review the updated HR policy.', date: '25 Aug 2025', color: 'bg-accent-amber' },
  { title: 'KYC Verification Pending', body: '3 new KYC documents need verification.', date: '22 Aug 2025', color: 'bg-brand-red' },
]

export const moduleTiles = [
  { title: 'Legal', sub: 'LOI, Affidavits, Agreement', to: '/legal', tone: 'blue' },
  { title: 'Projects', sub: 'Site Installation', to: '/projects/active', tone: 'sky' },
  { title: 'Reports & MIS', sub: 'Management & Operational Reports', to: '/reports', tone: 'purple' },
  { title: 'Governance', sub: 'Audit, Security, Notices', to: '/governance/audit', tone: 'red' },
] as const

export const inr = (n: number) => '₹ ' + n.toLocaleString('en-IN')
