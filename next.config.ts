import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB; profile photos can be up to 5MB plus form overhead.
      bodySizeLimit: "6mb",
    },
  },
  // Removed pages. Runs before proxy.ts, so /dashboard no longer needs sign-in.
  async redirects() {
    return [
      { source: "/captions", destination: "/", permanent: true },
      { source: "/dashboard", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
