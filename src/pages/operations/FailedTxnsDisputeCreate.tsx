import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Send } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import {
  BANK_RECIPIENTS, FTD_EDITABLE, FTD_TXN_TYPES, editFtdAsync, raiseFtdAsync, useFailedTxnDisputes, useFtdLoad, validateFtd,
  type FailedTxnDisputeRecord, type FtdInput,
} from '@/data/failedTxnDisputes'
import { apiEnabled } from '@/data/opsApi'
import { atmInfo, atmOptions, sourceLabel } from './recon2/atmDirectory'
import { allSites, resolveSite, SiteRef } from '@/lib/siteRef'
import { canCrmAct, useOpsUser } from './recon2/opsAccess'
import { ActingAs, FileChip, FilePick, LoadBanner, ReasonBox } from './recon2/shared'
import { uploadPicked, type PickedFile } from './recon2/util'
import FtdDetail from './recon2/FtdDetail'

const blank = (): FtdInput => ({
  raisedVia: 'CRM Web', atmId: '', machineType: 'ATM', txnType: 'Withdrawal - Card', txnId: '', utr: '', txnDate: new Date().toISOString().slice(0, 10), txnTime: '',
  customerName: '', customerMobile: '', accountNo: '', bankName: '', ifscCode: '', cardDetails: '', branch: '', rrn: '', amount: 0, remarks: '', recipient: BANK_RECIPIENTS[0],
})
const toInput = (r: FailedTxnDisputeRecord): FtdInput => ({
  raisedVia: r.raisedVia, atmId: r.atmId, machineType: r.machineType, txnType: r.txnType, txnId: r.txnId, utr: r.utr, txnDate: r.txnDate, txnTime: r.txnTime, customerName: r.customerName,
  customerMobile: r.customerMobile, accountNo: r.accountNo, bankName: r.bankName, ifscCode: r.ifscCode, cardDetails: r.cardDetails, branch: r.branch, rrn: r.rrn, amount: r.amount, txnSlipName: r.txnSlipName, remarks: r.remarks, recipient: r.recipient,
})

/** §11.1 entry form — CRM web entry, or correction of a draft / returned dispute (changes need a reason). */
function FtdForm({ existing }: { existing?: FailedTxnDisputeRecord }) {
  const navigate = useNavigate()
  const u = useOpsUser()
  const [f, setF] = useState<FtdInput>(() => (existing ? toInput(existing) : blank()))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [reason, setReason] = useState('')
  const [slip, setSlip] = useState<PickedFile | null>(null)
  const [busy, setBusy] = useState(false)
  // ATM picker = Site Master ATMs only (one common Site / ATM ID across modules)
  const atms = useMemo(() => [...new Set([...atmOptions().filter((a) => resolveSite(a)), ...allSites().map((x) => x.atmId)])], [])
  const info = useMemo(() => atmInfo(f.atmId), [f.atmId])
  const set = <K extends keyof FtdInput>(k: K, v: FtdInput[K]) => setF((x) => ({ ...x, [k]: v }))

  const save = async (draft: boolean) => {
    if (busy) return
    if (existing) {
      setBusy(true)
      let res
      try {
        const slipFileId = slip?.file ? await uploadPicked(slip, { entity: 'FailedTxnDispute', ref: existing.id }) : undefined
        res = await editFtdAsync(existing.id, f, reason, { slipFileId })
      } catch (err) {
        return toast(err instanceof Error ? err.message : 'Upload failed', 'error')
      } finally {
        setBusy(false)
      }
      if (!res.ok) return toast(res.error, 'error')
      toast('Dispute updated — modification logged')
      navigate(`/operations/reconciliation/failed-txns/${existing.id}`)
      return
    }
    const e = draft ? {} : validateFtd(f)
    if (apiEnabled) delete e.atmId // Site Master lookup happens on the server
    if (apiEnabled && !f.atmId.trim()) e.atmId = 'ATM ID is required'
    setErrors(e)
    if (Object.keys(e).length) return toast('Please fix the highlighted fields', 'error')
    setBusy(true)
    try {
      const slipFileId = await uploadPicked(slip, { entity: 'FailedTxnDispute' })
      const res = await raiseFtdAsync(f, { draft, slipFileId })
      if (!res.ok) return toast(res.error, 'error')
      toast(draft ? `Draft ${res.id} saved` : `Dispute ${res.id} raised — CRM verification task created`)
      navigate(`/operations/reconciliation/failed-txns/${res.id}`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (existing && !FTD_EDITABLE.includes(existing.status)) {
    return <p className="py-10 text-center text-[13px] text-muted">{existing.id} is {existing.status} — editing is locked. <Link className="text-primary" to={`/operations/reconciliation/failed-txns/${existing.id}`}>Open record</Link></p>
  }
  const fe = (k: string) => errors[k]

  return (
    <div className="mx-auto max-w-[1100px] min-w-0 pb-12">
      <Link to="/operations/reconciliation/failed-txns" className="mb-3 inline-flex items-center gap-1 text-[12px] text-muted hover:text-primary"><ArrowLeft size={14} /> Failed transaction disputes</Link>
      <h1 className="text-[24px] font-bold tracking-tight text-ink">{existing ? `Edit ${existing.id}` : 'Raise Failed Transaction Dispute'}</h1>
      <p className="mb-4 text-[13px] text-muted">Operations §11.1 — mainly for Self Funding sites. A system dispute ID is generated on save; a CRM Executive other than you verifies it, then Admin approves and the email is triggered.</p>
      <div className="mb-4"><ActingAs /></div>
      {!canCrmAct(u) && <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-800">Your role cannot raise disputes on the web portal (CRM Executive / Admin). Franchises raise from the mobile app.</p>}

      <Card className="mb-4 p-4">
        <div className="mb-3 text-[13px] font-semibold">ATM & transaction</div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <TextField label="ATM ID" required list="ftd-atms" value={f.atmId} onChange={(e) => set('atmId', e.target.value.toUpperCase())} error={fe('atmId')} />
            <datalist id="ftd-atms">{atms.map((a) => <option key={a} value={a} />)}</datalist>
          </div>
          <TextField label="Site ID" value={info.siteId} disabled />
          <TextField label="Franchise" value={info.franchiseName} disabled />
          <div>
            <div className="mb-1.5 text-[11px] font-semibold">Funding model</div>
            <Badge tone={info.funding === 'Self Funding' ? 'purple' : 'navy'}>{f.atmId ? info.funding : '—'}</Badge>
            {f.atmId && !resolveSite(f.atmId) && <div className="mt-1 text-[11px] text-amber-700">ATM not found in the Site Master</div>}
            {f.atmId && resolveSite(f.atmId) && <div className="mt-1 text-[11px]"><SiteRef id={f.atmId} /></div>}
          </div>
          <SelectField label="Machine type" options={['ATM', 'CRM']} value={f.machineType} onChange={(e) => set('machineType', e.target.value)} />
          <SelectField label="Txn type" options={FTD_TXN_TYPES} value={f.txnType} onChange={(e) => set('txnType', e.target.value)} />
          <TextField label="Txn ID" value={f.txnId} onChange={(e) => set('txnId', e.target.value)} />
          <TextField label="UTR" value={f.utr} onChange={(e) => set('utr', e.target.value)} />
          <TextField label="Txn date" required type="date" value={f.txnDate} onChange={(e) => set('txnDate', e.target.value)} error={fe('txnDate')} />
          <TextField label="Txn time" type="time" value={f.txnTime} onChange={(e) => set('txnTime', e.target.value)} />
          <TextField label="RRN (12 digits)" required inputMode="numeric" maxLength={12} value={f.rrn} onChange={(e) => set('rrn', e.target.value.replace(/\D/g, ''))} error={fe('rrn')} />
          <TextField label="Amount (₹)" required type="number" min={0} value={f.amount ? String(f.amount) : ''} onChange={(e) => set('amount', Number(e.target.value))} error={fe('amount')} />
        </div>
        {f.atmId && <p className="mt-3 text-[11.5px] text-muted">Source records used for verification: <b>{sourceLabel(info.funding)}</b></p>}
      </Card>

      <Card className="mb-4 p-4">
        <div className="mb-3 text-[13px] font-semibold">Customer</div>
        <div className="grid gap-3 sm:grid-cols-4">
          <TextField label="Customer name" required value={f.customerName} onChange={(e) => set('customerName', e.target.value)} error={fe('customerName')} />
          <TextField label="Mobile" value={f.customerMobile} onChange={(e) => set('customerMobile', e.target.value)} />
          <TextField label="Bank" required value={f.bankName} onChange={(e) => set('bankName', e.target.value)} error={fe('bankName')} />
          <TextField label="IFSC" value={f.ifscCode} onChange={(e) => set('ifscCode', e.target.value.toUpperCase())} />
          <TextField label="Account no. (masked)" value={f.accountNo} onChange={(e) => set('accountNo', e.target.value)} />
          <TextField label="Card / UPI" value={f.cardDetails} onChange={(e) => set('cardDetails', e.target.value)} />
          <TextField label="Branch" value={f.branch} onChange={(e) => set('branch', e.target.value)} />
          <SelectField label="Dispute email recipient" options={BANK_RECIPIENTS.map((b) => b.name)} value={f.recipient.name} onChange={(e) => set('recipient', BANK_RECIPIENTS.find((b) => b.name === e.target.value) ?? BANK_RECIPIENTS[0])} />
          <TextAreaField label="What failed (remarks)" required className="sm:col-span-3" value={f.remarks} onChange={(e) => set('remarks', e.target.value)} error={fe('remarks')} />
          <div>
            <div className="mb-1.5 text-[11px] font-semibold">Txn slip / receipt</div>
            <div className="flex flex-wrap items-center gap-2"><FilePick label={f.txnSlipName ? 'Replace' : 'Upload'} accept="image/*,.pdf" onPick={(x) => { set('txnSlipName', x[0].name); setSlip(x[0]) }} />{f.txnSlipName && <FileChip name={f.txnSlipName} />}</div>
          </div>
        </div>
      </Card>

      {existing && (
        <Card className="mb-4 border-amber-200 p-4">
          <div className="mb-1 text-[13px] font-semibold">Modification reason</div>
          <ReasonBox value={reason} onChange={setReason} />
        </Card>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
        {!existing && <Button variant="secondary" icon={<Save size={14} />} disabled={!canCrmAct(u) || busy} onClick={() => save(true)}>Save draft</Button>}
        <Button icon={<Send size={14} />} disabled={!canCrmAct(u) || busy || (!!existing && !reason.trim())} onClick={() => save(false)}>{existing ? 'Save changes' : 'Raise dispute'}</Button>
      </div>
    </div>
  )
}

export default function FailedTxnsDisputeCreate() {
  const { id } = useParams<{ id?: string }>()
  const { pathname } = useLocation()
  const list = useFailedTxnDisputes()
  const load = useFtdLoad()
  if (!id) return <FtdForm />
  if (pathname.endsWith('/edit')) {
    const rec = list.find((r) => r.id === id)
    if (!rec && load.loading) return <div className="mx-auto max-w-3xl py-10"><LoadBanner state={load} /></div>
    return rec ? <FtdForm key={rec.id} existing={rec} /> : <FtdDetail id={id} />
  }
  return <FtdDetail id={id} />
}
