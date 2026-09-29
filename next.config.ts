import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The old static site's addresses, for links and bookmarks that still use them.
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/legal-page.html', destination: '/impressum', permanent: true },
    ]
  },
}

export default nextConfig
