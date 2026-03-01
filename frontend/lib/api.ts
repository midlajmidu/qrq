/**
 * lib/api.ts
 * Centralized API client — the ONLY way to talk to the backend.
 *
 * Rules:
 *   - No component may call fetch() directly.
 *   - Authorization header auto-attached when token exists.
 *   - 401 → auto-logout + redirect to /login.
 *   - 429 → friendly rate-limit message surfaced.
 *   - All responses are typed.
 *   - All errors mapped to user-friendly messages.
 */

import { config } from "@/lib/config";
import { getToken, removeToken } from "@/lib/auth";
import { logger } from "@/lib/logger";
import type {
    ApiErrorResponse,
    HealthResponse,
    JoinResponse,
    LoginRequest,
    NextResponse,
    NoTokenResponse,
    QueueCreate,
    QueueResponse,
    TokenDetail,
    TokenResponse,
    PublicTokenResponse,
} from "@/types/api";

// ── Error class ──────────────────────────────────────────────────
export class ApiError extends Error {
    status: number;
    detail: string;
    retryAfter?: number;

    constructor(resp: ApiErrorResponse) {
        super(resp.detail);
        this.name = "ApiError";
        this.status = resp.status;
        this.detail = resp.detail;
        this.retryAfter = resp.retryAfter;
    }
}

// ── User-friendly error messages ─────────────────────────────────
function friendlyMessage(status: number, rawDetail: string): string {
    switch (status) {
        case 401: return "Session expired. Please sign in again.";
        case 403: return "Access denied. You don't have permission for this action.";
        case 404: return "The requested resource was not found.";
        case 409: return rawDetail || "This action conflicts with the current state.";
        case 422: return rawDetail || "Invalid input. Please check your data.";
        case 429: return rawDetail; // Handled separately with retry-after
        case 500: return "A temporary server issue occurred. Please try again.";
        case 502: return "The server is temporarily unreachable. Please try again shortly.";
        case 503: return "The service is temporarily unavailable. Please try again shortly.";
        default: return rawDetail || "An unexpected error occurred.";
    }
}

// ── Internal fetch wrapper ───────────────────────────────────────
async function request<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${config.apiBaseUrl}${path}`;
    const headers = new Headers(options.headers);

    // Auto-attach token
    const token = getToken();
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    // Default content type for JSON bodies
    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    let resp: Response;
    try {
        resp = await fetch(url, { ...options, headers });
    } catch (err) {
        // Network failure — server unreachable
        logger.error("Network request failed", { path, error: String(err) });
        throw new ApiError({
            status: 0,
            detail: "Unable to connect to server. Please check your network.",
        });
    }

    // ── Handle error responses ─────────────────────────────────
    if (!resp.ok) {
        let rawDetail = "An unexpected error occurred";
        let retryAfter: number | undefined;

        try {
            const body = await resp.json();
            rawDetail = body.detail || rawDetail;
        } catch {
            // Response body not JSON
        }

        // 401 → auto-logout
        if (resp.status === 401) {
            removeToken();
            if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
                window.location.href = "/login";
            }
        }

        // 429 → extract Retry-After
        if (resp.status === 429) {
            const ra = resp.headers.get("Retry-After");
            retryAfter = ra ? parseInt(ra, 10) : undefined;
            rawDetail = `Too many requests. Please wait ${retryAfter || "a few"} seconds.`;
        }

        const detail = friendlyMessage(resp.status, rawDetail);
        logger.warn("API error response", { path, status: resp.status, detail });

        throw new ApiError({ status: resp.status, detail, retryAfter });
    }

    // 204 No Content
    if (resp.status === 204) {
        return {} as T;
    }

    return resp.json() as Promise<T>;
}

// ── Public API methods ───────────────────────────────────────────
export const api = {
    // ── Auth ─────────────────────────────────────────────────────
    login(data: LoginRequest): Promise<TokenResponse> {
        return request<TokenResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    // ── Queues ───────────────────────────────────────────────────
    listQueues(): Promise<QueueResponse[]> {
        return request<QueueResponse[]>("/queues");
    },

    getQueue(queueId: string): Promise<QueueResponse> {
        return request<QueueResponse>(`/queues/${queueId}`);
    },

    createQueue(data: QueueCreate): Promise<QueueResponse> {
        return request<QueueResponse>("/queues", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    toggleQueue(queueId: string, isActive: boolean): Promise<QueueResponse> {
        return request<QueueResponse>(`/queues/${queueId}/active?is_active=${isActive}`, {
            method: "PATCH",
        });
    },

    deleteQueue(queueId: string): Promise<void> {
        return request<void>(`/queues/${queueId}`, {
            method: "DELETE",
        });
    },

    resetQueue(queueId: string): Promise<void> {
        return request<void>(`/queues/${queueId}/reset`, {
            method: "POST",
        });
    },

    // ── Token operations ─────────────────────────────────────────
    joinQueue(queueId: string): Promise<JoinResponse> {
        return request<JoinResponse>(`/queues/${queueId}/join`, {
            method: "POST",
        });
    },

    adminJoin(queueId: string): Promise<JoinResponse> {
        return request<JoinResponse>(`/queues/${queueId}/admin-join`, {
            method: "POST",
        });
    },

    serveSpecificToken(queueId: string, tokenNumber: number): Promise<NextResponse> {
        return request<NextResponse>(`/queues/${queueId}/serve/${tokenNumber}`, {
            method: "POST",
        });
    },

    getPublicToken(queueId: string, tokenNumber: number): Promise<PublicTokenResponse> {
        return request<PublicTokenResponse>(`/queues/${queueId}/tokens/${tokenNumber}`);
    },

    callNext(queueId: string, action: "done" | "skipped" = "done"): Promise<NextResponse | NoTokenResponse> {
        return request<NextResponse | NoTokenResponse>(`/queues/${queueId}/next?action=${action}`, {
            method: "POST",
        });
    },

    getToken(tokenId: string): Promise<TokenDetail> {
        return request<TokenDetail>(`/tokens/${tokenId}`);
    },

    skipToken(tokenId: string): Promise<TokenDetail> {
        return request<TokenDetail>(`/tokens/${tokenId}/skip`, {
            method: "PATCH",
        });
    },

    completeToken(tokenId: string): Promise<TokenDetail> {
        return request<TokenDetail>(`/tokens/${tokenId}/done`, {
            method: "PATCH",
        });
    },

    removeToken(tokenId: string): Promise<TokenDetail> {
        return request<TokenDetail>(`/tokens/${tokenId}/remove`, {
            method: "PATCH",
        });
    },

    // ── Health ───────────────────────────────────────────────────
    health(): Promise<HealthResponse> {
        return request<HealthResponse>("/health");
    },
} as const;
