import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'ik.imagekit.io' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
  },
  allowedDevOrigins: ['localhost:3000', '192.168.100.213:3000', '192.168.100.213:3001', '192.168.0.13:3000', '192.168.0.13:3001', '192.168.0.13', '192.168.100.213', '192.168.210.178', '192.168.210.178:3000'],
};

export default nextConfig;
