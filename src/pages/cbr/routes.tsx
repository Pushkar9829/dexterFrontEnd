import { Route, useParams } from 'react-router-dom'
import Consolidated from './Consolidated'
import DailyCbrPage from './DailyCbr'
import EodSummary from './EodSummary'
import MobileCbr from './MobileCbr'

// keyed by record id so prev / next day navigation starts with a clean (non-editing) state
function DailyRoute() {
  const { recordId = '' } = useParams()
  return <DailyCbrPage key={recordId} />
}

export const cbrRoutes = [
  <Route key="cbr-consolidated" path="/cbr/consolidated" element={<Consolidated />} />,
  <Route key="cbr-daily" path="/cbr/consolidated/daily/:recordId" element={<DailyRoute />} />,
  <Route key="cbr-eod" path="/cbr/eod-summary" element={<EodSummary />} />,
  <Route key="cbr-mobile" path="/cbr/mobile" element={<MobileCbr />} />,
]
