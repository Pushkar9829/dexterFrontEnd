import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronRight,
  Download,
  LifeBuoy,
  MessageCircle,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from '@/components/ui/Toast'

interface HelpArticle {
  id: string
  title: string
  category: string
  readTime: string
  snippet: string
}

const ARTICLES: HelpArticle[] = [
  { id: 'ART-101', title: 'Daily CBR Reconciliation & EOD Submission Guide', category: 'Operations', readTime: '5 min read', snippet: 'Step-by-step walkthrough for verifying switch balances, identifying variances, and submitting daily EOD CBR reports.' },
  { id: 'ART-102', title: 'Franchisee Onboarding & KYC Pack Verification SLA', category: 'Onboarding', readTime: '4 min read', snippet: 'Understanding the 48-hour identity verification workflow for PAN, Aadhaar, and physical site verification checks.' },
  { id: 'ART-103', title: 'Security Deposit (SD) Top-ups & Ledger Adjustments', category: 'Finance', readTime: '3 min read', snippet: 'How to request, review, and approve security deposit adjustments, bank guarantees, and RTGS payment vouchers.' },
  { id: 'ART-104', title: 'RBI White Label ATM Compliance Requirements', category: 'Governance', readTime: '6 min read', snippet: 'Comprehensive overview of quarterly capital adequacy, CCTV 90-day retention policies, and clean note compliance.' },
  { id: 'ART-105', title: 'Configuring Escalation Hierarchies & SLA Triggers', category: 'Setup', readTime: '4 min read', snippet: 'Guide to defining business units, tier escalation matrices, and automated timeout notification rules.' },
]

export default function HelpCenter() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const filtered = ARTICLES.filter((a) => {
    const q = search.toLowerCase()
    const matchQ = !q || a.title.toLowerCase().includes(q) || a.snippet.toLowerCase().includes(q)
    const matchC = selectedCategory === 'All' || a.category === selectedCategory
    return matchQ && matchC
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
            Help Center & Knowledge Base
          </h1>
          <p className="mt-1 text-[13px] text-[#64748B]">
            Operating documentation, SOP guides, system FAQs, and internal manuals.
          </p>
        </div>

        <Button
          variant="secondary"
          icon={<Download size={14} />}
          onClick={() => toast('Downloading Dexter Operations Manual v2.4 (PDF)...')}
        >
          Download Manual (PDF)
        </Button>
      </div>

      {/* Search Header Banner */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-sm">
        <h2 className="text-lg font-bold">How can we help you today?</h2>
        <p className="mt-1 text-[13px] text-blue-100 max-w-xl">
          Search across Dexter operating procedures, RBI compliance guides, and franchise workflows.
        </p>

        <div className="mt-4 relative max-w-lg">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search guides, SOPs, error codes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl bg-white pl-10 pr-4 text-[13px] text-[#1E293B] outline-none shadow-sm placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {['All', 'Operations', 'Onboarding', 'Finance', 'Governance', 'Setup'].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-[#0066FF] text-white shadow-xs'
                : 'bg-white border border-line text-[#475569] hover:bg-surface'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Articles Grid */}
      <div className="grid gap-3.5 sm:grid-cols-2">
        {filtered.map((art) => (
          <div
            key={art.id}
            className="group rounded-xl border border-line bg-white p-4 shadow-xs transition-all hover:border-[#0066FF] hover:shadow-md cursor-pointer"
            onClick={() => toast(`Opening article "${art.title}"`)}
          >
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span className="font-semibold text-[#0066FF] uppercase tracking-wider">{art.category}</span>
              <span>{art.readTime}</span>
            </div>
            <h3 className="mt-1.5 text-[14px] font-bold text-[#1E293B] group-hover:text-[#0066FF] transition-colors">
              {art.title}
            </h3>
            <p className="mt-1 text-[12px] text-[#64748B] leading-relaxed line-clamp-2">
              {art.snippet}
            </p>
            <div className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-[#0066FF]">
              Read guide <ChevronRight size={13} className="transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        ))}
      </div>

      {/* Contact Support Footer */}
      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#0066FF]">
              <LifeBuoy size={20} />
            </div>
            <div>
              <h4 className="text-[13.5px] font-bold text-[#1E293B]">Still need assistance?</h4>
              <p className="text-[12px] text-muted">Reach out to our 24/7 dedicated Operations Help Desk.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/user/tickets">
              <Button variant="secondary" icon={<MessageCircle size={14} />}>
                Submit a Ticket
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
