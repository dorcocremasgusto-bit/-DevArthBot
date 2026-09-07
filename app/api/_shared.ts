/**
 * Shared helpers for the pairing proxy routes.
 * All secrets (BOT_API_KEY) stay server-side and are never sent to the client.
 */

export function backendUrl(): string | null {
  const raw = process.env.BOT_BACKEND_URL
  if (!raw) return null
  return raw.replace(/\/+$/, '')
}

export function backendHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const key = process.env.BOT_API_KEY
  if (key) headers['x-api-key'] = key
  return headers
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

// Lightweight in-memory sliding-window limiter (best-effort, per instance).
const buckets = new Map<string, number[]>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return false
  }
  hits.push(now)
  buckets.set(key, hits)
  return true
}
