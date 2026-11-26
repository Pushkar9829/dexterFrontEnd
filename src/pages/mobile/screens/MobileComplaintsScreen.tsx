import { useState, useRef, useEffect, useMemo } from 'react'
import { ApiError, apiEnabled, post } from '@/lib/api'
import {
  AlertTriangle,
  QrCode,
  User,
  Phone,
  Mail,
  MapPin,
  Wrench,
  Camera,
  Video,
  Send,
  Search,
  Filter,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Mic,
  MicOff,
  Plus,
  Ticket
} from 'lucide-react'
import {
  CATEGORIES,
  DEFAULT_COMPONENT,
  DEPARTMENT_FOR,
  aiDefault,
  atmById,
  complaintStore,
  escalationChain,
  nextComplaintId,
  nowMs,
  type Complaint,
} from '@/data/complaints'
import { emitWorkflow } from '@/data/workflow'
import { useMyComplaints } from '../data/mobileFeeds'
import { fmtDateTime, useMobileUser, useMyScope } from '../data/mobileSession'

/** Issue master (Complaint Master categories) — "Category / Sub-category". */
const COMPLAINT_TYPES = Object.entries(CATEGORIES).flatMap(([c, subs]) => subs.map((x) => `${c} / ${x}`))

type MobileComplaint = {
  id: string
  docketNo: string
  atmId: string
  siteId: string
  problemType: string
  status: 'Open' | 'In Progress' | 'Resolved' | 'On Hold'
  raisedOn: string
  resolvedOn?: string
  engineerName: string
  flm: string
  remark: string
  photosCount: number
  videosCount: number
  lastAction: string
}
const viewOf = (c: Complaint): MobileComplaint => ({
  id: c.id,
  docketNo: c.docket || 'NA',
  atmId: c.atmId,
  siteId: atmById(c.atmId)?.siteId ?? '',
  problemType: `${c.category} / ${c.subcategory}`,
  status: c.status === 'Closed' ? 'Resolved' : /pending|awaiting/i.test(c.subStatus) ? 'On Hold' : /progress/i.test(c.subStatus) ? 'In Progress' : 'Open',
  raisedOn: fmtDateTime(c.receivedAt),
  resolvedOn: c.closedAt ? fmtDateTime(c.closedAt) : undefined,
  engineerName: c.owner,
  flm: /FLM: Not Done/.test(c.details) ? 'Not Done' : /FLM: Done/.test(c.details) ? 'Done' : '—',
  remark: c.details,
  photosCount: c.attachments.filter((a) => /\.(jpe?g|png|heic)$/i.test(a)).length,
  videosCount: c.attachments.filter((a) => /\.(mp4|mov|3gp)$/i.test(a)).length,
  lastAction: c.lastAction,
})

export function MobileComplaintsScreen() {
  const [activeTab, setActiveTab] = useState<'new' | 'list'>('new')
  // Own complaints (Complaint Master, scoped to the franchise's ATMs) — same store as the web Complaints module
  const user = useMobileUser()
  const { sites } = useMyScope()
  const mine = useMyComplaints()
  const complaints = useMemo(() => mine.map(viewOf).sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true })), [mine])
  const myAtms = useMemo(() => sites.map((s) => ({ atmId: s.atmId, label: `${s.atmId} - ${s.location}` })), [sites])

  // Form State matching 10.53.15 PM.jpeg
  const [selectedAtmId, setSelectedAtmId] = useState(() => sites[0]?.atmId ?? '')
  const [problemType, setProblemType] = useState(COMPLAINT_TYPES[0])
  const [isProblemDropdownOpen, setIsProblemDropdownOpen] = useState(false)
  const [problemSearch, setProblemSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProblemDropdownOpen(false)
      }
    }
    if (isProblemDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProblemDropdownOpen])

  const filteredProblemTypes = COMPLAINT_TYPES.filter((type) =>
    type.toLowerCase().includes(problemSearch.toLowerCase().trim())
  )
  const [flmStatus, setFlmStatus] = useState<'Done' | 'Not Done'>('Done')
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
        'ATM Cash dispenser motor is jammed and giving error code 04.',
        'ATM Screen display flickering and touch response is slow.',
        '100 rupee cassette is not dispensing notes properly.',
        'UPS battery backup not holding power during power cut.'
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
  const [photosChosen, setPhotosChosen] = useState(false)
  const [videosChosen, setVideosChosen] = useState(false)
  const [selectedComplaintDetail, setSelectedComplaintDetail] = useState<MobileComplaint | null>(null)

  // Filter state for My Complaints list
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'In Progress' | 'Resolved'>('All')

  // Auto-fetch data based on ATM ID (Site Master + complaint asset register)
  const atm = atmById(selectedAtmId)
  const site = sites.find((x) => x.atmId === selectedAtmId)
  const currentAtm = {
    frName: user?.name ?? '—',
    frMobile: user?.phone ?? '—',
    frEmail: user?.email ?? '—',
    location: site ? `${site.location}, ${site.state}` : atm ? `${atm.siteName}, ${atm.state}` : '—',
    engineerName: site?.engineer?.name ?? atm?.engineer ?? 'To be assigned',
    engineerMobile: site?.engineer?.mobile ?? atm?.engineerPhone ?? '—',
  }
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)

  const handleRegisterComplaint = (e: React.FormEvent) => {
    e.preventDefault()
    if (!atm || !site) {
      alert('Select one of your ATMs.')
      return
    }
    if (remark.trim().length < 10) {
      alert('Please enter a remark describing the issue (at least 10 characters).')
      return
    }
    const [category, subcategory] = problemType.split(' / ')
    if (apiEnabled) {
      // API mode: the franchise raises the complaint for its own site (POST /complaints, Franchise "Raise" right);
      // routing, SLA, docket and escalation are done by the server.
      void post<{ complaintId: string; department?: string }>('/complaints', { atmOrSite: site.atmId, category, subcategory: subcategory || category, priority: 'Medium', title: problemType.slice(0, 200), details: remark.trim() })
        .then((c) => {
          setRemark('')
          setPhotosChosen(false)
          setVideosChosen(false)
          setActiveTab('list')
          setSubmitMsg(`Complaint ${c.complaintId} registered${c.department ? ` and sent to the ${c.department}` : ''}.`)
        })
        .catch((err) => alert(err instanceof ApiError ? err.message : 'Could not register the complaint.'))
      return
    }
    const dept = DEPARTMENT_FOR[category] ?? 'HD Team'
    const chain = escalationChain(dept, atm)
    const owner = site.engineer?.name ?? atm.engineer
    const at = new Date(nowMs()).toISOString()
    const id = nextComplaintId()
    const attachments = [
      ...(photosChosen ? [`${id}_site_photo.jpg`] : []),
      ...(videosChosen ? [`${id}_site_video.mp4`] : []),
    ]
    const by = `${user?.name ?? 'Franchise'} (Franchise app)`
    const c: Complaint = {
      id,
      receivedAt: at,
      reportingAuthority: 'Franchise representative (FR)',
      channel: 'FR / Field Officer Mobile App',
      atmId: atm.atmId,
      component: DEFAULT_COMPONENT[subcategory] ?? '',
      category,
      subcategory,
      priority: 'Medium',
      title: subcategory,
      details: `${remark.trim()} (FLM: ${flmStatus})`,
      attachments,
      forwardedOn: at.slice(0, 10),
      department: dept,
      docket: 'NA',
      owner,
      status: 'Open',
      subStatus: 'Assigned',
      lastAction: 'Raised from the franchise app',
      remark: '',
      proposedFix: '',
      outcome: 'Pending',
      outcomeRemark: '',
      frSignOff: false,
      hdValidation: false,
      evidence: attachments.length > 0,
      escalationLevel: 1,
      escalations: [],
      impact: 'None',
      tasks: [],
      emails: [],
      visits: [],
      vendors: [],
      spares: [],
      audit: [
        { at, title: 'Complaint registered', meta: `${by} · FR / Field Officer Mobile App · FLM ${flmStatus}` },
        { at, title: 'Routing applied', meta: `System · ${dept} escalation matrix · L1 ${chain[0]?.person ?? '—'}` },
        { at, title: 'Site Master mapped', meta: `System · ${site.siteId} · ATM ${site.atmId}` },
        ...(attachments.length ? [{ at, title: 'Evidence attached', meta: attachments.join(' · ') }] : []),
      ],
      ai: { ...aiDefault({ category, subcategory, priority: 'Medium' }, 35), updated: at },
    }
    complaintStore.set((xs) => [c, ...xs])
    emitWorkflow({
      module: 'Complaint',
      event: 'Submit',
      refId: id,
      vars: { Site_ID: site.siteId, ATM_ID: site.atmId, Franchise_Name: atm.franchise, Current_Status: 'Assigned', Pending_Action: `Resolve complaint – ${subcategory}` },
      nextAction: { title: `Resolve complaint ${id} · ${problemType}`, dueHours: 72, priority: 'Medium' },
      franchiseEmail: user?.email,
    })

    setRemark('')
    setPhotosChosen(false)
    setVideosChosen(false)
    setActiveTab('list')
    setSubmitMsg(`Complaint ${id} registered and sent to the ${dept}. The docket number is added by the backend team.`)
  }

  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch =
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.docketNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.atmId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.problemType.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'All' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      {/* Top Banner Matching 10.39.39 PM.jpeg */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-xs">
              <AlertTriangle size={24} className="text-amber-300" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">Raise Complaints</h1>
              <p className="text-[11px] text-blue-100 mt-0.5">
                Register a new ATM complaint and track existing complaints.
              </p>
            </div>
          </div>
        </div>

        {/* Two Switcher Tabs: New Complaint vs My Complaints */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition-all ${activeTab === 'new'
              ? 'bg-white text-[#0B2A6B] shadow-sm'
              : 'bg-white/15 text-white/90 hover:bg-white/20'
              }`}
          >
            <Plus size={15} />
            <span>New Complaint</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition-all ${activeTab === 'list'
              ? 'bg-white text-[#0B2A6B] shadow-sm'
              : 'bg-white/15 text-white/90 hover:bg-white/20'
              }`}
          >
            <Ticket size={15} />
            <span>My Complaints ({complaints.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FORM (Matching WhatsApp Image 2026-11-09 at 10.53.15 PM.jpeg) */}
      {activeTab === 'new' && (
        <form
          onSubmit={handleRegisterComplaint}
          className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3.5"
        >
          {/* ATM ID with QR Scanner Button */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              ATM ID <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={selectedAtmId}
                onChange={(e) => setSelectedAtmId(e.target.value)}
                className="flex-1 h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {myAtms.length === 0 && <option value="">No ATM mapped to your franchise</option>}
                {myAtms.map((a) => (
                  <option key={a.atmId} value={a.atmId}>
                    {a.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => alert('Camera QR/Barcode Scanner Opened')}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                aria-label="Scan QR"
              >
                <QrCode size={18} />
              </button>
            </div>
          </div>

          {/* Auto Fetch Container for FR Details */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-blue-50/70 p-2.5 border border-blue-100 text-[11px]">
            <div>
              <span className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
                <User size={11} className="text-blue-600" /> FR Name
              </span>
              <span className="font-bold text-slate-800">{currentAtm.frName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
                <Phone size={11} className="text-blue-600" /> FR Mobile
              </span>
              <span className="font-bold text-slate-800">{currentAtm.frMobile}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
                <Mail size={11} className="text-blue-600" /> FR Email
              </span>
              <span className="font-bold text-slate-800 truncate block">{currentAtm.frEmail}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
                <MapPin size={11} className="text-blue-600" /> Site Location
              </span>
              <span className="font-bold text-slate-800 truncate block">{currentAtm.location}</span>
            </div>
          </div>

          {/* Problem Type Searchable Dropdown (all 53 master types) */}
          <div className="relative" ref={dropdownRef}>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Problem Type <span className="text-red-500">*</span>
            </label>

            <button
              type="button"
              onClick={() => {
                setIsProblemDropdownOpen((prev) => !prev)
                if (!isProblemDropdownOpen) setProblemSearch('')
              }}
              className={`w-full h-10 rounded-xl border bg-white px-3 flex items-center justify-between text-xs font-bold text-slate-800 text-left transition-all ${isProblemDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs' : 'border-slate-300'
                }`}
            >
              <span className="truncate pr-2">{problemType || 'Select Problem Type'}</span>
              <ChevronDown
                size={16}
                className={`text-slate-400 shrink-0 transition-transform duration-200 ${isProblemDropdownOpen ? 'rotate-180 text-blue-600' : ''
                  }`}
              />
            </button>

            {isProblemDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl border border-blue-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Search Bar inside Dropdown */}
                <div className="p-2 border-b border-slate-100 bg-slate-50/90">
                  <div className="relative flex items-center">
                    <Search size={14} className="absolute left-2.5 text-blue-600 pointer-events-none" />
                    <input
                      type="text"
                      autoFocus
                      value={problemSearch}
                      onChange={(e) => setProblemSearch(e.target.value)}
                      placeholder="Search problem type..."
                      className="w-full h-8.5 rounded-lg border border-slate-300 bg-white pl-8 pr-7 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    {problemSearch && (
                      <button
                        type="button"
                        onClick={() => setProblemSearch('')}
                        className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-1 pt-1.5 text-[10px] text-slate-500 font-semibold">
                    <span>Matches: {filteredProblemTypes.length}</span>
                    <span>{COMPLAINT_TYPES.length} total types</span>
                  </div>
                </div>

                {/* Filtered Options List */}
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {filteredProblemTypes.length > 0 ? (
                    filteredProblemTypes.map((type) => {
                      const isSelected = type === problemType
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setProblemType(type)
                            setIsProblemDropdownOpen(false)
                            setProblemSearch('')
                          }}
                          className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between gap-2 transition-colors ${isSelected
                            ? 'bg-blue-50/80 text-blue-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-50 active:bg-blue-50/50 font-semibold'
                            }`}
                        >
                          <span className="truncate">{type}</span>
                          {isSelected && <Check size={14} className="text-blue-600 shrink-0" />}
                        </button>
                      )
                    })
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500">
                      <p className="font-semibold text-slate-600">No matching problem type</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Try searching with a different keyword</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Auto Fetched Engineer Row */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 border border-slate-200 text-[11px]">
            <div>
              <span className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
                <Wrench size={11} className="text-blue-600" /> ATM Engineer Name
              </span>
              <span className="font-bold text-slate-800">{currentAtm.engineerName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
                <Phone size={11} className="text-blue-600" /> Engineer Mobile
              </span>
              <span className="font-bold text-slate-800">{currentAtm.engineerMobile}</span>
            </div>
          </div>

          {/* FLM Radio Group */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              FLM (First Line Maintenance) <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="flm"
                  checked={flmStatus === 'Done'}
                  onChange={() => setFlmStatus('Done')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Done</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="flm"
                  checked={flmStatus === 'Not Done'}
                  onChange={() => setFlmStatus('Not Done')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Not Done</span>
              </label>
            </div>
          </div>

          {/* Remark Textarea with Google Voice Mic Typing */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-slate-700">
                  Remark <span className="text-red-500">*</span>
                </label>
              </div>
              <span className="text-[10px] text-slate-400">{remark.length} / 500</span>
            </div>

            <div className="relative">
              <textarea
                rows={3}
                maxLength={500}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder={
                  isListening
                    ? "🎙️ Listening... Speak now in Hindi or English..."
                    : "Enter remark in Hindi / English describing the issue..."
                }
                className={`w-full rounded-xl border p-2.5 pr-10 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isListening
                  ? 'border-rose-400 ring-2 ring-rose-200 bg-rose-50/20'
                  : 'border-slate-300 bg-slate-50/50'
                  }`}
                required
              />

              {/* Floating Google Voice Mic button inside Textarea */}
              <button
                type="button"
                onClick={toggleVoiceTyping}
                className={`absolute right-2.5 bottom-3.5 p-1.5 rounded-full transition-all shadow-xs ${isListening
                  ? 'bg-rose-600 text-white ring-4 ring-rose-200 animate-pulse'
                  : 'bg-white text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-300'
                  }`}
                title={isListening ? "Stop voice listening" : "Start Google voice mic typing"}
              >
                {isListening ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
            </div>

            {isListening && (
              <p className="mt-1 text-[10px] font-semibold text-rose-600 flex items-center gap-1.5 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-rose-600"></span>
                Google Voice typing active. Speak clearly into your mic...
              </p>
            )}
          </div>

          {/* Photo & Video Upload Row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-800 block">Upload Photo *</span>
                <span className="text-[9px] text-slate-500 block">Without GPS Snap (No Submit)</span>
              </div>
              <button
                type="button"
                onClick={() => setPhotosChosen(!photosChosen)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${photosChosen ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                  }`}
              >
                <Camera size={16} />
              </button>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-800 block">Upload Video</span>
                <span className="text-[9px] text-slate-500 block">Without GPS Video</span>
              </div>
              <button
                type="button"
                onClick={() => setVideosChosen(!videosChosen)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${videosChosen ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                  }`}
              >
                <Video size={16} />
              </button>
            </div>
          </div>

          {/* Docket Number & Complaint Number Info Boxes */}
          <div className="space-y-1.5 text-[11px]">
            <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600 flex items-center justify-between">
              <span className="font-bold text-slate-700">Docket Number</span>
              <span className="text-[10px] text-slate-500">Filled by Backend Team (Visible to FR)</span>
            </div>
            <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600 flex items-center justify-between">
              <span className="font-bold text-slate-700">Complaint Number</span>
              <span className="text-[10px] text-slate-500">Auto-generated after submission</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1457CF] text-white font-extrabold text-sm shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
          >
            <Send size={16} />
            <span>Submit Complaint</span>
          </button>
        </form>
      )}

      {/* TAB 2: MY COMPLAINTS LIST (Matching WhatsApp Image 2026-11-09 at 11.02.00 PM.jpeg) */}
      {activeTab === 'list' && (
        <div className="space-y-3">
          {/* 4 Stats Cards */}
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-2">
              <span className="text-[9px] font-bold text-slate-500 block">Total</span>
              <span className="text-base font-black text-[#0B2A6B]">{complaints.length}</span>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-2">
              <span className="text-[9px] font-bold text-amber-700 block">Open</span>
              <span className="text-base font-black text-amber-600">
                {complaints.filter((c) => c.status === 'Open').length}
              </span>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-2">
              <span className="text-[9px] font-bold text-blue-700 block">In Progress</span>
              <span className="text-base font-black text-blue-600">
                {complaints.filter((c) => c.status === 'In Progress').length}
              </span>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2">
              <span className="text-[9px] font-bold text-emerald-700 block">Resolved</span>
              <span className="text-base font-black text-emerald-600">
                {complaints.filter((c) => c.status === 'Resolved').length}
              </span>
            </div>
          </div>

          {submitMsg && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 text-[11px] font-semibold text-emerald-800 flex items-start justify-between gap-2">
              <span>{submitMsg}</span>
              <button type="button" onClick={() => setSubmitMsg(null)}><X size={13} /></button>
            </div>
          )}
          {complaints.length === 0 && <p className="rounded-xl bg-white p-4 text-center text-xs text-slate-500">No complaints raised for your ATMs yet.</p>}

          {/* Search & Filter Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Complaint No. / ATM ID / Docket No..."
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button
              onClick={() => alert('Filter options: By Date Range, Problem Type or Site ID')}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              <Filter size={15} />
            </button>
          </div>

          {/* Status Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scroll-thin">
            {(['All', 'Open', 'In Progress', 'Resolved'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${statusFilter === st
                  ? 'bg-[#0B2A6B] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Complaint Cards List */}
          <div className="space-y-2.5">
            {filteredComplaints.map((item) => {
              const statusColor =
                item.status === 'Open'
                  ? 'bg-rose-100 text-rose-700 border-rose-200'
                  : item.status === 'In Progress'
                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                    : item.status === 'Resolved'
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-amber-100 text-amber-700 border-amber-200'

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedComplaintDetail(item)}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-[#0B2A6B]">{item.id}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">Docket No. : {item.docketNo}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusColor}`}>
                        {item.status}
                      </span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-1 text-[11px] text-slate-600 border-t border-slate-100 pt-2">
                    <div>
                      <span className="text-[10px] text-slate-400">ATM ID: </span>
                      <span className="font-bold text-slate-800">{item.atmId}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Problem: </span>
                      <span className="font-bold text-slate-800 truncate block">{item.problemType}</span>
                    </div>
                  </div>

                  <div className="mt-1 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Raised: {item.raisedOn}</span>
                    {item.resolvedOn && (
                      <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                        <CheckCircle size={10} /> Resolved: {item.resolvedOn}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Complaint Detail Modal */}
      {selectedComplaintDetail && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-[#0B2A6B]">{selectedComplaintDetail.id}</h3>
                <span className="text-[10px] text-slate-500 font-mono">Docket: {selectedComplaintDetail.docketNo}</span>
              </div>
              <button
                onClick={() => setSelectedComplaintDetail(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="py-3 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="font-bold text-blue-600">{selectedComplaintDetail.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Problem Type</span>
                <span className="font-bold text-slate-800">{selectedComplaintDetail.problemType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ATM ID</span>
                <span className="font-bold text-slate-800">{selectedComplaintDetail.atmId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">FLM Status</span>
                <span className="font-bold text-slate-800">{selectedComplaintDetail.flm}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Raised On</span>
                <span className="font-bold text-slate-800">{selectedComplaintDetail.raisedOn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last Action</span>
                <span className="font-bold text-slate-800 text-right">{selectedComplaintDetail.lastAction}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Engineer</span>
                <span className="font-bold text-slate-800">{selectedComplaintDetail.engineerName}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block mb-0.5">Remark</span>
                <p className="text-slate-700 italic">"{selectedComplaintDetail.remark}"</p>
              </div>
            </div>

            <button
              onClick={() => setSelectedComplaintDetail(null)}
              className="w-full h-10 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
