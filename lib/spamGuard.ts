// Lightweight bot/spam heuristics shared by lead forms (client) and /api/email/send (server).

export const HONEYPOT_FIELD = 'company_website'
export const MIN_FILL_MS = 3000

// Random bot strings like "GFJgklJUzMmDeKKxWkIJgu" flip case many times inside one word.
// Real names ("Riya & Aarav", "McDonald", "KASHMIR") almost never do.
export function looksLikeGibberish(text?: string | null): boolean {
  if (!text) return false
  return text.split(/[\s&,:\-\/.]+/).some((token) => {
    if (token.length < 8 || !/^[A-Za-z]+$/.test(token)) return false
    let switches = 0
    for (let i = 1; i < token.length; i++) {
      const prevUpper = token[i - 1] === token[i - 1].toUpperCase()
      const currUpper = token[i] === token[i].toUpperCase()
      if (prevUpper !== currUpper) switches++
    }
    return switches >= 4
  })
}

export function isSpamLead(opts: {
  name?: string
  destination?: string
  packageName?: string
  message?: string
  honeypot?: string
  elapsedMs?: number
}): boolean {
  if (opts.honeypot && opts.honeypot.trim()) return true
  if (typeof opts.elapsedMs === 'number' && opts.elapsedMs < MIN_FILL_MS) return true
  return [opts.name, opts.destination, opts.packageName, opts.message].some(looksLikeGibberish)
}

// Best-effort per-IP limiter (per server instance).
const hits = new Map<string, number[]>()
export function isRateLimited(key: string, limit = 5, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now()
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs)
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > limit
}
