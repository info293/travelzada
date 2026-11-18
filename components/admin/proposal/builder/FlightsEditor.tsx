'use client'

/** Flights: included / not included, two screenshot drop zones (Ctrl+V works) + optional structured sectors */
import { Plus, Trash2 } from 'lucide-react'
import { Button, Field, inputClass } from '../../ui'
import type { ProposalFlight, QuoteDesign } from '../types'
import ImagePicker from './ImagePicker'
import { Segmented } from './fields'
import FlightSearchField, { flightToSector } from '../../library/FlightSearchField'
import { useFlightLibrary } from '@/lib/library/cache'

export interface FlightsEditorProps {
    flights: ProposalFlight[]
    onFlightsChange: (f: ProposalFlight[]) => void
    design: QuoteDesign
    onDesign: (patch: Partial<QuoteDesign>) => void
    folder: string
    auto: { outboundLabel: string; inboundLabel: string; fareNote: string; included: boolean }
}

const emptyFlight = (): ProposalFlight => ({ date: '', airline: '', flightNumber: '', departureTime: '', arrivalTime: '', departureCity: '', arrivalCity: '' })

export default function FlightsEditor({ flights, onFlightsChange, design, onDesign, folder, auto }: FlightsEditorProps) {
    const update = (i: number, field: keyof ProposalFlight, value: string) => onFlightsChange(flights.map((f, k) => (k === i ? { ...f, [field]: value } : f)))
    const off = design.flightsMode === 'not-included'
    const { items: library, ready } = useFlightLibrary(!off)
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <Segmented
                    value={design.flightsMode}
                    onChange={(flightsMode) => onDesign({ flightsMode })}
                    options={[{ value: 'auto', label: 'Auto' }, { value: 'included', label: 'Flights included' }, { value: 'not-included', label: 'Not included' }]}
                />
                <span className="text-xs text-gray-500">
                    {design.flightsMode === 'auto' ? (auto.included ? 'Auto: shown as included (screenshots / sectors / inclusions mention flights).' : 'Auto: no flights section (nothing added yet).') : off ? 'The PDF says flights are not included.' : 'Flights section shown with the screenshots / sectors below.'}
                </span>
            </div>

            {!off && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <input className={inputClass} value={design.outboundLabel} placeholder={auto.outboundLabel} onChange={(e) => onDesign({ outboundLabel: e.target.value })} title="Card title" />
                            <ImagePicker value={design.outboundShot} onChange={(outboundShot) => onDesign({ outboundShot })} folder={folder} max={1} aspect="screenshot"
                                label="Outbound flight screenshot" emptyText="Paste (Ctrl+V) or drop the outbound flight screenshot" />
                        </div>
                        <div className="space-y-2">
                            <input className={inputClass} value={design.returnLabel} placeholder={auto.inboundLabel} onChange={(e) => onDesign({ returnLabel: e.target.value })} title="Card title" />
                            <ImagePicker value={design.returnShot} onChange={(returnShot) => onDesign({ returnShot })} folder={folder} max={1} aspect="screenshot"
                                label="Return flight screenshot" emptyText="Paste (Ctrl+V) or drop the return flight screenshot" />
                        </div>
                    </div>
                    <Field label="Fare note" hint="Shown above the flight cards">
                        <input className={inputClass} value={design.fareNote} placeholder={auto.fareNote} onChange={(e) => onDesign({ fareNote: e.target.value })} />
                    </Field>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-700">Flight sectors (optional — used when there is no screenshot)</span>
                            <Button variant="secondary" size="sm" onClick={() => onFlightsChange([...flights, emptyFlight()])}><Plus className="w-3.5 h-3.5" /> Add sector</Button>
                        </div>
                        <FlightSearchField className="mb-2" library={library} ready={ready}
                            placeholder="Add a saved flight: airline, flight no. or route (DEL→SXR)"
                            onPick={(lf) => onFlightsChange([...flights, flightToSector(lf)])} />
                        <div className="space-y-2">
                            {flights.map((f, i) => (
                                <div key={i} className="rounded-xl border border-gray-200 bg-white p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-gray-700">Sector {i + 1}{i === 0 ? ' · outbound' : i === flights.length - 1 ? ' · return' : ''}</span>
                                        <button type="button" onClick={() => onFlightsChange(flights.filter((_, k) => k !== i))} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" aria-label="Remove sector"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                    <FlightSearchField className="mb-2" library={library} ready={ready} from={f.departureCity} to={f.arrivalCity}
                                        placeholder="Fill from saved flights (airline, flight no., DEL→SXR)"
                                        onPick={(lf) => onFlightsChange(flights.map((x, k) => (k === i ? flightToSector(lf, x.date) : x)))} />
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        <input className={inputClass} placeholder="Airline" value={f.airline} onChange={(e) => update(i, 'airline', e.target.value)} />
                                        <input className={inputClass} placeholder="Flight no." value={f.flightNumber} onChange={(e) => update(i, 'flightNumber', e.target.value)} />
                                        <input className={inputClass} placeholder="From, e.g. Delhi (DEL)" value={f.departureCity} onChange={(e) => update(i, 'departureCity', e.target.value)} />
                                        <input className={inputClass} placeholder="To, e.g. Srinagar (SXR)" value={f.arrivalCity} onChange={(e) => update(i, 'arrivalCity', e.target.value)} />
                                        <input className={inputClass} type="date" title="Date" value={f.date} onChange={(e) => update(i, 'date', e.target.value)} />
                                        <input className={inputClass} type="time" title="Departure" value={f.departureTime} onChange={(e) => update(i, 'departureTime', e.target.value)} />
                                        <input className={inputClass} type="time" title="Arrival" value={f.arrivalTime} onChange={(e) => update(i, 'arrivalTime', e.target.value)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
