import { useState } from 'react'
import {
  Shield,
  ArrowLeft,
  Search,
  Lock,
  Server,
  EyeOff,
  UserCheck,
  Building,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  ShieldCheck,
  HardDrive
} from 'lucide-react'
import { CardCornerAccent } from '../components/CardCornerAccent'

interface MobilePrivacyScreenProps {
  onBack: () => void
}

interface PrivacySection {
  id: string
  title: string
  tag: string
  summary: string
  icon: typeof Shield
  category: 'collect' | 'use' | 'storage' | 'sharing' | 'rights'
  points: { title: string; desc: string }[]
}

export function MobilePrivacyScreen({ onBack }: MobilePrivacyScreenProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>('sec-1')

  const categories = [
    { id: 'all', label: 'All Topics' },
    { id: 'collect', label: 'Data Collected' },
    { id: 'use', label: 'Purpose & Use' },
    { id: 'storage', label: 'Storage & Encryption' },
    { id: 'sharing', label: 'Bank Sharing' },
    { id: 'rights', label: 'Your Rights' }
  ]

  const sections: PrivacySection[] = [
    {
      id: 'sec-1',
      title: 'Information We Collect from Franchise Partners',
      tag: 'Section 1.0',
      icon: UserCheck,
      category: 'collect',
      summary: 'Identity credentials, KYC documents, banking information, and GPS telemetry required for WLA operations.',
      points: [
        {
          title: 'Identity & Statutory KYC Documents',
          desc: 'Masked Aadhaar XML, Permanent Account Number (PAN), Police Verification Certificate (PVC), and biometric/photographic proof submitted during onboarding.'
        },
        {
          title: 'Financial & Settlement Accounts',
          desc: 'Bank account number, IFSC code, cancelled cheque, Cash Loading Fund (CLF) ledger details, and Goods & Services Tax Identification Number (GSTIN).'
        },
        {
          title: 'Geotagged Location & Hardware Telemetry',
          desc: 'GPS coordinates captured during site surveys, ATM installation audits, and daily Cash Balance & CBR loading submissions to verify physical custodian presence.'
        },
        {
          title: 'Surveillance & Counter Logs',
          desc: 'EOD counter receipts, CCTV operational health telemetry, and ATM cassette status captured for switch audit reconciliation.'
        }
      ]
    },
    {
      id: 'sec-2',
      title: 'Lawful Grounds & Purpose of Data Processing',
      tag: 'Section 2.0',
      icon: Lock,
      category: 'use',
      summary: 'Processing rationale anchored in RBI regulatory compliance, cash protection, and commission calculations.',
      points: [
        {
          title: 'RBI White Label ATM Regulatory Mandate',
          desc: 'Compliance with Reserve Bank of India Master Directions on ATM security, KYC verification of franchise custodians, and cash supply chain verification.'
        },
        {
          title: 'Fraud Detection & Cash Skimming Prevention',
          desc: 'Real-time validation of cash loading indents, dispenser counter verification, and CCTV health alerts to protect against physical or cyber theft.'
        },
        {
          title: 'Commission Payout & Tax Deductions',
          desc: 'Accurate computation of monthly interchange earnings, automated TDS filing under Section 194C/194J, and GST e-invoicing.'
        }
      ]
    },
    {
      id: 'sec-3',
      title: 'Data Storage, Sovereignty & Security Architecture',
      tag: 'Section 3.0',
      icon: HardDrive,
      category: 'storage',
      summary: 'Sovereign Indian data residency, military-grade AES-256 encryption, and zero third-party monetization.',
      points: [
        {
          title: '100% Indian Data Localization',
          desc: 'In strict compliance with RBI circular on Storage of Payment System Data, all partner records and transaction logs reside exclusively in tier-IV data centers within the Republic of India.'
        },
        {
          title: 'End-to-End Encryption',
          desc: 'Data in transit is secured using TLS 1.3 protocol. Sensitive financial identifiers and stored documents are encrypted at rest using AES-256 bit encryption keys.'
        },
        {
          title: 'Role-Based Access Control (RBAC)',
          desc: 'Strict least-privilege access: only verified Dexter India support personnel and assigned field engineers can view site-level telemetry under audit logging.'
        }
      ]
    },
    {
      id: 'sec-4',
      title: 'Data Sharing with Regulated Financial Entities',
      tag: 'Section 4.0',
      icon: Building,
      category: 'sharing',
      summary: 'Authorized data exchange with Sponsor Banks (Axis / ICICI Bank) and NPCI for switch clearing.',
      points: [
        {
          title: 'Sponsor Banks (Axis Bank & ICICI Bank)',
          desc: 'Indent requisitions, daily CBR loading confirmations, and Cash Loading Fund settlement balances are shared over dedicated secure banking APIs.'
        },
        {
          title: 'National Payments Corporation of India (NPCI)',
          desc: 'Transaction switch logs and dispute investigation files are processed through NPCI National Financial Switch (NFS) for dispute resolution.'
        },
        {
          title: 'Law Enforcement & Statutory Inquiries',
          desc: 'Records are disclosed to legal authorities strictly pursuant to valid judicial orders, formal police investigation requisitions, or PMLA audits.'
        },
        {
          title: 'No Commercial Sale of Data',
          desc: 'Dexter India does not sell, trade, rent, or lease any Franchise Partner personal or commercial data to advertising brokers or marketing agencies.'
        }
      ]
    },
    {
      id: 'sec-5',
      title: 'Your Rights under DPDP Act 2023 & Retention Policy',
      tag: 'Section 5.0',
      icon: ShieldCheck,
      category: 'rights',
      summary: 'Your statutory rights to access, rectify, and review your franchise record under Digital Personal Data Protection Act.',
      points: [
        {
          title: 'Right to Access & Information',
          desc: 'Franchise partners may request a summary of personal information processed by Dexter India via the My Profile portal or DPO desk.'
        },
        {
          title: 'Right to Correction & Updating',
          desc: 'You have the right to promptly update changes to contact details, settlement bank accounts, or authorized signatory documentation.'
        },
        {
          title: 'Statutory Retention Mandate',
          desc: 'Under the Prevention of Money Laundering Act (PMLA) and RBI directions, banking transaction logs and signed agreements must be retained for 10 (ten) calendar years.'
        }
      ]
    }
  ]

  const filteredSections = sections.filter((s) => {
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.points.some(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
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
                <Shield size={13} />
                <span>Security & Trust Standard</span>
              </div>
              <h1 className="text-lg font-black text-white">Privacy Policy</h1>
            </div>
          </div>
          <span className="rounded-xl bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white border border-white/20">
            DPDP 2023
          </span>
        </div>
      </div>

      {/* 3 Core Trust Pillars Banner */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#BED7FA] bg-gradient-to-b from-[#F2F7FE] via-[#F8FBFF] to-[#E8F2FC] p-3 text-center shadow-[0_3px_10px_rgba(20,70,170,0.05)]">
          <Lock size={18} className="text-[#0B56D0] stroke-[2.2]" />
          <h4 className="mt-1.5 text-[10.5px] font-black text-[#061D52]">AES-256</h4>
          <p className="text-[9.5px] text-slate-500 font-medium">Bank-Grade</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#BED7FA] bg-gradient-to-b from-[#F2F7FE] via-[#F8FBFF] to-[#E8F2FC] p-3 text-center shadow-[0_3px_10px_rgba(20,70,170,0.05)]">
          <Server size={18} className="text-emerald-600 stroke-[2.2]" />
          <h4 className="mt-1.5 text-[10.5px] font-black text-[#061D52]">India Cloud</h4>
          <p className="text-[9.5px] text-slate-500 font-medium">RBI Localized</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#BED7FA] bg-gradient-to-b from-[#F2F7FE] via-[#F8FBFF] to-[#E8F2FC] p-3 text-center shadow-[0_3px_10px_rgba(20,70,170,0.05)]">
          <EyeOff size={18} className="text-indigo-600 stroke-[2.2]" />
          <h4 className="mt-1.5 text-[10.5px] font-black text-[#061D52]">No Ads</h4>
          <p className="text-[9.5px] text-slate-500 font-medium">Zero Data Sale</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Aadhaar, GPS, bank accounts, rights..."
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

      {/* Policy Accordion Sections */}
      <div className="space-y-3">
        {filteredSections.map((sec) => {
          const isExpanded = expandedId === sec.id
          const Icon = sec.icon
          return (
            <div
              key={sec.id}
              className="relative overflow-hidden rounded-2xl border border-[#BED7FA] bg-gradient-to-b from-[#F2F7FE] via-[#F8FBFF] to-[#E8F2FC] shadow-[0_3px_12px_rgba(20,70,170,0.06)] transition-all"
            >
              {/* Accordion Header */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : sec.id)}
                className="flex w-full items-start justify-between p-3.5 text-left"
              >
                <div className="flex items-start gap-2.5 pr-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100/80 text-[#0B56D0]">
                    <Icon size={17} className="stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-[#0B56D0] uppercase tracking-wider">
                      {sec.tag}
                    </span>
                    <h3 className="text-xs font-black text-[#061D52] mt-0.5 leading-snug">
                      {sec.title}
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-600 leading-normal line-clamp-2">
                      {sec.summary}
                    </p>
                  </div>
                </div>
                <div className="mt-1 shrink-0 text-slate-400">
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {/* Accordion Content */}
              {isExpanded && (
                <div className="border-t border-blue-200/70 bg-white/70 p-3.5 space-y-2.5 text-[11.5px] leading-relaxed text-slate-700">
                  {sec.points.map((p, idx) => (
                    <div key={idx} className="rounded-xl border border-blue-100/70 bg-white p-2.5 shadow-2xs">
                      <h4 className="font-bold text-[#061D52] text-[11.5px] flex items-center gap-1.5">
                        <CheckCircle size={13} className="text-emerald-600 shrink-0" />
                        <span>{p.title}</span>
                      </h4>
                      <p className="mt-1 text-slate-600 text-[11px] leading-normal pl-4.5">
                        {p.desc}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Dexter Signature Corner Accent */}
              <CardCornerAccent width={52} height={34} />
            </div>
          )
        })}

        {filteredSections.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <Search size={28} className="mx-auto text-blue-300 mb-2" />
            <p className="text-xs font-bold text-slate-600">No topic matched "{searchQuery}"</p>
            <p className="text-[11px] text-slate-400 mt-1">Try searching for keywords like "Aadhaar", "GPS", or "sharing"</p>
          </div>
        )}
      </div>

      {/* Data Protection Officer (DPO) Contact Card */}
      <div className="rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-[#0B56D0]" />
          <h4 className="text-xs font-black text-[#061D52]">Data Protection & Grievance Officer</h4>
        </div>
        <p className="text-[11px] text-slate-600 leading-normal">
          For DPDP compliance inquiries, data subject access requests, or grievance redressal, contact our designated officer:
        </p>
        <div className="pt-1 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-blue-100">
            <span className="text-slate-500 font-medium">Grievance Officer</span>
            <span className="font-bold text-[#061D52]">Sh. Ankit Sharma (Head of Infosec)</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-blue-100">
            <span className="text-slate-500 font-medium">Direct Email</span>
            <a href="mailto:dpo@dexterindia.in" className="font-bold text-[#0B56D0] flex items-center gap-1">
              <Mail size={12} />
              dpo@dexterindia.in
            </a>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-blue-100">
            <span className="text-slate-500 font-medium">Compliance SLA</span>
            <span className="font-bold text-slate-700">Response within 48 business hours</span>
          </div>
        </div>
      </div>
    </div>
  )
}

