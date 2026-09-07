import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://devarth-bot.vercel.app',
  ),
  title: 'DevArth-Bot | WhatsApp Pairing',
  description:
    'DevArth-Bot — Connect your WhatsApp to your bot using a secure pairing system.',
  applicationName: 'DevArth-Bot',
  authors: [{ name: 'Klaus Dev (Arthur Dev)' }],
  openGraph: {
    title: 'DevArth-Bot | WhatsApp Pairing',
    description:
      'DevArth-Bot — Connect your WhatsApp to your bot using a secure pairing system.',
    siteName: 'DevArth-Bot',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'DevArth-Bot' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DevArth-Bot | WhatsApp Pairing',
    description:
      'DevArth-Bot — Connect your WhatsApp to your bot using a secure pairing system.',
    images: ['/og.png'],
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#050507',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} bg-background`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
