"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { StatusBadge, type ConnectionStatus } from "./status-badge"

type Phase = "idle" | "requesting" | "code" | "expired"

function normalizePhone(raw: string): string {
  const trimmed = raw.trim().replace(/[\s\-().]/g, "")
  if (trimmed.startsWith("+")) return "+" + trimmed.slice(1).replace(/\D/g, "")
  return "+" + trimmed.replace(/\D/g, "")
}

function isValidPhone(normalized: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(normalized)
}

function formatCode(code: string): string {
  const clean = code.replace(/[^A-Za-z0-9]/g, "")
  if (clean.length === 8) return `${clean.slice(0, 4)}-${clean.slice(4)}`
  return code
}

function mmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function PairingCard() {
  const [phone, setPhone] = useState("")
  const [phase, setPhase] = useState<Phase>("idle")
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const activePhoneRef = useRef<string | null>(null)

  // Expiry countdown
  useEffect(() => {
    if (secondsLeft === null || phase !== "code") return
    if (secondsLeft <= 0) {
      setPhase("expired")
      return
    }
    const t = setTimeout(() => setSecondsLeft((v) => (v === null ? null : v - 1)), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft, phase])

  // Status polling against the real backend
  useEffect(() => {
    if (phase !== "code" || !activePhoneRef.current) return
    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/status?phoneNumber=${encodeURIComponent(activePhoneRef.current as string)}`,
          { cache: "no-store" },
        )
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled) return
        if (data?.status === "connected" || data?.status === "waiting" || data?.status === "failed") {
          setStatus(data.status)
        }
      } catch {
        /* transient network error — keep polling */
      }
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [phase])

  // Stop polling once terminal
  const polling = status !== "connected" && phase === "code"
  useEffect(() => {
    if (status === "connected") setSecondsLeft(null)
  }, [status])
  void polling

  const requestCode = useCallback(async () => {
    setError(null)
    setCopied(false)
    const normalized = normalizePhone(phone)
    if (!isValidPhone(normalized)) {
      setError("Please enter a valid WhatsApp number in international format, e.g. +509XXXXXXXX")
      return
    }

    setPhase("requesting")
    setStatus(null)
    setCode(null)
    setSecondsLeft(null)

    try {
      const res = await fetch("/api/pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: normalized }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data?.success || !data?.pairingCode) {
        setPhase("idle")
        setError(
          data?.message ||
            "We couldn't generate a pairing code right now. Please try again in a moment.",
        )
        return
      }

      activePhoneRef.current = normalized
      setCode(String(data.pairingCode))
      setStatus("waiting")
      setPhase("code")
      if (typeof data.expiresIn === "number" && data.expiresIn > 0) {
        setSecondsLeft(Math.floor(data.expiresIn))
      }
    } catch {
      setPhase("idle")
      setError("Network error. Please check your connection and try again.")
    }
  }, [phone])

  const onCopy = useCallback(async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(formatCode(code).replace("-", ""))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setError("Unable to copy automatically. Please copy the code manually.")
    }
  }, [code])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return
    if (e.nativeEvent.isComposing || (e as unknown as { keyCode: number }).keyCode === 229) return
    if (phase !== "requesting") requestCode()
  }

  const showForm = phase === "idle" || phase === "requesting"

  return (
    <div className="reveal relative w-full max-w-md rounded-[var(--radius)] border border-border bg-surface/70 p-6 shadow-[0_0_60px_-20px_var(--color-violet)] backdrop-blur-xl sm:p-8" style={{ animationDelay: "0.15s" }}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
            WhatsApp Pairing
          </h2>
          <p className="mt-1 text-sm text-muted">Link your device securely</p>
        </div>
        <span className="rounded-full border border-violet/30 bg-violet/10 px-3 py-1 text-xs font-medium text-mauve">
          Secure
        </span>
      </div>

      {showForm && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="wa-number" className="text-sm font-medium text-foreground/90">
              Enter WhatsApp Number
            </label>
            <input
              id="wa-number"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+509XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={phase === "requesting"}
              className="w-full rounded-2xl border border-border bg-surface-2/60 px-4 py-3.5 text-base text-foreground outline-none transition focus:border-violet/60 focus:ring-2 focus:ring-violet/30 disabled:opacity-60"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={requestCode}
            disabled={phase === "requesting"}
            className="shimmer group relative mt-1 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(110deg,#8b3dff,45%,#c05cff,55%,#8b3dff)] px-6 py-4 text-base font-semibold text-white shadow-[0_10px_30px_-10px_var(--color-violet)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-80"
          >
            {phase === "requesting" ? (
              <>
                <span className="spin h-5 w-5 rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                Generating pairing code…
              </>
            ) : (
              "GET CODE PAIRING"
            )}
          </button>
          <p className="text-center text-xs text-muted">
            We never store your credentials. Pairing happens on the bot server.
          </p>
        </div>
      )}

      {(phase === "code" || phase === "expired") && (
        <div className="flex flex-col gap-5">
          {phase === "code" && code && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mauve">
                Your Pairing Code
              </p>
              <div className="relative w-full rounded-2xl border border-violet/30 bg-surface-2/70 py-6 text-center">
                <span className="font-display text-4xl font-bold tracking-[0.35em] text-foreground sm:text-5xl">
                  {formatCode(code)}
                </span>
              </div>

              <button
                type="button"
                onClick={onCopy}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet/40 bg-violet/10 px-6 py-3 text-sm font-semibold text-mauve transition hover:bg-violet/20 active:scale-[0.98]"
              >
                {copied ? "Copied!" : "COPY CODE"}
              </button>

              <div className="w-full rounded-2xl border border-border bg-surface-2/40 p-3 text-center text-xs leading-relaxed text-muted">
                Open WhatsApp → <span className="text-foreground/80">Linked devices</span> →{" "}
                <span className="text-foreground/80">Link with phone number</span>, then enter this code.
              </div>

              {secondsLeft !== null && status !== "connected" && (
                <p className="text-sm text-muted">
                  Code expires in{" "}
                  <span className="font-display font-semibold text-foreground">{mmss(secondsLeft)}</span>
                </p>
              )}
            </div>
          )}

          {phase === "expired" && (
            <div className="flex flex-col items-center gap-4 py-2">
              <p className="text-center text-sm font-medium text-red-300">Pairing code expired</p>
              <button
                type="button"
                onClick={requestCode}
                className="shimmer flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(110deg,#8b3dff,45%,#c05cff,55%,#8b3dff)] px-6 py-4 text-base font-semibold text-white shadow-[0_10px_30px_-10px_var(--color-violet)] transition-transform active:scale-[0.98]"
              >
                GET NEW CODE
              </button>
            </div>
          )}

          {status && <StatusBadge status={status} />}

          {error && (
            <p role="alert" className="text-center text-sm text-red-300">
              {error}
            </p>
          )}

          {phase === "code" && (
            <button
              type="button"
              onClick={() => {
                setPhase("idle")
                setCode(null)
                setStatus(null)
                setSecondsLeft(null)
                setError(null)
                activePhoneRef.current = null
              }}
              className="text-center text-xs text-muted underline-offset-4 transition hover:text-foreground/80 hover:underline"
            >
              Use a different number
            </button>
          )}
        </div>
      )}
    </div>
  )
}
