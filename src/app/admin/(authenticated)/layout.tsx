'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Train,
  Ticket,
  Tag,
  Calendar,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  FileSpreadsheet,
  Globe,
  Database,
  History,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

interface NavGroup {
  label: string
  icon?: React.ElementType
  items: NavItem[]
  defaultOpen?: boolean
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Tổng quan',
    items: [
      { href: '/admin', label: 'Bảng điều khiển', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Quản lý dữ liệu',
    icon: Database,
    defaultOpen: true,
    items: [
      { href: '/admin/ledger', label: 'Sổ quỹ', icon: FileSpreadsheet },
      { href: '/admin/sheets', label: 'Sheets', icon: FileSpreadsheet },
      { href: '/admin/stats', label: 'Thống kê', icon: BarChart3 },
    ],
  },
  {
    label: 'Người dùng',
    icon: Users,
    defaultOpen: false,
    items: [
      { href: '/admin/users', label: 'Tài khoản', icon: Users },
    ],
  },
  {
    label: 'Quản lý website',
    icon: Globe,
    defaultOpen: false,
    items: [
      { href: '/admin/bookings', label: 'Đặt vé website', icon: Ticket },
      { href: '/admin/routes', label: 'Tuyến đường', icon: Train },
      { href: '/admin/pricing', label: 'Giá vé', icon: Tag },
      { href: '/admin/schedules', label: 'Lịch trình', icon: Calendar },
    ],
  },
  {
    label: 'Cài đặt',
    items: [
      { href: '/admin/settings', label: 'Cài đặt', icon: Settings },
    ],
  },
]

function SidebarGroup({
  group,
  collapsed,
  pathname,
  defaultOpen,
}: {
  group: NavGroup
  collapsed: boolean
  pathname: string
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const hasActiveChild = group.items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  )

  useEffect(() => {
    if (hasActiveChild) setOpen(true)
  }, [hasActiveChild])

  if (collapsed) {
    return (
      <div className="px-2 mb-1">
        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 py-1 mb-1">
          {group.label}
        </div>
        {group.items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all mb-0.5',
                isActive ? 'bg-gold-500 text-violet-950' : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
              title={group.label + ' > ' + item.label}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', isActive && 'text-violet-950')} />
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <div className="px-2 mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 py-1 mb-1 hover:text-white/50 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          {group.icon && <group.icon className="w-3 h-3" />}
          {group.label}
        </span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <ul className="space-y-0.5">
          {group.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                    isActive
                      ? 'bg-gold-500 text-violet-950'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  )}
                >
                  <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-violet-950' : '')} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('vm_token') || localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
    } else {
      fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          if (!res.ok) {
            localStorage.removeItem('admin_token')
            localStorage.removeItem('admin_user')
            localStorage.removeItem('vm_token')
            localStorage.removeItem('vm_user')
            router.push('/admin/login')
          }
        })
        .catch(() => {
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_user')
          localStorage.removeItem('vm_token')
          localStorage.removeItem('vm_user')
          router.push('/admin/login')
        })
    }
    setMounted(true)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    localStorage.removeItem('vm_token')
    localStorage.removeItem('vm_user')
    window.location.href = '/admin/login'
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-violet-950 text-white z-30 transition-all duration-300 flex flex-col',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10 flex-shrink-0">
          <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Train className="w-4 h-4 text-violet-950" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">Violette</p>
              <p className="text-xs text-white/50">Admin Panel</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <SidebarGroup
              key={group.label}
              group={group}
              collapsed={collapsed}
              pathname={pathname}
              defaultOpen={group.defaultOpen || false}
            />
          ))}
        </nav>

        {/* User + Logout */}
        <div className="p-2 border-t border-white/10 flex-shrink-0">
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all w-full',
            )}
            title={collapsed ? 'Đăng xuất' : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      <main
        className={cn(
          'transition-all duration-300 min-h-screen',
          collapsed ? 'ml-16' : 'ml-60'
        )}
      >
        {children}
      </main>
    </div>
  )
}
