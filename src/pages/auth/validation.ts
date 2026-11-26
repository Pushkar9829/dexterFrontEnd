export const isPhone = (v: string) => /^[6-9]\d{9}$/.test(v.replace(/\D/g, ''))
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())

// Password rules now come from the central policy: passwordRules(policy) in '@/data/security' (§4).
