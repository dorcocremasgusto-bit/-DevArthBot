import { NextResponse } from "next/server"
import { getBackend, normalizePhone } from "@/lib/pairing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const normalized = normalizePhone(searchParams.get("phoneNumber"))
  if (!normalized) {
    return NextResponse.json({ status: "failed" }, { status: 400 })
  }

  const backend = getBackend()
  if (!backend) {
    // No backend configured — report waiting rather than a fake success.
    return NextResponse.json({ status: "waiting" })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    const res = await fetch(
      `${backend.url}/api/status?phoneNumber=${encodeURIComponent(normalized)}`,
      {
        headers: backend.key ? { "x-bot-key": backend.key } : undefined,
        signal: controller.signal,
        cache: "no-store",
      },
    )
    clearTimeout(timeout)

    const data = await res.json().catch(() => null)
    const status = data?.status
    if (status === "connected" || status === "waiting" || status === "failed") {
      return NextResponse.json({ status })
    }
    return NextResponse.json({ status: "waiting" })
  } catch {
    // Transient — let the client keep polling.
    return NextResponse.json({ status: "waiting" })
  }
}
