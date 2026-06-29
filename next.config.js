/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // All external images (Unsplash, Firebase Storage) are already CDN-served with
    // URL-based optimisation (?w=800&q=80). Proxying them through /_next/image adds
    // latency, blocks the server on slow outbound connections, and causes
    // ConnectTimeoutError in restricted network environments.
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'travelzada.com',
          },
        ],
        destination: 'https://www.travelzada.com/:path*',
        permanent: true,
      },
    ]
  },
  webpack: (config, { isServer }) => {
    // Fix for undici and other Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      }
    }

    // Ignore undici on server side
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        'undici': 'commonjs undici',
      })
    }

    return config
  },
}

module.exports = nextConfig


