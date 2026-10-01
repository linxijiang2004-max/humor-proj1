import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB; profile photos can be up to 5MB plus form overhead.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
