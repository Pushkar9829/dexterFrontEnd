import { Route } from 'react-router-dom'
import HrmsHub from './HrmsHub'
import HrmsAttendance from './HrmsAttendance'
import HrmsExpenses from './HrmsExpenses'

export const hrmsRoutes = [
  <Route key="hrms-hub" path="/hrms" element={<HrmsHub />} />,
  <Route key="hrms-attendance" path="/hrms/attendance" element={<HrmsAttendance />} />,
  <Route key="hrms-expenses" path="/hrms/expenses" element={<HrmsExpenses />} />,
]
