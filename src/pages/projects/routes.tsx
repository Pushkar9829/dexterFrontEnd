import { lazy } from 'react'
import { Route } from 'react-router-dom'
const ProjectRegister = lazy(() => import('./ProjectRegister'))
const ProjectRecord = lazy(() => import('./ProjectRecord'))
const ProjectAudit = lazy(() => import('./ProjectAudit'))
const ProjectsHub = lazy(() => import('./ProjectsHub'))
const SiteInstallationList = lazy(() => import('./SiteInstallationList'))
const SiteInstallationForm = lazy(() => import('./SiteInstallationForm'))
export const projectRoutes = [
  <Route key="projects" path="/projects" element={<ProjectsHub />} />,
  <Route key="projects-active" path="/projects/active" element={<ProjectRegister />} />,
  <Route key="projects-complete" path="/projects/complete" element={<ProjectRegister />} />,
  <Route key="projects-incomplete" path="/projects/incomplete" element={<ProjectRegister />} />,
  <Route key="projects-closed" path="/projects/closed" element={<ProjectRegister />} />,
  <Route key="projects-ai-overview" path="/projects/ai-overview" element={<ProjectRegister />} />,
  <Route key="projects-archived" path="/projects/archived" element={<ProjectRegister />} />,
  <Route key="projects-installation" path="/projects/installation" element={<SiteInstallationList />} />,
  <Route key="projects-installation-new" path="/projects/installation/new" element={<SiteInstallationForm />} />,
  <Route key="projects-installation-edit" path="/projects/installation/:id" element={<SiteInstallationForm />} />,
  <Route key="projects-site-readiness" path="/projects/site-readiness/site-number" element={<SiteInstallationForm />} />,
  <Route key="projects-other" path="/projects/other" element={<ProjectRegister />} />,
  <Route key="projects-other-closed" path="/projects/other/closed" element={<ProjectRegister />} />,
  <Route key="projects-active-record" path="/projects/active/:projectId" element={<ProjectRecord />} />,
  <Route key="projects-archived-record" path="/projects/archived/:projectId" element={<ProjectRecord />} />,
  <Route key="projects-active-audit" path="/projects/active/:projectId/audit" element={<ProjectAudit />} />,
  <Route key="projects-archived-audit" path="/projects/archived/:projectId/audit" element={<ProjectAudit />} />,
]
