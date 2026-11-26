import { lazy } from 'react'
import { Route } from 'react-router-dom'
const EmailTemplates = lazy(() => import('./EmailTemplates'))
const EmailTemplateForm = lazy(() => import('./EmailTemplateForm'))
import Hierarchy from './Hierarchy'
const EmailLog = lazy(() => import('./EmailLog'))
import Notifications from './Notifications'
const AddressMaster = lazy(() => import('./AddressMaster'))
import Checklists from './Checklists'
const WorkflowTasks = lazy(() => import('./WorkflowTasks'))
const WorkflowAudit = lazy(() => import('./WorkflowAudit'))
// Centralized Workflow & Communication Engine screens (Operations §14 / §10.1, Project §8 / §5.5).
export const workflowRoutes = [
  <Route key="wf-templates" path="/setup/email-templates" element={<EmailTemplates />} />,
  <Route key="wf-template-new" path="/setup/email-templates/new" element={<EmailTemplateForm />} />,
  <Route key="wf-template-edit" path="/setup/email-templates/:code" element={<EmailTemplateForm />} />,
  <Route key="wf-hierarchy" path="/setup/hierarchy" element={<Hierarchy />} />,
  <Route key="wf-email-log" path="/setup/email-log" element={<EmailLog />} />,
  <Route key="wf-notifications" path="/setup/notifications" element={<Notifications />} />,
  <Route key="wf-addresses" path="/setup/address-master" element={<AddressMaster />} />,
  <Route key="wf-checklists" path="/setup/checklists" element={<Checklists />} />,
  <Route key="wf-audit" path="/setup/workflow-audit" element={<WorkflowAudit />} />,
  <Route key="wf-tasks" path="/work-management/workflow-tasks" element={<WorkflowTasks />} />,
]

const SETUP = ['Onboarding', 'Setup']
export const workflowCrumbs: Record<string, string[]> = {
  '/setup/email-templates': [...SETUP, 'Email Templates'],
  '/setup/email-templates/new': [...SETUP, 'Email Templates', 'New Template'],
  '/setup/email-templates/:code': [...SETUP, 'Email Templates', 'Edit Template'],
  '/setup/hierarchy': [...SETUP, 'Hierarchy & Escalation'],
  '/setup/email-log': [...SETUP, 'Email Templates', 'Email Log'],
  '/setup/notifications': [...SETUP, 'Notifications'],
  '/setup/address-master': [...SETUP, 'Address Master'],
  '/setup/checklists': [...SETUP, 'Installation Checklists'],
  '/setup/workflow-audit': [...SETUP, 'Workflow Audit Log'],
  '/work-management/workflow-tasks': ['Work Management', 'Workflow Tasks'],
}

export const workflowTiles: { title: string; sub: string; to: string }[] = [
  { title: 'EMAIL TEMPLATES', sub: 'Pre-set templates per module and event — subject, body variables, hierarchy recipients, timing, reminders, versions and test email.', to: '/setup/email-templates' },
  { title: 'HIERARCHY & ESCALATION', sub: 'Reporting lines, module owners, L1–L5 escalation matrix, email ID change and employee exit / replacement.', to: '/setup/hierarchy' },
  { title: 'EMAIL LOG', sub: 'Sent / failed / pending history with template code and version, record and recipients.', to: '/setup/email-log' },
  { title: 'NOTIFICATIONS', sub: 'In-app notification centre and reminder schedules (chargeback franchise 3/day, CRM 2/day).', to: '/setup/notifications' },
  { title: 'ADDRESS MASTER', sub: 'Reusable dispatch addresses with version history; dispatch records keep their own snapshot.', to: '/setup/address-master' },
  { title: 'INSTALLATION CHECKLISTS', sub: 'Initial Readiness and Equipment Installation items — statuses, photo rule, mandatory, order.', to: '/setup/checklists' },
  { title: 'WORKFLOW TASKS', sub: 'Central task list for all modules with escalation check, reassignment and completion.', to: '/work-management/workflow-tasks' },
  { title: 'WORKFLOW AUDIT LOG', sub: 'Every workflow event, template / hierarchy change, reassignment and escalation.', to: '/setup/workflow-audit' },
]
