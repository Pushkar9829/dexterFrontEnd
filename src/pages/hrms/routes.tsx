import { lazy } from 'react'
import { Route } from 'react-router-dom'
const HrmsHub = lazy(() => import('./HrmsHub'))
const HrmsAttendance = lazy(() => import('./HrmsAttendance'))
const HrmsExpenses = lazy(() => import('./HrmsExpenses'))
const HrmsLeave = lazy(() => import('./HrmsLeave'))
export const hrmsRoutes = [
  <Route key="hrms-hub" path="/hrms" element={<HrmsHub />} />,
  <Route key="hrms-attendance" path="/hrms/attendance" element={<HrmsAttendance />} />,
  <Route key="hrms-expenses" path="/hrms/expenses" element={<HrmsExpenses />} />,
  <Route key="hrms-leave" path="/hrms/leave" element={<HrmsLeave />} />,
]
