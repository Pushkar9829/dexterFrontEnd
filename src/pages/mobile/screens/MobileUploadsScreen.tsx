import { useMemo, useRef, useState } from 'react'
import {
  UploadCloud,
  ArrowLeft,
  Camera,
  FileText,
  Wrench,
  Building,
  LayoutGrid,
  Check,
  ChevronDown
} from 'lucide-react'
import { useLegal } from '@/data/legal'
import { cbrMaster } from '@/data/cbr'
import { clMaster } from '@/data/cashLoadingRegisterStore'
import { useSiteInstallations } from '@/data/siteInstallation'
import { useChargebacks } from '@/data/chargeBackDisputes'
import { useWlaStatements } from '@/data/wlaStatements'
import { emitWorkflow } from '@/data/workflow'
import { mobileUploadStore } from '../data/mobileFeeds'
import { fmtDateTime, useMobileUser, useMyScope } from '../data/mobileSession'

type UploadRow = { id: string; category: string; siteId: string; atmId: string; fileName: string; at: string; status: string; source: string }

interface MobileUploadsScreenProps {
  onBackToMore?: () => void
}

export function MobileUploadsScreen({ onBackToMore }: MobileUploadsScreenProps) {
  const [tab, setTab] = useState<'upload' | 'records'>('upload')
  const user = useMobileUser()
  const { frId, sites, siteIds, atmIds } = useMyScope()
  const monthTag = new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
  const [selectedCategory, setSelectedCategory] = useState('Monthly Site Photographs')
  const [siteId, setSiteId] = useState(() => sites[0]?.siteId ?? '')
  const site = sites.find((x) => x.siteId === siteId) ?? sites[0]
  const atmId = site?.atmId ?? ''
  const [docTitle, setDocTitle] = useState(`Monthly Site Photographs – ${monthTag}`)
  const [remarks, setRemarks] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Everything this franchise has uploaded, across modules (read from the shared stores)
  const own = mobileUploadStore.use()
  const legal = useLegal()
  const cbr = cbrMaster.store.use()
  const cl = clMaster.store.use()
  const inst = useSiteInstallations()
  const cbs = useChargebacks()
  const wla = useWlaStatements()
  const records = useMemo<UploadRow[]>(() => {
    const rows: UploadRow[] = []
    own.filter((u) => u.frId === frId).forEach((u) => rows.push({ id: u.id, category: u.category, siteId: u.siteId, atmId: u.atmId, fileName: u.fileName, at: u.at, status: u.status, source: 'Upload Center' }))
    const legalSites = new Map(legal.sites.filter((x) => x.franchiseId === frId).map((x) => [x.id, x]))
    legal.docs.filter((d) => legalSites.has(d.siteId)).forEach((d) =>
      d.uploads.filter((u) => u.source === 'Mobile app').forEach((u) => rows.push({ id: u.id, category: `Legal · ${d.kind}`, siteId: d.siteId, atmId: legalSites.get(d.siteId)?.atmId || '—', fileName: u.file, at: u.uploadedAt, status: u.decision ?? 'Pending Verification', source: 'Legal' })),
    )
    ;[...cbr, ...cl].filter((r) => r.frId === frId || atmIds.has(r.atmId)).forEach((r) =>
      r.documents.forEach((d) => rows.push({ id: d.id, category: `Operations Documents · ${r.kind}`, siteId: r.siteId, atmId: r.atmId, fileName: d.name, at: d.at, status: r.locked ? 'Approved' : r.status, source: r.id })),
    )
    inst.records.filter((r) => r.frId === frId).forEach((r) =>
      r.photos.filter((p) => p.uploadedByRole === 'Franchise' && !p.deleted).forEach((p) => rows.push({ id: p.id, category: `ATM Readiness · ${p.stage}`, siteId: p.siteId, atmId: sites.find((x) => x.siteId === p.siteId)?.atmId ?? '—', fileName: p.name, at: p.uploadedAt, status: p.review === 'Accepted' ? 'Approved' : p.review === 'Rejected' ? 'Rejected' : 'Pending Verification', source: 'Site Installation' })),
    )
    cbs.filter((r) => atmIds.has(r.atmId)).forEach((r) =>
      (r.evidence?.files ?? []).forEach((x, i) => rows.push({ id: `${r.id}-EV${i}`, category: `Chargeback evidence · ${x.kind}`, siteId: '—', atmId: r.atmId, fileName: x.name, at: x.at, status: r.evidenceCheck ? r.evidenceCheck.result : 'Pending Verification', source: r.id })),
    )
    wla.filter((w) => w.frId === frId && w.channel === 'Mobile App').forEach((w) => rows.push({ id: w.id, category: 'WLA Statement', siteId: w.siteId, atmId: w.atmId, fileName: w.file.name, at: w.uploadedAt, status: w.status, source: w.id }))
    return rows.filter((r) => r.at).sort((x, y) => y.at.localeCompare(x.at))
  }, [own, legal, cbr, cl, inst, cbs, wla, frId, atmIds, sites])
  void siteIds

  const categories = [
    { id: 'Monthly Site Photographs', label: 'Monthly Site Photographs', icon: Camera },
    { id: 'Additional Documents', label: 'Additional Documents', icon: FileText },
    { id: 'Operations Documents', label: 'Operations Documents', icon: Wrench },
    { id: 'ATM Readiness', label: 'ATM Readiness', icon: Building },
    { id: 'Other Uploads', label: 'Other Uploads', icon: LayoutGrid }
  ]

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!site || !user) {
      alert('Select one of your sites.')
      return
    }
    if (!selectedFile) {
      alert('Select a photo or document to upload.')
      return
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('Maximum file size is 10 MB.')
      return
    }
    const id = `UPL-${Date.now().toString(36).toUpperCase()}`
    mobileUploadStore.set((l) => [
      { id, frId, category: selectedCategory, siteId: site.siteId, atmId: site.atmId, title: docTitle.trim(), remarks: remarks.trim(), fileName: selectedFile.name, sizeKb: Math.max(1, Math.round(selectedFile.size / 1024)), at: new Date().toISOString(), by: user.name, status: 'Pending Verification' },
      ...l,
    ])
    // CRM gets a verification task + notification through the common workflow engine
    emitWorkflow({
      module: 'Operations',
      event: 'Submit',
      refId: id,
      vars: { Record_ID: id, Site_ID: site.siteId, ATM_ID: site.atmId, Franchise_Name: user.franchise?.name ?? frId, Current_Status: 'Pending Verification', Pending_Action: `Verify franchise upload – ${selectedCategory}` },
      nextAction: { title: `Verify franchise upload ${id} · ${selectedCategory} · ${site.atmId}`, dueHours: 48, priority: 'Low' },
      franchiseEmail: user.email,
    })
    setSelectedFile(null)
    setRemarks('')
    setTab('records')
  }

  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      {/* Banner matching 9.43.36 AM.jpeg */}
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
              <h1 className="text-base font-black text-white">Upload Center</h1>
              <p className="text-[11px] text-blue-100 mt-0.5">
                Upload site photos, documents and other required files.
              </p>
            </div>
          </div>
          <UploadCloud size={26} className="text-amber-300 shrink-0" />
        </div>

        {/* Sub-tabs: Upload Files vs Uploaded Records */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'upload' ? 'bg-white text-[#0B2A6B] shadow-xs' : 'bg-white/15 text-white/90'
            }`}
          >
            Upload Files
          </button>
          <button
            type="button"
            onClick={() => setTab('records')}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'records' ? 'bg-white text-[#0B2A6B] shadow-xs' : 'bg-white/15 text-white/90'
            }`}
          >
            Uploaded Records ({records.length})
          </button>
        </div>
      </div>

      {tab === 'upload' ? (
        <form onSubmit={handleUploadSubmit} className="space-y-3.5">
          {/* Category Select Dropdown */}
          <div className="rounded-2xl border border-blue-200 bg-white p-3.5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="upload-category" className="text-xs font-bold text-slate-800">
                Select Upload Category *
              </label>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                {categories.length} Categories
              </span>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-600">
                {(() => {
                  const ActiveIcon = categories.find((c) => c.id === selectedCategory)?.icon || FileText
                  return <ActiveIcon size={16} />
                })()}
              </div>

              <select
                id="upload-category"
                value={selectedCategory}
                onChange={(e) => {
                  const newCat = e.target.value
                  setSelectedCategory(newCat)
                  setDocTitle(`${newCat} – ${monthTag}`)
                }}
                className="w-full h-11 rounded-xl border border-slate-300 bg-slate-50/70 pl-9 pr-9 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 shadow-xs appearance-none transition-all cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>

              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>

          {/* Upload Details */}
          <div className="rounded-2xl border border-blue-200 bg-white p-3.5 shadow-xs space-y-2.5 text-xs">
            <span className="text-xs font-black text-[#0B2A6B] block border-b pb-1">
              Upload Details
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">Site ID *</label>
                <select
                  value={site?.siteId ?? ''}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-bold"
                >
                  {sites.length === 0 && <option value="">No site mapped</option>}
                  {sites.map((x) => (
                    <option key={x.siteId} value={x.siteId}>
                      {x.siteId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">ATM ID *</label>
                <input
                  readOnly
                  value={atmId}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-slate-50 px-2 text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">Document Title *</label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-800"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">Remarks (Optional)</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add remarks (e.g. Front view, Back panel, etc.)"
                className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 text-slate-800"
              />
            </div>

            {/* Tap to Upload Box */}
            <div
              onClick={() => fileRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/40 p-5 text-center cursor-pointer hover:bg-blue-50 transition-colors"
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
              <UploadCloud size={30} className="mx-auto text-blue-600 mb-1" />
              <p className="text-xs font-bold text-[#0B2A6B]">Tap to Upload or Select Files</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Photos / Documents (JPG, PNG, PDF) | Max size: 10 MB per file
              </p>
              {selectedFile && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  <Check size={13} /> {selectedFile.name} ({Math.max(1, Math.round(selectedFile.size / 1024))} KB)
                </div>
              )}
            </div>
          </div>

          {/* Guidelines */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-[10px] text-slate-600 grid grid-cols-3 gap-1 text-center">
            <div>📸 Clear photographs</div>
            <div>📄 JPG, PNG, PDF</div>
            <div>📦 Up to 10 MB</div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] text-white font-extrabold text-xs shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <UploadCloud size={16} /> Upload Now
          </button>
        </form>
      ) : (
        <div className="space-y-2.5">
          {records.length === 0 && <p className="rounded-xl bg-white p-4 text-center text-xs text-slate-500">Nothing uploaded by your franchise yet.</p>}
          {records.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-[#0B2A6B]">{r.fileName}</h4>
                  <p className="text-[10px] text-slate-500">{r.category} • {r.atmId} • {r.source}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    /approved|accepted|matched|verified/i.test(r.status) ? 'bg-emerald-100 text-emerald-700' : /reject|mismatch|returned/i.test(r.status) ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {r.status}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10.5px] text-slate-400 border-t pt-1.5">
                <span>Uploaded: {fmtDateTime(r.at)}</span>
                <span className="font-mono text-blue-600 font-bold">{r.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
