'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode, useState } from 'react'
import { CalendarDays, ExternalLink, LogOut, Menu, ReceiptText, RefreshCw, ShieldCheck, TrainFront, X } from 'lucide-react'
import type { AdminSession } from '@/lib/admin-session'

const ROLE_LABELS: Record<AdminSession['role'], string> = {
  admin: 'Quản trị viên',
  operations: 'Vận hành',
  pricing: 'Giá vé',
  support: 'Hỗ trợ',
}

const NAV_ITEMS = [
  { href: '/admin/calendar', label: 'Giá vé', hint: 'Đặt giá bán trên web theo ngày', icon: CalendarDays },
  { href: '/admin/orders', label: 'Đơn & thanh toán', hint: 'Xem khách đã đặt và trả tiền', icon: ReceiptText },
  { href: '/admin/operations', label: 'Đồng bộ DSVN', hint: 'Lịch tàu tự lấy từ DSVN mỗi sáng', icon: RefreshCw },
] as const

export default function AdminShell({ session, children }: { session: AdminSession; children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function logout() {
    setLoggingOut(true)
    await fetch('/api/admin/login', { method: 'DELETE' }).catch(() => null)
    router.replace('/admin/login')
    router.refresh()
  }

  const navigation = (
    <>
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500 text-violet-950">
          <TrainFront className="h-5 w-5" />
        </div>
        <div>
          <p className="font-serif text-lg font-semibold text-white">Violette</p>
          <p className="text-xs text-white/40">Train Operations</p>
        </div>
      </div>

      <nav aria-label="Điều hướng quản trị" className="flex-1 p-3">
        <p className="px-3 pb-2 pt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/30">Vận hành</p>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              aria-current={active ? 'page' : undefined}
              className={`mt-1 flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold ${
                active ? 'bg-gold-500 text-violet-950' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="min-w-0">
                <span className="block">{item.label}</span>
                <span className={`block text-xs font-normal ${active ? 'text-violet-950/70' : 'text-white/45'}`}>{item.hint}</span>
              </span>
            </Link>
          )
        })}
        <a
          href="/vi"
          target="_blank"
          rel="noreferrer"
          className="mt-1 flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/65 hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="h-5 w-5" />
          Xem website
        </a>
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.06] p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/25 text-violet-200">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{session.displayName}</p>
            <p className="truncate text-xs text-white/40">{ROLE_LABELS[session.role]}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[#f6f4f8] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-violet-950 lg:flex">{navigation}</aside>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-950 text-gold-400">
            <TrainFront className="h-5 w-5" />
          </div>
          <div>
            <p className="font-serif font-semibold text-violet-950">Violette</p>
            <p className="text-[11px] text-slate-500">Train Operations</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Mở menu quản trị"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-black/45" />
          <aside className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-violet-950 shadow-2xl">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Đóng menu quản trị"
              className="absolute right-3 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            {navigation}
          </aside>
        </div>
      ) : null}

      <main className="min-h-screen lg:ml-64">{children}</main>
    </div>
  )
}
