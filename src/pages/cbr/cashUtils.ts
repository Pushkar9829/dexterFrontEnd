// Non-component helpers shared by the CBR / Cash Loading / ALF pages (kept out of component files for fast refresh).
export const inr = (n: number) => `₹ ${Math.round(n).toLocaleString('en-IN')}`
export const cbrBase = (pathname: string) => (pathname.startsWith('/operations/cbr') ? '/operations/cbr' : '/cbr')
