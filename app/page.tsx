import { PairingCard } from '@/components/pairing-card'

export default function Page() {
  return (
    <main className="relative z-10 flex min-h-dvh flex-col items-center justify-between px-5 py-10">
      <div className="aurora" aria-hidden="true" />

      <header className="animate-rise flex flex-col items-center text-center">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-1.5 text-xs font-medium tracking-widest text-accent uppercase">
          <span className="size-1.5 rounded-full bg-accent" />
          WhatsApp Automation
        </span>
        <h1 className="font-display glow-text text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          DevArth-Bot
        </h1>
        <p className="mt-3 max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground sm:max-w-sm sm:text-base">
          Connect your WhatsApp to DevArth-Bot
        </p>
      </header>

      <section className="w-full max-w-sm py-10">
        <PairingCard />
      </section>

      <footer className="animate-rise text-center text-xs text-muted-foreground">
        Create By{' '}
        <span className="font-medium text-accent">Klaus Dev (Arthur Dev)</span>
      </footer>
    </main>
  )
}
