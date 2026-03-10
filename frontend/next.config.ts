import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Priority: 1. BACKEND_URL (internal), 2. NEXT_PUBLIC_API_URL, 3. NEXT_PUBLIC_API_BASE_URL, 4. Production Fallback
    // Render internal networking uses http://service-name:port
    const isProduction = process.env.NODE_ENV === "production";
    const isRender = !!(process.env.RENDER || process.env.RENDER_SERVICE_NAME);

    // In production on Render, we prefer the internal service name. 
    // In local docker, we use 'backend:8000'.
    const defaultFallback = (isRender || isProduction) ? "http://q4queue-backend:10000" : "http://backend:8000";

    const backendUrl = process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace("/api/v1", "") ||
      defaultFallback;

    console.log(`[NextConfig] Proxying /api/v1 to ${backendUrl}/api/v1 (isRender=${isRender}, isProduction=${isProduction})`);

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
