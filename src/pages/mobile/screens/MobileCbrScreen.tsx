import { useState, useRef, useEffect, useMemo } from 'react'
import { toast } from '@/components/ui/Toast'
import { siteStore, useSites } from '@/data/network'
import { apiEnabled, uploadFile } from '@/lib/api'
import { mobileFrStore } from '@/pages/operations/eod2/fmt'
import { ACK_TEXT, ACK_VERSION } from '@/data/workflow'
import { KIND_META, cbrMaster, checkSiteFor, newDoc, type CashDoc, type CashKind } from '@/data/cbr'
import { clMaster } from '@/data/cashLoadingRegisterStore'
import {
  Banknote,
  Calendar,
  CheckCircle2,
  Trash2,
  Box,
  Layers,
  HandCoins,
  MessageSquare,
  Save,
  Send,
  ArrowLeft,
  Search,
  Receipt,
  Upload,
  Camera,
  FileText,
  Eye,
  X,
  Check,
  Mic,
  MicOff
} from 'lucide-react'

interface MobileCbrScreenProps {
  onBackToMore?: () => void
}

type DenomKey = 100 | 200 | 500

export function MobileCbrScreen({ onBackToMore }: MobileCbrScreenProps) {
  // Mode: Axis Indent vs WLA Account Form
  const [mode, setMode] = useState<'axis' | 'wla'>('axis')

  // Header Form Fields — ATM is looked up in the Site Master; its funding model routes the entry to
  // CBR (Full Funding) or the Cash Loading Register (Self Funding) — Operations §2 / §3.
  const sites = useSites()
  const appSites = useMemo(() => {
    const frId = mobileFrStore.get()
    const ffm = sites.sites.filter((s) => s.frId === frId && s.siteType === 'FFM')
    const sf = sites.sites.filter((s) => s.frId === frId && s.siteType === 'SF')
    return [...ffm, ...sf]
  }, [sites])
  const [atmId, setAtmId] = useState(() => siteStore.get().sites.find((s) => s.frId === mobileFrStore.get() && (s.siteType === 'FFM' || s.siteType === 'SF'))?.atmId ?? '')
  const [txnDate, setTxnDate] = useState(() => new Date().toISOString().slice(0, 10))
  const route = useMemo(() => {
    const cbr = checkSiteFor('CBR', atmId)
    if (cbr.ok) return { ok: true as const, kind: 'CBR' as const, snap: cbr.snap }
    const cl = checkSiteFor('Cash Loading', atmId)
    if (cl.ok) return { ok: true as const, kind: 'Cash Loading' as const, snap: cl.snap }
    return { ok: false as const, error: cl.snap ? `${cl.snap.fundingModel} site (${cl.snap.siteType}) — CBR / Cash Loading entry is not applicable.` : cbr.error }
  }, [atmId])
  const [showAck, setShowAck] = useState(false)
  const [ackLang, setAckLang] = useState<'Hindi' | 'English'>('English')
  const [ackAgree, setAckAgree] = useState(false)
  const [submitted, setSubmitted] = useState<{ id: string; kind: CashKind } | null>(null)

  // Axis Indent Status Fields
  const [hpyGivenIndent, setHpyGivenIndent] = useState('500000')
  const [revisedIndent, setRevisedIndent] = useState('450000')
  const [withdrawalFund, setWithdrawalFund] = useState('6500')
  const [axisDenomCounts, setAxisDenomCounts] = useState<Record<DenomKey, number>>({
    100: 15,
    200: 10,
    500: 6
  })

  // WLA Account Status Fields
  const [lastDayBalance, setLastDayBalance] = useState('5500')
  const [hpyGivenFund, setHpyGivenFund] = useState('500000')
  const [wlaWithdrawalCounts, setWlaWithdrawalCounts] = useState<Record<DenomKey, number>>({
    100: 250,
    200: 200,
    500: 670
  })

  // 1. Reject Bin Counts
  const [rejectCounts, setRejectCounts] = useState<Record<DenomKey, number>>({
    100: 15,
    200: 10,
    500: 6
  })

  // 2. Cassette Counts
  const [cassetteCounts, setCassetteCounts] = useState<Record<DenomKey, number>>({
    100: 27,
    200: 16,
    500: 55
  })

  // 3. Total Loading Cash Counts
  const [loadingCounts, setLoadingCounts] = useState<Record<DenomKey, number>>({
    100: 15,
    200: 10,
    500: 6
  })

  // 4. Cash In Hand Counts
  const [handCounts, setHandCounts] = useState<Record<DenomKey, number>>({
    100: 15,
    200: 10,
    500: 6
  })

  // Remark
  const [remark, setRemark] = useState('')
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  const toggleVoiceTyping = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore
        }
      }
      setIsListening(false)
      return
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      const fallbackPhrases = [
        'CBR cash loading verified with admin counter slips 01 and 02.',
        'Replenishment completed with no discrepancy in purge bin.',
        'Cash in hand balanced with physical drawer count.',
        'Cassette A, B and C loaded according to indent status.'
      ]
      const randomPhrase = fallbackPhrases[Math.floor(Math.random() * fallbackPhrases.length)]
      setRemark((prev) => (prev ? `${prev} ${randomPhrase}` : randomPhrase))
      alert('Voice typing is not directly supported in this browser window. Simulated sample voice remark added!')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-IN'

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript
        if (transcript) {
          setRemark((prev) => (prev ? `${prev} ${transcript}` : transcript))
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        if (event.error === 'not-allowed') {
          alert('Microphone access was denied. Please allow microphone permission in your browser settings.')
        }
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.start()
    } catch (err) {
      console.error('Failed to start speech recognition:', err)
      setIsListening(false)
    }
  }

  // Submit Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Counter Slips (Counter 01 & Counter 02) Uploading Facility
  interface SlipFile {
    name: string
    size: string
    previewUrl?: string
    uploadedAt: string
    /** the picked file (API mode uploads it to POST /files before the record is saved) */
    file?: File
  }

  const [counter01Slip, setCounter01Slip] = useState<SlipFile | null>(null)
  const [counter02Slip, setCounter02Slip] = useState<SlipFile | null>(null)
  const [previewingSlip, setPreviewingSlip] = useState<'counter01' | 'counter02' | null>(null)

  const counter01InputRef = useRef<HTMLInputElement>(null)
  const counter02InputRef = useRef<HTMLInputElement>(null)
  const counter01CameraRef = useRef<HTMLInputElement>(null)
  const counter02CameraRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setSlip: React.Dispatch<React.SetStateAction<SlipFile | null>>,
    defaultName: string
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      const sizeInMb = (file.size / (1024 * 1024)).toFixed(2)
      const previewUrl = URL.createObjectURL(file)
      setSlip({
        name: file.name,
        size: `${sizeInMb} MB`,
        previewUrl,
        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        file,
      })
    } else {
      setSlip({
        name: defaultName,
        size: '1.24 MB',
        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })
    }
  }

  // Calculations
  const calcTotal = (counts: Record<DenomKey, number>) =>
    counts[100] * 100 + counts[200] * 200 + counts[500] * 500

  const totalReject = calcTotal(rejectCounts)
  const totalCassette = calcTotal(cassetteCounts)
  const totalLoading = calcTotal(loadingCounts)
  const totalHand = calcTotal(handCounts)
  const totalWlaWithdrawal = calcTotal(wlaWithdrawalCounts)
  const todayClosingBalance =
    Number(lastDayBalance || 0) + Number(hpyGivenFund || 0) - totalWlaWithdrawal

  const handleCountChange = (
    setter: React.Dispatch<React.SetStateAction<Record<DenomKey, number>>>,
    denom: DenomKey,
    value: string
  ) => {
    const numericVal = parseInt(value, 10)
    setter((prev) => ({
      ...prev,
      [denom]: isNaN(numericVal) || numericVal < 0 ? 0 : numericVal
    }))
  }

  const handleAxisCountChange = (denom: DenomKey, value: string) => {
    const numericVal = parseInt(value, 10)
    const newCount = isNaN(numericVal) || numericVal < 0 ? 0 : numericVal
    const next = { ...axisDenomCounts, [denom]: newCount }
    setAxisDenomCounts(next)
    setWithdrawalFund(String(calcTotal(next)))
  }

  // Map the app form onto the funding-model master (CBR for FFM, Cash Loading for SF).
  const slipDoc = (s: SlipFile | null, label: string): CashDoc[] => (s ? [newDoc(`${label} – ${s.name}`, Math.round((parseFloat(s.size) || 1) * 1024 * 1024))] : [])
  const masterInput = (kind: CashKind) => ({
    atmId,
    formName: KIND_META[kind].formNames[0],
    date: txnDate,
    lastDate: '',
    amount: totalLoading,
    dailyIndent: mode === 'axis' ? Number(revisedIndent || hpyGivenIndent || 0) : Number(hpyGivenFund || 0),
    cashWithdrawal: mode === 'axis' ? Number(withdrawalFund || 0) : totalWlaWithdrawal,
    openingBalance: kind === 'Cash Loading' && mode === 'wla' ? Number(lastDayBalance || 0) : 0,
    remarks: `${mode === 'axis' ? 'Axis Indent' : 'WLA Account'} form (app). ${remark}`.trim(),
    documents: [...slipDoc(counter01Slip, 'Counter 01'), ...slipDoc(counter02Slip, 'Counter 02')],
  })
  const masterFor = (kind: CashKind) => (kind === 'CBR' ? cbrMaster : clMaster)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!route.ok) {
      toast(route.error, 'error')
      return
    }
    if (totalLoading <= 0) {
      toast('Enter the loading denominations before submitting.', 'error')
      return
    }
    if (!counter01Slip && !counter02Slip) {
      toast('Attach at least one counter slip.', 'error')
      return
    }
    setAckAgree(false)
    setShowAck(true)
  }

  /** API mode: upload the picked counter slips → documents carrying the server file ids. */
  const uploadSlips = async (): Promise<CashDoc[]> => {
    const out: CashDoc[] = []
    for (const [s, label] of [[counter01Slip, 'Counter 01'], [counter02Slip, 'Counter 02']] as const) {
      if (!s) continue
      if (!s.file) throw new Error(`${label} slip: pick the photo / PDF again (the file is needed for upload).`)
      const r = await uploadFile(s.file, { purpose: 'cbr-slip', entity: route.ok && route.kind === 'CBR' ? 'CbrRecord' : 'CashLoadingRecord' })
      out.push({ id: r.fileId, name: `${label} – ${s.name}`, size: s.file.size, at: new Date().toISOString(), by: 'Franchise App' })
    }
    return out
  }
  const confirmAckApi = async (kind: CashKind) => {
    const master = masterFor(kind)
    try {
      const documents = await uploadSlips()
      const saved = await master.saveDraftAsync({ ...masterInput(kind), documents }, { asFranchise: true, channel: 'Franchise App' })
      if (!saved.ok) return toast(saved.error, 'error')
      const res = await master.submitAsync(saved.id, { lang: ackLang, asFranchise: true })
      if (!res.ok) return toast(`${res.error} (kept as draft ${saved.id})`, 'error')
      setSubmitted({ id: saved.id, kind })
      setShowSuccessModal(true)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmAck = () => {
    if (!route.ok) return
    setShowAck(false)
    setIsSubmitting(true)
    if (apiEnabled) {
      void confirmAckApi(route.kind)
      return
    }
    const master = masterFor(route.kind)
    const saved = master.saveDraft(masterInput(route.kind), { asFranchise: true, channel: 'Franchise App' })
    if (!saved.ok) {
      setIsSubmitting(false)
      toast(saved.error, 'error')
      return
    }
    const res = master.submit(saved.id, { lang: ackLang, asFranchise: true })
    setIsSubmitting(false)
    if (!res.ok) {
      toast(`${res.error} (kept as draft ${saved.id})`, 'error')
      return
    }
    setSubmitted({ id: saved.id, kind: route.kind })
    setShowSuccessModal(true)
  }

  const saveDraft = () => {
    if (!route.ok) {
      toast(route.error, 'error')
      return
    }
    if (apiEnabled) {
      const kind = route.kind
      void uploadSlips()
        .then((documents) => masterFor(kind).saveDraftAsync({ ...masterInput(kind), documents }, { asFranchise: true, channel: 'Franchise App' }))
        .then((res) => (res.ok ? toast(`Draft ${res.id} saved`, 'info') : toast(res.error, 'error')))
        .catch((err) => toast(err instanceof Error ? err.message : 'Upload failed', 'error'))
      return
    }
    const res = masterFor(route.kind).saveDraft(masterInput(route.kind), { asFranchise: true, channel: 'Franchise App' })
    if (res.ok) toast(`Draft ${res.id} saved`, 'info')
    else toast(res.error, 'error')
  }

  return (
    <div className="space-y-3 pb-8 pt-2 px-3 no-scrollbar select-none text-slate-800">
      {/* =========================================================================
       * 1. TITLE & FORM TYPE SWITCHER
       * ========================================================================= */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-blue-100 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#1675F8] border border-blue-200/60 shadow-2xs">
            <Banknote size={20} className="stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-[13.5px] font-black text-[#0A2665] leading-tight">
              {mode === 'axis' ? 'Cash Loading Details – Axis Indent' : 'Cash Loading Form – WLA Account'}
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">
              Enter daily loading details & reconciliation.
            </p>
          </div>
        </div>
      </div>

      {/* Segmented Mode Selector Tabs */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-200/70 border border-slate-300/50">
        <button
          type="button"
          onClick={() => setMode('axis')}
          className={`py-1.5 text-center text-xs font-bold rounded-lg transition-all ${mode === 'axis'
            ? 'bg-[#1258E2] text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Axis Indent Form
        </button>
        <button
          type="button"
          onClick={() => setMode('wla')}
          className={`py-1.5 text-center text-xs font-bold rounded-lg transition-all ${mode === 'wla'
            ? 'bg-[#1258E2] text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          WLA Account Form
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* =========================================================================
         * 2. EDITABLE FORM HEADER (ATM ID & DATE PICKER)
         * ========================================================================= */}
        <div className="rounded-2xl border border-blue-100 bg-white p-2.5 shadow-2xs grid grid-cols-2 gap-2 text-xs">
          {/* ATM ID Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
              <span>ATM ID</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                value={atmId}
                list="mobile-cbr-atms"
                onChange={(e) => setAtmId(e.target.value)}
                placeholder="Search ATM ID"
                className="w-full h-8 pl-6 pr-2 rounded-lg border border-blue-200 bg-blue-50/40 text-[11px] font-black text-[#0A2665] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <datalist id="mobile-cbr-atms">
                {appSites.map((s) => (
                  <option key={s.siteId} value={s.atmId}>
                    {s.siteType === 'FFM' ? 'Full Funding' : 'Self Funding'} · {s.location}
                  </option>
                ))}
              </datalist>
              <Search size={11} className="absolute left-2 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Date Picker Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
              <span>Date</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={txnDate}
                onChange={(e) => setTxnDate(e.target.value)}
                className="w-full h-8 pl-6 pr-2 rounded-lg border border-blue-200 bg-blue-50/40 text-[11px] font-black text-[#0A2665] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Calendar size={11} className="absolute left-2 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div
            className={`col-span-2 rounded-lg px-2 py-1.5 text-[10.5px] font-bold ${route.ok ? (route.kind === 'CBR' ? 'bg-violet-50 text-violet-700 border border-violet-200' : 'bg-amber-50 text-amber-700 border border-amber-200') : 'bg-rose-50 text-rose-700 border border-rose-200'}`}
          >
            {route.ok
              ? `${route.snap.franchiseName} · ${route.snap.atmLocation} · ${route.snap.bank} — ${route.snap.fundingModel}: saved as ${route.kind === 'CBR' ? 'CBR (Cash Replacement)' : 'Cash Loading'}`
              : route.error}
          </div>
        </div>

        {/* =========================================================================
         * 3. AXIS INDENT STATUS TABLE (MATCHING 4.56.41 PM.jpeg)
         * ========================================================================= */}
        {mode === 'axis' && (
          <div className="rounded-2xl border border-blue-200/90 bg-white overflow-hidden shadow-2xs">
            <div className="bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] px-3 py-1.5 text-white text-[11.5px] font-black text-center">
              ICICI SR / Axis Indent Status
            </div>
            <div className="divide-y divide-blue-50 text-[11px]">
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="font-bold text-slate-700">HPY Given Indent</span>
                <input
                  type="number"
                  value={hpyGivenIndent}
                  onChange={(e) => setHpyGivenIndent(e.target.value)}
                  className="w-24 h-6 text-right px-1.5 rounded-md border border-slate-200 bg-slate-50 font-black text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 no-spin [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="font-bold text-slate-700">Revised Indent</span>
                <input
                  type="number"
                  value={revisedIndent}
                  onChange={(e) => setRevisedIndent(e.target.value)}
                  className="w-24 h-6 text-right px-1.5 rounded-md border border-slate-200 bg-slate-50 font-black text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 no-spin [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50/30">
                <span className="font-bold text-slate-700">Withdrawal Axis Indent Fund</span>
                <input
                  type="number"
                  value={withdrawalFund}
                  onChange={(e) => setWithdrawalFund(e.target.value)}
                  className="w-24 h-6 text-right px-1.5 rounded-md border border-blue-300 bg-white font-black text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 no-spin [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              {/* Denomination Table (matching Image 2) */}
              <div className="overflow-hidden bg-white">
                <table className="w-full text-center text-xs">
                  <thead className="bg-[#F8FAFC] text-slate-700 text-[11px] font-bold border-t border-b border-slate-100">
                    <tr>
                      <th className="py-2 w-1/3">Denomination</th>
                      <th className="py-2 w-1/3">Count</th>
                      <th className="py-2 w-1/3">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[12px]">
                    {([100, 200, 500] as const).map((denom) => (
                      <tr key={denom} className="hover:bg-blue-50/20">
                        <td className="py-2 font-black text-slate-900">{denom}</td>
                        <td className="py-1.5 flex justify-center">
                          <input
                            type="number"
                            min="0"
                            value={axisDenomCounts[denom]}
                            onChange={(e) => handleAxisCountChange(denom, e.target.value)}
                            className="w-16 h-7 text-center rounded-xl border border-blue-300 bg-white text-slate-900 text-xs font-black focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs no-spin [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                        <td className="py-2 font-black text-slate-900">
                          {(axisDenomCounts[denom] * denom).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
         * 3B. WLA ACCOUNT STATUS TABLE (MATCHING 4.56.42 PM.jpeg)
         * ========================================================================= */}
        {mode === 'wla' && (
          <div className="rounded-2xl border border-blue-200/90 bg-white overflow-hidden shadow-2xs">
            <div className="bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] px-3 py-1.5 text-white text-[11.5px] font-black text-center">
              White Level Account Status
            </div>
            <div className="p-2.5 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[9.5px] text-slate-500 block font-bold">Last Day Account Balance</span>
                  <input
                    type="number"
                    value={lastDayBalance}
                    onChange={(e) => setLastDayBalance(e.target.value)}
                    className="w-full mt-0.5 h-6 text-left px-1 rounded border border-slate-200 bg-white font-black text-slate-900 text-xs no-spin [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[9.5px] text-slate-500 block font-bold">HPY Given Fund</span>
                  <input
                    type="number"
                    value={hpyGivenFund}
                    onChange={(e) => setHpyGivenFund(e.target.value)}
                    className="w-full mt-0.5 h-6 text-left px-1 rounded border border-slate-200 bg-white font-black text-slate-900 text-xs no-spin [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* Today Withdrawal Fund Table */}
              <div className="rounded-xl border border-blue-100 overflow-hidden">
                <div className="bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-900">
                  Today Withdrawal Fund – Denomination-wise
                </div>
                <table className="w-full text-center text-xs">
                  <thead className="bg-slate-50 text-[10px] text-slate-600 border-b border-slate-100">
                    <tr>
                      <th className="py-1">Denomination</th>
                      <th className="py-1">Count</th>
                      <th className="py-1">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {([100, 200, 500] as const).map((denom) => (
                      <tr key={denom} className="hover:bg-blue-50/30">
                        <td className="py-1 font-bold text-slate-800">₹ {denom}</td>
                        <td className="py-1">
                          <input
                            type="number"
                            value={wlaWithdrawalCounts[denom]}
                            onChange={(e) => handleCountChange(setWlaWithdrawalCounts, denom, e.target.value)}
                            className="w-14 h-5.5 text-center rounded border border-blue-200 bg-white font-bold text-slate-900 no-spin [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                        <td className="py-1 font-black text-slate-900">
                          {(wlaWithdrawalCounts[denom] * denom).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between bg-blue-600 text-white px-3 py-1 text-[11px] font-black">
                  <span>Total Today Withdrawal Fund</span>
                  <span>₹ {totalWlaWithdrawal.toLocaleString()}</span>
                </div>
              </div>

              {/* Today Account Closing Balance */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/80 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-900">Today Account Closing Balance</span>
                <span className="font-black text-emerald-700 text-xs">₹ {todayClosingBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
         * 4. REJECT BIN TABLE (MATCHING 4.56.41 PM.jpeg)
         * ========================================================================= */}
        <div className="rounded-2xl border border-blue-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] px-3 py-1.5 text-white text-[11.5px] font-bold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Trash2 size={13} className="text-white" />
              <span>Reject Bin</span>
            </div>
            <span className="text-[9.5px] text-blue-200 font-medium">Reconciliation</span>
          </div>

          <table className="w-full text-center text-xs">
            <thead className="bg-slate-50 text-slate-600 text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-1.5 w-1/3">Denomination</th>
                <th className="py-1.5 w-1/3">Count</th>
                <th className="py-1.5 w-1/3">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {([100, 200, 500] as const).map((denom) => (
                <tr key={denom} className="hover:bg-blue-50/20">
                  <td className="py-1.5 font-black text-slate-800">{denom}</td>
                  <td className="py-1.5">
                    <input
                      type="number"
                      value={rejectCounts[denom]}
                      onChange={(e) => handleCountChange(setRejectCounts, denom, e.target.value)}
                      className="w-16 h-6 text-center rounded-lg border border-blue-200 bg-white text-slate-900 text-xs font-black focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs no-spin [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </td>
                  <td className="py-1.5 font-black text-slate-900">
                    {(rejectCounts[denom] * denom).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center bg-[#1258E2] text-white px-3 py-1.5 text-xs font-black">
            <span>Total Reject Bin</span>
            <span>₹ {totalReject.toLocaleString()}</span>
          </div>
        </div>

        {/* =========================================================================
         * 5. CASSETTE TABLE (MATCHING 4.56.41 PM.jpeg)
         * ========================================================================= */}
        <div className="rounded-2xl border border-blue-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] px-3 py-1.5 text-white text-[11.5px] font-bold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Box size={13} className="text-white" />
              <span>Cassette</span>
            </div>
            <span className="text-[9.5px] text-blue-200 font-medium">Dispenser Load</span>
          </div>

          <table className="w-full text-center text-xs">
            <thead className="bg-slate-50 text-slate-600 text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-1.5 w-1/3">Denomination</th>
                <th className="py-1.5 w-1/3">Count</th>
                <th className="py-1.5 w-1/3">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {([100, 200, 500] as const).map((denom) => (
                <tr key={denom} className="hover:bg-blue-50/20">
                  <td className="py-1.5 font-black text-slate-800">{denom}</td>
                  <td className="py-1.5">
                    <input
                      type="number"
                      value={cassetteCounts[denom]}
                      onChange={(e) => handleCountChange(setCassetteCounts, denom, e.target.value)}
                      className="w-16 h-6 text-center rounded-lg border border-blue-200 bg-white text-slate-900 text-xs font-black focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs no-spin [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </td>
                  <td className="py-1.5 font-black text-slate-900">
                    {(cassetteCounts[denom] * denom).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center bg-[#1258E2] text-white px-3 py-1.5 text-xs font-black">
            <span>Total Cassette</span>
            <span>₹ {totalCassette.toLocaleString()}</span>
          </div>
        </div>

        {/* =========================================================================
         * 6. TOTAL LOADING CASH TABLE (MATCHING 4.56.41 PM.jpeg)
         * ========================================================================= */}
        <div className="rounded-2xl border border-blue-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] px-3 py-1.5 text-white text-[11.5px] font-bold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers size={13} className="text-white" />
              <span>Total Loading Cash</span>
            </div>
            <span className="text-[9.5px] text-blue-200 font-medium">Reconciled Cash</span>
          </div>

          <table className="w-full text-center text-xs">
            <thead className="bg-slate-50 text-slate-600 text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-1.5 w-1/3">Denomination</th>
                <th className="py-1.5 w-1/3">Count</th>
                <th className="py-1.5 w-1/3">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {([100, 200, 500] as const).map((denom) => (
                <tr key={denom} className="hover:bg-blue-50/20">
                  <td className="py-1.5 font-black text-slate-800">{denom}</td>
                  <td className="py-1.5">
                    <input
                      type="number"
                      value={loadingCounts[denom]}
                      onChange={(e) => handleCountChange(setLoadingCounts, denom, e.target.value)}
                      className="w-16 h-6 text-center rounded-lg border border-blue-200 bg-white text-slate-900 text-xs font-black focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs no-spin [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </td>
                  <td className="py-1.5 font-black text-slate-900">
                    {(loadingCounts[denom] * denom).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center bg-[#1258E2] text-white px-3 py-1.5 text-xs font-black">
            <span>Total Loading Cash</span>
            <span>₹ {totalLoading.toLocaleString()}</span>
          </div>
        </div>

        {/* =========================================================================
         * 7. CASH IN HAND TABLE (MATCHING 4.56.41 PM.jpeg)
         * ========================================================================= */}
        <div className="rounded-2xl border border-blue-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] px-3 py-1.5 text-white text-[11.5px] font-bold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <HandCoins size={13} className="text-white" />
              <span>Cash In Hand</span>
            </div>
            <span className="text-[9.5px] text-blue-200 font-medium">Physical Custody</span>
          </div>

          <table className="w-full text-center text-xs">
            <thead className="bg-slate-50 text-slate-600 text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-1.5 w-1/3">Denomination</th>
                <th className="py-1.5 w-1/3">Count</th>
                <th className="py-1.5 w-1/3">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {([100, 200, 500] as const).map((denom) => (
                <tr key={denom} className="hover:bg-blue-50/20">
                  <td className="py-1.5 font-black text-slate-800">{denom}</td>
                  <td className="py-1.5">
                    <input
                      type="number"
                      value={handCounts[denom]}
                      onChange={(e) => handleCountChange(setHandCounts, denom, e.target.value)}
                      className="w-16 h-6 text-center rounded-lg border border-blue-200 bg-white text-slate-900 text-xs font-black focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs no-spin [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </td>
                  <td className="py-1.5 font-black text-slate-900">
                    {(handCounts[denom] * denom).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center bg-[#1258E2] text-white px-3 py-1.5 text-xs font-black">
            <span>Total Cash In Hand</span>
            <span>₹ {totalHand.toLocaleString()}</span>
          </div>
        </div>

        {/* =========================================================================
         * 7B. COUNTER 01 & COUNTER 02 SLIPS UPLOADING FACILITY
         * ========================================================================= */}
        <div className="rounded-2xl border border-blue-200/90 bg-white overflow-hidden shadow-2xs space-y-0">
          <div className="bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] px-3 py-1.5 text-white text-[11.5px] font-bold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Receipt size={13} className="text-white" />
              <span>Counter 01 & Counter 02 Slips</span>
            </div>
            <span className="text-[9.5px] text-blue-200 font-medium">Mandatory Upload</span>
          </div>

          <div className="p-3 space-y-3">
            {/* Hidden native inputs for Gallery/Files and Camera */}
            <input
              type="file"
              ref={counter01InputRef}
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => handleFileUpload(e, setCounter01Slip, 'Counter_01_Admin_Slip.jpg')}
            />
            <input
              type="file"
              ref={counter01CameraRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileUpload(e, setCounter01Slip, 'Counter_01_Camera_Snap.jpg')}
            />
            <input
              type="file"
              ref={counter02InputRef}
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => handleFileUpload(e, setCounter02Slip, 'Counter_02_Loading_Slip.jpg')}
            />
            <input
              type="file"
              ref={counter02CameraRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileUpload(e, setCounter02Slip, 'Counter_02_Camera_Snap.jpg')}
            />

            {/* Counter 01 Slip */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-md bg-[#1258E2] text-white text-[10px] font-black flex items-center justify-center">
                      1
                    </span>
                    <span className="font-bold text-slate-800 text-xs">Counter 01 Slip</span>
                    <span className="text-red-500 font-bold">*</span>
                  </div>
                </div>
                {counter01Slip && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
                    <Check size={10} /> Attached
                  </span>
                )}
              </div>

              {counter01Slip ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-slate-800 text-xs truncate block">
                        {counter01Slip.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {counter01Slip.size} • Uploaded at {counter01Slip.uploadedAt}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewingSlip('counter01')}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 hover:bg-blue-100 flex items-center gap-1"
                    >
                      <Eye size={12} /> View
                    </button>
                    <button
                      type="button"
                      onClick={() => setCounter01Slip(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Remove slip"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => counter01CameraRef.current?.click()}
                    className="h-9 px-3 rounded-xl border border-blue-200 bg-white text-blue-700 text-xs font-bold hover:bg-blue-50 flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                  >
                    <Camera size={14} className="text-blue-600" />
                    <span>Take Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => counter01InputRef.current?.click()}
                    className="h-9 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
                  >
                    <Upload size={14} />
                    <span>Upload Slip</span>
                  </button>
                </div>
              )}
            </div>

            {/* Counter 02 Slip */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-md bg-[#1258E2] text-white text-[10px] font-black flex items-center justify-center">
                      2
                    </span>
                    <span className="font-bold text-slate-800 text-xs">Counter 02 Slip</span>
                    <span className="text-red-500 font-bold">*</span>
                  </div>
                </div>
                {counter02Slip && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
                    <Check size={10} /> Attached
                  </span>
                )}
              </div>

              {counter02Slip ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-slate-800 text-xs truncate block">
                        {counter02Slip.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {counter02Slip.size} • Uploaded at {counter02Slip.uploadedAt}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewingSlip('counter02')}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 hover:bg-blue-100 flex items-center gap-1"
                    >
                      <Eye size={12} /> View
                    </button>
                    <button
                      type="button"
                      onClick={() => setCounter02Slip(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Remove slip"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => counter02CameraRef.current?.click()}
                    className="h-9 px-3 rounded-xl border border-blue-200 bg-white text-blue-700 text-xs font-bold hover:bg-blue-50 flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                  >
                    <Camera size={14} className="text-blue-600" />
                    <span>Take Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => counter02InputRef.current?.click()}
                    className="h-9 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
                  >
                    <Upload size={14} />
                    <span>Upload Slip</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
         * 8. REMARK FIELD WITH GOOGLE VOICE TYPING
         * ========================================================================= */}
        <div className="rounded-2xl border border-blue-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] px-3 py-1.5 text-white text-[11.5px] font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <MessageSquare size={13} className="text-white" />
                <span>Remark</span>
              </div>
            </div>
            <span className="text-[9.5px] text-blue-200 font-mono">{remark.length} / 500</span>
          </div>
          <div className="p-2.5">
            <div className="relative">
              <input
                type="text"
                value={remark}
                maxLength={500}
                onChange={(e) => setRemark(e.target.value)}
                placeholder={
                  isListening
                    ? "🎙️ Listening... Speak now in Hindi or English..."
                    : "Enter Remark (e.g. Loading completed without machine jam)..."
                }
                className={`w-full h-9 rounded-xl border pr-9 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${isListening
                    ? 'border-rose-400 ring-2 ring-rose-200 bg-rose-50/20'
                    : 'border-slate-200 bg-slate-50/60 pl-3'
                  }`}
              />

              {/* Floating Google Voice Mic Button */}
              <button
                type="button"
                onClick={toggleVoiceTyping}
                className={`absolute right-1.5 top-1 p-1 rounded-full transition-all shadow-2xs ${isListening
                    ? 'bg-rose-600 text-white ring-2 ring-rose-200 animate-pulse'
                    : 'bg-white text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-300'
                  }`}
                title={isListening ? "Stop voice listening" : "Start Google voice mic typing"}
              >
                {isListening ? <MicOff size={13} /> : <Mic size={13} />}
              </button>
            </div>

            {isListening && (
              <p className="mt-1.5 text-[9.5px] font-semibold text-rose-600 flex items-center gap-1.5 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                Google Voice typing active. Speak clearly into your microphone...
              </p>
            )}
          </div>
        </div>

        {/* =========================================================================
         * 9. BOTTOM ACTION PILL BUTTONS (MATCHING 4.56.41 PM.jpeg)
         * ========================================================================= */}
        <div className="flex items-center gap-2 pt-1">
          {onBackToMore && (
            <button
              type="button"
              onClick={onBackToMore}
              className="h-10 px-3.5 rounded-full border border-blue-300 bg-white text-xs font-bold text-[#1258E2] hover:bg-blue-50 active:scale-95 transition-all shadow-2xs flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}

          <button
            type="button"
            onClick={saveDraft}
            className="flex-1 h-10 rounded-full border border-blue-300 bg-blue-50/80 text-[#1258E2] text-xs font-bold hover:bg-blue-100 active:scale-95 transition-all shadow-2xs flex items-center justify-center gap-1.5"
          >
            <Save size={14} /> Save Draft
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 h-10 rounded-full bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] text-white text-xs font-bold shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                <Send size={14} /> Submit
              </>
            )}
          </button>
        </div>
      </form>

      {/* =========================================================================
       * SUCCESS MODAL POPUP
       * ========================================================================= */}
      {showAck && route.ok && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xs rounded-3xl bg-white p-4 shadow-2xl text-left space-y-2.5">
            <h3 className="font-black text-sm text-[#0A2665]">Acknowledgement / पावती</h3>
            <p className="text-[10px] text-slate-500">
              {route.kind} · {atmId} · ₹{totalLoading.toLocaleString('en-IN')} · {ACK_VERSION}
            </p>
            <p className="rounded-xl bg-slate-50 border border-slate-200 p-2 text-[11px] text-slate-700">{ACK_TEXT.English}</p>
            <p className="rounded-xl bg-slate-50 border border-slate-200 p-2 text-[11px] text-slate-700">{ACK_TEXT.Hindi}</p>
            <div className="flex gap-3 text-[11px] font-bold text-slate-700">
              {(['English', 'Hindi'] as const).map((l) => (
                <label key={l} className="flex items-center gap-1">
                  <input type="radio" name="mobile-ack-lang" checked={ackLang === l} onChange={() => setAckLang(l)} />
                  {l === 'Hindi' ? 'हिन्दी' : 'English'}
                </label>
              ))}
            </div>
            <label className="flex items-start gap-1.5 text-[11px] text-slate-700">
              <input type="checkbox" className="mt-0.5" checked={ackAgree} onChange={(e) => setAckAgree(e.target.checked)} />
              I agree / मैं सहमत हूँ
            </label>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowAck(false)} className="flex-1 h-9 rounded-full border border-blue-300 text-xs font-bold text-[#1258E2]">
                Cancel
              </button>
              <button type="button" disabled={!ackAgree} onClick={confirmAck} className="flex-1 h-9 rounded-full bg-[#1258E2] text-white text-xs font-bold disabled:opacity-50">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xs rounded-3xl bg-white p-5 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3 shadow-inner">
              <CheckCircle2 size={26} strokeWidth={2.5} />
            </div>
            <h3 className="font-black text-base text-[#0A2665]">{submitted?.kind === 'Cash Loading' ? 'Cash Loading' : 'CBR'} Submitted!</h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              {submitted?.id} for <strong className="text-slate-900">{atmId}</strong> is now Pending Verification by the CRM Executive (acknowledged in {ackLang}, {ACK_VERSION}).
            </p>

            <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Total Loading:</span>
                <strong className="text-slate-900">₹{totalLoading.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Date:</span>
                <strong className="text-slate-900">{txnDate}</strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Counter Slips:</span>
                <strong className="text-emerald-600">
                  {counter01Slip && counter02Slip
                    ? 'Both Attached (C01 + C02)'
                    : counter01Slip
                      ? 'Counter 01 Attached'
                      : counter02Slip
                        ? 'Counter 02 Attached'
                        : 'Attached ✓'}
                </strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Status:</span>
                <strong className="text-amber-600">PENDING VERIFICATION</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false)
                onBackToMore?.()
              }}
              className="mt-4 w-full h-10 rounded-xl bg-[#1258E2] text-white font-bold text-xs shadow-md hover:bg-blue-700 active:scale-95 transition-all"
            >
              Done / Return to Modules
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
       * SLIP PREVIEW MODAL
       * ========================================================================= */}
      {previewingSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] px-3.5 py-2.5 text-white flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black">
                  {previewingSlip === 'counter01' ? 'Counter 01 Slip Preview' : 'Counter 02 Slip Preview'}
                </h4>
                <p className="text-[10px] text-blue-100 truncate max-w-[220px]">
                  {previewingSlip === 'counter01' ? counter01Slip?.name : counter02Slip?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingSlip(null)}
                className="h-6 w-6 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white"
              >
                <X size={13} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Simulated Slip Thermal Receipt */}
              <div className="rounded-xl border border-slate-300 bg-amber-50/25 p-3.5 font-mono text-[11px] text-slate-800 space-y-1.5 shadow-inner">
                <div className="text-center border-b border-dashed border-slate-400 pb-2">
                  <span className="font-black text-xs block">*** ATM ADMIN COUNTER SLIP ***</span>
                  <span className="text-[10px] text-slate-500 block">DEXTER ATM CASH LOGISTICS</span>
                  <span className="text-[10px] text-slate-600 block">
                    {previewingSlip === 'counter01'
                      ? 'STAGE: COUNTER 01 (PRE-REPLENISHMENT)'
                      : 'STAGE: COUNTER 02 (POST-LOADING)'}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">ATM ID:</span>
                  <span className="font-bold">{atmId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">DATE:</span>
                  <span>{txnDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TIME:</span>
                  <span>{(previewingSlip === 'counter01' ? counter01Slip : counter02Slip)?.uploadedAt ?? '—'}</span>
                </div>
                <div className="border-t border-dashed border-slate-400 pt-1.5 space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>CASSETTE A (₹500):</span>
                    <span>{previewingSlip === 'counter01' ? '0020' : '0150'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>CASSETTE B (₹200):</span>
                    <span>{previewingSlip === 'counter01' ? '0015' : '0200'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>CASSETTE C (₹100):</span>
                    <span>{previewingSlip === 'counter01' ? '0010' : '0300'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>PURGE BIN:</span>
                    <span>0002</span>
                  </div>
                </div>
                <div className="border-t border-dashed border-slate-400 pt-1.5 flex justify-between font-bold">
                  <span>TOTAL DISPENSER VAL:</span>
                  <span>₹ {previewingSlip === 'counter01' ? '14,000' : totalLoading.toLocaleString()}</span>
                </div>
                <div className="text-center text-[9.5px] text-emerald-700 font-bold pt-2 border-t border-dashed border-slate-300">
                  [ VERIFIED & DIGITALLY STAMPED ]
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewingSlip(null)}
                className="w-full h-8.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
