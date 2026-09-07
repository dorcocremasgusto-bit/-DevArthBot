// Shared server-side helpers for the pairing proxy routes.

export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const trimmed = raw.trim().replace(/[\s\-().]/g, "")
  const withPlus = trimmed.startsWith("+")
    ? "+" + trimmed.slice(1).replace(/\D/g, "")
    : "+" + trimmed.replace(/\D/g, "")
  return /^\+[1-9]\d{7,14}$/.test(withPlus) ? withPlus : null
}

/** Digits only (no leading +) — the form Baileys' requestPairingCode expects. */
export function toDigits(normalized: string): string {
  return normalized.replace(/\D/g, "")
}

export function getBackend(): { url: string; key: string | undefined } | null {
  const url = process.env.BOT_BACKEND_URL
  if (!url) return null
  return { url: url.replace(/\/$/, ""), key: process.env.BOT_BACKEND_KEY }
}

// Very small in-memory rate limiter (per instance). Good enough to blunt abuse
// on a single serverless instance; a persistent store is recommended at scale.
const HITS = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = HITS.get(key)
  if (!entry || now > entry.resetAt) {
    HITS.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count += 1
  return true
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "unknown"
}

export const BACKEND_MISSING_MESSAGE =
  "The pairing service isn't available yet. The bot backend (BOT_BACKEND_URL) needs to be running and configured."
