'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, TrainFront } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Không thể đăng nhập.')

      router.replace('/admin/calendar')
      router.refresh()
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Không thể đăng nhập.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#160b24] p-4 sm:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#20102f] shadow-2xl shadow-black/30 lg:grid-cols-[1.1fr_0.9fr] sm:min-h-[calc(100vh-4rem)]">
        <section className="relative hidden min-h-[680px] overflow-hidden lg:block">
          <Image
            src="/violette-train-evening.jpg"
            alt="Đoàn tàu Violette vào buổi tối"
            fill
            priority
            sizes="(min-width: 1024px) 55vw, 0px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#160b24] via-[#241237]/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-14">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-4 py-2 text-sm backdrop-blur-md">
              <TrainFront className="h-4 w-4 text-gold-400" />
              Trung tâm vận hành Violette Train
            </div>
            <h1 className="max-w-xl font-serif text-4xl font-semibold leading-tight xl:text-5xl">
              Quản lý từng chuyến tàu một cách rõ ràng.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-white/70">
              Thiết lập tuyến, lịch chạy, sức chứa và giá bán theo ngày trên một nguồn dữ liệu duy nhất.
            </p>
          </div>
        </section>

        <section className="flex items-center px-6 py-10 sm:px-12 lg:px-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500 text-violet-950 shadow-lg shadow-gold-500/20">
                <TrainFront className="h-6 w-6" />
              </div>
              <div>
                <p className="font-serif text-xl font-semibold text-white">Violette Train</p>
                <p className="text-sm text-white/45">Admin Operations</p>
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                Đăng nhập bảo mật qua Supabase
              </div>
              <h2 className="font-serif text-3xl font-semibold text-white sm:text-4xl">Chào mừng trở lại</h2>
              <p className="mt-3 text-sm leading-6 text-white/55">
                Dùng tài khoản đã được cấp quyền để truy cập dữ liệu vận hành.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="admin-email" className="mb-2 block text-sm font-semibold text-white/75">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="username"
                    autoFocus
                    required
                    placeholder="admin@violettetrain.vn"
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] pl-12 pr-4 text-base text-white placeholder:text-white/25 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-password" className="mb-2 block text-sm font-semibold text-white/75">Mật khẩu</label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    minLength={8}
                    placeholder="Ít nhất 8 ký tự"
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] pl-12 pr-12 text-base text-white placeholder:text-white/25 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error ? (
                <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm leading-5 text-red-200">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading || !email || password.length < 8}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-gold-500 px-5 text-base font-bold text-violet-950 shadow-lg shadow-gold-500/15 hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Đang xác thực…' : 'Đăng nhập quản trị'}
              </button>
            </form>

            <p className="mt-8 border-t border-white/10 pt-6 text-xs leading-5 text-white/35">
              Không còn tài khoản hoặc mật khẩu mặc định. Liên hệ quản trị hệ thống nếu bạn chưa được cấp quyền.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
