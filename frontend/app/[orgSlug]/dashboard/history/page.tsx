"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { SessionResponse, QueueResponse, TokenHistoryItem, AnalyticsOverview } from "@/types/api";



function formatDate(dateStr: string): string {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function formatTime(isoStr: string | null): string {
    if (!isoStr) return "—";
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function HistoryPage() {
    // Filters
    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [queues, setQueues] = useState<QueueResponse[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string>("");
    const [selectedQueueId, setSelectedQueueId] = useState<string>("");

    // Data
    const [history, setHistory] = useState<TokenHistoryItem[]>([]);
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const PAGE_SIZE = 20;

    // Load initial sessions
    useEffect(() => {
        api.listSessions(100, 0).then(res => {
            const data = res.items;
            setSessions(data || []);
            if (data?.length > 0 && !selectedSessionId) {
                setSelectedSessionId(data[0].id);
            }
        }).finally(() => setIsLoading(false));
    }, [selectedSessionId]);

    // Load queues when session changes
    useEffect(() => {
        if (selectedSessionId) {
            api.listSessionQueues(selectedSessionId, 100, 0).then(res => {
                const data = res.items;
                setQueues(data || []);
                setSelectedQueueId(""); // Reset queue selection
                setPage(1); // Reset to first page
            });
        }
    }, [selectedSessionId]);

    const loadHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const [historyData, overviewData] = await Promise.all([
                api.getHistory({
                    sessionId: selectedSessionId || undefined,
                    queueId: selectedQueueId || undefined,
                    limit: PAGE_SIZE,
                    offset: (page - 1) * PAGE_SIZE
                }),
                api.getOverview(selectedSessionId || undefined, selectedQueueId || undefined)
            ]);
            setHistory(historyData.items);
            setTotal(historyData.total);
            setOverview(overviewData);
        } catch (err) {
            console.error("Failed to load history", err);
        } finally {
            setIsLoading(false);
        }
    }, [selectedSessionId, selectedQueueId, page]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    return (
        <div className="space-y-8 pb-12">
            {/* Header & Filters */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">Queue History</h1>
                        <p className="text-sm text-gray-500">View and analyze past tokens and performance.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Session</label>
                            <select
                                value={selectedSessionId}
                                onChange={(e) => setSelectedSessionId(e.target.value)}
                                className="block w-48 rounded-xl border-gray-200 bg-gray-50 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer"
                            >
                                <option value="">All Sessions</option>
                                {sessions.map(s => (
                                    <option key={s.id} value={s.id}>{formatDate(s.session_date)} {s.title ? `(${s.title})` : ""}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Queue</label>
                            <select
                                value={selectedQueueId}
                                onChange={(e) => setSelectedQueueId(e.target.value)}
                                className="block w-48 rounded-xl border-gray-200 bg-gray-50 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer disabled:opacity-50"
                                disabled={!selectedSessionId}
                            >
                                <option value="">All Queues</option>
                                {queues.map(q => (
                                    <option key={q.id} value={q.id}>{q.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Overview Stats */}
            {overview && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Tokens" value={overview.status_counts.total} icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    <StatCard title="Served" value={overview.status_counts.served} color="emerald" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <StatCard title="Avg. Wait" value={overview.timings.avg_waiting_time} color="blue" icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <StatCard title="Avg. Service" value={overview.timings.avg_served_time} color="indigo" icon="M13 10V3L4 14h7v7l9-11h-7z" />
                </div>
            )}

            {/* History Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px]">Token</th>
                                <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px]">Customer</th>
                                <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px]">Queue</th>
                                <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px]">Status</th>
                                <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px]">Created</th>
                                <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px]">Served</th>
                                <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px]">Completed</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading && history.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">Loading history...</td>
                                </tr>
                            ) : history.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">No records found for the selected filters.</td>
                                </tr>
                            ) : (
                                history.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="font-bold text-gray-900">{item.queue_prefix}{item.token_number}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-gray-900">{item.customer_name}</span>
                                                <span className="text-xs text-gray-500">{item.customer_phone}{item.customer_age ? ` · ${item.customer_age}y` : ""}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-gray-600">{item.queue_name}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <StatusBadge status={item.status} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 tabular-nums">
                                            {formatTime(item.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 tabular-nums">
                                            {formatTime(item.served_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 tabular-nums">
                                            {formatTime(item.completed_at)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > PAGE_SIZE && (
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-xs text-gray-500 font-medium">
                            Showing <span className="text-gray-900 font-bold">{(page - 1) * PAGE_SIZE + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(page * PAGE_SIZE, total)}</span> of <span className="text-gray-900 font-bold">{total}</span> tokens
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-lg shadow-sm disabled:opacity-50 hover:bg-gray-100 transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={page * PAGE_SIZE >= total}
                                className="px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-lg shadow-sm disabled:opacity-50 hover:bg-gray-100 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color = "blue" }: { title: string; value: string | number; icon: string; color?: string }) {
    const colorClasses = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
    }[color] as string;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
                    <p className="text-2xl font-black text-gray-900 tabular-nums">{value}</p>
                </div>
                <div className={`p-2 rounded-xl border ${colorClasses}`}>
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
    return (
        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${styles[status] || "bg-gray-100 text-gray-500"}`}>
            {status}
        </span>
    );
}
