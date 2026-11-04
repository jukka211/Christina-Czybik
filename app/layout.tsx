import type { Metadata } from 'next'
import { IBM_Plex_Mono } from 'next/font/google'

import { SITE_NAME, SITE_URL } from '@/lib/site'

// Served from the site itself rather than from Google's servers, which
// German courts have found to breach the GDPR. The stylesheets use it
// through var(--font-plex-mono).
const plexMono = IBM_Plex_Mono({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-plex-mono',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={plexMono.variable}>
      <body>{children}</body>
    </html>
  )
}
