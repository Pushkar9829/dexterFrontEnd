// ALF request (Operations §4.1) — Self Funding sites (ALF is linked to the Cash Loading Master).
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, HandCoins, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { useRole } from '@/lib/rbac'
import { useSites } from '@/data/network'
import { apiEnabled } from '@/data/opsApi'
import { isFranchiseeSession } from '@/data/cbrApi'
import { canCreateRole, checkSiteFor } from '@/data/cbr'
import { Crumbs, FundingChip } from '@/pages/cbr/CashRecordUi'
import { ALF_PURPOSES, alfLoader, alfStore, saveAlf, useAlf } from './alfData'

const today = () => new Date().toISOString().slice(0, 10)

function AlfFormInner({ editId }: { editId?: string }) {
  const navigate = useNavigate()
  const role = useRole()
  const sites = useSites()
  const existing = editId ? alfStore.get().find((x) => x.id === editId) : undefined
  const [atmId, setAtmId] = useState(existing?.atmId ?? '')
  const [requestDate, setRequestDate] = useState(existing?.requestDate ?? today())
  const [amount, setAmount] = useState(existing ? String(existing.requestedAmount) : '')
  const [purpose, setPurpose] = useState(existing?.purpose ?? '')
  const [remarks, setRemarks] = useState(existing?.remarks ?? '')
  // API mode, staff: raising on behalf of a franchise needs the franchise / site + a mandatory reason
  const onBehalf = apiEnabled && !isFranchiseeSession()
  const [frId, setFrId] = useState(existing?.frId ?? '')
  const [onBehalfReason, setOnBehalfReason] = useState(existing?.onBehalfReason ?? '')
  const check = useMemo(() => (atmId.trim() ? checkSiteFor('Cash Loading', atmId) : null), [atmId])
  const sfSites = useMemo(() => sites.sites.filter((s) => s.siteType === 'SF'), [sites])
  const franchiseOptions = useMemo(() => [...new Set(sfSites.map((s) => s.frId))].sort(), [sfSites])
  const allowed = useMemo(() => sfSites.filter((s) => !onBehalf || !frId || s.frId === frId).slice(0, 60), [sfSites, onBehalf, frId])
  const snap = check?.snap

  if (!canCreateRole(role)) return <div className="rounded-xl border border-slate-200 bg-white p-6 text-[13px]">Your role ({role}) cannot raise ALF requests.</div>
  if (existing && existing.status !== 'Draft') return <div className="rounded-xl border border-slate-200 bg-white p-6 text-[13px]">{existing.id} is {existing.status} and can no longer be edited.</div>

  const save = async (submit: boolean, asFranchise: boolean) => {
    if (onBehalf && !existing && onBehalfReason.trim().length < 3) {
      toast('Give the reason for raising this ALF on behalf of the franchise (min 3 characters).', 'error')
      return
    }
    if (onBehalf && frId && snap && snap.frId !== frId) {
      toast(`ATM ${atmId} belongs to ${snap.frId}, not ${frId}.`, 'error')
      return
    }
    const res = await saveAlf({ atmId, requestDate, requestedAmount: Number(amount) || 0, purpose, remarks, ...(onBehalf ? { frId: frId || undefined, onBehalfReason } : {}) }, { id: editId, submit, asFranchise })
    if (!res.ok) {
      toast(res.error, 'error')
      return
    }
    toast(submit ? `${res.id} submitted — CRM / Operations verification task created` : `Draft ${res.id} saved`, submit ? 'success' : 'info')
    navigate(`/operations/alf?record=${res.id}`)
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
          <h2 className="text-[14px] font-bold text-slate-900">Site / Franchise (from masters)</h2>
          <span className="ml-auto">
            <FundingChip kind="Cash Loading" />
          </span>
        </div>
        {onBehalf && (
          <div className="mb-3.5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField label="Franchise (raising on behalf)" value={frId} options={franchiseOptions} placeholder="Any franchise" onChange={(e) => { setFrId(e.target.value); setAtmId('') }} disabled={!!existing} />
            <TextAreaField
              className="sm:col-span-2 lg:col-span-3"
              label="Reason for raising on behalf"
              required
              value={onBehalfReason}
              onChange={(e) => setOnBehalfReason(e.target.value)}
              disabled={!!existing}
              placeholder="e.g. Franchise app unavailable; requested by phone"
            />
          </div>
        )}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <TextField label="ATM ID" required list="alf-atm-list" value={atmId} onChange={(e) => setAtmId(e.target.value)} placeholder="Search ATM ID / Site ID" disabled={!!existing} />
            <datalist id="alf-atm-list">
              {allowed.map((s) => (
                <option key={s.siteId} value={s.atmId}>
                  {s.siteId} · {s.location}
                </option>
              ))}
            </datalist>
          </div>
          <TextField label="Site ID" value={snap?.siteId ?? ''} disabled placeholder="Fetched from master" />
          <TextField label="Franchise" value={snap ? `${snap.franchiseName} · ${snap.frId}` : ''} disabled placeholder="Fetched from master" />
          <TextField label="ATM Location" value={snap?.atmLocation ?? ''} disabled placeholder="Fetched from master" />
        </div>
        {check && !check.ok && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            {check.error} ALF is linked to the Self Funding Cash Loading Register.
          </div>
        )}
        {check?.ok && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
            <CheckCircle2 size={15} /> Self Funding site — ALF request allowed.
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 border-b border-slate-100 pb-2 text-[14px] font-bold text-slate-900">Request</h2>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <TextField label="ALF Request ID" value={existing?.id ?? 'Auto-generated on save'} disabled />
          <TextField label="Request Date" required type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
          <TextField label="Requested Amount (₹)" required type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <SelectField label="Purpose / Reason" required value={purpose} options={ALF_PURPOSES} onChange={(e) => setPurpose(e.target.value)} />
          <TextAreaField className="sm:col-span-2" label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate('/operations/alf')}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={() => void save(false, false)}>
          Save Draft
        </Button>
        <Button variant={onBehalf ? 'primary' : 'secondary'} icon={<Send size={14} />} onClick={() => void save(true, false)}>
          {onBehalf ? 'Submit on behalf of franchise' : 'Submit (authorized user)'}
        </Button>
        {!onBehalf && (
          <Button icon={<Send size={14} />} onClick={() => void save(true, true)}>
            Submit as Franchise
          </Button>
        )}
      </div>
    </div>
  )
}

export default function AlfForm() {
  const [params] = useSearchParams()
  const editId = params.get('edit') ?? undefined
  const list = useAlf()
  const load = alfLoader.use()
  const waiting = !!editId && !list.some((x) => x.id === editId) && (load.loading || !load.loaded)
  return (
    <div className="max-w-[1180px] space-y-4 pb-12">
      <Crumbs trail={[{ label: 'Operations', to: '/operations' }, { label: 'Cash Loading Register', to: '/operations/cash-loading' }, { label: 'ALF Register', to: '/operations/alf' }, { label: editId ?? 'New ALF Request' }]} />
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0066FF] text-white shadow-sm">
          <HandCoins size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[26px]">{editId ? `Edit ALF ${editId}` : 'New Additional Loading Fund Request'}</h1>
          <p className="text-[12.5px] text-slate-500">Request → CRM / Ops verification → Submit for Email → Disbursement → Cash Loading mapping → Recovery / Adjustment → Closed.</p>
        </div>
      </div>
      {waiting ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-[13px] text-slate-500">Loading {editId}…</div> : <AlfFormInner key={editId ?? 'new'} editId={editId} />}
    </div>
  )
}
