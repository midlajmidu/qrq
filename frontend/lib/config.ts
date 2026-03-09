/**
 * lib/config.ts
 * Centralized configuration — all env vars validated here.
 * No env access anywhere else in the codebase.
 */

const isServer = typeof window === "undefined";

// Normalize URLs to remove trailing slashes for consistency
const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
const normalizedApiUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

export const config = {
  // Primary API entry point
  apiBaseUrl: normalizedApiUrl,

  // WebSocket URL calculation
  wsBaseUrl: (process.env.NEXT_PUBLIC_WS_BASE_URL || normalizedApiUrl.replace("http", "ws") + "/ws"),

  appName: process.env.NEXT_PUBLIC_APP_NAME || "Q4Queue",
  isProduction: process.env.NODE_ENV === "production",
} as const;
