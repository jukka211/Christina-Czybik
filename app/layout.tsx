import type { Metadata } from 'next'
import { IBM_Plex_Mono } from 'next/font/google'

// Served from the site itself rather than from Google's servers, which
// German courts have found to breach the GDPR. The stylesheets use it
// through var(--font-plex-mono).
const plexMono = IBM_Plex_Mono({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-plex-mono',
})

export const metadata: Metadata = {
  title: 'Christina Czybik',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={plexMono.variable}>
      <body>{children}</body>
    </html>
  )
}
