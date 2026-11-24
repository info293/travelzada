// Usage: node scripts/maintenance/mark-main.mjs [--apply]
// Marks every existing package that is NOT a version (no Parent_Package_ID) as a Main package (Is_Main: true).
// Without --apply it is a dry run. Only adds the Is_Main field — nothing else changes (Last_Updated untouched).
import { db } from './_fb.mjs'
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore'
const apply = process.argv.includes('--apply')
const snap = await getDocs(collection(db, 'packages'))
const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
const versions = all.filter((p) => p.Parent_Package_ID)
const already = all.filter((p) => !p.Parent_Package_ID && p.Is_Main === true)
const todo = all.filter((p) => !p.Parent_Package_ID && p.Is_Main !== true)
console.log(`Packages: ${all.length} · versions: ${versions.length} · already Main: ${already.length} · to mark Main: ${todo.length}`)
todo.slice(0, 10).forEach((p) => console.log('  ', p.Destination_ID, '-', p.Destination_Name))
if (!apply) { console.log('Dry run. Re-run with --apply to write.'); process.exit(0) }
for (let i = 0; i < todo.length; i += 400) {
  const b = writeBatch(db)
  todo.slice(i, i + 400).forEach((p) => b.update(doc(db, 'packages', p.id), { Is_Main: true }))
  await b.commit()
  console.log('marked', Math.min(i + 400, todo.length))
}
process.exit(0)
