import { NextResponse } from "next/server"
import {
  BACKEND_MISSING_MESSAGE,
  clientIp,
  getBackend,
  normalizePhone,
  rateLimit,
  toDigits,
} from "@/lib/pairing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  // Rate limit per IP: 5 requests / minute.
  if (!rateLimit(`pair:${clientIp(req)}`)) {
    return NextResponse.json(
      { success: false, message: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request." },
      { status: 400 },
    )
  }

  const phoneRaw = (body as { phoneNumber?: unknown })?.phoneNumber
  const normalized = normalizePhone(phoneRaw)
  if (!normalized) {
    return NextResponse.json(
      {
        success: false,
        message: "Please enter a valid WhatsApp number in international format, e.g. +509XXXXXXXX",
      },
      { status: 400 },
    )
  }

  const backend = getBackend()
  if (!backend) {
    return NextResponse.json(
      { success: false, message: BACKEND_MISSING_MESSAGE },
      { status: 503 },
    )
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)
    const res = await fetch(`${backend.url}/api/pairing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(backend.key ? { "x-bot-key": backend.key } : {}),
      },
      body: JSON.stringify({ phoneNumber: normalized, digits: toDigits(normalized) }),
      signal: controller.signal,
      cache: "no-store",
    })
    clearTimeout(timeout)

    const data = await res.json().catch(() => null)

    if (!res.ok || !data?.pairingCode) {
      return NextResponse.json(
        {
          success: false,
          message:
            data?.message || "We couldn't generate a pairing code right now. Please try again.",
        },
        { status: res.ok ? 502 : res.status },
      )
    }

    return NextResponse.json({
      success: true,
      pairingCode: String(data.pairingCode),
      expiresIn: typeof data.expiresIn === "number" ? data.expiresIn : undefined,
    })
  } catch {
    // Never leak internal/technical errors to the client.
    return NextResponse.json(
      { success: false, message: "The pairing service is temporarily unreachable. Please try again." },
      { status: 502 },
    )
  }
}
