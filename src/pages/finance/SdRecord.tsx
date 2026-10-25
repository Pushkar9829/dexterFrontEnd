import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Check,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  FileCheck2,
  Landmark,
  Save,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import {
  DEPOSIT_CATEGORIES,
  SD_BANKS,
  SD_PAYMENT_TYPES,
  createEmptySecurityDeposit,
  type SecurityDeposit,
} from '@/data/financeSd'
import {
  getSecurityDeposit,
  nextDepositId,
  nextReceiptNo,
  saveSecurityDeposit,
} from '@/data/financeSdStore'

const STEPS = [
  { id: 1, title: 'Franchisee & Site\nDetails' },
  { id: 2, title: 'Payment & Transaction\nDetails' },
  { id: 3, title: 'Franchise Bank &\nAccount' },
  { id: 4, title: 'Verification &\nDocuments' },
]

export default function SdRecordPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'

  const [currentStep, setCurrentStep] = useState(1)
  const [showMaskedAccount, setShowMaskedAccount] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize deposit state
  const [deposit, setDeposit] = useState<SecurityDeposit>(() => {
    if (!isNew && id) {
      const found = getSecurityDeposit(id)
      if (found) return JSON.parse(JSON.stringify(found))
    }
    const empty = createEmptySecurityDeposit()
    empty.id = nextDepositId()
    empty.receiptNo = nextReceiptNo()
    return empty
  })

  // Watch for ID changes
  useEffect(() => {
    if (!isNew && id) {
      const found = getSecurityDeposit(id)
      if (found) {
        setDeposit(JSON.parse(JSON.stringify(found)))
      }
    }
  }, [id, isNew])

  const updateField = <K extends keyof SecurityDeposit>(key: K, value: SecurityDeposit[K]) => {
    setDeposit((prev) => ({ ...prev, [key]: value }))
  }

  // Handle Document Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast('Attachment size must be less than 5 MB', 'info')
      return
    }
    updateField('attachmentName', file.name)
    updateField('attachmentSize', file.size)
    toast(`Uploaded ${file.name}`)
  }

  // Save Draft
  const handleSaveDraft = () => {
    if (!deposit.franchiseeName.trim()) {
      toast('Please enter a Franchisee Name before saving draft', 'info')
      return
    }
    const saved = saveSecurityDeposit({
      ...deposit,
      status: deposit.status || 'Pending Verification',
    })
    toast(`Draft saved for deposit ${saved.id}`)
  }

  // Validation
  const handleValidate = () => {
    if (!deposit.franchiseeName.trim()) {
      toast('Franchisee Name is required', 'info')
      setCurrentStep(1)
      return false
    }
    if (!deposit.siteId.trim()) {
      toast('Site ID is required', 'info')
      setCurrentStep(1)
      return false
    }
    if (!deposit.amount.trim() || Number(deposit.amount) <= 0) {
      toast('Valid deposit amount is required', 'info')
      setCurrentStep(2)
      return false
    }
    if (!deposit.txnNumber.trim()) {
      toast('TXN / UTR Number is required', 'info')
      setCurrentStep(2)
      return false
    }
    toast('All required deposit details are valid!', 'info')
    return true
  }

  // Submit / Approve Deposit
  const handleSubmit = (approve = false) => {
    if (!handleValidate()) return
    const now = new Date().toISOString()
    const nowFormatted = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const toSave: SecurityDeposit = {
      ...deposit,
      status: approve ? 'Verified' : deposit.status || 'Pending Verification',
      verifiedBy: approve ? deposit.verifiedBy || 'Finance Operator' : deposit.verifiedBy,
      verifiedAt: approve ? nowFormatted : deposit.verifiedAt,
      updatedAt: now,
    }

    const saved = saveSecurityDeposit(toSave)
    toast(
      approve
        ? `Security Deposit ${saved.id} verified and approved!`
        : `Security Deposit ${saved.id} saved successfully!`,
    )
    navigate('/finance/sd')
  }

  return (
    <div className="mx-auto max-w-[1320px] pb-16">
      {/* Top Header Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#1E293B]">
            {isNew ? 'Record Security Deposit' : `Security Deposit · ${deposit.id}`}
          </h1>
          <p className="mt-0.5 text-[12.5px] text-[#64748B]">
            {isNew
              ? 'Enter franchisee security deposit details, bank transfer credentials, and verification advice.'
              : `Review and verify security deposit records for ${deposit.franchiseeName} (${deposit.atmId}).`}
          </p>
        </div>

        {/* Action Buttons matching Employee flow */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSaveDraft}
            className="border-[#CBD5E1] bg-white text-[#334155] shadow-xs hover:bg-[#F8FAFC]"
          >
            <Save size={14} className="mr-1.5" /> Save Draft
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleValidate}
            className="border-emerald-200 bg-white text-emerald-700 shadow-xs hover:bg-emerald-50"
          >
            <CheckCircle2 size={14} className="mr-1.5" /> Validate
          </Button>

          {currentStep > 1 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              className="border-[#CBD5E1] bg-white text-[#334155] shadow-xs hover:bg-[#F8FAFC]"
            >
              <ArrowLeft size={14} className="mr-1.5" /> Previous
            </Button>
          )}

          {currentStep < 4 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setCurrentStep((s) => Math.min(4, s + 1))}
              className="bg-[#0066FF] text-white shadow-xs hover:bg-[#0052cc]"
            >
              Next <ArrowRight size={14} className="ml-1.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => handleSubmit(true)}
              className="bg-[#0066FF] text-white shadow-xs hover:bg-[#0052cc]"
            >
              <CheckCircle2 size={14} className="mr-1.5" /> Verify &amp; Approve
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => navigate('/finance/sd')}
            className="border-[#CBD5E1] bg-white text-[#475569] shadow-xs hover:bg-[#F8FAFC]"
          >
            <X size={14} className="mr-1.5" /> Cancel
          </Button>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="mb-6 rounded-xl border border-[#DCE8F6] bg-white px-6 py-4 shadow-xs">
        <div className="relative flex items-center justify-between">
          {/* Connector Line behind steps */}
          <div className="absolute top-[18px] left-[8%] right-[8%] -z-0 h-[2px] bg-[#E2E8F0]" />

          {STEPS.map((step) => {
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className="group relative z-10 flex flex-1 flex-col items-center text-center focus:outline-none"
              >
                {/* Step Circle */}
                <div
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-full text-[13px] font-semibold transition-all duration-200',
                    isActive
                      ? 'border-2 border-[#0066FF] bg-[#0066FF] text-white shadow-[0_0_0_4px_rgba(0,102,255,0.18)]'
                      : isCompleted
                        ? 'border-2 border-[#0066FF] bg-[#0066FF] text-white'
                        : 'border-2 border-[#CBD5E1] bg-white text-[#64748B] group-hover:border-[#94A3B8]',
                  )}
                >
                  {isCompleted ? <Check size={16} strokeWidth={2.5} /> : step.id}
                </div>

                {/* Step Label */}
                <span
                  className={cn(
                    'mt-2 whitespace-pre-line text-[11.5px] leading-tight font-medium transition-colors',
                    isActive
                      ? 'font-bold text-[#0066FF]'
                      : isCompleted
                        ? 'text-[#1E293B]'
                        : 'text-[#64748B] group-hover:text-[#1E293B]',
                  )}
                >
                  {step.title}
                </span>

                {/* Active Indicator Underline */}
                {isActive && (
                  <div className="mt-2.5 h-[3px] w-24 rounded-full bg-[#0066FF]" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* STEP 1: Franchisee & Site Details */}
      {currentStep === 1 && (
        <div className="overflow-hidden rounded-xl border border-[#DCE8F6] bg-white shadow-xs">
          <div className="flex items-center gap-2 border-b border-[#E2EEFB] bg-[#F0F7FD] px-5 py-3 text-[#0066FF]">
            <Building size={17} className="text-[#0066FF]" />
            <h2 className="text-[13.5px] font-bold text-[#0066FF]">
              1. Franchisee &amp; Site Information
            </h2>
          </div>

          <div className="space-y-4 p-5">
            {/* Row 1: Franchisee Name, Franchisee No, HPY Account */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Franchisee Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={deposit.franchiseeName}
                  onChange={(e) => updateField('franchiseeName', e.target.value)}
                  placeholder="e.g. Rameshwar Kulkarni"
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Franchisee Contact No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={deposit.franchiseeNo}
                  onChange={(e) => updateField('franchiseeNo', e.target.value)}
                  placeholder="e.g. 98220 41765"
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  HPY Account Number
                </label>
                <input
                  type="text"
                  value={deposit.hpyAccount}
                  onChange={(e) => updateField('hpyAccount', e.target.value)}
                  placeholder="e.g. HPY-9921408"
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Row 2: Site ID, ATM ID, Cash Live Date */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Site ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={deposit.siteId}
                  onChange={(e) => updateField('siteId', e.target.value)}
                  placeholder="e.g. ST-MH-PUN-00124"
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  ATM ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={deposit.atmId}
                  onChange={(e) => updateField('atmId', e.target.value)}
                  placeholder="e.g. DX-MH-01482"
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Cash Live Date
                </label>
                <input
                  type="date"
                  value={deposit.cashLiveDate}
                  onChange={(e) => updateField('cashLiveDate', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Payment & Transaction Details */}
      {currentStep === 2 && (
        <div className="overflow-hidden rounded-xl border border-[#DCE8F6] bg-white shadow-xs">
          <div className="flex items-center gap-2 border-b border-[#E2EEFB] bg-[#F0F7FD] px-5 py-3 text-[#0066FF]">
            <CreditCard size={17} className="text-[#0066FF]" />
            <h2 className="text-[13.5px] font-bold text-[#0066FF]">
              2. Transaction &amp; Payment Details
            </h2>
          </div>

          <div className="space-y-4 p-5">
            {/* Row 1: Deposit Category, Amount, Payment Type */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Deposit Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={deposit.depositCategory}
                  onChange={(e) => updateField('depositCategory', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  {DEPOSIT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Deposit Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={deposit.amount}
                  onChange={(e) => updateField('amount', e.target.value)}
                  placeholder="250000"
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 font-medium"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Payment Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={deposit.paymentType}
                  onChange={(e) => updateField('paymentType', e.target.value as any)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  {SD_PAYMENT_TYPES.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Payment Date, Transfer Time, TXN Number, Receipt No */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={deposit.paymentDate}
                  onChange={(e) => updateField('paymentDate', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Payment Transfer Time
                </label>
                <input
                  type="time"
                  step="1"
                  value={deposit.transferTime}
                  onChange={(e) => updateField('transferTime', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  TXN / UTR Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={deposit.txnNumber}
                  onChange={(e) => updateField('txnNumber', e.target.value)}
                  placeholder="e.g. TXN9824102948"
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] font-mono"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Receipt Number
                </label>
                <input
                  type="text"
                  value={deposit.receiptNo}
                  readOnly
                  className="h-9 w-full rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[12.5px] font-medium text-[#475569] outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Franchise Bank & Account */}
      {currentStep === 3 && (
        <div className="overflow-hidden rounded-xl border border-[#DCE8F6] bg-white shadow-xs">
          <div className="flex items-center gap-2 border-b border-[#E2EEFB] bg-[#F0F7FD] px-5 py-3 text-[#0066FF]">
            <Landmark size={17} className="text-[#0066FF]" />
            <h2 className="text-[13.5px] font-bold text-[#0066FF]">
              3. Franchise Bank &amp; Account Details
            </h2>
          </div>

          <div className="space-y-4 p-5">
            {/* Row 1: Account Holder, Bank Name, Branch Name */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Account Holder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={deposit.accountHolder}
                  onChange={(e) => updateField('accountHolder', e.target.value)}
                  placeholder="Name as registered with bank"
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  FR Bank Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={deposit.frBankName}
                  onChange={(e) => updateField('frBankName', e.target.value)}
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  {SD_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  Bank Branch Name
                </label>
                <input
                  type="text"
                  value={deposit.branchName}
                  onChange={(e) => updateField('branchName', e.target.value)}
                  placeholder="e.g. Kothrud Branch"
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Row 2: Account Number (with eye toggle), IFSC Code */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  FR Bank Account Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showMaskedAccount ? 'password' : 'text'}
                    value={deposit.frAccount}
                    onChange={(e) => updateField('frAccount', e.target.value)}
                    placeholder="Enter full account number"
                    className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 pr-9 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMaskedAccount(!showMaskedAccount)}
                    className="absolute right-2.5 top-2.5 text-[#64748B] hover:text-[#0066FF]"
                  >
                    {showMaskedAccount ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                  FR IFSC Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={deposit.frIfsc}
                  onChange={(e) => updateField('frIfsc', e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0001234"
                  className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] uppercase outline-none focus:border-[#0066FF] font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Verification & Documents */}
      {currentStep === 4 && (
        <div className="space-y-5">
          {/* Document Attachment Box */}
          <div className="overflow-hidden rounded-xl border border-[#DCE8F6] bg-white shadow-xs">
            <div className="flex items-center gap-2 border-b border-[#E2EEFB] bg-[#F0F7FD] px-5 py-3 text-[#0066FF]">
              <FileCheck2 size={17} className="text-[#0066FF]" />
              <h2 className="text-[13.5px] font-bold text-[#0066FF]">
                4. Bank Deposit Slip &amp; Document Attachment
              </h2>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* File Attachment Drop/Preview */}
                <div className="rounded-lg border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFD] p-5 text-center">
                  {deposit.attachmentName ? (
                    <div className="flex flex-col items-center">
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600 mb-2">
                        <FileCheck2 size={24} />
                      </div>
                      <span className="font-semibold text-[#1E293B] text-[13px]">
                        {deposit.attachmentName}
                      </span>
                      <span className="text-[11px] text-[#64748B] mt-0.5">
                        {deposit.attachmentSize > 0
                          ? `${Math.round(deposit.attachmentSize / 1024)} KB`
                          : 'Attached Document'}
                      </span>
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-7 text-[11px]"
                        >
                          Replace File
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            updateField('attachmentName', '')
                            updateField('attachmentSize', 0)
                          }}
                          className="h-7 text-[11px] text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#EAF2FD] text-[#0066FF] mb-2">
                        <Upload size={22} />
                      </div>
                      <div className="text-[13px] font-semibold text-[#1E293B]">
                        Upload Payment Advice / Deposit Challan
                      </div>
                      <div className="text-[11.5px] text-[#64748B] mt-1 mb-3">
                        Attach scanned bank receipt, NEFT/RTGS challan, or cheque counterfoil (Max 5 MB)
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-[#0066FF] text-white"
                      >
                        <Upload size={13} className="mr-1" /> Choose File
                      </Button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Verification Status & Audit Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                      Verification Status
                    </label>
                    <select
                      value={deposit.status}
                      onChange={(e) => updateField('status', e.target.value as any)}
                      className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                    >
                      <option value="Verified">Verified (Cleared &amp; Approved)</option>
                      <option value="Pending Verification">Pending Verification</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Refunded">Refunded</option>
                      <option value="Disputed">Disputed / Mismatched</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                        Verified By
                      </label>
                      <input
                        type="text"
                        value={deposit.verifiedBy}
                        onChange={(e) => updateField('verifiedBy', e.target.value)}
                        placeholder="Operator name"
                        className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                        Verified Date / Time
                      </label>
                      <input
                        type="text"
                        value={deposit.verifiedAt}
                        onChange={(e) => updateField('verifiedAt', e.target.value)}
                        placeholder="e.g. 19 Oct 2025 11:20 AM"
                        className="h-9 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#1E293B]">
                      Verifier Reconciliation Remarks
                    </label>
                    <textarea
                      rows={3}
                      value={deposit.verifierRemarks}
                      onChange={(e) => updateField('verifierRemarks', e.target.value)}
                      placeholder="Enter verification notes, bank statement cross-reference, or reconciliation remarks..."
                      className="w-full rounded-md border border-[#CBD5E1] bg-white p-2.5 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sticky Footer Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-[#E2EEFB] bg-white/80 p-4 backdrop-blur-xs rounded-xl shadow-xs">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => navigate('/finance/sd')}
          className="border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]"
        >
          <X size={15} className="mr-1.5" /> Back to Deposit List
        </Button>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleSaveDraft}
            className="border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC]"
          >
            <Save size={15} className="mr-1.5" /> Save Draft
          </Button>

          {currentStep > 1 && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              className="border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC]"
            >
              <ArrowLeft size={15} className="mr-1.5" /> Previous
            </Button>
          )}

          {currentStep < 4 ? (
            <Button
              type="button"
              size="md"
              onClick={() => setCurrentStep((s) => Math.min(4, s + 1))}
              className="bg-[#0066FF] px-6 text-white hover:bg-[#0052cc]"
            >
              Next <ArrowRight size={15} className="ml-1.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="md"
              onClick={() => handleSubmit(true)}
              className="bg-[#0066FF] px-6 text-white hover:bg-[#0052cc]"
            >
              <CheckCircle2 size={15} className="mr-1.5" /> Verify &amp; Approve
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
