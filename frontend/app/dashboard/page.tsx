"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { QueueResponse, PaginatedStaffResponse } from "@/types/api";
import Link from "next/link";

export default function DashboardOverviewPage() {
    const [queues, setQueues] = useState<QueueResponse[]>([]);
    const [staff, setStaff] = useState<PaginatedStaffResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [queuesData, staffData] = await Promise.all([
                api.listQueues(),
                api.listStaff({ limit: 1 })
            ]);
            setQueues(queuesData);
            setStaff(staffData);
            setError(null);
        } catch (err: unknown) {
            setError("Failed to load overview data");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        const timer = setInterval(loadData, 10000); // Poll every 10s
        return () => clearInterval(timer);
    }, [loadData]);

    const stats = [
        {
            name: "Total Queues",
            value: queues.length,
            icon: (
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
            color: "bg-blue-50",
            link: "/dashboard/queues"
        },
        {
            name: "Active Queues",
            value: queues.filter(q => q.is_active).length,
            icon: (
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: "bg-green-50",
            link: "/dashboard/queues"
        },
        {
            name: "Total Staff",
            value: staff?.total || 0,
            icon: (
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            color: "bg-purple-50",
            link: "/dashboard/staff"
        }
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Overview</h1>
                <p className="mt-2 text-gray-500">Welcome back. Here's what's happening across your clinics today.</p>
            </div>

            {error && (
                <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {error}
                    </span>
                    <button onClick={loadData} className="font-bold underline">Retry</button>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat) => (
                    <Link
                        key={stat.name}
                        href={stat.link}
                        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group"
                    >
                        <div className="flex items-center justify-between">
                            <div className={`${stat.color} p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                                {stat.icon}
                            </div>
                            <svg className="w-5 h-5 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                        <div className="mt-4">
                            <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity or Active Queues list */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                        <h2 className="font-bold text-gray-900">Active Queues</h2>
                        <Link href="/dashboard/queues" className="text-sm font-semibold text-blue-600 hover:text-blue-700">View all</Link>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {queues.filter(q => q.is_active).slice(0, 5).map(queue => (
                            <div key={queue.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-700 font-bold">
                                        {queue.prefix}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{queue.name}</p>
                                        <p className="text-xs text-gray-500">ID: {queue.id.slice(0, 8)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-900">#{queue.current_token_number}</p>
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Current</p>
                                </div>
                            </div>
                        ))}
                        {queues.filter(q => q.is_active).length === 0 && (
                            <div className="px-6 py-12 text-center">
                                <p className="text-gray-400 text-sm">No active queues right now.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg shadow-blue-200">
                        <h2 className="text-xl font-bold mb-2">Need help?</h2>
                        <p className="text-blue-100 text-sm mb-6 leading-relaxed">Check out our documentation to learn how to optimize your patient flow and reduce wait times.</p>
                        <Link href="/dashboard/docs" className="inline-block bg-white text-blue-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors">
                            Documentation
                        </Link>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h2 className="font-bold text-gray-900 mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <Link
                                href="/dashboard/queues"
                                className="flex flex-col items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-center"
                            >
                                <div className="w-10 h-10 bg-white shadow-sm rounded-lg flex items-center justify-center text-blue-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <span className="text-xs font-bold text-gray-700">Add Queue</span>
                            </Link>
                            <Link
                                href="/dashboard/staff"
                                className="flex flex-col items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-center"
                            >
                                <div className="w-10 h-10 bg-white shadow-sm rounded-lg flex items-center justify-center text-purple-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                    </svg>
                                </div>
                                <span className="text-xs font-bold text-gray-700">Add Staff</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
