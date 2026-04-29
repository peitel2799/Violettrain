'use client'

import { cn } from '@/lib/utils'
import { Train, Search, Calendar, Users, AlertCircle } from 'lucide-react'

interface EmptyStateProps {
  icon?: 'train' | 'search' | 'calendar' | 'users' | 'alert'
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

const iconMap = {
  train: Train,
  search: Search,
  calendar: Calendar,
  users: Users,
  alert: AlertCircle,
}

export function EmptyState({
  icon = 'train',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const Icon = iconMap[icon]

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-violet-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-gray-500 max-w-md mb-6">{description}</p>}
      {action}
    </div>
  )
}

export function EmptyCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-gray-100 rounded-xl animate-pulse', className)} />
  )
}
