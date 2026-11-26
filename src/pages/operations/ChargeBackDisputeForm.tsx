import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bot, FileUp, Mail, Sparkles, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { EXTRACT_FIELDS, detectSource, extractFromCsv, extractFromText, importChargebacksAsync, type CbSource, type Extracted } from '@/data/chargeBackDisputes'
import { apiEnabled } from '@/data/opsApi'
import { atmInfo } from './recon2/atmDirectory'
import { legacyCbrSite } from '@/data/cbrSites'
import { resolveSite, siteAt } from '@/lib/siteRef'
import { canCrmAct, useOpsUser } from './recon2/opsAccess'
import { ActingAs } from './recon2/shared'
import CbDetail from './recon2/CbDetail'

// Samples reference real Site Master ATMs (a Full Funding CBR site and a Self Funding site).
const SAMPLE_FFM = legacyCbrSite('DX-MH-01503')?.atmId ?? 'DX-MH-01503'
const SAMPLE_FFM2 = legacyCbrSite('DX-MH-01511')?.atmId ?? 'DX-MH-01511'
const SAMPLE_SF = siteAt(1, (s) => s.siteType === 'SF').atmId

const SAMPLE_EMAIL = `From: disputes@npci.example
To: recon@dexterindia.in
Subject: NFS Chargeback raised – Case No NPCI/CB/2026/88520

Dear Member,
A chargeback has been raised by the issuer for the transaction below.

Case No: NPCI/CB/2026/88520
ATM ID: ${SAMPLE_FFM}
RRN: 627118340912
Card No: 6522XXXXXXXX4410
Txn Date: 25-11-2026
Txn Time: 18:42:05
Dispute Amount: Rs 6,000
Reason: Cash not dispensed – customer account debited

Submit the response with EJ / CBR proof within 24 hours.`

const SAMPLE_CSV = `ATM ID,RRN,Txn Date,Dispute Amount,Reason,Card No,Case Ref
${SAMPLE_SF},627201118804,24-11-2026,2500,Partial dispense,4591XXXXXXXX1120,SBI-ATM-77188
${SAMPLE_FFM2},627201554120,25-11-2026,1000,Shutter timeout,6082XXXXXXXX7710,SBI-ATM-77190`

/** UAT 19 — Import NPCI / Bank email or file → AI extraction → DRAFT dispute(s). */
function ImportChargeback() {
  const navigate = useNavigate()
  const u = useOpsUser()
  const [mode, setMode] = useState<'Email' | 'File'>('Email')
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [source, setSource] = useState<CbSource>('NPCI')
  const [receivedAt, setReceivedAt] = useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  })
  const [items, setItems] = useState<{ key: string; e: Extracted }[] | null>(null)
  const [busy, setBusy] = useState(false)

  const readFile = (f: File) => {
    setFileName(f.name)
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result ?? ''))
    reader.readAsText(f)
  }
  const extract = () => {
    if (!text.trim()) return toast('Paste the email text or upload a file first', 'error')
    const isCsv = mode === 'File' && (/\.csv$/i.test(fileName) || /^[^\n]*,[^\n]*,[^\n]*\n/.test(text))
    const out = isCsv ? extractFromCsv(text) : [extractFromText(text)]
    setSource(detectSource(text))
    const stamp = Date.now().toString(36)
    setItems(out.map((e, i) => ({ key: `${stamp}-${i}`, e })))
    toast(`AI extraction found ${out.length} dispute(s)`, 'info')
  }
  const create = async () => {
    if (!items?.length || busy) return
    const bad = items.findIndex(({ e }) => !e.atmId || !e.rrn)
    if (bad >= 0) return toast(`Row ${bad + 1}: ATM ID and RRN are needed to create a draft (others can be fixed by CRM)`, 'error')
    // API mode: the server checks every ATM against the Site Master (and needs amount + txn date)
    const unknown = apiEnabled ? -1 : items.findIndex(({ e }) => !resolveSite(e.atmId))
    if (unknown >= 0) return toast(`Row ${unknown + 1}: ATM "${items[unknown].e.atmId}" is not in the Site Master — correct the ATM ID before creating the draft`, 'error')
    setBusy(true)
    const { ids, errors } = await importChargebacksAsync(items.map((x) => x.e), { kind: mode, fileName: fileName || undefined, raw: text }, source, receivedAt).finally(() => setBusy(false))
    errors.forEach((m) => toast(m, 'error'))
    if (!ids.length) return
    toast(`${ids.length} draft dispute(s) created — franchise notified, CRM verification task created`)
    navigate(ids.length === 1 ? `/operations/reconciliation/charge-back/${ids[0]}` : '/operations/reconciliation/charge-back')
  }
  const setCell = (i: number, k: keyof Extracted, v: string) => setItems((xs) => (xs ? xs.map((x, j) => (j === i ? { ...x, e: { ...x.e, [k]: v } } : x)) : xs))

  return (
    <div className="mx-auto max-w-[1200px] min-w-0 pb-12">
      <Link to="/operations/reconciliation/charge-back" className="mb-3 inline-flex items-center gap-1 text-[12px] text-muted hover:text-primary"><ArrowLeft size={14} /> Chargeback disputes</Link>
      <h1 className="text-[24px] font-bold tracking-tight text-ink">Import NPCI / Bank email or file</h1>
      <p className="mb-4 text-[13px] text-muted">The Dexter AI agent extracts ATM ID, RRN, amount, date and reason and creates a DRAFT dispute. The franchise is notified immediately; CRM Operations then verifies the email data against the extraction.</p>
      <div className="mb-4"><ActingAs /></div>
      {!canCrmAct(u) && <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-800">Import is done by CRM Operations / Admin.</p>}

      <Card className="mb-4 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {(['Email', 'File'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={cn('inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold', mode === m ? 'border-primary bg-primary-soft text-primary' : 'border-line')}>
              {m === 'Email' ? <Mail size={14} /> : <FileUp size={14} />} {m === 'Email' ? 'Paste email text' : 'Upload file (CSV / TXT / EML)'}
            </button>
          ))}
          <button type="button" onClick={() => { setText(mode === 'Email' ? SAMPLE_EMAIL : SAMPLE_CSV); setFileName(mode === 'File' ? 'npci_chargebacks.csv' : ''); setItems(null) }} className="ml-auto text-[11.5px] font-semibold text-primary hover:underline">Load sample {mode === 'Email' ? 'email' : 'CSV'}</button>
        </div>
        {mode === 'File' && (
          <div className="mb-2 flex items-center gap-2">
            <input type="file" accept=".csv,.txt,.eml" aria-label="Dispute file" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = '' }} className="text-[12px]" />
            {fileName && <Badge tone="blue" dot={false}>{fileName}</Badge>}
          </div>
        )}
        <textarea value={text} onChange={(e) => { setText(e.target.value); setItems(null) }} rows={12} placeholder={mode === 'Email' ? 'Paste the NPCI / bank chargeback email here…' : 'File contents appear here (you can also paste CSV rows)…'} className="w-full rounded-md border border-line p-3 font-mono text-[12px] outline-none focus:border-primary" />
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-[11px] font-semibold">Received at<input type="datetime-local" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} className="mt-1 block h-9 rounded-md border border-line px-2 text-[12px]" /></label>
          <label className="text-[11px] font-semibold">Source<select value={source} onChange={(e) => setSource(e.target.value as CbSource)} className="mt-1 block h-9 rounded-md border border-line px-2 text-[12px]"><option>NPCI</option><option>Bank</option></select></label>
          <Button icon={<Sparkles size={14} />} onClick={extract} disabled={!canCrmAct(u)}>Run AI extraction</Button>
        </div>
      </Card>

      {items && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold"><Bot size={15} className="text-primary" /> Extraction preview — {items.length} draft(s) · 24 h response clock starts from received time</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-[12px]">
              <thead className="text-left text-muted">
                <tr>
                  <th className="py-1.5 pr-2 font-medium">#</th>
                  {EXTRACT_FIELDS.map((f) => <th key={f.key} className="py-1.5 pr-2 font-medium">{f.label}{f.required && ' *'}</th>)}
                  <th className="py-1.5 pr-2 font-medium">Funding (from ATM)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map(({ key, e }, i) => {
                  const info = atmInfo(e.atmId ?? '')
                  return (
                    <tr key={key} className="border-t border-line/60 align-top">
                      <td className="py-1.5 pr-2">{i + 1}</td>
                      {EXTRACT_FIELDS.map((f) => (
                        <td key={f.key} className="py-1.5 pr-2">
                          <input aria-label={`${f.label} row ${i + 1}`} value={e[f.key] ?? ''} onChange={(ev) => setCell(i, f.key, ev.target.value)} className={cn('h-7 w-full min-w-[90px] rounded border px-1.5 text-[12px]', e[f.key] ? 'border-emerald-300 bg-emerald-50/40' : f.required ? 'border-red-300 bg-red-50/50' : 'border-line')} />
                        </td>
                      ))}
                      <td className="py-1.5 pr-2">{e.atmId ? <Badge tone={info.known ? (info.funding === 'Self Funding' ? 'purple' : 'navy') : 'amber'}>{info.known ? info.funding : 'ATM unknown'}</Badge> : '—'}<div className="text-[10.5px] text-muted">{info.franchiseName}</div></td>
                      <td className="py-1.5"><button type="button" aria-label="Remove row" onClick={() => setItems((xs) => (xs ? xs.filter((x) => x.key !== key) : xs))} className="text-muted hover:text-brand-red"><Trash2 size={14} /></button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11.5px] text-muted">Green = extracted, red = required but not found. Drafts keep the original email / file and the raw AI values; CRM changes later need a reason.</p>
          <div className="mt-3 flex justify-end"><Button onClick={create} disabled={!items.length || busy}>Create draft dispute{items.length > 1 ? 's' : ''}</Button></div>
        </Card>
      )}
    </div>
  )
}

export default function ChargeBackDisputeForm() {
  const { id } = useParams<{ id?: string }>()
  return id ? <CbDetail id={id} /> : <ImportChargeback />
}
