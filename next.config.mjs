/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['mapbox-gl'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
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
