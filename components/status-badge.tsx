export type ConnectionStatus = "waiting" | "connected" | "failed"

const MAP: Record<
  ConnectionStatus,
  { label: string; dot: string; ring: string; text: string }
> = {
  waiting: {
    label: "Waiting for WhatsApp connection",
    dot: "bg-yellow-400 pulse-waiting",
    ring: "border-yellow-400/30 bg-yellow-400/5",
    text: "text-yellow-300",
  },
  connected: {
    label: "WhatsApp Connected",
    dot: "bg-green-400 pulse-connected",
    ring: "border-green-400/30 bg-green-400/5",
    text: "text-green-300",
  },
  failed: {
    label: "Connection failed",
    dot: "bg-red-400",
    ring: "border-red-400/30 bg-red-400/5",
    text: "text-red-300",
  },
}

export function StatusBadge({ status }: { status: ConnectionStatus }) {
  const s = MAP[status]
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center gap-2.5 rounded-full border px-4 py-2.5 text-sm font-medium ${s.ring} ${s.text}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </div>
  )
}
