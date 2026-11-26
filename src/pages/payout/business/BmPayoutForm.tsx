import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FileDrop, TextField, type FileValue } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { apiEnabled, apiRecordBmPayout, fileBlock } from '@/data/payoutApi'
import { FY_OPTIONS, businessStore, inrP, logPayout, pid, useBusiness, type BmPayout } from '@/data/payout'
import { PayoutPage } from '../PayoutShell'
import { actor, clearDraft, fyOf, getDraft, liveInMonth, parseRupees, rupeesInput, saveDraft, touchMeta } from './bmStore'
import { FormActions, InfoCell, Note, Panel, PickField } from './ui'

type Form = { fy: string; month: string; atmId: string; gross: string; rent: string; other: string; reference: string; date: string; document: FileValue }
const EMPTY: Form = { fy: '2026-27', month: '', atmId: '', gross: '', rent: '0', other: '0', reference: '', date: '', document: null }

export default function BmPayoutForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const b = useBusiness()
  const existing = id ? b.bmPayouts.find((p) => p.id === id) : undefined
  const draftKey = id ? `payout-${id}` : 'payout-new'
  const [f, setF] = useState<Form>(() => {
    const d = getDraft<Form>(draftKey)
    if (d) return d
    if (!existing) return EMPTY
    return {
      fy: existing.fy, month: existing.month, atmId: existing.atmId, gross: rupeesInput(existing.gross), rent: rupeesInput(existing.rentDeductedAtSource),
      other: rupeesInput(existing.otherSourceDeductions), reference: existing.reference, date: existing.date, document: existing.document ? { name: existing.document, size: 184320 } : null,
    }
  })
  const [e, setE] = useState<Record<string, string>>({})
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))

  const site = b.bmSites.find((s) => s.atmId === f.atmId)
  const cat = b.bmCategories.find((c) => c.code === site?.category)
  const siteOptions = useMemo(() => b.bmSites.filter((s) => s.approval === 'Approved').map((s) => ({ value: s.atmId, label: `${s.atmId} · ${s.siteId} · ${s.mf}` })), [b.bmSites])
  const gross = parseRupees(f.gross)
  const rent = parseRupees(f.rent || '0')
  const other = parseRupees(f.other || '0')
  const received = [gross, rent, other].every(Number.isFinite) ? gross - rent - other : NaN

  if (id && !existing) {
    return (
      <PayoutPage title="Payout not found" crumbs={['Business Model', 'Site Wise Payout', id]}>
        <Note tone="red">No BM payout with id {id}.</Note>
        <Button variant="secondary" onClick={() => navigate('/finance/payouts/business/payouts')}>Back</Button>
      </PayoutPage>
    )
  }

  const submit = () => {
    const err: Record<string, string> = {}
    if (!f.fy) err.fy = 'Financial year is required'
    if (!f.month) err.month = 'Payout month is required'
    else if (f.fy && fyOf(f.month) !== f.fy) err.month = `Month falls in FY ${fyOf(f.month)}, not ${f.fy}`
    if (!f.atmId) err.atmId = 'Select a BM site'
    else if (site && f.month && !liveInMonth(site, f.month)) err.atmId = `BM mapping ${site.code} is not approved / active for ${f.month}`
    if (f.atmId && f.month && b.bmPayouts.some((p) => p.id !== id && p.atmId === f.atmId && p.month === f.month)) err.atmId = `A payout for ${f.atmId} in ${f.month} is already captured — edit that entry instead`
    if (!Number.isFinite(gross) || gross <= 0) err.gross = 'Enter a valid gross payout (max 2 decimals)'
    if (!Number.isFinite(rent) || rent < 0) err.rent = 'Enter a valid amount (0 if none)'
    if (!Number.isFinite(other) || other < 0) err.other = 'Enter a valid amount (0 if none)'
    if (Number.isFinite(received) && received < 0) err.other = 'Source deductions cannot exceed the gross payout'
    if (!f.reference.trim()) err.reference = 'Payout reference is required'
    if (!f.date) err.date = 'Payout date is required'
    else if (f.month && f.date < `${f.month}-01`) err.date = 'Payout date cannot be before the payout month'
    if (!f.document) err.document = 'Upload the source document (payout statement)'
    setE(err)
    if (Object.keys(err).length) return
    const docBlock = fileBlock(f.document)
    if (docBlock) {
      toast(docBlock, 'error')
      return
    }
    const rec: BmPayout = { id: existing?.id ?? pid('BMP'), fy: f.fy, month: f.month, atmId: f.atmId, gross, rentDeductedAtSource: rent, otherSourceDeductions: other, received, reference: f.reference.trim(), date: f.date, document: f.document?.name }
    businessStore.set((s) => ({ ...s, bmPayouts: existing ? s.bmPayouts.map((p) => (p.id === rec.id ? rec : p)) : [rec, ...s.bmPayouts] }))
    touchMeta('payoutMeta', rec.id, existing ? 'Updated' : 'Captured', `${inrP(rec.gross)} gross / ${inrP(rec.received)} received`)
    logPayout({ by: actor(), area: 'BM Payout', ref: `${rec.atmId} ${rec.month}`, action: existing ? 'Payout updated' : 'Payout captured', before: existing ? inrP(existing.received) : undefined, after: inrP(rec.received) })
    clearDraft(draftKey)
    if (apiEnabled) void apiRecordBmPayout(rec, f.document?.fileId)
    toast(`Payout for ${rec.atmId} (${rec.month}) saved`)
    navigate('/finance/payouts/business/payouts')
  }

  return (
    <PayoutPage title={existing ? `Edit payout · ${existing.atmId}` : 'Capture BM Payout'} sub="Business Model payout capture (§6.3). Amounts are stored in paise — no floating point." crumbs={['Business Model', 'Site Wise Payout', existing ? 'Edit' : 'New']}>
      <Panel title="Period & site">
        <div className="grid gap-4 md:grid-cols-3">
          <PickField label="Financial Year" required value={f.fy} error={e.fy} onChange={(v) => set('fy', v)} options={FY_OPTIONS} />
          <TextField label="Payout Month" required type="month" value={f.month} error={e.month} onChange={(x) => set('month', x.target.value)} />
          <PickField label="ATM ID (approved BM sites)" required value={f.atmId} error={e.atmId} onChange={(v) => set('atmId', v)} options={siteOptions} />
        </div>
        <div className="mt-4 grid gap-4 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <InfoCell label="Site ID" value={site?.siteId ?? '—'} />
          <InfoCell label="Super MF" value={site?.superMf ?? '—'} />
          <InfoCell label="Master Franchise" value={site?.mf ?? '—'} />
          <InfoCell label="BM Site Category" value={cat ? `${cat.code} · ${cat.name}` : '—'} />
          <InfoCell label="Vertical" value={<Badge tone="navy">Business Model</Badge>} />
        </div>
      </Panel>
      <Panel title="Amounts">
        <div className="grid gap-4 md:grid-cols-4">
          <TextField label="Gross Business Payout (₹)" required inputMode="decimal" value={f.gross} error={e.gross} onChange={(x) => set('gross', x.target.value)} />
          <TextField label="Rent Deducted at Source (₹)" inputMode="decimal" value={f.rent} error={e.rent} onChange={(x) => set('rent', x.target.value)} hint="If > 0, P&L will not deduct rent again" />
          <TextField label="Other Source Deductions (₹)" inputMode="decimal" value={f.other} error={e.other} onChange={(x) => set('other', x.target.value)} />
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold text-ink">Actual Payout Received (auto)</span>
            <div className="flex h-9 items-center rounded-md border border-line bg-surface px-3 text-[13px] font-bold">{Number.isFinite(received) ? inrP(received) : '—'}</div>
            {Number.isFinite(rent) && rent > 0 && <Badge tone="amber" className="mt-1.5">Rent deducted at source</Badge>}
          </div>
        </div>
      </Panel>
      <Panel title="Reference & source document">
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="Payout Reference" required value={f.reference} error={e.reference} onChange={(x) => set('reference', x.target.value)} placeholder="WLA/2026-09/ATM…" />
          <TextField label="Payout Date" required type="date" value={f.date} error={e.date} onChange={(x) => set('date', x.target.value)} />
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold text-ink">Source Document *</span>
            <FileDrop entity="PayoutRecord" purpose="payout-file" value={f.document} onChange={(v) => set('document', v)} accept=".pdf,.xlsx,.xls,.csv,.jpg,.png" maxMb={10} compact />
            {e.document && <span className="mt-1 block text-[11px] text-brand-red">{e.document}</span>}
          </div>
        </div>
        <div className="mt-4">
          <FormActions
            onBack={() => navigate('/finance/payouts/business/payouts')}
            onDraft={() => {
              saveDraft(draftKey, f)
              toast('Draft saved')
            }}
            onSubmit={submit}
          />
        </div>
      </Panel>
    </PayoutPage>
  )
}
