import fs from 'fs'
import { classifyAgent, textGibberish } from './classify.mjs'
const d = JSON.parse(fs.readFileSync(process.argv[2]))
const cnt = (arr, k='agentId') => arr.reduce((m, x) => (m[x[k]] = (m[x[k]] || 0) + 1, m), {})
const ctx = { packages: cnt(d.agent_packages), bookings: cnt(d.agent_bookings), customers: cnt(d.agent_customers), subagents: cnt(d.users.filter(u => u.role === 'subagent')) }
let bots = 0, keep = []
for (const a of d.agents) { const r = classifyAgent(a, ctx); if (r.bot) bots++; else keep.push([a.status, a.companyName, '/', a.contactName, a.email, r.protected.join(','), r.reasons.join(',')].join(' | ')) }
console.log('AGENTS bot:', bots, 'keep:', keep.length); keep.forEach(k => console.log('  KEEP', k))
// users with role user: check displayName
const agentIds = new Set(d.agents.map(a => a.id))
const uKeep = [], uBot = []
for (const u of d.users) {
  if (u.role !== 'user') continue
  const g = textGibberish(u.displayName || u.name)
  ;(g ? uBot : uKeep).push([u.displayName || u.name || '-', u.email].join(' | '))
}
console.log('USERS(role=user) gibberish:', uBot.length, 'other:', uKeep.length)
uBot.slice(0, 30).forEach(x => console.log('  BOT?', x))
uKeep.forEach(x => console.log('  OK ', x))
