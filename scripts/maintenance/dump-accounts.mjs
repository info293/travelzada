import { db } from './_fb.mjs'
import { collection, getDocs } from 'firebase/firestore'
import fs from 'fs'
const out = {}
for (const c of ['users','agents','agent_packages','agent_bookings','agent_customers']) {
  try { const s = await getDocs(collection(db, c)); out[c] = s.docs.map(d => ({ id: d.id, ...d.data() })) ; console.log(c, s.size) }
  catch (e) { console.log(c, 'ERR', e.code || e.message) }
}
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1))
process.exit(0)
