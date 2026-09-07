import { NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/phone'
import { backendUrl, backendHeaders, rateLimit, clientIp } from '../_shared'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const ip = clientIp(request)
  if (!rateLimit(`status:${ip}`, 60, 60_000)) {
    return NextResponse.json(
      { error: 'Too many requests.' },
      { status: 429 },
    )
  }

  const base = backendUrl()
  if (!base) {
    return NextResponse.json(
      { error: 'Pairing backend is not configured.' },
      { status: 503 },
    )
  }

  const { searchParams } = new URL(request.url)
  const normalized = normalizePhone(searchParams.get('phone') ?? '')
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 })
  }

  try {
    const res = await fetch(
      `${base}/api/status?phone=${encodeURIComponent(normalized.value)}`,
      {
        headers: backendHeaders(),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      },
    )
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch {
    return NextResponse.json(
      { error: 'Could not reach the pairing service.' },
      { status: 502 },
    )
  }
}
