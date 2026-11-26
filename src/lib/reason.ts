/**
 * Ask for a mandatory reason (soft deletes and other audited actions the backend refuses without one).
 * Returns the trimmed reason, or null when the user cancels.
 */
export function promptReason(what: string, min = 3): string | null {
  for (;;) {
    const r = window.prompt(`${what}\n\nReason (required, at least ${min} characters):`)
    if (r === null) return null
    if (r.trim().length >= min) return r.trim()
    window.alert(`A reason of at least ${min} characters is required.`)
  }
}
