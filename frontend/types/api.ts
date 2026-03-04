/**
 * types/api.ts
 * All API request/response types — strictly typed, no `any`.
 * These mirror the backend Pydantic schemas and WS payloads exactly.
 */

// ── Auth ─────────────────────────────────────────────────────────
export interface LoginRequest {
    email: string;
    password: string;
    organization_slug: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
}

// ── JWT Payload (decoded client-side) ────────────────────────────
export interface JwtPayload {
    sub: string;       // user_id
    org_id: string;
    role: string;
    exp: number;       // UNIX timestamp
}

// ── Queue ────────────────────────────────────────────────────────
export interface QueueResponse {
    id: string;
    org_id: string;
    name: string;
    prefix: string;
    current_token_number: number;
    is_active: boolean;
    created_at: string;
}

export interface QueueCreate {
    name: string;
    prefix?: string;
}

// ── Token ────────────────────────────────────────────────────────
export type TokenStatus = "waiting" | "serving" | "done" | "skipped" | "deleted";

export interface TokenDetail {
    id: string;
    org_id: string;
    queue_id: string;
    token_number: number;
    status: TokenStatus;
    created_at: string;
    served_at: string | null;
}

// ── Join ─────────────────────────────────────────────────────────
export interface JoinResponse {
    token_number: number;
    position: number;
    current_serving: number;
    queue_prefix: string;
}

export interface PublicTokenResponse {
    token_number: number;
    status: TokenStatus;
}

// ── Admin Next ───────────────────────────────────────────────────
export interface NextResponse {
    serving: number;
    remaining: number;
}

export interface NoTokenResponse {
    message: string;
}

// ── WebSocket (matches backend build_queue_snapshot exactly) ──────
export interface RecentToken {
    token_number: number;
    status: TokenStatus;
    served_at: string | null;
}

export interface WaitingToken {
    id: string;
    token_number: number;
    status: TokenStatus;
}

export interface QueueSnapshot {
    type?: string;                 // "queue_snapshot" on initial, "queue_update" on update
    queue_id: string;
    queue_name: string;
    prefix: string;
    is_active: boolean;
    current_serving: number;
    waiting_count: number;
    last_called: number;
    total_issued: number;
    recent_tokens: RecentToken[];
    waiting_tokens?: WaitingToken[];
}

export type QueueUpdate = QueueSnapshot;

// ── Health ───────────────────────────────────────────────────────
export interface HealthResponse {
    api: string;
    database: string;
    redis: string;
}

// ── Errors ───────────────────────────────────────────────────────
export interface ApiErrorShape {
    detail: string;
}

export interface ApiErrorResponse {
    status: number;
    detail: string;
    retryAfter?: number;
}

// ── Staff Management ──────────────────────────────────────────────
export interface StaffMember {
    id: string;
    email: string;
    org_id: string;
    role: "admin" | "staff";
    is_active: boolean;
    created_at: string;
}

export interface StaffCreate {
    email: string;
    password: string;
}

export interface StaffUpdate {
    email?: string;
    is_active?: boolean;
    new_password?: string;
}

export interface PaginatedStaffResponse {
    items: StaffMember[];
    total: number;
    limit: number;
    offset: number;
}

export interface StaffListParams {
    search?: string;
    is_active?: boolean;
    limit?: number;
    offset?: number;
    sort_order?: "asc" | "desc";
}

// ── Super Admin ──────────────────────────────────────────────────
type SortBy = "name" | "created_at" | "is_active";
type SortOrder = "asc" | "desc";

export interface SuperAdminLoginRequest {
    email: string;
    password: string;
}

export interface OrgDetail {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    created_at: string;
}

export interface OrgDetailExtended extends OrgDetail {
    total_users: number;
    total_admins: number;
}

export interface OrgCreateRequest {
    org_name: string;
    org_slug: string;
    admin_email: string;
    admin_password: string;
}

export interface OrgUpdateRequest {
    org_name: string;
    org_slug: string;
    is_active: boolean;
}

export interface OrgCreateResponse {
    organization: OrgDetail;
    admin_email: string;
    message: string;
}

export interface PaginatedOrgsResponse {
    items: OrgDetail[];
    total: number;
    limit: number;
    offset: number;
}

export interface OrgStats {
    total: number;
    active: number;
    inactive: number;
}

export interface ListOrgsParams {
    search?: string;
    limit?: number;
    offset?: number;
    sort_by?: SortBy;
    sort_order?: SortOrder;
}
