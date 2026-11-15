'use client'

import { ReactNode, useEffect, useId, useRef } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney, TICKETS_PER_CABIN } from './schedule-utils'

/** Native <dialog>: focus trap, Esc to close and inert background come for free. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'center',
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  variant?: 'center' | 'drawer'
  size?: 'md' | 'lg'
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === ref.current) onClose() }}
      className={cn(
        'm-0 max-h-none max-w-none overflow-hidden border-0 bg-transparent p-0 text-slate-900 backdrop:bg-slate-950/50 backdrop:backdrop-blur-[2px] open:flex',
        variant === 'drawer'
          ? 'ml-auto h-dvh w-full sm:w-[min(560px,100vw)]'
          : 'mx-auto my-auto h-fit max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)]',
        variant === 'center' && (size === 'lg' ? 'sm:w-[min(760px,calc(100vw-2rem))]' : 'sm:w-[min(560px,calc(100vw-2rem))]')
      )}
    >
      <div className={cn(
        'flex w-full flex-col bg-white shadow-2xl',
        variant === 'drawer' ? 'h-full' : 'max-h-[calc(100dvh-1rem)] overflow-hidden rounded-3xl'
      )}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-slate-900 sm:text-xl">{title}</h2>
            {description ? <div className="mt-1 text-sm text-slate-500">{description}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">{footer}</div> : null}
      </div>
    </dialog>
  )
}

const moneyFormatter = new Intl.NumberFormat('vi-VN')

/** VND input that formats thousands while typing ("2.000.000") and never accepts letters. */
export function MoneyInput({
  id,
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
}: {
  id: string
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
}) {
  return (
    <div className={cn(
      'flex h-14 items-center rounded-2xl border bg-white pr-4 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/15',
      invalid ? 'border-rose-300' : 'border-slate-300',
      disabled && 'bg-slate-100'
    )}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={value == null ? '' : moneyFormatter.format(value)}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '').slice(0, 9)
          onChange(digits ? Number(digits) : null)
        }}
        placeholder="Ví dụ: 2.000.000"
        className="h-full min-w-0 flex-1 rounded-2xl bg-transparent px-4 text-xl font-bold tabular-nums text-slate-900 outline-none placeholder:text-base placeholder:font-normal placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-500"
      />
      <span className="text-lg font-semibold text-slate-400" aria-hidden="true">đ</span>
    </div>
  )
}

/** Price editor with quick adjust buttons and the full-cabin total always visible. */
export function TicketPriceField({
  id,
  label,
  value,
  onChange,
  suggestions = [],
  disabled,
  hint,
}: {
  id: string
  label: string
  value: number | null
  onChange: (value: number | null) => void
  suggestions?: number[]
  disabled?: boolean
  hint?: ReactNode
}) {
  const invalid = value != null && value < 10_000
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-base font-semibold text-slate-800">{label}</label>
      <MoneyInput id={id} value={value} onChange={onChange} disabled={disabled} invalid={invalid} describedBy={`${id}-total`} />
      {!disabled ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {[-100_000, -50_000, 50_000, 100_000].map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => onChange(Math.max((value ?? 0) + delta, 0) || null)}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800"
            >
              {delta > 0 ? '+' : '−'}{moneyFormatter.format(Math.abs(delta))}
            </button>
          ))}
          {suggestions.filter((price) => price !== value).map((price) => (
            <button
              key={price}
              type="button"
              onClick={() => onChange(price)}
              className="h-10 rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-700 hover:bg-violet-100 hover:text-violet-900"
            >
              Dùng {formatMoney(price)}
            </button>
          ))}
        </div>
      ) : null}
      <p id={`${id}-total`} className="mt-3 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-900" aria-live="polite">
        Khách trả cho <strong>1 cabin (4 vé)</strong>:{' '}
        <strong className="text-lg tabular-nums">{value ? formatMoney(value * TICKETS_PER_CABIN) : '—'}</strong>
      </p>
      {invalid ? <p className="mt-2 text-sm font-medium text-rose-700">Giá 1 vé tối thiểu 10.000đ.</p> : null}
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </div>
  )
}

export function Stepper({
  id,
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  disabled,
  hint,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
  hint?: ReactNode
}) {
  const clamp = (next: number) => Math.min(Math.max(Number.isFinite(next) ? next : min, min), max)
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-base font-semibold text-slate-800">{label}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Giảm ${label.toLowerCase()}`}
          disabled={disabled || value <= min}
          onClick={() => onChange(clamp(value - 1))}
          className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-5 w-5" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(clamp(Number(event.target.value)))}
          className="h-14 w-24 rounded-2xl border border-slate-300 text-center text-xl font-bold tabular-nums outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 disabled:bg-slate-100"
        />
        <button
          type="button"
          aria-label={`Tăng ${label.toLowerCase()}`}
          disabled={disabled || value >= max}
          onClick={() => onChange(clamp(value + 1))}
          className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </div>
  )
}

/** Whether Violette sells a departure on the website. Cancelling a train is up to DSVN, never staff. */
export type SaleChoice = 'published' | 'draft'

const SALE_OPTIONS: Array<{ value: SaleChoice; label: string; help: string; active: string }> = [
  { value: 'published', label: 'Mở bán', help: 'Khách thấy và đặt được trên web', active: 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-emerald-500' },
  { value: 'draft', label: 'Tạm ngưng bán', help: 'Ẩn với khách, ví dụ khi DSVN hết chỗ. Mở lại lúc nào cũng được', active: 'border-amber-500 bg-amber-50 text-amber-900 ring-amber-500' },
]

export function SaleStatusPicker({
  name,
  value,
  onChange,
  disabled,
}: {
  name: string
  value: SaleChoice
  onChange: (value: SaleChoice) => void
  disabled?: boolean
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-base font-semibold text-slate-800">Bán trên web</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {SALE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex min-h-16 cursor-pointer flex-col justify-center rounded-2xl border px-4 py-3 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-violet-500/30',
              value === option.value ? `${option.active} ring-1` : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className="font-bold">{option.label}</span>
            <span className="mt-0.5 text-xs leading-snug opacity-80">{option.help}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'error' | 'success'; children: ReactNode }) {
  const styles = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }
  return <div className={cn('rounded-2xl border px-4 py-3 text-sm leading-relaxed', styles[tone])}>{children}</div>
}
