'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Train } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (res.status === 401) {
        setError('Tên đăng nhập hoặc mật khẩu không đúng.')
      } else if (res.ok) {
        const data = await res.json()
        localStorage.setItem('admin_token', data.token)
        localStorage.setItem('admin_user', data.username)
        router.push('/admin')
      } else {
        setError('Lỗi kết nối. Vui lòng thử lại.')
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-violet-900 to-violet-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gold-500 rounded-2xl mb-4 shadow-lg shadow-gold-500/20">
            <Train className="w-8 h-8 text-violet-950" />
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-serif)' }}>
            Violette Train
          </h1>
          <p className="text-white/50 text-sm mt-1">Bảng điều khiển quản trị</p>
        </div>

        <div className="bg-white rounded-2xl border border-white/10 shadow-xl shadow-violet-950/50 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Chào mừng trở lại</h2>
          <p className="text-sm text-gray-500 mb-6">
            Đăng nhập để truy cập bảng điều khiển quản trị.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Tên đăng nhập
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                required
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim() || !password.trim()}
              className={cn(
                'w-full py-2.5 rounded-lg font-semibold text-sm transition-all',
                loading || !username.trim() || !password.trim()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gold-500 hover:bg-gold-400 text-violet-950 shadow-lg shadow-gold-500/20 hover:shadow-gold-500/30'
              )}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Tài khoản mặc định: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">violet</code> / <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">violet</code>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          Violette Train Admin &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
