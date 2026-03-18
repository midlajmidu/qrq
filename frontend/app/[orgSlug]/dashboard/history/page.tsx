"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import TokenDetailModal from "@/components/TokenDetailModal";
import type { TokenDetailData } from "@/components/TokenDetailModal";
import type { SessionResponse, QueueResponse, TokenHistoryItem, AnalyticsOverview } from "@/types/api";

// ── Helpers ──────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
}

function formatTime(isoStr: string | null): string {
    if (!isoStr) return "—";
    return new Date(isoStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function calcWaitingTime(created: string | null, served: string | null): string {
    if (!served) return "—";
    if (!created) return "—";
    const diffMs = new Date(served).getTime() - new Date(created).getTime();
    if (diffMs < 0) return "—";
    const mins = Math.floor(diffMs / 60000);
    return mins === 0 ? "< 1 min" : `${mins} min${mins !== 1 ? "s" : ""}`;
}

function toTokenDetailData(item: TokenHistoryItem): TokenDetailData {
    return {
        token_number: item.token_number,
        prefix: item.queue_prefix,
        customer_name: item.customer_name,
        customer_age: item.customer_age,
        customer_phone: item.customer_phone,
        status: item.status,
        created_at: item.created_at,
        served_at: item.served_at,
        completed_at: item.completed_at,
        entry_type: "manual",
        queue_name: item.queue_name,
    };
}

// ── Component ─────────────────────────────────────────────────────
export default function HistoryPage() {
    // Filters
    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [queues, setQueues] = useState<QueueResponse[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string>("");
    const [selectedQueueId, setSelectedQueueId] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");

    // Data
    const [history, setHistory] = useState<TokenHistoryItem[]>([]);
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const PAGE_SIZE = 20;

    // Modal
    const [selectedToken, setSelectedToken] = useState<TokenDetailData | null>(null);

    // Debounce search input
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, selectedSessionId, selectedQueueId]);

    // Load sessions
    useEffect(() => {
        api.listSessions(100, 0).then(res => {
            const data = res.items;
            setSessions(data || []);
            if (data?.length > 0 && !selectedSessionId) {
                setSelectedSessionId(data[0].id);
            }
        }).catch(() => { });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Load queues on session change
    useEffect(() => {
        if (!selectedSessionId) { setQueues([]); return; }
        api.listSessionQueues(selectedSessionId, 100, 0).then(res => {
            setQueues(res.items || []);
            setSelectedQueueId("");
        }).catch(() => { });
    }, [selectedSessionId]);

    const loadHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const [historyData, overviewData] = await Promise.all([
                api.getHistory({
                    sessionId: selectedSessionId || undefined,
                    queueId: selectedQueueId || undefined,
                    search: debouncedSearch || undefined,
                    status: statusFilter || undefined,
                    limit: PAGE_SIZE,
                    offset: (page - 1) * PAGE_SIZE,
                }),
                api.getOverview(selectedSessionId || undefined, selectedQueueId || undefined),
            ]);

            setHistory(historyData.items);
            setTotal(historyData.total);
            setOverview(overviewData);
        } catch (err) {
            console.error("Failed to load history", err);
        } finally {
            setIsLoading(false);
        }
    }, [selectedSessionId, selectedQueueId, page, statusFilter, debouncedSearch]);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="space-y-6 pb-12">
            {/* ── Page Header ──────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Queue History</h1>
                    <p className="text-sm text-gray-500">View and analyze past tokens and patient records.</p>
                </div>
                <div className="text-xs text-gray-400 font-medium">
                    {total > 0 ? <>{total} record{total !== 1 ? "s" : ""} found</> : null}
                </div>
            </div>

            {/* ── Overview Stats ───────────────────────────── */}
            {overview && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Tokens" value={overview.status_counts.total} color="blue" icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    <StatCard title="Served" value={overview.status_counts.served} color="emerald" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <StatCard title="Avg. Wait" value={overview.timings.avg_waiting_time} color="indigo" icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <StatCard title="Avg. Service" value={overview.timings.avg_served_time} color="amber" icon="M13 10V3L4 14h7v7l9-11h-7z" />
                </div>
            )}

            {/* ── Filters Row ──────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex flex-wrap items-end gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px] space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Search</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Name, token #, or phone…"
                                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Session */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Session</label>
                        <select
                            value={selectedSessionId}
                            onChange={e => setSelectedSessionId(e.target.value)}
                            className="block w-48 rounded-xl border-gray-200 bg-gray-50 text-sm py-2 px-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer"
                        >
                            <option value="">All Sessions</option>
                            {sessions.map(s => (
                                <option key={s.id} value={s.id}>{formatDate(s.session_date)} {s.title ? `(${s.title})` : ""}</option>
                            ))}
                        </select>
                    </div>

                    {/* Queue */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Queue</label>
                        <select
                            value={selectedQueueId}
                            onChange={e => setSelectedQueueId(e.target.value)}
                            className="block w-44 rounded-xl border-gray-200 bg-gray-50 text-sm py-2 px-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer disabled:opacity-50"
                            disabled={!selectedSessionId}
                        >
                            <option value="">All Queues</option>
                            {queues.map(q => (
                                <option key={q.id} value={q.id}>{q.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Status</label>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="block w-40 rounded-xl border-gray-200 bg-gray-50 text-sm py-2 px-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer"
                        >
                            <option value="">All Statuses</option>
                            <option value="done">Completed</option>
                            <option value="skipped">Skipped</option>
                            <option value="serving">Serving</option>
                            <option value="waiting">Waiting</option>
                            <option value="deleted">Removed</option>
                        </select>
                    </div>

                    {/* Clear filters */}
                    {(searchQuery || statusFilter || selectedQueueId) && (
                        <button
                            onClick={() => { setSearchQuery(""); setStatusFilter(""); setSelectedQueueId(""); }}
                            className="py-2 px-3 text-xs font-bold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            </div>

            {/* ── History Table ────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">Token</th>
                                <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-[10px]">Patient</th>
                                <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">Queue</th>
                                <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">Status</th>
                                <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">Type</th>
                                <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">Created</th>
                                <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">Called</th>
                                <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">Completed</th>
                                <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">Wait Time</th>
                                <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={10} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 text-gray-400">
                                            <span className="w-7 h-7 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                                            <span className="text-sm font-medium">Loading records…</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : history.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p className="text-sm text-gray-400 font-medium">No records found for the selected filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                history.map((item) => {
                                    const waitTime = calcWaitingTime(item.created_at, item.served_at);
                                    const waitMins = item.served_at ? parseInt(waitTime) : null;
                                    const waitCls = waitMins == null
                                        ? "text-gray-400"
                                        : waitMins > 15
                                            ? "text-amber-600 font-bold"
                                            : "text-emerald-600 font-semibold";

                                    return (
                                        <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                            {/* Token */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className="font-black text-gray-900 text-base tabular-nums">
                                                    {item.queue_prefix}{item.token_number}
                                                </span>
                                            </td>

                                            {/* Patient */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-semibold text-gray-900 truncate max-w-[160px]">{item.customer_name || "—"}</span>
                                                    <span className="text-xs text-gray-400">{item.customer_phone || "—"}{item.customer_age ? ` · ${item.customer_age}y` : ""}</span>
                                                </div>
                                            </td>

                                            {/* Queue */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className="text-gray-600 text-xs font-medium">{item.queue_name}</span>
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <StatusBadge status={item.status} />
                                            </td>

                                            {/* Entry Type */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <EntryTypeBadge type="manual" />
                                            </td>

                                            {/* Created */}
                                            <td className="px-5 py-3.5 whitespace-nowrap text-gray-500 tabular-nums text-xs">
                                                {formatTime(item.created_at)}
                                            </td>

                                            {/* Called */}
                                            <td className="px-5 py-3.5 whitespace-nowrap text-gray-500 tabular-nums text-xs">
                                                {formatTime(item.served_at)}
                                            </td>

                                            {/* Completed */}
                                            <td className="px-5 py-3.5 whitespace-nowrap text-gray-500 tabular-nums text-xs">
                                                {formatTime(item.completed_at)}
                                            </td>

                                            {/* Wait Time */}
                                            <td className={`px-5 py-3.5 whitespace-nowrap text-xs tabular-nums ${waitCls}`}>
                                                {waitTime}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <button
                                                    onClick={() => setSelectedToken(toTokenDetailData(item))}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                                                    aria-label={`View details for token ${item.token_number}`}
                                                    title="View patient details"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > PAGE_SIZE && (
                    <div className="bg-gray-50/70 px-5 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-xs text-gray-500 font-medium">
                            Showing <span className="text-gray-900 font-bold">{(page - 1) * PAGE_SIZE + 1}</span>
                            {" "}–{" "}
                            <span className="text-gray-900 font-bold">{Math.min(page * PAGE_SIZE, total)}</span>
                            {" "}of{" "}
                            <span className="text-gray-900 font-bold">{total}</span> patients
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage(1)}
                                disabled={page === 1}
                                className="px-2.5 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg shadow-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
                            >«</button>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg shadow-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
                            >Prev</button>

                            {/* Page numbers */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let p: number;
                                if (totalPages <= 5) p = i + 1;
                                else if (page <= 3) p = i + 1;
                                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                                else p = page - 2 + i;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`px-2.5 py-1.5 text-xs font-bold border rounded-lg shadow-sm transition-colors ${p === page
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-white border-gray-200 hover:bg-gray-100 text-gray-700"
                                            }`}
                                    >{p}</button>
                                );
                            })}

                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={page * PAGE_SIZE >= total}
                                className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg shadow-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
                            >Next</button>
                            <button
                                onClick={() => setPage(totalPages)}
                                disabled={page === totalPages}
                                className="px-2.5 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg shadow-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
                            >»</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Token Detail Modal */}
            <TokenDetailModal token={selectedToken} onClose={() => setSelectedToken(null)} />
        </div>
    );
}

// ── Sub-components ───────────────────────────────────────────────
function StatCard({ title, value, icon, color = "blue" }: { title: string; value: string | number; icon: string; color?: string }) {
    const colorClasses: Record<string, string> = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
    };
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
                    <p className="text-2xl font-black text-gray-900 tabular-nums">{value}</p>
                </div>
                <div className={`p-2 rounded-xl border ${colorClasses[color] ?? colorClasses.blue}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
                    </svg>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        done: "bg-emerald-100 text-emerald-700",
        serving: "bg-blue-100 text-blue-700",
        skipped: "bg-gray-100 text-gray-500",
        waiting: "bg-amber-100 text-amber-700",
        deleted: "bg-red-100 text-red-700",
    };
    const labels: Record<string, string> = {
        done: "Completed", serving: "Serving", skipped: "Skipped", waiting: "Waiting", deleted: "Removed",
    };
    return (
        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${styles[status] ?? "bg-gray-100 text-gray-500"}`}>
            {labels[status] ?? status}
        </span>
    );
}

function EntryTypeBadge({ type }: { type: "manual" | "qr" | "auto" }) {
    const styles: Record<string, string> = {
        manual: "bg-violet-100 text-violet-700",
        qr: "bg-cyan-100 text-cyan-700",
        auto: "bg-orange-100 text-orange-700",
    };
    return (
        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${styles[type] ?? styles.manual}`}>
            {type.toUpperCase()}
        </span>
    );
}
