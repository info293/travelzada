/**
 * Heuristic bot detector for agent / user sign-ups.
 * TypeScript port of scripts/maintenance/classify.mjs — keep the two in sync.
 * Safe to import on the client and on the server (no Firebase imports).
 */

const wordGibberish = (w: string, caseFlips = 2): boolean => {
  const s = w.replace(/[^a-zA-Z]/g, '')
  if (s.length < 4) return false
  if ((s.match(/[a-z][A-Z]/g) || []).length >= caseFlips) return true // xIbUltaUwKq
  const l = s.toLowerCase()
  if ((l.match(/[aeiouy]/g) || []).length / l.length < 0.2) return true
  if (/[^aeiouy]{5,}/.test(l) || /(.)\1\1/.test(l)) return true
  return (l.match(/q[^u]|x[^aeiouy]|[jvwxz]{2}|[bcdfghjklmnpqrstvwxz]j|z[bcdfgkmnpqvx]|[bcdfgkmpqv][xz]/g) || []).length >= 2
}

/** True when at least half the words (ignoring "LLC") look like random letters. */
export const textGibberish = (t?: string | null): boolean => {
  const words = String(t || '').trim().split(/\s+/).filter((w) => w && w.toUpperCase() !== 'LLC')
  return words.length > 0 && words.filter((w) => wordGibberish(w)).length >= Math.ceil(words.length / 2)
}

/** Gmail "dot trick": many dots in the local part, a common bot pattern (a.b.c.d.e@gmail.com). */
export const dotTrick = (email?: string | null): boolean => {
  const [local, domain] = String(email || '').toLowerCase().split('@')
  return /gmail\.com$/.test(domain || '') && ((local || '').match(/\./g) || []).length >= 3
}

export interface AgentLike {
  id: string
  status?: string
  companyName?: string
  contactName?: string
  email?: string
}

/** Counts of related docs, keyed by agent id. Any count > 0 protects the agent. */
export interface AgentContext {
  packages: Record<string, number>
  bookings: Record<string, number>
  customers: Record<string, number>
  subagents: Record<string, number>
}

export interface Classification {
  bot: boolean
  reasons: string[]
  protectedBy: string[]
}

export function classifyAgent(a: AgentLike, ctx: AgentContext): Classification {
  const protectedBy: string[] = []
  if (a.status === 'active') protectedBy.push('active')
  for (const k of ['packages', 'bookings', 'customers', 'subagents'] as const) {
    const n = ctx[k][a.id]
    if (n) protectedBy.push(`${n} ${k}`)
  }
  const reasons: string[] = []
  if (/^[A-Za-z]+ LLC$/.test(a.companyName || '')) reasons.push('random "Xxxx LLC" company')
  if (textGibberish(a.companyName)) reasons.push('gibberish company')
  if (textGibberish(a.contactName)) reasons.push('gibberish contact')
  if (dotTrick(a.email)) reasons.push('gmail dot-trick')
  return { bot: protectedBy.length === 0 && reasons.length > 0, reasons, protectedBy }
}

export interface UserLike {
  id: string
  role?: string
  permissions?: string[] | null
  displayName?: string | null
  email?: string | null
  emailVerified?: boolean
  lastLogin?: unknown
}

/** Website users: real OTP sign-ups store a name + emailVerified; Google logins store name/photo. */
export function classifyUser(u: UserLike, keptAgentIds: Set<string>): Classification {
  const keep = (why: string): Classification => ({ bot: false, reasons: [], protectedBy: [why] })
  if (u.role === 'admin' || u.role === 'subagent') return keep(u.role)
  if ((u.permissions || []).length) return keep('has permissions')
  if (u.role === 'agent') {
    return keptAgentIds.has(u.id) ? keep('real agent') : { bot: true, reasons: ['bot or orphan agent'], protectedBy: [] }
  }
  const nameless = !String(u.displayName || '').trim()
  if (nameless && !u.emailVerified && !u.lastLogin) return { bot: true, reasons: ['no name, unverified, never logged in'], protectedBy: [] }
  if (textGibberish(u.displayName) || /@(37xiao|tuta)\.com$/i.test(u.email || '')) return { bot: true, reasons: ['gibberish/disposable'], protectedBy: [] }
  return { bot: false, reasons: [], protectedBy: [] }
}

/**
 * Stricter than textGibberish, for blocking at sign-up time where a false positive turns away a real agency:
 * EVERY word of 4+ letters must look random, and CamelCase brands ("MakeMyTrip") are allowed.
 */
export const strictGibberish = (t?: string | null): boolean => {
  const words = String(t || '').trim().split(/\s+/).filter((w) => w && w.toUpperCase() !== 'LLC' && w.replace(/[^a-zA-Z]/g, '').length >= 4)
  return words.length > 0 && words.every((w) => wordGibberish(w, 3))
}

/**
 * Registration-time check for the agent sign-up form (client + API).
 * Returns a friendly error message, or null when the details look human.
 * Deliberately lenient (no dot-trick rule, strict word test) so real agencies are never blocked.
 */
export function agentSignupProblem(input: { companyName?: string; contactName?: string }): string | null {
  if (strictGibberish(input.companyName)) return 'Please enter your real agency or company name.'
  if (strictGibberish(input.contactName)) return 'Please enter the contact person’s real name.'
  return null
}
