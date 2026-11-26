import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { FileDrop, SelectField, TextAreaField, TextField, type FileValue } from '@/components/ui/Form'
import { useRole } from '@/lib/rbac'
import { useSites } from '@/data/network'
import {
  AUDIT_REASONS, COUNTER_SLIP_RULE, EOD_CATEGORIES, categoryRequired, checkCounterSlip, createEodRequestAsync, crmEodSites, eodFundingOf, frNameOf, ledgerOf, validateEodRequest,
  type EodRequestInput, type EodType,
} from '@/data/eodStore'
import { useRawFile } from '@/data/docsApi'
import { apiEnabled } from '@/data/opsApi'
import { opsMeLoader, rightsFor } from './eod2/access'
import { inr, todayIso } from './eod2/fmt'
import { AckBox, KV, NoAccess, Note, OpsPage, Panel } from './eod2/ui'

/** CRM / Operations exceptional EOD creation on the web (§5.1.1). Franchises raise EODs from the mobile app. */
export default function CrmEodDocketForm() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const role = useRole()
  opsMeLoader.use()
  const rights = rightsFor('Routine EOD', role)
  const { sites } = useSites()
  const crmSites = useMemo(() => crmEodSites(sites), [sites])
  const [q, setQ] = useState('')
  const [type, setType] = useState<EodType>(params.get('type') === 'Cash Audit' ? 'Cash Audit' : 'Routine')
  const [f, setF] = useState<Omit<EodRequestInput, 'type' | 'file' | 'ackLang' | 'ackChecked'>>({ siteId: '', eodDate: todayIso(), category: '', auditReason: '', auditReasonOther: '', slipNo: '', slipDate: todayIso(), slipAmount: '', declaredCash: '', exceptionalReason: '' })
  const [file, setFile] = useState<FileValue>(null)
  const [ackLang, setAckLang] = useState<'Hindi' | 'English'>('Hindi')
  const [ack, setAck] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [popup, setPopup] = useState(false)
  const [busy, setBusy] = useState(false)
  const raw = useRawFile()
  const site = crmSites.find((s) => s.siteId === f.siteId)
  const funding = site ? eodFundingOf(site) : null
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }))
  const shown = crmSites.filter((s) => !q.trim() || `${s.atmId} ${s.siteId} ${frNameOf(s.frId)}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 80)
  const input: EodRequestInput = { ...f, type, file, ackLang, ackChecked: ack }
  const rule = checkCounterSlip(Number(f.slipAmount))

  if (!rights.create) return <NoAccess module="Routine EOD" />

  const review = () => {
    const e = validateEodRequest(input, 'Web (CRM exceptional)')
    setErrors(e)
    if (Object.keys(e).length) {
      toast(`Complete the ${Object.keys(e).length} required field(s) highlighted below`, 'error')
      return
    }
    setPopup(true) // §5.3.4 — ₹40,000 rule popup before submit
  }
  const submit = async () => {
    setBusy(true)
    const res = await createEodRequestAsync(input, 'Web (CRM exceptional)', raw.file())
    setBusy(false)
    setPopup(false)
    if (!res.rec) {
      if (res.error) setErrors((e) => ({ ...e, form: res.error! }))
      return
    }
    const rec = res.rec
    toast(rec.stage === 'Exception Review' ? `${rec.id} created — counter-slip rule failed, sent to exception review` : `${rec.id} submitted — Operations verification task created`, rec.stage === 'Exception Review' ? 'info' : 'success')
    navigate(`/operations/eod/record/${rec.id}`)
  }

  return (
    <OpsPage title="Raise EOD request (CRM exceptional)" sub="Normally the franchise raises EOD from the mobile app. Use this only in exceptional cases — the reason is stored on the record." back={{ to: '/operations/eod/crm', label: 'EOD Master' }}>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Panel title="1 · EOD type & site">
            <div className="mb-3 flex gap-2">
              {(['Routine', 'Cash Audit'] as EodType[]).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)} className={`h-9 rounded-lg border px-4 text-[12.5px] font-semibold ${type === t ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-white text-ink-2'}`}>
                  {t} EOD
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <TextField label="Search CRM site" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ATM ID, site ID or franchise" />
              </div>
              <SelectField label="CRM site / ATM" required value={f.siteId} onChange={(e) => set('siteId')(e.target.value)} options={shown.map((s) => s.siteId)} error={errors.siteId} hint={`${crmSites.length} CRM sites on CBR / Cash Loading funding`} />
            </div>
            {site && (
              <div className="mt-3 rounded-lg border border-line bg-surface/50 p-3">
                <KV cols={4} items={[['ATM ID', site.atmId], ['Franchise', frNameOf(site.frId)], ['Funding model', funding], ['History ledger', funding ? ledgerOf(funding) : '—']]} />
              </div>
            )}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <TextField label="EOD date" type="date" required max={todayIso()} value={f.eodDate} onChange={(e) => set('eodDate')(e.target.value)} error={errors.eodDate} />
              {site && categoryRequired(site) ? (
                <SelectField label="EOD category (CRM + Full Funding)" required value={f.category ?? ''} onChange={(e) => set('category')(e.target.value)} options={[...EOD_CATEGORIES]} error={errors.category} />
              ) : (
                <SelectField label="EOD category" value={f.category ?? ''} onChange={(e) => set('category')(e.target.value)} options={[...EOD_CATEGORIES]} hint="Mandatory only for CRM + Full Funding sites" />
              )}
            </div>
            {type === 'Cash Audit' && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <SelectField label="Cash audit reason" required value={f.auditReason ?? ''} onChange={(e) => set('auditReason')(e.target.value)} options={[...AUDIT_REASONS]} error={errors.auditReason} />
                {f.auditReason?.startsWith('Other') && <TextField label="Describe requirement / dispute" required value={f.auditReasonOther ?? ''} onChange={(e) => set('auditReasonOther')(e.target.value)} error={errors.auditReasonOther} />}
              </div>
            )}
          </Panel>

          <Panel title="2 · Counter slip">
            <div {...raw.capture}>
              <FileDrop upload={false} value={file} onChange={setFile} accept={apiEnabled ? '.jpg,.jpeg,.png,.pdf' : 'image/*,.pdf'} maxMb={5} label="Upload counter slip (photo / PDF)" />
            </div>
            {errors.file && <p className="mt-1 text-[11px] text-brand-red">{errors.file}</p>}
            {errors.form && <p className="mt-1 text-[11px] text-brand-red">{errors.form}</p>}
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <TextField label="Counter slip no." required value={f.slipNo} onChange={(e) => set('slipNo')(e.target.value)} error={errors.slipNo} />
              <TextField label="Slip date" type="date" required value={f.slipDate} onChange={(e) => set('slipDate')(e.target.value)} error={errors.slipDate} />
              <TextField label="Amount on slip (₹)" type="number" min={0} required value={f.slipAmount} onChange={(e) => set('slipAmount')(e.target.value)} error={errors.slipAmount} />
              <TextField label="Declared cash (₹)" type="number" min={0} required value={f.declaredCash} onChange={(e) => set('declaredCash')(e.target.value)} error={errors.declaredCash} />
            </div>
            {f.slipAmount && (
              <div className="mt-3">
                <Note tone={rule.passed ? 'green' : 'amber'}>{rule.message}</Note>
              </div>
            )}
          </Panel>

          <Panel title="3 · Exceptional reason & acknowledgement">
            <TextAreaField label="Why is CRM raising this EOD instead of the franchise?" required value={f.exceptionalReason ?? ''} onChange={(e) => set('exceptionalReason')(e.target.value)} error={errors.exceptionalReason} />
            <div className="mt-3">
              <AckBox lang={ackLang} onLang={setAckLang} checked={ack} onChecked={setAck} error={errors.ack} />
            </div>
          </Panel>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => navigate('/operations/eod/crm')}>
              Cancel
            </Button>
            <Button icon={<Send size={15} />} onClick={review}>
              Review & submit
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Panel title="What happens next">
            <ol className="list-decimal space-y-1.5 pl-4 text-[12px] text-ink-2">
              <li>₹40,000 counter-slip rule popup — failure goes to exception review.</li>
              <li>Operations verification (another user — maker-checker).</li>
              <li>Docket number generated and emailed via the EOD template.</li>
              <li>OTC generated by the franchise's authorized user via link.</li>
              <li>Vault / bolt opening recorded — opening time mandatory.</li>
              <li>Cash {funding === 'Self Funding' ? 'loading' : 'replacement'} acknowledged → {funding ? ledgerOf(funding) : 'CBR / Cash Loading history'}.</li>
              <li>Admin approval locks the record.</li>
            </ol>
          </Panel>
          <Note tone="amber">{COUNTER_SLIP_RULE.pendingNote}</Note>
        </div>
      </div>

      {popup && (
        <Modal
          title="Counter-slip rule (₹40,000)"
          sub={COUNTER_SLIP_RULE.pendingNote}
          onClose={() => setPopup(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setPopup(false)}>
                Edit request
              </Button>
              <Button onClick={submit} disabled={busy} variant={rule.passed ? 'primary' : 'danger'}>
                {rule.passed ? 'Confirm & submit' : 'Submit for exception review'}
              </Button>
            </>
          }
        >
          <div className="flex items-start gap-3">
            {rule.passed ? <CheckCircle2 className="shrink-0 text-emerald-600" /> : <AlertTriangle className="shrink-0 text-amber-600" />}
            <div className="space-y-2 text-[13px] text-ink">
              <p>{rule.message}</p>
              <p className="text-[12px] text-muted">
                Slip {f.slipNo} · {inr(Number(f.slipAmount))} · declared {inr(Number(f.declaredCash))} · {site?.atmId}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </OpsPage>
  )
}
