import { Navigate, useParams } from 'react-router-dom'
import { DlrSummary } from './Dlr'
import { DEFS } from './defs'
import { ReportList } from './ReportPages'

/** /reports/financial/:report — BS | Axis & ICD | CLF | SD | FFM EOD | Overage deposit (list → record) | DLR2 | DLR3 (summary → ATM sheet) */
export default function FinancialReport() {
  const { report = '' } = useParams()
  if (report === 'dlr2' || report === 'dlr3') return <DlrSummary key={report} kind={report} />
  const def = DEFS[report]
  if (!def) return <Navigate to="/reports/financial/bs" replace />
  return <ReportList key={report} def={def} />
}
