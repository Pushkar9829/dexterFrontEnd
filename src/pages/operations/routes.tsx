import { Route } from 'react-router-dom'
import OperationsHub from './OperationsHub'
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

export const operationsRoutes = [
  <Route key="ops-hub" path="/operations" element={<OperationsHub />} />,
  <Route key="ops-daak" path="/operations/daak" element={<DaakHub />} />,
  <Route key="ops-daak-sub" path="/operations/daak/:sub" element={<DaakHub />} />,
  <Route key="ops-cash-loading" path="/operations/cash-loading" element={<CashLoadingRegister />} />,
  <Route key="ops-cash-loading-new" path="/operations/cash-loading/new" element={<CashLoadingForm />} />,
  <Route key="ops-cash-loading-edit" path="/operations/cash-loading/edit" element={<CashLoadingForm />} />,
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

