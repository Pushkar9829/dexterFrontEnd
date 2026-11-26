import { useState, type ChangeEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { KeyRound, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Form'
import { eodLoader, generateOtcAsync, useEod } from '@/data/eodStore'
import { apiEnabled } from '@/data/opsApi'
import { dmy, dt } from './fmt'
import { KV, Note, OpsPage, Panel } from './ui'

/** §5.3.7–8 — OTC generation link: the franchise's authorized user fills details → unique OTC, then view-only. */
export default function OtcLink() {
  const { token } = useParams()
  const { records } = useEod()
  const load = eodLoader.use()
  const r = records.find((x) => x.otcLinkToken && x.otcLinkToken === token)
  const [f, setF] = useState({ name: '', designation: '', mobile: '', purpose: 'Vault opening for EOD' })
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }))

  if (!r && apiEnabled && !load.loaded && !load.error)
    return (
      <OpsPage title="OTC link" back={{ to: '/operations/eod/crm', label: 'EOD Master' }}>
        <Note tone="blue">Loading…</Note>
      </OpsPage>
    )
  if (!r)
    return (
      <OpsPage title="OTC link" back={{ to: '/operations/eod/crm', label: 'EOD Master' }}>
        <Note tone="red">This OTC link is invalid or has been withdrawn.</Note>
      </OpsPage>
    )

  const submit = async () => {
    const res = await generateOtcAsync(token ?? '', f)
    if (res.error) setErr(res.error)
  }

  return (
    <OpsPage title="Generate OTC (One Time Code)" sub="For the franchise's authorized user. The code is generated once, linked to the EOD and then shown view-only." back={{ to: `/operations/eod/record/${r.id}`, label: `EOD ${r.id}` }}>
      <div className="grid max-w-4xl gap-4 md:grid-cols-[1fr_1fr]">
        <Panel title="EOD reference">
          <KV cols={2} items={[['EOD', r.id], ['Type', `${r.type} EOD`], ['ATM / Site', `${r.atmId} · ${r.siteId}`], ['Franchise', r.franchiseName], ['EOD date', dmy(r.eodDate)], ['Docket', r.docket?.no ?? '—']]} />
        </Panel>
        {r.otc ? (
          <Panel title="OTC (view only)">
            <div className="flex items-center gap-3 rounded-lg bg-primary-soft p-4">
              <Lock className="text-primary" />
              <div>
                <div className="font-mono text-[24px] font-bold tracking-wider text-primary">{r.otc.code}</div>
                <div className="text-[11.5px] text-muted">
                  Generated {dt(r.otc.generatedAt)} by {r.otc.generatedBy} ({r.otc.designation})
                </div>
              </div>
            </div>
            <p className="mt-3 text-[12px] text-muted">Linked to {r.id} / docket {r.docket?.no}. It cannot be edited or regenerated.</p>
            <Link to={`/operations/eod/record/${r.id}`} className="mt-3 inline-block text-[12px] font-semibold text-primary hover:underline">
              Back to the EOD record →
            </Link>
          </Panel>
        ) : r.stage !== 'Docket Generated' ? (
          <Panel title="OTC">
            <Note tone="amber">OTC can be generated only after the docket is issued (current stage: {r.stage}).</Note>
          </Panel>
        ) : (
          <Panel title="Authorized user details">
            <div className="space-y-3">
              <TextField label="Authorized user name" required value={f.name} onChange={set('name')} />
              <TextField label="Designation" required value={f.designation} onChange={set('designation')} placeholder="Proprietor / Partner / Authorized signatory" />
              <TextField label="Registered mobile (10 digits)" required inputMode="numeric" maxLength={10} value={f.mobile} onChange={(e) => setF((p) => ({ ...p, mobile: e.target.value.replace(/\D/g, '') }))} />
              <TextField label="Purpose" required value={f.purpose} onChange={set('purpose')} />
              {err && <Note tone="red">{err}</Note>}
              <Button block icon={<KeyRound size={15} />} onClick={submit}>
                Generate OTC
              </Button>
            </div>
          </Panel>
        )}
      </div>
    </OpsPage>
  )
}
