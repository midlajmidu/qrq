/**
 * lib/config.ts
 * Centralized configuration — all env vars validated here.
 * No env access anywhere else in the codebase.
 */

export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1",
  wsBaseUrl: process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8000/api/v1/ws",
  appName: process.env.NEXT_PUBLIC_APP_NAME || "qrq",
  isProduction: process.env.NODE_ENV === "production",
} as const;
