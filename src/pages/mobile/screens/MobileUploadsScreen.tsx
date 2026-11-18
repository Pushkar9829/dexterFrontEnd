import { useState } from 'react'
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

interface MobileUploadsScreenProps {
  onBackToMore?: () => void
}

export function MobileUploadsScreen({ onBackToMore }: MobileUploadsScreenProps) {
  const [tab, setTab] = useState<'upload' | 'records'>('upload')
  const [selectedCategory, setSelectedCategory] = useState('Monthly Site Photographs')
  const [siteId, setSiteId] = useState('ST-MH-PUN-00124')
  const [atmId, setAtmId] = useState('ATM-100234')
  const [docTitle, setDocTitle] = useState('Monthly Site Photographs – Oct 2026')
  const [remarks, setRemarks] = useState('')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  const [records, setRecords] = useState([
    {
      id: 'UPL-10029',
      category: 'Monthly Site Photographs',
      siteId: 'ST-MH-PUN-00124',
      atmId: 'ATM-100234',
      fileName: 'site_front_view_oct26.jpg',
      date: '12 Nov 2026, 04:30 PM',
      status: 'Approved'
    },
    {
      id: 'UPL-10028',
      category: 'ATM Readiness',
      siteId: '2014124545',
      atmId: 'ATM012345',
      fileName: 'electrical_db_box.png',
      date: '10 Nov 2026, 11:15 AM',
      status: 'Pending Verification'
    }
  ])

  const categories = [
    { id: 'Monthly Site Photographs', label: 'Monthly Site Photographs', icon: Camera },
    { id: 'Additional Documents', label: 'Additional Documents', icon: FileText },
    { id: 'Operations Documents', label: 'Operations Documents', icon: Wrench },
    { id: 'ATM Readiness', label: 'ATM Readiness', icon: Building },
    { id: 'Other Uploads', label: 'Other Uploads', icon: LayoutGrid }
  ]

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newRecord = {
      id: `UPL-${Math.floor(10000 + Math.random() * 90000)}`,
      category: selectedCategory,
      siteId,
      atmId,
      fileName: selectedFile || 'uploaded_document.pdf',
      date: 'Just now',
      status: 'Pending Verification'
    }
    setRecords([newRecord, ...records])
    setSelectedFile(null)
    setTab('records')
    alert('File uploaded successfully! Sent to CRM Team for verification.')
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
                  setDocTitle(`${newCat} – Oct 2026`)
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
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-bold"
                >
                  <option value="ST-MH-PUN-00124">ST-MH-PUN-00124</option>
                  <option value="2014124545">2014124545 (Bewar)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">ATM ID *</label>
                <select
                  value={atmId}
                  onChange={(e) => setAtmId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-bold"
                >
                  <option value="ATM-100234">ATM-100234</option>
                  <option value="ATM012345">ATM012345</option>
                </select>
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
              onClick={() => setSelectedFile('site_photo_oct_2026.jpg')}
              className="rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/40 p-5 text-center cursor-pointer hover:bg-blue-50 transition-colors"
            >
              <UploadCloud size={30} className="mx-auto text-blue-600 mb-1" />
              <p className="text-xs font-bold text-[#0B2A6B]">Tap to Upload or Select Files</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Photos / Documents (JPG, PNG, PDF) | Max size: 10 MB per file
              </p>
              {selectedFile && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  <Check size={13} /> {selectedFile}
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
          {records.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-[#0B2A6B]">{r.fileName}</h4>
                  <p className="text-[10px] text-slate-500">{r.category} • Site: {r.siteId}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    r.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {r.status}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10.5px] text-slate-400 border-t pt-1.5">
                <span>Uploaded: {r.date}</span>
                <span className="font-mono text-blue-600 font-bold">{r.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
