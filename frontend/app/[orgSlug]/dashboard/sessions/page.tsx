"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { SessionResponse } from "@/types/api";
import { useAuth } from "@/hooks/useAuth";

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function isToday(dateStr: string): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return dateStr === today;
}

export default function SessionsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const isStaff = user?.role === "staff";
    const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";

    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [filterDate, setFilterDate] = useState("");
    const LIMIT = 12;
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Create modal state
    const [showCreate, setShowCreate] = useState(false);
    const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [newTitle, setNewTitle] = useState("");
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const dateRef = useRef<HTMLInputElement>(null);

    // Delete state
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.listSessions(LIMIT, (page - 1) * LIMIT, filterDate || undefined);
            setSessions(res.items || []);
            setTotal(res.total);
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Failed to load sessions");
        } finally {
            setIsLoading(false);
        }
    }, [page, filterDate]);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        if (showCreate) {
            setNewDate(new Date().toISOString().slice(0, 10));
            setNewTitle("");
            setCreateError(null);
            setTimeout(() => dateRef.current?.focus(), 100);
        }
    }, [showCreate]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDate) return;
        setCreateLoading(true);
        setCreateError(null);
        try {
            const created = await api.createSession({ session_date: newDate, title: newTitle.trim() || undefined });
            setShowCreate(false);
            // Navigate directly to the new session's queues
            router.push(`${dashBase}/sessions/${created.id}/queues`);
        } catch (err: unknown) {
            if (err instanceof ApiError) setCreateError(err.detail);
            else setCreateError("Failed to create session");
        } finally {
            setCreateLoading(false);
        }
    };

    const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this session and ALL its queues and tokens? This cannot be undone.")) return;
        setDeletingId(sessionId);
        try {
            await api.deleteSession(sessionId);
            await loadData();
        } catch (err: unknown) {
            alert(err instanceof ApiError ? err.detail : "Failed to delete session");
        } finally {
            setDeletingId(null);
        }
    };

    const todaysSession = sessions.find(s => isToday(s.session_date));

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
                    <p className="mt-1 text-sm text-gray-500">Manage your date-based service sessions and their queues.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => {
                                setFilterDate(e.target.value);
                                setPage(1);
                            }}
                            className="text-sm text-gray-900 focus:outline-none bg-transparent"
                            placeholder="Filter by date"
                        />
                        {filterDate && (
                            <button onClick={() => { setFilterDate(""); setPage(1); }} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                    </div>
                    {!isStaff && (
                        <button
                            onClick={() => setShowCreate(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            New Session
                        </button>
                    )}
                </div>
            </div>

            {/* Today's quick-link banner */}
            {todaysSession && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-blue-900">Today&apos;s Session</p>
                            <p className="text-xs text-blue-600">{todaysSession.queue_count} queues active</p>
                        </div>
                    </div>
                    <Link
                        href={`${dashBase}/sessions/${todaysSession.id}/queues`}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Go to Today&apos;s Queues →
                    </Link>
                </div>
            )}

            {/* Error */}
            {error && (
                <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={loadData} className="underline font-medium">Retry</button>
                </div>
            )}

            {/* Sessions Grid */}
            {isLoading ? (
                <div className="text-center py-24">
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-gray-500 font-medium">Loading sessions...</p>
                </div>
            ) : sessions.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 text-center py-24 px-6">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No sessions yet</h3>
                    <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">
                        Create your first session to start organizing queues by date.
                    </p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-100 text-sm"
                    >
                        + Create First Session
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {sessions.map((session) => {
                            const today = isToday(session.session_date);
                            return (
                                <div
                                    key={session.id}
                                    className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden group ${today ? "border-blue-300 ring-2 ring-blue-100" : "border-gray-200"}`}
                                >
                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${today ? "bg-blue-600" : "bg-gray-100"}`}>
                                                    <svg className={`w-5 h-5 ${today ? "text-white" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-base font-bold text-gray-900">
                                                        {formatDate(session.session_date)}
                                                    </p>
                                                    {today && (
                                                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Today</span>
                                                    )}
                                                    {session.title && (
                                                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[160px]">{session.title}</p>
                                                    )}
                                                </div>
                                            </div>
                                            {!isStaff && (
                                                <button
                                                    onClick={(e) => handleDelete(session.id, e)}
                                                    disabled={deletingId === session.id}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                                    aria-label="Delete session"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 mt-4">
                                            <div className="bg-gray-50 rounded-lg px-3 py-2 flex-1 text-center">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Queues</p>
                                                <p className="text-xl font-black text-gray-900">{session.queue_count}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-3">
                                        <Link
                                            href={`${dashBase}/sessions/${session.id}/queues`}
                                            className="w-full block text-center text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                                        >
                                            Manage Queues →
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {total > LIMIT && (
                        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-gray-200">
                            <p className="text-xs text-gray-500 font-medium">
                                Showing <span className="text-gray-900 font-bold">{(page - 1) * LIMIT + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(page * LIMIT, total)}</span> of <span className="text-gray-900 font-bold">{total}</span> sessions
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-lg shadow-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page * LIMIT >= total}
                                    className="px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-lg shadow-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Create Session Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Create New Session</h3>
                        <p className="text-xs text-gray-500 mb-6">Pick a date to start a new service session.</p>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                    Session Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    ref={dateRef}
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    required
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 focus:outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                    Title <span className="text-gray-300">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="e.g. Morning Clinic"
                                    maxLength={200}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 focus:outline-none transition-all placeholder:text-gray-300"
                                />
                            </div>
                            {createError && (
                                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100">
                                    {createError}
                                </div>
                            )}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    className="flex-1 px-4 py-3 text-sm font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading || !newDate}
                                    className="flex-1 px-4 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-colors shadow-lg shadow-blue-100"
                                >
                                    {createLoading ? "Creating..." : "Create Session"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
