'use client'

import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'gold'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-50 text-green-700 border border-green-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger: 'bg-red-50 text-red-700 border border-red-200',
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
  violet: 'bg-violet-50 text-violet-700 border border-violet-200',
  gold: 'bg-gold-50 text-gold-700 border border-gold-200',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

interface KPICardProps {
  label: string
  value: string | number
  sub?: string
  icon?: React.ElementType
  color?: 'violet' | 'gold' | 'green' | 'amber' | 'blue'
}

const colorMap: Record<string, string> = {
  violet: 'bg-violet-50 text-violet-600',
  gold: 'bg-gold-50 text-gold-600',
  green: 'bg-green-50 text-green-600',
  amber: 'bg-amber-50 text-amber-600',
  blue: 'bg-blue-50 text-blue-600',
}

export function KPICard({ label, value, sub, icon: Icon, color = 'violet' }: KPICardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        {Icon && (
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colorMap[color])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
