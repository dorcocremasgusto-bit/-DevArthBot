import Image from "next/image"

export function Logo() {
  return (
    <div className="relative flex items-center justify-center">
      <div
        className="animate-halo absolute h-28 w-28 rounded-full bg-violet/40 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-violet/30 bg-surface-2/80 shadow-[0_0_40px_-8px_var(--color-violet)] backdrop-blur-sm">
        <Image
          src="/icon.png"
          alt="DevArth-Bot logo"
          width={56}
          height={56}
          priority
          className="h-14 w-14 object-contain"
        />
      </div>
    </div>
  )
}
