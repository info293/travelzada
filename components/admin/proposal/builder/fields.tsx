'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cx, inputClass } from '../../ui'

/** Textarea that edits a string[] one item per line (keeps the user's in-progress blank lines) */
export function LinesInput({ value, onChange, rows = 4, placeholder, className }: { value: string[]; onChange: (v: string[]) => void; rows?: number; placeholder?: string; className?: string }) {
    const joined = value.join('\n')
    const [text, setText] = useState(joined)
    const last = useRef(joined)
    useEffect(() => {
        if (joined !== last.current) { last.current = joined; setText(joined) }
    }, [joined])
    return (
        <textarea
            className={cx(inputClass, className)}
            rows={rows}
            placeholder={placeholder}
            value={text}
            onChange={(e) => {
                setText(e.target.value)
                const arr = e.target.value.split('\n').map((s) => s.replace(/^[\s•\-*✓·]+/, '').trim()).filter(Boolean)
                last.current = arr.join('\n')
                onChange(arr)
            }}
        />
    )
}

/** Type + Enter (or comma) to add a chip */
export function ChipsInput({ value, onChange, placeholder = 'Type and press Enter', suggestions = [] }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; suggestions?: string[] }) {
    const [text, setText] = useState('')
    const add = (raw: string) => {
        const items = raw.split(',').map((s) => s.trim()).filter(Boolean).filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()))
        if (items.length) onChange([...value, ...items])
        setText('')
    }
    const unused = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()))
    return (
        <div>
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-bordeaux-200 focus-within:border-bordeaux-400">
                {value.map((v, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-bordeaux-50 text-bordeaux-800 px-2.5 py-0.5 text-xs font-semibold">
                        {v}
                        <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((_, k) => k !== i))} className="text-bordeaux-400 hover:text-bordeaux-800"><X className="w-3 h-3" /></button>
                    </span>
                ))}
                <input
                    className="flex-1 min-w-[8rem] py-0.5 text-sm focus:outline-none"
                    value={text}
                    placeholder={value.length ? '' : placeholder}
                    onChange={(e) => { if (e.target.value.endsWith(',')) add(e.target.value); else setText(e.target.value) }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); add(text) }
                        if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1))
                    }}
                    onBlur={() => text.trim() && add(text)}
                />
            </div>
            {unused.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                    {unused.slice(0, 10).map((s) => (
                        <button key={s} type="button" onClick={() => onChange([...value, s])} className="rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-[11px] text-gray-500 hover:border-bordeaux-300 hover:text-bordeaux-700">+ {s}</button>
                    ))}
                </div>
            )}
        </div>
    )
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }> }) {
    return (
        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-0.5">
            {options.map((o) => (
                <button key={o.value} type="button" onClick={() => onChange(o.value)}
                    className={cx('rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors', value === o.value ? 'bg-white text-bordeaux-700 shadow-sm' : 'text-gray-500 hover:text-gray-800')}>
                    {o.label}
                </button>
            ))}
        </div>
    )
}
