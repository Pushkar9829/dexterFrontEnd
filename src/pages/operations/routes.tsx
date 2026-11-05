import { Route } from 'react-router-dom'
import OperationsHub from './OperationsHub'
import CashLoadingHub from './CashLoadingHub'
import CashLoadingOverview from './CashLoadingOverview'
import CashLoadingRegister from './CashLoadingRegister'
import CashLoadingForm from './CashLoadingForm'
import WlaStatementList from './WlaStatementList'
import WlaStatementUpload from './WlaStatementUpload'
import TdsLettersList from './TdsLettersList'
import TdsLetterUpload from './TdsLetterUpload'
import TxnDataList from './TxnDataList'
import TxnDataDaily from './TxnDataDaily'
import EodHub from './EodHub'
import EodOverview from './EodOverview'
import MonthlyEodList from './MonthlyEodList'
import CrmEodDocketList from './CrmEodDocketList'
import CrmEodDocketForm from './CrmEodDocketForm'
import ReconciliationHub from './ReconciliationHub'
import FailedTxnsDisputeList from './FailedTxnsDisputeList'
import FailedTxnsDisputeCreate from './FailedTxnsDisputeCreate'
import ChargeBackDisputeList from './ChargeBackDisputeList'
import ChargeBackDisputeForm from './ChargeBackDisputeForm'
import DaakHub from './daak/DaakHub'
import RpRollsList from './rp-rolls/RpRollsList'
import RpRollsEntryForm from './rp-rolls/RpRollsEntryForm'
import HampReport from './HampReport'

export const operationsRoutes = [
  <Route key="ops-hamp-report" path="/operations/hamp-report" element={<HampReport />} />,
  <Route key="ops-hamp" path="/operations/hamp" element={<HampReport />} />,
  <Route key="ops-hub" path="/operations" element={<OperationsHub />} />,
  <Route key="ops-rp-rolls" path="/operations/rp-rolls" element={<RpRollsList />} />,
  <Route key="ops-rp-rolls-entry" path="/operations/rp-rolls/entry" element={<RpRollsEntryForm />} />,
  <Route key="ops-rp-rolls-request" path="/operations/rp-rolls/request" element={<RpRollsEntryForm />} />,
  <Route key="ops-rp-rolls-new" path="/operations/rp-rolls/new" element={<RpRollsEntryForm />} />,
  <Route key="ops-daak" path="/operations/daak" element={<DaakHub />} />,
  <Route key="ops-daak-sub" path="/operations/daak/:sub" element={<DaakHub />} />,
  // Cash Loading Module: Hub tiles, Overview report (SF), and Register
  <Route key="ops-cash-loading" path="/operations/cash-loading" element={<CashLoadingHub />} />,
  <Route key="ops-cash-loading-overview" path="/operations/cash-loading/overview" element={<CashLoadingOverview />} />,
  <Route key="ops-cash-loading-register" path="/operations/cash-loading/register" element={<CashLoadingRegister />} />,
  <Route key="ops-cash-loading-list" path="/operations/cash-loading/list" element={<CashLoadingRegister />} />,
  <Route key="ops-cash-loading-data" path="/operations/cash-loading/data" element={<CashLoadingRegister />} />,
  <Route key="ops-cash-loading-new" path="/operations/cash-loading/new" element={<CashLoadingForm />} />,
  <Route key="ops-cash-loading-reg-new" path="/operations/cash-loading/register/new" element={<CashLoadingForm />} />,
  <Route key="ops-cash-loading-edit" path="/operations/cash-loading/edit" element={<CashLoadingForm />} />,
  <Route key="ops-cash-loading-edit-id" path="/operations/cash-loading/edit/:id" element={<CashLoadingForm />} />,
  <Route key="ops-wla" path="/operations/wla-statement" element={<WlaStatementList />} />,
  <Route key="ops-wla-upload" path="/operations/wla-statement/upload" element={<WlaStatementUpload />} />,
  <Route key="ops-wla-new" path="/operations/wla-statement/new" element={<WlaStatementUpload />} />,
  <Route key="ops-bank" path="/operations/bank-statement" element={<WlaStatementList />} />,
  <Route key="ops-bank-upload" path="/operations/bank-statement/upload" element={<WlaStatementUpload />} />,
  <Route key="ops-tds" path="/operations/tds" element={<TdsLettersList />} />,
  <Route key="ops-tds-upload" path="/operations/tds/upload" element={<TdsLetterUpload />} />,
  <Route key="ops-tds-new" path="/operations/tds/new" element={<TdsLetterUpload />} />,
  <Route key="ops-txn" path="/operations/txn-data" element={<TxnDataList />} />,
  <Route key="ops-txn-new" path="/operations/txn-data/new" element={<TxnDataDaily />} />,
  <Route key="ops-txn-daily" path="/operations/txn-data/daily" element={<TxnDataDaily />} />,
  <Route key="ops-eod" path="/operations/eod" element={<EodHub />} />,
  <Route key="ops-eod-overview" path="/operations/eod/overview" element={<EodOverview />} />,
  <Route key="ops-eod-monthly" path="/operations/eod/monthly" element={<MonthlyEodList />} />,
  <Route key="ops-eod-crm" path="/operations/eod/crm" element={<CrmEodDocketList />} />,
  <Route key="ops-eod-crm-new" path="/operations/eod/crm/new" element={<CrmEodDocketForm />} />,
  <Route key="ops-crm-eod" path="/operations/crm-eod" element={<CrmEodDocketList />} />,
  <Route key="ops-crm-eod-new" path="/operations/crm-eod/new" element={<CrmEodDocketForm />} />,
  <Route key="ops-reco" path="/operations/reconciliation" element={<ReconciliationHub />} />,
  <Route key="ops-reco-failed" path="/operations/reconciliation/failed-txns" element={<FailedTxnsDisputeList />} />,
  <Route key="ops-reco-failed-new" path="/operations/reconciliation/failed-txns/new" element={<FailedTxnsDisputeCreate />} />,
  <Route key="ops-reco-cb" path="/operations/reconciliation/charge-back" element={<ChargeBackDisputeList />} />,
  <Route key="ops-reco-cb-new" path="/operations/reconciliation/charge-back/new" element={<ChargeBackDisputeForm />} />,
]

