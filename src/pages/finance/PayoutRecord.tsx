import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Building2,
  FileText,
  User,
  Hash,
  Landmark,
  Save,
  CreditCard,
  Mail,
  ListFilter,
} from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import {
  PAYOUT_STATUSES,
  PAN_RE,
  IFSC_RE,
  ACC_RE,
  emptyPayout,
  getPayout,
  savePayout,
  type PayoutRecord,
} from '@/data/financePayout'
import { SITES, FRANCHISEES } from '@/data/cbrSites'

const BANKS_LIST = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Punjab National Bank',
  'Canara Bank',
  'Bank of Baroda',
  'Union Bank of India',
  'Kotak Mahindra Bank',
  'IndusInd Bank',
  'IDBI Bank',
  'Federal Bank',
]

export default function PayoutRecordPage() {
  const navigate = useNavigate()
  const { id = '' } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'

  const [record, setRecord] = useState<PayoutRecord>(() => {
    if (!isNew && id) {
      const found = getPayout(id)
      if (found) return JSON.parse(JSON.stringify(found))
    }
    return emptyPayout()
  })

  useEffect(() => {
    if (!isNew && id) {
      const found = getPayout(id)
      if (found) {
        setRecord(JSON.parse(JSON.stringify(found)))
      }
    }
  }, [id, isNew])

  // Lists for Dropdowns
  const atmOptions = useMemo(
    () => Array.from(new Set(SITES.map((s) => s.atmId).filter(Boolean))).sort(),
    []
  )

  // Auto-fill details when ATM ID is chosen
  const handleAtmChange = (atmId: string) => {
    const matchedSite = SITES.find((s) => s.atmId === atmId)
    if (matchedSite) {
      const fr = FRANCHISEES.find((f) => f.id === matchedSite.franchiseId)
      setRecord((prev) => ({
        ...prev,
        atmId,
        loiCode: matchedSite.loi,
        panName: fr?.panName || prev.panName,
        panNo: fr?.pan || prev.panNo,
        accName: fr?.panName || prev.accName,
        accNo: fr?.accNo || prev.accNo,
        bankName: fr?.bank || prev.bankName,
        ifsc: fr?.ifsc || prev.ifsc,
        emailSubject: `Payout advice – ${atmId} – ${fr?.name || ''}`,
      }))
      toast(`Loaded details for ATM ${atmId}`)
    } else {
      setRecord((prev) => ({ ...prev, atmId }))
    }
  }

  const updateField = <K extends keyof PayoutRecord>(key: K, value: PayoutRecord[K]) => {
    setRecord((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = (isDraft = false) => {
    if (!isDraft) {
      if (!record.atmId && !record.loiCode) {
        toast('Please enter or select an ATM ID or LOI Code', 'info')
        return
      }
      if (record.panNo && !PAN_RE.test(record.panNo)) {
        toast('Invalid PAN format (e.g. ABCDE1234F)', 'info')
        return
      }
      if (record.ifsc && !IFSC_RE.test(record.ifsc)) {
        toast('Invalid IFSC format (e.g. HDFC0001834)', 'info')
        return
      }
      if (record.accNo && !ACC_RE.test(record.accNo)) {
        toast('Account number must be 9–18 digits', 'info')
        return
      }
    }

    const payload: PayoutRecord = {
      ...record,
      loiCode: record.loiCode.trim().toUpperCase(),
      atmId: record.atmId.trim().toUpperCase(),
      panNo: record.panNo.trim().toUpperCase(),
      ifsc: record.ifsc.trim().toUpperCase(),
      status: record.status || (isDraft ? 'Pending verification' : 'Active'),
    }

    const saved = savePayout(payload)
    toast(
      isDraft
        ? `Payout draft saved successfully`
        : isNew
          ? `Payout record ${saved.id} created successfully`
          : `Payout record ${saved.id} updated successfully`
    )
    navigate('/finance/payout')
  }

  return (
    <div className="space-y-4 pb-16 max-w-6xl mx-auto">
      {/* Breadcrumb: [Workspace] > [Finance] > Payout Data > new */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/finance" className="hover:text-[#0066FF] transition-colors">
          Finance
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/finance/payout" className="hover:text-[#0066FF] transition-colors">
          Payout
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">
          {isNew ? 'new' : record.id || id}
        </span>
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
            <CreditCard size={18} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[24px] font-bold tracking-tight text-slate-900 leading-tight">
                {isNew ? 'New Payout Record' : `Payout Record · ${record.id || id}`}
              </h1>
              {!isNew && record.status && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${record.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : record.status === 'Pending verification'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                >
                  {record.status}
                </span>
              )}
            </div>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              Settlement account details, PAN verification, bank routing, and disbursement instructions.
            </p>
          </div>
        </div>

        {!isNew && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              S.N. #{record.sn || 1}
            </span>
          </div>
        )}
      </div>

      {/* CARD 1: Identifiers & PAN Details */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#0066FF]" />
            <h2 className="text-[14px] font-bold text-[#0066FF]">
              1. Identifiers &amp; PAN Details
            </h2>
          </div>
          {record.id && (
            <span className="text-[11px] font-semibold text-[#0066FF] bg-white px-2 py-0.5 rounded border border-[#0066FF]/20 font-mono">
              {record.id}
            </span>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ATM ID * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ATM ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CreditCard
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <select
                  value={record.atmId || ''}
                  onChange={(e) => handleAtmChange(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all"
                >
                  <option value="">Select ATM ID</option>
                  {atmOptions.map((atm) => (
                    <option key={atm} value={atm}>
                      {atm}
                    </option>
                  ))}
                  {record.atmId && !atmOptions.includes(record.atmId) && (
                    <option value={record.atmId}>{record.atmId}</option>
                  )}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {/* LOI Code * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                LOI Code <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FileText
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.loiCode || ''}
                  onChange={(e) => updateField('loiCode', e.target.value.toUpperCase())}
                  placeholder="e.g. LOI-MH-PUN-00124"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all font-mono uppercase"
                />
              </div>
            </div>

            {/* S.N. Sequence */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                S.N. Sequence
              </label>
              <div className="relative">
                <Hash
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  readOnly
                  value={record.sn ? `Sequence #${record.sn}` : 'System Assigned on Save'}
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-slate-50 text-slate-500 outline-none cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PAN Name * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                PAN Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.panName || ''}
                  onChange={(e) => updateField('panName', e.target.value)}
                  placeholder="Full name as printed on PAN"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all font-medium uppercase"
                />
              </div>
            </div>

            {/* PAN Number * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                PAN Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Hash
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.panNo || ''}
                  onChange={(e) => updateField('panNo', e.target.value.toUpperCase())}
                  placeholder="10-char PAN (e.g. AAKFS4821K)"
                  maxLength={10}
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all font-mono uppercase"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: Settlement Account & Bank */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <Landmark size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">
            2. Settlement Account &amp; Bank
          </h2>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Acc. Name (Settlement) * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Acc. Name (Settlement) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.accName || ''}
                  onChange={(e) => updateField('accName', e.target.value)}
                  placeholder="Beneficiary / Account holder name"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all font-medium uppercase"
                />
              </div>
            </div>

            {/* Acc. No. (Settlement) * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Acc. Number (Settlement) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CreditCard
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.accNo || ''}
                  onChange={(e) => updateField('accNo', e.target.value.replace(/\D/g, ''))}
                  placeholder="9–18 digit account number"
                  maxLength={18}
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bank Name * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Bank Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <select
                  value={record.bankName || ''}
                  onChange={(e) => updateField('bankName', e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all truncate"
                >
                  <option value="">Select Settlement Bank</option>
                  {BANKS_LIST.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  {record.bankName && !BANKS_LIST.includes(record.bankName) && (
                    <option value={record.bankName}>{record.bankName}</option>
                  )}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {/* IFSC (Settlement) * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                IFSC (Settlement) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Landmark
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.ifsc || ''}
                  onChange={(e) => updateField('ifsc', e.target.value.toUpperCase())}
                  placeholder="11-char IFSC (e.g. HDFC0001834)"
                  maxLength={11}
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all font-mono uppercase"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 3: Email Subject & Status */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <ListFilter size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">
            3. Email Subject &amp; Status
          </h2>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payout Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Payout Status
              </label>
              <div className="relative">
                <ListFilter
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <select
                  value={record.status || 'Active'}
                  onChange={(e) => updateField('status', e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all"
                >
                  {PAYOUT_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Email Subject */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Email Subject
              </label>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.emailSubject || ''}
                  onChange={(e) => updateField('emailSubject', e.target.value)}
                  placeholder="e.g. Payout advice – DX-MH-01482 – Shree Sai"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 h-9.5 px-5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#0066FF] text-[12.5px] font-semibold transition-all shadow-xs"
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="inline-flex items-center gap-1.5 h-9.5 px-5 rounded-lg border border-[#0066FF] bg-white hover:bg-blue-50/60 text-[#0066FF] text-[12.5px] font-semibold transition-all shadow-xs"
          >
            <Save size={15} />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            className="inline-flex items-center gap-1.5 h-9.5 px-6 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12.5px] font-semibold transition-all shadow-sm"
          >
            <span>Save Payout Record</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
