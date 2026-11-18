'use client'

/**
 * Accessible text input + suggestion list (ARIA combobox pattern).
 * Typing filters (debounced); ↑/↓ move, Enter picks, Esc closes. The text stays free — staff can always type a new name.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cx, inputClass } from '../ui'

export interface ComboboxProps<T> {
  value: string
  onChange: (text: string) => void
  /** Called with the debounced query; return the matches to show */
  search: (q: string) => T[]
  onPick: (item: T) => void
  renderItem: (item: T, active: boolean) => ReactNode
  itemKey: (item: T) => string
  placeholder?: string
  className?: string
  inputClassName?: string
  /** First focus → load the library */
  onFirstFocus?: () => void
  /** Footer line inside the list (e.g. "Loading library…") */
  footer?: ReactNode
  ariaLabel?: string
  minChars?: number
}

export default function LibraryCombobox<T>({
  value, onChange, search, onPick, renderItem, itemKey, placeholder, className, inputClassName, onFirstFocus, footer, ariaLabel, minChars = 2,
}: ComboboxProps<T>) {
  const id = useId()
  const listId = `${id}-list`
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState(value)
  const [active, setActive] = useState(0)
  const focused = useRef(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // debounce the query (150 ms)
  useEffect(() => {
    const t = setTimeout(() => setQ(value), 150)
    return () => clearTimeout(t)
  }, [value])

  const items = open && q.trim().length >= minChars ? search(q) : []
  const show = open && (items.length > 0 || (!!footer && q.trim().length >= minChars))
  useEffect(() => { setActive(0) }, [q])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const pick = (item: T) => {
    onPick(item)
    setOpen(false)
  }

  return (
    <div ref={boxRef} className={cx('relative', className)}>
      <input
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        aria-activedescendant={show && items[active] ? `${id}-opt-${active}` : undefined}
        className={cx(inputClass, inputClassName)}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onFocus={() => {
          if (!focused.current) { focused.current = true; onFirstFocus?.() }
          setOpen(true)
        }}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, Math.max(0, items.length - 1))) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
          else if (e.key === 'Enter' && show && items[active]) { e.preventDefault(); pick(items[active]) }
          else if (e.key === 'Escape' && show) { e.preventDefault(); e.stopPropagation(); setOpen(false) }
          else if (e.key === 'Tab') setOpen(false)
        }}
      />
      {show && (
        <ul id={listId} role="listbox" className="absolute left-0 z-40 mt-1 max-h-80 w-full min-w-[18rem] overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
          {items.map((it, i) => (
            <li
              key={itemKey(it)}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(it) }}
              onMouseEnter={() => setActive(i)}
              className={cx('cursor-pointer px-3 py-2 text-sm', i === active ? 'bg-bordeaux-50' : 'hover:bg-gray-50')}
            >
              {renderItem(it, i === active)}
            </li>
          ))}
          {footer && <li className="px-3 py-1.5 text-[11px] text-gray-400" aria-hidden>{footer}</li>}
        </ul>
      )}
    </div>
  )
}
