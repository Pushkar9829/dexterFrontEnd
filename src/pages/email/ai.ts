import { trackerById, type Mail } from '@/data/email'

/* Deterministic "AI" helpers for the demo. No model is called: every output is derived
   from the thread / draft text with fixed rules, and the UI labels it "AI-generated (demo)". */

const FIXES: [RegExp, string][] = [
  [/\bplease fine the\b/gi, 'please find the'],
  [/\bworkign\b/gi, 'working'],
  [/\brecieved\b/gi, 'received'],
  [/\brecieve\b/gi, 'receive'],
  [/\bteh\b/gi, 'the'],
  [/\bcompliacne\b|\bcompliacn\b/gi, 'compliance'],
  [/\bverifaication\b|\bverifaiction\b/gi, 'verification'],
  [/\bproejct\b/gi, 'project'],
  [/\bseperately\b/gi, 'separately'],
  [/\bseperate\b/gi, 'separate'],
  [/\boccured\b/gi, 'occurred'],
  [/\buntill\b/gi, 'until'],
  [/\bdefinately\b/gi, 'definitely'],
  [/\badress\b/gi, 'address'],
  [/\bthier\b/gi, 'their'],
  [/\backnowledgment\b/gi, 'acknowledgement'],
  [/\bi am\b/g, 'I am'],
  [/ {2,}/g, ' '],
]

const keepCase = (src: string, out: string) => (src[0] && src[0] === src[0].toUpperCase() && src[0] !== src[0].toLowerCase() ? out[0].toUpperCase() + out.slice(1) : out)

export type GrammarIssue = { key: string; from: string; to: string; before: string; after: string }

/** Sentences that contain a known spelling/grammar slip, with the corrected sentence. */
export function grammarIssues(text: string): GrammarIssue[] {
  const out: GrammarIssue[] = []
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean)
  for (const s of sentences) {
    for (const [re, rep] of FIXES.slice(0, -1)) {
      const m = s.match(new RegExp(re.source, re.flags.replace('g', '')))
      if (m) {
        const fixed = s.replace(re, (x) => keepCase(x, rep))
        out.push({ key: `${m[0].toLowerCase()}|${s}`, from: m[0], to: keepCase(m[0], rep), before: s, after: fixed })
      }
    }
  }
  return out
}

export function fixGrammar(text: string) {
  let t = text
  for (const [re, rep] of FIXES) t = t.replace(re, (x) => (rep === ' ' ? rep : keepCase(x, rep)))
  // capitalise sentence starts
  t = t.replace(/(^|[.!?]\s+|\n)([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase())
  return t
}

const TONE: [RegExp, string][] = [
  [/^hi team,?/im, 'Dear Team,'],
  [/^hi ([A-Z][a-z]+),?/m, 'Dear $1,'],
  [/\bthanks for\b/gi, 'Thank you for'],
  [/\bthanks\b,?/gi, 'Thank you,'],
  [/\basap\b/gi, 'at the earliest'],
  [/\bpls\b/gi, 'please'],
  [/\bwe will update you shortly\.?/gi, 'We will keep you informed and share the next update shortly.'],
  [/\blet me know\b/gi, 'kindly let us know'],
  [/\bcan you\b/gi, 'could you kindly'],
  [/\bsorry\b/gi, 'We sincerely apologise'],
]

export function improveTone(text: string) {
  let t = text
  for (const [re, rep] of TONE) t = t.replace(re, rep)
  if (!/patience|understanding/i.test(t) && /\n(regards|warm regards|thank you),?/i.test(t)) t = t.replace(/\n(regards|warm regards),?/i, '\nThank you for your patience and understanding.\n\n$1,')
  return t
}

const FILLER = [/please let us know if anything else is required\.?/gi, /\bkindly note that\b/gi, /\bas you may be aware,?\s*/gi, /\bjust wanted to\b/gi]

/** Keep greeting + sign-off; reduce each body paragraph to its lead sentence(s). */
export function shorten(text: string) {
  const paras = text.split(/\n{2,}/)
  const trimPara = (p: string) => {
    let q = p
    FILLER.forEach((f) => (q = q.replace(f, '')))
    const sentences = q.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean)
    // keep the lead sentence (plus the next one when the lead is very short)
    return (sentences[0]?.length < 60 ? sentences.slice(0, 2) : sentences.slice(0, 1)).join(' ')
  }
  return paras
    .map((p) => {
      const trimmed = p.trim()
      if (/^(regards|warm regards|thank you|thanks|best)/i.test(trimmed)) return trimmed
      // the greeting stays; the rest of a greeting paragraph is shortened like body text
      const g = trimmed.match(/^((?:dear|hi|hello)\b[^,\n]*,)\s*([\s\S]*)$/i)
      if (g) return g[2] ? `${g[1]} ${trimPara(g[2])}` : g[1]
      return trimPara(trimmed)
    })
    .filter(Boolean)
    .join('\n\n')
}

/** Structured rewrite: greeting, purpose, key points, next step, sign-off. */
export function rewrite(text: string, ctx: { tracker?: string; to?: string }) {
  let paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  // a greeting that shares its paragraph with body text ("Dear X, please …") is split off
  const g = paras[0]?.match(/^((?:dear|hi|hello)\b[^,\n]*,)\s*([\s\S]+)$/i)
  if (g) paras = [g[1], g[2], ...paras.slice(1)]
  const greeting = paras.find((p) => /^(dear|hi|hello)\b/i.test(p)) ?? `Dear ${nameFromEmail(ctx.to)},`
  const signoff = [...paras].reverse().find((p) => /^(regards|warm regards|thank you|best)/i.test(p)) ?? 'Regards,\nDexter India Support Team'
  const body = paras.filter((p) => p !== greeting && p !== signoff).join(' ')
  const points = body.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 3)
  const tr = ctx.tracker ? trackerById(ctx.tracker) : undefined
  const purpose = tr ? `I am writing with an update on your case ${tr.id} (${tr.category}).` : 'I am writing with a quick update.'
  return [greeting, purpose, ...(points.length ? [points.map((p) => `• ${p}`).join('\n')] : []), 'Please reply to this email if you have any questions — we will keep this tracker updated.', signoff].join('\n\n')
}

export function nameFromEmail(email?: string) {
  if (!email) return 'Sir/Madam'
  const local = email.split('@')[0].replace(/[._-]+/g, ' ')
  return local.replace(/\b\w/g, (c) => c.toUpperCase())
}

const salutation = (m?: Mail) => {
  if (!m) return 'Dear Sir/Madam,'
  const name = m.folder === 'inbox' ? m.fromName : nameFromEmail(m.to[0])
  const last = name.split(' ').slice(-1)[0]
  return /support|team|desk/i.test(name) ? 'Dear Team,' : `Dear ${/a$|i$/i.test(name.split(' ')[0]) ? 'Ms.' : 'Mr.'} ${last},`
}

/** Canned, content-aware reply suggestion. */
export function suggestReply(m?: Mail) {
  const tr = trackerById(m?.tracker)
  const body = (m?.body ?? '').toLowerCase()
  const sig = 'Regards,\nDexter India Support Team'
  let core: string
  if (/technician/.test(body) && /timeline|resolution/.test(body))
    core = `Thank you for your follow-up. Our technician visited the ATM at ${tr?.customer.location ?? 'your branch'} today and identified a faulty cash dispenser module. The replacement part has been dispatched and we expect the ATM to be fully operational within 24 hours.\n\nWe will confirm once the repair is complete and the machine has been tested.`
  else if (/document|pan|cheque|gst/.test(body))
    core = 'Thank you for your email. Please find the requested documents attached. Let us know if anything further is needed to complete the verification.'
  else if (/dispute|debited|not dispensed/.test(body))
    core = `We are sorry for the inconvenience. Your dispute has been logged${tr ? ` under Tracker ID ${tr.id}` : ''} and the transaction is being reconciled with the ATM journal. Disputes of this type are usually resolved within 5 working days, and any amount found due will be credited back to your account.`
  else if (/meeting|schedule/.test(body)) core = 'Thank you for reaching out. Thursday at 3:00 PM works for us — I will share a calendar invite shortly.'
  else if (/notice|compliance/.test(body)) core = 'We acknowledge receipt of the revised compliance notice. Our legal team is reviewing it and will share the compliance report within the stipulated 7 working days.'
  else core = 'Thank you for your email. We have noted your request and will get back to you with an update shortly.'
  return `${salutation(m)}\n\n${core}\n\n${sig}`
}

/** Thread summary from the actual messages. */
export function summarize(m: Mail, thread: Mail[]) {
  const all = [m, ...thread].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  const tr = trackerById(m.tracker)
  const asks = m.body
    .split(/(?<=[.!?])\s+|\n/)
    .map((s) => s.trim())
    .filter((s) => /\?|please|kindly|confirm|let me know/i.test(s))
  const atts = all.flatMap((x) => x.attachments.map((a) => a.name))
  const lines = [
    `• ${all.length} message${all.length > 1 ? 's' : ''} in this thread${tr ? ` for ${tr.id} (${tr.category}, ${tr.priority} priority, ${tr.status})` : ''}.`,
    `• Latest: ${m.fromName} — “${m.subject}”.`,
    ...(asks.length ? [`• Asks: ${asks.slice(0, 2).join(' ')}`] : []),
    ...(thread.some((x) => x.folder === 'sent') ? [`• We last wrote: “${thread.find((x) => x.folder === 'sent')!.subject}”.`] : []),
    ...(atts.length ? [`• Attachments: ${atts.join(', ')}.`] : []),
    `• Suggested next step: ${extractAction(m) ?? 'reply with an update and keep the tracker current'}.`,
  ]
  return lines.join('\n')
}

export function extractAction(m?: Mail): string | undefined {
  const b = (m?.body ?? '').toLowerCase()
  if (/confirm/.test(b) && /technician|visit/.test(b)) return 'Create follow-up task to get customer confirmation on site visit'
  if (/document/.test(b)) return 'Create follow-up task to collect the requested documents'
  if (/dispute/.test(b)) return 'Create follow-up task to reconcile the disputed transaction'
  if (/meeting/.test(b)) return 'Create follow-up task to schedule the project meeting'
  if (/notice|compliance/.test(b)) return 'Create follow-up task to prepare the compliance report'
  return undefined
}

/** Free-text prompt routing for the inbox AI box. */
export function answer(prompt: string, m: Mail, thread: Mail[]) {
  const p = prompt.toLowerCase()
  if (/summar|tl;?dr|overview/.test(p)) return { kind: 'summary' as const, text: summarize(m, thread) }
  if (/reply|draft|respond|write/.test(p)) return { kind: 'reply' as const, text: suggestReply(m) }
  if (/follow|task|action|next/.test(p)) return { kind: 'text' as const, text: extractAction(m) ? `${extractAction(m)}.\nDue: within 2 working days · Owner: ${trackerById(m.tracker)?.assignedTo ?? 'Support Team'}.` : 'No follow-up action detected in this thread.' }
  if (/tone|sentiment|angry|urgent/.test(p)) {
    const urgent = /still not|inconvenience|urgent|asap|immediately/i.test(m.body)
    return { kind: 'text' as const, text: urgent ? 'Tone: frustrated / urgent. The sender is waiting on a resolution timeline — reply today with a concrete ETA.' : 'Tone: neutral. No escalation signals detected.' }
  }
  return { kind: 'text' as const, text: `I can summarize this thread, draft a reply, extract follow-up actions or assess tone. Try “Summarize”, “Draft a reply” or “What is the next step?”.` }
}

/* --------- text <-> html for the composer --------- */
export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const textToHtml = (t: string) =>
  t
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('')

/** Strip scripts, event handlers and javascript: URLs before rendering composed HTML. */
export function sanitize(html: string) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  doc.querySelectorAll('script,style,iframe,object,embed,link,meta,form').forEach((n) => n.remove())
  doc.querySelectorAll('*').forEach((el) => {
    for (const a of Array.from(el.attributes)) {
      if (/^on/i.test(a.name) || (/^(href|src)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) el.removeAttribute(a.name)
    }
    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank')
      el.setAttribute('rel', 'noopener noreferrer')
    }
  })
  return doc.body.firstElementChild?.innerHTML ?? ''
}
export const htmlToText = (html: string) => {
  const d = new DOMParser().parseFromString(html.replace(/<\/p>\s*<p>/g, '</p>\n\n<p>').replace(/<br\s*\/?>/g, '\n'), 'text/html')
  return (d.body.textContent ?? '').trim()
}
