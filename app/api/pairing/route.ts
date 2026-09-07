import { NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/phone'
import { backendUrl, backendHeaders, rateLimit, clientIp } from '../_shared'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const ip = clientIp(request)
  if (!rateLimit(ip, 8, 60_000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429 },
    )
  }

  const base = backendUrl()
  if (!base) {
    return NextResponse.json(
      {
        error:
          'Pairing backend is not configured. Set BOT_BACKEND_URL to your running DevArth-Bot server.',
      },
      { status: 503 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const phoneNumber = (body as { phoneNumber?: string })?.phoneNumber ?? ''
  const normalized = normalizePhone(phoneNumber)
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 })
  }

  try {
    const res = await fetch(`${base}/api/pairing`, {
      method: 'POST',
      headers: backendHeaders(),
      body: JSON.stringify({ phoneNumber: normalized.value }),
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error || 'The pairing service rejected the request.' },
        { status: res.status },
      )
    }
    return NextResponse.json(data, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: 'Could not reach the pairing service. Please try again.' },
      { status: 502 },
    )
  }
}
