import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Priority: 1. BACKEND_URL, 2. Derived from Public API URL, 3. Local Docker fallback
    const backendUrl = process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace("/api/v1", "") ||
      "http://backend:8000";

    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/j/:queueId",
        destination: "/join/:queueId",
        permanent: true,
      },
      {
        source: "/d/:queueId",
        destination: "/display/:queueId",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
