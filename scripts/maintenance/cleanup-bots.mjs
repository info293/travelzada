// Usage: node scripts/maintenance/cleanup-bots.mjs <backup.json> [--apply]
// Without --apply it is a dry run. Deletes Firestore docs only (Auth accounts need the Admin SDK).
import fs from 'fs'
import { db } from './_fb.mjs'
import { doc, writeBatch } from 'firebase/firestore'
import { classifyAgent, classifyUser } from './classify.mjs'
const [file, flag] = process.argv.slice(2)
const d = JSON.parse(fs.readFileSync(file))
const cnt = (arr, k = 'agentId') => arr.reduce((m, x) => ((m[x[k]] = (m[x[k]] || 0) + 1), m), {})
const ctx = { packages: cnt(d.agent_packages), bookings: cnt(d.agent_bookings), customers: cnt(d.agent_customers), subagents: cnt(d.users.filter((u) => u.role === 'subagent')) }
const botAgents = d.agents.filter((a) => classifyAgent(a, ctx).bot)
const botAgentIds = new Set(botAgents.map((a) => a.id))
const keptAgentIds = new Set(d.agents.filter((a) => !botAgentIds.has(a.id)).map((a) => a.id))
const botUsers = d.users.filter((u) => classifyUser(u, keptAgentIds).bot)
console.log('Agents to delete:', botAgents.length, '/', d.agents.length, ' Users to delete:', botUsers.length, '/', d.users.length)
console.log('Agents kept:', d.agents.filter((a) => !botAgentIds.has(a.id)).map((a) => `${a.companyName} <${a.email}>`).join('; '))
const keptUsers = d.users.filter((u) => !botUsers.includes(u))
console.log('Users kept:', keptUsers.length, keptUsers.map((u) => `${u.role}:${u.email}`).join('; '))
fs.writeFileSync(file.replace(/\.json$/, '.deleted.json'), JSON.stringify({ agents: botAgents, users: botUsers }, null, 1))
if (flag !== '--apply') { console.log('Dry run. Re-run with --apply to delete.'); process.exit(0) }
const refs = [...botAgents.map((a) => doc(db, 'agents', a.id)), ...botUsers.map((u) => doc(db, 'users', u.id))]
for (let i = 0; i < refs.length; i += 400) { const b = writeBatch(db); refs.slice(i, i + 400).forEach((r) => b.delete(r)); await b.commit(); console.log('deleted', Math.min(i + 400, refs.length)) }
process.exit(0)
