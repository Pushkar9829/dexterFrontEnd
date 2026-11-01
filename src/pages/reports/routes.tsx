import { Navigate, Route } from 'react-router-dom'
import ReportsHub from './ReportsHub'
import FinancialReport from './financial/FinancialReport'
import { DlrDetail } from './financial/Dlr'
import { ReportRecord } from './financial/ReportPages'
import MonthlyCbrMis from './MonthlyCbrMis'
import MonthlyTxnsReport from './MonthlyTxnsReport'
import ChargeBackDisputeList from '../operations/ChargeBackDisputeList'

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
