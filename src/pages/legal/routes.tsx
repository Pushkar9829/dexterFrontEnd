import { Route } from 'react-router-dom'
import LegalData from './LegalData'
import SiteRecord from './SiteRecord'
import DocumentDetail from './DocumentDetail'
import DocumentAudit from './DocumentAudit'
import FranchiseeApp from './FranchiseeApp'
import LegalHub from './LegalHub'
import AddLoi from './AddLoi'
import LoiList from './LoiList'
import AffidavitList from './AffidavitList'
import AddAffidavit from './AddAffidavit'
import AgreementList from './AgreementList'
import AddAgreement from './AddAgreement'
import PvcList from './PvcList'
import PvcForm from './PvcForm'
import PvcRecord from './PvcRecord'
import FmChecksList from './FmChecksList'
import FmChecksForm from './FmChecksForm'
import FmChecksRecord from './FmChecksRecord'
import OtherDocList from './OtherDocList'
import OtherDocForm from './OtherDocForm'
import OtherDocRecord from './OtherDocRecord'

export const legalRoutes = [
  <Route key="legal" path="/legal" element={<LegalHub />} />,
  <Route key="legal-loi-new" path="/legal/loi/new" element={<AddLoi />} />,
  <Route key="legal-loi-add" path="/legal/loi/add" element={<AddLoi />} />,
  <Route key="legal-loi" path="/legal/loi" element={<LoiList />} />,
  <Route key="legal-affidavit-new" path="/legal/affidavit/new" element={<AddAffidavit />} />,
  <Route key="legal-affidavit-add" path="/legal/affidavit/add" element={<AddAffidavit />} />,
  <Route key="legal-affidavit" path="/legal/affidavit" element={<AffidavitList />} />,
  <Route key="legal-agreement-new" path="/legal/agreement/new" element={<AddAgreement />} />,
  <Route key="legal-agreement-add" path="/legal/agreement/add" element={<AddAgreement />} />,
  <Route key="legal-agreement" path="/legal/agreement" element={<AgreementList />} />,
  <Route key="legal-fm-checks-new" path="/legal/fm-checks/new" element={<FmChecksForm />} />,
  <Route key="legal-fm-checks-add" path="/legal/fm-checks/add" element={<FmChecksForm />} />,
  <Route key="legal-fm-checks-edit" path="/legal/fm-checks/:id/edit" element={<FmChecksForm />} />,
  <Route key="legal-fm-checks-detail" path="/legal/fm-checks/:id" element={<FmChecksRecord />} />,
  <Route key="legal-fm-checks" path="/legal/fm-checks" element={<FmChecksList />} />,
  <Route key="legal-cheques-new" path="/legal/cheques/new" element={<FmChecksForm />} />,
  <Route key="legal-cheques-add" path="/legal/cheques/add" element={<FmChecksForm />} />,
  <Route key="legal-cheques-edit" path="/legal/cheques/:id/edit" element={<FmChecksForm />} />,
  <Route key="legal-cheques-detail" path="/legal/cheques/:id" element={<FmChecksRecord />} />,
  <Route key="legal-cheques" path="/legal/cheques" element={<FmChecksList />} />,
  <Route key="legal-pvc-new" path="/legal/pvc/new" element={<PvcForm />} />,
  <Route key="legal-pvc-add" path="/legal/pvc/add" element={<PvcForm />} />,
  <Route key="legal-pvc-edit" path="/legal/pvc/:id/edit" element={<PvcForm />} />,
  <Route key="legal-pvc-detail" path="/legal/pvc/:id" element={<PvcRecord />} />,
  <Route key="legal-pvc" path="/legal/pvc" element={<PvcList />} />,
  <Route key="legal-other-new" path="/legal/other-documents/new" element={<OtherDocForm />} />,
  <Route key="legal-other-add" path="/legal/other-documents/add" element={<OtherDocForm />} />,
  <Route key="legal-other-edit" path="/legal/other-documents/:id/edit" element={<OtherDocForm />} />,
  <Route key="legal-other-detail" path="/legal/other-documents/:id" element={<OtherDocRecord />} />,
  <Route key="legal-other" path="/legal/other-documents" element={<OtherDocList />} />,
  <Route key="legal-data" path="/legal/data" element={<LegalData />} />,
  <Route key="legal-site" path="/legal/:siteId" element={<SiteRecord />} />,
  <Route key="legal-doc" path="/legal/:siteId/documents/:docId" element={<DocumentDetail />} />,
  <Route key="legal-doc-audit" path="/legal/:siteId/documents/:docId/audit" element={<DocumentAudit />} />,
  <Route key="franchisee-app" path="/franchisee-app" element={<FranchiseeApp />} />,
  <Route key="franchisee-app-doc" path="/franchisee-app/:docId" element={<FranchiseeApp />} />,
]

