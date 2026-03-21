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
                    <h1 className="text-[28px] font-extrabold text-[#0f172a] tracking-tight leading-tight">Sessions</h1>
                    <p className="mt-1.5 text-[14.5px] text-[#64748b]">Manage your date-based service sessions and their queues.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
                        <svg className="w-[18px] h-[18px] text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => {
                                setFilterDate(e.target.value);
                                setPage(1);
                            }}
                            className="text-[13.5px] font-medium text-[#0f172a] focus:outline-none bg-transparent appearance-none"
                            placeholder="Filter by date"
                        />
                        {filterDate && (
                            <button onClick={() => { setFilterDate(""); setPage(1); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                    </div>
                    {!isStaff && (
                        <button
                            onClick={() => setShowCreate(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl transition-all duration-[0.22s] shadow-[0_1px_3px_rgba(37,99,235,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] text-[13.5px]"
                        >
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            New Session
                        </button>
                    )}
                </div>
            </div>

            {/* Today's quick-link banner */}
            {todaysSession && (
                <div className="bg-gradient-to-r from-indigo-50/80 to-white border border-indigo-100 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-white border border-indigo-100 rounded-xl flex items-center justify-center shadow-sm">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[14.5px] font-bold text-[#0f172a] tracking-tight">Today&apos;s Session</p>
                            <p className="text-[12.5px] font-medium text-indigo-600/80 mt-0.5 tracking-wide">{todaysSession.queue_count} queues active</p>
                        </div>
                    </div>
                    <Link
                        href={`${dashBase}/sessions/${todaysSession.id}/queues`}
                        className="px-4 py-2.5 bg-white border border-slate-200 text-[#0f172a] text-[13.5px] font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                        Go to Today&apos;s Queues →
                    </Link>
                </div>
            )}

            {/* Error */}
            {error && (
                <div role="alert" className="bg-red-50 text-red-700 px-5 py-4 rounded-xl border border-red-200 text-[13.5px] font-medium flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={loadData} className="underline font-semibold hover:text-red-800 transition-colors">Retry</button>
                </div>
            )}

            {/* Sessions Grid */}
            {isLoading ? (
                <div className="text-center py-24">
                    <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[13.5px] text-[#64748b] font-medium tracking-wide">Loading sessions...</p>
                </div>
            ) : sessions.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center py-24 px-6 shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
                        <svg className="w-[28px] h-[28px] text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-[17px] font-bold text-[#0f172a] tracking-tight mb-2">No sessions yet</h3>
                    <p className="text-[14px] text-[#64748b] mb-8 max-w-sm mx-auto">
                        Create your first session to start organizing queues by date.
                    </p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl transition-all shadow-[0_1px_3px_rgba(37,99,235,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] text-[14px]"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                        Create First Session
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {sessions.map((session) => {
                            const today = isToday(session.session_date);
                            return (
                                <div
                                    key={session.id}
                                    className={`bg-white rounded-2xl border transition-all duration-[0.22s] ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden group hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 ${today ? "border-indigo-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)]" : "border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"}`}
                                >
                                    <div className="p-5 relative">
                                        {/* Subtle top-right glow for today */}
                                        {today && (
                                            <div aria-hidden className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/10 blur-xl pointer-events-none rounded-full" />
                                        )}
                                        
                                        <div className="flex items-start justify-between mb-4 relative z-10">
                                            <div className="flex items-center gap-3.5">
                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border ${today ? "bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-600/50" : "bg-gradient-to-b from-white to-slate-50/80 border-slate-200/80"}`}>
                                                    <svg className={`w-[20px] h-[20px] ${today ? "text-white" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[15.5px] font-bold text-[#0f172a] tracking-tight">
                                                            {formatDate(session.session_date)}
                                                        </p>
                                                        {today && (
                                                            <span className="inline-flex items-center text-[9.5px] font-black uppercase tracking-[0.08em] text-indigo-700 bg-indigo-50/80 border border-indigo-100 px-1.5 py-0.5 rounded-md">Today</span>
                                                        )}
                                                    </div>
                                                    {session.title && (
                                                        <p className="text-[12.5px] font-medium text-[#64748b] mt-0.5 truncate max-w-[150px]">{session.title}</p>
                                                    )}
                                                </div>
                                            </div>
                                            {!isStaff && (
                                                <button
                                                    onClick={(e) => handleDelete(session.id, e)}
                                                    disabled={deletingId === session.id}
                                                    className="opacity-0 group-hover:opacity-100 p-2 text-red-500/70 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                                                    aria-label="Delete session"
                                                >
                                                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 mt-5">
                                            <div className="bg-[#fafbfe] border border-slate-100/80 rounded-xl px-4 py-2.5 flex-1 flex items-center justify-between shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)] transition-colors group-hover:bg-[#f8fafc]">
                                                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-[0.08em]">Queues</p>
                                                <p className="text-[18px] font-extrabold text-[#0f172a]">{session.queue_count}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/30 to-slate-50/80 px-5 py-3.5 flex justify-center mt-auto">
                                        <Link
                                            href={`${dashBase}/sessions/${session.id}/queues`}
                                            className="w-full text-center text-[13.5px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center justify-center gap-1.5 group-hover:gap-2 duration-300"
                                        >
                                            Manage Queues <span aria-hidden="true">→</span>
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {total > LIMIT && (
                        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm">
                            <p className="text-[13px] text-[#64748b] font-medium">
                                Showing <span className="text-[#0f172a] font-bold">{(page - 1) * LIMIT + 1}</span> to <span className="text-[#0f172a] font-bold">{Math.min(page * LIMIT, total)}</span> of <span className="text-[#0f172a] font-bold">{total}</span>
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 text-[13px] font-semibold bg-white border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-50 disabled:bg-slate-50 hover:bg-[#f8fafc] hover:border-slate-300 transition-all text-[#0f172a]"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page * LIMIT >= total}
                                    className="px-4 py-2 text-[13px] font-semibold bg-white border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-50 disabled:bg-slate-50 hover:bg-[#f8fafc] hover:border-slate-300 transition-all text-[#0f172a]"
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
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowCreate(false)} />
                    <div className="relative bg-white rounded-[20px] shadow-[0_20px_40px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.02)] max-w-[400px] w-full p-7 animate-in fade-in zoom-in duration-200">
                        <div className="mb-6">
                            <h3 className="text-[20px] font-extrabold text-[#0f172a] tracking-tight mb-1.5">New Session</h3>
                            <p className="text-[13.5px] text-[#64748b]">Select a date and optional title for the new session.</p>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-[10.5px] font-bold text-[#64748b] uppercase tracking-[0.08em] mb-2">
                                    Session Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    ref={dateRef}
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    required
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[14px] text-[#0f172a] font-medium bg-[#fafbfe] hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10.5px] font-bold text-[#64748b] uppercase tracking-[0.08em] mb-2 flex items-center justify-between">
                                    <span>Title</span>
                                    <span className="text-slate-400 font-medium tracking-normal normal-case">Optional</span>
                                </label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="e.g. Morning Clinic"
                                    maxLength={200}
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[14px] text-[#0f172a] font-medium bg-[#fafbfe] hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:outline-none transition-all placeholder:text-slate-400/80"
                                />
                            </div>
                            {createError && (
                                <div className="p-3 mt-1 rounded-xl bg-red-50 text-red-700 text-[13px] font-medium border border-red-100 flex items-start gap-2">
                                    <svg className="w-[18px] h-[18px] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span>{createError}</span>
                                </div>
                            )}
                            <div className="flex gap-3 pt-5 mt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    className="flex-1 px-4 py-2.5 text-[13.5px] font-semibold text-[#64748b] bg-white border border-slate-200 hover:bg-slate-50 hover:text-[#0f172a] rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading || !newDate}
                                    className="flex-[1.5] px-4 py-2.5 text-[13.5px] font-semibold text-white bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border border-transparent rounded-xl disabled:opacity-50 transition-all shadow-[0_1px_3px_rgba(37,99,235,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]"
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
