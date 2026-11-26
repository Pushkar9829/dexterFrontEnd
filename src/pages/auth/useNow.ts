import { useEffect, useState } from 'react'

/** Current time, refreshed every `ms` (for OTP / TOTP countdowns). Timer is cleaned up. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}
