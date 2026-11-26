import { useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, KeyRound, Lock, Send, Upload } from 'lucide-react'
import { useSites } from '@/data/network'
import {
  AUDIT_REASONS, COUNTER_SLIP_RULE, EOD_CATEGORIES, acknowledgeCashAsync, addEventAsync, createEodRequestAsync, generateOtcAsync, markDispenserEodAsync, resubmitEodAsync, categoryRequired, checkCounterSlip, completeness, crmEodSites, dispenserEodSites, emptyEvent,
  eodFundingOf, frUser, ledgerOf, useEod, validateEodRequest, validateEvent,
  type EodRecord, type EodRequestInput, type EodType, type EventInput,
} from '@/data/eodStore'
import { buildMonthly, monthLabel, useMonthlyMeta, type MonthlyRow } from '@/pages/operations/eod2/monthly'
import { nextActionOf } from '@/pages/operations/eod2/flow'
import { dmy, dt, inr, signedInr, todayIso, useMobileFr } from '@/pages/operations/eod2/fmt'
import { AckBox } from '@/pages/operations/eod2/ui'
import { MobileFranchiseBar } from '../components/MobileFranchiseBar'

interface MobileEodScreenProps {
  onBackToMore?: () => void
}

type Tab = 'mine' | 'new' | 'ncr' | 'monthly'
const input = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#1453CA]'
const stageTone = (s: string) => (s === 'Approved' ? 'bg-emerald-50 text-emerald-700' : s === 'Rejected' || s === 'Exception Review' ? 'bg-red-50 text-red-700' : s === 'Returned for Correction' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700')

function F({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold text-slate-600">{label}</span>
      {children}
      {error && <span className="mt-0.5 block text-[10.5px] font-semibold text-red-600">{error}</span>}
    </label>
  )
}
function Msg({ tone, children }: { tone: 'ok' | 'err' | 'info'; children: ReactNode }) {
  const c = tone === 'ok' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : tone === 'err' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-blue-50 text-blue-800 border-blue-200'
  return <div className={`rounded-lg border px-3 py-2 text-[11.5px] font-semibold ${c}`}>{children}</div>
}

/** Franchise EOD (spec §5): CRM Routine / Cash Audit requests, NCR & Perto "EOD done" marks, Monthly EOD status. */
export function MobileEodScreen({ onBackToMore }: MobileEodScreenProps) {
  const frId = useMobileFr()
  const [tab, setTab] = useState<Tab>('mine')
  const [flash, setFlash] = useState('')
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
            <h1 className="text-base font-black">End of Day (EOD)</h1>
            <p className="mt-0.5 text-[11px] text-blue-100">CRM: Routine / Cash Audit with docket & OTC · NCR & Perto: mark EOD done</p>
          </div>
          <CalendarDays size={24} className="shrink-0 text-amber-300" />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-white/10 p-1">
          {(
            [
              ['mine', 'My EODs'],
              ['new', 'New CRM EOD'],
              ['ncr', 'NCR / Perto'],
              ['monthly', 'Monthly'],
            ] as [Tab, string][]
          ).map(([id, l]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-lg py-1.5 text-[10.5px] font-bold ${tab === id ? 'bg-white text-[#0B2A6B]' : 'text-white/90'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <MobileFranchiseBar />
      {flash && <Msg tone="ok">{flash}</Msg>}
      {tab === 'mine' && <MyEods frId={frId} />}
      {tab === 'new' && <NewEod key={frId} frId={frId} onDone={(m) => { setFlash(m); setTab('mine') }} />}
      {tab === 'ncr' && <NcrMarks frId={frId} />}
      {tab === 'monthly' && <MonthlyStatus frId={frId} />}
    </div>
  )
}

function MyEods({ frId }: { frId: string }) {
  const { records } = useEod()
  const mine = records.filter((r) => r.frId === frId)
  const [open, setOpen] = useState<string | null>(null)
  if (!mine.length) return <Msg tone="info">No CRM EOD requests yet for this franchise. Use “New CRM EOD”.</Msg>
  return (
    <div className="space-y-2">
      {mine.map((r) => (
        <div key={r.id} className="rounded-xl border border-slate-200 bg-white shadow-xs">
          <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="flex w-full items-start gap-2 p-3 text-left">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-black text-slate-900">{r.id}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${stageTone(r.stage)}`}>{r.stage}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                {r.type} · {r.atmId} · {dmy(r.eodDate)} · {r.funding}
              </div>
              <div className="mt-0.5 text-[11px] font-semibold text-[#1453CA]">{nextActionOf(r)}</div>
            </div>
            {open === r.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>
          {open === r.id && <EodCard r={r} />}
        </div>
      ))}
    </div>
  )
}

function EodCard({ r }: { r: EodRecord }) {
  const by = frUser(r.frId)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [otc, setOtc] = useState({ name: '', designation: '', mobile: '', purpose: 'Vault opening for EOD' })
  const [ev, setEv] = useState<EventInput>(() => emptyEvent(r.eodDate))
  const [evErr, setEvErr] = useState<Record<string, string>>({})
  const [cash, setCash] = useState('')
  const [lang, setLang] = useState<'Hindi' | 'English'>('Hindi')
  const [ack, setAck] = useState(false)
  const [re, setRe] = useState({ file: '', slipNo: r.counterSlip.slipNo, amount: String(r.counterSlip.amount) })
  const [reRaw, setReRaw] = useState<File | null>(null)
  const [evFiles, setEvFiles] = useState<File[]>([])
  const done = (e: string | null | undefined, ok: string) => setMsg(e ? { tone: 'err', text: e } : { tone: 'ok', text: ok })
  const miss = completeness(r)
  return (
    <div className="space-y-3 border-t border-slate-100 p-3 text-[11.5px]">
      <div className="grid grid-cols-2 gap-2">
        <Info k="Counter slip" v={`${inr(r.counterSlip.amount)} · ${r.counterSlip.slipNo}`} />
        <Info k="₹40,000 rule" v={r.rule.passed ? 'Passed' : `Failed${r.rule.decision ? ` · ${r.rule.decision}` : ' · under review'}`} />
        <Info k="Category" v={r.category ?? '—'} />
        <Info k="Docket" v={r.docket?.no ?? '—'} />
        <Info k="OTC" v={r.otc ? `${r.otc.code} (view only)` : '—'} />
        <Info k="History" v={r.historyRef ? r.historyRef.ledger : ledgerOf(r.funding)} />
      </div>
      {r.trail.returnReason && <Msg tone="err">{r.stage === 'Rejected' ? 'Rejected' : 'Returned'}: {r.trail.returnReason}</Msg>}

      {r.stage === 'Returned for Correction' && (
        <div className="space-y-2 rounded-lg bg-amber-50/60 p-2.5">
          <div className="text-[11px] font-bold text-amber-800">Re-submit counter slip</div>
          <input type="file" accept="image/*,.pdf" onChange={(e) => { setRe((p) => ({ ...p, file: e.target.files?.[0]?.name ?? '' })); setReRaw(e.target.files?.[0] ?? null) }} className="text-[11px]" />
          <div className="grid grid-cols-2 gap-2">
            <F label="Slip no.">
              <input className={input} value={re.slipNo} onChange={(e) => setRe((p) => ({ ...p, slipNo: e.target.value }))} />
            </F>
            <F label="Slip amount ₹">
              <input className={input} type="number" value={re.amount} onChange={(e) => setRe((p) => ({ ...p, amount: e.target.value }))} />
            </F>
          </div>
          <AckBox lang={lang} onLang={setLang} checked={ack} onChecked={setAck} />
          <button type="button" className="h-9 w-full rounded-lg bg-[#1453CA] text-xs font-bold text-white" onClick={() => (re.file ? void resubmitEodAsync(r.id, { file: { name: re.file, size: reRaw?.size ?? 200_000 }, slipNo: re.slipNo, slipAmount: Number(re.amount), ackLang: lang, ackChecked: ack }, reRaw).then((e) => done(e, 'Re-submitted for verification')) : done('Attach the corrected counter slip', ''))}>
            Re-submit
          </button>
        </div>
      )}

      {r.stage === 'Docket Generated' && (
        <div className="space-y-2 rounded-lg bg-blue-50/60 p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-900">
            <KeyRound size={13} /> OTC generation link — docket {r.docket?.no}
          </div>
          <p className="text-[10.5px] text-slate-500">Authorized user only. The OTC is generated once, linked to this EOD and shown view-only.</p>
          <F label="Authorized user name">
            <input className={input} value={otc.name} onChange={(e) => setOtc((p) => ({ ...p, name: e.target.value }))} />
          </F>
          <div className="grid grid-cols-2 gap-2">
            <F label="Designation">
              <input className={input} value={otc.designation} onChange={(e) => setOtc((p) => ({ ...p, designation: e.target.value }))} />
            </F>
            <F label="Mobile (10 digits)">
              <input className={input} inputMode="numeric" maxLength={10} value={otc.mobile} onChange={(e) => setOtc((p) => ({ ...p, mobile: e.target.value.replace(/\D/g, '') }))} />
            </F>
          </div>
          <button type="button" className="h-9 w-full rounded-lg bg-[#1453CA] text-xs font-bold text-white" onClick={() => void generateOtcAsync(r.otcLinkToken ?? '', otc).then((res) => done(res.error, `OTC ${res.code} generated and linked to ${r.id}`))}>
            Generate OTC
          </button>
        </div>
      )}

      {r.otc && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5">
          <Lock size={14} className="text-[#1453CA]" />
          <span className="font-mono text-sm font-black text-[#0B2A6B]">{r.otc.code}</span>
          <span className="text-[10.5px] text-slate-500">
            by {r.otc.generatedBy} · {dt(r.otc.generatedAt)}
          </span>
        </div>
      )}

      {r.events.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-slate-700">Vault / bolt openings ({r.events.length})</div>
          {r.events.map((e) => (
            <div key={e.id} className="rounded-lg border border-slate-100 p-2">
              <div className="font-bold text-slate-800">
                #{e.seq} · opened {e.boltOpenedAt}
                {e.boltClosedAt ? ` – ${e.boltClosedAt}` : ''} · {dmy(e.at.slice(0, 10))}
              </div>
              <div className="text-slate-500">
                Actual {inr(e.actualCash)} vs {inr(e.expectedCash)} → <b className={e.difference < 0 ? 'text-red-600' : e.difference > 0 ? 'text-amber-700' : 'text-emerald-700'}>{signedInr(e.difference)} {e.diffType}</b> · {e.verifiedBy ? `verified by ${e.verifiedBy}` : 'verification pending'}
              </div>
            </div>
          ))}
        </div>
      )}

      {(r.stage === 'OTC Generated' || (r.stage === 'Vault Opened' && r.type === 'Cash Audit')) && (
        <div className="space-y-2 rounded-lg bg-slate-50 p-2.5">
          <div className="text-[11px] font-bold text-slate-700">Record vault / bolt opening #{r.events.length + 1}</div>
          <div className="grid grid-cols-2 gap-2">
            <F label="Opening time *" error={evErr.boltOpenedAt}>
              <input type="time" className={input} value={ev.boltOpenedAt} onChange={(e) => setEv((p) => ({ ...p, boltOpenedAt: e.target.value }))} />
            </F>
            <F label="Closing time">
              <input type="time" className={input} value={ev.boltClosedAt} onChange={(e) => setEv((p) => ({ ...p, boltClosedAt: e.target.value }))} />
            </F>
            <F label="Authorized by *" error={evErr.authorizedBy}>
              <input className={input} value={ev.authorizedBy} onChange={(e) => setEv((p) => ({ ...p, authorizedBy: e.target.value }))} />
            </F>
            <F label="Counted by *" error={evErr.countedBy}>
              <input className={input} value={ev.countedBy} onChange={(e) => setEv((p) => ({ ...p, countedBy: e.target.value }))} />
            </F>
            <F label="Expected ₹ *" error={evErr.expectedCash}>
              <input type="number" className={input} value={ev.expectedCash} onChange={(e) => setEv((p) => ({ ...p, expectedCash: e.target.value }))} />
            </F>
            <F label="Actual found ₹ *" error={evErr.actualCash}>
              <input type="number" className={input} value={ev.actualCash} onChange={(e) => setEv((p) => ({ ...p, actualCash: e.target.value }))} />
            </F>
          </div>
          <F label="Photo / document *" error={evErr.docs}>
            <input type="file" accept="image/*,.pdf" className="text-[11px]" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setEv((p) => ({ ...p, docs: [...p.docs, f.name] })); setEvFiles((xs) => [...xs, f]) } }} />
          </F>
          {ev.docs.length > 0 && <div className="text-[10.5px] text-slate-500">{ev.docs.join(', ')}</div>}
          <button
            type="button"
            className="h-9 w-full rounded-lg bg-[#1453CA] text-xs font-bold text-white"
            onClick={() => {
              const v = validateEvent(ev)
              setEvErr(v)
              if (Object.keys(v).length) return
              const n = r.events.length + 1
              void addEventAsync(r.id, ev, by, evFiles).then((e) => {
                done(e, `Opening #${n} saved as a separate event`)
                if (!e) {
                  setEv(emptyEvent(r.eodDate))
                  setEvFiles([])
                }
              })
            }}
          >
            Save opening
          </button>
        </div>
      )}

      {r.stage === 'Vault Opened' && (
        <div className="space-y-2 rounded-lg bg-emerald-50/50 p-2.5">
          <div className="text-[11px] font-bold text-emerald-900">Cash {r.funding === 'Full Funding' ? 'replacement' : 'loading'} acknowledgement</div>
          {miss.length > 0 && <Msg tone="err">Waiting for: {miss.join(', ')}</Msg>}
          <F label={`${r.funding === 'Full Funding' ? 'Replaced' : 'Loaded'} amount ₹`}>
            <input type="number" className={input} value={cash} onChange={(e) => setCash(e.target.value)} />
          </F>
          <AckBox lang={lang} onLang={setLang} checked={ack} onChecked={setAck} />
          <button type="button" disabled={miss.length > 0} className="h-9 w-full rounded-lg bg-emerald-600 text-xs font-bold text-white disabled:opacity-50" onClick={() => void acknowledgeCashAsync(r.id, { amount: Number(cash), remarks: '', ackLang: lang, ackChecked: ack }, by).then((e) => done(e, `Acknowledged — ${ledgerOf(r.funding)} updated`))}>
            Submit acknowledgement
          </button>
        </div>
      )}
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
    </div>
  )
}

function Info({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
      <div className="text-[9.5px] font-bold tracking-wide text-slate-400 uppercase">{k}</div>
      <div className="truncate font-bold text-slate-800">{v}</div>
    </div>
  )
}

function NewEod({ frId, onDone }: { frId: string; onDone: (m: string) => void }) {
  const { sites } = useSites()
  const mySites = useMemo(() => crmEodSites(sites).filter((s) => s.frId === frId), [sites, frId])
  const [type, setType] = useState<EodType>('Routine')
  const [f, setF] = useState({ siteId: mySites[0]?.siteId ?? '', eodDate: todayIso(), category: '', auditReason: '', auditReasonOther: '', slipNo: '', slipDate: todayIso(), slipAmount: '', declaredCash: '' })
  const [file, setFile] = useState<{ name: string; size: number } | null>(null)
  const [rawSlip, setRawSlip] = useState<File | null>(null)
  const [lang, setLang] = useState<'Hindi' | 'English'>('Hindi')
  const [ack, setAck] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [popup, setPopup] = useState(false)
  const site = mySites.find((s) => s.siteId === f.siteId)
  const req: EodRequestInput = { ...f, type, category: f.category as EodRequestInput['category'], file, ackLang: lang, ackChecked: ack }
  const rule = checkCounterSlip(Number(f.slipAmount))
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }))
  if (!mySites.length) return <Msg tone="info">This franchise has no CRM machine on a CBR / Cash Loading site. NCR / Perto sites use the “NCR / Perto” tab.</Msg>
  const review = () => {
    const e = validateEodRequest(req, 'Mobile App')
    setErrors(e)
    if (!Object.keys(e).length) setPopup(true)
  }
  const submit = () => {
    setPopup(false)
    void createEodRequestAsync(req, 'Mobile App', rawSlip).then(({ rec, error }) => {
      if (!rec) return alert(error ?? 'Could not submit the EOD')
      onDone(rec.stage === 'Exception Review' ? `${rec.id} submitted — counter-slip rule not met, sent to Operations exception review` : `${rec.id} submitted — Operations will verify your counter slip`)
    })
  }
  const errCount = Object.keys(errors).length
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
        {(['Routine', 'Cash Audit'] as EodType[]).map((t) => (
          <button key={t} type="button" onClick={() => setType(t)} className={`rounded-md py-1.5 text-[11px] font-bold ${type === t ? 'bg-white text-[#0B2A6B] shadow-xs' : 'text-slate-500'}`}>
            {t} EOD
          </button>
        ))}
      </div>
      {errCount > 0 && <Msg tone="err">Please complete {errCount} required field(s).</Msg>}
      <F label="CRM ATM *" error={errors.siteId}>
        <select className={input} value={f.siteId} onChange={(e) => set('siteId')(e.target.value)}>
          {mySites.map((s) => (
            <option key={s.siteId} value={s.siteId}>
              {s.atmId} · {eodFundingOf(s)}
            </option>
          ))}
        </select>
      </F>
      <div className="grid grid-cols-2 gap-2">
        <F label="EOD date *" error={errors.eodDate}>
          <input type="date" max={todayIso()} className={input} value={f.eodDate} onChange={(e) => set('eodDate')(e.target.value)} />
        </F>
        <F label={`EOD category${site && categoryRequired(site) ? ' *' : ''}`} error={errors.category}>
          <select className={input} value={f.category} onChange={(e) => set('category')(e.target.value)}>
            <option value="">{site && categoryRequired(site) ? 'Select' : 'Optional (SF)'}</option>
            {EOD_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </F>
      </div>
      {type === 'Cash Audit' && (
        <>
          <F label="Why the cash audit? *" error={errors.auditReason}>
            <select className={input} value={f.auditReason} onChange={(e) => set('auditReason')(e.target.value)}>
              <option value="">Select</option>
              {AUDIT_REASONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </F>
          {f.auditReason.startsWith('Other') && (
            <F label="Describe *" error={errors.auditReasonOther}>
              <input className={input} value={f.auditReasonOther} onChange={(e) => set('auditReasonOther')(e.target.value)} />
            </F>
          )}
        </>
      )}
      <F label="Counter slip photo *" error={errors.file}>
        <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#1453CA]/40 bg-blue-50/40 px-3 text-[11px] font-bold text-[#1453CA]">
          <Upload size={14} /> {file ? file.name : 'Upload counter slip'}
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const x = e.target.files?.[0]; if (x) { setFile({ name: x.name, size: x.size }); setRawSlip(x) } }} />
        </label>
      </F>
      <div className="grid grid-cols-2 gap-2">
        <F label="Slip no. *" error={errors.slipNo}>
          <input className={input} value={f.slipNo} onChange={(e) => set('slipNo')(e.target.value)} />
        </F>
        <F label="Slip date *" error={errors.slipDate}>
          <input type="date" className={input} value={f.slipDate} onChange={(e) => set('slipDate')(e.target.value)} />
        </F>
        <F label="Amount on slip ₹ *" error={errors.slipAmount}>
          <input type="number" className={input} value={f.slipAmount} onChange={(e) => set('slipAmount')(e.target.value)} />
        </F>
        <F label="Declared cash ₹ *" error={errors.declaredCash}>
          <input type="number" className={input} value={f.declaredCash} onChange={(e) => set('declaredCash')(e.target.value)} />
        </F>
      </div>
      <AckBox lang={lang} onLang={setLang} checked={ack} onChecked={setAck} error={errors.ack} />
      <button type="button" onClick={review} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#1453CA] text-xs font-black text-white">
        <Send size={14} /> Submit EOD request
      </button>

      {popup && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl">
            <div className="flex items-center gap-2">
              {rule.passed ? <CheckCircle2 className="text-emerald-600" /> : <AlertTriangle className="text-amber-600" />}
              <h3 className="text-sm font-black text-slate-900">₹40,000 counter-slip rule</h3>
            </div>
            <p className="mt-2 text-xs text-slate-700">{rule.message}</p>
            <p className="mt-1 text-[10.5px] text-slate-400">{COUNTER_SLIP_RULE.pendingNote}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setPopup(false)} className="h-9 rounded-lg border border-slate-200 text-xs font-bold text-slate-700">
                Edit
              </button>
              <button type="button" onClick={submit} className={`h-9 rounded-lg text-xs font-bold text-white ${rule.passed ? 'bg-[#1453CA]' : 'bg-amber-600'}`}>
                {rule.passed ? 'Confirm & submit' : 'Submit for review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NcrMarks({ frId }: { frId: string }) {
  const { sites } = useSites()
  const { history } = useEod()
  const mine = useMemo(() => dispenserEodSites(sites).filter((s) => s.frId === frId), [sites, frId])
  const [date, setDate] = useState(todayIso())
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  if (!mine.length) return <Msg tone="info">No NCR / Perto machines mapped to this franchise.</Msg>
  return (
    <div className="space-y-2">
      <Msg tone="info">NCR & Perto machines need no docket or CRM request. Do the EOD on the machine, then mark it here — it is recorded on the CBR / Cash Loading history.</Msg>
      <F label="EOD date">
        <input type="date" max={todayIso()} className={input} value={date} onChange={(e) => setDate(e.target.value)} />
      </F>
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
      {mine.map((s) => {
        const mark = history.find((h) => h.refId === `${s.atmId}|${date}`)
        const f = eodFundingOf(s)!
        return (
          <div key={s.siteId} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-slate-900">
                {s.atmId} <span className="font-bold text-slate-400">· {s.machineType}</span>
              </div>
              <div className="text-[10.5px] text-slate-500">
                {f} → {ledgerOf(f)}
              </div>
            </div>
            {mark ? (
              <span className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10.5px] font-bold text-emerald-700">
                <CheckCircle2 size={12} /> Done
              </span>
            ) : (
              <button type="button" className="h-8 rounded-lg bg-[#1453CA] px-3 text-[11px] font-bold text-white" onClick={() => void markDispenserEodAsync(s.siteId, date, frUser(frId)).then((e) => setMsg(e ? { tone: 'err', text: e } : { tone: 'ok', text: `EOD marked done for ${s.atmId} on ${dmy(date)}` }))}>
                Mark EOD done
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MonthlyStatus({ frId }: { frId: string }) {
  const { sites } = useSites()
  const meta = useMonthlyMeta()
  const [month, setMonth] = useState('2026-10')
  const rows = useMemo(() => crmEodSites(sites).filter((s) => s.frId === frId).map((s) => buildMonthly(s, month, meta)).filter((r): r is MonthlyRow => !!r), [sites, frId, month, meta])
  return (
    <div className="space-y-2">
      <F label="Month">
        <select className={input} value={month} onChange={(e) => setMonth(e.target.value)}>
          {['2026-09', '2026-10', '2026-11'].map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </F>
      {!rows.length && <Msg tone="info">No CRM sites — Monthly EOD applies to CRM machines only.</Msg>}
      {rows.map((r) => (
        <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900">{r.atmId}</span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${r.status === 'Mismatch' ? 'bg-red-50 text-red-700' : r.status === 'Approved' || r.status === 'Matched' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{r.status}</span>
          </div>
          <div className="mt-1 text-[10.5px] text-slate-500">
            {r.funding} · source {r.source} · {r.mismatchDays} mismatch day(s)
          </div>
          <div className="mt-1 text-[11px] text-slate-700">
            Closing: source {inr(r.totals.source.closing)} / EOD {inr(r.totals.eod.closing)}
          </div>
        </div>
      ))}
      <p className="text-[10.5px] text-slate-400">View only — reconciliation is done by CRM / Finance.</p>
    </div>
  )
}
