"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api, ApiError } from "@/lib/api";
import type { SessionResponse } from "@/types/api";
import Link from "next/link";

export default function SessionsPage() {
    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Create modal state
    const [showCreate, setShowCreate] = useState(false);
    const [newDate, setNewDate] = useState("");
    const [newTitle, setNewTitle] = useState("");
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const dateRef = useRef<HTMLInputElement>(null);

    // Delete confirm state
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const loadSessions = useCallback(async () => {
        try {
            const data = await api.listSessions();
            setSessions(data);
            setError(null);
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Failed to load sessions");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    useEffect(() => {
        if (showCreate) {
            setNewDate("");
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
            await api.createSession({
                session_date: newDate,
                title: newTitle.trim() || undefined,
            });
            setShowCreate(false);
            loadSessions();
        } catch (err: unknown) {
            if (err instanceof ApiError) setCreateError(err.detail);
            else setCreateError("Failed to create session");
        } finally {
            setCreateLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeleteLoading(true);
        try {
            await api.deleteSession(id);
            setDeleteId(null);
            loadSessions();
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
        } finally {
            setDeleteLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("en-US", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const isToday = (dateStr: string) => {
        const today = new Date().toISOString().split("T")[0];
        return dateStr === today;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manage Sessions</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Create sessions for each date, then add queues inside them.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    aria-label="Create new session"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    New Session
                </button>
            </div>

            {/* Error */}
            {error && (
                <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-sm">
                    {error}
                    <button onClick={loadSessions} className="ml-2 underline font-medium">Retry</button>
                </div>
            )}

            {/* Loading */}
            {isLoading ? (
                <div className="text-center py-20" role="status">
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
                    <p className="mt-4 text-sm text-gray-500">Loading sessions...</p>
                </div>
            ) : sessions.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 text-center py-16 px-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">No sessions yet</h3>
                    <p className="text-sm text-gray-500 mb-6">Create your first session to start managing queues by date.</p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Create First Session
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-label="Session list">
                    {sessions.map((s) => (
                        <div
                            key={s.id}
                            role="listitem"
                            className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${isToday(s.session_date) ? "border-blue-300 ring-2 ring-blue-100" : "border-gray-200"
                                }`}
                        >
                            {/* Card Header */}
                            <div className={`px-5 py-4 ${isToday(s.session_date) ? "bg-blue-50" : "bg-gray-50"} border-b border-gray-100`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isToday(s.session_date) ? "bg-blue-600" : "bg-gray-700"}`}>
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold text-gray-900 truncate">
                                            {formatDate(s.session_date)}
                                        </h3>
                                        {isToday(s.session_date) && (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full mt-0.5">
                                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                                Today
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="px-5 py-4">
                                {s.title && (
                                    <p className="text-sm text-gray-600 mb-3 truncate">{s.title}</p>
                                )}
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <span className="font-medium">
                                        {s.queue_count} {s.queue_count === 1 ? "Queue" : "Queues"}
                                    </span>
                                </div>
                            </div>

                            {/* Card Actions */}
                            <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
                                <Link
                                    href={`/dashboard/sessions/${s.id}/queues`}
                                    className="flex-1 text-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                >
                                    Manage
                                </Link>
                                {deleteId === s.id ? (
                                    <div className="flex flex-col gap-2 min-w-[140px]">
                                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-tight leading-tight">
                                            Delete session? All queues & tokens will be lost.
                                        </p>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleDelete(s.id)}
                                                disabled={deleteLoading}
                                                className="flex-1 px-3 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {deleteLoading ? "..." : "Confirm"}
                                            </button>
                                            <button
                                                onClick={() => setDeleteId(null)}
                                                className="flex-1 px-3 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setDeleteId(s.id)}
                                        className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Session Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
                    <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Session</h3>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input
                                    ref={dateRef}
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    disabled={createLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="e.g. Morning Clinic"
                                    maxLength={200}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    disabled={createLoading}
                                />
                            </div>

                            {createError && (
                                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
                                    {createError}
                                </div>
                            )}

                            <div className="flex gap-3 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    disabled={createLoading}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading || !newDate}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
