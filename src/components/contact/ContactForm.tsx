'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ContactForm({ locale }: { locale: string }) {
  const t = useTranslations('contact.form')
  const isVi = locale === 'vi'

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setErrorMsg(isVi ? 'Vui lòng điền đầy đủ các trường bắt buộc.' : 'Please fill in all required fields.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setStatus('success')
        setForm({ name: '', email: '', phone: '', subject: '', message: '' })
      } else {
        setErrorMsg(data.error || (isVi ? 'Có lỗi xảy ra. Vui lòng thử lại.' : 'An error occurred. Please try again.'))
        setStatus('error')
      }
    } catch {
      setErrorMsg(isVi ? 'Không thể gửi tin nhắn. Vui lòng thử lại.' : 'Unable to send message. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">
          {isVi ? 'Gửi tin nhắn thành công!' : 'Message Sent Successfully!'}
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          {isVi
            ? 'Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi trong vòng 24 giờ.'
            : 'Thank you for reaching out. We will respond within 24 hours.'}
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="text-sm text-violet-600 hover:text-violet-700 font-medium"
        >
          {isVi ? 'Gửi tin nhắn khác' : 'Send another message'}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 shadow-sm">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          {t('name')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          placeholder={isVi ? 'Nhập họ và tên' : 'Enter your full name'}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            {t('email')} <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="email@example.com"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            {t('phone')}
          </label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="090 123 4567"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          {t('subject')}
        </label>
        <select
          name="subject"
          value={form.subject}
          onChange={handleChange}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
        >
          <option value="">{isVi ? 'Chọn chủ đề' : 'Select a subject'}</option>
          <option value="booking">{isVi ? 'Đặt vé' : 'Booking inquiry'}</option>
          <option value="support">{isVi ? 'Hỗ trợ' : 'Support'}</option>
          <option value="feedback">{isVi ? 'Góp ý' : 'Feedback'}</option>
          <option value="other">{isVi ? 'Khác' : 'Other'}</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          {t('message')} <span className="text-red-500">*</span>
        </label>
        <textarea
          name="message"
          value={form.message}
          onChange={handleChange}
          required
          rows={4}
          placeholder={isVi ? 'Nhập nội dung tin nhắn...' : 'Enter your message...'}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 resize-none"
        />
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all hover:scale-[1.01]',
          status === 'loading'
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-gold-500 hover:bg-gold-400 text-violet-950 shadow-lg shadow-gold-500/25'
        )}
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {isVi ? 'Đang gửi...' : 'Sending...'}
          </>
        ) : (
          t('send')
        )}
      </button>
    </form>
  )
}
