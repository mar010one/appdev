import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Icon + promo + up to 8 screenshots, and AAB/IPA uploads for new
      // versions, can easily exceed the default 1MB body limit, which
      // surfaces as a generic "Failed to fetch".
      bodySizeLimit: "200mb",
    },
  },
};

export default nextConfig;
