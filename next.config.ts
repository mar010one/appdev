import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'agivntinmsxzebhwczri.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      // Icon + promo + up to 8 screenshots, and AAB/IPA uploads for new
      // versions, can easily exceed the default 1MB body limit.
      // Note: Vercel Hobby plan caps at 4.5 MB; upgrade to Pro for larger uploads.
      bodySizeLimit: "200mb",
    },
    // Tree-shake large icon / supabase packages so only the symbols we
    // actually import end up in the client bundle.
    optimizePackageImports: ['lucide-react', '@supabase/ssr', '@supabase/supabase-js'],
  },
};

export default nextConfig;
