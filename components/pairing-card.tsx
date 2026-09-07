'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { normalizePhone } from '@/lib/phone'

type Phase = 'idle' | 'loading' | 'success' | 'expired' | 'error'
type Connection = 'waiting' | 'connected' | 'failed'

interface PairingResponse {
  code?: string
  expiresAt?: number
  status?: Connection
  error?: string
}

function formatCode(code: string) {
  const clean = code.replace(/[^A-Za-z0-9]/g, '')
  if (clean.length === 8) return `${clean.slice(0, 4)}-${clean.slice(4)}`
  return clean
}

function mmss(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = String(Math.floor(total / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${m}:${s}`
}

const STATUS_META: Record<
  Connection,
  { label: string; dot: string; text: string; ring?: boolean }
> = {
  waiting: {
    label: 'Waiting for WhatsApp connection',
    dot: 'bg-warning',
    text: 'text-warning',
  },
  connected: {
    label: 'WhatsApp Connected',
    dot: 'bg-success',
    text: 'text-success',
    ring: true,
  },
  failed: {
    label: 'Connection failed',
    dot: 'bg-danger',
    text: 'text-danger',
  },
}

export function PairingCard() {
  const [phone, setPhone] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [code, setCode] = useState('')
  const [connection, setConnection] = useState<Connection>('waiting')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [remaining, setRemaining] = useState(0)

  const expiresAtRef = useRef<number | null>(null)
  const normalizedRef = useRef<string>('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimers = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (tickRef.current) clearInterval(tickRef.current)
    pollRef.current = null
    tickRef.current = null
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  const pollStatus = useCallback(async () => {
    const p = normalizedRef.current
    if (!p) return
    try {
      const res = await fetch(`/api/status?phone=${encodeURIComponent(p)}`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      const data = (await res.json()) as PairingResponse
      if (data.status === 'connected') {
        setConnection('connected')
        clearTimers()
      } else if (data.status === 'failed') {
        setConnection('failed')
      }
    } catch {
      /* transient network error — keep polling */
    }
  }, [clearTimers])

  const startTracking = useCallback(
    (expiresAt: number) => {
      expiresAtRef.current = expiresAt
      setRemaining(expiresAt - Date.now())

      tickRef.current = setInterval(() => {
        const left = (expiresAtRef.current ?? 0) - Date.now()
        setRemaining(left)
        if (left <= 0) {
          clearTimers()
          setPhase((prev) => (prev === 'success' ? 'expired' : prev))
        }
      }, 1000)

      pollRef.current = setInterval(pollStatus, 3000)
      void pollStatus()
    },
    [clearTimers, pollStatus],
  )

  const requestCode = useCallback(
    async (rawPhone: string) => {
      const normalized = normalizePhone(rawPhone)
      if (!normalized.ok) {
        setPhase('error')
        setError(normalized.error)
        return
      }

      clearTimers()
      setError('')
      setCopied(false)
      setConnection('waiting')
      setPhase('loading')

      try {
        const res = await fetch('/api/pairing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: normalized.value }),
        })
        const data = (await res.json()) as PairingResponse

        if (!res.ok || !data.code || !data.expiresAt) {
          setPhase('error')
          setError(data.error || 'Unable to generate a pairing code.')
          return
        }

        normalizedRef.current = normalized.value
        setCode(data.code)
        setConnection(data.status ?? 'waiting')
        setPhase('success')
        startTracking(data.expiresAt)
      } catch {
        setPhase('error')
        setError('Could not reach the pairing service. Please try again.')
      }
    },
    [clearTimers, startTracking],
  )

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void requestCode(phone)
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.replace(/[^A-Za-z0-9]/g, ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Copy failed — select the code manually.')
    }
  }

  const isLoading = phase === 'loading'
  const showForm = phase === 'idle' || phase === 'error' || phase === 'loading'

  return (
    <div className="glass animate-rise rounded-[var(--radius)] p-6 sm:p-7">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
          <WhatsAppIcon className="size-6 text-accent" />
        </div>
        <div>
          <h2 className="font-display text-lg leading-tight font-semibold">
            WhatsApp Pairing
          </h2>
          <p className="text-xs text-muted-foreground">
            Secure device linking
          </p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="wa-number"
              className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              Enter WhatsApp Number
            </label>
            <input
              id="wa-number"
              name="wa-number"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="go"
              placeholder="+509XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3.5 text-base tracking-wide text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40 disabled:opacity-60"
            />
          </div>

          {phase === 'error' && error && (
            <p
              role="alert"
              className="flex items-center gap-2 text-sm text-danger"
            >
              <span className="size-1.5 rounded-full bg-danger" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || phone.trim().length === 0}
            className="btn-glow group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-3.5 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-transform duration-200 hover:scale-[1.015] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
          >
            {isLoading ? (
              <>
                <span className="size-4 animate-spin-slow rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                Generating pairing code…
              </>
            ) : (
              'Get Code Pairing'
            )}
          </button>
        </form>
      )}

      {phase === 'success' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-background/50 px-4 py-6">
            <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Your Pairing Code
            </span>
            <p className="font-display glow-text text-4xl font-bold tracking-[0.15em] text-accent tabular-nums sm:text-5xl">
              {formatCode(code)}
            </p>

            <div className="mt-1 text-xs text-muted-foreground">
              {remaining > 0 ? (
                <span>
                  Code expires in{' '}
                  <span className="font-semibold text-foreground tabular-nums">
                    {mmss(remaining)}
                  </span>
                </span>
              ) : (
                <span className="text-danger">Pairing code expired</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onCopy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm font-semibold tracking-wide text-foreground uppercase transition hover:border-primary hover:bg-muted/70"
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </button>

          <StatusRow connection={connection} />

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            On your phone open WhatsApp → Linked devices → Link with phone
            number, then enter this code.
          </p>
        </div>
      )}

      {phase === 'expired' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-6 text-center">
            <p className="font-display text-lg font-semibold text-danger">
              Pairing code expired
            </p>
            <p className="text-xs text-muted-foreground">
              Generate a fresh code to continue linking.
            </p>
          </div>

          <StatusRow connection={connection} />

          <button
            type="button"
            onClick={() => void requestCode(normalizedRef.current || phone)}
            className="btn-glow flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-3.5 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-transform duration-200 hover:scale-[1.015] active:scale-[0.99]"
          >
            Get New Code
          </button>
        </div>
      )}
    </div>
  )
}

function StatusRow({ connection }: { connection: Connection }) {
  const meta = STATUS_META[connection]
  return (
    <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-border bg-background/40 px-4 py-3">
      <span
        className={`size-2.5 rounded-full ${meta.dot} ${meta.ring ? 'pulse-success' : ''}`}
        aria-hidden="true"
      />
      <span className={`text-sm font-medium ${meta.text}`}>{meta.label}</span>
    </div>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.05h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.14.17-.24.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.41-.56-.42l-.48-.01c-.16 0-.43.06-.66.31-.22.24-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.25 3.74.59.26 1.06.41 1.42.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  )
}
