import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  Plus,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'

interface SupportTicket {
  id: string
  subject: string
  category: string
  priority: 'High' | 'Medium' | 'Low'
  status: 'Open' | 'In Progress' | 'Resolved'
  openedDate: string
  lastUpdated: string
}

const INITIAL_TICKETS: SupportTicket[] = [
  { id: 'TICK-26-041', subject: 'CBR EOD Reconciliation mismatch on ATM-MH-1024', category: 'Operations & CBR', priority: 'High', status: 'In Progress', openedDate: '2026-10-20', lastUpdated: 'Today, 14:10' },
  { id: 'TICK-26-040', subject: 'API timeout error during Aadhaar OTP verification', category: 'KYC & Verification', priority: 'Medium', status: 'Open', openedDate: '2026-10-19', lastUpdated: 'Yesterday' },
  { id: 'TICK-26-039', subject: 'Export CSV truncation for high-volume transactions', category: 'Reports & Exports', priority: 'Low', status: 'Resolved', openedDate: '2026-10-15', lastUpdated: '2026-10-17' },
  { id: 'TICK-26-038', subject: 'Request for secondary CRA login credential update', category: 'Access & Security', priority: 'Medium', status: 'Resolved', openedDate: '2026-10-12', lastUpdated: '2026-10-14' },
]

export default function SupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('Operations & CBR')
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium')
  const [description, setDescription] = useState('')

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim()) {
      toast('Please enter a ticket subject.')
      return
    }

    const newTicket: SupportTicket = {
      id: `TICK-26-${String(Math.floor(Math.random() * 900) + 100)}`,
      subject,
      category,
      priority,
      status: 'Open',
      openedDate: new Date().toISOString().slice(0, 10),
      lastUpdated: 'Just now',
    }

    setTickets([newTicket, ...tickets])
    setModalOpen(false)
    setSubject('')
    setDescription('')
    toast(`Ticket ${newTicket.id} created successfully! Support team notified.`)
  }

  const exportTickets = () => {
    downloadCsv(
      'support-tickets',
      ['Ticket ID', 'Subject', 'Category', 'Priority', 'Status', 'Opened Date', 'Last Updated'],
      filtered.map((t) => [t.id, t.subject, t.category, t.priority, t.status, t.openedDate, t.lastUpdated])
    )
    toast('Tickets exported to CSV')
  }

  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase()
    const matchQ = !q || t.id.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    const matchS = statusFilter === 'All' || t.status === statusFilter
    return matchQ && matchS
  })

  return (
    <div className="max-w-[1040px] pb-12 font-sans">
      <Link
        to="/user/help-support"
        className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0066FF] hover:underline"
      >
        <ArrowLeft size={15} /> Back to Help & Support
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#1E293B]">
            Support Tickets
          </h1>
          <p className="mt-1 text-[13px] text-[#64748B]">
            Raise inquiries, monitor system issues, and track support ticket resolution SLAs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<Download size={14} />} onClick={exportTickets}>
            Export CSV
          </Button>
          <Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>
            Raise New Ticket
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="mb-4 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by ticket ID, subject or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-[#0066FF] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-line bg-white px-3 text-[12.5px] font-medium text-ink outline-none focus:border-[#0066FF]"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tickets Table */}
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-b border-line bg-surface text-[11px] font-semibold text-muted uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Ticket ID</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Opened Date</th>
                <th className="px-4 py-3">Last Updated</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {filtered.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-surface/50">
                  <td className="px-4 py-3 font-mono text-[11.5px] font-semibold text-[#0066FF]">{t.id}</td>
                  <td className="px-4 py-3 font-medium text-ink max-w-[320px]">{t.subject}</td>
                  <td className="px-4 py-3 text-muted text-[12px]">{t.category}</td>
                  <td className="px-4 py-3">
                    <Badge tone={t.priority === 'High' ? 'red' : t.priority === 'Medium' ? 'amber' : 'blue'}>
                      {t.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted text-[11.5px]">{t.openedDate}</td>
                  <td className="px-4 py-3 text-muted text-[11.5px]">{t.lastUpdated}</td>
                  <td className="px-4 py-3 text-right">
                    <Badge tone={t.status === 'Resolved' ? 'green' : t.status === 'In Progress' ? 'blue' : 'amber'}>
                      {t.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    No tickets found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raise Ticket Modal */}
      {modalOpen && (
        <Modal
          title="Raise Support Ticket"
          sub="Submit an issue report or query to the Dexter IT & Operations team."
          onClose={() => setModalOpen(false)}
          width={600}
          footer={
            <div className="flex w-full justify-end gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTicket}>Submit Ticket</Button>
            </div>
          }
        >
          <form onSubmit={handleCreateTicket} className="space-y-4 text-[12.5px]">
            <div>
              <label className="block font-medium text-[#1E293B] mb-1">Ticket Subject *</label>
              <input
                type="text"
                placeholder="Brief summary of the issue..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-9 w-full rounded-lg border border-line px-3 text-[13px] outline-none focus:border-[#0066FF]"
                required
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-medium text-[#1E293B] mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-9 w-full rounded-lg border border-line bg-white px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                >
                  <option value="Operations & CBR">Operations & CBR</option>
                  <option value="KYC & Verification">KYC & Verification</option>
                  <option value="Finance & Payouts">Finance & Payouts</option>
                  <option value="Reports & Exports">Reports & Exports</option>
                  <option value="Access & Security">Access & Security</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#1E293B] mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="h-9 w-full rounded-lg border border-line bg-white px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                >
                  <option value="High">High (4h SLA)</option>
                  <option value="Medium">Medium (24h SLA)</option>
                  <option value="Low">Low (48h SLA)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-[#1E293B] mb-1">Detailed Description</label>
              <textarea
                rows={4}
                placeholder="Provide steps to reproduce or additional background..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-line p-3 text-[13px] outline-none focus:border-[#0066FF]"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
