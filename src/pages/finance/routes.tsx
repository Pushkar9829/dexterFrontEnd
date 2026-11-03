import { Route, useParams } from 'react-router-dom'
import FinanceHub from './FinanceHub'
import ClfList from './ClfList'
import ClfRecordPage from './ClfRecord'
import GstHub from './GstHub'
import GstMapping from './GstMapping'
import GstInvoiceHub from './GstInvoiceHub'
import GstInvoiceData from './GstInvoiceData'
import GstInvoiceEntry from './GstInvoiceEntry'
import GstList from './GstList'
import GstRecordPage from './GstRecord'
import PayoutList from './PayoutList'
import PayoutRecordPage from './PayoutRecord'
import SdList from './SdList'
import SdRecordPage from './SdRecord'

import HrPaymentsHub from './HrPaymentsHub'
import StaffSalaryList from './StaffSalaryList'
import StaffSalaryRecordPage from './StaffSalaryRecord'
import StaffExpenseList from './StaffExpenseList'
import StaffExpenseRecordPage from './StaffExpenseRecord'

import AccountManagementHub from './AccountManagementHub'
import SettlementBankHub from './SettlementBankHub'
import AccountMappingList from './AccountMappingList'
import SettlementAccountMappingForm from './SettlementAccountMappingForm'
import AcChangeRequestList from './AcChangeRequestList'
import AcChangeRequestForm from './AcChangeRequestForm'
import AccountOpeningList from './AccountOpeningList'
import TdsComplianceList from './TdsComplianceList'

// keyed by :id so moving between records (or new → created) remounts with fresh form state
function ClfRecordRoute() {
  const { id = '' } = useParams()
  return <ClfRecordPage key={id} />
}
function GstRecordRoute() {
  const { id = '' } = useParams()
  return <GstRecordPage key={id} />
}
function PayoutRecordRoute() {
  const { id = '' } = useParams()
  return <PayoutRecordPage key={id} />
}
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
  <Route key="finance-acc-payout" path="/finance/account-management/payout" element={<PayoutList />} />,
  <Route key="finance-acc-payout-new" path="/finance/account-management/payout/new" element={<PayoutRecordRoute />} />,
  <Route key="finance-acc-payout-id" path="/finance/account-management/payout/:id" element={<PayoutRecordRoute />} />,
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
  <Route key="finance-payout" path="/finance/payout" element={<PayoutList />} />,
  <Route key="finance-payout-new" path="/finance/payout/new" element={<PayoutRecordRoute />} />,
  <Route key="finance-payout-id" path="/finance/payout/:id" element={<PayoutRecordRoute />} />,
]
