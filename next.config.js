/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'unsplash.com'],
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


