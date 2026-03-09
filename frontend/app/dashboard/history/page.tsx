"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api, ApiError } from "@/lib/api";
import type { SessionResponse, QueueResponse, AnalyticsOverview, TokenDetail } from "@/types/api";

export default function HistoryPage() {
    // ── State ────────────────────────────────────────────────────────────────
    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [queues, setQueues] = useState<QueueResponse[]>([]);
    const [tokens, setTokens] = useState<TokenDetail[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);

    const [selectedSessionId, setSelectedSessionId] = useState<string>("");
    const [selectedQueueId, setSelectedQueueId] = useState<string>("");

    const [isLoadingSessions, setIsLoadingSessions] = useState(true);
    const [isLoadingQueues, setIsLoadingQueues] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // ── Initial Load: Sessions ───────────────────────────────────────────────
    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const data = await api.listSessions();
                // Sort by date desc
                const sorted = [...data].sort((a, b) =>
                    new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
                );
                setSessions(sorted);
                if (sorted.length > 0) {
                    // Default to latest session
                    setSelectedSessionId(sorted[0].id);
                }
            } catch (err) {
                setError(err instanceof ApiError ? err.detail : "Failed to load sessions.");
            } finally {
                setIsLoadingSessions(false);
            }
        };
        fetchSessions();
    }, []);

    // ── Load Queues when Session changes ─────────────────────────────────────
    useEffect(() => {
        if (!selectedSessionId) {
            setQueues([]);
            setSelectedQueueId("");
            return;
        }

        const fetchQueues = async () => {
            setIsLoadingQueues(true);
            try {
                const data = await api.listSessionQueues(selectedSessionId);
                setQueues(data);
                if (data.length > 0) {
                    setSelectedQueueId(data[0].id);
                } else {
                    setSelectedQueueId("");
                    setTokens([]);
                    setAnalytics(null);
                }
            } catch (err) {
                setError("Failed to load queues for this session.");
            } finally {
                setIsLoadingQueues(false);
            }
        };
        fetchQueues();
    }, [selectedSessionId]);

    // ── Load Data (Analytics + Tokens) when Selection changes ───────────────
    useEffect(() => {
        if (!selectedSessionId || !selectedQueueId) return;

        const fetchData = async () => {
            setIsLoadingData(true);
            try {
                const [analyticsData, tokensData] = await Promise.all([
                    api.getOverview(selectedSessionId, selectedQueueId),
                    api.listQueueTokens(selectedQueueId)
                ]);
                setAnalytics(analyticsData);
                setTokens(tokensData);
            } catch (err) {
                setError("Failed to load historical data.");
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchData();
    }, [selectedSessionId, selectedQueueId]);

    // ── Filtering Logic ──────────────────────────────────────────────────────
    const filteredTokens = useMemo(() => {
        return tokens.filter(t => {
            const matchesSearch =
                t.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.token_number.toString().includes(searchTerm) ||
                t.customer_phone.includes(searchTerm);

            const matchesStatus = statusFilter === "all" || t.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [tokens, searchTerm, statusFilter]);

    // ── Export CSV ───────────────────────────────────────────────────────────
    const handleExport = () => {
        if (filteredTokens.length === 0) return;

        const headers = ["Token #", "Name", "Age", "Phone", "Status", "Joined At", "Served At", "Completed At"];
        const rows = filteredTokens.map(t => [
            t.token_number,
            t.customer_name,
            t.customer_age || "N/A",
            t.customer_phone,
            t.status.toUpperCase(),
            t.created_at ? new Date(t.created_at).toLocaleTimeString() : "N/A",
            t.served_at ? new Date(t.served_at).toLocaleTimeString() : "N/A",
            t.completed_at ? new Date(t.completed_at).toLocaleTimeString() : "N/A"
        ]);

        const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `history_${selectedQueueId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ── Render Helpers ───────────────────────────────────────────────────────
    const formatTime = (dateStr: string | null) => {
        if (!dateStr) return "—";
        try {
            return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return "—";
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "done": return "bg-emerald-100 text-emerald-700";
            case "waiting": return "bg-amber-100 text-amber-700";
            case "serving": return "bg-blue-100 text-blue-700";
            case "skipped": return "bg-gray-100 text-gray-700";
            case "deleted": return "bg-red-100 text-red-700";
            default: return "bg-gray-100 text-gray-600";
        }
    };

    if (isLoadingSessions) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">History & Analytics</h1>
                    <p className="text-gray-500 mt-1">Review past sessions, queue performance and customer details.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Session Selector */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Session Date</label>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <select
                                value={selectedSessionId}
                                onChange={(e) => setSelectedSessionId(e.target.value)}
                                className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none shadow-sm min-w-[200px]"
                                disabled={isLoadingSessions}
                            >
                                <option value="" disabled>Select Date</option>
                                {sessions.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {formatDate(s.session_date)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Queue Selector */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Queue</label>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            <select
                                value={selectedQueueId}
                                onChange={(e) => setSelectedQueueId(e.target.value)}
                                className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none shadow-sm min-w-[180px]"
                                disabled={isLoadingQueues || queues.length === 0}
                            >
                                {isLoadingQueues ? (
                                    <option>Loading...</option>
                                ) : queues.length === 0 ? (
                                    <option>No queues found</option>
                                ) : (
                                    queues.map(q => (
                                        <option key={q.id} value={q.id}>{q.name}</option>
                                    ))
                                )}
                            </select>
                        </div>
                    </div>
                </div>
            </header>

            {error && (
                <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}

            {!selectedSessionId ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No session selected</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mt-1">Please select a session from the dropdown above to view historical analytics and token data.</p>
                </div>
            ) : isLoadingData ? (
                <div className="flex h-[40vh] items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-gray-500 text-sm font-medium">Fetching history data...</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* ── Summary Cards ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </div>
                            </div>
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Total Visits</p>
                            <h3 className="text-3xl font-black text-gray-900 mt-1">{analytics?.status_counts.total || 0}</h3>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    {analytics?.status_counts.total
                                        ? Math.round((analytics.status_counts.served / analytics.status_counts.total) * 100)
                                        : 0}%
                                </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Served</p>
                            <h3 className="text-3xl font-black text-gray-900 mt-1">{analytics?.status_counts.served || 0}</h3>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-gray-50 text-gray-600 rounded-lg">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Avg Waiting</p>
                            <h3 className="text-3xl font-black text-gray-900 mt-1">{analytics?.timings.avg_waiting_time || "0m"}</h3>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                    </svg>
                                </div>
                            </div>
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Avg Service</p>
                            <h3 className="text-3xl font-black text-gray-900 mt-1">{analytics?.timings.avg_served_time || "0m"}</h3>
                        </div>
                    </div>

                    {/* ── Table Section ── */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <h2 className="text-lg font-bold text-gray-900">Customer Records</h2>

                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Search name, phone or #..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-400"
                                    />
                                </div>

                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-3 py-2 bg-gray-50 border border-transparent rounded-xl text-sm font-medium text-gray-600 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer transition-all"
                                >
                                    <option value="all">All Status</option>
                                    <option value="done">Served</option>
                                    <option value="waiting">Waiting</option>
                                    <option value="skipped">Skipped</option>
                                    <option value="deleted">Removed</option>
                                </select>

                                <button
                                    onClick={handleExport}
                                    title="Export to CSV"
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left font-sans">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider"># Token</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Joined At</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Served At</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Finished At</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredTokens.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center">
                                                <p className="text-gray-400 text-sm font-medium">No customer records match your criteria.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTokens.map((t) => (
                                            <tr key={t.id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="text-base font-black text-gray-900 tabular-nums">
                                                        {t.token_number}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 leading-none">{t.customer_name}</p>
                                                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-semibold">
                                                            {t.customer_age ? `${t.customer_age} Years` : "Age Unknown"}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-gray-500 font-medium">{t.customer_phone}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusStyle(t.status)}`}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 font-medium tabular-nums">
                                                    {formatTime(t.created_at)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 font-medium tabular-nums">
                                                    {formatTime(t.served_at)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 font-medium tabular-nums">
                                                    {formatTime(t.completed_at)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 text-center border-t border-gray-100">
                            <p className="text-xs text-gray-400 font-medium">
                                Showing {filteredTokens.length} of {tokens.length} records in this queue.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
