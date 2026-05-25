/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output export is required for Capacitor mobile builds.
  // It is conditionally enabled to not break the Desktop Electron wrapper.
  ...(process.env.MOBILE_BUILD === 'true' && { output: 'export' }),
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}

module.exports = nextConfig
