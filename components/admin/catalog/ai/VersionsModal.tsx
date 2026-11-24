'use client'

/**
 * "Create versions" of a Main package (admins only).
 *
 * The admin picks what may change — nights, hotel category, occasion, season — and ticks the combinations to make.
 * Each version is written by AI one after another (POST /api/admin/packages/ai-version, ~1 min each), saved as a
 * new package (Parent_Package_ID → the Main) and linked to the same destination. Each gets a different photo from
 * the Main's gallery where possible.
 */
import { useMemo, useRef, useState } from 'react'
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore'
import { AlertCircle, CheckCircle2, Layers, Loader2 } from 'lucide-react'
import { db } from '@/lib/firebase'
import { staffFetch } from '@/lib/admin/staffFetch'
import { Button, cx } from '../../ui'
import { ChipSelect, Modal } from '../fields'
import { buildPackagePayload, cleanGallery, destinationOf, durationLabel, nightsFrom } from '../packageUtils'
import type { DestinationRecord, PackageDraft } from '../types'
import { AI_OCCASIONS } from './AiCreatePanel'

const SEASONS = ['Any', 'Summer', 'Winter', 'Spring', 'Autumn', 'Monsoon']
const MAX_PER_RUN = 10

interface Spec { nights: number; stars: number; occasion: string; season: string }
type RowState = { status: 'waiting' | 'writing' | 'saved' | 'error'; note?: string }

const specLabel = (s: Spec) => [durationLabel(s.nights), `${s.stars}-Star`, s.occasion, s.season !== 'Any' ? s.season : ''].filter(Boolean).join(' · ')
const specKey = (s: Spec) => `${s.nights}|${s.stars}|${s.occasion}|${s.season}`

export default function VersionsModal({
  main,
  packages,
  destinations,
  userEmail,
  onClose,
  onSaved,
}: {
  main: PackageDraft | null
  packages: PackageDraft[]
  destinations: DestinationRecord[]
  userEmail?: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const mainNights = main ? nightsFrom(main) || 4 : 4
  const mainStars = Number(String(main?.Star_Category || '').match(/[345]/)?.[0] || 4)
  const mainOccasion = AI_OCCASIONS.find((o) => String(main?.Occasion || '').toLowerCase().includes(o.toLowerCase())) || 'Honeymoon'

  const [nights, setNights] = useState<string[]>(() => [mainNights - 1, mainNights + 1].filter((n) => n >= 2).map(String))
  const [stars, setStars] = useState<string[]>([String(mainStars)])
  const [occasions, setOccasions] = useState<string[]>([mainOccasion])
  const [seasons, setSeasons] = useState<string[]>(['Any'])
  const [unticked, setUnticked] = useState<Set<string>>(new Set())
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [running, setRunning] = useState(false)
  const stopRef = useRef(false)

  const versions = useMemo(() => packages.filter((p) => main?.id && p.Parent_Package_ID === main.id), [packages, main])
  const madeLabels = useMemo(() => new Set(versions.map((v) => String(v.Version_Label || ''))), [versions])

  const combos = useMemo(() => {
    const out: Spec[] = []
    nights.forEach((n) => stars.forEach((s) => occasions.forEach((o) => seasons.forEach((se) => {
      const spec = { nights: Number(n), stars: Number(s), occasion: o, season: se }
      const sameAsMain = spec.nights === mainNights && spec.stars === mainStars && spec.occasion === mainOccasion && spec.season === 'Any'
      if (!sameAsMain && !madeLabels.has(specLabel(spec))) out.push(spec)
    }))))
    return out
  }, [nights, stars, occasions, seasons, mainNights, mainStars, mainOccasion, madeLabels])

  // ---------- Simple mode: we pick a varied set automatically ----------
  const [simple, setSimple] = useState(true)
  const [count, setCount] = useState(5)
  const autoPicks = useMemo(() => {
    const pool: Spec[] = []
    const nightOpts = [mainNights - 1, mainNights + 1, mainNights + 2].filter((n) => n >= 2)
    ;[mainNights, ...nightOpts].forEach((n) => [3, 4, 5].forEach((s) => [mainOccasion, ...AI_OCCASIONS.filter((o) => o !== mainOccasion)].forEach((o) => ['Any', 'Winter', 'Summer'].forEach((se) => {
      const spec = { nights: n, stars: s, occasion: o, season: se }
      const same = n === mainNights && s === mainStars && o === mainOccasion && se === 'Any'
      if (!same && !madeLabels.has(specLabel(spec))) pool.push(spec)
    }))))
    // How different two versions are (number of changed things)
    const diff = (a: Spec, b: Spec) => Number(a.nights !== b.nights) + Number(a.stars !== b.stars) + Number(a.occasion !== b.occasion) + Number(a.season !== b.season)
    const mainSpec: Spec = { nights: mainNights, stars: mainStars, occasion: mainOccasion, season: 'Any' }
    const chosen: Spec[] = [...versions.map((v) => ({ nights: nightsFrom(v) || 0, stars: Number(String(v.Star_Category || '').match(/[345]/)?.[0] || 0), occasion: String(v.Occasion || ''), season: String(v.Version_Label || '').split(' · ')[3] || 'Any' }))]
    const out: Spec[] = []
    while (out.length < count && pool.length) {
      // Pick the option most different from the Main, existing versions and what we already picked (ties → first, i.e. nearer the Main)
      let best = 0
      let bestScore = -1
      pool.forEach((p, i) => {
        const others = [mainSpec, ...chosen, ...out]
        const score = Math.min(...others.map((o) => diff(p, o))) * 10 - diff(p, mainSpec)
        if (score > bestScore) { bestScore = score; best = i }
      })
      out.push(pool.splice(best, 1)[0])
    }
    return out
  }, [count, mainNights, mainStars, mainOccasion, madeLabels, versions])

  const picked = simple ? autoPicks : combos.filter((c) => !unticked.has(specKey(c))).slice(0, MAX_PER_RUN)
  const pickedKeys = new Set(picked.map(specKey))

  const run = async () => {
    if (!main?.id || !picked.length) return
    stopRef.current = false
    setRunning(true)
    setRows(Object.fromEntries(picked.map((s) => [specKey(s), { status: 'waiting' as const }])))
    const gallery = cleanGallery(main.Gallery_Images)
    const dest = destinationOf(main, destinations)
    let packageIds = [...(dest?.packageIds || [])]
    let saved = 0
    for (let i = 0; i < picked.length; i++) {
      if (stopRef.current) break
      const spec = picked[i]
      const key = specKey(spec)
      setRows((r) => ({ ...r, [key]: { status: 'writing' } }))
      try {
        const res = await staffFetch<{ draft: PackageDraft; similarity: { max: number; label: string } }>('/api/admin/packages/ai-version', { mainId: main.id, ...spec })
        // A different cover photo per version (rotate through the Main's gallery)
        const n = versions.length + saved + 1
        const cover = gallery.length ? gallery[n % gallery.length] : String(main.Primary_Image_URL || '')
        const draft: PackageDraft = {
          ...res.draft,
          Primary_Image_URL: cover,
          Gallery_Images: gallery.length ? [...gallery.slice(n % gallery.length), ...gallery.slice(0, n % gallery.length)].filter((u) => u !== cover) : [],
        }
        await addDoc(collection(db, 'packages'), buildPackagePayload(draft, { isNew: true, userEmail }))
        // Destinations with an explicit list need the new code added
        if (dest?.id && packageIds.length && draft.Destination_ID && !packageIds.includes(String(draft.Destination_ID))) {
          packageIds = [...packageIds, String(draft.Destination_ID)]
          await updateDoc(doc(db, 'destinations', dest.id), { packageIds, updatedAt: new Date().toISOString() })
        }
        saved++
        const pct = Math.round(res.similarity.max * 100)
        setRows((r) => ({ ...r, [key]: { status: 'saved', note: `“${draft.Destination_Name}” · ${res.similarity.label === 'unique' ? 'unique' : `${pct}% similar`}${gallery.length ? '' : ' · add its own photo'}` } }))
      } catch (e) {
        setRows((r) => ({ ...r, [key]: { status: 'error', note: (e as Error).message } }))
      }
    }
    setRunning(false)
    if (saved) onSaved()
  }

  const started = Object.keys(rows).length > 0
  const close = () => {
    if (running) return
    setRows({})
    onClose()
  }

  return (
    <Modal
      open={!!main}
      onClose={close}
      width="max-w-3xl"
      title={<span className="flex items-center gap-2"><Layers className="h-4 w-4 text-bordeaux-600" />Create versions of “{main?.Destination_Name}”</span>}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-gray-500">{running ? 'AI writes one version at a time — about a minute each. Keep this window open.' : `${picked.length} selected · about ${picked.length} min`}</span>
          <div className="flex gap-2">
            {running ? (
              <Button variant="secondary" onClick={() => { stopRef.current = true }}>Stop after this one</Button>
            ) : (
              <>
                <Button variant="secondary" onClick={close}>{started ? 'Close' : 'Cancel'}</Button>
                {!started && <Button onClick={run} disabled={!picked.length}><Layers className="h-4 w-4" />Create {picked.length} version{picked.length === 1 ? '' : 's'}</Button>}
              </>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5 p-5">
        <p className="rounded-xl bg-bordeaux-50/60 px-4 py-3 text-xs leading-relaxed text-bordeaux-900">
          Each version keeps this trip&apos;s route and best experiences, but is a <b>different trip</b> — different nights, hotels, occasion or
          season — with its own days, price, FAQs and SEO, written fresh. That way every page answers a different Google / ChatGPT search
          instead of looking like a copy.
          {versions.length > 0 && <> Already made: <b>{versions.length}</b>.</>}
        </p>

        {!started && simple && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-gray-900">How many versions?</p>
              <div className="flex gap-2">
                {[3, 5, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(n)}
                    className={cx('h-11 w-16 rounded-xl border text-base font-bold transition-colors', count === n ? 'border-bordeaux-600 bg-bordeaux-600 text-white' : 'border-gray-200 text-gray-700 hover:border-bordeaux-300')}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs text-gray-500">We&apos;ll make these (picked to be as different as possible):</p>
              <ul className="space-y-1 text-sm text-gray-800">
                {autoPicks.map((c) => <li key={specKey(c)} className="rounded-lg bg-gray-50 px-3 py-1.5">{specLabel(c)}</li>)}
                {!autoPicks.length && <li className="text-xs text-gray-500">All versions have already been made for this package.</li>}
              </ul>
            </div>
            <button type="button" onClick={() => setSimple(false)} className="text-xs font-semibold text-bordeaux-700 hover:underline">
              Choose the options myself
            </button>
          </div>
        )}

        {!started && !simple && (
          <>
            <button type="button" onClick={() => setSimple(true)} className="text-xs font-semibold text-bordeaux-700 hover:underline">
              ← Let AI pick for me
            </button>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Axis label={`Nights (this one: ${mainNights})`}>
                <ChipSelect multi allowCustom={false} value={nights} onChange={setNights} options={[mainNights - 2, mainNights - 1, mainNights, mainNights + 1, mainNights + 2].filter((n) => n >= 2).map(String)} />
              </Axis>
              <Axis label={`Hotel category (this one: ${mainStars}★)`}>
                <ChipSelect multi allowCustom={false} value={stars} onChange={setStars} options={['3', '4', '5']} />
              </Axis>
              <Axis label="Occasion">
                <ChipSelect multi allowCustom={false} value={occasions} onChange={setOccasions} options={[...AI_OCCASIONS]} />
              </Axis>
              <Axis label="Season">
                <ChipSelect multi allowCustom={false} value={seasons} onChange={setSeasons} options={SEASONS} />
              </Axis>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-gray-700">
                Versions to create ({picked.length}{combos.length > MAX_PER_RUN ? ` of ${combos.length} — max ${MAX_PER_RUN} at a time` : ''})
              </p>
              {combos.length === 0 ? (
                <p className="rounded-lg bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">Pick at least one different option above.</p>
              ) : (
                <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200">
                  {combos.map((c) => {
                    const k = specKey(c)
                    const on = pickedKeys.has(k)
                    return (
                      <li key={k}>
                        <label className={cx('flex cursor-pointer items-center gap-3 px-3 py-2 text-sm', !on && 'text-gray-400')}>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => setUnticked((u) => { const n = new Set(u); if (n.has(k)) n.delete(k); else n.add(k); return n })}
                            className="h-4 w-4 accent-bordeaux-600"
                          />
                          {specLabel(c)}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </>
        )}

        {started && (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
            {picked.filter((c) => rows[specKey(c)]).map((c) => {
              const r = rows[specKey(c)]
              return (
                <li key={specKey(c)} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                  {r.status === 'writing' ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-bordeaux-600" />
                    : r.status === 'saved' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    : r.status === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                    : <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gray-300" />}
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{specLabel(c)}</p>
                    <p className={cx('text-xs', r.status === 'error' ? 'text-red-600' : 'text-gray-500')}>
                      {r.status === 'waiting' ? 'Waiting' : r.status === 'writing' ? 'AI is writing…' : r.note}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}

function Axis({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-gray-700">{label}</p>
      {children}
    </div>
  )
}
