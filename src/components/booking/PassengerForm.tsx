'use client'

import { useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { User, Phone, Mail, AlertCircle, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BookingPassenger } from '@/lib/types'

// ─── Zod Schema ─────────────────────────────────────────────────────────────

const passengerSchema = z.object({
  type: z.enum(['adult', 'child']),
  gender: z.enum(['male', 'female', 'other']).optional().or(z.literal('')),
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .min(8, 'Phone number too short')
    .max(20, 'Phone number too long')
    .regex(/^[\d\s\+\-\(\)]+$/, 'Invalid phone format'),
  dateOfBirth: z.string().optional(),
  specialRequests: z.string().max(500, 'Request too long').optional(),
})

const schema = z.object({
  passengers: z.array(passengerSchema).min(1).max(6),
})

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface PassengerFormProps {
  passengers: BookingPassenger[]
  locale: 'vi' | 'en'
  onUpdate: (passengers: BookingPassenger[]) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PassengerForm({ passengers, locale, onUpdate }: PassengerFormProps) {
  const t = useTranslations('booking.form')
  const isVi = locale === 'vi'

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      passengers: passengers.length > 0
        ? passengers
        : [{ type: 'adult', gender: '', fullName: '', email: '', phone: '', dateOfBirth: '', specialRequests: '' }],
    },
    mode: 'onBlur',
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'passengers' })
  const watchedPassengers = watch('passengers')

  // Sync form values to parent whenever they change
  useEffect(() => {
    if (watchedPassengers) {
      onUpdate(watchedPassengers as BookingPassenger[])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedPassengers])

  // Keep form in sync if parent passengers prop changes externally
  useEffect(() => {
    if (passengers.length > 0 && passengers.length !== fields.length) {
      // Parent added/removed a passenger from outside
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passengers])

  const onValid = (_data: FormValues) => {
    // All validation passed — parent already has updated data via watch
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-6">
      {fields.map((field, idx) => {
        const fieldErrors = errors.passengers?.[idx]
        const hasErrors = !!fieldErrors

        return (
          <div
            key={field.id}
            className={cn(
              'bg-white rounded-xl border p-5 shadow-sm transition-colors',
              hasErrors ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <User className="w-4 h-4 text-violet-500" />
                {t('passenger')} {idx + 1}
                {watchedPassengers?.[idx]?.type === 'child' && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {t('child')}
                  </span>
                )}
              </h3>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="text-red-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                  title={t('removePassenger')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  {t('passengerType')}
                </label>
                <select
                  {...register(`passengers.${idx}.type`)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
                >
                  <option value="adult">{t('adult')}</option>
                  <option value="child">{t('child')}</option>
                </select>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  {t('gender')}
                </label>
                <select
                  {...register(`passengers.${idx}.gender`)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
                >
                  <option value="">{t('selectOption')}</option>
                  <option value="male">{t('male')}</option>
                  <option value="female">{t('female')}</option>
                  <option value="other">{t('other')}</option>
                </select>
              </div>

              {/* Full Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  {t('fullName')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    {...register(`passengers.${idx}.fullName`)}
                    placeholder={isVi ? 'Nhập họ và tên đầy đủ' : 'Enter full name'}
                    className={cn(
                      'w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
                      fieldErrors?.fullName ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    )}
                  />
                </div>
                {fieldErrors?.fullName && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {t('nameRequired')}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  {t('email')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    {...register(`passengers.${idx}.email`)}
                    placeholder="email@example.com"
                    className={cn(
                      'w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
                      fieldErrors?.email ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    )}
                  />
                </div>
                {fieldErrors?.email && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {t('invalidEmail')}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  {t('phone')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    {...register(`passengers.${idx}.phone`)}
                    placeholder="090 123 4567"
                    className={cn(
                      'w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
                      fieldErrors?.phone ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    )}
                  />
                </div>
                {fieldErrors?.phone && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {t('invalidPhone')}
                  </p>
                )}
              </div>

              {/* Date of Birth */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  {t('dateOfBirth')}
                </label>
                <input
                  type="date"
                  {...register(`passengers.${idx}.dateOfBirth`)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
                />
              </div>

              {/* Special Requests */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  {t('specialRequests')}
                </label>
                <textarea
                  {...register(`passengers.${idx}.specialRequests`)}
                  placeholder={t('specialRequestsPlaceholder')}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 resize-none"
                />
              </div>
            </div>
          </div>
        )
      })}

      {/* Add Passenger */}
      {fields.length < 6 && (
        <button
          type="button"
          onClick={() =>
            append({ type: 'adult', gender: '', fullName: '', email: '', phone: '', dateOfBirth: '', specialRequests: '' })
          }
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-violet-400 hover:text-violet-600 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          + {t('addPassenger')}
        </button>
      )}
    </form>
  )
}
