import { useState } from 'react'
import {
  Building2,
  CheckCircle2,
  Clock,
  ChevronRight,
  ArrowLeft,
  Camera,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Check
} from 'lucide-react'
import { INITIAL_SITES, type SiteProjectItem } from '../data/mobileMockData'

export function MobileSitesScreen() {
  const [sites] = useState<SiteProjectItem[]>(INITIAL_SITES)
  const [selectedSite, setSelectedSite] = useState<SiteProjectItem | null>(null)
  const [activeStep, setActiveStep] = useState<number>(1)

  const handleUpdateStatus = () => {
    alert('Site project status updated and synchronized with CRM Backend!')
    setSelectedSite(null)
  }

  // View 1: My Sites List (Matching WhatsApp Image 2026-11-10 at 9.16.31 AM.jpeg)
  if (!selectedSite) {
    const completedCount = sites.filter((s) => s.overallStatus === 'Completed').length
    const inProgressCount = sites.filter((s) => s.overallStatus === 'In Progress').length

    return (
      <div className="space-y-4 pb-6 pt-3 px-3">
        {/* Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-xs">
              <Building2 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">Project / Site Status</h1>
            </div>
          </div>
        </div>

        {/* Franchisee Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-50/80 p-3 border border-blue-200 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-blue-600" />
            <span className="font-semibold text-slate-500">Franchisee: </span>
            <strong className="text-slate-900">Ranjeet Pal</strong>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            <span className="flex items-center gap-1 font-mono">
              <Phone size={12} className="text-blue-600" /> 8126817131
            </span>
            <span className="flex items-center gap-1">
              <Mail size={12} className="text-blue-600" /> ranjeetpal@gmail.com
            </span>
          </div>
        </div>

        {/* My Site(s) Header with Counters */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-black text-slate-800">My Site(s) – Project Status</h2>
          <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs">
            Total Sites : {sites.length}
          </span>
        </div>

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="text-lg font-black text-slate-800">{completedCount}</div>
              <div className="text-[11px] font-semibold text-slate-600">Completed Site</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-white shadow-xs">
              <Clock size={18} />
            </div>
            <div>
              <div className="text-lg font-black text-slate-800">{inProgressCount}</div>
              <div className="text-[11px] font-semibold text-slate-600">In Progress Site</div>
            </div>
          </div>
        </div>

        {/* Site Cards List matching 9.16.31 AM.jpeg */}
        <div className="space-y-3">
          {sites.map((site, index) => {
            const isCompleted = site.overallStatus === 'Completed'
            return (
              <div
                key={site.id}
                onClick={() => setSelectedSite(site)}
                className="rounded-2xl border border-blue-200/90 bg-white p-4 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <span className="text-xs font-black text-[#0B2A6B]">
                      Site / LOI : {site.loiNo}
                    </span>
                  </div>
                  <span
                    className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black ${isCompleted
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                      }`}
                  >
                    {isCompleted ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                    {site.overallStatus}
                  </span>
                </div>

                {/* Meta details */}
                <div className="mt-2.5 grid grid-cols-3 gap-1 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1 truncate">
                    <MapPin size={12} className="text-blue-600 shrink-0" />
                    <span className="truncate">{site.location}</span>
                  </div>
                  <div className="flex items-center gap-1 truncate">
                    <Building2 size={12} className="text-blue-600 shrink-0" />
                    <span className="truncate">{site.model}</span>
                  </div>
                  <div className="flex items-center gap-1 truncate justify-end">
                    <Calendar size={12} className="text-blue-600 shrink-0" />
                    <span className="truncate">
                      {isCompleted ? site.completedDate : site.expectedDate}
                    </span>
                  </div>
                </div>

                {/* 6-step progress stepper visualization */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="relative flex items-center justify-between px-2">
                    {/* Connecting line track bounded between first and last steps */}
                    <div className="absolute left-6 right-6 top-3 h-[2.5px] overflow-hidden -z-0 bg-slate-200">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${site.progress}%` }}
                      />
                    </div>

                    {[
                      { key: 'siteInfo', label: 'Site Info' },
                      { key: 'readiness', label: 'Readiness' },
                      { key: 'installation', label: 'Installation' },
                      { key: 'activation', label: 'Activation' },
                      { key: 'documents', label: 'Documents' },
                      { key: 'final', label: 'Final' }
                    ].map((step, sIdx) => {
                      const isDone = site.steps[step.key as keyof typeof site.steps]
                      const isCurrent = !isDone && sIdx === 3 && site.overallStatus === 'In Progress'

                      return (
                        <div key={step.key} className="relative z-10 flex flex-col items-center">
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all ${isDone
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : isCurrent
                                ? 'border-2 border-blue-600 bg-white text-blue-600 ring-2 ring-blue-100'
                                : 'bg-slate-200 text-slate-500'
                              }`}
                          >
                            {isDone ? <Check size={12} /> : sIdx + 1}
                          </div>
                          <span className="mt-1 text-[8.5px] font-bold text-slate-600 whitespace-nowrap">
                            {step.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs font-bold text-blue-600 pt-1">
                  <span>View & Edit 6-Step Installation Details</span>
                  <ChevronRight size={15} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // View 2: Site 6-Step Multi-step Wizard (Matching 9.07.57 AM, 9.08.16 AM, 9.08.34 AM)
  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSelectedSite(null)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 text-white"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="font-bold text-base leading-tight">ATM Site / Project</h2>
            <span className="text-[10px] text-blue-200">Site LOI: {selectedSite.loiNo}</span>
          </div>
        </div>
        <span className="rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-bold">
          {selectedSite.overallStatus}
        </span>
      </div>

      {/* 6-step Top Stepper Navigation */}
      <div className="flex items-center justify-between rounded-2xl bg-white p-2.5 border border-slate-200 shadow-xs overflow-x-auto">
        {[
          { num: 1, label: 'Franchise & Site Info' },
          { num: 2, label: 'Initial Readiness' },
          { num: 3, label: 'Equipment Installation' },
          { num: 4, label: 'Operational Activation' },
          { num: 5, label: 'Documentation & Account' },
          { num: 6, label: 'Final Status' }
        ].map((s) => (
          <button
            key={s.num}
            type="button"
            onClick={() => setActiveStep(s.num)}
            className={`flex flex-col items-center min-w-[50px] px-1 py-1 rounded-xl transition-all ${activeStep === s.num
              ? 'bg-blue-50 text-blue-800 font-bold scale-105'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${activeStep === s.num
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600'
                }`}
            >
              {s.num}
            </div>
            <span className="mt-1 text-[8.5px] leading-tight text-center line-clamp-1">
              Step {s.num}
            </span>
          </button>
        ))}
      </div>

      {/* STEP 1: Franchise & Site Information */}
      {activeStep === 1 && (
        <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3 animate-in fade-in">
          <h3 className="text-xs font-black text-[#0B2A6B] border-b pb-2 flex items-center gap-2">
            <span className="h-5 w-5 rounded-md bg-blue-600 text-white text-[11px] flex items-center justify-center">1</span>
            Franchise & Site Information
          </h3>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Site / LOI Number *</label>
              <input
                type="text"
                readOnly
                value={selectedSite.loiNo}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Name of Franchisee *</label>
              <input
                type="text"
                readOnly
                value="Ranjeet Pal"
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">FR Contact Number *</label>
              <input
                type="text"
                readOnly
                value="8126817131"
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">FR Email *</label>
              <input
                type="text"
                readOnly
                value="ranjeetpal@gmail.com"
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold text-slate-800 truncate"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Site Location *</label>
              <input
                type="text"
                readOnly
                value={selectedSite.location}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Model *</label>
              <input
                type="text"
                readOnly
                value={selectedSite.model}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">SD Status *</label>
              <input
                type="text"
                readOnly
                value="Verified & Approved"
                className="w-full h-9 rounded-xl border border-emerald-200 bg-emerald-50 px-3 font-bold text-emerald-700"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Initial Readiness (8 items) */}
      {activeStep === 2 && (
        <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3 animate-in fade-in">
          <h3 className="text-xs font-black text-[#0B2A6B] border-b pb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-md bg-blue-600 text-white text-[11px] flex items-center justify-center">2</span>
              2. Initial Readiness Checklist
            </span>
            <span className="text-[10px] text-emerald-600 font-bold">75% Ready</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-blue-50 text-[#0B2A6B] text-[10.5px]">
                <tr>
                  <th className="py-2 px-1">Sl</th>
                  <th className="py-2 px-2">Particulars</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-1 text-center">Photo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {Object.entries(selectedSite.readinessDetails).map(([key, val], idx) => (
                  <tr key={key} className="hover:bg-slate-50">
                    <td className="py-2 px-1 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-2 px-2 font-bold text-slate-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </td>
                    <td className="py-2 px-2">
                      <select
                        defaultValue={val}
                        className="rounded-lg border border-slate-300 bg-white p-1 text-[11px] font-bold text-slate-800"
                      >
                        <option value="Complete">Complete</option>
                        <option value="Done">Done</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </td>
                    <td className="py-2 px-1 text-center">
                      <button
                        onClick={() => alert(`Upload photo for ${key}`)}
                        className="p-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 mx-auto"
                      >
                        <Camera size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STEP 3: Equipment Installation Status (11 items) */}
      {activeStep === 3 && (
        <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3 animate-in fade-in">
          <h3 className="text-xs font-black text-[#0B2A6B] border-b pb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-md bg-blue-600 text-white text-[11px] flex items-center justify-center">3</span>
              3. Equipment Installation Status
            </span>
            <span className="text-[10px] text-amber-600 font-bold">50% Completed</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-blue-50 text-[#0B2A6B] text-[10.5px]">
                <tr>
                  <th className="py-2 px-1">Sl</th>
                  <th className="py-2 px-2">Particulars</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-1 text-center">Photo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {Object.entries(selectedSite.equipmentDetails).map(([key, val], idx) => (
                  <tr key={key} className="hover:bg-slate-50">
                    <td className="py-2 px-1 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-2 px-2 font-bold text-slate-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </td>
                    <td className="py-2 px-2">
                      <select
                        defaultValue={val}
                        className="rounded-lg border border-slate-300 bg-white p-1 text-[11px] font-bold text-slate-800"
                      >
                        <option value="Delivered">Delivered</option>
                        <option value="Installation Done">Installation Done</option>
                        <option value="Installation Pending">Installation Pending</option>
                        <option value="Done">Done</option>
                        <option value="Pending">Pending</option>
                        <option value="Hitachi">Hitachi</option>
                      </select>
                    </td>
                    <td className="py-2 px-1 text-center">
                      <button
                        onClick={() => alert(`Upload hardware photo for ${key}`)}
                        className="p-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 mx-auto"
                      >
                        <Camera size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STEP 4: Operational Activation */}
      {activeStep === 4 && (
        <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3.5 animate-in fade-in">
          <h3 className="text-xs font-black text-[#0B2A6B] border-b pb-2 flex items-center gap-2">
            <span className="h-5 w-5 rounded-md bg-blue-600 text-white text-[11px] flex items-center justify-center">4</span>
            4. Operational Activation
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Tech Live *</label>
              <select
                defaultValue={selectedSite.activationDetails.techLive}
                className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Done">Done</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Tech Live Date *</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  defaultValue={selectedSite.activationDetails.techLiveDate || '04 Oct 2021'}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-slate-50 px-3 pr-9 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="DD MMM YYYY"
                />
                <Calendar size={15} className="absolute right-3 text-blue-600 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Cash Live *</label>
              <select
                defaultValue={selectedSite.activationDetails.cashLive}
                className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Done">Done</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Cash Live Date *</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  defaultValue={selectedSite.activationDetails.cashLiveDate || '04 Oct 2021'}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-slate-50 px-3 pr-9 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="DD MMM YYYY"
                />
                <Calendar size={15} className="absolute right-3 text-blue-600 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Projection Completion Date *</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  defaultValue={selectedSite.activationDetails.projectionCompletionDate}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-slate-50 px-3 pr-9 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="DD MMM YYYY"
                />
                <Calendar size={15} className="absolute right-3 text-blue-600 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Documentation & Account Status */}
      {activeStep === 5 && (
        <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3.5 animate-in fade-in">
          <h3 className="text-xs font-black text-[#0B2A6B] border-b pb-2 flex items-center gap-2">
            <span className="h-5 w-5 rounded-md bg-blue-600 text-white text-[11px] flex items-center justify-center">5</span>
            5. Documentation & Account Status
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-700">Agreement Status *</span>
              <span className="font-extrabold text-emerald-600">{selectedSite.docsStatus.agreement}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-700">LOI Status *</span>
              <span className="font-extrabold text-emerald-600">{selectedSite.docsStatus.loiStatus || 'Issued & Accepted'}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-700">Affidavit Status *</span>
              <span className={`font-extrabold ${selectedSite.docsStatus.affidavitStatus?.includes('Pending') ? 'text-amber-600' : 'text-emerald-600'}`}>
                {selectedSite.docsStatus.affidavitStatus || 'Submitted & Notarized'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-700">Apna App Registration *</span>
              <span className="font-extrabold text-emerald-600">{selectedSite.docsStatus.apnaApp}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-700">WLA Account Status *</span>
              <span className="font-extrabold text-blue-600">{selectedSite.docsStatus.wlaAccount}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-700 block mb-1">Payout Account Status</span>
              <span className="text-[11px] text-slate-600 font-mono">{selectedSite.docsStatus.payoutAccount}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-700">GST Mapping Status</span>
              <span className="font-extrabold text-emerald-600">{selectedSite.docsStatus.gst}</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: Final Status */}
      {activeStep === 6 && (
        <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3.5 animate-in fade-in">
          <h3 className="text-xs font-black text-[#0B2A6B] border-b pb-2 flex items-center gap-2">
            <span className="h-5 w-5 rounded-md bg-blue-600 text-white text-[11px] flex items-center justify-center">6</span>
            6. Final Project Closure Status
          </h3>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Overall Status *</label>
            <div className="h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 flex items-center justify-between text-xs font-bold text-slate-800">
              <span>{selectedSite.completedDate || '20 Nov 2026'}</span>
              <Calendar size={15} className="text-blue-600" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Remark (Team Only) *</label>
            <textarea
              rows={3}
              defaultValue="Site installation completed and verified. ATM operational and live on NPCI network."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 bg-slate-50/70"
            />
            <span className="text-[10px] text-slate-400 text-right block mt-0.5">48 / 500</span>
          </div>
        </div>
      )}

      {/* Bottom Multi-Step Navigation Buttons */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          disabled={activeStep === 1}
          onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
          className="flex-1 h-11 rounded-2xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          ← Previous
        </button>

        {activeStep < 6 ? (
          <button
            type="button"
            onClick={() => setActiveStep((prev) => Math.min(6, prev + 1))}
            className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] text-xs font-bold text-white shadow-md hover:shadow-lg active:scale-95"
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleUpdateStatus}
            className="flex-1 h-11 rounded-2xl bg-emerald-600 text-xs font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Check size={16} /> Submit
          </button>
        )}
      </div>
    </div>
  )
}
