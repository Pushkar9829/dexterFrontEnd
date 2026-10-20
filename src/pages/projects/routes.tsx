import { Route } from 'react-router-dom'
import ProjectRegister from './ProjectRegister'
import ProjectRecord from './ProjectRecord'
import ProjectAudit from './ProjectAudit'
import ProjectsHub from './ProjectsHub'
import Placeholder from '../Placeholder'

export const projectRoutes = [
  <Route key="projects" path="/projects" element={<ProjectsHub />} />,
  <Route key="projects-active" path="/projects/active" element={<ProjectRegister />} />,
  <Route key="projects-archived" path="/projects/archived" element={<ProjectRegister />} />,
  <Route key="projects-installation" path="/projects/installation" element={<Placeholder />} />,
  <Route key="projects-other" path="/projects/other" element={<Placeholder />} />,
  <Route key="projects-active-record" path="/projects/active/:projectId" element={<ProjectRecord />} />,
  <Route key="projects-archived-record" path="/projects/archived/:projectId" element={<ProjectRecord />} />,
  <Route key="projects-active-audit" path="/projects/active/:projectId/audit" element={<ProjectAudit />} />,
  <Route key="projects-archived-audit" path="/projects/archived/:projectId/audit" element={<ProjectAudit />} />,
]
