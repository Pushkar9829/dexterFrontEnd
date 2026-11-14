import { useState } from 'react'
import {
  Download,
  ArrowLeft,
  Search,
  Check
} from 'lucide-react'
import { DOWNLOAD_DOCUMENTS, type DownloadDocumentItem } from '../data/mobileMockData'

interface MobileDownloadsScreenProps {
  onBackToMore?: () => void
}

export function MobileDownloadsScreen({ onBackToMore }: MobileDownloadsScreenProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadedIds, setDownloadedIds] = useState<string[]>([])

  const categories = ['All', 'Bank Mandate', 'Agreements', 'Legal', 'Other']

  const handleDownload = (doc: DownloadDocumentItem) => {
    setDownloadedIds((prev) => [...prev, doc.id])
    alert(`Downloading "${doc.title}.${doc.format.toLowerCase()}" (${doc.size})...`)
  }

  const filtered = DOWNLOAD_DOCUMENTS.filter((d) => {
    const matchesCat = activeCategory === 'All' || d.category === activeCategory
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCat && matchesSearch
  })

  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      {/* Banner matching 9.43.56 AM.jpeg */}
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
              <h1 className="text-base font-black text-white">Download Center</h1>
              <p className="text-[11px] text-blue-100 mt-0.5">
                Access and download all important documents and templates.
              </p>
            </div>
          </div>
          <Download size={26} className="text-amber-300 shrink-0" />
        </div>

        {/* Search & Filter */}
        <div className="mt-3 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search document (e.g. Rent Agreement, NOC, etc.)..."
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* Category Tabs */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scroll-thin">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-white text-[#0B2A6B] shadow-xs'
                  : 'bg-white/15 text-white/90 hover:bg-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1 text-xs">
          <span className="font-bold text-slate-700">Document List</span>
          <span className="text-[10px] text-slate-400 font-medium">Sort: Latest First</span>
        </div>

        {filtered.map((item) => {
          const isDownloaded = downloadedIds.includes(item.id)
          const formatColor =
            item.format === 'PDF'
              ? 'bg-red-100 text-red-700 border-red-200'
              : item.format === 'XLS'
              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
              : 'bg-blue-100 text-blue-700 border-blue-200'

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-blue-300 transition-all flex items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border font-black text-xs ${formatColor}`}
                >
                  {item.format}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-[#0B2A6B] truncate">{item.title}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {item.category} • {item.size} • {item.date}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDownload(item)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  isDownloaded
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-gradient-to-r from-[#0C3E98] to-[#1453CA] text-white hover:opacity-95 active:scale-95'
                }`}
              >
                {isDownloaded ? <Check size={13} /> : <Download size={13} />}
                <span>{isDownloaded ? 'Saved' : 'Download'}</span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
