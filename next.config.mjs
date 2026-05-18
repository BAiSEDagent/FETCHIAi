/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['mapbox-gl'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // Replit preview is a proxied iframe served from *.replit.dev /
  // *.repl.co hosts. Allow server actions and dev requests from those
  // origins so Next.js does not reject cross-origin POSTs from the
  // preview iframe. This is the Next.js 14 equivalent of Vite's
  // `server.allowedHosts: true`. The dev server itself also binds to
  // 0.0.0.0 (see package.json `dev` script) so the proxy can reach it.
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:5000',
        '*.replit.dev',
        '*.repl.co',
        '*.kirk.replit.dev',
        '*.spock.replit.dev',
        '*.picard.replit.dev',
        '*.riker.replit.dev',
        '*.janeway.replit.dev',
        '*.sisko.replit.dev',
        '*.worf.replit.dev',
      ],
    },
  },
  // Replit preview proxies requests through different hosts.
  // Disable dev cache headers so hard refresh always loads fresh code.
  async headers() {
    if (process.env.NODE_ENV === 'production') return []
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ]
  },
}

export default nextConfig
