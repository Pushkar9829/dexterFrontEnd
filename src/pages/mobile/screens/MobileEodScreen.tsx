import { useState, useRef, useEffect } from 'react'
import {
  CalendarDays,
  ArrowLeft,
  Calendar,
  FileCheck,
  Upload,
  Send,
  Save,
  RotateCcw,
  Search,
  Clock,
  Calculator,
  Mic,
  MicOff
} from 'lucide-react'
import { INITIAL_EOD_RECORDS, type EodRecord } from '../data/mobileMockData'
import { CbrPopupModal } from '../components/CbrPopupModal'

interface MobileEodScreenProps {
  onBackToMore?: () => void
}

export function MobileEodScreen({ onBackToMore }: MobileEodScreenProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form')
  const [eodRecords, setEodRecords] = useState<EodRecord[]>(INITIAL_EOD_RECORDS)

  // Form state matching 7.38.16 AM.jpeg
  const [atmId, setAtmId] = useState('AXIS277823')
  const [franchise] = useState('Naveen Singh')
  const [machine] = useState('C2300')
  const [modelNo] = useState('HYN0108947')
  const [purpose, setPurpose] = useState('Routine EOD')
  const [siteType, setSiteType] = useState('FTM')
  const [eodDate] = useState('10-11-2025')
  const [cbrSummary, setCbrSummary] = useState('Available & Adjusted')
  const [counterSlipUploaded, setCounterSlipUploaded] = useState(false)
  const [remark, setRemark] = useState('EOD completed successfully.')
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
        'EOD reconciliation completed with no cash physical discrepancy.',
        'Physical cash tallied with counter slip balance.',
        'Routine EOD performed and verified on portal.',
        'Admin counter slip matched with CBR report.'
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

  // CBR Modal state
  const [isCbrModalOpen, setIsCbrModalOpen] = useState(false)
  const [cvrDetails, setCvrDetails] = useState<{ physicalTotal: number; difference: number } | null>(null)

  // History filters
  const [historySearch, setHistorySearch] = useState('')
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'All' | 'Submitted' | 'In Progress' | 'Approved'>('All')

  const handleEodSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newEodNo = `DEXEOD-013${eodRecords.length}`
    const newRecord: EodRecord = {
      id: `EOD-${eodRecords.length + 1}`,
      eodNo: newEodNo,
      atmId: atmId,
      eodDate: '10 Nov 2026, Just now',
      purpose: purpose,
      siteType: siteType,
      status: 'Submitted',
      counterSlip: counterSlipUploaded ? 'uploaded_slip.pdf' : 'slip.pdf',
      cbrSummary: cvrDetails ? `Physical: ₹${cvrDetails.physicalTotal.toLocaleString()}` : cbrSummary,
      physicalCashTotal: cvrDetails ? cvrDetails.physicalTotal : 400000,
      systemCashTotal: 400000,
      difference: cvrDetails ? cvrDetails.difference : 0,
      remark: remark
    }
    setEodRecords([newRecord, ...eodRecords])
    setActiveTab('history')
    alert(`EOD Request ${newEodNo} submitted successfully!`)
  }

  const filteredHistory = eodRecords.filter((r) => {
    const matchesSearch =
      r.eodNo.toLowerCase().includes(historySearch.toLowerCase()) ||
      r.atmId.toLowerCase().includes(historySearch.toLowerCase()) ||
      r.purpose.toLowerCase().includes(historySearch.toLowerCase())

    const matchesStatus =
      historyStatusFilter === 'All' ||
      r.status === historyStatusFilter ||
      (historyStatusFilter === 'Approved' && r.status === 'Approved')
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      {/* Top Banner Matching 7.38.16 AM.jpeg */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToMore && (
              <button
                onClick={onBackToMore}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h1 className="text-base font-black text-white">EOD (End of Day)</h1>
            </div>
          </div>
          <CalendarDays size={26} className="text-amber-300 shrink-0" />
        </div>

        {/* Tab Switcher: EOD Form vs EOD History */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'form'
              ? 'bg-white text-[#0B2A6B] shadow-xs'
              : 'bg-white/15 text-white/90'
              }`}
          >
            EOD Request Form
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'history'
              ? 'bg-white text-[#0B2A6B] shadow-xs'
              : 'bg-white/15 text-white/90'
              }`}
          >
            EOD History ({eodRecords.length})
          </button>
        </div>
      </div>

      {/* TAB 1: EOD FORM */}
      {activeTab === 'form' && (
        <form onSubmit={handleEodSubmit} className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3.5">
          <h3 className="text-xs font-black text-[#0B2A6B] border-b pb-2 flex items-center justify-between">
            <span>EOD Request Details</span>
            <span className="text-[10px] text-blue-600 font-bold">ATM Daily Closing</span>
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            {/* ATM ID with Search Site */}
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">ATM ID *</label>
              <select
                value={atmId}
                onChange={(e) => setAtmId(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-bold text-slate-800"
              >
                <option value="AXIS277823">AXIS277823</option>
                <option value="ICICI164520">ICICI164520</option>
                <option value="AXIS278901">AXIS278901</option>
              </select>
            </div>

            {/* Franchise */}
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">Franchise</label>
              <input
                type="text"
                readOnly
                value={franchise}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-800"
              />
            </div>

            {/* Machine */}
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">Machine Type</label>
              <input
                type="text"
                readOnly
                value={machine}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-800"
              />
            </div>

            {/* Model No */}
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">Model No.</label>
              <input
                type="text"
                readOnly
                value={modelNo}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-800 font-mono"
              />
            </div>

            {/* Purpose */}
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">Purpose *</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-bold text-slate-800"
              >
                <option value="Routine EOD">Routine EOD</option>
                <option value="Cash Audit">Cash Audit</option>
                <option value="Monthly EOD">Monthly EOD</option>
              </select>
            </div>

            {/* Site Type */}
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">Site Type *</label>
              <select
                value={siteType}
                onChange={(e) => setSiteType(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-bold text-slate-800"
              >
                <option value="FTM">FTM (Franchise Total Mgmt)</option>
                <option value="FFM">FFM (Full Funding Model)</option>
              </select>
            </div>
          </div>

          {/* Counter Slip Row */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <span className="text-[10px] font-bold text-slate-600 block mb-1">Counter Slip *</span>
              <button
                type="button"
                onClick={() => setCounterSlipUploaded(true)}
                className="w-full py-1 px-2 rounded-lg bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs"
              >
                <Upload size={12} /> {counterSlipUploaded ? 'Slip Uploaded' : 'Choose File'}
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <span className="text-[10px] font-bold text-slate-600 block mb-1">View Counter Slip</span>
              <button
                type="button"
                onClick={() => alert('Viewing uploaded counter slip')}
                className="w-full py-1 px-2 rounded-lg border border-blue-600 bg-blue-50 text-blue-700 text-[11px] font-bold flex items-center justify-center gap-1"
              >
                <FileCheck size={12} /> Uploaded File
              </button>
            </div>
          </div>

          {/* CBR & EOD Date Row */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">
                CBR – For Physical Cash Summary
              </label>
              <select
                value={cbrSummary}
                onChange={(e) => setCbrSummary(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-bold"
              >
                <option value="Available & Adjusted">Available & Adjusted</option>
                <option value="Discrepancy Logged">Discrepancy Logged</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">EOD Date</label>
              <div className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 flex items-center justify-between text-xs font-bold">
                <span>{eodDate}</span>
                <Calendar size={14} className="text-blue-600" />
              </div>
            </div>
          </div>

          {/* CBR POPUP TRIGGER BUTTON (Section 10.2 in PDF!) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCbrModalOpen(true)}
              className="h-10 rounded-xl bg-[#0C3E98] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-blue-800"
            >
              <Calculator size={16} />
              <span>CBR / CVR</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="h-10 rounded-xl border border-blue-300 bg-blue-50 text-blue-800 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Clock size={16} />
              <span>CVR History</span>
            </button>
          </div>

          {cvrDetails && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-900 flex items-center justify-between">
              <span>Verified Cash: ₹{cvrDetails.physicalTotal.toLocaleString()}</span>
              <span className="font-bold">Diff: ₹{cvrDetails.difference}</span>
            </div>
          )}

          {/* Remark with Google Voice Mic Typing */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 mb-1">
              <div className="flex items-center gap-1.5">
                <span>Remark</span>
              </div>
              <span className="text-slate-400">{remark.length} / 500</span>
            </div>

            <div className="relative">
              <textarea
                rows={2}
                maxLength={500}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder={
                  isListening
                    ? "🎙️ Listening... Speak now in Hindi or English..."
                    : "Enter EOD remark in Hindi / English..."
                }
                className={`w-full rounded-xl border p-2 pr-9 text-xs text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${isListening
                    ? 'border-rose-400 ring-2 ring-rose-200 bg-rose-50/20'
                    : 'border-slate-300 bg-slate-50/50'
                  }`}
              />

              {/* Floating Google Voice Mic button inside Textarea */}
              <button
                type="button"
                onClick={toggleVoiceTyping}
                className={`absolute right-2 bottom-2.5 p-1 rounded-full transition-all shadow-xs ${isListening
                    ? 'bg-rose-600 text-white ring-4 ring-rose-200 animate-pulse'
                    : 'bg-white text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-300'
                  }`}
                title={isListening ? "Stop voice listening" : "Start Google voice mic typing"}
              >
                {isListening ? <MicOff size={13} /> : <Mic size={13} />}
              </button>
            </div>

            {isListening && (
              <p className="mt-1 text-[9.5px] font-semibold text-rose-600 flex items-center gap-1.5 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                Google Voice typing active. Speak clearly into your microphone...
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setRemark('')
                setCvrDetails(null)
              }}
              className="h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-1"
            >
              <RotateCcw size={13} /> Reset
            </button>
            <button
              type="button"
              onClick={() => alert('EOD Draft saved!')}
              className="flex-1 h-10 rounded-xl border border-blue-600 bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center gap-1"
            >
              <Save size={14} /> Save
            </button>
            <button
              type="submit"
              className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] text-white text-xs font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-1"
            >
              <Send size={14} /> Submit
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: EOD HISTORY (Matching WhatsApp Image 2026-11-11 at 7.38.47 AM.jpeg) */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {/* 4 Stats Cards */}
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-2">
              <span className="text-[9px] font-bold text-slate-500 block">Total</span>
              <span className="text-base font-black text-[#0B2A6B]">{eodRecords.length}</span>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-2">
              <span className="text-[9px] font-bold text-amber-700 block">Submitted</span>
              <span className="text-base font-black text-amber-600">
                {eodRecords.filter((r) => r.status === 'Submitted').length}
              </span>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-2">
              <span className="text-[9px] font-bold text-blue-700 block">In Progress</span>
              <span className="text-base font-black text-blue-600">
                {eodRecords.filter((r) => r.status === 'In Progress').length}
              </span>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2">
              <span className="text-[9px] font-bold text-emerald-700 block">Approved</span>
              <span className="text-base font-black text-emerald-600">
                {eodRecords.filter((r) => r.status === 'Approved').length}
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search by Docket No. / ATM ID / EOD No..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Status Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scroll-thin">
            {(['All', 'Submitted', 'In Progress', 'Approved'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setHistoryStatusFilter(st)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${historyStatusFilter === st
                  ? 'bg-[#0B2A6B] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* EOD Cards List */}
          <div className="space-y-2.5">
            {filteredHistory.map((item) => {
              const statusColor =
                item.status === 'Submitted'
                  ? 'bg-rose-100 text-rose-700 border-rose-200'
                  : item.status === 'In Progress'
                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                    : item.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-amber-100 text-amber-700 border-amber-200'

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-blue-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-[#0B2A6B]">{item.eodNo}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">ATM ID : {item.atmId}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusColor}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-600 border-t border-slate-100 pt-2">
                    <div>
                      <span className="text-[10px] text-slate-400">Date: </span>
                      <span className="font-bold text-slate-800">{item.eodDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Type: </span>
                      <span className="font-bold text-slate-800">{item.siteType}</span>
                    </div>
                  </div>

                  <p className="mt-1 text-[10px] text-slate-500 italic">"{item.remark}"</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* CBR Modal */}
      <CbrPopupModal
        isOpen={isCbrModalOpen}
        onClose={() => setIsCbrModalOpen(false)}
        atmId={atmId}
        franchise={franchise}
        onConfirm={(res) => setCvrDetails(res)}
      />
    </div>
  )
}
