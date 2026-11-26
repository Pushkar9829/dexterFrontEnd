import { lazy } from 'react'
import { Navigate, Route, useParams } from 'react-router-dom'
const FinanceHub = lazy(() => import('./FinanceHub'))
const ClfList = lazy(() => import('./ClfList'))
const ClfRecordPage = lazy(() => import('./ClfRecord'))
const GstHub = lazy(() => import('./GstHub'))
const GstMapping = lazy(() => import('./GstMapping'))
const GstInvoiceHub = lazy(() => import('./GstInvoiceHub'))
const GstInvoiceData = lazy(() => import('./GstInvoiceData'))
const GstInvoiceEntry = lazy(() => import('./GstInvoiceEntry'))
const GstList = lazy(() => import('./GstList'))
const GstRecordPage = lazy(() => import('./GstRecord'))
const SdList = lazy(() => import('./SdList'))
const SdRecordPage = lazy(() => import('./SdRecord'))
const HrPaymentsHub = lazy(() => import('./HrPaymentsHub'))
const StaffSalaryList = lazy(() => import('./StaffSalaryList'))
const StaffSalaryRecordPage = lazy(() => import('./StaffSalaryRecord'))
const StaffExpenseList = lazy(() => import('./StaffExpenseList'))
const StaffExpenseRecordPage = lazy(() => import('./StaffExpenseRecord'))
const AccountManagementHub = lazy(() => import('./AccountManagementHub'))
const SettlementBankHub = lazy(() => import('./SettlementBankHub'))
const AccountMappingList = lazy(() => import('./AccountMappingList'))
const SettlementAccountMappingForm = lazy(() => import('./SettlementAccountMappingForm'))
const AcChangeRequestList = lazy(() => import('./AcChangeRequestList'))
const AcChangeRequestForm = lazy(() => import('./AcChangeRequestForm'))
const AccountOpeningList = lazy(() => import('./AccountOpeningList'))
const TdsComplianceList = lazy(() => import('./TdsComplianceList'))
// keyed by :id so moving between records (or new → created) remounts with fresh form state
function ClfRecordRoute() {
  const { id = '' } = useParams()
  return <ClfRecordPage key={id} />
}
function GstRecordRoute() {
  const { id = '' } = useParams()
  return <GstRecordPage key={id} />
}
// The old Finance Payout pages duplicated Payout Management (/finance/payouts/*, registered in App.tsx).
// Old URLs (bookmarks, report links) land on the new module.
const toPayouts = <Navigate to="/finance/payouts" replace />
function SdRecordRoute() {
  const { id = '' } = useParams()
  return <SdRecordPage key={id} />
}
function StaffSalaryRecordRoute() {
  const { id = '' } = useParams()
  return <StaffSalaryRecordPage key={id} />
}
function StaffExpenseRecordRoute() {
  const { id = '' } = useParams()
  return <StaffExpenseRecordPage key={id} />
}

export const financeRoutes = [
  <Route key="finance-hub" path="/finance" element={<FinanceHub />} />,
  <Route key="finance-acc-mgmt" path="/finance/account-management" element={<AccountManagementHub />} />,
  <Route key="finance-acc-payout" path="/finance/account-management/payout" element={toPayouts} />,
  <Route key="finance-acc-payout-new" path="/finance/account-management/payout/new" element={toPayouts} />,
  <Route key="finance-acc-payout-id" path="/finance/account-management/payout/:id" element={toPayouts} />,
  <Route key="finance-settlement-bank" path="/finance/settlement-bank" element={<SettlementBankHub />} />,
  <Route key="finance-acc-settlement-bank" path="/finance/account-management/settlement-bank" element={<SettlementBankHub />} />,
  <Route key="finance-settlement-bank-mapping" path="/finance/settlement-bank/account-mapping" element={<AccountMappingList />} />,
  <Route key="finance-settlement-bank-mapping-new" path="/finance/settlement-bank/account-mapping/new" element={<SettlementAccountMappingForm />} />,
  <Route key="finance-settlement-bank-mapping-id" path="/finance/settlement-bank/account-mapping/:id" element={<SettlementAccountMappingForm />} />,
  <Route key="finance-acc-settlement-bank-mapping" path="/finance/account-management/settlement-bank/account-mapping" element={<AccountMappingList />} />,
  <Route key="finance-acc-settlement-bank-mapping-new" path="/finance/account-management/settlement-bank/account-mapping/new" element={<SettlementAccountMappingForm />} />,
  <Route key="finance-acc-settlement-bank-mapping-id" path="/finance/account-management/settlement-bank/account-mapping/:id" element={<SettlementAccountMappingForm />} />,
  <Route key="finance-settlement-bank-ac-change" path="/finance/settlement-bank/ac-change-request" element={<AcChangeRequestList />} />,
  <Route key="finance-settlement-bank-ac-change-new" path="/finance/settlement-bank/ac-change-request/new" element={<AcChangeRequestForm />} />,
  <Route key="finance-settlement-bank-ac-change-id" path="/finance/settlement-bank/ac-change-request/:id" element={<AcChangeRequestForm />} />,
  <Route key="finance-acc-settlement-bank-ac-change" path="/finance/account-management/settlement-bank/ac-change-request" element={<AcChangeRequestList />} />,
  <Route key="finance-acc-settlement-bank-ac-change-new" path="/finance/account-management/settlement-bank/ac-change-request/new" element={<AcChangeRequestForm />} />,
  <Route key="finance-acc-settlement-bank-ac-change-id" path="/finance/account-management/settlement-bank/ac-change-request/:id" element={<AcChangeRequestForm />} />,
  <Route key="finance-settlement-bank-opening" path="/finance/settlement-bank/account-opening" element={<AccountOpeningList />} />,
  <Route key="finance-acc-settlement-bank-opening" path="/finance/account-management/settlement-bank/account-opening" element={<AccountOpeningList />} />,
  <Route key="finance-tds-compliance" path="/finance/tds-compliance" element={<TdsComplianceList />} />,
  <Route key="finance-acc-tds-compliance" path="/finance/account-management/tds-compliance" element={<TdsComplianceList />} />,
  <Route key="finance-hr-payments" path="/finance/hr-payments" element={<HrPaymentsHub />} />,
  <Route key="finance-hr-salary" path="/finance/hr-payments/salary" element={<StaffSalaryList />} />,
  <Route key="finance-hr-salary-new" path="/finance/hr-payments/salary/new" element={<StaffSalaryRecordRoute />} />,
  <Route key="finance-hr-salary-id" path="/finance/hr-payments/salary/:id" element={<StaffSalaryRecordRoute />} />,
  <Route key="finance-hr-expenses" path="/finance/hr-payments/expenses" element={<StaffExpenseList />} />,
  <Route key="finance-hr-expenses-new" path="/finance/hr-payments/expenses/new" element={<StaffExpenseRecordRoute />} />,
  <Route key="finance-hr-expenses-id" path="/finance/hr-payments/expenses/:id" element={<StaffExpenseRecordRoute />} />,
  <Route key="finance-sd" path="/finance/sd" element={<SdList />} />,
  <Route key="finance-sd-new" path="/finance/sd/new" element={<SdRecordRoute />} />,
  <Route key="finance-sd-id" path="/finance/sd/:id" element={<SdRecordRoute />} />,
  <Route key="operations-sd" path="/operations/security-deposit" element={<SdList />} />,
  <Route key="operations-sd-new" path="/operations/security-deposit/new" element={<SdRecordRoute />} />,
  <Route key="operations-sd-id" path="/operations/security-deposit/:id" element={<SdRecordRoute />} />,
  <Route key="reports-financial-sd" path="/reports/financial/sd" element={<SdList />} />,
  <Route key="finance-clf" path="/finance/clf" element={<ClfList />} />,
  <Route key="finance-clf-new" path="/finance/clf/new" element={<ClfRecordRoute />} />,
  <Route key="finance-clf-id" path="/finance/clf/:id" element={<ClfRecordRoute />} />,
  <Route key="operations-daily-clf" path="/operations/daily-operations/clf" element={<ClfList />} />,
  <Route key="operations-daily-clf-new" path="/operations/daily-operations/clf/new" element={<ClfRecordRoute />} />,
  <Route key="operations-daily-clf-id" path="/operations/daily-operations/clf/:id" element={<ClfRecordRoute />} />,
  <Route key="operations-clf" path="/operations/clf" element={<ClfList />} />,
  <Route key="operations-clf-new" path="/operations/clf/new" element={<ClfRecordRoute />} />,
  <Route key="operations-clf-id" path="/operations/clf/:id" element={<ClfRecordRoute />} />,
  <Route key="reports-financial-clf" path="/reports/financial/clf" element={<ClfList />} />,
  // GST Module Routes
  <Route key="finance-gst" path="/finance/gst" element={<GstHub />} />,
  <Route key="finance-gst-mapping" path="/finance/gst/mapping" element={<GstMapping />} />,
  <Route key="finance-gst-invoice" path="/finance/gst/invoice" element={<GstInvoiceHub />} />,
  <Route key="finance-gst-invoice-data" path="/finance/gst/invoice/data" element={<GstInvoiceData />} />,
  <Route key="finance-gst-invoices" path="/finance/gst/invoices" element={<GstInvoiceData />} />,
  <Route key="finance-gst-invoice-new" path="/finance/gst/invoice/new" element={<GstInvoiceEntry />} />,
  <Route key="finance-gst-invoice-edit" path="/finance/gst/invoice/:id/edit" element={<GstInvoiceEntry />} />,
  <Route key="finance-gst-new" path="/finance/gst/new" element={<GstInvoiceEntry />} />,
  <Route key="finance-gst-id" path="/finance/gst/:id" element={<GstInvoiceEntry />} />,
  <Route key="finance-gst-legacy-list" path="/finance/gst/legacy-list" element={<GstList />} />,
  <Route key="finance-gst-legacy-record" path="/finance/gst/legacy-record/:id" element={<GstRecordRoute />} />,
  <Route key="finance-payout" path="/finance/payout" element={toPayouts} />,
  <Route key="finance-payout-new" path="/finance/payout/new" element={toPayouts} />,
  <Route key="finance-payout-id" path="/finance/payout/:id" element={toPayouts} />,
]
