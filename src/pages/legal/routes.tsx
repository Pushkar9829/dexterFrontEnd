import { Route } from 'react-router-dom'
import LegalData from './LegalData'
import SiteRecord from './SiteRecord'
import DocumentDetail from './DocumentDetail'
import DocumentAudit from './DocumentAudit'
import FranchiseeApp from './FranchiseeApp'

export const legalRoutes = [
  <Route key="legal" path="/legal" element={<LegalData />} />,
  <Route key="legal-site" path="/legal/:siteId" element={<SiteRecord />} />,
  <Route key="legal-doc" path="/legal/:siteId/documents/:docId" element={<DocumentDetail />} />,
  <Route key="legal-doc-audit" path="/legal/:siteId/documents/:docId/audit" element={<DocumentAudit />} />,
  <Route key="franchisee-app" path="/franchisee-app" element={<FranchiseeApp />} />,
  <Route key="franchisee-app-doc" path="/franchisee-app/:docId" element={<FranchiseeApp />} />,
]
