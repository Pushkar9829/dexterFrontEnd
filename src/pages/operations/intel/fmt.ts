export const fmtDT = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
