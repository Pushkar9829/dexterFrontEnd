import { useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { useSites } from '@/data/network'
import { actorName } from '@/data/workflow'
import { dispenserEodSites, eodFundingOf, ledgerOf, markDispenserEodAsync } from '@/data/eodStore'
import { Note } from './ui'
import { todayIso } from './fmt'

/** §5.2 — NCR & Perto: no docket / CRM request; only "EOD done" lands on the CBR / Cash Loading history. */
export function NcrMarkModal({ onClose, frId, by }: { onClose: () => void; frId?: string; by?: string }) {
  const { sites } = useSites()
  const options = useMemo(() => dispenserEodSites(sites).filter((s) => !frId || s.frId === frId), [sites, frId])
  const [q, setQ] = useState('')
  const [siteId, setSiteId] = useState('')
  const [date, setDate] = useState(todayIso())
  const [remarks, setRemarks] = useState('')
  const [err, setErr] = useState('')
  const site = options.find((s) => s.siteId === siteId)
  const shown = options.filter((s) => !q.trim() || `${s.atmId} ${s.siteId}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 60)
  const save = async () => {
    const e = await markDispenserEodAsync(siteId, date, by ?? `${actorName()} (on behalf of franchise)`, remarks)
    if (e) return setErr(e)
    toast(`EOD marked done for ${site?.atmId} on ${date} → ${ledgerOf(eodFundingOf(site!)!)}`)
    onClose()
  }
  return (
    <Modal
      title="Mark EOD done (NCR / Perto)"
      sub="No docket number or CRM request is needed for dispenser machines."
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!siteId}>
            Mark EOD done
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-ink">ATM (NCR / Perto only) *</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ATM / Site ID" className="mb-2 h-9 w-full rounded-md border border-line px-3 text-[12px] outline-none focus:border-primary" />
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12px]">
            <option value="">Select ({options.length} dispenser sites)</option>
            {shown.map((s) => (
              <option key={s.siteId} value={s.siteId}>
                {s.atmId} · {s.siteId} · {s.machineType} · {eodFundingOf(s)}
              </option>
            ))}
          </select>
        </div>
        {site && (
          <Note tone="blue">
            {site.machineType} machine on a <b>{eodFundingOf(site)}</b> site → the mark is written to the <b>{ledgerOf(eodFundingOf(site)!)}</b> only.
          </Note>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-ink">EOD date *</label>
            <input type="date" max={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-full rounded-md border border-line px-3 text-[12px]" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-ink">Remarks</label>
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" className="h-9 w-full rounded-md border border-line px-3 text-[12px]" />
          </div>
        </div>
        {err && <Note tone="red">{err}</Note>}
      </div>
    </Modal>
  )
}
