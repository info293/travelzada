'use client'

/** Add / edit a flight sector in the library (drawer) */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button, Drawer, Field, formatDate, formatINR, inputClass } from '../ui'
import ImagePicker from '../proposal/builder/ImagePicker'
import {
  AIRLINES, AIRPORTS, CABINS, WEEKDAYS, airlineByCode, airlineByName, createFlight, durationBetween, emptyFlightDraft, findDuplicateFlight,
  normaliseFlightNumber, updateFlight, type Cabin, type FlightDraft, type LibraryFlight,
} from '@/lib/library/flights'
import { cx } from '../ui'
import { FormSection, LIBRARY_IMAGE_FOLDER, QuoteLinks, SourceBadge, StaffOnlySection, selectClass } from './shared'

function draftOf(f: LibraryFlight | null): FlightDraft {
  if (!f) return emptyFlightDraft()
  const { id: _id, usageCount: _u, lastUsedAt: _l, quoteIds: _q, quoteRefs: _r, createdAt: _c, updatedAt: _up, createdBy: _cb, normalizedKey: _n, matchKeys: _m, ...rest } = f
  return { ...rest, typicalFare: f.typicalFare || { min: null, max: null, note: '' } }
}

export default function FlightForm({ open, flight, all, by, onClose, onSaved, onOpenExisting }: {
  open: boolean
  flight: LibraryFlight | null
  all: LibraryFlight[]
  by: string
  onClose: () => void
  onSaved: () => void
  onOpenExisting: (f: LibraryFlight) => void
}) {
  const [d, setD] = useState<FlightDraft>(() => draftOf(flight))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (open) { setD(draftOf(flight)); setError('') } }, [open, flight])
  const set = <K extends keyof FlightDraft>(k: K, v: FlightDraft[K]) => setD((p) => ({ ...p, [k]: v }))
  const fare = d.typicalFare || { min: null, max: null, note: '' }
  const complete = (d.airline.trim() || d.flightNumber.trim()) && (d.fromAirport.trim() || d.fromCity.trim()) && (d.toAirport.trim() || d.toCity.trim())
  const dup = useMemo(() => (complete ? findDuplicateFlight(all, d, flight?.id) : null), [all, d, flight?.id, complete])

  /** Typing "6E 2134" fills the airline; typing an IATA code fills the city */
  const onFlightNo = (v: string) => {
    const fn = normaliseFlightNumber(v, d.airline)
    setD((p) => ({ ...p, flightNumber: v, airlineCode: fn.code || p.airlineCode, airline: p.airline || airlineByCode(fn.code)?.name || '' }))
  }
  const onAirport = (side: 'from' | 'to', v: string) => {
    const code = v.toUpperCase().slice(0, 3)
    setD((p) => side === 'from'
      ? { ...p, fromAirport: code, fromCity: p.fromCity || AIRPORTS[code] || '' }
      : { ...p, toAirport: code, toCity: p.toCity || AIRPORTS[code] || '' })
  }

  const save = async () => {
    if (!complete) { setError('Enter the airline or flight number, and where it flies from and to.'); return }
    if (dup) { setError('This sector is already in the library — open it instead.'); return }
    setSaving(true)
    setError('')
    try {
      if (flight) await updateFlight(flight, d, by)
      else await createFlight({ ...d, source: 'admin' }, by)
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Could not save the flight.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer open={open} onClose={onClose} width="max-w-2xl"
      title={flight ? <span className="flex items-center gap-2">Edit flight <SourceBadge source={flight.source} /></span> : 'Add a flight sector'}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} loading={saving}>{flight ? 'Save changes' : 'Add flight'}</Button>
      </>}>
      <div className="space-y-6">
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {dup && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div><b>{dup.airline} {dup.flightNumber}</b> {dup.fromAirport || dup.fromCity} → {dup.toAirport || dup.toCity} is already saved. <button type="button" className="font-semibold underline" onClick={() => onOpenExisting(dup)}>Open it</button></div>
          </div>
        )}

        <FormSection title="Flight">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Airline" className="col-span-2">
              <input className={inputClass} list="tz-airlines" value={d.airline} placeholder="IndiGo"
                onChange={(e) => { const v = e.target.value; setD((p) => ({ ...p, airline: v, airlineCode: airlineByName(v)?.code || p.airlineCode })) }} />
              <datalist id="tz-airlines">{AIRLINES.map((a) => <option key={a.code} value={a.name}>{a.code}</option>)}</datalist>
            </Field>
            <Field label="Code"><input className={inputClass} value={d.airlineCode} maxLength={3} placeholder="6E" onChange={(e) => set('airlineCode', e.target.value.toUpperCase())} /></Field>
            <Field label="Flight no."><input className={inputClass} value={d.flightNumber} placeholder="6E 2134" onChange={(e) => onFlightNo(e.target.value)} /></Field>
          </div>
        </FormSection>

        <FormSection title="Route & timings">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="From (IATA)"><input className={inputClass} value={d.fromAirport} maxLength={3} placeholder="DEL" onChange={(e) => onAirport('from', e.target.value)} /></Field>
            <Field label="From city"><input className={inputClass} value={d.fromCity} placeholder="Delhi" onChange={(e) => set('fromCity', e.target.value)} /></Field>
            <Field label="To (IATA)"><input className={inputClass} value={d.toAirport} maxLength={3} placeholder="SXR" onChange={(e) => onAirport('to', e.target.value)} /></Field>
            <Field label="To city"><input className={inputClass} value={d.toCity} placeholder="Srinagar" onChange={(e) => set('toCity', e.target.value)} /></Field>
            <Field label="Departs"><input className={inputClass} type="time" value={d.departureTime} onChange={(e) => set('departureTime', e.target.value)} /></Field>
            <Field label="Arrives"><input className={inputClass} type="time" value={d.arrivalTime} onChange={(e) => set('arrivalTime', e.target.value)} /></Field>
            <Field label="Duration"><input className={inputClass} value={d.duration} placeholder={durationBetween(d.departureTime, d.arrivalTime) || '1h 30m'} onChange={(e) => set('duration', e.target.value)} /></Field>
            <Field label="Stops">
              <select className={selectClass + ' w-full'} value={d.stops} onChange={(e) => set('stops', Number(e.target.value))}>
                <option value={0}>Non-stop</option><option value={1}>1 stop</option><option value={2}>2 stops</option>
              </select>
            </Field>
            {d.stops > 0 && <Field label="Via" className="col-span-2"><input className={inputClass} value={d.via} placeholder="Jammu (IXJ)" onChange={(e) => set('via', e.target.value)} /></Field>}
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold text-gray-700">Operates on</span>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((w) => {
                const on = d.daysOfWeek.includes(w)
                return (
                  <button key={w} type="button" aria-pressed={on} onClick={() => set('daysOfWeek', on ? d.daysOfWeek.filter((x) => x !== w) : [...d.daysOfWeek, w])}
                    className={cx('rounded-full border px-3 py-1 text-xs font-semibold', on ? 'border-bordeaux-600 bg-bordeaux-600 text-white' : 'border-gray-300 bg-white text-gray-600 hover:border-bordeaux-300')}>{w}</button>
                )
              })}
            </div>
          </div>
        </FormSection>

        <FormSection title="Fare & conditions">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Cabin">
              <select className={selectClass + ' w-full'} value={d.cabin} onChange={(e) => set('cabin', e.target.value as Cabin)}>{CABINS.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Baggage"><input className={inputClass} value={d.baggage} placeholder="15 kg + 7 kg" onChange={(e) => set('baggage', e.target.value)} /></Field>
            <Field label="Refundable">
              <select className={selectClass + ' w-full'} value={d.refundable === null ? '' : d.refundable ? 'yes' : 'no'} onChange={(e) => set('refundable', e.target.value === '' ? null : e.target.value === 'yes')}>
                <option value="">Not known</option><option value="yes">Yes</option><option value="no">No</option>
              </select>
            </Field>
            <div />
            <Field label="Typical fare from (₹)"><input className={inputClass} type="number" min={0} value={fare.min ?? ''} onChange={(e) => set('typicalFare', { ...fare, min: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
            <Field label="to (₹)"><input className={inputClass} type="number" min={0} value={fare.max ?? ''} onChange={(e) => set('typicalFare', { ...fare, max: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
            <Field label="Fare note" className="col-span-2"><input className={inputClass} value={fare.note} placeholder="Per person, one way, Dec–Jan" onChange={(e) => set('typicalFare', { ...fare, note: e.target.value })} /></Field>
          </div>
          {d.fareSamples.length > 0 && (
            <div>
              <span className="mb-1 block text-xs font-semibold text-gray-700">Fares seen in quotes</span>
              <ul className="space-y-1 text-xs text-gray-600">
                {d.fareSamples.slice().reverse().map((s, i) => <li key={i}><b>{formatINR(s.price)}</b> · {formatDate(s.date)} · {s.quoteRef}{s.note ? ` — ${s.note}` : ''}</li>)}
              </ul>
            </div>
          )}
        </FormSection>

        <FormSection title="Screenshots" hint="Fare / schedule screenshots (added automatically from quotes)">
          <ImagePicker value={d.screenshots} onChange={(v) => set('screenshots', v)} folder={`${LIBRARY_IMAGE_FOLDER}/flights`} max={12} aspect="screenshot" />
        </FormSection>

        <StaffOnlySection title="Notes">
          <textarea className={inputClass} rows={3} value={d.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Often delayed in winter; book the 06:10 for the best connection…" />
        </StaffOnlySection>

        {flight && (
          <FormSection title="Usage">
            <p className="text-sm text-gray-600">Used in <b>{flight.usageCount}</b> quote{flight.usageCount === 1 ? '' : 's'}{flight.lastUsedAt ? ` · last on ${formatDate(flight.lastUsedAt)}` : ''} · added {formatDate(flight.createdAt)}{flight.createdBy ? ` by ${flight.createdBy}` : ''}</p>
            <QuoteLinks ids={flight.quoteIds} refs={flight.quoteRefs} />
          </FormSection>
        )}
      </div>
    </Drawer>
  )
}
