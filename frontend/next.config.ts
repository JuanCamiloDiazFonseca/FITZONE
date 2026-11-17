import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    const apiUpstream = (process.env.API_UPSTREAM_URL ?? "http://localhost:3001").replace(/\/+$/, "");

    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUpstream}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
