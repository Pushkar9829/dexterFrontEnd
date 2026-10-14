// Client-side export of the visible grid. Saved as CSV (opens in Excel) until the backend
// provides real .xlsx exports.
export function downloadCsv(name: string, headers: string[], rows: string[][]) {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const csv = [headers, ...rows].map((r) => r.map((v) => esc(v ?? '')).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name.replace(/[^\w.-]+/g, '_')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
