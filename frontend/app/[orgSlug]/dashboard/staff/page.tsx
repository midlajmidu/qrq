"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import type { StaffMember, StaffCreate, StaffUpdate } from "@/types/api";
import { useAuth } from "@/hooks/useAuth";

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;
const DEBOUNCE_MS = 350;

// ── Toast ─────────────────────────────────────────────────────────────────────
type ToastType = "success" | "error";
interface ToastMessage { id: number; type: ToastType; msg: string; }

function Toast({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200 ${t.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                    {t.type === "success"
                        ? <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        : <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    }
                    {t.msg}
                    <button onClick={() => onDismiss(t.id)} className="ml-1 text-current opacity-60 hover:opacity-100 transition-opacity">✕</button>
                </div>
            ))}
        </div>
    );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function StatusBadge({ active }: { active: boolean }) {
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-green-500" : "bg-red-400"}`} />
            {active ? "Active" : "Inactive"}
        </span>
    );
}

function RoleBadge({ role }: { role: string }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${role === "admin" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
            {role === "admin" ? "Admin" : "Staff"}
        </span>
    );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function TableSkeleton() {
    return (
        <>
            {[...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-40" /></td>
                    <td className="px-6 py-4"><div className="h-5 bg-gray-200 rounded-full w-16" /></td>
                    <td className="px-6 py-4"><div className="h-5 bg-gray-200 rounded-full w-14" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-8 bg-gray-200 rounded w-20 ml-auto" /></td>
                </tr>
            ))}
        </>
    );
}

// ── Staff Modal (Create + Edit) ───────────────────────────────────────────────
function StaffModal({
    mode,
    member,
    onClose,
    onSaved,
}: {
    mode: "create" | "edit";
    member?: StaffMember;
    onClose: () => void;
    onSaved: (m: StaffMember) => void;
}) {
    const isEdit = mode === "edit";
    const [email, setEmail] = useState(member?.email ?? "");
    const [isActive, setIsActive] = useState(member?.is_active ?? true);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNew, setConfirmNew] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [fieldError, setFieldError] = useState<string | null>(null);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    const validate = (): string | null => {
        if (!email) return "Email is required.";
        if (!isEdit) {
            if (password.length < 8) return "Password must be at least 8 characters.";
            if (password !== confirmPassword) return "Passwords do not match.";
        } else if (newPassword) {
            if (newPassword.length < 8) return "New password must be at least 8 characters.";
            if (newPassword !== confirmNew) return "New passwords do not match.";
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const err = validate();
        if (err) { setFieldError(err); return; }
        setFieldError(null);
        setIsSaving(true);
        try {
            let result: StaffMember;
            if (isEdit && member) {
                const update: StaffUpdate = {};
                if (email !== member.email) update.email = email;
                if (isActive !== member.is_active) update.is_active = isActive;
                if (newPassword) update.new_password = newPassword;
                result = await api.updateStaff(member.id, update);
            } else {
                const create: StaffCreate = { email, password };
                result = await api.createStaff(create);
            }
            onSaved(result);
        } catch (err) {
            setFieldError(err instanceof ApiError ? err.detail : "An error occurred. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const inputCls = "w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-500";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-900">
                        {isEdit ? "Edit Staff Member" : "Add New Staff Member"}
                    </h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4" noValidate>
                    {fieldError && (
                        <div role="alert" className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">{fieldError}</div>
                    )}

                    {/* Email */}
                    <div>
                        <label htmlFor="staff-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                        <input id="staff-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="off" disabled={isSaving} placeholder="jane@clinic.com" className={inputCls} />
                    </div>

                    {/* Active toggle — edit only */}
                    {isEdit && (
                        <div className="flex items-center justify-between py-1">
                            <span className="text-sm font-medium text-gray-700">Account Status</span>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-500">{isActive ? "Active" : "Inactive"}</span>
                                <button type="button" role="switch" aria-checked={isActive} onClick={() => setIsActive(!isActive)} disabled={isSaving} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isActive ? "bg-blue-600" : "bg-gray-300"}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-6" : "translate-x-1"}`} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Password — create mode */}
                    {!isEdit && (
                        <>
                            <hr className="border-gray-100" />
                            <div>
                                <label htmlFor="staff-password" className="block text-sm font-medium text-gray-700 mb-1.5">Password <span className="text-gray-400 font-normal text-xs">(min 8 characters)</span></label>
                                <input id="staff-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" disabled={isSaving} placeholder="••••••••" className={inputCls} />
                                {password && (
                                    <div className="mt-1.5 h-1 rounded-full bg-gray-200 overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${password.length < 8 ? "w-1/4 bg-red-400" : password.length < 12 ? "w-2/4 bg-yellow-400" : "w-full bg-green-500"}`} />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label htmlFor="staff-confirm" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                                <input id="staff-confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password" disabled={isSaving} placeholder="••••••••" className={inputCls} />
                                {confirmPassword && password !== confirmPassword && (
                                    <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                                )}
                            </div>
                        </>
                    )}

                    {/* Reset Password — edit mode (optional) */}
                    {isEdit && (
                        <>
                            <hr className="border-gray-100" />
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reset Password <span className="font-normal normal-case">(optional)</span></p>
                            <div>
                                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                                <input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" disabled={isSaving} placeholder="Leave blank to keep current" className={inputCls} />
                            </div>
                            {newPassword && (
                                <div>
                                    <label htmlFor="confirm-new" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                                    <input id="confirm-new" type="password" value={confirmNew} onChange={e => setConfirmNew(e.target.value)} autoComplete="new-password" disabled={isSaving} placeholder="••••••••" className={inputCls} />
                                    {confirmNew && newPassword !== confirmNew && (
                                        <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm">Cancel</button>
                        <button type="submit" disabled={isSaving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                            {isSaving
                                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</span>
                                : isEdit ? "Save Changes" : "Create Staff"
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Deactivate Confirmation ───────────────────────────────────────────────────
function ConfirmDeactivateModal({
    member,
    onClose,
    onConfirm,
    isLoading,
}: {
    member: StaffMember;
    onClose: () => void;
    onConfirm: () => void;
    isLoading: boolean;
}) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !isLoading) onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose, isLoading]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!isLoading ? onClose : undefined} />
            <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-200 p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">Deactivate Staff Member?</h2>
                        <p className="text-xs text-gray-500 mt-0.5">This user will no longer be able to log in.</p>
                    </div>
                </div>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                    <span className="font-medium text-gray-900">{member.email}</span> will lose all access immediately.
                </p>
                <div className="flex gap-3">
                    <button onClick={onClose} disabled={isLoading} className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm">Cancel</button>
                    <button onClick={onConfirm} disabled={isLoading} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading
                            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deactivating...</span>
                            : "Confirm Deactivation"
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ total, limit, offset, onChange }: { total: number; limit: number; offset: number; onChange: (o: number) => void }) {
    const current = Math.floor(offset / limit) + 1;
    const pages = Math.max(1, Math.ceil(total / limit));
    if (pages <= 1) return null;
    return (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}</p>
            <div className="flex items-center gap-1">
                <button onClick={() => onChange(offset - limit)} disabled={offset === 0} className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Prev</button>
                {[...Array(Math.min(pages, 5))].map((_, i) => {
                    const p = i + 1;
                    return <button key={p} onClick={() => onChange((p - 1) * limit)} className={`w-7 h-7 text-xs rounded-lg transition-colors ${p === current ? "bg-blue-600 text-white font-semibold" : "text-gray-600 hover:bg-gray-200"}`}>{p}</button>;
                })}
                <button onClick={() => onChange(offset + limit)} disabled={offset + limit >= total} className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next →</button>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StaffPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";

    const [members, setMembers] = useState<StaffMember[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Search / filter / pagination
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [offset, setOffset] = useState(0);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Modals
    const [showCreate, setShowCreate] = useState(false);
    const [editMember, setEditMember] = useState<StaffMember | null>(null);
    const [deactivateMember, setDeactivateMember] = useState<StaffMember | null>(null);
    const [isDeactivating, setIsDeactivating] = useState(false);

    // Toasts
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const toastId = useRef(0);

    const toast = useCallback((type: ToastType, msg: string) => {
        const id = ++toastId.current;
        setToasts(prev => [...prev, { id, type, msg }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    const dismissToast = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);

    // Load staff
    const loadStaff = useCallback(async (opts?: { search?: string; status?: typeof statusFilter; offset?: number }) => {
        setLoading(true);
        setLoadError(null);
        try {
            const activeFilter = (opts?.status ?? statusFilter) === "all" ? undefined
                : (opts?.status ?? statusFilter) === "active";
            const res = await api.listStaff({
                search: opts?.search ?? debouncedSearch,
                is_active: activeFilter,
                limit: PAGE_SIZE,
                offset: opts?.offset ?? offset,
            });
            setMembers(res.items);
            setTotal(res.total);
        } catch (err) {
            setLoadError(err instanceof ApiError ? err.detail : "Failed to load staff.");
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, statusFilter, offset]);

    useEffect(() => { loadStaff(); }, [debouncedSearch, statusFilter, offset]); // eslint-disable-line

    const handleSearchChange = (val: string) => {
        setSearch(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(val);
            setOffset(0);
        }, DEBOUNCE_MS);
    };

    const handleFilterChange = (f: "all" | "active" | "inactive") => {
        setStatusFilter(f);
        setOffset(0);
    };

    // Callbacks
    const handleSaved = useCallback((saved: StaffMember) => {
        if (editMember) {
            setMembers(prev => prev.map(m => m.id === saved.id ? saved : m));
            toast("success", "Staff member updated successfully.");
        } else {
            setMembers(prev => [saved, ...prev]);
            setTotal(t => t + 1);
            toast("success", `${saved.email} has been added to your team.`);
        }
        setShowCreate(false);
        setEditMember(null);
    }, [editMember, toast]);

    const handleDeactivate = useCallback(async () => {
        if (!deactivateMember) return;
        setIsDeactivating(true);
        try {
            const updated = await api.deactivateStaff(deactivateMember.id);
            setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
            setDeactivateMember(null);
            toast("success", `${updated.email} has been deactivated.`);
        } catch (err) {
            toast("error", err instanceof ApiError ? err.detail : "Failed to deactivate staff member.");
        } finally {
            setIsDeactivating(false);
        }
    }, [deactivateMember, toast]);

    const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    return (
        <>
            <Toast toasts={toasts} onDismiss={dismissToast} />

            {showCreate && (
                <StaffModal mode="create" onClose={() => setShowCreate(false)} onSaved={handleSaved} />
            )}
            {editMember && (
                <StaffModal mode="edit" member={editMember} onClose={() => setEditMember(null)} onSaved={handleSaved} />
            )}
            {deactivateMember && (
                <ConfirmDeactivateModal member={deactivateMember} onClose={() => setDeactivateMember(null)} onConfirm={handleDeactivate} isLoading={isDeactivating} />
            )}

            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
                        <p className="mt-1 text-sm text-gray-500">Manage team members in your organization.</p>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => setShowCreate(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            Add Staff
                        </button>
                    )}
                </div>

                {/* Table Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Search + Filter */}
                    <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="search"
                                value={search}
                                onChange={e => handleSearchChange(e.target.value)}
                                placeholder="Search by email…"
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => handleFilterChange(e.target.value as "all" | "active" | "inactive")}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors bg-white"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <button onClick={() => loadStaff()} disabled={loading} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40" aria-label="Refresh">
                            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                    </div>

                    {/* Error */}
                    {loadError && (
                        <div role="alert" className="m-4 bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm">
                            {loadError} <button onClick={() => loadStaff()} className="ml-2 underline font-medium">Retry</button>
                        </div>
                    )}

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm" aria-label="Staff members">
                            <thead>
                                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Role</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Joined</th>
                                    {isAdmin && <th className="px-6 py-3 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <TableSkeleton />
                                ) : members.length === 0 ? (
                                    <tr>
                                        <td colSpan={isAdmin ? 5 : 4} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                </div>
                                                <p className="text-gray-500 font-medium">
                                                    {debouncedSearch ? `No staff matching "${debouncedSearch}"` : "No staff yet"}
                                                </p>
                                                {isAdmin && !debouncedSearch && (
                                                    <button onClick={() => setShowCreate(true)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                                                        Add your first team member →
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    members.map(m => (
                                        <tr key={m.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-900">{m.email}</td>
                                            <td className="px-6 py-4"><RoleBadge role={m.role} /></td>
                                            <td className="px-6 py-4"><StatusBadge active={m.is_active} /></td>
                                            <td className="px-6 py-4 text-gray-500">{fmt(m.created_at)}</td>
                                            {isAdmin && (
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => setEditMember(m)}
                                                            aria-label={`Edit ${m.email}`}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        </button>
                                                        <button
                                                            onClick={() => setDeactivateMember(m)}
                                                            disabled={!m.is_active}
                                                            aria-label={`Deactivate ${m.email}`}
                                                            title={!m.is_active ? "Already inactive" : "Deactivate"}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Pagination total={total} limit={PAGE_SIZE} offset={offset} onChange={setOffset} />
                </div>
            </div>
        </>
    );
}
