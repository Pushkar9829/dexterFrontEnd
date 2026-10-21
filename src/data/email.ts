import { createStore } from '@/lib/store'

/* Email workspace mock data. Mail clock: 27 Aug 2025, 11:45 IST (matches the Figma inbox). */
export const EMAIL_NOW = Date.parse('2025-08-27T11:45:00+05:30')
const at = (s: string) => new Date(s + '+05:30').toISOString()

export type MailPriority = 'High' | 'Medium' | 'Normal' | 'Low'
export type MailFolder = 'inbox' | 'sent' | 'drafts'
export type MailStatus = 'Open' | 'Pending' | 'Resolved'
export const MAIL_PRIORITIES: MailPriority[] = ['High', 'Medium', 'Normal', 'Low']
export const MAIL_STATUSES: MailStatus[] = ['Open', 'Pending', 'Resolved']
export const MAIL_DEPTS = ['Support', 'Finance', 'Legal', 'Verification', 'Projects', 'Sales']

export type Account = { email: string; label: string; authorized: boolean; dept: string }
export const ACCOUNTS: Account[] = [
  { email: 'support@dexterindia.com', label: 'Support Team (Department Account)', authorized: true, dept: 'Support' },
  { email: 'finance@dexterindia.com', label: 'Finance Team (Department Account)', authorized: true, dept: 'Finance' },
  { email: 'kyc@dexterindia.com', label: 'Verification Team (Department Account)', authorized: true, dept: 'Verification' },
  { email: 'legal@dexterindia.com', label: 'Legal Team (Department Account)', authorized: false, dept: 'Legal' },
]

export type Attachment = { name: string; size: number }
export type Mail = {
  id: string
  folder: MailFolder
  threadId?: string
  fromName: string
  fromEmail: string
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  /** plain text body (seed) */
  body: string
  /** rich body from the composer (sanitised on render) */
  html?: string
  at: string
  read: boolean
  starred: boolean
  archived: boolean
  tracker?: string
  priority: MailPriority
  department: string
  account: string
  status: MailStatus
  assigned: boolean
  mention: boolean
  followUp: boolean
  attachments: Attachment[]
  /** sent folder: Sent | Scheduled */
  sendState?: 'Sent' | 'Scheduled'
  scheduledAt?: string
  meeting?: string
  followUpTask?: string
  /** draft: message it replies to */
  replyTo?: string
}

export type Tracker = {
  id: string
  title: string
  status: 'Open' | 'Pending' | 'Resolved'
  priority: MailPriority
  category: string
  customer: { name: string; email: string; phone: string; role: string; org: string; location: string }
  createdOn: string
  assignedTo: string
  events: { at: string; title: string; detail: string }[]
}

export const TRACKERS: Tracker[] = [
  {
    id: 'ATM-2026-00125',
    title: 'ATM Not Dispensing Cash',
    status: 'Open',
    priority: 'High',
    category: 'ATM Issue',
    customer: { name: 'Rohit Sharma', email: 'rohit.sharma@example.com', phone: '+91 98765 43210', role: 'Branch Manager', org: 'ABC Bank', location: 'Connaught Place, New Delhi' },
    createdOn: at('2025-08-26T14:15:00'),
    assignedTo: 'Amit Kumar (Support)',
    events: [{ at: at('2025-08-26T14:15:00'), title: 'Case Created', detail: 'ATM Complaint Logged' }],
  },
  {
    id: 'FIN-2026-00078',
    title: 'KYC Document Request',
    status: 'Pending',
    priority: 'Medium',
    category: 'KYC Documents',
    customer: { name: 'Neha Verma', email: 'neha.verma@example.com', phone: '+91 98200 11873', role: 'Proprietor', org: 'Patel Cash Solutions', location: 'Ahmedabad, Gujarat' },
    createdOn: at('2025-08-24T10:40:00'),
    assignedTo: 'Vikram Shah (Finance)',
    events: [{ at: at('2025-08-24T10:40:00'), title: 'Case Created', detail: 'KYC re-verification opened' }],
  },
  {
    id: 'LEG-2026-00045',
    title: 'Legal Notice - Compliance',
    status: 'Open',
    priority: 'High',
    category: 'Compliance',
    customer: { name: 'Vikram Singh', email: 'vikram.singh@lawpartners.in', phone: '+91 99100 45521', role: 'Counsel', org: 'Singh & Partners', location: 'Lucknow, Uttar Pradesh' },
    createdOn: at('2025-08-22T15:05:00'),
    assignedTo: 'Rohan Gupta (Legal)',
    events: [{ at: at('2025-08-22T15:05:00'), title: 'Case Created', detail: 'Compliance notice received' }],
  },
  {
    id: 'ATM-2026-00131',
    title: 'Card Services - Transaction Dispute',
    status: 'Pending',
    priority: 'Medium',
    category: 'Transaction Dispute',
    customer: { name: 'Amit Patel', email: 'amit.patel@example.com', phone: '+91 97370 22018', role: 'Customer', org: 'Retail customer', location: 'Kothrud, Pune' },
    createdOn: at('2025-08-26T09:20:00'),
    assignedTo: 'Amit Kumar (Support)',
    events: [{ at: at('2025-08-26T09:20:00'), title: 'Case Created', detail: 'Dispute logged against ATM-MH-1045' }],
  },
]
export const trackerById = (id?: string) => TRACKERS.find((t) => t.id === id)

type MailIn = Partial<Mail> & Pick<Mail, 'id' | 'fromName' | 'fromEmail' | 'subject' | 'body' | 'at'>
const m = (x: MailIn): Mail => ({
  folder: 'inbox',
  to: ['support@dexterindia.com'],
  cc: [],
  bcc: [],
  read: true,
  starred: false,
  archived: false,
  priority: 'Normal',
  department: 'Support',
  account: 'support@dexterindia.com',
  status: 'Open',
  assigned: false,
  mention: false,
  followUp: false,
  attachments: [],
  ...x,
})

const SIG = 'Regards,\nDexter India Support Team'

function seed(): Mail[] {
  const hand: Mail[] = [
    m({
      id: 'm1', threadId: 'th-125', fromName: 'Rohit Sharma', fromEmail: 'rohit.sharma@example.com',
      cc: ['team@dexterindia.com', 'amit.kumar@dexterindia.com', 'escalations@dexterindia.com'],
      subject: 'Re: ATM Not Dispensing Cash - Case Update', at: at('2025-08-27T11:32:00'), tracker: 'ATM-2026-00125', priority: 'High',
      body: 'Dear Team,\n\nThanks for the update. Please let me know the expected resolution timeline. The ATM is still not working and causing inconvenience to customers at the branch.\n\nAlso, please confirm once the technician visit is completed.\n\nRegards,\nRohit Sharma\nBranch Manager\nABC Bank, Connaught Place',
      attachments: [{ name: 'Complaint_Screenshot.png', size: 846 * 1024 }, { name: 'Transaction_Report.pdf', size: 1.2 * 1024 * 1024 }],
      assigned: true, followUp: true, starred: true,
    }),
    m({
      id: 'm2', threadId: 'th-125', fromName: 'Customer Support', fromEmail: 'care@dexterindia.com', subject: 'Initial Complaint Acknowledgement', at: at('2025-08-27T10:20:00'),
      tracker: 'ATM-2026-00125', body: 'Hi team,\n\nWe have received your complaint and our team is workign on it. The branch has been informed that a technician is on the way.\n\nCustomer Support Desk',
    }),
    m({
      id: 'm3', threadId: 'th-078', fromName: 'Neha Verma', fromEmail: 'neha.verma@example.com', subject: 'KYC Document Request', at: at('2025-08-27T09:15:00'), read: false,
      tracker: 'FIN-2026-00078', priority: 'Medium', department: 'Finance', account: 'finance@dexterindia.com', to: ['finance@dexterindia.com'], status: 'Pending',
      body: 'Hello,\n\nPlease share the following documents at the earliest so that we can complete the re-verification:\n1. Updated PAN copy of the proprietor\n2. Cancelled cheque for the settlement account\n3. GST registration certificate\n\nThe deposit release depends on this, so a quick turnaround would help.\n\nThanks,\nNeha Verma',
      assigned: true, followUp: true,
    }),
    m({
      id: 'm4', threadId: 'th-045', fromName: 'Vikram Singh', fromEmail: 'vikram.singh@lawpartners.in', subject: 'Legal Notice - Compliance', at: at('2025-08-26T16:40:00'), read: false,
      tracker: 'LEG-2026-00045', priority: 'High', department: 'Legal', account: 'legal@dexterindia.com', to: ['legal@dexterindia.com'], cc: ['support@dexterindia.com'],
      body: 'Dear Sir/Madam,\n\nAs discussed, please find attached the revised compliance notice for the Lucknow site. @Paras Dubey kindly acknowledge receipt and share the compliance report within 7 working days.\n\nRegards,\nVikram Singh\nSingh & Partners',
      attachments: [{ name: 'Revised_Compliance_Notice.pdf', size: 640 * 1024 }], assigned: true, mention: true,
    }),
    m({
      id: 'm5', fromName: 'Ravi Kumar', fromEmail: 'ravi.kumar@dexterindia.com', subject: 'Meeting Request - Project Discussion', at: at('2025-08-26T12:05:00'), read: false, department: 'Projects',
      body: 'Hi,\n\nCan we schedule a meeting this week to discuss the project timelines for the three new ATM sites in Pune? Thursday afternoon works for me.\n\nThanks,\nRavi',
    }),
    m({
      id: 'm6', threadId: 'th-131', fromName: 'Amit Patel', fromEmail: 'amit.patel@example.com', subject: 'Card Services - Transaction Dispute', at: at('2025-08-26T09:20:00'), priority: 'Medium', tracker: 'ATM-2026-00131', status: 'Pending',
      body: 'Hello,\n\nI am writing to raise a dispute regarding a transaction of ₹10,000 at ATM-MH-1045 (Kothrud) on 24 Aug. The amount was debited but cash was not dispensed. @Support please look into this.\n\nAmit Patel',
      mention: true, attachments: [{ name: 'Bank_SMS_Screenshot.jpg', size: 212 * 1024 }],
    }),
    m({
      id: 'm7', fromName: 'Priya Mehta', fromEmail: 'priya.mehta@example.com', subject: 'Account Related Query', at: at('2025-08-25T15:10:00'), department: 'Sales',
      body: 'Hi,\n\nI wanted to check the status of my account upgrade request submitted last week. Please let me know if anything else is needed from my side.\n\nRegards,\nPriya Mehta',
      followUp: true,
    }),
    m({
      id: 'm8', fromName: 'Arun Desai', fromEmail: 'arun.desai@example.com', subject: 'Document Submission', at: at('2025-08-25T11:00:00'), priority: 'Low', department: 'Verification', account: 'kyc@dexterindia.com', to: ['kyc@dexterindia.com'],
      body: 'Dear Team,\n\nPlease find the requested documents attached for verification.\n\nArun Desai',
      attachments: [{ name: 'Address_Proof.pdf', size: 380 * 1024 }, { name: 'PAN_Card.jpg', size: 190 * 1024 }], status: 'Resolved',
    }),
  ]

  // Sent thread history
  const sent: Mail[] = [
    m({
      id: 's1', folder: 'sent', threadId: 'th-125', fromName: 'Support Team', fromEmail: 'support@dexterindia.com', to: ['rohit.sharma@example.com'], subject: 'Initial Complaint Acknowledgement',
      at: at('2025-08-26T09:00:00'), tracker: 'ATM-2026-00125', priority: 'High', sendState: 'Sent',
      body: `Dear Mr. Sharma,\n\nWe have received your complaint (Tracker ID: ATM-2026-00125) regarding the ATM at Connaught Place not dispensing cash. Our technical team has been notified and will update you shortly.\n\n${SIG}`,
    }),
    m({
      id: 's2', folder: 'sent', threadId: 'th-125', fromName: 'Support Team', fromEmail: 'support@dexterindia.com', to: ['rohit.sharma@example.com'], subject: 'ATM Technician Visit Update',
      at: at('2025-08-26T10:15:00'), tracker: 'ATM-2026-00125', priority: 'High', sendState: 'Sent',
      body: `Dear Mr. Sharma,\n\nWe are working on your complaint (Tracker ID: ATM-2026-00125). A technician visit is scheduled for 27 Aug between 10:00 AM and 1:00 PM. We will confirm once the visit is completed.\n\n${SIG}`,
      attachments: [{ name: 'Case_Report.pdf', size: 1.2 * 1024 * 1024 }],
    }),
    m({
      id: 's3', folder: 'sent', threadId: 'th-078', fromName: 'Finance Team', fromEmail: 'finance@dexterindia.com', account: 'finance@dexterindia.com', department: 'Finance', to: ['neha.verma@example.com'],
      subject: 'KYC re-verification for security deposit release', at: at('2025-08-24T10:45:00'), tracker: 'FIN-2026-00078', priority: 'Medium', sendState: 'Sent',
      body: 'Dear Ms. Verma,\n\nAs part of the periodic KYC review (Tracker ID: FIN-2026-00078) we need a few updated documents before releasing the security deposit. We will share the list shortly.\n\nRegards,\nDexter India Finance Team',
    }),
    m({
      id: 's4', folder: 'sent', threadId: 'th-045', fromName: 'Legal Team', fromEmail: 'legal@dexterindia.com', account: 'legal@dexterindia.com', department: 'Legal', to: ['vikram.singh@lawpartners.in'],
      subject: 'Re: Compliance notice – Lucknow site', at: at('2025-08-22T17:30:00'), tracker: 'LEG-2026-00045', priority: 'High', sendState: 'Sent',
      body: 'Dear Mr. Singh,\n\nWe acknowledge the compliance notice (Tracker ID: LEG-2026-00045) and will revert with our response after internal review.\n\nRegards,\nDexter India Legal Team',
    }),
  ]

  const drafts: Mail[] = [
    m({
      id: 'd1', folder: 'drafts', threadId: 'th-078', fromName: 'Finance Team', fromEmail: 'finance@dexterindia.com', account: 'finance@dexterindia.com', department: 'Finance', to: ['neha.verma@example.com'],
      subject: 'FIN-2026-00078 | Re: KYC Document Request', at: at('2025-08-27T09:40:00'), tracker: 'FIN-2026-00078', priority: 'Medium', replyTo: 'm3',
      body: 'Dear Ms. Verma,\n\nThank you for your email. We have noted the documents required and will share them by',
    }),
    m({
      id: 'd2', folder: 'drafts', fromName: 'Support Team', fromEmail: 'support@dexterindia.com', to: ['ravi.kumar@dexterindia.com'], department: 'Projects',
      subject: 'Re: Meeting Request - Project Discussion', at: at('2025-08-26T13:00:00'), replyTo: 'm5',
      body: 'Hi Ravi,\n\nThursday 3:00 PM works. I will send a calendar invite.',
    }),
  ]

  // Older mailbox history so counts and paging behave like a real account (deterministic).
  const pool: [string, string, string, string, string, MailPriority, string?][] = [
    ['Sunita Rao', 'sunita.rao@example.com', 'Cash replenishment schedule', 'Sharing the revised cash replenishment schedule for the week.', 'Support', 'Normal', 'ATM-2026-00118'],
    ['Karthik Iyer', 'karthik.iyer@nammaatm.in', 'Bank proof re-submission', 'Attached is the corrected cancelled cheque for our settlement account.', 'Verification', 'Medium'],
    ['Deepa Nair', 'deepa.nair@example.com', 'Receipt not printed at ATM', 'The ATM did not print a receipt for my withdrawal yesterday.', 'Support', 'Low', 'ATM-2026-00120'],
    ['Manoj Tiwari', 'manoj.tiwari@awadhbp.in', 'Lease deed copy for Lucknow site', 'Please find the notarised lease deed for the Hazratganj site.', 'Legal', 'Medium', 'LEG-2026-00041'],
    ['Farhan Qureshi', 'farhan.q@example.com', 'Commission statement – July', 'Requesting a copy of the July commission statement for reconciliation.', 'Finance', 'Normal', 'FIN-2026-00070'],
    ['Lakshmi Menon', 'lakshmi.menon@example.com', 'ATM display not working', 'The screen at the Indiranagar ATM has been blank since morning.', 'Support', 'High', 'ATM-2026-00122'],
    ['Rakesh Gupta', 'rakesh.gupta@bengalrural.in', 'GST certificate', 'Uploading our GST certificate as requested in your last email.', 'Verification', 'Normal'],
    ['Pooja Kulkarni', 'pooja.k@example.com', 'Site visit confirmation', 'Confirming the site visit for the Paud Road location on Friday.', 'Projects', 'Normal'],
    ['Sanjay Bhatt', 'sanjay.bhatt@pateldash.in', 'Security deposit receipt', 'Please acknowledge the deposit transferred on 18 Aug.', 'Finance', 'Medium', 'FIN-2026-00074'],
    ['Anita Joshi', 'anita.joshi@example.com', 'Franchise enquiry – Nashik', 'I would like to know the investment needed for a franchise in Nashik.', 'Sales', 'Low'],
    ['Imran Sheikh', 'imran.sheikh@example.com', 'Card retained by ATM', 'My debit card was retained by the machine at MG Road.', 'Support', 'High', 'ATM-2026-00124'],
    ['Gaurav Mehra', 'gaurav.mehra@example.com', 'Agreement countersignature', 'The countersigned agreement will be couriered tomorrow.', 'Legal', 'Normal'],
  ]
  const gen: Mail[] = []
  for (let i = 0; i < 116; i++) {
    const [name, email, subj, preview, dept, pr, tr] = pool[i % pool.length]
    const hoursBack = 46 + i * 5 + (i % 3) * 2 // spread from 25 Aug back to ~1 Aug
    const iso = new Date(EMAIL_NOW - hoursBack * 3600_000).toISOString()
    gen.push(
      m({
        id: `g${i + 1}`,
        fromName: name,
        fromEmail: email,
        subject: i >= pool.length ? `Re: ${subj}` : subj,
        body: `Hello,\n\n${preview}\n\nPlease let us know if anything else is required.\n\nRegards,\n${name}`,
        at: iso,
        priority: pr,
        department: dept,
        tracker: tr,
        account: dept === 'Finance' ? 'finance@dexterindia.com' : dept === 'Verification' ? 'kyc@dexterindia.com' : dept === 'Legal' ? 'legal@dexterindia.com' : 'support@dexterindia.com',
        read: i >= 15,
        assigned: i % 13 === 4 && i < 117,
        mention: i % 29 === 7,
        followUp: i % 23 === 2,
        status: i % 5 === 0 ? 'Resolved' : i % 5 === 1 ? 'Pending' : 'Open',
        attachments: i % 4 === 1 ? [{ name: `${subj.split(' ')[0]}_document.pdf`, size: (200 + i * 17) * 1024 }] : [],
      }),
    )
  }
  return [...hand, ...sent, ...drafts, ...gen]
}

export type EmailState = { mails: Mail[] }
export const emailStore = createStore<EmailState>('dexter.email.v1', () => ({ mails: seed() }))

export const updateMails = (ids: string[], fn: (m: Mail) => Mail) =>
  emailStore.set((s) => ({ mails: s.mails.map((x) => (ids.includes(x.id) ? fn(x) : x)) }))
export const getMail = (id?: string | null) => emailStore.get().mails.find((x) => x.id === id)
export const upsertMail = (mail: Mail) =>
  emailStore.set((s) => ({ mails: s.mails.some((x) => x.id === mail.id) ? s.mails.map((x) => (x.id === mail.id ? mail : x)) : [mail, ...s.mails] }))
export const removeMail = (id: string) => emailStore.set((s) => ({ mails: s.mails.filter((x) => x.id !== id) }))
export const newMailId = (p: string) => `${p}${Date.now().toString(36)}`

export const blankMail = (folder: MailFolder): Mail =>
  m({ id: newMailId(folder === 'drafts' ? 'd' : 's'), folder, fromName: 'Support Team', fromEmail: 'support@dexterindia.com', to: [], subject: '', body: '', at: new Date(EMAIL_NOW).toISOString() })

/** Messages in the same thread / tracker (not drafts), newest first. */
export function threadOf(mail: Mail, all: Mail[]) {
  return all
    .filter((x) => x.id !== mail.id && x.folder !== 'drafts' && ((mail.threadId && x.threadId === mail.threadId) || (!mail.threadId && mail.tracker && x.tracker === mail.tracker)))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

export type TimelineItem = { at: string; kind: 'received' | 'sent' | 'scheduled' | 'event'; title: string; detail: string; mailId?: string }
export function timelineOf(trackerId: string, all: Mail[]): TimelineItem[] {
  const tr = trackerById(trackerId)
  const items: TimelineItem[] = all
    .filter((x) => x.tracker === trackerId && x.folder !== 'drafts')
    .map((x) =>
      x.folder === 'inbox'
        ? { at: x.at, kind: 'received' as const, title: 'Reply Received', detail: `${x.subject}\nFrom: ${x.fromEmail}`, mailId: x.id }
        : { at: x.scheduledAt ?? x.at, kind: x.sendState === 'Scheduled' ? ('scheduled' as const) : ('sent' as const), title: x.sendState === 'Scheduled' ? 'Scheduled' : 'Sent', detail: `${x.subject}\nTo: ${x.to.join(', ')}`, mailId: x.id },
    )
  for (const e of tr?.events ?? []) items.push({ at: e.at, kind: 'event', title: e.title, detail: `${e.detail}\n${trackerId}` })
  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

const IST: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata' }
/** List time: "11:32 AM" today, "Yesterday", else "25 Aug". */
export function listTime(isoStr: string) {
  const d = new Date(isoStr)
  const day = (x: number) => new Date(x).toLocaleDateString('en-CA', IST)
  if (day(d.getTime()) === day(EMAIL_NOW)) return d.toLocaleTimeString('en-US', { ...IST, hour: '2-digit', minute: '2-digit' })
  if (day(d.getTime()) === day(EMAIL_NOW - 86400_000)) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { ...IST, day: '2-digit', month: 'short' })
}
/** "27 Aug 2025, 11:32 AM" */
export const fullTime = (isoStr: string) => {
  const d = new Date(isoStr)
  return `${d.toLocaleDateString('en-GB', { ...IST, day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-US', { ...IST, hour: '2-digit', minute: '2-digit' })}`
}
/** "27 Aug, 11:32 AM" */
export const shortTime = (isoStr: string) => {
  const d = new Date(isoStr)
  return `${d.toLocaleDateString('en-GB', { ...IST, day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('en-US', { ...IST, hour: '2-digit', minute: '2-digit' })}`
}
export const fmtBytes = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
export const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim())
