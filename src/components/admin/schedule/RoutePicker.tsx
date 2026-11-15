'use client'

import { KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowLeftRight, Check, ChevronDown, Search, X } from 'lucide-react'
import { cn, foldText, matchesSearch } from '@/lib/utils'
import { CalendarRoute, routeLabel } from './schedule-utils'

/** "Sài Gòn" → "sg", so staff can type the short names they use every day. */
function initials(name: string | undefined) {
  return foldText(name ?? '').split(/\s+/).map((word) => word[0] ?? '').join('')
}

function searchText(route: CalendarRoute) {
  const from = route.from_station
  const to = route.to_station
  return [from?.name_vi, to?.name_vi, from?.code, to?.code, route.code, initials(from?.name_vi), initials(to?.name_vi)].filter(Boolean).join(' ')
}

/** The same two stations in the opposite direction, if that route exists. */
export function reverseRoute(route: CalendarRoute | undefined, routes: CalendarRoute[]) {
  if (!route?.from_station || !route.to_station) return undefined
  return routes.find((item) => item.from_station?.code === route.to_station?.code && item.to_station?.code === route.from_station?.code)
}

/**
 * Searchable route selector: one compact field instead of a wall of buttons.
 * Typing filters by station name (accents optional), station code or initials.
 */
export default function RoutePicker({
  routes,
  value,
  onChange,
}: {
  routes: CalendarRoute[]
  value: number | null
  onChange: (routeId: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const baseId = useId()
  const listId = `${baseId}-list`

  const current = routes.find((route) => route.id === value)
  const reverse = reverseRoute(current, routes)

  const results = useMemo(() => {
    const folded = foldText(query).trim()
    const matches = routes.filter((route) => matchesSearch(searchText(route), query))
    if (!folded) return matches
    // Routes that start from the typed station come first ("hue" → Huế → … before … → Huế).
    const startsFrom = (route: CalendarRoute) => foldText(route.from_station?.name_vi ?? '').startsWith(folded.split(/\s+/)[0]) ? 0 : 1
    return [...matches].sort((a, b) => startsFrom(a) - startsFrom(b))
  }, [routes, query])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    setQuery('')
    setActive(Math.max(routes.findIndex((route) => route.id === value), 0))
    setOpen(true)
  }

  function choose(route: CalendarRoute) {
    setOpen(false)
    if (route.id !== value) onChange(route.id)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => Math.min(index + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const route = results[active]
      if (route) choose(route)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className="flex min-w-0 items-end gap-2">
      <div ref={rootRef} className="relative min-w-0 flex-1 sm:w-[22rem] sm:flex-none">
        <p id={`${baseId}-label`} className="mb-2 text-sm font-bold text-slate-500">Tuyến</p>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={`${baseId}-label ${baseId}-value`}
          onClick={toggle}
          className={cn(
            'flex h-14 w-full items-center gap-3 rounded-2xl border bg-white px-4 text-left hover:border-violet-400',
            open ? 'border-violet-500 ring-4 ring-violet-500/15' : 'border-slate-300'
          )}
        >
          <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
          <span id={`${baseId}-value`} className="min-w-0 flex-1 truncate text-lg font-bold text-slate-900">
            {current ? routeLabel(current) : 'Chọn tuyến'}
          </span>
          <ChevronDown className={cn('h-5 w-5 shrink-0 text-slate-500 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:right-auto sm:w-[26rem]">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3">
              <Search className="h-5 w-5 shrink-0 text-violet-500" aria-hidden="true" />
              <input
                ref={inputRef}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={results[active] ? `${baseId}-option-${results[active].id}` : undefined}
                aria-label="Tìm tuyến"
                value={query}
                onChange={(event) => { setQuery(event.target.value); setActive(0) }}
                onKeyDown={onKeyDown}
                placeholder="Gõ tên ga, VD: hue, da nang, sg"
                autoComplete="off"
                spellCheck={false}
                // The open panel already shows where focus is; the global gold focus ring would box the text.
                style={{ outline: 'none' }}
                className="h-14 min-w-0 flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400"
              />
              {query ? (
                <button type="button" aria-label="Xóa ô tìm" onClick={() => { setQuery(''); setActive(0); inputRef.current?.focus() }} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <ul ref={listRef} id={listId} role="listbox" aria-label="Danh sách tuyến" className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-slate-500">Không có tuyến nào khớp “{query}”.</li>
              ) : results.map((route, index) => {
                const selected = route.id === value
                return (
                  <li
                    key={route.id}
                    id={`${baseId}-option-${route.id}`}
                    data-index={index}
                    role="option"
                    aria-selected={selected}
                    onPointerMove={() => setActive(index)}
                    onClick={() => choose(route)}
                    className={cn(
                      'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2',
                      index === active ? 'bg-violet-50' : '',
                      selected ? 'text-violet-900' : 'text-slate-800'
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold">{routeLabel(route)}</span>
                      <span className="block text-xs text-slate-400">{route.from_station?.code} → {route.to_station?.code}</span>
                    </span>
                    {selected ? <Check className="h-5 w-5 shrink-0 text-violet-700" aria-hidden="true" /> : null}
                  </li>
                )
              })}
            </ul>
            <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
              ↑ ↓ để di chuyển · Enter để chọn · Esc để đóng
            </p>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        disabled={!reverse}
        onClick={() => reverse && onChange(reverse.id)}
        title={reverse ? `Đổi sang chiều ${routeLabel(reverse)}` : 'Không có tuyến chiều ngược lại'}
        aria-label={reverse ? `Đổi chiều: ${routeLabel(reverse)}` : 'Không có tuyến chiều ngược lại'}
        className="flex h-14 shrink-0 items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowLeftRight className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">Đổi chiều</span>
      </button>
    </div>
  )
}
