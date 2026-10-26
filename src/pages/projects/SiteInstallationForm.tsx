import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronRight,
  ChevronLeft,
  Building2,
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Settings,
  Monitor,
  PlayCircle,
  CheckCircle,
  Save,
  Calendar,
  ChevronDown,
} from 'lucide-react'
import {
  useSiteInstallations,
  addSiteInstallationRecord,
  updateSiteInstallationRecord,
  KNOWN_SITES,
  type SiteInstallationRecord,
} from '@/data/siteInstallation'
import { toast } from '@/components/ui/Toast'

export default function SiteInstallationForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const { records } = useSiteInstallations()

  const existingRecord = id ? records.find((r) => r.id === id) : undefined

  // Top Banner Fields
  const [siteLoi, setSiteLoi] = useState(existingRecord?.siteLoi || '')
  const [franchisee, setFranchisee] = useState(existingRecord?.franchisee || '')
  const [frContact, setFrContact] = useState(existingRecord?.frContact || '')
  const [frEmail, setFrEmail] = useState(existingRecord?.frEmail || '')
  const [siteLocation, setSiteLocation] = useState(existingRecord?.siteLocation || '')
  const [model, setModel] = useState(existingRecord?.model || '')

  // Autocomplete suggestion dropdown state
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)

  // Section 1: Site Readiness
  const [sdStatus, setSdStatus] = useState(existingRecord?.sdStatus || '')
  const [signage, setSignage] = useState(existingRecord?.signage || '')
  const [electrical, setElectrical] = useState(existingRecord?.electrical || '')
  const [lollypop, setLollypop] = useState(existingRecord?.lollypop || '')
  const [tisStatus, setTisStatus] = useState(existingRecord?.tisStatus || '')
  const [hitachi, setHitachi] = useState(existingRecord?.hitachi || '')
  const [grouting, setGrouting] = useState(existingRecord?.grouting || '')
  const [monkeyCage, setMonkeyCage] = useState(existingRecord?.monkeyCage || '')

  // Section 2: ATM / Equipment Status
  const [atmMachine, setAtmMachine] = useState(existingRecord?.atmMachine || '')
  const [ups, setUps] = useState(existingRecord?.ups || '')
  const [vsat, setVsat] = useState(existingRecord?.vsat || '')

  // Section 3: Operational Status
  const [techLive, setTechLive] = useState(existingRecord?.techLive || '')
  const [projectionDate, setProjectionDate] = useState(existingRecord?.projectionDate || '')
  const [cashLive, setCashLive] = useState(existingRecord?.cashLive || '')

  // Section 4: Documentation / Account Status
  const [agreementStatus, setAgreementStatus] = useState(existingRecord?.agreementStatus || '')
  const [payoutAccount, setPayoutAccount] = useState(existingRecord?.payoutAccount || '')
  const [apnaApp, setApnaApp] = useState(existingRecord?.apnaApp || '')
  const [gstStatus, setGstStatus] = useState(existingRecord?.gstStatus || '')
  const [wlaAccount, setWlaAccount] = useState(existingRecord?.wlaAccount || '')

  // Section 5: Final Status
  const [currentStatus, setCurrentStatus] = useState(existingRecord?.status || '')
  const [statusDate, setStatusDate] = useState(existingRecord?.statusDate || '04.10.2021')

  // When selecting or typing LOI, auto-populate details
  const handleSelectSiteLoi = (selectedLoi: string) => {
    setSiteLoi(selectedLoi)
    setSuggestionsOpen(false)
    const match = KNOWN_SITES.find(
      (s) => s.siteLoi.toLowerCase() === selectedLoi.toLowerCase()
    )
    if (match) {
      setFranchisee(match.franchisee)
      setFrContact(match.frContact)
      setFrEmail(match.frEmail)
      setSiteLocation(match.siteLocation)
      setModel(match.model)
      toast(`Loaded site details for ${match.siteLoi}`)
    }
  }

  // Handle manual typing of Site/LOI
  const handleSiteLoiChange = (val: string) => {
    setSiteLoi(val)
    const match = KNOWN_SITES.find(
      (s) => s.siteLoi.toLowerCase() === val.trim().toLowerCase()
    )
    if (match) {
      setFranchisee(match.franchisee)
      setFrContact(match.frContact)
      setFrEmail(match.frEmail)
      setSiteLocation(match.siteLocation)
      setModel(match.model)
    } else if (!val) {
      setFranchisee('')
      setFrContact('')
      setFrEmail('')
      setSiteLocation('')
      setModel('')
    }
  }

  const handleSave = (isDraft: boolean) => {
    if (!siteLoi.trim()) {
      toast('Please enter or search a Site/LOI Number')
      return
    }

    if (!isDraft) {
      if (!sdStatus) {
        toast('Please select SD Status')
        return
      }
      if (!electrical) {
        toast('Please select Electrical Work')
        return
      }
      if (!tisStatus) {
        toast('Please select TIS Status')
        return
      }
    }

    const payload: Omit<SiteInstallationRecord, 'id' | 'sn' | 'createdAt' | 'updatedAt'> = {
      siteLoi: siteLoi.trim(),
      franchisee: franchisee || '—',
      frContact: frContact || '—',
      frEmail: frEmail || '—',
      siteLocation: siteLocation || '—',
      model: model || 'Garnet Model',
      sdStatus: sdStatus || 'Pending',
      electrical: electrical || 'Pending',
      tisStatus: tisStatus || 'Pending',
      atmMachine: atmMachine || 'Pending',
      vsat: vsat || 'Pending',
      ups: ups || 'Pending',
      grouting: grouting || 'Pending',
      signage: signage || 'Pending',
      lollypop: lollypop || 'Pending',
      hitachi: hitachi || 'Pending',
      monkeyCage: monkeyCage || 'Pending',
      techLive: techLive || 'Pending',
      cashLive: cashLive || 'Pending',
      projectionDate: projectionDate || '',
      agreementStatus: agreementStatus || 'Pending',
      apnaApp: apnaApp || 'Pending',
      wlaAccount: wlaAccount || 'Pending',
      payoutAccount: payoutAccount || 'Mail Sent for necessary letters _01.09.2021',
      gstStatus: gstStatus || 'Pending',
      status: currentStatus || (isDraft ? 'Draft' : 'Installation in progress'),
      statusDate: statusDate || '04.10.2021',
    }

    if (existingRecord) {
      updateSiteInstallationRecord(existingRecord.id, payload)
      toast(isDraft ? 'Draft updated successfully' : 'Site installation record updated')
    } else {
      addSiteInstallationRecord(payload)
      toast(isDraft ? 'Site installation draft saved' : 'New site installation created successfully')
    }

    navigate('/projects/installation')
  }

  return (
    <div className="space-y-4 pb-16 max-w-[1400px]">
      {/* Breadcrumb matching Image 2: Projects > Site Readiness > Site Number */}
      <div className="flex items-center gap-2 text-[12px] text-slate-500">
        <Link to="/projects" className="hover:text-[#0066FF] transition-colors">
          Projects
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <Link to="/projects/installation" className="hover:text-[#0066FF] transition-colors">
          Site Readiness
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Site Number</span>
      </div>

      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
          Project - Site Number
        </h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Create and manage site number with complete readiness status and details.
        </p>
      </div>

      {/* Top Banner / Information Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          {/* Blue building icon on left */}
          <div className="w-12 h-12 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm self-start lg:self-center">
            <Building2 size={24} />
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 flex-1 items-center">
            {/* 1. Site/LOI Number * with search */}
            <div className="relative">
              <label className="block text-[11px] font-bold text-slate-800 mb-1">
                Site/LOI Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={siteLoi}
                  onChange={(e) => handleSiteLoiChange(e.target.value)}
                  onFocus={() => setSuggestionsOpen(true)}
                  placeholder="Search Site/LOI Number (e.g. SIT-2025-001)"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
                />
              </div>

              {/* Suggestions Dropdown */}
              {suggestionsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setSuggestionsOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-1 w-72 max-h-56 overflow-y-auto bg-white rounded-lg border border-slate-200 shadow-lg z-20 py-1">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Quick select site
                    </div>
                    {KNOWN_SITES.map((site) => (
                      <button
                        key={site.siteLoi}
                        type="button"
                        onClick={() => handleSelectSiteLoi(site.siteLoi)}
                        className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-[12px] flex flex-col transition-colors border-b border-slate-50 last:border-0"
                      >
                        <span className="font-semibold text-[#0066FF]">{site.siteLoi}</span>
                        <span className="text-[11px] text-slate-500 truncate">{site.franchisee} · {site.siteLocation}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 2. Name of Franchisee */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
                <User size={13} className="text-[#0066FF]" />
                <span>Name of Franchisee</span>
              </div>
              <div className="text-[13px] font-semibold text-slate-800 truncate" title={franchisee}>
                {franchisee || '--'}
              </div>
            </div>

            {/* 3. FR Contact Number */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
                <Phone size={13} className="text-[#0066FF]" />
                <span>FR Contact Number</span>
              </div>
              <div className="text-[13px] font-semibold text-slate-800 truncate" title={frContact}>
                {frContact || '--'}
              </div>
            </div>

            {/* 4. FR Email */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
                <Mail size={13} className="text-[#0066FF]" />
                <span>FR Email</span>
              </div>
              <div className="text-[13px] font-semibold text-slate-800 truncate" title={frEmail}>
                {frEmail || '--'}
              </div>
            </div>

            {/* 5. Site Location */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
                <MapPin size={13} className="text-[#0066FF]" />
                <span>Site Location</span>
              </div>
              <div className="text-[13px] font-semibold text-slate-800 truncate" title={siteLocation}>
                {siteLocation || '--'}
              </div>
            </div>

            {/* 6. Model */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
                <FileText size={13} className="text-[#0066FF]" />
                <span>Model</span>
              </div>
              <div className="text-[13px] font-semibold text-slate-800 truncate" title={model}>
                {model || '--'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Site Readiness */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        {/* Blue Tinted Header Bar */}
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <Settings size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">1. Site Readiness</h2>
        </div>

        {/* 2-Column Form Grid */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {/* Row 1 */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              SD Status <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={sdStatus}
                onChange={(e) => setSdStatus(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Select SD status</option>
                <option value="Received">Received</option>
                <option value="Pending">Pending</option>
                <option value="Under Review">Under Review</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Signage Board
            </label>
            <div className="relative">
              <select
                value={signage}
                onChange={(e) => setSignage(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Done">Done</option>
                <option value="Pending">Pending</option>
                <option value="Fabrication Pending">Fabrication Pending</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 2 */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Electrical Work <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={electrical}
                onChange={(e) => setElectrical(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Select electrical work status</option>
                <option value="Complete">Complete</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Lollypop
            </label>
            <div className="relative">
              <select
                value={lollypop}
                onChange={(e) => setLollypop(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Done">Done</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 3 */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              TIS Status <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={tisStatus}
                onChange={(e) => setTisStatus(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Select TIS status</option>
                <option value="Complete">Complete</option>
                <option value="Pending">Pending</option>
                <option value="Under Verification">Under Verification</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Hitachi's Branding
            </label>
            <div className="relative">
              <select
                value={hitachi}
                onChange={(e) => setHitachi(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Done">Done</option>
                <option value="Pending">Pending</option>
                <option value="Artwork Approved">Artwork Approved</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 4 */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Grouting
            </label>
            <div className="relative">
              <select
                value={grouting}
                onChange={(e) => setGrouting(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Done">Done</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Monkey Cage
            </label>
            <div className="relative">
              <select
                value={monkeyCage}
                onChange={(e) => setMonkeyCage(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Done">Done</option>
                <option value="Pending">Pending</option>
                <option value="Not Required">Not Required</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: ATM / Equipment Status */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <Monitor size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">2. ATM / Equipment Status</h2>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              ATM Machine
            </label>
            <div className="relative">
              <select
                value={atmMachine}
                onChange={(e) => setAtmMachine(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Delivered / Pending / Installation Pending</option>
                <option value="Delivered / Pending / Installation Pending">
                  Delivered / Pending / Installation Pending
                </option>
                <option value="Delivered">Delivered</option>
                <option value="Installation Pending">Installation Pending</option>
                <option value="Installation Done">Installation Done</option>
                <option value="Pending">Pending</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              UPS
            </label>
            <div className="relative">
              <select
                value={ups}
                onChange={(e) => setUps(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Delivered">Delivered</option>
                <option value="Installation Pending">Installation Pending</option>
                <option value="Installation Done">Installation Done</option>
                <option value="Pending">Pending</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              V-SAT
            </label>
            <div className="relative">
              <select
                value={vsat}
                onChange={(e) => setVsat(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Delivered">Delivered</option>
                <option value="Installation Pending">Installation Pending</option>
                <option value="Installation Done">Installation Done</option>
                <option value="Pending">Pending</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Operational Status */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <PlayCircle size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">3. Operational Status</h2>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Tech Live
            </label>
            <div className="relative">
              <select
                value={techLive}
                onChange={(e) => setTechLive(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Done">Done</option>
                <option value="Pending">Pending</option>
                <option value="Testing">Testing</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Projection Completion Date
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <input
                type="date"
                value={projectionDate}
                onChange={(e) => setProjectionDate(e.target.value)}
                placeholder="Select date"
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Cash Live
            </label>
            <div className="relative">
              <select
                value={cashLive}
                onChange={(e) => setCashLive(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Done">Done</option>
                <option value="Pending">Pending</option>
                <option value="Scheduled">Scheduled</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: Documentation / Account Status */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <FileText size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">4. Documentation / Account Status</h2>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Agreement Status
            </label>
            <div className="relative">
              <select
                value={agreementStatus}
                onChange={(e) => setAgreementStatus(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Done">Done</option>
                <option value="Pending">Pending</option>
                <option value="Sent for Signing">Sent for Signing</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Payout Account Status
            </label>
            <div className="relative">
              <select
                value={payoutAccount}
                onChange={(e) => setPayoutAccount(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Mail Sent for necessary letters _01.09.2021">
                  Mail Sent for necessary letters _01.09.2021
                </option>
                <option value="Verified">Verified</option>
                <option value="Pending">Pending</option>
                <option value="Documentation Incomplete">Documentation Incomplete</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Apna App Registration
            </label>
            <div className="relative">
              <select
                value={apnaApp}
                onChange={(e) => setApnaApp(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Registered">Registered</option>
                <option value="Applied">Applied</option>
                <option value="Pending">Pending</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              GST Status
            </label>
            <div className="relative">
              <select
                value={gstStatus}
                onChange={(e) => setGstStatus(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Registered">Registered</option>
                <option value="Pending">Pending</option>
                <option value="Applied">Applied</option>
                <option value="Mail Sent for necessary letters _01.09.2021">
                  Mail Sent for necessary letters _01.09.2021
                </option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              WLA Account Status
            </label>
            <div className="relative">
              <select
                value={wlaAccount}
                onChange={(e) => setWlaAccount(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Active">Active</option>
                <option value="Opened · KYC pending">Opened · KYC pending</option>
                <option value="Pending">Pending</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: Final Status */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <CheckCircle size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">5. Final Status</h2>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Current Status
            </label>
            <div className="relative">
              <select
                value={currentStatus}
                onChange={(e) => setCurrentStatus(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Site preparation">Site preparation</option>
                <option value="Installation in progress">Installation in progress</option>
                <option value="Go-live scheduled">Go-live scheduled</option>
                <option value="Live · 04.10.2021">Live · 04.10.2021</option>
                <option value="Awaiting legal clearance">Awaiting legal clearance</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Status Date
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <input
                type="text"
                value={statusDate}
                onChange={(e) => setStatusDate(e.target.value)}
                placeholder="DD.MM.YYYY"
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar matching Image 2 */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center justify-between shadow-sm">
        {/* Back Button on Left */}
        <button
          type="button"
          onClick={() => navigate('/projects/installation')}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[#0066FF]/30 text-[#0066FF] hover:bg-blue-50/60 text-[13px] font-semibold transition-all shadow-xs"
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[#0066FF]/30 text-[#0066FF] hover:bg-blue-50/60 text-[13px] font-semibold transition-all shadow-xs"
          >
            <Save size={15} />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold transition-all shadow-sm hover:shadow"
          >
            <span>Save & Continue</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
