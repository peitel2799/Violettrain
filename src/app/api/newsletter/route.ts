import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, locale = 'vi' } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const subscriber = {
      id: `NL-${Date.now()}`,
      email: email.trim().toLowerCase(),
      locale: locale === 'en' ? 'en' : 'vi',
      subscribedAt: new Date().toISOString(),
      status: 'active' as const,
    }

    console.log('\n📧 [NEWSLETTER SUBSCRIPTION]')
    console.log('  ID:', subscriber.id)
    console.log('  Email:', subscriber.email)
    console.log('  Locale:', subscriber.locale)
    console.log('  Time:', subscriber.subscribedAt)
    console.log('---\n')

    return NextResponse.json({
      success: true,
      message:
        locale === 'en'
          ? 'Successfully subscribed to our newsletter!'
          : 'Đăng ký nhận tin thành công!',
    })
  } catch (err) {
    console.error('[API /newsletter]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 })
  }
}
