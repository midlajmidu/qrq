/**
 * lib/auth.ts
 * Authentication token management.
 *
 * Strategy:
 *   - Token stored in memory (not localStorage) for security.
 *   - Persisted to sessionStorage for tab-refresh survival.
 *   - Never stored in localStorage (XSS risk in production).
 *   - JWT decoded client-side for display only (never trusted for auth).
 */

import type { JwtPayload } from "@/types/api";

// ── In-memory token (primary) ────────────────────────────────────
let _accessToken: string | null = null;

const STORAGE_KEY = "fc_access_token";

/**
 * Store the access token.
 * Primary: in-memory. Backup: sessionStorage for page refresh.
 */
export function setToken(token: string): void {
    _accessToken = token;
    try {
        if (typeof window !== "undefined") {
            sessionStorage.setItem(STORAGE_KEY, token);
        }
    } catch {
        // SSR or storage unavailable — in-memory only
    }
}

/**
 * Retrieve the access token.
 * Falls back to sessionStorage if in-memory is empty (after page refresh).
 */
export function getToken(): string | null {
    if (_accessToken) return _accessToken;
    try {
        if (typeof window !== "undefined") {
            const stored = sessionStorage.getItem(STORAGE_KEY);
            if (stored) {
                _accessToken = stored;
                return stored;
            }
        }
    } catch {
        // SSR or storage unavailable
    }
    return null;
}

/**
 * Clear the access token (logout).
 */
export function removeToken(): void {
    _accessToken = null;
    try {
        if (typeof window !== "undefined") {
            sessionStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // SSR or storage unavailable
    }
}

/**
 * Check if a valid (non-expired) token exists.
 * Uses a 30-second buffer to account for clock drift between
 * frontend and backend, preventing "Signature has expired" races.
 */
export function isAuthenticated(): boolean {
    const token = getToken();
    if (!token) return false;

    const payload = decodeToken(token);
    if (!payload) return false;

    // Check expiration with 30-second buffer for clock drift
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now + 30) {
        removeToken(); // proactively clear expired token
        return false;
    }
    return true;
}

/**
 * Decode the JWT payload (base64 only — NOT cryptographic validation).
 * Used for display purposes only (user info, role).
 * Returns null on any decode failure.
 */
export function decodeToken(token: string): JwtPayload | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;

        const payload = JSON.parse(atob(parts[1])) as JwtPayload;

        // Validate required fields exist
        if (!payload.sub || !payload.role || !payload.exp || payload.org_id === undefined || !payload.email) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

/**
 * Get the current user info from the stored token.
 * Returns null if not authenticated.
 */
export function getCurrentUser(): JwtPayload | null {
    const token = getToken();
    if (!token) return null;
    return decodeToken(token);
}
