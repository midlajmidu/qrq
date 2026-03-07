"use client";

import { use, useState, useCallback, useRef, useEffect } from "react";
import React from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useQueueSocket } from "@/hooks/useQueueSocket";
import { getToken, getCurrentUser } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import ConnectionBadge from "@/components/ConnectionBadge";
import ConfirmModal from "@/components/ConfirmModal";
import QueueQRCode from "@/components/QueueQRCode";
import type { RecentToken, WaitingToken, QueueResponse } from "@/types/api";

interface PageProps {
    params: Promise<{ queueId: string }>;
}

export default function QueueDetailPage({ params }: PageProps) {
    const { queueId } = use(params);
    const token = getToken();
    const user = getCurrentUser();
    const isStaff = user?.role === "staff";
    const { toast } = useToast();

    const { state, status } = useQueueSocket(queueId, { token: token || undefined });

    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [inviteNumber, setInviteNumber] = useState("");
    const [removeNumber, setRemoveNumber] = useState("");
    const [tokenToRemove, setTokenToRemove] = useState<{ id: string, number: number } | null>(null);
    const [waitingSearch, setWaitingSearch] = useState("");
    const [recentSearch, setRecentSearch] = useState("");
    const [waitingPage, setWaitingPage] = useState(1);
    const [recentPage, setRecentPage] = useState(1);
    const PAGE_SIZE = 10;
    const router = useRouter();

    const filteredWaiting = React.useMemo(() => {
        if (!state?.waiting_tokens) return [];
        const filtered = waitingSearch
            ? state.waiting_tokens.filter(t =>
                String(t.token_number).includes(waitingSearch) ||
                t.customer_name?.toLowerCase().includes(waitingSearch.toLowerCase()) ||
                t.customer_phone?.includes(waitingSearch)
            )
            : state.waiting_tokens;
        return filtered;
    }, [state?.waiting_tokens, waitingSearch]);

    const paginatedWaiting = React.useMemo(() => {
        const start = (waitingPage - 1) * PAGE_SIZE;
        return filteredWaiting.slice(start, start + PAGE_SIZE);
    }, [filteredWaiting, waitingPage]);

    const filteredRecent = React.useMemo(() => {
        if (!state?.recent_tokens) return [];
        const filtered = recentSearch
            ? state.recent_tokens.filter(t =>
                String(t.token_number).includes(recentSearch) ||
                t.customer_name?.toLowerCase().includes(recentSearch.toLowerCase()) ||
                t.customer_phone?.includes(recentSearch)
            )
            : state.recent_tokens;
        return filtered;
    }, [state?.recent_tokens, recentSearch]);

    const paginatedRecent = React.useMemo(() => {
        const start = (recentPage - 1) * PAGE_SIZE;
        return filteredRecent.slice(start, start + PAGE_SIZE);
    }, [filteredRecent, recentPage]);

    React.useEffect(() => { setWaitingPage(1); }, [waitingSearch]);
    React.useEffect(() => { setRecentPage(1); }, [recentSearch]);

    const [initialQueue, setInitialQueue] = useState<QueueResponse | null>(null);

    // Debounce ref to prevent double-click spam
    const lastActionRef = useRef(0);
    const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initial fetch for queue details (REST backup for WS)
    useEffect(() => {
        api.getQueue(queueId)
            .then(setInitialQueue)
            .catch(() => { /* ignore, WS snapshot is primary */ });
    }, [queueId]);

    const isDisabled = actionLoading !== null; // Don't block on socket status for manual entry

    // Auto-clear error after 5s
    const setErrorWithTimer = useCallback((msg: string) => {
        setActionError(msg);
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => setActionError(null), 5000);
    }, []);

    const performAction = useCallback(async (
        actionName: string,
        fn: () => Promise<unknown>,
        successMsg?: string
    ) => {
        const now = Date.now();
        if (now - lastActionRef.current < 400) return;
        lastActionRef.current = now;

        setActionLoading(actionName);
        setActionError(null);
        try {
            await fn();
            if (successMsg) toast(successMsg, "success");
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setErrorWithTimer(err.detail);
                toast(err.detail, "error");
            } else {
                setErrorWithTimer("Action failed. Please try again.");
                toast("Action failed. Please try again.", "error");
            }
        } finally {
            setActionLoading(null);
        }
    }, [toast, setErrorWithTimer]);

    const handleNext = useCallback(async () => {
        const prefix = state?.prefix ?? "";
        await performAction("next", async () => {
            const res = await api.callNext(queueId, "done");
            if ("message" in res) {
                toast(res.message, "info");
            } else {
                toast(`${prefix}${res.serving} is now serving`, "success");
            }
        });
    }, [performAction, queueId, state?.prefix, toast]);

    const handleSkip = useCallback(() => setShowSkipConfirm(true), []);
    const handleConfirmSkip = useCallback(async () => {
        setShowSkipConfirm(false);
        const prefix = state?.prefix ?? "";
        await performAction("skip", async () => {
            const res = await api.callNext(queueId, "skipped");
            if ("message" in res) {
                toast(res.message, "info");
            } else {
                toast(`${prefix}${res.serving} is now serving`, "success");
            }
        });
    }, [performAction, queueId, state?.prefix, toast]);

    const handleReset = useCallback(async () => {
        setResetting(true);
        setActionError(null);
        try {
            await api.resetQueue(queueId);
            toast("Queue reset successfully", "success");
            setShowResetConfirm(false);
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to reset queue");
            setShowResetConfirm(false);
        } finally {
            setResetting(false);
        }
    }, [queueId, toast]);

    const handleDelete = useCallback(async () => {
        setDeleting(true);
        setActionError(null);
        try {
            await api.deleteQueue(queueId);
            toast("Queue deleted successfully", "success");
            router.push("/dashboard");
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to delete queue");
            setShowDeleteConfirm(false);
        } finally {
            setDeleting(false);
        }
    }, [queueId, router, toast]);

    const [showAddForm, setShowAddForm] = useState(false);
    const [addName, setAddName] = useState("");
    const [addPhone, setAddPhone] = useState("");
    const [addAge, setAddAge] = useState("");

    const handleAddCustomer = useCallback(async () => {
        if (!addName.trim() || !addPhone.trim()) return;
        setActionLoading("add");
        setActionError(null);
        try {
            const res = await api.adminJoin(queueId, {
                name: addName.trim(),
                phone: addPhone.trim(),
                age: addAge ? parseInt(addAge, 10) : undefined,
            });
            toast(`Token ${state?.prefix || ""}${res.token_number} created`, "success");
            setShowAddForm(false);
            setAddName(""); setAddPhone(""); setAddAge("");
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to add customer");
        } finally {
            setActionLoading(null);
        }
    }, [queueId, addName, addPhone, addAge, state?.prefix, toast]);

    const handleInvite = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteNumber) return;
        const num = parseInt(inviteNumber, 10);
        if (isNaN(num)) return;

        setActionLoading("invite");
        setActionError(null);
        try {
            await api.serveSpecificToken(queueId, num);
            toast(`Token ${state?.prefix || ""}${num} is now serving`, "success");
            setInviteNumber("");
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to invite token: it might not be waiting or doesn't exist.");
        } finally {
            setActionLoading(null);
        }
    }, [queueId, inviteNumber, state?.prefix, toast]);

    const handleRemoveByNumber = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        setActionError(null);
        if (!removeNumber) return;
        const num = parseInt(removeNumber, 10);
        if (isNaN(num)) return;

        const token = state?.waiting_tokens?.find((t) => t.token_number === num);
        if (!token) {
            setActionError(`Token ${state?.prefix || ""}${num} is not currently waiting.`);
            return;
        }

        setTokenToRemove({ id: token.id, number: token.token_number });
        setRemoveNumber("");
    }, [removeNumber, state?.waiting_tokens, state?.prefix]);

    const handleConfirmRemove = useCallback(async () => {
        if (!tokenToRemove) return;
        setActionLoading("remove");
        setActionError(null);
        try {
            await api.removeToken(tokenToRemove.id);
            toast(`Token ${state?.prefix || ""}${tokenToRemove.number} removed`, "success");
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to remove token");
        } finally {
            setActionLoading(null);
            setTokenToRemove(null);
        }
    }, [tokenToRemove, state?.prefix, toast]);

    // ── Keyboard shortcuts ─────────────────────────────────────────
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            // Don't trigger if typing in an input, textarea, or modal open
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
            if (showSkipConfirm) return;

            if (e.key === "Enter" && !isDisabled) {
                e.preventDefault();
                handleNext();
            }
            if ((e.key === "s" || e.key === "S") && !isDisabled) {
                e.preventDefault();
                handleSkip();
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isDisabled, handleNext, handleSkip, showSkipConfirm, state?.current_serving]);

    // ── Cleanup timers on unmount ──────────────────────────────────
    useEffect(() => {
        return () => {
            if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        };
    }, []);

    return (
        <div className="space-y-6">
            {/* Breadcrumb + Status */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard"
                        aria-label="Back to dashboard"
                        className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md p-1"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {state?.queue_name || initialQueue?.name || "Loading..."}
                        </h1>
                        <p className="text-sm text-gray-500">
                            Prefix: <span className="font-mono font-semibold">{state?.prefix || initialQueue?.prefix || "—"}</span>
                            {" · "}
                            {(state?.is_active ?? initialQueue?.is_active) ? (
                                <span className="text-emerald-600 font-medium">Active</span>
                            ) : (
                                <span className="text-red-500 font-medium">Inactive</span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <ConnectionBadge status={status} />
                    <Link
                        href={`/display/${queueId}`}
                        target="_blank"
                        rel="noopener"
                        className="text-xs font-medium text-gray-500 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        aria-label="Open TV display in new tab"
                    >
                        TV Display ↗
                    </Link>
                    {!isStaff && (
                        <Link
                            href={`/join/${queueId}`}
                            target="_blank"
                            rel="noopener"
                            className="text-xs font-medium text-gray-500 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            aria-label="Open join page in new tab"
                        >
                            Join Page ↗
                        </Link>
                    )}
                    <button
                        onClick={() => setShowResetConfirm(true)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-100 flex items-center gap-1"
                        aria-label="Reset Queue"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset
                    </button>
                    {!isStaff && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 flex items-center gap-1"
                            aria-label="Delete Queue"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                        </button>
                    )}
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column: Now Serving + Actions */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Big serving indicator */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center min-h-[260px] flex flex-col items-center justify-center">
                        <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">
                            Now Serving
                        </p>
                        <div className="text-8xl sm:text-9xl font-black text-blue-600 tabular-nums tracking-tight leading-none py-4" aria-live="polite" aria-atomic="true">
                            {state?.prefix || ""}{state?.current_serving || 0}
                        </div>

                        {state?.serving_details && (
                            <div className="mt-2 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <p className="text-2xl font-bold text-gray-900">{state.serving_details.customer_name}</p>
                                <div className="flex items-center justify-center gap-3 mt-1 text-sm text-gray-500 font-medium">
                                    {state.serving_details.customer_age != null && (
                                        <span>Age: {state.serving_details.customer_age}</span>
                                    )}
                                    {state.serving_details.customer_age != null && <span>•</span>}
                                    <span>{state.serving_details.customer_phone}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-500">
                            <span>Waiting: <strong className="text-gray-900">{state?.waiting_count ?? 0}</strong></span>
                            <span className="text-gray-300" aria-hidden="true">|</span>
                            <span>Issued: <strong className="text-gray-900">{state?.total_issued ?? 0}</strong></span>
                        </div>
                    </div>

                    {/* Action buttons — visual hierarchy: Next is primary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="toolbar" aria-label="Queue actions">
                        <button
                            onClick={handleNext}
                            disabled={isDisabled}
                            aria-label="Call next token (keyboard shortcut: Enter)"
                            className="py-4 px-6 bg-blue-600 text-white font-bold text-lg rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 disabled:hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        >
                            {actionLoading === "next" ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                                    Calling...
                                </span>
                            ) : (
                                <>Call Next <span className="hidden sm:inline text-blue-300 text-sm font-normal ml-1">(Enter)</span></>
                            )}
                        </button>

                        <button
                            onClick={handleSkip}
                            disabled={isDisabled}
                            aria-label="Skip current token (keyboard shortcut: S)"
                            className="py-4 px-6 bg-white text-amber-700 font-bold text-lg rounded-xl border border-amber-200 hover:bg-amber-50 active:bg-amber-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                        >
                            {actionLoading === "skip" ? "Skipping..." : <>Skip <span className="hidden sm:inline text-amber-400 text-sm font-normal ml-1">(S)</span></>}
                        </button>

                        <button
                            onClick={() => performAction("done", async () => {
                                const res = await api.callNext(queueId, "done");
                                if ("message" in res) toast(res.message, "info");
                                else toast(`${state?.prefix || ""}${res.serving} is now serving`, "success");
                            })}
                            disabled={isDisabled}
                            aria-label="Mark done and call next token"
                            className="py-4 px-6 bg-white text-emerald-700 font-bold text-lg rounded-xl border border-emerald-200 hover:bg-emerald-50 active:bg-emerald-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                        >
                            {actionLoading === "done" ? "Completing..." : "Done & Next"}
                        </button>
                    </div>

                    {/* Extended Manual Controls */}
                    <div className="flex flex-col md:flex-row gap-6 border-t border-gray-100 pt-6">
                        <div className="flex-1 space-y-2">
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Manual Entry</p>
                            {!showAddForm ? (
                                <button
                                    onClick={() => setShowAddForm(true)}
                                    disabled={isDisabled}
                                    className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Customer
                                </button>
                            ) : (
                                <div className="space-y-2">
                                    <input type="text" value={addName} onChange={e => setAddName(e.target.value)} placeholder="Full Name *" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    <input type="tel" value={addPhone} onChange={e => setAddPhone(e.target.value)} placeholder="Phone *" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    <input type="number" value={addAge} onChange={e => setAddAge(e.target.value)} placeholder="Age (optional)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    <div className="flex gap-2">
                                        <button onClick={handleAddCustomer} disabled={!addName.trim() || !addPhone.trim() || actionLoading === "add" || isDisabled} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm disabled:opacity-50 hover:bg-blue-700 transition-colors">
                                            {actionLoading === "add" ? "Adding..." : "Confirm"}
                                        </button>
                                        <button onClick={() => { setShowAddForm(false); setAddName(""); setAddPhone(""); setAddAge(""); }} className="flex-1 py-2 bg-gray-50 border border-gray-200 text-gray-600 font-semibold rounded-lg text-sm hover:bg-gray-100 transition-colors">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 space-y-2">
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Invite by Number</p>
                            <form onSubmit={handleInvite} className="flex gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    value={inviteNumber}
                                    onChange={(e) => setInviteNumber(e.target.value)}
                                    placeholder="Token #"
                                    disabled={isDisabled || actionLoading === "invite"}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="submit"
                                    disabled={!inviteNumber || isDisabled || actionLoading === "invite"}
                                    className="px-6 py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Call
                                </button>
                            </form>
                        </div>
                        <div className="flex-1 space-y-2">
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Remove by Number</p>
                            <form onSubmit={handleRemoveByNumber} className="flex gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    value={removeNumber}
                                    onChange={(e) => setRemoveNumber(e.target.value)}
                                    placeholder="Token #"
                                    disabled={isDisabled || actionLoading === "remove"}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                                <button
                                    type="submit"
                                    disabled={!removeNumber || isDisabled || actionLoading === "remove"}
                                    className="px-6 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Remove
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Error banner */}
                    {actionError && (
                        <div role="alert" className="bg-red-50 text-red-700 px-4 py-3 rounded-lg border border-red-200 text-sm font-medium">
                            {actionError}
                        </div>
                    )}

                    {/* Disconnected warning */}
                    {status === "disconnected" && (
                        <div role="alert" className="bg-amber-50 text-amber-800 px-4 py-3 rounded-lg border border-amber-200 text-sm">
                            <strong>Connection lost.</strong> Retrying connection to live updates. Manual actions are still available.
                        </div>
                    )}

                    {status === "reconnecting" && (
                        <div role="status" className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg border border-blue-200 text-sm flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" aria-hidden="true" />
                            Reconnecting to live updates...
                        </div>
                    )}
                </div>

                {/* Right column: QR Code, Waiting List & Recent Tokens */}
                <div className="space-y-6">
                    {/* QR Code */}
                    {!isStaff && (
                        <QueueQRCode queueId={queueId} queueName={state?.queue_name || "Queue"} />
                    )}

                    {/* Waiting List */}
                    <aside className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col" aria-label="Waiting list">
                        <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <h2 className="font-semibold text-gray-900 text-sm">Waiting List</h2>
                                <span className="text-xs bg-indigo-50 text-indigo-700 font-medium px-2 py-1 rounded-full">{state?.waiting_count ?? 0}</span>
                            </div>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </span>
                                <input
                                    type="text"
                                    placeholder="Search token..."
                                    value={waitingSearch}
                                    onChange={(e) => setWaitingSearch(e.target.value)}
                                    className="w-full text-sm pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[320px] divide-y divide-gray-50">
                            {paginatedWaiting.length > 0 ? (
                                paginatedWaiting.map((t: WaitingToken) => (
                                    <div key={t.id} className="px-5 py-3 group hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg font-bold text-gray-900 tabular-nums w-14">
                                                    {state?.prefix || ""}{t.token_number}
                                                </span>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                                                    Waiting
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setTokenToRemove({ id: t.id, number: t.token_number })}
                                                className="opacity-0 group-hover:opacity-100 text-xs font-semibold px-2 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded transition-all focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                                aria-label={`Remove token ${t.token_number}`}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        {/* Customer info row */}
                                        {t.customer_name && (
                                            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 pl-[68px]">
                                                <span className="font-medium text-gray-700">{t.customer_name}</span>
                                                {t.customer_age != null && <span>Age: {t.customer_age}</span>}
                                                <span>{t.customer_phone}</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="px-5 py-10 text-center text-sm text-gray-400 flex flex-col items-center">
                                    <svg className="w-8 h-8 text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    {waitingSearch ? "No tokens match your search" : "No one is waiting"}
                                </div>
                            )}
                        </div>
                        {/* Pagination */}
                        {filteredWaiting.length > PAGE_SIZE && (
                            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                                <span>Showing {paginatedWaiting.length} of {filteredWaiting.length}</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setWaitingPage(p => Math.max(1, p - 1))}
                                        disabled={waitingPage === 1}
                                        className="px-2 py-1 rounded bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-100"
                                    >
                                        Prev
                                    </button>
                                    <button
                                        onClick={() => setWaitingPage(p => p + 1)}
                                        disabled={waitingPage * PAGE_SIZE >= filteredWaiting.length}
                                        className="px-2 py-1 rounded bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-100"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </aside>

                    {/* Recent Activity */}
                    <aside className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col" aria-label="Recent activity">
                        <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-3">
                            <h2 className="font-semibold text-gray-900 text-sm">Recent Activity</h2>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </span>
                                <input
                                    type="text"
                                    placeholder="Search recent..."
                                    value={recentSearch}
                                    onChange={(e) => setRecentSearch(e.target.value)}
                                    className="w-full text-sm pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[250px] divide-y divide-gray-50">
                            {paginatedRecent.length > 0 ? (
                                paginatedRecent.map((t: RecentToken, i: number) => (
                                    <RecentTokenRow key={`${t.token_number}-${i}`} token={t} prefix={state?.prefix || ""} />
                                ))
                            ) : (
                                <div className="px-5 py-10 text-center text-sm text-gray-400 flex flex-col items-center">
                                    <svg className="w-8 h-8 text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    {recentSearch ? "No tokens match your search" : "No recent activity"}
                                </div>
                            )}
                        </div>
                        {/* Pagination */}
                        {filteredRecent.length > PAGE_SIZE && (
                            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                                <span>Showing {paginatedRecent.length} of {filteredRecent.length}</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setRecentPage(p => Math.max(1, p - 1))}
                                        disabled={recentPage === 1}
                                        className="px-2 py-1 rounded bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-100"
                                    >
                                        Prev
                                    </button>
                                    <button
                                        onClick={() => setRecentPage(p => p + 1)}
                                        disabled={recentPage * PAGE_SIZE >= filteredRecent.length}
                                        className="px-2 py-1 rounded bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-100"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </div>

            {/* Skip Confirmation Modal */}
            <ConfirmModal
                isOpen={showSkipConfirm}
                title="Skip Current Token?"
                message={`This will skip token ${state?.prefix || ""}${state?.current_serving || 0} and move to the next waiting token.`}
                confirmLabel="Skip Token"
                confirmVariant="danger"
                onConfirm={handleConfirmSkip}
                onCancel={() => setShowSkipConfirm(false)}
                isLoading={actionLoading === "skip"}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Delete Queue"
                message={`Are you sure you want to permanently delete the queue "${state?.queue_name || "this queue"}"? All associated tokens and data will be lost forever.`}
                confirmLabel="Delete Queue"
                confirmVariant="danger"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                isLoading={deleting}
            />

            {/* Reset Confirmation Modal */}
            <ConfirmModal
                isOpen={showResetConfirm}
                title="Reset Queue"
                message={`Are you sure you want to reset the queue "${state?.queue_name || "this queue"}"? This will delete all tokens and reset the current serving number to 0. This cannot be undone.`}
                confirmLabel="Reset Queue"
                confirmVariant="danger"
                onConfirm={handleReset}
                onCancel={() => setShowResetConfirm(false)}
                isLoading={resetting}
            />
            {/* Remove Token Confirmation Modal */}
            <ConfirmModal
                isOpen={!!tokenToRemove}
                title="Remove Customer"
                message={`Are you sure you want to remove token ${state?.prefix || ""}${tokenToRemove?.number} from the waiting list? They will be permanently marked as deleted.`}
                confirmLabel="Remove Token"
                confirmVariant="danger"
                onConfirm={handleConfirmRemove}
                onCancel={() => setTokenToRemove(null)}
                isLoading={actionLoading === "remove"}
            />
        </div>
    );
}

// ── Memoized row to prevent re-render storms on frequent updates ──
const RecentTokenRow = React.memo(function RecentTokenRow({
    token: t,
    prefix,
}: {
    token: RecentToken;
    prefix: string;
}) {
    const statusStyles: Record<string, string> = {
        serving: "bg-blue-100 text-blue-700",
        done: "bg-emerald-100 text-emerald-700",
        skipped: "bg-gray-100 text-gray-400",
        deleted: "bg-red-100 text-red-700",
        waiting: "bg-amber-100 text-amber-700",
    };

    return (
        <div className="px-5 py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900 tabular-nums w-14">
                        {prefix}{t.token_number}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusStyles[t.status] || "bg-gray-100 text-gray-500"}`}>
                        {t.status}
                    </span>
                </div>
                <span className="text-xs text-gray-400 tabular-nums">
                    {t.served_at ? new Date(t.served_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                </span>
            </div>
            {t.customer_name && (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 pl-[68px]">
                    <span className="font-medium text-gray-700">{t.customer_name}</span>
                    {t.customer_age != null && <span>Age: {t.customer_age}</span>}
                    <span>{t.customer_phone}</span>
                </div>
            )}
        </div>
    );
});
