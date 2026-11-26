import { useMemo, useState, useRef } from 'react'
import {
  Landmark,
  Coins,
  Banknote,
  FileBarChart,
  FileText,
  Percent,
  ShieldCheck,
  Sliders,
  ChevronRight,
  ArrowLeft,
  Upload,
  Download,
  CheckCircle,
  PlusCircle,
  FileCheck,
  Building2,
  Calendar,
  X,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react'
import { CardCornerAccent } from '../components/CardCornerAccent'
import { getMasterAccountForAtm, saveClfRecord, useClfRecords } from '@/data/financeClf'
import { periodLabel, uploadWla, uploadWlaAsync, useWlaStatements } from '@/data/wlaStatements'
import { apiEnabled } from '@/lib/api'
import { accessTds, openTdsAsync, useTdsLetters } from '@/data/tdsLetters'
import { gstStore, saveGst, type GstRecord } from '@/data/financeGst'
import { createEmptySecurityDeposit, saveSecurityDeposit, useSecurityDeposits } from '@/data/financeSdStore'
import { addAcChangeRequest, useAcChangeRequests } from '@/data/financeSettlementBank'
import { cbrMaster } from '@/data/cbr'
import { clMaster } from '@/data/cashLoadingRegisterStore'
import { dossierFor } from '@/data/franchises'
import { fmtDate, fmtDateTime, useMobileUser, useMyScope } from '../data/mobileSession'
import { fyOf, isoDate, myFinanceApiOn, myFinanceLoader, myFinanceSummary, rupeesToPaise, submitMyFinance, uploadMyFinanceFile } from '@/data/myFinanceApi'
import { ApiError } from '@/lib/api'

/** Backend refusal → one readable line (validation issues listed). */
const finErr = (e: unknown) => {
  if (e instanceof ApiError) {
    const issues = Array.isArray(e.details) ? (e.details as { path?: string; message?: string }[]).map((i) => `${i.path ? `${i.path}: ` : ''}${i.message ?? ''}`).join('; ') : ''
    return issues ? `${e.message} — ${issues}` : e.message
  }
  return e instanceof Error ? e.message : 'The server refused the submission.'
}

/** View model of a Finance › CLF record for the franchise tiles. */
type ClfConsolidatedRecord = {
  sn: number
  clfReference: string
  siteId: string
  depositAmount: number
  depositDate: string
  txnId: string
  expectedRefundDate: string
  refundAmount: number
  outstandingAmount: number
  status: string
}
const num = (v: string | number | undefined) => Number(String(v ?? '').replace(/[^\d.]/g, '')) || 0
const maskNo = (n?: string) => (n && n.length > 6 ? `${n.slice(0, 4)}${'*'.repeat(Math.max(2, n.length - 6))}${n.slice(-2)}` : n || '—')
const ddmmyyyy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}` : iso)
const MOBILE_TAG = '[App]'
/** GST submission files are kept in the record remark: "[App] signed=..|gstr2b=..|docs=a,b|note=..". */
function parseGstRemark(r: string) {
  const m = r.startsWith(MOBILE_TAG) ? r.slice(MOBILE_TAG.length).trim() : ''
  const get = (k: string) => (m.split('|').find((p) => p.startsWith(`${k}=`)) ?? '').slice(k.length + 1)
  return { signed: get('signed'), gstr2b: get('gstr2b'), docs: get('docs') ? get('docs').split(',') : [], note: get('note') }
}

interface MobileAccountsScreenProps {
  onBackToMore: () => void
}

export interface GstMonthItem {
  id: string
  month: string
  fYear: string
  invoiceNo: string
  invoiceDate: string
  basicAmount: number
  cgst: number
  sgst: number
  totalAmount: number
  dueDate: string
  status: 'Action Required' | 'Submitted' | 'Verified & Approved'
  signedInvoiceFile?: string
  gstr2bScreenshot?: string
  supportingDocs: string[]
  remarks?: string
  submissionDate?: string
}

type AccountSubmodule =
  | 'list'
  | 'settlement'
  | 'payout'
  | 'clf'
  | 'wla'
  | 'tds'
  | 'gst'
  | 'security-deposit'
  | 'dynamic-limit'

export function MobileAccountsScreen({ onBackToMore }: MobileAccountsScreenProps) {
  const [activeSub, setActiveSub] = useState<AccountSubmodule>('list')
  // API mode + Franchisee: the finance registers come from / go to /my/finance/* (own franchise only)
  const apiFin = myFinanceApiOn()
  const finLoad = myFinanceLoader.use()
  const finSummary = apiFin && finLoad.loaded ? myFinanceSummary() : null
  const [finBusy, setFinBusy] = useState(false)

  // ── data scoped to the signed-in franchise ──
  const user = useMobileUser()
  const { frId, franchise, sites, siteIds, atmIds } = useMyScope()
  const dossier = useMemo(() => (franchise ? dossierFor(franchise) : undefined), [franchise])
  const holderName = `${user?.name ?? franchise?.name ?? '—'}${franchise ? ` · ${franchise.name}` : ''}`

  // CLF (Finance › Cash Loading Fund register)
  const clfAll = useClfRecords()
  const clfRecords = useMemo<ClfConsolidatedRecord[]>(
    () =>
      clfAll
        .filter((r) => siteIds.has(r.siteId) || atmIds.has(r.atmId))
        .map((r, i) => ({
          sn: i + 1,
          clfReference: r.id,
          siteId: r.atmId,
          depositAmount: num(r.clfAmount),
          depositDate: r.transactionDate || r.paymentDate,
          txnId: r.utr || '—',
          expectedRefundDate: '',
          refundAmount: 0,
          outstandingAmount: num(r.clfAmount),
          status: r.isDraft ? 'Pending Verification' : `${r.clfStatus} CLF · Recorded`,
        })),
    [clfAll, siteIds, atmIds],
  )
  const [showClfDepositForm, setShowClfDepositForm] = useState(false)
  const [selectedClfRecord, setSelectedClfRecord] = useState<ClfConsolidatedRecord | null>(null)
  const [copiedHpyAcct, setCopiedHpyAcct] = useState(false)

  // Top Selectors
  const [newClfSite, setNewClfSite] = useState(() => sites[0]?.atmId ?? '')
  const clfMaster = getMasterAccountForAtm(newClfSite || sites[0]?.atmId || '')
  const newClfHpyCode = clfMaster.hpyCode
  const [newClfTxnDate, setNewClfTxnDate] = useState(() => new Date().toISOString().split('T')[0])

  // CLF 8 Transaction Details
  const [newClfPaymentType, setNewClfPaymentType] = useState('NEFT')
  const [newClfUtr, setNewClfUtr] = useState('')
  const [newClfCount, setNewClfCount] = useState('1st')
  const [newClfSenderName, setNewClfSenderName] = useState(() => franchise?.name ?? '')
  const [newClfSenderContact, setNewClfSenderContact] = useState(() => (user?.phone ?? '').replace(/^\+91\s*/, ''))
  const [newClfSenderAccount, setNewClfSenderAccount] = useState('')
  const [newClfSenderIfsc, setNewClfSenderIfsc] = useState('')
  const newClfHpyAccount = clfMaster.hpyAccount

  // Amount & File Receipt
  const [newClfAmount, setNewClfAmount] = useState('')
  const [newClfReceiptFile, setNewClfReceiptFile] = useState<File | null>(null)
  const [clfFormSuccess, setClfFormSuccess] = useState<string | null>(null)
  const clfFileInputRef = useRef<HTMLInputElement>(null)

  // WLA Statement (Operations › WLA Statement master)
  const wlaAll = useWlaStatements()
  const wlaSites = sites.filter((x) => x.account)
  const [wlaSiteId, setWlaSiteId] = useState(() => wlaSites[0]?.siteId ?? '')
  const wlaSite = wlaSites.find((x) => x.siteId === wlaSiteId) ?? wlaSites[0]
  const [wlaPeriod, setWlaPeriod] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 7)
  })
  const wlaMonthYear = periodLabel(wlaPeriod)
  const [isPasswordProtected, setIsPasswordProtected] = useState<'yes' | 'no'>('no')
  const [wlaPassword, setWlaPassword] = useState('')
  const [showWlaPassword, setShowWlaPassword] = useState(false)
  const [wlaFile, setWlaFile] = useState<File | null>(null)
  const wlaSelectedFile = wlaFile?.name ?? null
  const setWlaSelectedFile = (v: null) => setWlaFile(v)
  const wlaStatements = wlaAll
    .filter((w) => w.frId === frId && w.status !== 'Replaced')
    .map((w) => ({ id: w.id, month: `${periodLabel(w.period).toUpperCase()} · ${w.atmId}`, status: w.status.toUpperCase(), remarks: w.reason || (w.passwordProtected ? 'Password Protected' : '-'), file: w.file.name }))

  // Security Deposit (Finance › Security Deposit register)
  const sdAll = useSecurityDeposits()
  const [sdAtmId, setSdAtmId] = useState(() => sites[0]?.atmId ?? '')
  const [sdAmount, setSdAmount] = useState('')
  const [sdDate, setSdDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [sdUtr, setSdUtr] = useState('')
  const [sdBank, setSdBank] = useState('Axis Bank')
  const [sdFile, setSdFile] = useState<File | null>(null)
  // API mode: the depositor's bank account (the backend register needs it; /my/sites carries no account data)
  const [sdAccount, setSdAccount] = useState('')
  const [sdIfsc, setSdIfsc] = useState('')
  const sdFileRef = useRef<HTMLInputElement>(null)
  const sdMine = sdAll.filter((d) => siteIds.has(d.siteId) || atmIds.has(d.atmId))
  const sdHistory = sdMine.map((d) => ({ site: d.atmId, amount: `₹${num(d.amount).toLocaleString('en-IN')}`, utr: d.txnNumber || '—', status: d.status, date: fmtDate(d.paymentDate) }))
  const sdSelectedStatus = sdMine.find((d) => d.atmId === sdAtmId)?.status

  // GST (Finance › GST invoices of the franchise's sites)
  const gstAll = gstStore.use()
  const gstMine = useMemo(() => gstAll.filter((g) => siteIds.has(g.siteId) || atmIds.has(g.atmId)), [gstAll, siteIds, atmIds])
  const gstRecords = useMemo<GstMonthItem[]>(
    () =>
      gstMine.map((g: GstRecord) => {
        const files = parseGstRemark(g.remark)
        const [dd, mm, yy] = g.invoiceDate.split('-')
        const due = dd && mm && yy ? new Date(Number(yy), Number(mm) - 1, Number(dd) + 15).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
        return {
          id: g.id,
          month: `${g.month} · ${g.atmId}`,
          fYear: g.fYear,
          invoiceNo: g.invoiceNumber || '—',
          invoiceDate: g.invoiceDate || '—',
          basicAmount: num(g.basicAmount),
          cgst: num(g.cgst),
          sgst: num(g.sgst),
          totalAmount: num(g.invoiceAmount),
          dueDate: due,
          status: g.invoiceStatus === 'Pending at Franchise' ? 'Action Required' : g.invoiceStatus === 'Pending at Team' ? 'Submitted' : 'Verified & Approved',
          signedInvoiceFile: files.signed || undefined,
          gstr2bScreenshot: files.gstr2b || undefined,
          supportingDocs: files.docs,
          remarks: files.note,
          submissionDate: g.invoiceStatus !== 'Pending at Franchise' && g.updatedAt ? fmtDate(g.updatedAt) : undefined,
        }
      }),
    [gstMine],
  )
  const gstHeader = gstMine[0]
  const [selectedGstId, setSelectedGstId] = useState<string | null>(null)
  const [gstSignedFile, setGstSignedFile] = useState<string | null>(null)
  const [gstGstr2bFile, setGstGstr2bFile] = useState<string | null>(null)
  const [gstSupportingFiles, setGstSupportingFiles] = useState<string[]>([])
  const [gstDeclaration, setGstDeclaration] = useState(false)
  const [gstRemarks, setGstRemarks] = useState('')
  const [previewGstInvoice, setPreviewGstInvoice] = useState<GstMonthItem | null>(null)
  const [viewGstDocModal, setViewGstDocModal] = useState<{ title: string; filename: string } | null>(null)

  const handleOpenGstMonth = (rec: GstMonthItem) => {
    setSelectedGstId(rec.id)
    setGstSignedFile(rec.signedInvoiceFile || null)
    setGstGstr2bFile(rec.gstr2bScreenshot || null)
    setGstSupportingFiles(rec.supportingDocs ? [...rec.supportingDocs] : [])
    setGstDeclaration(Boolean(rec.signedInvoiceFile))
    setGstRemarks(rec.remarks || '')
  }

  const handleSubmitGstFiling = (e: React.FormEvent) => {
    e.preventDefault()
    if (!gstSignedFile) {
      alert('Please upload the physically signed and stamped GST invoice.')
      return
    }
    if (!gstGstr2bFile) {
      alert('Please attach your GSTR-2B portal screenshot showing Dexter India ITC.')
      return
    }
    if (!gstDeclaration) {
      alert('Please confirm the proprietor signature and GSTR-2B declaration checkbox.')
      return
    }
    const rec = gstAll.find((g) => g.id === selectedGstId)
    if (!rec) return
    if (apiFin) {
      // The server register has no franchise update of an existing invoice — new invoices go through "Raise a GST invoice".
      alert(`${rec.month}: this invoice is already with Dexter Finance (status: ${rec.invoiceStatus}). To submit a new invoice use "Raise a GST invoice" on the GST screen.`)
      return
    }
    const clean = (v: string) => v.replace(/[|,=]/g, ' ')
    saveGst({
      ...rec,
      invoiceStatus: 'Pending at Team',
      remark: `${MOBILE_TAG} signed=${clean(gstSignedFile)}|gstr2b=${clean(gstGstr2bFile)}|docs=${gstSupportingFiles.map(clean).join(',')}|note=${clean(gstRemarks)}`,
    })
    alert(`Signed GST Invoice, GSTR-2B screenshot & ${gstSupportingFiles.length} supporting file(s) for ${rec.month} submitted. CRM Finance will verify for ITC reconciliation.`)
  }

  // Account change request (Finance › A/C Change Requests) and document modal state
  const changeRequests = useAcChangeRequests()
  const [showAccountRequestModal, setShowAccountRequestModal] = useState<'settlement' | 'payout' | null>(null)
  const [viewDocModal, setViewDocModal] = useState<{ type: 'settlement' | 'payout'; filename: string; title: string } | null>(null)
  const myRequests = changeRequests.filter((r) => atmIds.has(r.atmId) && (r.status === 'Pending' || r.status === 'Under Review'))
  const pendingRequests: {
    settlement?: { bankName: string; accountNo: string; ifsc: string; date: string }
    payout?: { bankName: string; accountNo: string; ifsc: string; date: string }
  } = {
    settlement: (() => {
      const r = myRequests.find((x) => x.settlementNew.bankName && x.settlementNew.bankName !== 'NA')
      return r ? { bankName: r.settlementNew.bankName, accountNo: maskNo(r.settlementNew.accountNumber), ifsc: r.settlementNew.ifscCode, date: fmtDate(r.requestDate) } : undefined
    })(),
    payout: (() => {
      const r = myRequests.find((x) => x.hasPayoutChange)
      return r ? { bankName: r.payoutNew.bankName, accountNo: maskNo(r.payoutNew.accountNumber), ifsc: r.payoutNew.ifscCode, date: fmtDate(r.requestDate) } : undefined
    })(),
  }

  // Form fields for new account request
  const [reqBankName, setReqBankName] = useState('')
  const [reqHolderName, setReqHolderName] = useState(() => user?.name ?? '')
  const [reqAccountNo, setReqAccountNo] = useState('')
  const [reqConfirmAccountNo, setReqConfirmAccountNo] = useState('')
  const [reqIfsc, setReqIfsc] = useState('')
  const [reqBranch, setReqBranch] = useState('')
  const [reqFileName, setReqFileName] = useState('')
  const [reqFile, setReqFile] = useState<File | null>(null)
  // API mode: new GST invoice raised by the franchise (POST /my/finance/gst-invoices)
  const [newGst, setNewGst] = useState({ atmId: '', month: new Date().toISOString().slice(0, 7), invoiceNumber: '', invoiceDate: new Date().toISOString().slice(0, 10), basic: '', rate: '18', interState: false })
  const [newGstFile, setNewGstFile] = useState<File | null>(null)
  const [formError, setFormError] = useState('')

  const settlementSite = sites.find((x) => x.account?.approval === 'Approved') ?? sites.find((x) => x.account)
  const payoutSite = sites.find((x) => x.payout?.status === 'Mapped') ?? sites[0]

  const handleSubmitAccountRequest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!showAccountRequestModal) return
    if (reqAccountNo !== reqConfirmAccountNo) {
      setFormError('Account numbers do not match!')
      return
    }
    const site = settlementSite ?? sites[0]
    if (!site) {
      setFormError('No site is mapped to your franchise.')
      return
    }
    setFormError('')
    const targetType = showAccountRequestModal
    if (apiFin) {
      // POST /my/finance/ac-change-requests — the existing particulars come from the Site Master on the server
      if (!reqFile) {
        setFormError('Attach the cancelled cheque / passbook copy.')
        return
      }
      const mobile = (user?.phone ?? '').replace(/\D/g, '').slice(-10)
      const part = { nameAsPerBank: reqHolderName.trim(), bankName: reqBankName.trim(), accountNumber: reqAccountNo.trim(), ifscCode: reqIfsc.trim().toUpperCase(), reasonForChange: `Requested from the franchise app${reqBranch ? ` (${reqBranch})` : ''}` }
      setFinBusy(true)
      void (async () => {
        try {
          const fileId = await uploadMyFinanceFile(reqFile, 'ac-change-request')
          const r = await submitMyFinance('ac-change-requests', {
            atmId: site.atmId, mobileNo: mobile, ...(user?.email && user.email !== '—' ? { emailId: user.email } : {}), requestDate: new Date().toISOString().slice(0, 10),
            hasSettlementChange: targetType === 'settlement', ...(targetType === 'settlement' ? { settlementNew: part } : {}),
            hasPayoutChange: targetType === 'payout', ...(targetType === 'payout' ? { payoutNew: part } : {}),
            documentFileIds: [fileId], note: 'Submitted from the franchise mobile app',
          })
          setShowAccountRequestModal(null)
          setReqBankName('')
          setReqAccountNo('')
          setReqConfirmAccountNo('')
          setReqIfsc('')
          setReqBranch('')
          setReqFileName('')
          setReqFile(null)
          alert(`${targetType === 'settlement' ? 'Settlement' : 'Payout'} account change request ${r.recordId} submitted — Dexter Finance will verify it.`)
        } catch (err) {
          setFormError(finErr(err))
        } finally {
          setFinBusy(false)
        }
      })()
      return
    }
    const blank = { nameAsPerBank: 'NA', bankName: 'NA', accountNumber: 'NA', ifscCode: 'NA', nameOnPan: 'NA', panNo: 'NA', aadhaarLinkedMobile: 'NA', emailId: 'NA', reasonForChange: 'No change' }
    const party = { nameOnPan: reqHolderName, panNo: '', aadhaarLinkedMobile: (user?.phone ?? '').replace(/\D/g, '').slice(-10), emailId: user?.email ?? '', reasonForChange: `Requested from the franchise app (${reqBranch})` }
    const existingSettlement = { ...blank, nameAsPerBank: site.account?.holder ?? 'NA', bankName: site.account?.bank ?? 'NA', accountNumber: site.account?.accountNo ?? 'NA', ifscCode: site.account?.ifsc ?? 'NA' }
    const existingPayout = { ...blank, nameAsPerBank: site.account?.holder ?? 'NA', bankName: site.payout?.bank || 'NA', accountNumber: site.payout?.accountNo || 'NA', ifscCode: site.payout?.ifsc || 'NA' }
    const fresh = { ...party, nameAsPerBank: reqHolderName, bankName: reqBankName, accountNumber: reqAccountNo, ifscCode: reqIfsc.toUpperCase() }
    addAcChangeRequest({
      atmId: site.atmId,
      siteId: site.siteId,
      franchiseeName: user?.name ?? franchise?.name ?? frId,
      mobileNo: (user?.phone ?? '').replace(/\D/g, '').slice(-10),
      emailId: user?.email,
      requestDate: new Date().toISOString().slice(0, 10),
      settlementExisting: existingSettlement,
      settlementNew: targetType === 'settlement' ? fresh : blank,
      hasPayoutChange: targetType === 'payout',
      payoutExisting: existingPayout,
      payoutNew: targetType === 'payout' ? fresh : blank,
      documents: reqFileName ? [{ id: `DOC-${Date.now().toString(36)}`, docType: 'Cancelled cheque / passbook', fileName: reqFileName, uploadedOn: new Date().toISOString().slice(0, 10) }] : [],
      note: 'Submitted from the franchise mobile app',
      status: 'Pending',
    })
    setShowAccountRequestModal(null)
    setReqBankName('')
    setReqAccountNo('')
    setReqConfirmAccountNo('')
    setReqIfsc('')
    setReqBranch('')
    setReqFileName('')
    alert(`New ${targetType === 'settlement' ? 'Settlement' : 'Payout'} Account request submitted! CRM Admin will review and verify your documents.`)
  }

  // TDS letters / dynamic limit
  const tdsAll = useTdsLetters()
  const tdsMine = tdsAll.filter((d) => d.frId === frId && d.status === 'Active')
  const cbrAll = cbrMaster.store.use()
  const clAll = clMaster.store.use()
  const clfTotal = clfRecords.reduce((a, r) => a + r.depositAmount, 0)
  const pendingCash = [...cbrAll, ...clAll].filter((r) => (r.frId === frId || atmIds.has(r.atmId)) && !r.locked && r.status !== 'Rejected' && r.status !== 'Draft').reduce((a, r) => a + r.amount, 0)

  const submodules = [
    { id: 'settlement' as AccountSubmodule, title: 'Settlement Account', icon: Landmark, desc: 'Franchise settlement account & verification' },
    { id: 'payout' as AccountSubmodule, title: 'Payout Account', icon: Coins, desc: 'Registered payout accounts & passbook' },
    { id: 'clf' as AccountSubmodule, title: 'Cash Loading Fund (CLF)', icon: Banknote, desc: 'CLF deposit, verification, refund & history' },
    { id: 'wla' as AccountSubmodule, title: 'WLA Statement', icon: FileBarChart, desc: 'Month-wise WLA statements upload & download' },
    { id: 'tds' as AccountSubmodule, title: 'TDS Letters', icon: FileText, desc: 'Backend uploaded TDS certificates history' },
    { id: 'gst' as AccountSubmodule, title: 'GST', icon: Percent, desc: 'Monthly GST returns & compliance documents' },
    { id: 'security-deposit' as AccountSubmodule, title: 'Security Deposit', icon: ShieldCheck, desc: 'Site-wise security deposit entry & approval' },
    { id: 'dynamic-limit' as AccountSubmodule, title: 'Dynamic Limit', icon: Sliders, desc: 'Live credit limit calculated on CLF refund' }
  ]

  const handleAddClfDeposit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClfUtr.trim()) {
      alert('Please enter a valid UTR Number.')
      return
    }
    if (!clfMaster.siteId || !num(newClfAmount)) {
      alert('Select your ATM and enter the deposit amount.')
      return
    }
    if (apiFin) {
      // POST /my/finance/clf (receipt uploaded first as the franchise user's own file)
      const atm = newClfSite || sites[0]?.atmId || ''
      const settlementBank = settlementSite?.account?.bank ?? clfMaster.bankName
      setFinBusy(true)
      void (async () => {
        try {
          const receiptFileId = newClfReceiptFile ? await uploadMyFinanceFile(newClfReceiptFile, 'clf-receipt') : undefined
          const r = await submitMyFinance('clf', {
            atmId: atm, clfStatus: newClfCount, clfAmount: rupeesToPaise(newClfAmount), paymentType: newClfPaymentType, paymentDate: newClfTxnDate, transactionDate: newClfTxnDate,
            transferTime: new Date().toTimeString().slice(0, 5), settlementBank: settlementBank && settlementBank.length >= 2 ? settlementBank : 'Not mapped', utr: newClfUtr.trim().toUpperCase(),
            ...(newClfSenderName.trim() ? { senderName: newClfSenderName.trim() } : {}),
            ...(newClfSenderAccount.trim() ? { senderAccountNumber: newClfSenderAccount.trim() } : {}),
            ...(newClfSenderIfsc.trim() ? { senderIfsc: newClfSenderIfsc.trim().toUpperCase() } : {}),
            ...(receiptFileId ? { receiptFileId } : {}),
          })
          setShowClfDepositForm(false)
          setClfFormSuccess(`CLF Deposit ${r.recordId} (${newClfCount} Loading • UTR: ${newClfUtr.trim().toUpperCase()}) submitted — Dexter Finance will verify it.`)
          setNewClfUtr('')
          setNewClfReceiptFile(null)
          setTimeout(() => setClfFormSuccess(null), 6000)
        } catch (err) {
          alert(finErr(err))
        } finally {
          setFinBusy(false)
        }
      })()
      return
    }
    const saved = saveClfRecord({
      id: '',
      siteId: clfMaster.siteId,
      atmId: clfMaster.atmId,
      franchiseeName: clfMaster.franchiseName || franchise?.name || '',
      franchiseeNo: clfMaster.franchiseNo || frId,
      cashLiveDate: '',
      clfStatus: newClfCount,
      hpyAccount: clfMaster.hpyAccount,
      clfAmount: num(newClfAmount).toLocaleString('en-IN'),
      paymentDate: ddmmyyyy(newClfTxnDate),
      transferTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      frBank: clfMaster.bankName,
      holder: clfMaster.holder,
      utr: newClfUtr.trim(),
      settlementBank: settlementSite?.account?.bank ?? clfMaster.bankName,
      hpyCode: clfMaster.hpyCode,
      transactionDate: ddmmyyyy(newClfTxnDate),
      nameAsPerPan: clfMaster.nameAsPerPan,
      panNumber: clfMaster.panNumber,
      accountNumber: clfMaster.accountNumber,
      beneficiaryName: clfMaster.beneficiaryName,
      bankName: clfMaster.bankName,
      ifscCode: clfMaster.ifscCode,
      paymentType: newClfPaymentType,
      clfCount: newClfCount,
      senderName: newClfSenderName,
      senderContact: newClfSenderContact,
      senderAccountNumber: newClfSenderAccount,
      senderIfsc: newClfSenderIfsc,
      isDraft: true,
    })
    setShowClfDepositForm(false)
    setClfFormSuccess(`CLF Deposit ${saved.id} (${newClfCount} Loading • UTR: ${saved.utr}${newClfReceiptFile ? ` • slip ${newClfReceiptFile.name}` : ''}) submitted for CRM verification!`)
    setNewClfUtr('')
    setNewClfReceiptFile(null)
    setTimeout(() => setClfFormSuccess(null), 6000)
  }


  // Render Submodule List (Main screen matching WhatsApp Image 2026-11-09 at 10.29.42 PM.jpeg)
  if (activeSub === 'list') {
    return (
      <div className="space-y-4 pb-6 pt-3 px-3">
        {/* Banner with Wallet / Accounts Header */}
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
                <Landmark size={14} />
                <span>Financial Management</span>
              </div>
              <h1 className="text-xl font-black text-white">Accounts</h1>
            </div>
          </div>
          <span className="rounded-xl bg-white/20 px-2.5 py-1 text-xs font-bold text-white border border-white/20">
            8 Sub-modules
          </span>
        </div>

        {finSummary && (
          <div className="rounded-2xl border border-blue-100 bg-white p-3 text-[11px] text-slate-600 shadow-xs">
            <div className="mb-1 font-bold text-slate-800">Your finance submissions</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {([['gst-invoices', 'GST invoices'], ['clf', 'CLF payments'], ['security-deposits', 'Security deposits'], ['ac-change-requests', 'A/C change requests']] as const).map(([k, label]) => {
                const c = finSummary.modules[k] ?? { Submitted: 0, Approved: 0, Rejected: 0, Draft: 0 }
                return (
                  <div key={k}>
                    {label}: <b className="text-blue-700">{c.Submitted}</b> in review · <b className="text-emerald-700">{c.Approved}</b> approved{c.Rejected ? <> · <b className="text-red-600">{c.Rejected}</b> rejected</> : null}
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {finLoad.error && apiFin && <p className="rounded-xl bg-red-50 p-2 text-[11px] text-red-700">Could not load your finance records: {finLoad.error}</p>}

        {/* 8 Full-width Submodule Cards matching screenshot */}
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

  // Modals for Account Request and Document Viewer
  const renderModals = () => {
    return (
      <>
        {/* Document Preview Modal */}
        {viewDocModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <FileCheck size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-800">{viewDocModal.title}</h3>
                    <span className="text-[10px] text-slate-500 font-mono">{viewDocModal.filename}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewDocModal(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Simulated Document / Passbook / Cheque view */}
              <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 p-3.5 relative overflow-hidden shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 size={16} className="text-blue-700" />
                    <span className="text-xs font-black text-blue-950 uppercase tracking-wide">
                      {(viewDocModal.type === 'settlement' ? settlementSite?.account?.bank : payoutSite?.payout?.bank) || '—'}
                    </span>
                  </div>
                  <span className="rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 border border-emerald-300">
                    VERIFIED
                  </span>
                </div>

                <div className="space-y-1.5 py-3 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-[10px]">A/C Holder:</span>
                    <span className="font-bold text-slate-800 uppercase">{settlementSite?.account?.holder ?? holderName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-[10px]">Account No:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {maskNo(viewDocModal.type === 'settlement' ? settlementSite?.account?.accountNo : payoutSite?.payout?.accountNo)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-[10px]">IFSC Code:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {(viewDocModal.type === 'settlement' ? settlementSite?.account?.ifsc : payoutSite?.payout?.ifsc) || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-[10px]">Branch:</span>
                    <span className="font-semibold text-slate-700 text-right">
                      {(viewDocModal.type === 'settlement' ? settlementSite?.account?.branch : '') || dossier?.branchName || '—'}
                    </span>
                  </div>
                </div>

                {/* Bank Seal & MICR */}
                <div className="mt-2 pt-2 border-t border-dashed border-slate-300 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-slate-400">
                    {viewDocModal.type === 'settlement' ? `${settlementSite?.account?.type ?? ''} · mapped ${settlementSite?.account?.mappedOn ?? '—'}` : `Payout · ${payoutSite?.payout?.status ?? '—'}`}
                  </span>
                  <span className="text-[9px] font-extrabold text-blue-700 border border-blue-300 rounded px-1.5 py-0.5 bg-blue-50/90">
                    DEXTER CRM APPROVED
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    alert(`Downloading ${viewDocModal.filename}...`)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  <Download size={13} /> Download
                </button>
                <button
                  type="button"
                  onClick={() => setViewDocModal(null)}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Request New Account Modal */}
        {showAccountRequestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 animate-in fade-in duration-150 overflow-y-auto">
            <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl space-y-3 my-auto max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <PlusCircle size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-800">
                      Request New {showAccountRequestModal === 'settlement' ? 'Settlement' : 'Payout'} Bank
                    </h3>
                    <span className="text-[10px] text-slate-500">Subject to CRM Admin Approval</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountRequestModal(null)
                    setFormError('')
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSubmitAccountRequest} className="space-y-2.5">
                {formError && (
                  <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="text-[10.5px] font-semibold text-slate-600 block mb-0.5">Account Holder Name *</label>
                  <input
                    type="text"
                    value={reqHolderName}
                    onChange={(e) => setReqHolderName(e.target.value)}
                    className="w-full h-8 rounded-xl border border-slate-200 bg-slate-100 px-2.5 text-xs font-bold text-slate-800"
                    required
                    readOnly
                  />
                  <span className="text-[9px] text-slate-400">Must match registered franchise partner name</span>
                </div>

                <div>
                  <label className="text-[10.5px] font-semibold text-slate-600 block mb-0.5">Bank Name *</label>
                  <input
                    type="text"
                    value={reqBankName}
                    onChange={(e) => setReqBankName(e.target.value)}
                    placeholder="e.g. ICICI Bank Ltd, Punjab National Bank"
                    className="w-full h-8 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-800"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] font-semibold text-slate-600 block mb-0.5">Account Number *</label>
                    <input
                      type="password"
                      value={reqAccountNo}
                      onChange={(e) => setReqAccountNo(e.target.value)}
                      placeholder="Enter Account No"
                      className="w-full h-8 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-mono font-medium text-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-semibold text-slate-600 block mb-0.5">Confirm A/C No *</label>
                    <input
                      type="text"
                      value={reqConfirmAccountNo}
                      onChange={(e) => setReqConfirmAccountNo(e.target.value)}
                      placeholder="Confirm Account No"
                      className="w-full h-8 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-mono font-medium text-slate-800"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] font-semibold text-slate-600 block mb-0.5">IFSC Code *</label>
                    <input
                      type="text"
                      value={reqIfsc}
                      onChange={(e) => setReqIfsc(e.target.value.toUpperCase())}
                      placeholder="e.g. ICIC0000047"
                      className="w-full h-8 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-mono font-medium uppercase text-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-semibold text-slate-600 block mb-0.5">Branch / City *</label>
                    <input
                      type="text"
                      value={reqBranch}
                      onChange={(e) => setReqBranch(e.target.value)}
                      placeholder="e.g. Branch, City"
                      className="w-full h-8 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-800"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10.5px] font-semibold text-slate-600 block mb-0.5">
                    Upload Cancelled Cheque / Passbook Copy *
                  </label>
                  <label className="cursor-pointer border border-dashed border-slate-300 rounded-xl p-2.5 flex items-center justify-center gap-2 bg-slate-50 hover:bg-blue-50 transition-colors">
                    <Upload size={14} className="text-blue-600" />
                    <span className="text-[10.5px] text-slate-600 font-medium">
                      {reqFileName ? reqFileName : 'Select PDF or Cheque Image'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setReqFileName(e.target.files[0].name)
                          setReqFile(e.target.files[0])
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccountRequestModal(null)
                      setFormError('')
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-xs"
                  >
                    Submit for Approval
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    )
  }

  // Reusable Bank Account detail renderer for Settlement & Payout
  const renderBankAccountView = (type: 'settlement' | 'payout') => {
    const isSettlement = type === 'settlement'
    const accountInfo = isSettlement
      ? {
        title: 'Settlement Account',
        cardTitle: 'Primary Settlement Bank',
        holder: settlementSite?.account?.holder ?? holderName,
        bank: settlementSite?.account?.bank ?? 'Not mapped',
        accountNo: maskNo(settlementSite?.account?.accountNo),
        ifsc: settlementSite?.account?.ifsc ?? '—',
        branch: settlementSite?.account ? `${settlementSite.account.branch} · ${settlementSite.account.type} · ${settlementSite.atmId}` : '—',
        docName: dossier?.documents?.[3]?.file?.name ?? 'Cancelled_cheque.pdf',
        docLabel: `Cancelled Cheque (${dossier?.documents?.[3]?.file?.name ?? 'on file with CRM'})`,
        previewTitle: `${settlementSite?.account?.bank ?? 'Bank'} - Cancelled Cheque`,
        status: settlementSite?.account ? `${settlementSite.account.approval} · settlement ${settlementSite.account.settlement}` : 'Pending',
        ok: settlementSite?.account?.approval === 'Approved',
      }
      : {
        title: 'Payout Account',
        cardTitle: 'Primary Payout Bank',
        holder: holderName,
        bank: payoutSite?.payout?.bank || 'Not mapped',
        accountNo: maskNo(payoutSite?.payout?.accountNo),
        ifsc: payoutSite?.payout?.ifsc || '—',
        branch: payoutSite ? `Mapped to ${payoutSite.atmId}` : '—',
        docName: dossier?.documents?.[3]?.file?.name ?? 'Passbook.pdf',
        docLabel: `Cancelled Cheque / Passbook (${dossier?.documents?.[3]?.file?.name ?? 'on file with CRM'})`,
        previewTitle: `${payoutSite?.payout?.bank || 'Bank'} - Passbook / Cheque`,
        status: payoutSite?.payout?.status ?? 'Pending',
        ok: payoutSite?.payout?.status === 'Mapped',
      }

    const pending = pendingRequests[type]

    return (
      <div className="space-y-4 pb-6 pt-3 px-3">
        {/* Header */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSub('list')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 active:scale-95 transition-all"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="font-bold text-base">{accountInfo.title}</h2>
          </div>
          <span className="rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold">
            {accountInfo.status}
          </span>
        </div>

        {/* Pending Request Alert if present */}
        {pending && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs flex items-start gap-2.5 shadow-xs">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800 font-bold text-[10px]">
              !
            </div>
            <div>
              <span className="font-bold text-amber-900 block">Change Request Under Verification</span>
              <span className="text-amber-700 text-[11px] block mt-0.5">
                Requested: <strong>{pending.bankName}</strong> ({pending.accountNo}) on {pending.date}. Awaiting CRM Admin approval.
              </span>
            </div>
          </div>
        )}

        {/* Primary Bank Card */}
        <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-xs font-bold text-slate-700">{accountInfo.cardTitle}</span>
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 flex items-center gap-1">
              <CheckCircle size={11} className="text-emerald-700" /> {accountInfo.ok ? 'Verified & Mapped' : 'Approval pending'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 block">Account Holder</span>
              <span className="font-bold text-slate-800">{accountInfo.holder}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 block">Bank Name</span>
              <span className="font-bold text-slate-800">{accountInfo.bank}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 block">Masked Account No</span>
              <span className="font-bold text-slate-800 font-mono">{accountInfo.accountNo}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 block">IFSC Code</span>
              <span className="font-bold text-slate-800 font-mono">{accountInfo.ifsc}</span>
            </div>
            <div className="col-span-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 block">Branch Address</span>
              <span className="font-bold text-slate-800">{accountInfo.branch}</span>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between text-[11px] text-slate-600 bg-blue-50/70 p-2 rounded-xl">
              <span className="flex items-center gap-1.5 font-medium">
                <FileCheck size={14} className="text-blue-600" /> {accountInfo.docLabel}
              </span>
              <button
                type="button"
                onClick={() => setViewDocModal({ type, filename: accountInfo.docName, title: accountInfo.previewTitle })}
                className="text-blue-700 font-bold underline cursor-pointer hover:text-blue-900"
              >
                View
              </button>
            </div>
          </div>
        </div>

        {/* Change Request Card */}
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
          <p className="text-xs text-slate-600 font-medium">
            Need to update your {isSettlement ? 'settlement' : 'payout'} bank? Per CRM policy, changes require Admin verification. Old verified accounts remain permanently archived in history.
          </p>
          <button
            type="button"
            onClick={() => setShowAccountRequestModal(type)}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 active:scale-95 transition-all"
          >
            <PlusCircle size={14} /> Submit New Account Request
          </button>
        </div>

        {/* Modals */}
        {renderModals()}
      </div>
    )
  }

  // 1. Settlement Account Detail View
  if (activeSub === 'settlement') {
    return renderBankAccountView('settlement')
  }

  // 2. Payout Account Detail View
  if (activeSub === 'payout') {
    return renderBankAccountView('payout')
  }

  // 3. Cash Loading Fund (CLF) Detail View (matching Section 3.3 and Page 4 Table!)
  if (activeSub === 'clf') {
    const totalDeposited = clfRecords.reduce((acc, r) => acc + r.depositAmount, 0)
    const totalRefunded = clfRecords.reduce((acc, r) => acc + r.refundAmount, 0)
    const totalOutstanding = clfRecords.reduce((acc, r) => acc + r.outstandingAmount, 0)

    return (
      <div className="space-y-4 pb-6 pt-3 px-3">
        {/* Header */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSub('list')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="font-bold text-base leading-tight">Cash Loading Fund</h2>
            </div>
          </div>
          <button
            onClick={() => setShowClfDepositForm(!showClfDepositForm)}
            className="rounded-xl bg-white px-2.5 py-1 text-xs font-bold text-blue-900 shadow-xs hover:bg-blue-50"
          >
            {showClfDepositForm ? 'View Records' : '+ Deposit CLF'}
          </button>
        </div>

        {/* Dashboard Summary Cards (matching Section 3.3.E) */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-2">
            <span className="text-[9.5px] font-bold text-slate-500 block">Total Deposited</span>
            <span className="text-sm font-black text-[#0B2A6B]">₹{totalDeposited.toLocaleString()}</span>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2">
            <span className="text-[9.5px] font-bold text-slate-500 block">Total Refunded</span>
            <span className="text-sm font-black text-emerald-600">₹{totalRefunded.toLocaleString()}</span>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-2">
            <span className="text-[9.5px] font-bold text-slate-500 block">Outstanding</span>
            <span className="text-sm font-black text-amber-600">₹{totalOutstanding.toLocaleString()}</span>
          </div>
        </div>

        {/* CLF Success Notification Toast */}
        {clfFormSuccess && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-2.5 text-xs text-emerald-800 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle size={15} className="text-emerald-600 shrink-0" />
              <span className="font-semibold text-[11px]">{clfFormSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setClfFormSuccess(null)}
              className="text-emerald-600 hover:text-emerald-800 font-bold text-xs"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* CLF Deposit Entry Form matching Cash Loading Funds (CLF) specification */}
        {showClfDepositForm && (
          <form
            onSubmit={handleAddClfDeposit}
            className="rounded-2xl border border-blue-200 bg-white p-3.5 shadow-md space-y-3.5 animate-in fade-in"
          >
            {/* Form Title */}
            <div className="flex items-center justify-between border-b pb-2 border-slate-100">
              <h3 className="text-xs font-black text-[#0B2A6B] flex items-center gap-1.5">
                <PlusCircle size={15} className="text-blue-600" /> New Cash Loading Funds (CLF) Entry
              </h3>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                Portal Sync
              </span>
            </div>

            {/* Section 1: Top Bar (ATM ID, HPY Code, Transaction Date) */}
            <div className="rounded-xl bg-slate-50/80 p-3 border border-slate-200/80 space-y-2.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Identification & Date
              </span>

              <div className="grid grid-cols-2 gap-2">
                {/* ATM ID */}
                <div>
                  <label className="text-[10.5px] font-bold text-slate-700 block mb-1">
                    ATM ID <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newClfSite}
                    onChange={(e) => setNewClfSite(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {sites.map((x) => (
                      <option key={x.atmId} value={x.atmId}>
                        {x.atmId} ({x.location})
                      </option>
                    ))}
                  </select>
                </div>

                {/* HPY Code */}
                <div>
                  <label className="text-[10.5px] font-bold text-slate-700 block mb-1">
                    HPY Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    readOnly
                    value={newClfHpyCode}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-slate-50 px-2.5 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Transaction Date */}
              <div>
                <label className="text-[10.5px] font-bold text-slate-700 block mb-1">
                  Transaction Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={newClfTxnDate}
                    onChange={(e) => setNewClfTxnDate(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Daily Settlement Account (Read-Only Reference Card matching screenshot) */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 space-y-2">
              <div className="flex items-center justify-between border-b pb-1.5 border-blue-200/60">
                <span className="text-[11px] font-bold text-[#0B2A6B] flex items-center gap-1.5">
                  <Landmark size={14} className="text-blue-600" /> Daily Settlement Account
                </span>
                <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                  <CheckCircle size={10} /> Verified (FR)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-blue-100">
                  <span className="text-[9.5px] text-slate-400 font-semibold block">HPY Code</span>
                  <span className="font-bold text-slate-800">{newClfHpyCode}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-blue-100">
                  <span className="text-[9.5px] text-slate-400 font-semibold block">Bank Name</span>
                  <span className="font-bold text-slate-800">{clfMaster.bankName}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-blue-100">
                  <span className="text-[9.5px] text-slate-400 font-semibold block">Name As Per Pan (FR)</span>
                  <span className="font-bold text-slate-800 truncate block">{clfMaster.nameAsPerPan}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-blue-100">
                  <span className="text-[9.5px] text-slate-400 font-semibold block">Pan Number (FR)</span>
                  <span className="font-mono font-bold text-slate-800">{clfMaster.panNumber}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-blue-100">
                  <span className="text-[9.5px] text-slate-400 font-semibold block">Account Number (FR)</span>
                  <span className="font-mono font-bold text-blue-700">{clfMaster.accountNumber}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-blue-100">
                  <span className="text-[9.5px] text-slate-400 font-semibold block">IFSC Code</span>
                  <span className="font-mono font-bold text-slate-800">{clfMaster.ifscCode}</span>
                </div>
              </div>

              <div className="bg-white p-2 rounded-lg border border-blue-100 text-xs">
                <span className="text-[9.5px] text-slate-400 font-semibold block">Beneficiary name (FR)</span>
                <span className="font-bold text-slate-800 truncate block">{clfMaster.beneficiaryName}</span>
              </div>
            </div>

            {/* Section 3: CLF Transaction Details (Fields 1 to 8 matching screenshot) */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
              <div className="flex items-center gap-1.5 border-b pb-1.5 border-slate-100">
                <FileText size={14} className="text-blue-600" />
                <h4 className="text-[11px] font-bold text-[#0B2A6B]">CLF Transaction Details</h4>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* 1 & 2: Payment Type & UTR Number */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-1">
                      <span className="h-4 w-4 inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-md text-[9px] mr-1">1</span>
                      Payment Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newClfPaymentType}
                      onChange={(e) => setNewClfPaymentType(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-300 bg-slate-50 px-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="NEFT">NEFT</option>
                      <option value="RTGS">RTGS</option>
                      <option value="IMPS">IMPS</option>
                      <option value="UPI">UPI / NetBanking</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-1">
                      <span className="h-4 w-4 inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-md text-[9px] mr-1">2</span>
                      UTR Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter UTR Number"
                      value={newClfUtr}
                      onChange={(e) => setNewClfUtr(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-300 px-2.5 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* 3 & 4: CLF Count & Sender Name */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-1">
                      <span className="h-4 w-4 inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-md text-[9px] mr-1">3</span>
                      CLF Count <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newClfCount}
                      onChange={(e) => setNewClfCount(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-300 bg-slate-50 px-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1st">1st Loading</option>
                      <option value="2nd">2nd Loading</option>
                      <option value="3rd">3rd Loading</option>
                      <option value="4th">4th Loading</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-1">
                      <span className="h-4 w-4 inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-md text-[9px] mr-1">4</span>
                      Sender Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Sender Name"
                      value={newClfSenderName}
                      onChange={(e) => setNewClfSenderName(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-300 px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* 5: Sender Contact */}
                <div>
                  <label className="text-[10.5px] font-bold text-slate-700 block mb-1">
                    <span className="h-4 w-4 inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-md text-[9px] mr-1">5</span>
                    Sender Contact <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="Enter Sender Contact"
                    value={newClfSenderContact}
                    onChange={(e) => setNewClfSenderContact(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 px-3 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* 6 & 7: Sender Account Number & Sender IFSC */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-1">
                      <span className="h-4 w-4 inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-md text-[9px] mr-1">6</span>
                      Sender Account No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Sender Account Number"
                      value={newClfSenderAccount}
                      onChange={(e) => setNewClfSenderAccount(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-300 px-2.5 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-1">
                      <span className="h-4 w-4 inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-md text-[9px] mr-1">7</span>
                      Sender IFSC <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="ENTER SENDER IFSC"
                      value={newClfSenderIfsc}
                      onChange={(e) => setNewClfSenderIfsc(e.target.value.toUpperCase())}
                      className="w-full h-9 rounded-xl border border-slate-300 px-2.5 font-mono text-xs font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* 8: HPY Account Number with 1-click Copy */}
                <div>
                  <label className="text-[10.5px] font-bold text-slate-700 block mb-1">
                    <span className="h-4 w-4 inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-md text-[9px] mr-1">8</span>
                    HPY Account Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={newClfHpyAccount}
                      className="flex-1 h-9 rounded-xl border border-slate-300 bg-slate-50 px-3 font-mono font-bold text-blue-800 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(newClfHpyAccount)
                        setCopiedHpyAcct(true)
                        setTimeout(() => setCopiedHpyAcct(false), 2000)
                      }}
                      className="h-9 px-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 flex items-center gap-1 active:scale-95 transition-all"
                    >
                      {copiedHpyAcct ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>{copiedHpyAcct ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <span className="text-[9.5px] text-slate-400 block mt-0.5">
                    Beneficiary account allocated by Hitachi/Dexter for cash loading
                  </span>
                </div>
              </div>
            </div>

            {/* Section 4: Deposit Amount & Payment Slip Upload */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Deposit Amount (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    value={newClfAmount}
                    onChange={(e) => setNewClfAmount(e.target.value)}
                    placeholder="Enter deposit amount"
                    className="w-full h-9 rounded-xl border border-slate-300 pl-7 pr-3 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Upload Slip */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Upload Payment Slip / Bank Receipt
                </label>
                <input
                  type="file"
                  ref={clfFileInputRef}
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setNewClfReceiptFile(e.target.files[0])
                    }
                  }}
                />

                <div
                  onClick={() => clfFileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-xl p-3 text-center bg-blue-50/40 cursor-pointer transition-all"
                >
                  <Upload size={20} className="mx-auto text-blue-600 mb-1" />
                  {newClfReceiptFile ? (
                    <div>
                      <span className="font-bold text-blue-800 text-xs block truncate">
                        {newClfReceiptFile.name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {Math.round(newClfReceiptFile.size / 1024)} KB • Click to change file
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-bold text-slate-700 text-xs block">
                        Tap to select receipt image or PDF
                      </span>
                      <span className="text-[10px] text-slate-400">
                        PNG, JPG, PDF up to 10MB
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClfDepositForm(false)}
                className="flex-1 h-10 rounded-xl border border-slate-300 bg-white font-bold text-xs text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={14} /> Submit CLF Deposit
              </button>
            </div>
          </form>
        )}

        {/* Consolidated Transaction History - Tiles View (matching reference image) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700">CLF Deposit & Refund Records</span>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {clfRecords.length} Entries
            </span>
          </div>

          <div className="space-y-2.5">
            {clfRecords.length === 0 && <p className="rounded-xl bg-white p-4 text-center text-xs text-slate-500">No CLF deposits recorded for your ATMs.</p>}
            {clfRecords.map((r) => {
              const getStatusStyle = (status: string) => {
                switch (status) {
                  case 'Approved':
                  case 'Fully Refunded':
                    return 'bg-emerald-100/90 text-emerald-800 border-emerald-200'
                  case 'Partially Refunded':
                    return 'bg-blue-100/90 text-blue-800 border-blue-200'
                  case 'Refund Pending':
                  case 'Pending Verification':
                    return 'bg-amber-100/90 text-amber-800 border-amber-200'
                  default:
                    return 'bg-slate-100 text-slate-700 border-slate-200'
                }
              }

              return (
                <div
                  key={r.clfReference}
                  onClick={() => setSelectedClfRecord(r)}
                  className="group rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs hover:border-blue-400 hover:shadow-md active:scale-[0.99] transition-all cursor-pointer space-y-2.5"
                >
                  {/* Top Row: Primary ID + Docket/UTR & Status Pill + Chevron */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#0B2A6B] group-hover:text-blue-700 tracking-tight">
                        {r.clfReference}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Docket No. : {r.txnId}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${getStatusStyle(r.status)}`}>
                        {r.status}
                      </span>
                      <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>

                  {/* Middle Row: ATM ID (left) and Problem / Deposit Amount (right) */}
                  <div className="flex items-start justify-between text-xs pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[11px]">ATM ID: </span>
                      <span className="font-bold text-slate-800 text-xs">{r.siteId}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 text-[11px] block">Deposit Amount:</span>
                      <span className="font-bold text-[#0B2A6B] text-xs block">₹{r.depositAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Refund & Outstanding Row */}
                  <div className="flex items-center justify-between text-[11px] bg-slate-50/70 p-2 rounded-xl">
                    <div>
                      <span className="text-slate-400 text-[10.5px]">Refund: </span>
                      <span className="font-bold text-emerald-600">₹{r.refundAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10.5px]">Balance: </span>
                      <span className="font-bold text-amber-600">₹{r.outstandingAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Bottom Row: Raised date */}
                  <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-0.5">
                    <span>Raised: {r.depositDate}</span>
                    {r.expectedRefundDate && <span>Exp. Refund: {r.expectedRefundDate}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CLF Detail Modal on Tile Tap */}
        {selectedClfRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="font-bold text-sm text-[#0B2A6B]">{selectedClfRecord.clfReference}</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Docket No. : {selectedClfRecord.txnId}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClfRecord(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-500 text-[11px]">Status</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-100 text-blue-800">
                    {selectedClfRecord.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] block">ATM ID</span>
                    <span className="font-bold text-slate-800 text-xs">{selectedClfRecord.siteId}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] block">Deposit Amount</span>
                    <span className="font-black text-[#0B2A6B] text-xs">₹{selectedClfRecord.depositAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] block">Refund Amount</span>
                    <span className="font-bold text-emerald-600 text-xs">₹{selectedClfRecord.refundAmount.toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] block">Outstanding</span>
                    <span className="font-bold text-amber-600 text-xs">₹{selectedClfRecord.outstandingAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] block">Raised Date</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedClfRecord.depositDate}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] block">Expected Refund</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedClfRecord.expectedRefundDate || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedClfRecord(null)}
                  className="w-full py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 4. WLA Statement Screen (Matching WhatsApp Image 2026-11-12 at 4.57.59 PM.jpeg)
  if (activeSub === 'wla') {
    return (
      <div className="space-y-4 pb-6 pt-3 px-3">
        {/* Top Header */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSub('list')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="font-bold text-base">Statement Upload</h2>
          </div>
          <span className="text-xs text-blue-200">WLA Account</span>
        </div>

        {/* Form Container */}
        <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3.5">
          {/* ATM ID Field */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Building2 size={16} className="text-blue-600" />
              <span>ATM ID</span>
            </div>
            <select
              value={wlaSite?.siteId ?? ''}
              onChange={(e) => setWlaSiteId(e.target.value)}
              className="max-w-[60%] rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono font-bold text-xs text-slate-900"
            >
              {wlaSites.length === 0 && <option value="">No WLA account mapped</option>}
              {wlaSites.map((x) => (
                <option key={x.siteId} value={x.siteId}>
                  {x.atmId}
                </option>
              ))}
            </select>
          </div>

          {/* Month-Year Field */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Calendar size={16} className="text-blue-600" />
              <span>MONTH-YEAR</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
              <input
                type="month"
                value={wlaPeriod}
                max={new Date().toISOString().slice(0, 7)}
                onChange={(e) => setWlaPeriod(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-bold"
                aria-label={wlaMonthYear}
              />
            </div>
          </div>

          {/* Upload PDF Box */}
          <div className="rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/30 p-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Upload size={22} />
            </div>
            <p className="mt-2 text-xs font-bold text-[#0B2A6B]">UPLOAD STATEMENT (PDF only allowed)</p>
            {wlaSelectedFile ? (
              <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-blue-100/80 px-3 py-1.5 text-xs font-bold text-blue-900 border border-blue-200">
                <FileCheck size={14} className="text-blue-700" />
                <span className="font-mono">{wlaSelectedFile}</span>
                <button
                  type="button"
                  onClick={() => setWlaSelectedFile(null)}
                  className="text-slate-400 hover:text-slate-600 ml-1"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <label className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs cursor-pointer hover:bg-blue-700 active:scale-95 transition-all">
                <Upload size={12} /> Upload PDF
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    setWlaFile(e.target.files?.[0] ?? null)
                  }}
                />
              </label>
            )}
          </div>

          {/* Password Protected Radio & Password Field */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-700 block">
              🔒 IS THE DOCUMENT PASSWORD PROTECTED?
            </span>
            <div className="flex items-center gap-6 text-xs font-semibold text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="pwdProtected"
                  checked={isPasswordProtected === 'yes'}
                  onChange={() => setIsPasswordProtected('yes')}
                  className="text-blue-600"
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="pwdProtected"
                  checked={isPasswordProtected === 'no'}
                  onChange={() => {
                    setIsPasswordProtected('no')
                    setWlaPassword('')
                  }}
                  className="text-blue-600"
                />
                <span>No</span>
              </label>
            </div>

            {/* When 'yes' is selected: Password Input Feature */}
            {isPasswordProtected === 'yes' && (
              <div className="pt-2.5 border-t border-slate-200/80 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between">
                  <label className="text-[10.5px] font-bold text-slate-700 flex items-center gap-1">
                    <Lock size={12} className="text-blue-600" />
                    DOCUMENT PASSWORD *
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showWlaPassword ? 'text' : 'password'}
                    value={wlaPassword}
                    onChange={(e) => setWlaPassword(e.target.value)}
                    placeholder="Enter PDF password (e.g. DOB/PAN)"
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 pr-10 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowWlaPassword(!showWlaPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title={showWlaPassword ? 'Hide password' : 'Show password'}
                  >
                    {showWlaPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Upload Button */}
          <button
            type="button"
            onClick={() => {
              if (isPasswordProtected === 'yes' && !wlaPassword.trim()) {
                alert('Please enter the document password to upload a password-protected statement.')
                return
              }
              const wlaInput = { siteId: wlaSite?.siteId ?? '', period: wlaPeriod, file: wlaFile ? { name: wlaFile.name, size: wlaFile.size } : null, passwordProtected: isPasswordProtected === 'yes', password: wlaPassword, readable: true, remarks: '' }
              if (apiEnabled) {
                // API mode: the statement file is uploaded (POST /files) and registered via POST /wla-statements (franchise-scoped)
                void uploadWlaAsync(wlaInput, 'Mobile App', wlaFile).then((r) => {
                  if (r.error) return alert(r.error)
                  setWlaSelectedFile(null)
                  setWlaPassword('')
                  alert(`WLA Statement for ${wlaMonthYear} uploaded — pending CRM verification.`)
                })
                return
              }
              const res = uploadWla(wlaInput, 'Mobile App')
              if (res.error) {
                alert(res.error)
                return
              }
              setWlaSelectedFile(null)
              setWlaPassword('')
              alert(`WLA Statement for ${wlaMonthYear} uploaded — pending CRM verification.`)
            }}
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all"
          >
            <Upload size={16} /> UPLOAD
          </button>

          {/* Statement History Header Button */}
          <div className="flex items-center justify-center rounded-xl border border-blue-300 bg-blue-50/60 py-2 text-xs font-extrabold text-[#0B2A6B] gap-1.5">
            <FileBarChart size={15} />
            STATEMENT HISTORY
          </div>

          {/* Statement History Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-center text-xs">
              <thead className="bg-blue-100/70 text-[#0B2A6B] font-bold text-[11px]">
                <tr>
                  <th className="py-2">MONTH</th>
                  <th className="py-2">STATUS</th>
                  <th className="py-2">REMARKS</th>
                  <th className="py-2">DOWNLOAD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {wlaStatements.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-slate-400">No statements uploaded yet.</td>
                  </tr>
                )}
                {wlaStatements.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-bold text-slate-800">{s.month}</td>
                    <td className="py-2.5">
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400">{s.remarks}</td>
                    <td className="py-2.5">
                      <button
                        onClick={() => alert(`${s.file} (${s.id}) — demo: no file server`)}
                        className="text-red-600 hover:text-red-700 mx-auto"
                      >
                        <Download size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // 5. Security Deposit Screen (Matching WhatsApp Image 2026-11-12 at 5.00.45 PM.jpeg)
  if (activeSub === 'security-deposit') {
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
            <h2 className="font-bold text-base">Security Deposits</h2>
          </div>
          <span className="text-xs text-blue-200">Site-wise Record</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            const site = sites.find((x) => x.atmId === sdAtmId)
            if (!site || !num(sdAmount) || !sdUtr.trim()) {
              alert('Select the ATM and enter the amount and UTR number.')
              return
            }
            if (apiFin) {
              // POST /my/finance/security-deposits (slip uploaded first as the franchise user's own file)
              if (!/^\d{9,18}$/.test(sdAccount.trim()) || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(sdIfsc.trim().toUpperCase())) {
                alert('Enter the account number (9–18 digits) and IFSC the deposit was paid from.')
                return
              }
              setFinBusy(true)
              void (async () => {
                try {
                  const attachmentFileId = sdFile ? await uploadMyFinanceFile(sdFile, 'security-deposit-slip') : undefined
                  const r = await submitMyFinance('security-deposits', {
                    atmId: site.atmId, paymentType: 'NEFT', paymentDate: sdDate, transactionDate: sdDate, txnNumber: sdUtr.trim(), amount: rupeesToPaise(sdAmount),
                    depositCategory: 'Security Deposit', frBankName: sdBank, accountHolder: (user?.name ?? franchise?.name ?? 'Franchise').slice(0, 120),
                    frAccount: sdAccount.trim(), frIfsc: sdIfsc.trim().toUpperCase(), ...(attachmentFileId ? { attachmentFileId } : {}),
                  })
                  setSdUtr('')
                  setSdAmount('')
                  setSdFile(null)
                  alert(`Security deposit ${r.recordId} submitted for Finance verification.`)
                } catch (err) {
                  alert(finErr(err))
                } finally {
                  setFinBusy(false)
                }
              })()
              return
            }
            const base = createEmptySecurityDeposit()
            const saved = saveSecurityDeposit({
              ...base,
              siteId: site.siteId,
              atmId: site.atmId,
              franchiseeName: franchise?.name ?? frId,
              franchiseeNo: frId,
              hpyAccount: getMasterAccountForAtm(site.atmId).hpyAccount,
              paymentDate: sdDate,
              transactionDate: sdDate,
              txnNumber: sdUtr.trim(),
              amount: String(num(sdAmount)),
              frBankName: sdBank,
              accountHolder: user?.name ?? '',
              attachmentName: sdFile?.name ?? '',
              attachmentSize: sdFile?.size ?? 0,
              status: 'Pending Verification',
            })
            setSdUtr('')
            setSdAmount('')
            setSdFile(null)
            alert(`Security deposit ${saved.receiptNo} submitted for Finance verification.`)
          }}
          className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3"
        >
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Select ATM ID</label>
            <select
              value={sdAtmId}
              onChange={(e) => setSdAtmId(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800"
            >
              {sites.map((x) => (
                <option key={x.atmId} value={x.atmId}>
                  {x.atmId} ({x.location})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">FUND AMOUNT</label>
            <input
              type="text"
              value={sdAmount}
              onChange={(e) => setSdAmount(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">DATE</label>
              <input
                type="date"
                value={sdDate}
                onChange={(e) => setSdDate(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">UTR NO</label>
              <input
                type="text"
                value={sdUtr}
                onChange={(e) => setSdUtr(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Select Bank</label>
            <select
              value={sdBank}
              onChange={(e) => setSdBank(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800"
            >
              <option value="Axis Bank">Axis Bank</option>
              <option value="HDFC Bank">HDFC Bank</option>
              <option value="ICICI Bank">ICICI Bank</option>
              <option value="State Bank of India">State Bank of India</option>
            </select>
          </div>
          {apiFin && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">PAID FROM A/C NO</label>
                <input inputMode="numeric" value={sdAccount} onChange={(e) => setSdAccount(e.target.value.replace(/\D/g, '').slice(0, 18))} className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">IFSC</label>
                <input value={sdIfsc} onChange={(e) => setSdIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))} className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800" />
              </div>
            </div>
          )}

          <div className="rounded-xl border border-dashed border-red-300 bg-red-50/20 p-4 text-center">
            <span className="text-[11px] font-bold text-slate-700 block mb-2">
              UPLOAD CONFIRMATION SLIP (IMAGE OR PDF)
            </span>
            <input ref={sdFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setSdFile(e.target.files?.[0] ?? null)} />
            <button
              type="button"
              onClick={() => sdFileRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs"
            >
              <Upload size={13} /> {sdFile ? sdFile.name : 'Upload Image or Pdf'}
            </button>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">VERIFICATION STATUS</label>
            <div className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 flex items-center text-xs font-bold text-emerald-600">
              {sdSelectedStatus ?? 'No deposit on record for this ATM'}
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-2xl border-2 border-red-600 text-red-600 font-extrabold text-xs hover:bg-red-50 tracking-wider"
          >
            UPDATE
          </button>
        </form>

        {/* History Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
          <span className="text-xs font-bold text-slate-800 block border-b pb-1">Security Deposit History</span>
          {sdHistory.length === 0 && <p className="text-[11px] text-slate-400">No security deposits recorded.</p>}
          {sdHistory.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-1 text-xs">
              <div>
                <span className="font-bold text-slate-800">{item.site}</span>
                <span className="text-[10px] text-slate-400 block">{item.utr} • {item.date}</span>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-[#0B2A6B] block">{item.amount}</span>
                <span className="text-[10px] font-bold text-emerald-600">{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Modals for GST (Invoice Preview & Document Viewer)
  const renderGstModals = () => {
    return (
      <>
        {/* GST Invoice Preview Modal */}
        {previewGstInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 animate-in fade-in duration-150 overflow-y-auto">
            <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl space-y-3 my-auto max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <Percent size={15} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-900">Tax Invoice Preview</h3>
                    <span className="text-[10px] text-slate-500 font-mono">{previewGstInvoice.invoiceNo}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewGstInvoice(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Realistic Tax Invoice Simulation */}
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3.5 space-y-3 text-[11px] shadow-xs">
                {/* Header */}
                <div className="text-center border-b border-slate-200 pb-2">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-900 block">
                    Tax Invoice
                  </span>
                  <h4 className="font-black text-xs text-slate-900">DEXTER INDIA SERVICES PVT. LTD.</h4>
                  <p className="text-[9.5px] text-slate-500">GSTIN: 09AAECD8812K1Z4 • State: Uttar Pradesh (09)</p>
                </div>

                {/* Billed to */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[10px]">Billed To:</span>
                    <span className="font-bold text-slate-800">{gstHeader?.franchiseeName || holderName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[10px]">Franchise GSTIN:</span>
                    <span className="font-mono font-bold text-slate-900">{gstHeader?.gstNumber || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[10px]">Invoice Date:</span>
                    <span className="font-medium text-slate-700">{previewGstInvoice.invoiceDate}</span>
                  </div>
                </div>

                {/* Line items table */}
                <div className="rounded-xl border border-slate-200 overflow-hidden text-[10.5px]">
                  <div className="bg-slate-100 font-bold px-2 py-1 text-slate-700 flex justify-between">
                    <span>Description (SAC 998311)</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="p-2 space-y-1 divide-y divide-slate-100">
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-600">ATM Operations Fee ({previewGstInvoice.month})</span>
                      <span className="font-mono font-bold text-slate-800">₹{previewGstInvoice.basicAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-600">CGST @ 9.0%</span>
                      <span className="font-mono font-bold text-slate-800">₹{previewGstInvoice.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-600">SGST @ 9.0%</span>
                      <span className="font-mono font-bold text-slate-800">₹{previewGstInvoice.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pt-1 font-bold bg-blue-50/60 p-1 rounded">
                      <span className="text-blue-950">Total Invoice Value (INR)</span>
                      <span className="font-mono text-[#0B2A6B]">₹{previewGstInvoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Stamp & Signature requirement box */}
                <div className="p-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 text-center">
                  <span className="text-[10px] font-bold text-amber-900 block">
                    Physical Signature & Franchisee Seal Required
                  </span>
                  <span className="text-[9px] text-amber-700">
                    Print this PDF, sign & stamp in bottom-right corner, then upload back.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => alert(`Downloading Invoice PDF: ${previewGstInvoice.invoiceNo}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  <Download size={13} /> Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewGstInvoice(null)}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GST Document Viewer Modal */}
        {viewGstDocModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <FileCheck size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-800">{viewGstDocModal.title}</h3>
                    <span className="text-[10px] text-slate-500 font-mono truncate max-w-[200px] block">
                      {viewGstDocModal.filename}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewGstDocModal(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Preview card */}
              <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-center space-y-2">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <FileCheck size={24} />
                </div>
                <h4 className="font-bold text-xs text-slate-800">{viewGstDocModal.filename}</h4>
                <p className="text-[10px] text-slate-500">
                  Verified document attached for GST input tax credit reconciliation.
                </p>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  COMPLIANCE VERIFIED
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => alert(`Downloading ${viewGstDocModal.filename}...`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  <Download size={13} /> Download
                </button>
                <button
                  type="button"
                  onClick={() => setViewGstDocModal(null)}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // 6. GST Screen (Dedicated Monthly Tiles + Dedicated Month Page)
  if (activeSub === 'gst') {
    const currentGstRecord = gstRecords.find((r) => r.id === selectedGstId)

    // A) If a month is selected: Dedicated Upload & Invoice Page
    if (currentGstRecord) {
      return (
        <div className="space-y-4 pb-8 pt-3 px-3">
          {/* Top Header */}
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedGstId(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 active:scale-95 transition-all"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="font-bold text-base leading-tight">GST Filing Details</h2>
                <span className="text-[10px] text-blue-200">{currentGstRecord.month}</span>
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${currentGstRecord.status === 'Verified & Approved'
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                : currentGstRecord.status === 'Submitted'
                  ? 'bg-blue-500/20 text-blue-200 border-blue-400/30'
                  : 'bg-amber-500/20 text-amber-200 border-amber-400/30'
                }`}
            >
              {currentGstRecord.status}
            </span>
          </div>

          {/* Month & Invoice Summary Card */}
          <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold text-slate-700">Tax Invoice Summary</span>
              <span className="text-[10.5px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                {currentGstRecord.invoiceNo}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Billed Franchisee</span>
                <span className="font-bold text-slate-800">{gstHeader?.franchiseeName || holderName}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Invoice Date</span>
                <span className="font-bold text-slate-800">{currentGstRecord.invoiceDate}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Basic Amount</span>
                <span className="font-bold text-slate-800">₹{currentGstRecord.basicAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">GST (CGST+SGST 18%)</span>
                <span className="font-bold text-slate-800">₹{(currentGstRecord.cgst + currentGstRecord.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="col-span-2 bg-blue-50/70 p-2.5 rounded-xl border border-blue-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block font-medium">Total Gross Invoice Amount</span>
                  <span className="text-base font-black text-[#0B2A6B]">
                    ₹{currentGstRecord.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Filing Due Date</span>
                  <span className="text-xs font-bold text-rose-600">{currentGstRecord.dueDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 1: Download System Generated Invoice */}
          <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold text-xs">
                1
              </div>
              <div>
                <h3 className="font-bold text-xs text-[#0B2A6B]">Download Dexter GST Invoice</h3>
                <p className="text-[10.5px] text-slate-500">Download pre-generated PDF to sign and affix franchise stamp</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPreviewGstInvoice(currentGstRecord)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 active:scale-95 transition-all"
              >
                <Download size={14} /> Download Invoice (PDF)
              </button>
              <button
                type="button"
                onClick={() => setPreviewGstInvoice(currentGstRecord)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs hover:bg-slate-100 active:scale-95 transition-all"
              >
                <Eye size={14} /> Preview
              </button>
            </div>
          </div>

          {/* STEP 2: Upload Signed & Stamped Invoice */}
          <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold text-xs">
                2
              </div>
              <div>
                <h3 className="font-bold text-xs text-[#0B2A6B]">Upload Signed & Stamped Invoice *</h3>
              </div>
            </div>

            {gstSignedFile ? (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <FileCheck size={18} className="text-emerald-700 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-900 block text-xs">{gstSignedFile}</span>
                    <span className="text-[10px] text-emerald-700">Signed & Stamped copy attached</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewGstDocModal({ title: 'Signed & Stamped GST Invoice', filename: gstSignedFile })}
                    className="text-blue-700 font-bold text-xs underline px-1.5 py-1"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => setGstSignedFile(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-blue-300 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 bg-blue-50/30 hover:bg-blue-50/70 transition-colors cursor-pointer text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Upload size={18} />
                </div>
                <span className="font-bold text-xs text-[#0B2A6B]">Tap to Upload Signed & Stamped Invoice</span>
                <span className="text-[10.5px] text-slate-500">PDF, JPG, PNG allowed (Max 5MB)</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setGstSignedFile(e.target.files[0].name)
                    }
                  }}
                />
              </label>
            )}
          </div>

          {/* STEP 3: Attach 2-3 Supporting Files (Including GSTR-2B Screenshot) */}
          <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold text-xs">
                3
              </div>
              <div>
                <h3 className="font-bold text-xs text-[#0B2A6B]">Supporting Documents (2-3 Files) *</h3>
                <p className="text-[10.5px] text-slate-500">Attach GSTR-2B portal screenshot & filing receipts</p>
              </div>
            </div>

            {/* Required Item: GSTR-2B Screenshot */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-bold text-xs text-amber-950 flex items-center gap-1">
                    <AlertCircle size={13} className="text-amber-700" /> GSTR-2B Screenshot / ITC Proof *
                  </span>
                </div>
              </div>

              {gstGstr2bFile ? (
                <div className="bg-white p-2.5 rounded-lg border border-amber-300 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <FileCheck size={14} className="text-amber-700" />
                    <span className="text-xs truncate max-w-[180px]">{gstGstr2bFile}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewGstDocModal({ title: 'GSTR-2B Portal Screenshot', filename: gstGstr2bFile })}
                      className="text-blue-700 font-bold text-xs underline px-1"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => setGstGstr2bFile(null)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="border border-dashed border-amber-300 rounded-xl p-2.5 flex items-center justify-center gap-2 bg-white hover:bg-amber-100/50 cursor-pointer transition-colors">
                  <Upload size={14} className="text-amber-700" />
                  <span className="text-xs font-bold text-amber-900">Upload GSTR-2B Screenshot</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setGstGstr2bFile(e.target.files[0].name)
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {/* Additional 1-2 Supporting Documents (Challan, CA Certificate, Bank Proof) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Additional Documents ({gstSupportingFiles.length}/2 attached)
                </span>
              </div>

              {gstSupportingFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-blue-600" />
                    <span className="font-semibold text-slate-800 text-xs truncate max-w-[200px]">{file}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setViewGstDocModal({ title: `Supporting Doc ${idx + 1}`, filename: file })}
                      className="text-blue-700 font-bold underline text-xs"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => setGstSupportingFiles(gstSupportingFiles.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}

              {gstSupportingFiles.length < 2 && (
                <label className="border border-dashed border-slate-300 rounded-xl p-2 flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-blue-50 cursor-pointer text-xs font-bold text-blue-700 transition-colors">
                  <PlusCircle size={14} /> Attach Additional Supporting Document
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setGstSupportingFiles([...gstSupportingFiles, e.target.files[0].name])
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* STEP 4: Declaration & Submit Form */}
          <form onSubmit={handleSubmitGstFiling} className="rounded-2xl border border-blue-200 bg-white p-4 shadow-xs space-y-3">
            <div>
              <label className="text-[10.5px] font-semibold text-slate-600 block mb-1">
                Franchise Remarks / Tax Filing Notes (Optional)
              </label>
              <textarea
                value={gstRemarks}
                onChange={(e) => setGstRemarks(e.target.value)}
                placeholder="e.g. GSTR-3B filed on 18th, ITC reflected in Table 4(A)(5)..."
                rows={2}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <label className="flex items-start gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                checked={gstDeclaration}
                onChange={(e) => setGstDeclaration(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                required
              />
              <span className="text-[10.5px] text-slate-600 leading-tight">
                I declare that the uploaded GST invoice has been physically signed & stamped with proprietor seal, and Dexter India ITC is verified in GSTR-2B.
              </span>
            </label>

            <button
              type="submit"
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all"
            >
              <Upload size={16} /> Submit GST Compliance for Verification
            </button>
          </form>

          {renderGstModals()}
        </div>
      )
    }

    // B) Main Month Tiles List View
    return (
      <div className="space-y-4 pb-6 pt-3 px-3">
        {/* Top Header */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSub('list')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 active:scale-95 transition-all"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="font-bold text-base leading-tight">GST Invoices & Filing</h2>
            </div>
          </div>
          <span className="rounded-xl bg-white/20 px-2 py-1 text-xs font-bold text-white border border-white/20">
            FY {gstRecords[0]?.fYear ?? '2026-27'}
          </span>
        </div>

        {/* GST KPI Summary Cards */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2">
            <span className="text-[9.5px] font-bold text-slate-500 block">Filed Months</span>
            <span className="text-sm font-black text-emerald-700">
              {gstRecords.filter((r) => r.status === 'Verified & Approved').length}
            </span>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-2">
            <span className="text-[9.5px] font-bold text-slate-500 block">In Verification</span>
            <span className="text-sm font-black text-blue-700">
              {gstRecords.filter((r) => r.status === 'Submitted').length}
            </span>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-2">
            <span className="text-[9.5px] font-bold text-slate-500 block">Pending Action</span>
            <span className="text-sm font-black text-amber-700">
              {gstRecords.filter((r) => r.status === 'Action Required').length}
            </span>
          </div>
        </div>

        {apiFin && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const atm = newGst.atmId || sites[0]?.atmId || ''
              if (!atm || !newGst.invoiceNumber.trim() || !rupeesToPaise(newGst.basic)) return alert('Select the ATM and enter the invoice number and basic amount.')
              if (!newGstFile) return alert('Attach the signed GST invoice (PDF / image).')
              setFinBusy(true)
              void (async () => {
                try {
                  const invoiceFileId = await uploadMyFinanceFile(newGstFile, 'gst-invoice')
                  const date = isoDate(newGst.invoiceDate)
                  const r = await submitMyFinance('gst-invoices', {
                    atmId: atm, fYear: fyOf(`${newGst.month}-01`), month: newGst.month, invoiceNumber: newGst.invoiceNumber.trim(), invoiceDate: date,
                    basicAmount: rupeesToPaise(newGst.basic), gstRatePct: Number(newGst.rate), interState: newGst.interState, roundOff: 0, remark: `${MOBILE_TAG} raised from the franchise app`, invoiceFileId,
                  })
                  setNewGst((g) => ({ ...g, invoiceNumber: '', basic: '' }))
                  setNewGstFile(null)
                  alert(`GST invoice ${r.recordId} submitted — Dexter Finance will verify it.`)
                } catch (err) {
                  alert(finErr(err))
                } finally {
                  setFinBusy(false)
                }
              })()
            }}
            className="rounded-2xl border border-blue-200 bg-white p-3 shadow-xs space-y-2"
          >
            <div className="text-xs font-bold text-slate-700">Raise a GST invoice</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <select aria-label="ATM" value={newGst.atmId || sites[0]?.atmId || ''} onChange={(e) => setNewGst({ ...newGst, atmId: e.target.value })} className="h-9 rounded-lg border border-slate-300 bg-white px-2 font-bold">
                {sites.map((x) => <option key={x.atmId} value={x.atmId}>{x.atmId}</option>)}
              </select>
              <input aria-label="Month" type="month" value={newGst.month} onChange={(e) => setNewGst({ ...newGst, month: e.target.value })} className="h-9 rounded-lg border border-slate-300 px-2 font-bold" />
              <input aria-label="Invoice number" placeholder="Invoice no." maxLength={16} value={newGst.invoiceNumber} onChange={(e) => setNewGst({ ...newGst, invoiceNumber: e.target.value })} className="h-9 rounded-lg border border-slate-300 px-2 font-bold" />
              <input aria-label="Invoice date" type="date" value={newGst.invoiceDate} onChange={(e) => setNewGst({ ...newGst, invoiceDate: e.target.value })} className="h-9 rounded-lg border border-slate-300 px-2 font-bold" />
              <input aria-label="Basic amount" placeholder="Basic amount ₹" inputMode="decimal" value={newGst.basic} onChange={(e) => setNewGst({ ...newGst, basic: e.target.value.replace(/[^\d.]/g, '') })} className="h-9 rounded-lg border border-slate-300 px-2 font-bold" />
              <select aria-label="GST rate" value={newGst.rate} onChange={(e) => setNewGst({ ...newGst, rate: e.target.value })} className="h-9 rounded-lg border border-slate-300 bg-white px-2 font-bold">
                {['0', '5', '12', '18', '28'].map((r) => <option key={r} value={r}>GST {r}%</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-[11px] text-slate-600">
              <input type="checkbox" checked={newGst.interState} onChange={(e) => setNewGst({ ...newGst, interState: e.target.checked })} /> Inter-state (IGST)
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2 text-[11px] text-slate-600">
              <Upload size={13} className="text-blue-600" /> {newGstFile ? newGstFile.name : 'Attach signed invoice (PDF / image)'}
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => setNewGstFile(e.target.files?.[0] ?? null)} />
            </label>
            <button type="submit" disabled={finBusy} className="w-full h-9 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-60">Submit invoice</button>
          </form>
        )}

        {/* Month Tiles List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700">Monthly Invoices ({gstRecords.length})</span>
          </div>

          {gstRecords.length === 0 && <p className="rounded-xl bg-white p-4 text-center text-xs text-slate-500">No GST invoices raised for your sites yet.</p>}
          {gstRecords.map((m) => {
            const isPending = m.status === 'Action Required'
            const isSubmitted = m.status === 'Submitted'
            return (
              <div
                key={m.id}
                onClick={() => handleOpenGstMonth(m)}
                className="group rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs hover:border-blue-400 hover:shadow-md active:scale-[0.99] transition-all cursor-pointer space-y-2.5"
              >
                {/* Top Row: Month Name & Status Pill + Chevron */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#0B2A6B] group-hover:text-blue-700 tracking-tight">
                      {m.month}
                    </h3>
                    <p className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                      Inv No : {m.invoiceNo}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${m.status === 'Verified & Approved'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : isSubmitted
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                    >
                      {m.status}
                    </span>
                    <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>

                {/* Middle Row: Amounts */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 text-[10.5px] block">Invoice Date</span>
                    <span className="font-semibold text-slate-800 text-xs">{m.invoiceDate}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10.5px] block">Gross Amount (with GST)</span>
                    <span className="font-bold text-[#0B2A6B] text-xs">
                      ₹{m.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Status Tag & Due Date */}
                <div className="flex items-center justify-between text-[10.5px] bg-slate-50/80 p-2 rounded-xl">
                  {isPending && (
                    <span className="text-amber-700 font-semibold flex items-center gap-1">
                      <AlertCircle size={12} /> Upload Signed Copy & GSTR-2B
                    </span>
                  )}
                  {isSubmitted && (
                    <span className="text-blue-700 font-semibold flex items-center gap-1">
                      <CheckCircle size={12} /> Under Verification • {m.submissionDate}
                    </span>
                  )}
                  {m.status === 'Verified & Approved' && (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle size={12} /> Verified & ITC Mapped
                    </span>
                  )}

                  <span className="text-slate-400">Due: {m.dueDate}</span>
                </div>
              </div>
            )
          })}
        </div>

        {renderGstModals()}
      </div>
    )
  }

  // 7, 8: TDS, Dynamic Limit screens
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
          <h2 className="font-bold text-base capitalize">{activeSub.replace('-', ' ')}</h2>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3">
        {activeSub === 'tds' && (
          <div>
            <p className="text-xs text-slate-600 mb-3">
              TDS certificates uploaded by the Finance team for your franchise:
            </p>
            <div className="space-y-2">
              {tdsMine.length === 0 && <p className="text-xs text-slate-400">No TDS documents uploaded yet.</p>}
              {tdsMine.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-blue-600" />
                    <div>
                      <span className="font-bold text-slate-800 block">{d.docType} – {d.period} {d.fy}</span>
                      <span className="text-[10px] text-slate-400">{d.file.name} · {fmtDateTime(d.uploadedAt)}</span>
                    </div>
                  </div>
                  <button onClick={() => { if (apiEnabled) { openTdsAsync(d.id, 'Download').catch((e: unknown) => alert(e instanceof Error ? e.message : 'Download failed')); return } accessTds(d.id, frId, user?.name ?? 'Franchise', 'Download', 'Mobile App'); alert(`${d.file.name} — download logged.`) }} className="text-blue-600 font-bold hover:underline">
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSub === 'dynamic-limit' && (
          <div className="space-y-3">
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-xs text-slate-700">
              <span className="font-bold text-[#0B2A6B] block mb-1">Dynamic Limit System Logic</span>
              Provisional: limit = CLF deposited for your ATMs; headroom = limit − CBR / Cash Loading amounts not yet approved (₹{pendingCash.toLocaleString('en-IN')}). Final formula pending Finance sign-off.
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-500 block">Active Dynamic Limit</span>
                <span className="text-base font-extrabold text-blue-700">₹{clfTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-500 block">Available Headroom</span>
                <span className="text-base font-extrabold text-emerald-600">₹{Math.max(0, clfTotal - pendingCash).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
