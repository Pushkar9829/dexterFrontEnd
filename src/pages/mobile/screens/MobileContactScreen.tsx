import { useMemo, useState } from 'react'
import { useMyScope } from '../data/mobileSession'
import {
  Headphones,
  ArrowLeft,
  Phone,
  MessageSquare,
  Clock,
  User,
  AlertCircle,
  Cpu,
  Wifi,
  Zap,
  Building
} from 'lucide-react'

interface MobileContactScreenProps {
  onBackToMore?: () => void
}

export interface EngineerItem {
  category: 'ATM' | 'Network' | 'UPS'
  title: string
  subRole: string
  name: string
  mobile: string
}

const ROLE: Record<EngineerItem['category'], { title: string; subRole: string }> = {
  ATM: { title: 'ATM Engineer', subRole: 'Hardware, Cash Dispenser, Cassettes & Machine Terminal' },
  Network: { title: 'Network Engineer', subRole: '4G LTE Router, VSAT Antenna, SIM Card & Line Connectivity' },
  UPS: { title: 'UPS Engineer', subRole: 'UPS Inverter, Battery Bank Backup, Power Trip & Line Voltage' },
}

// Level 2: Same structure (ATM, Network, UPS) but details blank till development
const LEVEL_2_DATA: EngineerItem[] = [
  {
    category: 'ATM',
    title: 'ATM Engineer',
    subRole: 'Hardware Escalation & OEM Vendor Lead (Level 2)',
    name: '',
    mobile: ''
  },
  {
    category: 'Network',
    title: 'Network Engineer',
    subRole: 'Network NOC & Telco ISP Escalation Lead (Level 2)',
    name: '',
    mobile: ''
  },
  {
    category: 'UPS',
    title: 'UPS Engineer',
    subRole: 'Power Infrastructure & OEM Battery Lead (Level 2)',
    name: '',
    mobile: ''
  }
]

// Level 3: Same structure (ATM, Network, UPS) but details blank till development
const LEVEL_3_DATA: EngineerItem[] = [
  {
    category: 'ATM',
    title: 'ATM Engineer',
    subRole: 'ATM Engineering Head & Technical Director (Level 3)',
    name: '',
    mobile: ''
  },
  {
    category: 'Network',
    title: 'Network Engineer',
    subRole: 'Network Infrastructure Head & Security Lead (Level 3)',
    name: '',
    mobile: ''
  },
  {
    category: 'UPS',
    title: 'UPS Engineer',
    subRole: 'Facilities & Power Infrastructure Head (Level 3)',
    name: '',
    mobile: ''
  }
]

export function MobileContactScreen({ onBackToMore }: MobileContactScreenProps) {
  const [selectedLevel, setSelectedLevel] = useState<number>(1)
  // Sites of the signed-in franchise (Site Master: engineer + relationship manager mapping)
  const { sites } = useMyScope()
  const SITES_LIST = useMemo(() => sites.map((x) => ({ id: x.siteId, name: `${x.siteId} – ${x.location.split(',')[0]}`, atmId: x.atmId, location: x.address || x.location })), [sites])
  const [selectedSite, setSelectedSite] = useState<string>(() => sites[0]?.siteId ?? '')
  const site = sites.find((x) => x.siteId === selectedSite) ?? sites[0]
  const selectedSiteData = SITES_LIST.find((x) => x.id === site?.siteId) ?? { id: '', name: 'No site mapped', atmId: '—', location: '—' }
  const LEVEL_1: EngineerItem[] = (['ATM', 'Network', 'UPS'] as const).map((cat) => {
    const e = site?.engineer && (site.engineer.type === cat || (cat === 'Network' && site.engineer.type === 'NET')) ? site.engineer : undefined
    return { category: cat, ...ROLE[cat], name: e?.name ?? '', mobile: e?.mobile ? `+91 ${e.mobile}` : '' }
  })
  const LEVEL_2: EngineerItem[] = LEVEL_2_DATA.map((x) => (site?.manager ? { ...x, name: `${site.manager.name} (RM)`, mobile: site.manager.mobile ? `+91 ${site.manager.mobile}` : '' } : x))

  // Get current engineers according to selected level
  const currentEngineers: EngineerItem[] =
    selectedLevel === 1
      ? LEVEL_1
      : selectedLevel === 2
        ? LEVEL_2
        : LEVEL_3_DATA

  return (
    <div className="space-y-4 pb-6 pt-3 px-3 animate-in fade-in">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToMore && (
              <button
                onClick={onBackToMore}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h1 className="text-base font-black text-white">Helpdesk & Support</h1>
              <p className="text-[10px] text-blue-100">Technical Breakdown & Escalation Matrix</p>
            </div>
          </div>
          <Headphones size={26} className="text-amber-300 shrink-0" />
        </div>

        {/* Level Switcher Tabs: Level 1, Level 2, Level 3 */}
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          {[
            { level: 1, label: 'Level 1', sub: 'Ground Team' },
            { level: 2, label: 'Level 2', sub: 'Admin / Ops' },
            { level: 3, label: 'Level 3', sub: 'Management' }
          ].map((item) => (
            <button
              key={item.level}
              type="button"
              onClick={() => setSelectedLevel(item.level)}
              className={`py-2 px-1 rounded-xl transition-all ${
                selectedLevel === item.level
                  ? 'bg-white text-[#0B2A6B] shadow-xs'
                  : 'bg-white/15 text-white/90 hover:bg-white/20'
              }`}
            >
              <span className="block text-xs font-black">{item.label}</span>
              <span className="block text-[9px] opacity-80">{item.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Site Selector Dropdown */}
      <div className="rounded-2xl border border-blue-200 bg-white p-3 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <Building size={14} className="text-blue-600" />
            <span>Select ATM Site / Kiosk</span>
          </label>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            {selectedSiteData.atmId}
          </span>
        </div>

        <select
          value={selectedSite}
          onChange={(e) => setSelectedSite(e.target.value)}
          className="w-full h-9 rounded-xl border border-slate-300 bg-slate-50/70 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SITES_LIST.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name} ({site.atmId})
            </option>
          ))}
        </select>

        <p className="text-[10px] text-slate-400 truncate">
          📍 {selectedSiteData.location}
        </p>
      </div>

      {/* Level Status Notice */}
      {selectedLevel === 1 ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
            <AlertCircle size={14} className="text-blue-600 shrink-0" />
            <span>Level 1: Ground Field Engineers</span>
          </div>
          <p className="text-[10.5px] text-blue-700/90 leading-relaxed">
            Direct on-site engineering team for breakdown maintenance: ATM Machine, Network Connectivity, and UPS Power Backup.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
            <AlertCircle size={14} className="text-amber-600 shrink-0" />
            <span>Level {selectedLevel}: Escalation Matrix (In Development)</span>
          </div>
          <p className="text-[10.5px] text-amber-800/90 leading-relaxed">
            Level {selectedLevel} engineering and escalation details are blank till development. Allocation is in progress.
          </p>
        </div>
      )}

      {/* 3 Engineer Cards: ATM Engineer, Network Engineer, UPS Engineer */}
      <div className="space-y-3">
        {currentEngineers.map((eng) => {
          const Icon = eng.category === 'ATM' ? Cpu : eng.category === 'Network' ? Wifi : Zap

          return (
            <div
              key={eng.category}
              className="rounded-2xl border border-blue-200 bg-white p-3.5 shadow-xs space-y-2.5 hover:border-blue-300 transition-all"
            >
              {/* Header: Category + Status Badge */}
              <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                    <Icon size={17} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[#0B2A6B]">{eng.title}</h3>
                    <p className="text-[10px] text-slate-400">{eng.subRole}</p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold border shrink-0 ${
                    eng.name
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {eng.name ? 'Active / On-Duty' : 'Not assigned'}
                </span>
              </div>

              {/* Name & Mobile Number Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[9.5px] text-slate-400 font-semibold block mb-0.5 flex items-center gap-1">
                    <User size={11} className="text-slate-400" /> Engineer Name
                  </span>
                  <span className={`font-bold block text-xs ${eng.name ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                    {eng.name ? eng.name : '—'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[9.5px] text-slate-400 font-semibold block mb-0.5 flex items-center gap-1">
                    <Phone size={11} className="text-slate-400" /> Mobile Number
                  </span>
                  <span className={`font-mono font-bold block text-xs ${eng.mobile ? 'text-blue-700' : 'text-slate-400 italic'}`}>
                    {eng.mobile ? eng.mobile : '—'}
                  </span>
                </div>
              </div>

              {/* Actions for Level 1 vs Blank Notice for Level 2 & Level 3 */}
              {eng.mobile ? (
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <a
                    href={`tel:${eng.mobile.replace(/[^0-9+]/g, '')}`}
                    className="h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                  >
                    <Phone size={12} /> Call Engineer
                  </a>
                  <a
                    href={`https://wa.me/${eng.mobile.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                  >
                    <MessageSquare size={12} /> WhatsApp
                  </a>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 p-2 border border-dashed border-slate-200 text-center text-[10px] text-slate-400 font-medium italic">
                  Details will be blank till development • Level {selectedLevel} allocation in progress
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Central Helpdesk & Support Hours */}
      <div className="rounded-2xl border border-blue-200 bg-white p-3.5 shadow-xs space-y-2.5 text-xs">
        <div className="flex items-center justify-between border-b pb-2 border-slate-100">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Headphones size={14} className="text-blue-600" /> Central Operations Helpdesk
          </span>
          <span className="text-[10px] font-bold text-emerald-600">24x7 Ticket Logging</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[9.5px] text-slate-400 font-semibold block">Toll-Free Helpline</span>
            <a href="tel:+918954008232" className="font-mono font-bold text-blue-700 block mt-0.5">
              +91 89540 08232
            </a>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[9.5px] text-slate-400 font-semibold block">Email Support</span>
            <a href="mailto:wla@dexterindia.com" className="font-semibold text-slate-700 truncate block mt-0.5">
              wla@dexterindia.com
            </a>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2 border border-slate-100 text-[10.5px]">
          <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
            <Clock size={13} className="text-blue-600" />
            <span>Support Hours:</span>
          </div>
          <span className="font-bold text-slate-800">Mon – Sat : 9:00 AM – 7:00 PM</span>
        </div>
      </div>
    </div>
  )
}
