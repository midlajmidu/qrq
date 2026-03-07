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
    org_id: string | null;
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
    customer_name: string;
    customer_age: number | null;
    customer_phone: string;
}

// ── Join ─────────────────────────────────────────────────────────
export interface JoinRequest {
    name: string;
    age?: number;
    phone: string;
}

export interface JoinResponse {
    token_number: number;
    position: number;
    current_serving: number;
    queue_prefix: string;
    session_id: string;  // session the token was created in
}

export interface PublicTokenResponse {
    token_number: number;
    status: TokenStatus;
    customer_name: string;
    customer_age: number | null;
    customer_phone: string;
    session_id: string;
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
    customer_name: string;
    customer_age: number | null;
    customer_phone: string;
}

export interface WaitingToken {
    id: string;
    token_number: number;
    status: TokenStatus;
    customer_name: string;
    customer_age: number | null;
    customer_phone: string;
}

export interface QueueSnapshot {
    type?: string;                 // "queue_snapshot" on initial, "queue_update" on update
    queue_id: string;
    session_id: string;            // rotates on every queue reset
    queue_name: string;
    prefix: string;
    is_active: boolean;
    current_serving: number;
    serving_details: {
        token_number: number;
        customer_name: string;
        customer_age: number | null;
        customer_phone: string;
    } | null;
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
    admin_email?: string | null;
    admin_initial_password?: string | null;
    admin_password_changed_at?: string | null;
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

// ── Organization Settings ───────────────────────────────────────
export interface OrganizationSettingsResponse {
    name: string;
    slug: string;
    email: string;
    address: string | null;
    phone_number: string | null;
}

export interface OrganizationSettingsUpdate {
    name: string;
    address: string | null;
    phone_number: string | null;
}

export interface ChangePasswordRequest {
    current_password: string;
    new_password: string;
}

export interface ResetPasswordRequest {
    new_password: string;
}

export interface SuccessResponse {
    message: string;
}
