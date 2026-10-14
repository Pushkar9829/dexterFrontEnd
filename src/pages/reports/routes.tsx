import { Navigate, Route } from 'react-router-dom'
import ReportsHub from './ReportsHub'
import FinancialReport from './financial/FinancialReport'
import { DlrDetail } from './financial/Dlr'

export const reportRoutes = [
  <Route key="reports-hub" path="/reports" element={<ReportsHub />} />,
  <Route key="reports-financial-index" path="/reports/financial" element={<Navigate to="/reports/financial/bs" replace />} />,
  <Route key="reports-financial" path="/reports/financial/:report" element={<FinancialReport />} />,
  <Route key="reports-dlr2-detail" path="/reports/financial/dlr2/:atmId" element={<DlrDetail key="dlr2" kind="dlr2" />} />,
  <Route key="reports-dlr3-detail" path="/reports/financial/dlr3/:atmId" element={<DlrDetail key="dlr3" kind="dlr3" />} />,
]
