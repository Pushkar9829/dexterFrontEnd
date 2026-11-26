import { lazy } from 'react'
import { Route } from 'react-router-dom'
const EodRecordDetail = lazy(() => import('./EodRecordDetail'))
const OtcLink = lazy(() => import('./OtcLink'))
const CrmEodList = lazy(() => import('../CrmEodList'))
/** NEW routes only — existing EOD / WLA / TDS / Transaction Data routes stay in pages/operations/routes.tsx. */
export const eodRoutes = [
  <Route key="ops-eod-record" path="/operations/eod/record/:id" element={<EodRecordDetail />} />,
  <Route key="ops-eod-otc" path="/operations/eod/otc/:token" element={<OtcLink />} />,
  <Route key="ops-eod-exceptions" path="/operations/eod/exceptions" element={<CrmEodList />} />,
]

const BASE = ['Operations', 'EOD Management']
export const eodCrumbs: Record<string, string[]> = {
  '/operations/eod/record': [...BASE, 'EOD Master'],
  '/operations/eod/otc': [...BASE, 'OTC Generation'],
  '/operations/eod/record/:id': [...BASE, 'EOD Master', 'EOD Record'],
  '/operations/eod/otc/:token': [...BASE, 'OTC Generation'],
  '/operations/eod/exceptions': [...BASE, 'Exception Review'],
}
