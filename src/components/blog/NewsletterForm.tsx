'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function NewsletterForm() {
  const locale = useLocale()
  const t = useTranslations('blog.newsletter')

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), locale }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setStatus('success')
        setEmail('')
      } else {
        setErrorMsg(t('error'))
        setStatus('error')
      }
    } catch {
      setErrorMsg(t('networkError'))
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-4">
        <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
        <p className="text-green-200 text-sm font-medium">
          {t('success')}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 max-w-md mx-auto">
      <div className="flex-1">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder={t('placeholder')}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'loading'}
        className={cn(
          'flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all hover:scale-105',
          status === 'loading'
            ? 'bg-gold-400/50 text-violet-400 cursor-not-allowed'
            : 'bg-gold-500 hover:bg-gold-400 text-violet-950 shadow-lg shadow-gold-500/25'
        )}
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
          </>
        ) : (
          t('submit')
        )}
      </button>
    </form>
  )
}
