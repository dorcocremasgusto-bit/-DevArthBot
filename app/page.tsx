import { Logo } from "@/components/logo"
import { PairingCard } from "@/components/pairing-card"

export default function Page() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-between overflow-hidden px-5 py-10 sm:py-14">
      <div className="aurora" aria-hidden="true" />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center gap-8">
        <header className="reveal flex flex-col items-center gap-5 text-center">
          <Logo />
          <div className="flex flex-col items-center gap-2">
            <h1 className="font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              <span className="bg-[linear-gradient(100deg,#ffffff,40%,#c05cff)] bg-clip-text text-transparent">
                DevArth-Bot
              </span>
            </h1>
            <p className="max-w-xs text-pretty text-sm text-muted sm:text-base">
              Connect your WhatsApp to DevArth-Bot
            </p>
          </div>
        </header>

        <PairingCard />
      </div>

      <footer className="reveal relative z-10 mt-10 text-center" style={{ animationDelay: "0.3s" }}>
        <p className="text-xs text-muted">
          Create By{" "}
          <span className="font-medium text-mauve [text-shadow:0_0_12px_rgba(192,92,255,0.55)]">
            Klaus Dev (Arthur Dev)
          </span>
        </p>
      </footer>
    </main>
  )
}
