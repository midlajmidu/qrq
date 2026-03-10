/**
 * lib/config.ts
 * Centralized configuration — all env vars validated here.
 * No env access anywhere else in the codebase.
 */



// Normalize URLs to remove trailing slashes for consistency
const isProd = process.env.NODE_ENV === "production";
const fallbackDomain = isProd ? "https://q4queue-backend.onrender.com/api/v1" : "/api/v1";

const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || fallbackDomain;
const normalizedApiUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

export const config = {
  // Primary API entry point
  apiBaseUrl: normalizedApiUrl,

  // WebSocket URL calculation
  wsBaseUrl: (process.env.NEXT_PUBLIC_WS_BASE_URL || normalizedApiUrl.replace("http", "ws") + "/ws"),

  appName: process.env.NEXT_PUBLIC_APP_NAME || "Q4Queue",
  isProduction: process.env.NODE_ENV === "production",
} as const;
