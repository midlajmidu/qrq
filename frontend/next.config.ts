import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Use public backend URL on Render for better stability across service instances.
    const isProduction = process.env.NODE_ENV === "production";
    const publicBackendUrl = "https://q4queue-backend.onrender.com";
    const devFallback = "http://backend:8000";

    const backendUrl = process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace("/api/v1", "") ||
      (isProduction ? publicBackendUrl : devFallback);

    console.log(`[NextConfig] Proxying /api/v1 to ${backendUrl}/api/v1 (isProduction=${isProduction})`);

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
