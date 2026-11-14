import { useState } from 'react'
import {
  FileText,
  ArrowLeft,
  Search,
  CheckCircle2,
  Download,
  Scale,
  PhoneCall,
  Mail,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { CardCornerAccent } from '../components/CardCornerAccent'

interface MobileTermsScreenProps {
  onBack: () => void
}

interface TermClause {
  id: string
  title: string
  section: string
  category: 'franchise' | 'cash' | 'payout' | 'security' | 'termination'
  summary: string
  details: string[]
  badge?: string
}

export function MobileTermsScreen({ onBack }: MobileTermsScreenProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>('clause-1')

  const categories = [
    { id: 'all', label: 'All Clauses' },
    { id: 'franchise', label: 'Franchise Scope' },
    { id: 'cash', label: 'Cash & CBR' },
    { id: 'payout', label: 'Payout & SLA' },
    { id: 'security', label: 'Security & Deposit' },
    { id: 'termination', label: 'Exit & Dispute' }
  ]

  const clauses: TermClause[] = [
    {
      id: 'clause-1',
      title: 'Franchise Scope & White Label ATM Authorization',
      section: 'Clause 1.0',
      category: 'franchise',
      badge: 'RBI / WLA Policy',
      summary: 'Rights, authorization, and territorial exclusivity granted to operate a White Label ATM under Dexter India network.',
      details: [
        '1.1 Dexter India grants the Franchise Partner a non-transferable, revocable license to operate a White Label ATM (WLA) kiosk at the approved site location.',
        '1.2 All operations must strictly adhere to the Reserve Bank of India (RBI) Guidelines for White Label ATMs (2019/2026 revisions) and NPCI National Financial Switch (NFS) operational standards.',
        '1.3 The Franchise Partner shall maintain exclusive operational rights within a 150-meter radius of the designated kiosk location for the duration of this agreement.',
        '1.4 Any proposed alteration, relocation, or structural modification to the approved ATM kiosk requires mandatory written approval from the Dexter India Operations Committee.'
      ]
    },
    {
      id: 'clause-2',
      title: 'Kiosk Infrastructure & Site Standards',
      section: 'Clause 2.0',
      category: 'franchise',
      badge: 'Site Compliance',
      summary: 'Electrical specifications, UPS runtime, CCTV surveillance retention, and branding requirements.',
      details: [
        '2.1 Uninterrupted Power Supply: The Franchise Partner shall ensure 24/7 commercial power with a minimum 4-hour dedicated online UPS backup capable of supporting the ATM machine, surveillance system, and router.',
        '2.2 Climate Control: Air conditioning must maintain ambient room temperature between 20°C and 24°C to prevent thermal stress on dispenser mechanisms and cash cassettes.',
        '2.3 24/7 CCTV Surveillance: High-definition IP camera coverage must be active 24/7, with recorded footage preserved on the local DVR and cloud mirror for a minimum retention period of 90 calendar days as mandated by RBI security standards.',
        '2.4 Signage & Dexter Branding: The kiosk must display official Dexter India signage, toll-free helpline numbers, and emergency contact details prominently at the entrance.'
      ]
    },
    {
      id: 'clause-3',
      title: 'Cash Loading, Indents & Daily CBR Reconciliations',
      section: 'Clause 3.0',
      category: 'cash',
      badge: 'Zero Discrepancy SLA',
      summary: 'Cash loading cycles, sponsor bank indents, CBR submission deadlines, and physical cash shortage liability.',
      details: [
        '3.1 Cash Indent & Dispatch: Indents are issued via Sponsor Banks (Axis Bank / ICICI Bank). Cash loading must be executed strictly by designated authorized custodians within stipulated cutoff hours.',
        '3.2 Daily EOD Submission: End-of-Day (EOD) counter readings, physical cash counts, and switch settlement slips must be submitted via the Dexter Mobile App daily prior to 11:30 PM IST.',
        '3.3 Prohibition of Commingling: Only verified bank-issued currency shall be loaded into the ATM cash cassettes. Commingling of non-cleared or unauthorized personal funds is strictly prohibited and constitutes an immediate material breach.',
        '3.4 Shortage Indemnity: In the event of physical cash shortages identified during audits or electronic switch reconciliation, the Franchise Partner accepts primary indemnity to settle discrepancies within 48 business hours.'
      ]
    },
    {
      id: 'clause-4',
      title: 'Commercial Payouts, Interchange & Service Level Agreement',
      section: 'Clause 4.0',
      category: 'payout',
      badge: 'Monthly Settlement',
      summary: 'Transaction interchange sharing, minimum 96.5% uptime SLA, tax deductions, and downtime penalties.',
      details: [
        '4.1 Transaction Fees: Dexter India shall credit monthly transaction fees on or before the 7th working day of the subsequent month. Financial transactions: ₹9.50 per valid cash withdrawal; Non-financial transactions: ₹2.50 per balance inquiry/mini-statement.',
        '4.2 Uptime SLA: The Franchise Partner is obligated to maintain a minimum of 96.5% monthly operational kiosk uptime.',
        '4.3 Downtime Penalties: Unscheduled downtime exceeding 48 cumulative hours in a billing cycle (excluding scheduled maintenance and bank switch outages) shall incur a penalty deduction of ₹500 per day from accrued commissions.',
        '4.4 Statutory Tax Withholding: Payouts are subject to Tax Deducted at Source (TDS) under Section 194C / 194J of the Income Tax Act, 1961, and applicable Goods and Services Tax (GST) provisions.'
      ]
    },
    {
      id: 'clause-5',
      title: 'Security Deposit & Cash Loading Fund (CLF)',
      section: 'Clause 5.0',
      category: 'security',
      badge: 'Refundable Guarantee',
      summary: 'Security deposit custody, lien conditions, CLF advance guidelines, and interest-free refund upon exit.',
      details: [
        '5.1 Refundable Security Deposit: A refundable deposit of ₹1,00,000 per ATM booth is maintained in an escrow account with Dexter India as a performance guarantee for hardware and operational integrity.',
        '5.2 Cash Loading Fund (CLF): CLF advances provided for liquidity management are subject to daily settlement reconciliation against ATM dispenses and cannot be diverted for collateral or third-party liabilities.',
        '5.3 Return of Security Deposit: Upon termination and completion of physical asset handover without damages, the full security deposit shall be released within 30 banking days.'
      ]
    },
    {
      id: 'clause-6',
      title: 'Agreement Term, Exit Procedure & Dispute Resolution',
      section: 'Clause 6.0',
      category: 'termination',
      badge: '3-Year Term',
      summary: 'Contract tenure, notice periods, de-installation protocols, arbitration and governing law in New Delhi.',
      details: [
        '6.1 Tenure & Renewal: This agreement is valid for a tenure of 3 (three) years from the effective date and may be renewed by mutual consent subject to operational audit clearance.',
        '6.2 Termination for Convenience: Either party may terminate this agreement by providing 90 (ninety) days prior written notice via registered email or speed post.',
        '6.3 Asset De-installation: Upon termination, Dexter India reserves the right to retrieve the ATM machine, UPS, battery bank, and SIM router. The Franchise Partner shall provide unobstructed physical site access.',
        '6.4 Governing Law & Arbitration: Any dispute arising out of this agreement shall be referred to sole arbitration in New Delhi under the Arbitration and Conciliation Act, 1996, and subject to Delhi High Court jurisdiction.'
      ]
    }
  ]

  const filteredClauses = clauses.filter((c) => {
    const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.details.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-4 pb-8 pt-3 px-3.5">
      {/* Top Banner matching Dexter Mobile Design System */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-all"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-200">
                <Scale size={13} />
                <span>Statutory & Franchise Agreement</span>
              </div>
              <h1 className="text-lg font-black text-white">Terms & Conditions</h1>
            </div>
          </div>
          <span className="rounded-xl bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white border border-white/20">
            v2.4 (2026)
          </span>
        </div>
      </div>

      {/* Active Agreement Verification Card */}
      <div className="relative overflow-hidden rounded-2xl border border-[#BED7FA] bg-gradient-to-b from-[#F2F7FE] via-[#F8FBFF] to-[#E8F2FC] p-4 shadow-[0_4px_14px_rgba(20,70,170,0.06)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <CheckCircle2 size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-bold text-emerald-800">
                Digitally Signed & Active
              </span>
              <h2 className="text-sm font-black text-[#061D52] mt-0.5">
                Master Franchise Agreement
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => alert('Downloading official Signed Agreement copy (PDF)...')}
            className="flex items-center gap-1 rounded-xl bg-[#0B56D0] px-2.5 py-1.5 text-[10.5px] font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Download size={13} />
            <span>Copy</span>
          </button>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-blue-200/60 pt-3 text-[11px]">
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-semibold">Contract Ref ID</p>
            <p className="font-bold text-[#061D52]">DEX-MFA-2026-8812</p>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-semibold">Franchise Partner</p>
            <p className="font-bold text-[#061D52]">Ranjeet Pal</p>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-semibold">Signatory Date</p>
            <p className="font-bold text-slate-700">12 Jan 2026, 11:32 AM</p>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-semibold">Jurisdiction</p>
            <p className="font-bold text-slate-700">New Delhi (India)</p>
          </div>
        </div>

        <CardCornerAccent width={54} height={36} />
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search clauses, uptime, payouts, penalty..."
          className="w-full rounded-xl border border-blue-200 bg-white pl-9 pr-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`whitespace-nowrap rounded-xl px-3 py-1.5 font-bold transition-all ${
              selectedCategory === cat.id
                ? 'bg-[#0B56D0] text-white shadow-xs'
                : 'bg-white border border-blue-200/80 text-slate-600 hover:bg-blue-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Clauses Accordion */}
      <div className="space-y-3">
        {filteredClauses.map((clause) => {
          const isExpanded = expandedId === clause.id
          return (
            <div
              key={clause.id}
              className="relative overflow-hidden rounded-2xl border border-[#BED7FA] bg-gradient-to-b from-[#F2F7FE] via-[#F8FBFF] to-[#E8F2FC] shadow-[0_3px_12px_rgba(20,70,170,0.06)] transition-all"
            >
              {/* Header / Click to Expand */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : clause.id)}
                className="flex w-full items-start justify-between p-3.5 text-left"
              >
                <div className="flex items-start gap-2.5 pr-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100/80 text-[#0B56D0]">
                    <FileText size={17} className="stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold text-[#0B56D0] uppercase tracking-wider">
                        {clause.section}
                      </span>
                      {clause.badge && (
                        <span className="rounded-full bg-blue-100/90 px-2 py-0.2 text-[9px] font-bold text-blue-800">
                          {clause.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-black text-[#061D52] mt-0.5 leading-snug">
                      {clause.title}
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-600 leading-normal line-clamp-2">
                      {clause.summary}
                    </p>
                  </div>
                </div>
                <div className="mt-1 shrink-0 text-slate-400">
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {/* Expanded Detailed Clauses */}
              {isExpanded && (
                <div className="border-t border-blue-200/70 bg-white/70 p-3.5 space-y-2 text-[11.5px] leading-relaxed text-slate-700">
                  {clause.details.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#0B56D0] mt-1.5 shrink-0" />
                      <p>{detail}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Dexter Signature Corner Accent */}
              <CardCornerAccent width={52} height={34} />
            </div>
          )
        })}

        {filteredClauses.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <Search size={28} className="mx-auto text-blue-300 mb-2" />
            <p className="text-xs font-bold text-slate-600">No clause matched "{searchQuery}"</p>
            <p className="text-[11px] text-slate-400 mt-1">Try searching for keywords like "cash", "uptime", or "payout"</p>
          </div>
        )}
      </div>

      {/* Legal Helpdesk Box */}
      <div className="rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4 text-center space-y-2">
        <h4 className="text-xs font-black text-[#061D52]">Have questions regarding your Franchise Agreement?</h4>
        <p className="text-[11px] text-slate-600">
          Our Legal & Compliance desk is available Monday through Saturday (9:30 AM to 6:30 PM).
        </p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <a
            href="tel:18002008899"
            className="inline-flex items-center gap-1 rounded-xl bg-white border border-blue-300 px-3 py-1.5 text-[11px] font-bold text-[#0B56D0] shadow-xs active:scale-95"
          >
            <PhoneCall size={12} />
            <span>1800-200-8899</span>
          </a>
          <a
            href="mailto:legal@dexterindia.in"
            className="inline-flex items-center gap-1 rounded-xl bg-white border border-blue-300 px-3 py-1.5 text-[11px] font-bold text-[#0B56D0] shadow-xs active:scale-95"
          >
            <Mail size={12} />
            <span>legal@dexterindia.in</span>
          </a>
        </div>
      </div>
    </div>
  )
}

