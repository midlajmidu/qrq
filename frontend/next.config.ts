import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://backend:8000/api/v1/:path*", // Proxy to Backend container
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
