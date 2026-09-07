import type { Metadata, Viewport } from "next"
import { Geist, Space_Grotesk } from "next/font/google"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
})

export const metadata: Metadata = {
  title: "DevArth-Bot | WhatsApp Pairing",
  description:
    "DevArth-Bot — Connect your WhatsApp to your bot using a secure pairing system.",
  applicationName: "DevArth-Bot",
  authors: [{ name: "Klaus Dev (Arthur Dev)" }],
  keywords: ["DevArth-Bot", "WhatsApp", "pairing", "bot", "Klaus Dev"],
  openGraph: {
    title: "DevArth-Bot | WhatsApp Pairing",
    description:
      "Connect your WhatsApp to DevArth-Bot using a secure pairing system.",
    siteName: "DevArth-Bot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DevArth-Bot | WhatsApp Pairing",
    description:
      "Connect your WhatsApp to DevArth-Bot using a secure pairing system.",
  },
  icons: {
    icon: "/icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#050507",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geist.variable} ${spaceGrotesk.variable} bg-background`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
