import { useMemo, useState } from 'react'
import { ArrowLeft, Check, Download, Eye, FileText, Lock, Search, Upload } from 'lucide-react'
import { currentVersion, docTitle, recordAccess, useLegal } from '@/data/legal'
import { useOtherDocRecords } from '@/data/legalOtherDocs'
import { fmtDate, useMobileUser, useMyScope } from '../data/mobileSession'
import { accessTds, openTdsAsync, useTdsLetters } from '@/data/tdsLetters'
import { apiEnabled } from '@/lib/api'
import { logWlaAccess, logWlaAccessAsync, periodLabel, uploadWla, uploadWlaAsync, useWlaStatements, wlaFrUser, type WlaStatement } from '@/data/wlaStatements'
import { useSites } from '@/data/network'
import { dt, inr, useMobileFr } from '@/pages/operations/eod2/fmt'
import { MobileFranchiseBar } from '../components/MobileFranchiseBar'

interface MobileDownloadsScreenProps {
  onBackToMore?: () => void
}

type Tab = 'docs' | 'tds' | 'wla'
const input = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#1453CA]'

/** Download centre: general documents, TDS letters (own franchise only, UAT 16) and WLA statements (upload / view own). */
export function MobileDownloadsScreen({ onBackToMore }: MobileDownloadsScreenProps) {
  const [tab, setTab] = useState<Tab>('tds')
  return (
    <div className="space-y-3 px-3 pt-3 pb-6">
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          {onBackToMore && (
            <button type="button" onClick={onBackToMore} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15" aria-label="Back">
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black text-white">Download Center</h1>
            <p className="mt-0.5 text-[11px] text-blue-100">Documents, TDS letters and WLA statements of your franchise.</p>
          </div>
          <Download size={26} className="shrink-0 text-amber-300" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-white/10 p-1">
          {(
            [
              ['tds', 'TDS Letters'],
              ['wla', 'WLA Statements'],
              ['docs', 'Documents'],
            ] as [Tab, string][]
          ).map(([id, l]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-lg py-1.5 text-[11px] font-bold ${tab === id ? 'bg-white text-[#0B2A6B]' : 'text-white/90'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {tab !== 'docs' && <MobileFranchiseBar />}
      {tab === 'docs' && <GeneralDocs />}
      {tab === 'tds' && <TdsTab />}
      {tab === 'wla' && <WlaTab />}
    </div>
  )
}

type DownloadDoc = { id: string; title: string; category: 'Bank Mandate' | 'Agreements' | 'Legal' | 'Other'; format: string; size: string; date: string; site: string; legalDocId?: string }
const LEGAL_CAT: Record<string, DownloadDoc['category']> = { AGR: 'Agreements', BNK: 'Bank Mandate', LOI: 'Legal', AFF: 'Legal' }
const OTHER_CAT = (c: string): DownloadDoc['category'] => (c === 'Bank Mandate' ? 'Bank Mandate' : c === 'Rent Agreement' ? 'Agreements' : ['Power of Attorney', 'Indemnity Bond', 'Board Resolution', 'NOC Clearance'].includes(c) ? 'Legal' : 'Other')

/** Documents shared with this franchise: current originals of its legal documents + other site documents on file. */
function GeneralDocs() {
  const user = useMobileUser()
  const { frId, siteIds } = useMyScope()
  const legal = useLegal()
  const other = useOtherDocRecords().records
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadedIds, setDownloadedIds] = useState<string[]>([])
  const categories = ['All', 'Bank Mandate', 'Agreements', 'Legal', 'Other']
  const docs = useMemo<DownloadDoc[]>(() => {
    const legalSites = new Map(legal.sites.filter((s) => s.franchiseId === frId).map((s) => [s.id, s]))
    const fromLegal = legal.docs
      .filter((d) => legalSites.has(d.siteId))
      .map((d) => {
        const v = currentVersion(d)
        return { id: d.id, legalDocId: d.id, title: `${docTitle(d)} ${d.version}`, category: LEGAL_CAT[d.kind] ?? 'Legal', format: 'PDF', size: `${v.sizeMb.toFixed(1)} MB`, date: fmtDate(v.sharedAt ?? v.createdAt), site: legalSites.get(d.siteId)?.location ?? d.siteId }
      })
    const fromOther = other
      .filter((r) => siteIds.has(r.siteId))
      .flatMap((r) => r.documents.map((f, i) => ({ id: `${r.id}-${i}`, title: `${r.docTitle} — ${f.name}`, category: OTHER_CAT(r.category), format: (f.name.split('.').pop() ?? 'pdf').toUpperCase().slice(0, 4), size: `${Math.round(f.sizeKb)} KB`, date: r.issueDate || fmtDate(r.updatedAt), site: r.atmId })))
    return [...fromLegal, ...fromOther]
  }, [legal, other, frId, siteIds])
  const handleDownload = (doc: DownloadDoc) => {
    if (doc.legalDocId) recordAccess(doc.legalDocId, 'Downloaded', 'Mobile app', { name: user?.name ?? 'Franchisee', role: 'Franchisee' })
    setDownloadedIds((prev) => (prev.includes(doc.id) ? prev : [...prev, doc.id]))
  }
  const filtered = docs.filter((d) => (activeCategory === 'All' || d.category === activeCategory) && d.title.toLowerCase().includes(searchQuery.toLowerCase()))
  return (
    <div className="space-y-2.5">
      <div className="relative">
        <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search document (e.g. Agreement, Bank Mandate)…" className="h-9 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none" />
      </div>
      <div className="scroll-thin flex gap-1.5 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button key={cat} type="button" onClick={() => setActiveCategory(cat)} className={`rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${activeCategory === cat ? 'bg-[#0B2A6B] text-white' : 'bg-slate-100 text-slate-600'}`}>
            {cat}
          </button>
        ))}
      </div>
      {filtered.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">No documents shared with your franchise in this category.</p>}
      {filtered.map((item) => {
        const done = downloadedIds.includes(item.id)
        const formatColor = item.format === 'PDF' ? 'bg-red-100 text-red-700 border-red-200' : item.format.startsWith('XLS') ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200'
        return (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <div className="flex min-w-0 items-start gap-3">
              <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[10px] font-black ${formatColor}`}>{item.format}</div>
              <div className="min-w-0">
                <h4 className="truncate text-xs font-black text-[#0B2A6B]">{item.title}</h4>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {item.category} • {item.size} • {item.date} • {item.site}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => handleDownload(item)} className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold shadow-xs ${done ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'bg-gradient-to-r from-[#0C3E98] to-[#1453CA] text-white'}`}>
              {done ? <Check size={13} /> : <Download size={13} />}
              <span>{done ? 'Saved' : 'Download'}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

function TdsTab() {
  const frId = useMobileFr()
  const docs = useTdsLetters()
  const [msg, setMsg] = useState('')
  // UAT 16 — strictly the mapped franchise's active documents.
  const mine = docs.filter((d) => d.frId === frId && d.status === 'Active')
  const act = (id: string, action: 'View' | 'Download') => {
    if (apiEnabled) {
      // API mode: the server logs the access and serves the file (franchise-scoped)
      void openTdsAsync(id, action).then(() => setMsg(`${action === 'View' ? 'Opened' : 'Downloaded'} ${id} — logged`)).catch(() => setMsg('Could not open the document'))
      return
    }
    const e = accessTds(id, frId, wlaFrUser(frId), action, 'Mobile App')
    setMsg(e ?? `${action === 'View' ? 'Opened' : 'Downloaded'} ${id} — logged`)
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 px-1 text-[10.5px] font-semibold text-slate-500">
        <Lock size={11} /> Only TDS letters mapped to your franchise are shown.
      </div>
      {msg && <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-800">{msg}</div>}
      {!mine.length && <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">No TDS letters uploaded for your franchise yet.</div>}
      {mine.map((d) => (
        <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-100 text-[10px] font-black text-red-700">PDF</div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-[#0B2A6B]">
                {d.docType} · FY {d.fy}
              </h4>
              <p className="mt-0.5 text-[10.5px] text-slate-500">
                {d.period} · {d.tdsAmount ? `TDS ${inr(d.tdsAmount)} · ` : ''}uploaded {dt(d.uploadedAt)}
              </p>
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => act(d.id, 'View')} className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700">
              <Eye size={13} /> View
            </button>
            <button type="button" onClick={() => act(d.id, 'Download')} className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#1453CA] text-[11px] font-bold text-white">
              <Download size={13} /> Download
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function WlaTab() {
  const frId = useMobileFr()
  const list = useWlaStatements()
  const { sites } = useSites()
  const mySites = useMemo(() => sites.filter((s) => s.frId === frId), [sites, frId])
  const mine = list.filter((x) => x.frId === frId)
  const [form, setForm] = useState<{ open: boolean; replacing?: WlaStatement }>({ open: false })
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => setForm({ open: true })} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#1453CA] text-xs font-black text-white">
        <Upload size={14} /> Upload WLA statement
      </button>
      {msg && <div className={`rounded-lg border px-3 py-2 text-[11px] font-semibold ${msg.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{msg.text}</div>}
      {form.open && (
        <WlaUploadForm
          key={form.replacing?.id ?? 'new'}
          sites={mySites}
          replacing={form.replacing}
          onClose={() => setForm({ open: false })}
          onDone={(t) => {
            setMsg({ tone: 'ok', text: t })
            setForm({ open: false })
          }}
        />
      )}
      {!mine.length && <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">No statements uploaded yet.</div>}
      {mine.map((x) => (
        <div key={x.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-[#0B2A6B]">
              {periodLabel(x.period)} · {x.atmId}
            </span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${x.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700' : x.status === 'Rejected' ? 'bg-red-50 text-red-700' : x.status === 'Returned' ? 'bg-amber-50 text-amber-700' : x.status === 'Replaced' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-700'}`}>{x.status}</span>
          </div>
          <p className="mt-1 text-[10.5px] text-slate-500">
            <FileText size={11} className="mr-1 inline" />
            {x.file.name} · v{x.version} · {x.bank} {x.wlaAccount}
          </p>
          {x.reason && <p className="mt-1 text-[10.5px] font-semibold text-red-600">Reason: {x.reason}</p>}
          {x.verifiedBy && (
            <p className="mt-0.5 text-[10px] text-slate-400">
              {x.status} by {x.verifiedBy} · {dt(x.verifiedAt)}
            </p>
          )}
          <div className="mt-2 flex gap-2">
            {x.status === 'Returned' && (
              <button type="button" onClick={() => setForm({ open: true, replacing: x })} className="h-8 flex-1 rounded-lg bg-amber-600 text-[11px] font-bold text-white">
                Upload replacement
              </button>
            )}
            {x.status === 'Accepted' && (
              <button type="button" onClick={() => { if (apiEnabled) void logWlaAccessAsync(x.id, wlaFrUser(frId), 'Download'); else logWlaAccess(x.id, wlaFrUser(frId), 'Download'); setMsg({ tone: 'ok', text: `Downloaded ${x.file.name}` }) }} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700">
                <Download size={13} /> Download
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function WlaUploadForm({ sites, replacing, onClose, onDone }: { sites: { siteId: string; atmId: string }[]; replacing?: WlaStatement; onClose: () => void; onDone: (t: string) => void }) {
  const [siteId, setSiteId] = useState(replacing?.siteId ?? sites[0]?.siteId ?? '')
  const [period, setPeriod] = useState(replacing?.period ?? '')
  const [file, setFile] = useState<{ name: string; size: number } | null>(null)
  const [raw, setRaw] = useState<File | null>(null)
  const [pwd, setPwd] = useState(false)
  const [password, setPassword] = useState('')
  const [readable, setReadable] = useState(false)
  const [err, setErr] = useState('')
  const submit = () => {
    const input = { siteId, period, file, passwordProtected: pwd, password, readable, remarks: '', replacingId: replacing?.id }
    if (apiEnabled) {
      void uploadWlaAsync(input, 'Mobile App', raw).then((r) => (r.error ? setErr(r.error) : onDone(`${r.rec?.id ?? 'Statement'} uploaded — sent to CRM for verification`)))
      return
    }
    const res = uploadWla(input, 'Mobile App')
    if (res.error) return setErr(res.error)
    onDone(`${res.rec!.id} uploaded — sent to CRM for verification`)
  }
  return (
    <div className="space-y-2.5 rounded-2xl border border-[#1453CA]/30 bg-white p-3.5 shadow-xs">
      <div className="text-xs font-black text-[#0B2A6B]">{replacing ? `Replace ${replacing.id} (returned)` : 'New WLA statement'}</div>
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold text-slate-600">ATM / site</span>
        <select className={input} value={siteId} onChange={(e) => setSiteId(e.target.value)} disabled={!!replacing}>
          {sites.map((s) => (
            <option key={s.siteId} value={s.siteId}>
              {s.atmId}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold text-slate-600">Statement month</span>
        <input type="month" className={input} value={period} onChange={(e) => setPeriod(e.target.value)} disabled={!!replacing} />
      </label>
      <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#1453CA]/40 bg-blue-50/40 px-3 text-[11px] font-bold text-[#1453CA]">
        <Upload size={14} /> {file ? file.name : 'Choose statement (PDF / Excel / image)'}
        <input type="file" accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const x = e.target.files?.[0]; if (x) { setFile({ name: x.name, size: x.size }); setRaw(x) } }} />
      </label>
      <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
        <input type="checkbox" checked={pwd} onChange={(e) => setPwd(e.target.checked)} /> Password protected
      </label>
      {pwd && <input type="password" placeholder="File password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} />}
      <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
        <input type="checkbox" checked={readable} onChange={(e) => setReadable(e.target.checked)} /> The statement is clear and readable
      </label>
      {err && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-800">{err}</div>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-200 text-xs font-bold text-slate-700">
          Cancel
        </button>
        <button type="button" onClick={submit} className="h-9 rounded-lg bg-[#1453CA] text-xs font-bold text-white">
          Upload
        </button>
      </div>
    </div>
  )
}
