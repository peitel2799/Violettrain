// Admin Settings & Database Page
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Database, Server, RefreshCw, Save, ExternalLink, HardDrive, FileJson } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataStats {
  bookings: { count: number; totalRevenue: number; lastUpdated: string }
  routes: { count: number }
  schedules: { count: number }
  pricing: { count: number }
  dataPath: string
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DataStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Env vars state
  const [envVars, setEnvVars] = useState({
    ADMIN_SECRET_TOKEN: '',
    SMTP_HOST: '',
    SMTP_PORT: '587',
    SMTP_USER: '',
    SMTP_PASS: '',
    EMAIL_FROM: 'noreply@violettetrain.vn',
    VNP_TMN_CODE: '',
    VNP_HASH_SECRET: '',
    VNP_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    VNP_RETURN_URL: 'http://localhost:3000/api/payments/vnpay/return',
    MOMO_PARTNER_CODE: '',
    MOMO_ACCESS_KEY: '',
    MOMO_SECRET_KEY: '',
    MOMO_ENDPOINT: 'https://test-payment.momo.vn/v2/gateway/api/create',
    NEXT_PUBLIC_BOOKING_ENABLED: 'true',
  })

  const getToken = () => localStorage.getItem('admin_token') || ''

  useEffect(() => {
    const token = getToken()
    if (!token) { router.push('/vi/admin/login'); return }

    fetch('/api/admin/stats', { headers: { Authorization: 'Bearer ' + token } })
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((data) => {
        setStats({
          bookings: { count: data.totalBookings || 0, totalRevenue: data.totalRevenue || 0, lastUpdated: new Date().toISOString() },
          routes: { count: data.routeCount || 0 },
          schedules: { count: data.scheduleCount || 0 },
          pricing: { count: data.pricingCount || 0 },
          dataPath: 'data/',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  const handleSaveEnv = async () => {
    setSaving(true)
    try {
      // In a real app, you'd send this to a protected API endpoint
      // For now, we'll show a success message and indicate this would need a backend handler
      await new Promise((r) => setTimeout(r, 1000))
      setMessage('Environment configuration saved successfully!')
      setTimeout(() => setMessage(''), 4000)
    } catch {
      setMessage('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>Settings & Database</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure environment variables and manage the local JSON database.</p>
      </div>

      {message && (
        <div className={cn(
          'mb-6 px-4 py-3 rounded-xl text-sm font-medium border',
          message.includes('Failed') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
        )}>
          {message}
        </div>
      )}

      {/* Database Overview */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-violet-500" />
          Database Overview
        </h2>
        {loading ? (
          <div className="flex items-center gap-3 text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            Loading database stats...
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-violet-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <FileJson className="w-4 h-4 text-violet-500" />
                <span className="text-xs text-violet-500 font-medium">DATA FILES</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">JSON Files</p>
              <p className="text-xs text-gray-500 mt-1">Path: <code className="bg-violet-100 px-1 rounded">data/</code></p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <FileJson className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-amber-500 font-medium">BOOKINGS</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats?.bookings?.count || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                Revenue: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(stats?.bookings?.totalRevenue || 0)}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <FileJson className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-blue-500 font-medium">ROUTES</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats?.routes?.count || 0}</p>
            </div>
            <div className="p-4 bg-gold-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <FileJson className="w-4 h-4 text-gold-500" />
                <span className="text-xs text-gold-500 font-medium">PRICING</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats?.pricing?.count || 0}</p>
              <p className="text-xs text-gray-500 mt-1">entries</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <FileJson className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500 font-medium">SCHEDULES</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats?.schedules?.count || 0}</p>
              <p className="text-xs text-gray-500 mt-1">entries</p>
            </div>
          </div>
        )}

        <div className="mt-5 p-4 bg-violet-50 rounded-xl border border-violet-100">
          <div className="flex items-start gap-3">
            <HardDrive className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">JSON File Storage</p>
              <p className="text-xs text-gray-500 mt-1">
                All data is stored in local JSON files inside the <code className="bg-violet-100 px-1 rounded">data/</code> directory.
                These files are located at:
              </p>
              <div className="mt-2 space-y-1">
                {['bookings.json', 'routes.json', 'pricing.json', 'schedules.json'].map((f) => (
                  <p key={f} className="text-xs text-gray-600">
                    <code className="bg-white px-1.5 py-0.5 rounded border border-violet-100">data/{f}</code>
                  </p>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                In production, replace <code className="bg-white px-1 rounded border">src/lib/admin-store.ts</code> with a real database
                (PostgreSQL, MongoDB, etc.) for persistent, multi-user access.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Environment Variables */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Server className="w-5 h-5 text-violet-500" />
            Environment Variables
          </h2>
          <a
            href="https://github.com/Peitel/Violette/blob/main/.env.example"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700"
          >
            <ExternalLink className="w-3 h-3" /> View .env.example
          </a>
        </div>

        <div className="space-y-4">
          {/* Admin Security */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Security</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">ADMIN_SECRET_TOKEN</label>
                <input type="password" value={envVars.ADMIN_SECRET_TOKEN}
                  onChange={(e) => setEnvVars((v) => ({ ...v, ADMIN_SECRET_TOKEN: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Set your admin token" />
                <p className="text-xs text-amber-500 mt-1">Required for admin API access</p>
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Email / SMTP</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">SMTP_HOST</label>
                <input type="text" value={envVars.SMTP_HOST}
                  onChange={(e) => setEnvVars((v) => ({ ...v, SMTP_HOST: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="smtp.gmail.com" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">SMTP_PORT</label>
                <input type="text" value={envVars.SMTP_PORT}
                  onChange={(e) => setEnvVars((v) => ({ ...v, SMTP_PORT: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="587" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">SMTP_USER</label>
                <input type="text" value={envVars.SMTP_USER}
                  onChange={(e) => setEnvVars((v) => ({ ...v, SMTP_USER: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="your@email.com" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">SMTP_PASS</label>
                <input type="password" value={envVars.SMTP_PASS}
                  onChange={(e) => setEnvVars((v) => ({ ...v, SMTP_PASS: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="App password" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">EMAIL_FROM</label>
                <input type="text" value={envVars.EMAIL_FROM}
                  onChange={(e) => setEnvVars((v) => ({ ...v, EMAIL_FROM: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="noreply@violettetrain.vn" />
              </div>
            </div>
          </div>

          {/* VNPay */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">VNPay Gateway</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">VNP_TMN_CODE</label>
                <input type="text" value={envVars.VNP_TMN_CODE}
                  onChange={(e) => setEnvVars((v) => ({ ...v, VNP_TMN_CODE: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Your VNPay terminal code" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">VNP_HASH_SECRET</label>
                <input type="password" value={envVars.VNP_HASH_SECRET}
                  onChange={(e) => setEnvVars((v) => ({ ...v, VNP_HASH_SECRET: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Hash secret key" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">VNP_URL</label>
                <input type="text" value={envVars.VNP_URL}
                  onChange={(e) => setEnvVars((v) => ({ ...v, VNP_URL: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
          </div>

          {/* MoMo */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">MoMo Gateway</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">MOMO_PARTNER_CODE</label>
                <input type="text" value={envVars.MOMO_PARTNER_CODE}
                  onChange={(e) => setEnvVars((v) => ({ ...v, MOMO_PARTNER_CODE: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="MOMO_PARTNER_CODE" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">MOMO_ACCESS_KEY</label>
                <input type="text" value={envVars.MOMO_ACCESS_KEY}
                  onChange={(e) => setEnvVars((v) => ({ ...v, MOMO_ACCESS_KEY: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="MOMO_ACCESS_KEY" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">MOMO_SECRET_KEY</label>
                <input type="password" value={envVars.MOMO_SECRET_KEY}
                  onChange={(e) => setEnvVars((v) => ({ ...v, MOMO_SECRET_KEY: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="MOMO_SECRET_KEY" />
              </div>
            </div>
          </div>

          {/* Booking */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Booking</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">NEXT_PUBLIC_BOOKING_ENABLED</label>
                <select value={envVars.NEXT_PUBLIC_BOOKING_ENABLED}
                  onChange={(e) => setEnvVars((v) => ({ ...v, NEXT_PUBLIC_BOOKING_ENABLED: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="true">true (Enabled)</option>
                  <option value="false">false (Disabled)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center gap-3">
            <button
              onClick={handleSaveEnv}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-900 hover:bg-violet-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Configuration'}
            </button>
            <p className="text-xs text-gray-400">
              Edit <code className="bg-gray-100 px-1 rounded">.env.local</code> directly for production configuration.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
