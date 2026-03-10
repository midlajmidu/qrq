import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Priority: 1. BACKEND_URL, 2. NEXT_PUBLIC_API_URL, 3. NEXT_PUBLIC_API_BASE_URL, 4. Production Fallback
    // Render internal networking uses the service name and port 10000 by default.
    // Development uses 'backend:8000' from docker-compose.
    const isRender = !!process.env.RENDER;
    const defaultFallback = isRender ? "http://q4queue-backend:10000" : "http://backend:8000";

    const backendUrl = process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace("/api/v1", "") ||
      defaultFallback;

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
