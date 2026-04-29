import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { name, email, phone, subject, message } = body

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    if (message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters' },
        { status: 400 }
      )
    }

    const contactRecord = {
      id: `CT-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || '',
      subject: subject?.trim() || 'General',
      message: message.trim(),
      createdAt: new Date().toISOString(),
      status: 'new' as const,
    }

    console.log('\n📬 [CONTACT FORM SUBMISSION]')
    console.log('  ID:', contactRecord.id)
    console.log('  Name:', contactRecord.name)
    console.log('  Email:', contactRecord.email)
    console.log('  Phone:', contactRecord.phone || '(not provided)')
    console.log('  Subject:', contactRecord.subject)
    console.log('  Message:', contactRecord.message.substring(0, 100) + (contactRecord.message.length > 100 ? '...' : ''))
    console.log('  Time:', contactRecord.createdAt)
    console.log('---\n')

    return NextResponse.json({
      success: true,
      id: contactRecord.id,
      message: 'Contact form submitted successfully',
    })
  } catch (err) {
    console.error('[API /contact]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 })
  }
}
