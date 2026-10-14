import { Navigate, useParams } from 'react-router-dom'
import { DlrSummary } from './Dlr'
import { FfmEodReport, OverageDepositReport } from './FfmOverage'
import { AxisIcdReport, BsReport, ClfReport, SdReport } from './Sheets'

/** /reports/financial/:report — BS | Axis & ICD | CLF | SD | FFM EOD | Overage deposit | DLR2 | DLR3 */
export default function FinancialReport() {
  const { report = '' } = useParams()
  switch (report) {
    case 'bs':
      return <BsReport key="bs" />
    case 'axis-icd':
      return <AxisIcdReport key="axis-icd" />
    case 'clf':
      return <ClfReport key="clf" />
    case 'sd':
      return <SdReport key="sd" />
    case 'ffm-eod':
      return <FfmEodReport key="ffm-eod" />
    case 'overage-deposit':
      return <OverageDepositReport key="overage-deposit" />
    case 'dlr2':
      return <DlrSummary key="dlr2" kind="dlr2" />
    case 'dlr3':
      return <DlrSummary key="dlr3" kind="dlr3" />
    default:
      return <Navigate to="/reports/financial/bs" replace />
  }
}
