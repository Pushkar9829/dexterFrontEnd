import { lazy } from 'react'
import { Route } from 'react-router-dom'
const TasksHub = lazy(() => import('./TasksHub'))
const CommandCenter = lazy(() => import('./CommandCenter'))
const Workspace = lazy(() => import('./Workspace'))
const TaskDetail = lazy(() => import('./TaskDetail'))
const CreateTaskPage = lazy(() => import('./CreateTaskPage'))
export const taskRoutes = [
  <Route key="tasks-hub" path="/tasks" element={<TasksHub />} />,
  <Route key="tasks-create" path="/tasks/create" element={<CreateTaskPage />} />,
  <Route key="tasks-new" path="/tasks/new" element={<CreateTaskPage />} />,
  <Route key="tasks-cc" path="/tasks/command-center" element={<CommandCenter />} />,
  <Route key="tasks-my" path="/tasks/my" element={<Workspace key="my" view="my" />} />,
  <Route key="tasks-detail" path="/tasks/my/:taskId" element={<TaskDetail />} />,
  <Route key="tasks-today" path="/tasks/today" element={<Workspace key="today" view="today" />} />,
  <Route key="tasks-daily" path="/tasks/daily" element={<Workspace key="daily" view="daily" />} />,
  <Route key="tasks-monthly" path="/tasks/monthly" element={<Workspace key="monthly" view="monthly" />} />,
  <Route key="tasks-overdue" path="/tasks/overdue" element={<Workspace key="overdue" view="overdue" />} />,
  <Route key="tasks-blocked" path="/tasks/blocked" element={<Workspace key="blocked" view="blocked" />} />,
  <Route key="tasks-approval" path="/tasks/approval-pending" element={<Workspace key="approval" view="approval" />} />,
]
