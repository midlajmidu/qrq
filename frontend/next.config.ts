import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: "standalone",

  async rewrites() {
    // Priority: 1. BACKEND_URL, 2. NEXT_PUBLIC_API_URL/BASE_URL (if full URL), 3. Local/Docker fallback
    const defaultBackend = process.env.NODE_ENV === "production" ? "http://backend:8000" : "http://127.0.0.1:8000";
    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    const apiUrlBase = rawApiUrl && rawApiUrl.startsWith("http") ? rawApiUrl.replace(/\/api\/v1\/?$/, "") : undefined;
    const backendUrl = process.env.BACKEND_URL || apiUrlBase || defaultBackend;

    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
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
