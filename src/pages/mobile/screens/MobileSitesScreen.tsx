// Franchise mobile app — "My Sites" (Project spec §5.4, §14).
// Same data store, stages and business rules as the CRM Site Installation module: the franchise sees only
// its assigned sites, updates checklist status, uploads multiple photos (GPS camera / gallery), sees CRM
// rejection remarks, corrects and resubmits, and sees the approved status after Admin approval.
import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, Building2, Calendar, Camera, Check, CheckCircle2, ChevronRight, Clock, Image as ImageIcon, Lock, Mail, MapPin, Phone, RefreshCw, Send, Upload } from 'lucide-react'
import { useChecklists, wid } from '@/data/workflow'
import { useFranchises, dossierFor } from '@/data/franchises'
import { useSites } from '@/data/network'
import { mobileFrStore } from '@/pages/operations/eod2/fmt'
import { useMobileUser, useMyScope } from '../data/mobileSession'
import { useProjects } from '@/data/projects'
import {
  DOC_FIELDS, STAGES, activePhotos, addPhoto, currentStage, franchiseSubmit, installCompletion, isEditable, itemLabel, mockGps, mockPhoto, readImage, stageState, updateActivation, updateEntry, useSiteInstallations,
  type ChecklistEntry, type InstallPhoto, type InstallRecord, type PhotoStage, type StageKey, type StageState,
} from '@/data/siteInstallation'

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

/** Franchise-facing wording of the shared workflow status. */
function frStatus(r: InstallRecord): { text: string; cls: string } {
  switch (r.status) {
    case 'Approved':
      return { text: 'Approved', cls: 'bg-emerald-100 text-emerald-800' }
    case 'Pending Admin Approval':
      return { text: 'Admin approval pending', cls: 'bg-violet-100 text-violet-800' }
    case 'Submitted by Franchise':
      return { text: 'Submitted · CRM review', cls: 'bg-blue-100 text-blue-800' }
    case 'Correction Requested':
    case 'Rejected by Admin':
      return { text: 'Correction needed', cls: 'bg-red-100 text-red-700' }
    case 'Reopened':
      return { text: 'Reopened · update needed', cls: 'bg-amber-100 text-amber-800' }
    default:
      return { text: 'Active', cls: 'bg-amber-100 text-amber-800' }
  }
}
const STEP_CLS: Record<StageState, string> = {
  Complete: 'bg-emerald-600 text-white',
  'In Progress': 'border-2 border-blue-600 bg-white text-blue-600',
  Correction: 'bg-red-500 text-white',
  'Not Started': 'bg-slate-200 text-slate-500',
}

export function MobileSitesScreen() {
  const inst = useSiteInstallations()
  const frs = useFranchises()
  const { sites } = useSites()
  const projects = useProjects()
  useChecklists()

  const franchiseIds = useMemo(() => [...new Set(inst.records.map((r) => r.frId))], [inst.records])
  const user = useMobileUser()
  const { frId } = useMyScope()
  const setFrId = (id: string) => mobileFrStore.set(id)
  const [selId, setSelId] = useState<string | null>(null)
  const [stage, setStage] = useState<StageKey | null>(null)

  const fr = frs.find((f) => f.id === frId)
  const contact = fr ? dossierFor(fr) : undefined
  // record-level permission: only this franchise's assigned sites
  const mine = useMemo(() => inst.records.filter((r) => r.frId === frId).sort((a, b) => Number(a.status === 'Approved') - Number(b.status === 'Approved')), [inst.records, frId])
  const sel = mine.find((r) => r.id === selId) ?? null
  const siteOf = (r: InstallRecord) => sites.find((s) => s.siteId === r.siteId)
  const loiOf = (r: InstallRecord) => projects.projects.find((p) => p.siteId === r.siteId)?.loiNumber ?? ''

  if (sel && stage) return <StageView r={sel} stage={stage} onBack={() => setStage(null)} />

  if (sel) {
    const site = siteOf(sel)
    const st = frStatus(sel)
    const comp = installCompletion(sel)
    return (
      <div className="space-y-3 px-3 pt-3 pb-6">
        <button type="button" onClick={() => setSelId(null)} className="flex items-center gap-1 text-xs font-bold text-blue-700">
          <ArrowLeft size={14} /> My Sites
        </button>
        <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
          <div className="text-[11px] font-semibold text-white/70">ATM Site / Project</div>
          <div className="text-base font-black">Site/LOI Number: {sel.siteId}</div>
          <div className="text-[11px] text-white/80">{loiOf(sel)}</div>
          <div className="mt-2 flex items-center justify-between">
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${st.cls}`}>Status: {st.text}</span>
            <span className="text-[11px] font-bold">{comp.pct}% complete</span>
          </div>
        </div>

        <Alerts r={sel} />

        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="text-blue-600" /> {site ? `${site.address}, ${site.district}` : sel.siteId}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <Calendar size={12} className="text-blue-600" /> Target: {fmt(sel.targetDate)} · Current stage: {currentStage(sel).label}
          </div>
        </div>

        <div className="space-y-2">
          {STAGES.map((s) => {
            const ss = stageState(sel, s.key)
            return (
              <button key={s.key} type="button" onClick={() => setStage(s.key)} className="flex w-full items-center gap-3 rounded-2xl border border-blue-100 bg-white p-3 text-left shadow-xs hover:border-blue-400">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${STEP_CLS[ss]}`}>{ss === 'Complete' ? <Check size={13} /> : ss === 'Correction' ? '!' : s.n}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-black text-slate-800">
                    {s.n}. {s.label}
                  </span>
                  <span className="block text-[10.5px] text-slate-500">{ss === 'Correction' ? 'CRM requested a correction' : ss}</span>
                </span>
                <ChevronRight size={15} className="text-blue-600" />
              </button>
            )
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[11px]">
          <div className="mb-1 font-black text-slate-700">Your CRM Executive</div>
          <div className="font-semibold text-slate-800">{sel.crmExecutive}</div>
          <div className="mt-1 flex flex-wrap gap-3 text-slate-600">
            <span className="flex items-center gap-1">
              <Phone size={11} /> 0120-4111111
            </span>
            <span className="flex items-center gap-1">
              <Mail size={11} /> {sel.crmExecutive.toLowerCase().replace(/\s+/g, '.')}@dexterindia.in
            </span>
          </div>
        </div>

        <SubmitBar r={sel} />
      </div>
    )
  }

  const done = mine.filter((r) => r.status === 'Approved').length
  return (
    <div className="space-y-4 px-3 pt-3 pb-6">
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black">My Sites</h1>
            <p className="text-[11px] text-white/80">Assigned site projects · same workflow as CRM</p>
          </div>
        </div>
      </div>

      <label className="block rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-semibold text-slate-500">{user?.isPreview ? 'Signed-in franchise (Admin preview switch)' : 'Signed-in franchise'}</span>
        {user?.isPreview ? (
          <select value={frId} onChange={(e) => { setFrId(e.target.value); setSelId(null) }} className="w-full rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-900">
            {!franchiseIds.includes(frId) && <option value={frId}>{frs.find((f) => f.id === frId)?.name ?? frId}</option>}
            {franchiseIds.map((id) => (
              <option key={id} value={id}>
                {frs.find((f) => f.id === id)?.name ?? id}
              </option>
            ))}
          </select>
        ) : (
          <span className="block text-xs font-bold text-slate-900">{fr?.name ?? frId} · {frId}</span>
        )}
        <span className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-slate-600">
          <span className="flex items-center gap-1">
            <Phone size={11} className="text-blue-600" /> {contact?.contactNumber}
          </span>
          <span className="flex items-center gap-1">
            <Mail size={11} className="text-blue-600" /> {contact?.email}
          </span>
        </span>
      </label>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="text-lg font-black text-slate-800">{done}</div>
            <div className="text-[11px] font-semibold text-slate-600">Approved</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-white">
            <Clock size={18} />
          </div>
          <div>
            <div className="text-lg font-black text-slate-800">{mine.length - done}</div>
            <div className="text-[11px] font-semibold text-slate-600">In progress</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {mine.map((r, i) => {
          const site = siteOf(r)
          const st = frStatus(r)
          const rejected = activePhotos(r).filter((p) => p.review === 'Rejected').length
          return (
            <button key={r.id} type="button" onClick={() => { setSelId(r.id); setStage(null) }} className="w-full rounded-2xl border border-blue-200/90 bg-white p-4 text-left shadow-xs transition-all hover:border-blue-400">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">{i + 1}</span>
                  <span className="text-xs font-black text-[#0B2A6B]">Site / LOI : {r.siteId}</span>
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${st.cls}`}>{st.text}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                <span className="flex items-center gap-1 truncate">
                  <MapPin size={12} className="shrink-0 text-blue-600" /> {site?.district ?? '—'}
                </span>
                <span className="flex items-center justify-end gap-1 truncate">
                  <Calendar size={12} className="shrink-0 text-blue-600" /> {r.status === 'Approved' ? fmt(r.approvedAt) : fmt(r.targetDate)}
                </span>
              </div>
              {rejected > 0 && (
                <div className="mt-2 flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-[10.5px] font-bold text-red-700">
                  <AlertTriangle size={12} /> {rejected} photo(s) rejected — re-upload needed
                </div>
              )}
              <div className="mt-3 flex items-center justify-between px-1">
                {STAGES.map((s) => {
                  const ss = stageState(r, s.key)
                  return (
                    <span key={s.key} className="flex flex-col items-center">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${STEP_CLS[ss]}`}>{ss === 'Complete' ? <Check size={12} /> : s.n}</span>
                      <span className="mt-1 text-[8.5px] font-bold whitespace-nowrap text-slate-600">{s.short}</span>
                    </span>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-bold text-blue-600">
                <span>{r.locked ? 'View approved details' : 'Update status & photos'}</span>
                <ChevronRight size={15} />
              </div>
            </button>
          )
        })}
        {!mine.length && <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">No sites assigned to this franchise yet.</p>}
      </div>
    </div>
  )
}

function Alerts({ r }: { r: InstallRecord }) {
  if (r.locked)
    return (
      <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-900">
        <Lock size={14} className="mt-0.5 shrink-0" /> Final approval received on {fmt(r.approvedAt)}. Approved details are locked.
      </div>
    )
  if (r.status === 'Pending Admin Approval')
    return <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-[11px] text-violet-900">Verified by CRM and sent for Admin approval on {fmt(r.submittedAt)}. Updates are paused.</div>
  if (r.status === 'Rejected by Admin') return <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] text-red-800">Correction remarks: {r.adminRemarks}</div>
  if (r.status === 'Correction Requested') return <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] text-red-800">CRM requested corrections — open the stages marked “!” to see the remarks.</div>
  if (r.status === 'Submitted by Franchise') return <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-[11px] text-blue-900">Submitted on {fmt(r.franchiseSubmittedAt)} — CRM verification in progress.</div>
  return null
}

function SubmitBar({ r }: { r: InstallRecord }) {
  const [remark, setRemark] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  if (!isEditable(r) || r.status === 'Submitted by Franchise') return null
  const resub = r.status === 'Correction Requested' || r.status === 'Rejected by Admin' || r.status === 'Reopened'
  const submit = () => {
    const res = franchiseSubmit(r.id, remark)
    setMsg(res.ok ? { ok: true, text: 'Submitted to CRM for verification' } : { ok: false, text: res.error })
    if (res.ok) setRemark('')
  }
  return (
    <div className="space-y-2 rounded-2xl border border-blue-200 bg-white p-3">
      <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} placeholder="Remarks for CRM (optional)" className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs" />
      <button type="button" onClick={submit} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-xs font-black text-white hover:bg-blue-700">
        <Send size={14} /> {resub ? 'Resubmit corrections' : 'Submit for CRM verification'}
      </button>
      {msg && <p className={`text-[11px] font-semibold ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}
    </div>
  )
}

// ── stage view ───────────────────────────────────────────────────────────
function StageView({ r, stage, onBack }: { r: InstallRecord; stage: StageKey; onBack: () => void }) {
  const cfg = useChecklists()
  const meta = STAGES.find((s) => s.key === stage)!
  const editable = isEditable(r)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const target = useRef<{ stage: PhotoStage; itemKey: string; replacesId?: string } | null>(null)

  const gpsShot = (ps: PhotoStage, itemKey: string, replacesId?: string) => {
    const gps = mockGps()
    const res = addPhoto(r.id, { stage: ps, itemKey, name: `${wid('GPS')}_${itemKey}.jpg`, dataUrl: mockPhoto(itemLabel(ps, itemKey), gps), source: 'GPS Camera', gps, role: 'Franchise', replacesId })
    setErr(res.ok ? '' : res.error)
  }
  const pickGallery = (ps: PhotoStage, itemKey: string, replacesId?: string) => {
    target.current = { stage: ps, itemKey, replacesId }
    fileRef.current?.click()
  }
  const onFiles = async (files: FileList | null) => {
    const t = target.current
    if (!files?.length || !t) return
    for (const file of Array.from(files).slice(0, t.replacesId ? 1 : 10)) {
      const dataUrl = await readImage(file)
      const res = addPhoto(r.id, { stage: t.stage, itemKey: t.itemKey, name: file.name, dataUrl, source: 'Gallery', gps: mockGps(), role: 'Franchise', replacesId: t.replacesId })
      if (!res.ok) {
        setErr(res.error)
        break
      }
    }
    target.current = null
    if (fileRef.current) fileRef.current.value = ''
  }
  const setStatus = (s: 'readiness' | 'equipment' | 'documentation', key: string, next: Partial<Pick<ChecklistEntry, 'status' | 'value' | 'franchiseRemark'>>) => {
    const res = updateEntry(r.id, s, key, next, 'Franchise')
    setErr(res.ok ? '' : res.error)
  }

  const photoBlock = (ps: PhotoStage, itemKey: string) => (
    <Photos r={r} stage={ps} itemKey={itemKey} editable={editable} onGps={(rep) => gpsShot(ps, itemKey, rep)} onGallery={(rep) => pickGallery(ps, itemKey, rep)} />
  )

  return (
    <div className="space-y-3 px-3 pt-3 pb-6">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-xs font-bold text-blue-700">
        <ArrowLeft size={14} /> {r.siteId}
      </button>
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white">
        <div className="text-[10px] font-semibold text-white/70">Stage {meta.n} of 6</div>
        <div className="text-sm font-black">{meta.label}</div>
      </div>
      {!editable && (
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-2.5 text-[11px] text-slate-600">
          <Lock size={12} /> {r.locked ? 'Approved — read only' : 'With Admin for approval — read only'}
        </div>
      )}
      {err && <div className="rounded-xl bg-red-50 p-2.5 text-[11px] font-semibold text-red-700">{err}</div>}
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void onFiles(e.target.files)} />

      {stage === 'info' && <InfoCard r={r} />}

      {(stage === 'readiness' || stage === 'equipment') &&
        cfg[stage]
          .filter((i) => i.active)
          .map((it) => {
            const e = r[stage][it.key] ?? { status: 'Pending', crmReview: 'Not Reviewed' as const }
            return (
              <div key={it.key} className={`rounded-2xl border bg-white p-3 ${e.crmReview === 'Correction Requested' ? 'border-red-300' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-800">{it.label}</span>
                  <ReviewChip e={e} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10.5px] font-semibold text-slate-500">Status:</span>
                  {editable ? (
                    <select value={e.status} onChange={(ev) => setStatus(stage, it.key, { status: ev.target.value })} className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold">
                      {[...new Set([...it.statuses, ...(it.key === 'vsat_company' ? [] : ['Pending'])])].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-bold text-slate-800">{e.status}</span>
                  )}
                </div>
                {it.key === 'vsat_company' && e.status === 'Company name' && (
                  <input key={e.value ?? ''} defaultValue={e.value ?? ''} disabled={!editable} placeholder="Router / V-SAT company" onBlur={(ev) => ev.target.value !== (e.value ?? '') && setStatus(stage, it.key, { value: ev.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
                )}
                {e.crmRemark && e.crmReview === 'Correction Requested' && <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-[10.5px] font-semibold text-red-700">CRM: {e.crmRemark}</p>}
                {it.photos !== 'None' && <div className="mt-2">{photoBlock(stage, it.key)}</div>}
                {editable && (
                  <input key={e.franchiseRemark ?? ''} defaultValue={e.franchiseRemark ?? ''} placeholder="Your remark (optional)" onBlur={(ev) => ev.target.value !== (e.franchiseRemark ?? '') && setStatus(stage, it.key, { franchiseRemark: ev.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px]" />
                )}
              </div>
            )
          })}

      {stage === 'activation' && (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 text-xs">
          {(['techLive', 'cashLive'] as const).map((k) => (
            <div key={k} className="grid grid-cols-2 gap-2">
              <label>
                <span className="block text-[10.5px] font-semibold text-slate-500">{k === 'techLive' ? 'Tech Live' : 'Cash Live'}</span>
                <select disabled={!editable} value={r.activation[k]} onChange={(e) => { const v = e.target.value as 'Pending' | 'Live'; updateActivation(r.id, k === 'techLive' ? { techLive: v } : { cashLive: v }, 'Franchise') }} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 font-bold">
                  <option value="Pending">Pending</option>
                  <option value="Live">Live</option>
                </select>
              </label>
              <label>
                <span className="block text-[10.5px] font-semibold text-slate-500">Date</span>
                <input disabled={!editable} type="date" value={r.activation[k === 'techLive' ? 'techLiveDate' : 'cashLiveDate']} onChange={(e) => updateActivation(r.id, k === 'techLive' ? { techLiveDate: e.target.value } : { cashLiveDate: e.target.value }, 'Franchise')} className="w-full rounded-lg border border-slate-200 px-2 py-1.5" />
              </label>
            </div>
          ))}
          <div className="text-[10.5px] text-slate-500">Projection completion date: <span className="font-bold text-slate-800">{fmt(r.activation.projectionDate)}</span></div>
          {r.activation.crmReview === 'Correction Requested' && r.activation.crmRemark && <p className="rounded-lg bg-red-50 px-2 py-1.5 text-[10.5px] font-semibold text-red-700">CRM: {r.activation.crmRemark}</p>}
          <div className="pt-1 text-[10.5px] font-black text-slate-700">Activation proof</div>
          {photoBlock('activation', 'proof')}
        </div>
      )}

      {stage === 'documentation' &&
        DOC_FIELDS.map((d) => {
          const e = r.documentation[d.key] ?? { status: 'Pending', crmReview: 'Not Reviewed' as const }
          const frEditable = editable && e.status !== 'Complete'
          return (
            <div key={d.key} className={`rounded-2xl border bg-white p-3 ${e.crmReview === 'Correction Requested' ? 'border-red-300' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-800">{d.label}</span>
                <ReviewChip e={e} />
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-xs">
                <span className="text-[10.5px] font-semibold text-slate-500">Status:</span>
                {frEditable ? (
                  <select value={e.status} onChange={(ev) => setStatus('documentation', d.key, { status: ev.target.value })} className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 font-bold">
                    {['Pending', 'Submitted', 'N/A'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-bold text-slate-800">
                    {e.status}
                    {e.value ? ` · ${e.value}` : ''}
                  </span>
                )}
              </div>
              {e.crmRemark && e.crmReview === 'Correction Requested' && <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-[10.5px] font-semibold text-red-700">CRM: {e.crmRemark}</p>}
              <div className="mt-2">{photoBlock('documentation', d.key)}</div>
            </div>
          )
        })}

      {stage === 'final' && <FinalCard r={r} />}

      {stage !== 'final' && stage !== 'info' && <SubmitBar r={r} />}
    </div>
  )
}

function InfoCard({ r }: { r: InstallRecord }) {
  const { sites } = useSites()
  const frs = useFranchises()
  const site = sites.find((s) => s.siteId === r.siteId)
  const fr = frs.find((f) => f.id === r.frId)
  const rows: [string, string][] = [
    ['Site / LOI Number', r.siteId],
    ['Franchise', fr?.name ?? r.frId],
    ['Site address', site ? `${site.address}, ${site.district}, ${site.state} – ${site.pin}` : '—'],
    ['Model', site?.siteType ?? '—'],
    ['Project Executive', r.executive],
    ['CRM Executive', r.crmExecutive],
    ['Target date', fmt(r.targetDate)],
  ]
  return (
    <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-white p-3 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3">
          <span className="text-slate-500">{k}</span>
          <span className="text-right font-bold text-slate-800">{v}</span>
        </div>
      ))}
    </div>
  )
}

function FinalCard({ r }: { r: InstallRecord }) {
  const comp = installCompletion(r)
  const rows: [string, string][] = [
    ['Overall status', comp.pct === 100 ? 'Complete' : `Incomplete (${comp.pct}%)`],
    ['Submission', r.franchiseSubmittedAt ? `Submitted ${fmt(r.franchiseSubmittedAt)}` : 'Not submitted'],
    ['CRM verification', r.submittedAt ? `Verified by ${r.submittedBy} · ${fmt(r.submittedAt)}` : 'Pending'],
    ['Admin approval', r.approval],
    ['Approved by', r.approvedBy ?? '—'],
    ['Approval date', fmt(r.approvedAt)],
  ]
  return (
    <div className="space-y-3">
      <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-white p-3 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <span className="text-slate-500">{k}</span>
            <span className="text-right font-bold text-slate-800">{v}</span>
          </div>
        ))}
      </div>
      {r.approval === 'Approved' && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-600 p-3 text-xs font-black text-white">
          <CheckCircle2 size={16} /> Final approval received — site approved
        </div>
      )}
      {r.status === 'Rejected by Admin' && <div className="rounded-2xl bg-red-50 p-3 text-[11px] font-semibold text-red-700">Correction remarks: {r.adminRemarks}</div>}
      <SubmitBar r={r} />
    </div>
  )
}

function ReviewChip({ e }: { e: { crmReview: string } }) {
  const cls = e.crmReview === 'Verified' ? 'bg-emerald-100 text-emerald-700' : e.crmReview === 'Correction Requested' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-black ${cls}`}>{e.crmReview === 'Not Reviewed' ? 'Awaiting CRM' : e.crmReview}</span>
}

function Photos({ r, stage, itemKey, editable, onGps, onGallery }: { r: InstallRecord; stage: PhotoStage; itemKey: string; editable: boolean; onGps: (replacesId?: string) => void; onGallery: (replacesId?: string) => void }) {
  const photos = activePhotos(r, stage, itemKey)
  const badge = (p: InstallPhoto) => (p.review === 'Accepted' ? 'bg-emerald-500' : p.review === 'Rejected' ? 'bg-red-500' : 'bg-amber-400')
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {photos.map((p) => (
          <div key={p.id} className="relative">
            <img src={p.dataUrl} alt={p.name} className={`h-14 w-16 rounded-lg border object-cover ${p.review === 'Rejected' ? 'border-red-400 opacity-70' : 'border-slate-200'}`} />
            <span className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${badge(p)}`} title={p.review} />
          </div>
        ))}
        {!photos.length && <span className="text-[10.5px] text-slate-400">No photos yet</span>}
      </div>
      {photos
        .filter((p) => p.review === 'Rejected')
        .map((p) => (
          <div key={p.id} className="mt-1.5 rounded-lg bg-red-50 px-2 py-1.5 text-[10.5px] text-red-700">
            <span className="font-bold">Rejected:</span> {p.rejectReason}
            {editable && (
              <span className="mt-1 flex gap-2">
                <button type="button" onClick={() => onGps(p.id)} className="flex items-center gap-1 font-black text-red-800 underline">
                  <RefreshCw size={11} /> Replace (GPS camera)
                </button>
                <button type="button" onClick={() => onGallery(p.id)} className="flex items-center gap-1 font-black text-red-800 underline">
                  <ImageIcon size={11} /> Gallery
                </button>
              </span>
            )}
          </div>
        ))}
      {editable && (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button type="button" onClick={() => onGps()} className="flex items-center justify-center gap-1 rounded-lg bg-blue-600 py-1.5 text-[10.5px] font-black text-white">
            <Camera size={12} /> GPS Camera
          </button>
          <button type="button" onClick={() => onGallery()} className="flex items-center justify-center gap-1 rounded-lg border border-blue-300 bg-blue-50 py-1.5 text-[10.5px] font-black text-blue-700">
            <Upload size={12} /> Gallery (multiple)
          </button>
        </div>
      )}
    </div>
  )
}
