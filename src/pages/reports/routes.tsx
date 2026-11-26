import { lazy } from 'react'
import { Navigate, Route } from 'react-router-dom'
const ReportsHub = lazy(() => import('./ReportsHub'))
const FinancialReport = lazy(() => import('./financial/FinancialReport'))
const DlrDetail = lazy(() => import('./financial/Dlr').then((m) => ({ default: m.DlrDetail })))
const ReportRecord = lazy(() => import('./financial/ReportPages').then((m) => ({ default: m.ReportRecord })))
const MonthlyCbrMis = lazy(() => import('./MonthlyCbrMis'))
const MonthlyTxnsReport = lazy(() => import('./MonthlyTxnsReport'))
const ChargeBackDisputeList = lazy(() => import('../operations/ChargeBackDisputeList'))
export const reportRoutes = [
  <Route key="reports-hub" path="/reports" element={<ReportsHub />} />,
  <Route key="reports-monthly-txns" path="/reports/monthly-txns" element={<MonthlyTxnsReport />} />,
  <Route key="reports-txn-data-report" path="/reports/txn-data-report" element={<MonthlyTxnsReport />} />,
  <Route key="reports-charge-back" path="/reports/charge-back" element={<ChargeBackDisputeList />} />,
  <Route key="reports-chargeback-disputes" path="/reports/chargeback-disputes" element={<ChargeBackDisputeList />} />,
  <Route key="reports-monthly-cbr" path="/reports/monthly-cbr" element={<MonthlyCbrMis />} />,
  <Route key="reports-monthly-cbr-mis" path="/reports/monthly-cbr-mis" element={<MonthlyCbrMis />} />,
  <Route key="reports-financial-index" path="/reports/financial" element={<Navigate to="/reports/financial/bs" replace />} />,
  <Route key="reports-financial" path="/reports/financial/:report" element={<FinancialReport />} />,
  <Route key="reports-dlr2-detail" path="/reports/financial/dlr2/:atmId" element={<DlrDetail key="dlr2" kind="dlr2" />} />,
  <Route key="reports-dlr3-detail" path="/reports/financial/dlr3/:atmId" element={<DlrDetail key="dlr3" kind="dlr3" />} />,
  <Route key="reports-financial-record" path="/reports/financial/:report/:recordId" element={<ReportRecord />} />,
]
