"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { AnalyticsOverview, SessionResponse, QueueResponse } from "@/types/api";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function OverviewPage() {
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";

    // Filtering state
    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [queues, setQueues] = useState<QueueResponse[]>([]);
    const [selectedSession, setSelectedSession] = useState<string>("");
    const [selectedQueue, setSelectedQueue] = useState<string>("");
    const [recentPage, setRecentPage] = useState(1);
    const RECENT_LIMIT = 10;

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await api.getOverview(
                selectedSession || undefined,
                selectedQueue || undefined,
                RECENT_LIMIT,
                (recentPage - 1) * RECENT_LIMIT
            );
            setOverview(data);
        } catch (err: unknown) {
            console.error("Overview fetch failed", err);
            if (err instanceof Error) setError(err.message);
            else setError("Failed to load overview data");
        } finally {
            setIsLoading(false);
        }
    }, [selectedSession, selectedQueue, recentPage]);

    // Initial load of sessions
    useEffect(() => {
        api.listSessions(100, 0).then(res => setSessions(res.items)).catch(console.error);
    }, []);

    // Load queues when session changes
    useEffect(() => {
        if (selectedSession) {
            api.listSessionQueues(selectedSession, 100, 0).then(res => setQueues(res.items)).catch(() => setQueues([]));
        } else {
            setQueues([]);
            setSelectedQueue("");
        }
        setRecentPage(1); // Reset page on filter change
    }, [selectedSession]);

    useEffect(() => {
        loadData();
    }, [loadData, recentPage]);

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        At-a-glance performance metrics for your organization.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Session Filter */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Session</label>
                        <select
                            value={selectedSession}
                            onChange={(e) => setSelectedSession(e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 min-w-[160px]"
                        >
                            <option value="">All Sessions</option>
                            {sessions.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {new Date(s.session_date + "T00:00:00").toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                                    {s.title ? ` - ${s.title}` : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Queue Filter */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Queue</label>
                        <select
                            value={selectedQueue}
                            onChange={(e) => setSelectedQueue(e.target.value)}
                            disabled={!selectedSession}
                            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 min-w-[160px] disabled:opacity-50"
                        >
                            <option value="">All Queues</option>
                            {queues.map((q) => (
                                <option key={q.id} value={q.id}>{q.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {error && (
                <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={loadData} className="underline font-medium">Retry</button>
                </div>
            )}

            {/* STATS CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Visits</p>
                    <p className="text-3xl font-black text-gray-900">{overview?.status_counts?.total ?? 0}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm outline outline-2 outline-blue-50">
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Waiting</p>
                    <p className="text-3xl font-black text-blue-600">{overview?.status_counts?.waiting ?? 0}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm outline outline-2 outline-emerald-50">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Served</p>
                    <p className="text-3xl font-black text-emerald-600">{overview?.status_counts?.served ?? 0}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-1">Cancelled</p>
                    <p className="text-3xl font-black text-gray-400">{overview?.status_counts?.cancelled ?? 0}</p>
                </div>
            </div>

            {/* TIMINGS SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Wait Times
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Average</p>
                            <p className="text-lg font-bold text-gray-900 tabular-nums">{overview?.timings?.avg_waiting_time || "00:00:00"}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Maximum</p>
                            <p className="text-lg font-bold text-gray-900 tabular-nums">{overview?.timings?.max_waiting_time || "00:00:00"}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Service Times
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Average</p>
                            <p className="text-lg font-bold text-gray-900 tabular-nums">{overview?.timings?.avg_served_time || "00:00:00"}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Maximum</p>
                            <p className="text-lg font-bold text-gray-900 tabular-nums">{overview?.timings?.max_served_time || "00:00:00"}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900">Recent Activity</h3>
                    <Link href={`${dashBase}/history`} className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 group">
                        View More
                        <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
                {isLoading ? (
                    <div className="p-12 text-center text-sm text-gray-400">Loading activity...</div>
                ) : overview?.recent_activity?.length ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-50 bg-white">
                                    <th className="px-6 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider">Token</th>
                                    <th className="px-6 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider">Queue</th>
                                    <th className="px-6 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {overview.recent_activity.map((act, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900">#{act.number}</td>
                                        <td className="px-6 py-4 text-gray-600">{act.queue}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${act.status === 'done' ? 'bg-emerald-100 text-emerald-700' :
                                                act.status === 'waiting' ? 'bg-amber-100 text-amber-700' :
                                                    act.status === 'serving' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-500'
                                                }`}>
                                                {act.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 text-xs">
                                            {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {/* Recent Activity Pagination */}
                        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                            <button
                                onClick={() => setRecentPage(p => Math.max(1, p - 1))}
                                disabled={recentPage === 1 || isLoading}
                                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors flex items-center gap-1"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                                Previous
                            </button>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Page {recentPage}</span>
                            <button
                                onClick={() => setRecentPage(p => p + 1)}
                                disabled={(overview?.recent_activity?.length || 0) < RECENT_LIMIT || isLoading}
                                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors flex items-center gap-1"
                            >
                                Next
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-12 text-center text-sm text-gray-400">No recent activity detected.</div>
                )}
            </div>
        </div>
    );
}
