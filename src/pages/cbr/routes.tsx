import { Route, useParams } from 'react-router-dom'
import Consolidated from './Consolidated'
import DailyCbrPage from './DailyCbr'
import EodSummary from './EodSummary'
import MobileCbr from './MobileCbr'
import CbrHub from './CbrHub'
import CashReplenishment from './CashReplenishment'
import CashReplenishmentForm from './CashReplenishmentForm'

// keyed by record id so prev / next day navigation starts with a clean (non-editing) state
function DailyRoute() {
  const { recordId = '' } = useParams()
  return <DailyCbrPage key={recordId} />
}

export const cbrRoutes = [
  <Route key="cbr-hub" path="/cbr" element={<CbrHub />} />,
  <Route key="cbr-ops-hub" path="/operations/cbr" element={<CbrHub />} />,
  <Route key="cbr-consolidated" path="/cbr/consolidated" element={<Consolidated />} />,
  <Route key="cbr-daily" path="/cbr/consolidated/daily/:recordId" element={<DailyRoute />} />,
  <Route key="cbr-replenishment" path="/cbr/replenishment" element={<CashReplenishment />} />,
  <Route key="cbr-replenishment-new" path="/cbr/replenishment/new" element={<CashReplenishmentForm />} />,
  <Route key="cbr-ops-replenishment" path="/operations/cbr/replenishment" element={<CashReplenishment />} />,
  <Route key="cbr-ops-replenishment-new" path="/operations/cbr/replenishment/new" element={<CashReplenishmentForm />} />,
  <Route key="cbr-eod" path="/cbr/eod-summary" element={<EodSummary />} />,
  <Route key="cbr-mobile" path="/cbr/mobile" element={<MobileCbr />} />,
]
