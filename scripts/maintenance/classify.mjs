// Heuristic bot detector for agent / user signups (used by cleanup-bots.mjs).
const wordGibberish = (w) => {
  const s = w.replace(/[^a-zA-Z]/g, '')
  if (s.length < 4) return false
  if ((s.match(/[a-z][A-Z]/g) || []).length >= 2) return true // xIbUltaUwKq
  const l = s.toLowerCase()
  if ((l.match(/[aeiouy]/g) || []).length / l.length < 0.2) return true
  if (/[^aeiouy]{5,}/.test(l) || /(.)\1\1/.test(l)) return true
  return (l.match(/q[^u]|x[^aeiouy]|[jvwxz]{2}|[bcdfghjklmnpqrstvwxz]j|z[bcdfgkmnpqvx]|[bcdfgkmpqv][xz]/g) || []).length >= 2
}
export const textGibberish = (t) => {
  const words = String(t || '').trim().split(/\s+/).filter((w) => w && w.toUpperCase() !== 'LLC')
  return words.length > 0 && words.filter(wordGibberish).length >= Math.ceil(words.length / 2)
}
// Gmail "dot trick": many dots in local part, a common bot pattern (a.b.c.d.e@gmail.com)
export const dotTrick = (email) => {
  const [local, domain] = String(email || '').toLowerCase().split('@')
  return /gmail\.com$/.test(domain || '') && (local.match(/\./g) || []).length >= 3
}
export function classifyAgent(a, ctx) {
  const protectedBy = []
  if (a.status === 'active') protectedBy.push('active')
  for (const k of ['packages', 'bookings', 'customers', 'subagents']) if (ctx[k][a.id]) protectedBy.push(`${ctx[k][a.id]} ${k}`)
  const reasons = []
  if (/^[A-Za-z]+ LLC$/.test(a.companyName || '')) reasons.push('random "Xxxx LLC" company')
  if (textGibberish(a.companyName)) reasons.push('gibberish company')
  if (textGibberish(a.contactName)) reasons.push('gibberish contact')
  if (dotTrick(a.email)) reasons.push('gmail dot-trick')
  return { bot: protectedBy.length === 0 && reasons.length > 0, reasons, protectedBy }
}
// Website users: real OTP signups store a name + emailVerified; Google logins store name/photo.
export function classifyUser(u, keptAgentIds) {
  if (u.role === 'admin' || u.role === 'subagent') return { bot: false }
  if ((u.permissions || []).length) return { bot: false }
  if (u.role === 'agent') return { bot: !keptAgentIds.has(u.id), reasons: ['bot or orphan agent'] }
  const nameless = !String(u.displayName || '').trim()
  if (nameless && !u.emailVerified && !u.lastLogin) return { bot: true, reasons: ['no name, unverified, never logged in'] }
  if (textGibberish(u.displayName) || /@(37xiao|tuta)\.com$/i.test(u.email || '')) return { bot: true, reasons: ['gibberish/disposable'] }
  return { bot: false }
}
