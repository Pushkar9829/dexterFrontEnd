import { useState } from 'react'
import {
  Scale,
  FileCheck,
  CreditCard,
  FileSignature,
  FileText,
  Bell,
  ArrowLeft,
  ChevronRight,
  Upload,
  Download,
  CheckCircle,
  FileKey
} from 'lucide-react'
import { CardCornerAccent } from '../components/CardCornerAccent'

interface MobileLegalScreenProps {
  onBackToMore: () => void
}

type LegalSub = 'list' | 'pvc' | 'kyc' | 'cheques' | 'agreement' | 'loi' | 'affidavit' | 'notice'

export function MobileLegalScreen({ onBackToMore }: MobileLegalScreenProps) {
  const [activeSub, setActiveSub] = useState<LegalSub>('list')

  // KYC State matching 5.00.47 PM & 5.00.48 PM
  const [aadhaar] = useState('5481 9283 1029')
  const [pan] = useState('ABCDE1234F')
  const [gstin] = useState('09ABCDE1234F1Z5')
  const [address] = useState('12, Main Market, Bewar')
  const [pincode] = useState('205301')
  const [state] = useState('Uttar Pradesh')
  const [city] = useState('Mainpuri')
  const [kycStatus] = useState('VERIFIED')

  // PVC State
  const [pvcIssueDate] = useState('12-01-2026')
  const [pvcExpiryDate] = useState('11-01-2027')
  const [pvcStatus] = useState('Verified by CRM Team')

  // Cheque State
  const [chequeNo] = useState('449102')
  const [chequePurpose] = useState('Security Deposit Guarantee')
  const [postalMethod] = useState('Speed Post')
  const [docketNo] = useState('EU992817291IN')

  const submodules = [
    { id: 'pvc' as LegalSub, title: 'PVC', icon: FileCheck, desc: 'Police Verification Certificate & validity' },
    { id: 'kyc' as LegalSub, title: 'KYC', icon: CreditCard, desc: 'Aadhaar, PAN, GSTIN & biometric verification' },
    { id: 'cheques' as LegalSub, title: 'Cheques', icon: FileKey, desc: 'Cheque submission, postal method & docket' },
    { id: 'agreement' as LegalSub, title: 'Agreement', icon: FileSignature, desc: 'Franchise master agreements per site' },
    { id: 'loi' as LegalSub, title: 'LOI', icon: FileText, desc: 'Letter of Intent download & signed copy upload' },
    { id: 'affidavit' as LegalSub, title: 'Affidavite', icon: Scale, desc: 'E-Stamp legal affidavits & notary verification' },
    { id: 'notice' as LegalSub, title: 'Notice', icon: Bell, desc: 'Official compliance circulars & notices' }
  ]

  if (activeSub === 'list') {
    return (
      <div className="space-y-4 pb-6 pt-3 px-3">
        {/* Banner matching 10.26.38 PM.jpeg */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToMore}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-blue-200 font-semibold">
                <Scale size={14} />
                <span>Statutory Compliance</span>
              </div>
              <h1 className="text-xl font-black text-white">Legal</h1>
            </div>
          </div>
          <span className="rounded-xl bg-white/20 px-2.5 py-1 text-xs font-bold text-white border border-white/20">
            7 Documents
          </span>
        </div>

        {/* 7 Full-width Submodule Cards matching screenshot */}
        <div className="space-y-2.5">
          {submodules.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSub(item.id)}
                className="group relative flex w-full items-center justify-between rounded-2xl border border-blue-200/90 bg-white p-3.5 shadow-xs hover:border-blue-400 hover:shadow-md active:scale-[0.99] transition-all overflow-hidden text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50/80 group-hover:bg-blue-100 transition-colors">
                    <Icon size={24} className="text-[#0C3E98] stroke-[2]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0B2A6B] group-hover:text-blue-700">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-blue-600">
                  <ChevronRight size={18} />
                </div>

                <CardCornerAccent />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // KYC Screen (Matching WhatsApp Image 2026-11-12 at 5.00.47 PM & 5.00.48 PM)
  if (activeSub === 'kyc') {
    return (
      <div className="space-y-4 pb-6 pt-3 px-3">
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSub('list')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="font-bold text-base">KYC / Bank Details</h2>
          </div>
          <span className="rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold">
            {kycStatus}
          </span>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3 text-xs">
          {/* Aadhaar Card */}
          <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50/60">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-slate-700">Aadhaar Card</span>
              <span className="font-mono font-bold text-slate-900">{aadhaar}</span>
            </div>
            <button
              type="button"
              onClick={() => alert('Viewing Aadhaar Document Image')}
              className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1"
            >
              <CheckCircle size={12} className="text-emerald-600" /> Aadhaar Verified via UIDAI OTP
            </button>
          </div>

          {/* PAN Card */}
          <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50/60">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-slate-700">PAN Card No</span>
              <span className="font-mono font-bold text-slate-900">{pan}</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle size={12} /> Verified against NSDL Database
            </span>
          </div>

          {/* GSTIN */}
          <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50/60">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-slate-700">GSTIN</span>
              <span className="font-mono font-bold text-slate-900">{gstin}</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle size={12} /> Active Regular Taxpayer
            </span>
          </div>

          {/* Address & City */}
          <div className="space-y-2">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Registered Address</label>
              <input
                type="text"
                readOnly
                value={address}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-800"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">PIN Code</label>
                <input
                  type="text"
                  readOnly
                  value={pincode}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">State</label>
                <input
                  type="text"
                  readOnly
                  value={state}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2 font-semibold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">City</label>
                <input
                  type="text"
                  readOnly
                  value={city}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Verification Status Banner */}
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
            <span className="text-[11px] font-black text-emerald-800 block">
              VERIFICATION STATUS: 100% COMPLETE
            </span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">
              One-Time KYC verified. Data locked against unauthorized alteration.
            </span>
          </div>
        </div>
      </div>
    )
  }

  // PVC Screen
  if (activeSub === 'pvc') {
    return (
      <div className="space-y-4 pb-6 pt-3 px-3">
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSub('list')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="font-bold text-base">Police Verification (PVC)</h2>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <span className="text-[10px] text-slate-500 block">Issue Date</span>
              <span className="font-bold text-slate-800">{pvcIssueDate}</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <span className="text-[10px] text-slate-500 block">Expiry Date</span>
              <span className="font-bold text-slate-800">{pvcExpiryDate}</span>
            </div>
          </div>

          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-emerald-800 block">Current Status</span>
              <span className="text-[10px] text-emerald-600">{pvcStatus}</span>
            </div>
            <button
              onClick={() => alert('Downloading Police Verification Certificate')}
              className="text-xs font-bold text-blue-600 underline"
            >
              View Document
            </button>
          </div>

          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center">
            <Upload size={20} className="mx-auto text-blue-600 mb-1" />
            <p className="text-[11px] font-bold text-slate-700">Upload New Annual PVC Certificate</p>
            <button
              onClick={() => alert('PVC file upload dialog')}
              className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-lg font-bold text-[10px]"
            >
              Upload PDF
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Cheques Screen
  if (activeSub === 'cheques') {
    return (
      <div className="space-y-4 pb-6 pt-3 px-3">
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSub('list')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="font-bold text-base">Cheques Management</h2>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">Cheque Number</label>
            <input
              type="text"
              readOnly
              value={chequeNo}
              className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono font-bold text-slate-800"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">Purpose</label>
            <input
              type="text"
              readOnly
              value={chequePurpose}
              className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-800"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Postal Method</label>
              <input
                type="text"
                readOnly
                value={postalMethod}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Docket Number</label>
              <input
                type="text"
                readOnly
                value={docketNo}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono font-bold text-blue-700"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Generic document viewer for Agreement, LOI, Affidavit, Notice
  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveSub('list')}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
          >
            <ArrowLeft size={16} />
          </button>
          <h2 className="font-bold text-base uppercase">{activeSub}</h2>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3 text-xs">
        <p className="text-slate-600">
          Official statutory documents mapped to your registered site IDs:
        </p>

        <div className="space-y-2">
          {['Site: 2014124545 (Bewar, Mainpuri)', 'Site: 2014124546 (Mainpuri City)'].map((siteName, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div>
                <span className="font-bold text-slate-800 block">{siteName}</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Active Signed Copy</span>
              </div>
              <button
                onClick={() => alert(`Downloading ${activeSub.toUpperCase()} for ${siteName}`)}
                className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[10px] flex items-center gap-1"
              >
                <Download size={12} /> Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
