// /finance/payouts/monthly — one workspace, three processing options (?mode=file|manual|auto),
// Payout History below the processing area on every mode (spec §9, §19.3).
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePayout } from '@/data/payout'
import { PayoutPage } from '../PayoutShell'
import { suggestBatchName, type Mode } from './lib'
import { ModeButtons, type Details } from './ui'
import { FilePanel } from './FilePanel'
import { ManualPanel } from './ManualPanel'
import { AutoPanel } from './AutoPanel'
import { PayoutHistory } from './History'

const SUB: Record<Mode, string> = {
  file: 'Process franchise monthly payout through file upload, manual entry or auto reconciliation.',
  manual: 'Process franchise monthly payout through manual entry.',
  auto: 'ATM-wise Payout Reconciliation – Compare Manual, File-Based and Auto Payout with variance.',
}
const TITLE: Record<Mode, string> = { file: 'Monthly Payout', manual: 'Monthly Payout', auto: 'Auto Reconciliation & Payout' }

const initial = (): Details => {
  const now = new Date()
  // default to last month (payouts are processed for the previous month)
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
  return { fy: `${start}-${String((start + 1) % 100).padStart(2, '0')}`, month, batchName: '', nameTouched: false, vertical: 'Franchise Model', siteCategory: '', beneficiary: 'Franchisee' }
}

export default function MonthlyPayout() {
  const [sp] = useSearchParams()
  const raw = sp.get('mode')
  const mode: Mode = raw === 'manual' || raw === 'auto' ? raw : 'file'
  usePayout() // re-render when batches change so the suggested batch name stays unique
  const [details, setDetailsState] = useState<Details>(initial)
  const setDetails = (p: Partial<Details>) => setDetailsState((d) => ({ ...d, ...p, ...(p.nameTouched ? { nameMode: mode } : {}) }))
  const resetName = () => setDetailsState((d) => ({ ...d, batchName: '', nameTouched: false }))
  // untouched name = live suggestion for the current month + mode (no effect needed)
  const name = details.nameTouched && details.nameMode === mode ? details.batchName : suggestBatchName(details.month, mode)

  return (
    <PayoutPage title={TITLE[mode]} sub={SUB[mode]} crumbs={[mode === 'auto' ? 'Auto Reconciliation & Payout' : 'Monthly Payout']} actions={<ModeButtons mode={mode} />}>
      {mode === 'file' && <FilePanel key="file" details={details} setDetails={setDetails} name={name} resetName={resetName} />}
      {mode === 'manual' && <ManualPanel key="manual" details={details} setDetails={setDetails} name={name} resetName={resetName} />}
      {mode === 'auto' && <AutoPanel key="auto" details={details} setDetails={setDetails} />}
      <PayoutHistory />
    </PayoutPage>
  )
}
