import { Navigate, Route } from 'react-router-dom'
import ProjectRegister from './ProjectRegister'
import ProjectRecord from './ProjectRecord'
import ProjectAudit from './ProjectAudit'

export const projectRoutes = [
  <Route key="projects" path="/projects" element={<Navigate to="/projects/active" replace />} />,
  <Route key="projects-active" path="/projects/active" element={<ProjectRegister />} />,
  <Route key="projects-archived" path="/projects/archived" element={<ProjectRegister />} />,
  <Route key="projects-active-record" path="/projects/active/:projectId" element={<ProjectRecord />} />,
  <Route key="projects-archived-record" path="/projects/archived/:projectId" element={<ProjectRecord />} />,
  <Route key="projects-active-audit" path="/projects/active/:projectId/audit" element={<ProjectAudit />} />,
  <Route key="projects-archived-audit" path="/projects/archived/:projectId/audit" element={<ProjectAudit />} />,
]
