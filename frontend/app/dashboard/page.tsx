"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import type { AnalyticsOverview, SessionResponse, QueueResponse } from "@/types/api";
import Link from "next/link";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
} from "recharts";

export default function DashboardOverviewPage() {
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [allQueues, setAllQueues] = useState<QueueResponse[]>([]);

    // Filters
    const [selectedSessionId, setSelectedSessionId] = useState<string>("");
    const [selectedQueueId, setSelectedQueueId] = useState<string>("");

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initial load: fetch dropdown data (sessions, queues) and initial overview
    const loadInitialData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [sessionsData, queuesData] = await Promise.all([
                api.listSessions(),
                api.listQueues()
            ]);
            setSessions(sessionsData);
            setAllQueues(queuesData);

            // Set default session to Today if available
            const todayStr = new Date().toISOString().split("T")[0];
            const todaySession = sessionsData.find(s => s.session_date === todayStr);

            let defaultSessionId = "";
            if (todaySession) {
                defaultSessionId = todaySession.id;
                setSelectedSessionId(todaySession.id);
            }

            const overviewData = await api.getOverview(
                defaultSessionId || undefined
            );
            setOverview(overviewData);
            setError(null);
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Failed to load dashboard data");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Filter effect
    useEffect(() => {
        // Skip first render which is handled by loadInitialData
        if (!sessions.length && !allQueues.length && isLoading) return;

        const fetchFiltered = async () => {
            const data = await api.getOverview(
                selectedSessionId || undefined,
                selectedQueueId || undefined
            );
            setOverview(data);
        };
        fetchFiltered().catch(err => console.error("Filter error", err));
    }, [selectedSessionId, selectedQueueId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    // Derived queues list based on selected session
    const filteredQueues = useMemo(() => {
        if (!selectedSessionId) return allQueues;
        return allQueues.filter(q => q.session_id === selectedSessionId);
    }, [allQueues, selectedSessionId]);

    // Handle cascading dropdowns
    const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedSessionId(e.target.value);
        // Reset queue if the new session doesn't contain the selected queue
        const newSessionId = e.target.value;
        if (newSessionId && selectedQueueId) {
            const queueExists = allQueues.find(q => q.id === selectedQueueId && q.session_id === newSessionId);
            if (!queueExists) setSelectedQueueId("");
        }
    };

    if (error) {
        return (
            <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
                {error}
                <button onClick={loadInitialData} className="ml-2 underline font-medium">Retry</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Analytics and metrics across your organization.
                    </p>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <select
                        value={selectedSessionId}
                        onChange={handleSessionChange}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white min-w-[160px]"
                        aria-label="Filter by session"
                    >
                        <option value="">All-time Stats</option>
                        {sessions.map(s => (
                            <option key={s.id} value={s.id}>
                                {new Date(s.session_date).toLocaleDateString()} {s.title ? `- ${s.title}` : ""}
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedQueueId}
                        onChange={(e) => setSelectedQueueId(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white min-w-[140px]"
                        aria-label="Filter by queue"
                    >
                        <option value="">All Services</option>
                        {filteredQueues.map(q => (
                            <option key={q.id} value={q.id}>
                                {q.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {isLoading && !overview ? (
                <div className="text-center py-20">
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
                    <p className="mt-4 text-sm text-gray-500">Loading metrics...</p>
                </div>
            ) : overview ? (
                <>
                    {/* STATS ROW 1: Status Counts */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <p className="text-sm font-semibold text-gray-500 mb-1">Total Visits</p>
                            <p className="text-3xl font-bold text-gray-900">{overview.status_counts.total}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <p className="text-sm font-semibold text-gray-500 mb-1">Served</p>
                            <p className="text-3xl font-bold text-emerald-600">{overview.status_counts.served}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <p className="text-sm font-semibold text-gray-500 mb-1">Waiting</p>
                            <p className="text-3xl font-bold text-amber-500">{overview.status_counts.waiting}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <p className="text-sm font-semibold text-gray-500 mb-1">Cancelled</p>
                            <p className="text-3xl font-bold text-gray-400">{overview.status_counts.cancelled}</p>
                        </div>
                    </div>

                    {/* STATS ROW 2: Timings */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 p-5 shadow-sm">
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Avg Waiting Time</p>
                            <p className="text-xl font-bold text-gray-900">{overview.timings.avg_waiting_time}</p>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 p-5 shadow-sm">
                            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Avg Served Time</p>
                            <p className="text-xl font-bold text-gray-900">{overview.timings.avg_served_time}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Max Waiting Time</p>
                            <p className="text-xl font-bold text-gray-700">{overview.timings.max_waiting_time}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Max Served Time</p>
                            <p className="text-xl font-bold text-gray-700">{overview.timings.max_served_time}</p>
                        </div>
                    </div>

                    {/* CHARTS */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Hourly Volume */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col">
                            <h3 className="text-md font-bold text-gray-900 mb-6">Hourly Visits</h3>
                            {overview.charts.hourly.length > 0 ? (
                                <div className="w-full h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={overview.charts.hourly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis
                                                dataKey="hour"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                            />
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="visits"
                                                stroke="#2563EB"
                                                strokeWidth={3}
                                                dot={{ r: 4, strokeWidth: 2 }}
                                                activeDot={{ r: 6 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-sm text-gray-400 py-10">
                                    No hourly data available
                                </div>
                            )}
                        </div>

                        {/* Monthly Volume */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col">
                            <h3 className="text-md font-bold text-gray-900 mb-6">Monthly Visits</h3>
                            {overview.charts.monthly.length > 0 ? (
                                <div className="w-full h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={overview.charts.monthly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis
                                                dataKey="month"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                            />
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                cursor={{ fill: '#F3F4F6' }}
                                            />
                                            <Bar
                                                dataKey="visits"
                                                fill="#6366F1"
                                                radius={[4, 4, 0, 0]}
                                                barSize={40}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                                    No monthly data available
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RECENT ACTIVITY (Click for Details) */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <h3 className="text-md font-bold text-gray-900 mb-4">Recent Activity</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="pb-3 font-semibold text-gray-600">Token</th>
                                        <th className="pb-3 font-semibold text-gray-600">Queue</th>
                                        <th className="pb-3 font-semibold text-gray-600">Status</th>
                                        <th className="pb-3 font-semibold text-gray-600">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {overview.recent_activity.map((act: { number: number; status: string; queue: string; time: string }, idx: number) => {
                                        const qInfo = allQueues.find(q => q.name === act.queue);
                                        return (
                                            <tr key={idx} className="hover:bg-gray-50/50">
                                                <td className="py-3 font-medium">#{act.number}</td>
                                                <td className="py-3">
                                                    {qInfo ? (
                                                        <Link href={`/dashboard/queues/${qInfo.id}`} className="text-blue-600 hover:underline">
                                                            {act.queue}
                                                        </Link>
                                                    ) : act.queue}
                                                </td>
                                                <td className="py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${act.status === 'done' ? 'bg-emerald-100 text-emerald-700' :
                                                        act.status === 'waiting' ? 'bg-amber-100 text-amber-700' :
                                                            act.status === 'serving' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {act.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-gray-500">
                                                    {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {overview.recent_activity.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-6 text-center text-gray-400 italic">No recent activity</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Quick Info Alerts / Help */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p className="text-sm font-medium text-blue-900">
                            Manage your <Link href="/dashboard/sessions" className="underline font-bold">Sessions</Link> or <Link href="/dashboard/staff" className="underline font-bold">Staff</Link> for full control.
                        </p>
                    </div>
                </>
            ) : null}
        </div>
    );
}

