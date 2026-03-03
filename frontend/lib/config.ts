/**
 * lib/config.ts
 * Centralized configuration — all env vars validated here.
 * No env access anywhere else in the codebase.
 */

const isServer = typeof window === "undefined";

export const config = {
  // On the server (SSR), we talk directly to the backend container via Docker's internal network.
  // In the browser, we use a relative path so it goes through our Nginx proxy.
  apiBaseUrl: isServer
    ? (process.env.INTERNAL_API_URL || "http://backend:8000/api/v1")
    : (process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1"),

  wsBaseUrl: isServer
    ? "ws://backend:8000/api/v1/ws"
    : (process.env.NEXT_PUBLIC_WS_BASE_URL || `ws://${typeof window !== 'undefined' ? window.location.host : 'localhost'}/api/v1/ws`),

  appName: process.env.NEXT_PUBLIC_APP_NAME || "FlowClinic",
  isProduction: process.env.NODE_ENV === "production",
} as const;
