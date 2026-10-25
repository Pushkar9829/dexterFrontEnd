import { createStore } from '@/lib/store'
import {
  SEED_EMPLOYEES,
  createEmptyEmployee,
  type Employee,
  type EmployeeStatus,
} from './employees'

export const employeeStore = createStore<Employee[]>(
  'dexter.employees.v1',
  () => SEED_EMPLOYEES,
)

export const useEmployees = () => employeeStore.use()

export function getEmployee(idOrCode: string): Employee | undefined {
  const all = employeeStore.get()
  return all.find(
    (e) =>
      e.id === idOrCode ||
      e.employeeCode.toLowerCase() === idOrCode.toLowerCase() ||
      e.tpCode.toLowerCase() === idOrCode.toLowerCase(),
  )
}

export function nextEmployeeCode(): string {
  const all = employeeStore.get()
  const highestNum = all.reduce((max, e) => {
    const match = e.employeeCode.match(/(\d+)$/)
    if (match) {
      const num = parseInt(match[1], 10)
      return Math.max(max, num)
    }
    return max
  }, 252615)
  return `DITMP${highestNum + 1}`
}

export function nextTpCode(): string {
  const all = employeeStore.get()
  const highestNum = all.reduce((max, e) => {
    const match = e.tpCode.match(/(\d+)$/)
    if (match) {
      const num = parseInt(match[1], 10)
      return Math.max(max, num)
    }
    return max
  }, 33694)
  return `TP${highestNum + 1}`
}

export function saveEmployee(employee: Employee): Employee {
  const now = new Date().toISOString()
  const existing = employee.id ? getEmployee(employee.id) : undefined

  const toSave: Employee = {
    ...employee,
    id: existing?.id || employee.id || `EMP-2025-${String(Date.now()).slice(-4)}`,
    employeeCode: employee.employeeCode || existing?.employeeCode || nextEmployeeCode(),
    tpCode: employee.tpCode || existing?.tpCode || nextTpCode(),
    updatedAt: now,
    createdAt: existing?.createdAt || now,
  }

  employeeStore.set((list) => {
    const exists = list.some((e) => e.id === toSave.id)
    if (exists) {
      return list.map((e) => (e.id === toSave.id ? toSave : e))
    }
    return [toSave, ...list]
  })

  return toSave
}

export function deleteEmployee(id: string) {
  employeeStore.set((list) => list.filter((e) => e.id !== id))
}

export function setEmployeeStatus(ids: string[], status: EmployeeStatus) {
  const now = new Date().toISOString()
  employeeStore.set((list) =>
    list.map((e) => (ids.includes(e.id) ? { ...e, status, updatedAt: now } : e)),
  )
}

export { createEmptyEmployee }
