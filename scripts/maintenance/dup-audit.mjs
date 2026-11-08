import { db } from './_fb.mjs'
import { collection, getDocs } from 'firebase/firestore'
const P = (await getDocs(collection(db, 'packages'))).docs.map(d => ({ id: d.id, ...d.data() }))
const sh = (t) => { const w = String(t || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean); const s = new Set(); for (let i = 0; i + 4 < w.length; i++) s.add(w.slice(i, i + 5).join(' ')); return s }
const jac = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; for (const x of a) if (b.has(x)) n++; return n / (a.size + b.size - n) }
const txt = (p) => [p.Overview, p.Day_Wise_Itinerary, JSON.stringify(p.Day_Wise_Itinerary_Details || ''), p.Inclusions].join(' ')
const S = P.map(p => sh(txt(p)))
let worst = P.map((p, i) => { let best = 0, w = null; P.forEach((q, j) => { if (i !== j) { const v = jac(S[i], S[j]); if (v > best) { best = v; w = q.Destination_Name } } }); return { name: p.Destination_Name, best, w } })
worst.sort((a, b) => b.best - a.best)
const bands = [0.8, 0.5, 0.3]; for (const b of bands) console.log(`similarity >= ${b}:`, worst.filter(x => x.best >= b).length)
worst.slice(0, 8).forEach(x => console.log(Math.round(x.best * 100) + '%', x.name, '<->', x.w))
const ovLen = P.map(p => String(p.Overview || '').split(/\s+/).length); console.log('overview words: min', Math.min(...ovLen), 'median', ovLen.sort((a,b)=>a-b)[43])
console.log('has SEO_Title', P.filter(p => p.SEO_Title).length, '| has SEO_Description', P.filter(p => p.SEO_Description).length, '| has own FAQ', P.filter(p => (p.FAQ_Items || []).length).length, '| has day details', P.filter(p => (p.Day_Wise_Itinerary_Details || []).length).length, '| has Highlights', P.filter(p => (p.Highlights || []).length).length)
const titles = {}; P.forEach(p => { const t = String(p.SEO_Title || '').trim(); if (t) titles[t] = (titles[t] || 0) + 1 }); console.log('duplicate SEO titles', Object.values(titles).filter(n => n > 1).length)
process.exit(0)
