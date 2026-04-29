'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CreditCard, Smartphone, Building2, Shield, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaymentMethod {
  id: string
  icon: React.ReactNode
  labelKey: string
  sublabelKey: string
}

interface PaymentStepProps {
  locale: 'vi' | 'en'
  amount: number
  onSelect: (methodId: string) => void
  selectedMethod?: string
}

export default function PaymentStep({
  locale,
  amount,
  onSelect,
  selectedMethod,
}: PaymentStepProps) {
  const t = useTranslations('booking.payment')
  const tCta = useTranslations('common.cta')

  const methods: PaymentMethod[] = [
    {
      id: 'vnpay',
      icon: <QRCodeIcon />,
      labelKey: t('vnpay'),
      sublabelKey: t('scanQR'),
    },
    {
      id: 'momo',
      icon: <Smartphone className="w-6 h-6 text-pink-500" />,
      labelKey: t('momo'),
      sublabelKey: t('payMoMo'),
    },
    {
      id: 'card',
      icon: <CreditCard className="w-6 h-6 text-blue-500" />,
      labelKey: t('card'),
      sublabelKey: t('cardTypes'),
    },
    {
      id: 'bank',
      icon: <Building2 className="w-6 h-6 text-green-600" />,
      labelKey: t('bank'),
      sublabelKey: t('bankTransfer'),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-violet-50 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-violet-900">{t('securePayment')}</p>
          <p className="text-xs text-violet-700 mt-0.5">{t('sslEncrypted')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {methods.map((method) => (
          <button
            key={method.id}
            onClick={() => onSelect(method.id)}
            className={cn(
              'flex items-center gap-3 p-4 rounded-xl border text-left transition-all min-h-[72px]',
              selectedMethod === method.id
                ? 'border-gold-400 bg-gold-50 ring-2 ring-gold-400/30'
                : 'border-gray-200 bg-white hover:border-violet-300 hover:shadow-sm'
            )}
          >
            <div className="flex-shrink-0">{method.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-800">{method.labelKey}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{method.sublabelKey}</p>
            </div>
            {selectedMethod === method.id && (
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gold-500 flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {selectedMethod && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm text-gray-500 mb-2">{t('selectedMethod')}</p>
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-800">
              {methods.find((m) => m.id === selectedMethod)?.labelKey}
            </span>
            <span className="text-sm text-gray-400 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              SSL
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function QRCodeIcon() {
  return (
    <svg
      className="w-6 h-6 text-blue-600"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h1v1h-1v-1zm-4 0h1v3h-1v-3zm2 0h1v1h-1v-1zm2 0h1v3h-1v-3zm2 0h1v1h-1v-1zm-6 2h1v1h-1v-1zm2 0h1v1h-1v-1zm2 0h1v1h-1v-1zm-8 0h1v3h-1v-3zm2 0h1v1h-1v-1zm2 0h1v1h-1v-1zm2 0h1v1h-1v-1zm-6 2h1v1h-1v-1zm2 0h1v1h-1v-1z" />
    </svg>
  )
}
