import { NextRequest, NextResponse } from 'next/server'

const FLASK_BASE = process.env.VM_API_URL || 'http://localhost:5001/api'

// Proxy ALL /api/admin/* requests to the Violet Manager Flask backend
export async function GET(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/admin', '')
  const search = request.nextUrl.search

  // Forward auth header
  const authHeader = request.headers.get('authorization')

  const res = await fetch(`${FLASK_BASE}${path}${search}`, {
    headers: {
      ...(authHeader ? { authorization: authHeader } : {}),
    },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function POST(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/admin', '')
  const body = await request.text()

  const res = await fetch(`${FLASK_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(request.headers.get('authorization')
        ? { authorization: request.headers.get('authorization')! }
        : {}),
    },
    body,
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function PATCH(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/admin', '')
  const body = await request.text()

  const res = await fetch(`${FLASK_BASE}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(request.headers.get('authorization')
        ? { authorization: request.headers.get('authorization')! }
        : {}),
    },
    body,
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function PUT(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/admin', '')
  const body = await request.text()

  const res = await fetch(`${FLASK_BASE}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(request.headers.get('authorization')
        ? { authorization: request.headers.get('authorization')! }
        : {}),
    },
    body,
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/admin', '')
  const authHeader = request.headers.get('authorization')

  const res = await fetch(`${FLASK_BASE}${path}`, {
    method: 'DELETE',
    headers: {
      ...(authHeader ? { authorization: authHeader } : {}),
    },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
