import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.scdn.co' },        // Spotify artwork
      { protocol: 'https', hostname: '*.supabase.co' },    // Supabase storage
      { protocol: 'https', hostname: 'i.spotifycdn.com' },
    ],
  },
}

export default nextConfig
