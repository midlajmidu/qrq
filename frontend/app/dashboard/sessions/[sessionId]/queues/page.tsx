"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { api, ApiError } from "@/lib/api";
import type { QueueResponse, SessionResponse } from "@/types/api";
import QueueCard from "@/components/QueueCard";
import Link from "next/link";

interface Props {
    params: Promise<{ sessionId: string }>;
}

export default function SessionQueuesPage({ params }: Props) {
    const { sessionId } = use(params);
    const [session, setSession] = useState<SessionResponse | null>(null);
    const [queues, setQueues] = useState<QueueResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Create modal
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPrefix, setNewPrefix] = useState("A");
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const nameRef = useRef<HTMLInputElement>(null);

    const loadData = useCallback(async () => {
        try {
            const [sessionData, queueData] = await Promise.all([
                api.getSession(sessionId),
                api.listSessionQueues(sessionId),
            ]);
            setSession(sessionData);
            setQueues(queueData);
            setError(null);
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Failed to load session data");
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (showCreate) {
            setNewName("");
            setNewPrefix("A");
            setCreateError(null);
            setTimeout(() => nameRef.current?.focus(), 100);
        }
    }, [showCreate]);

    // Close modal on Escape
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape" && showCreate) setShowCreate(false);
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [showCreate]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        setCreateLoading(true);
        setCreateError(null);
        try {
            await api.createSessionQueue(sessionId, {
                name: newName.trim(),
                prefix: newPrefix.trim() || "A",
            });
            setShowCreate(false);
            loadData();
        } catch (err: unknown) {
            if (err instanceof ApiError) setCreateError(err.detail);
            else setCreateError("Failed to create queue");
        } finally {
            setCreateLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    return (
        <div className="space-y-6">
            {/* Breadcrumb + Header */}
            <div>
                <Link
                    href="/dashboard/sessions"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Sessions
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {session ? formatDate(session.session_date) : "Session Queues"}
                        </h1>
                        {session?.title && (
                            <p className="mt-1 text-sm text-gray-500">{session.title}</p>
                        )}
                        {!session?.title && (
                            <p className="mt-1 text-sm text-gray-500">Manage queues for this session.</p>
                        )}
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        New Queue
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-sm">
                    {error}
                    <button onClick={loadData} className="ml-2 underline font-medium">Retry</button>
                </div>
            )}

            {/* Loading */}
            {isLoading ? (
                <div className="text-center py-20" role="status">
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
                    <p className="mt-4 text-sm text-gray-500">Loading queues...</p>
                </div>
            ) : queues.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 text-center py-16 px-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">No queues yet</h3>
                    <p className="text-sm text-gray-500 mb-6">Add your first queue to this session.</p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Create First Queue
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-label="Queue list">
                    {queues.map((q) => (
                        <div key={q.id} role="listitem">
                            <QueueCard queue={q} onToggled={loadData} />
                        </div>
                    ))}
                </div>
            )}

            {/* Create Queue Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
                    <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Queue</h3>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Queue Name</label>
                                <input
                                    ref={nameRef}
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. Doctor A, Lab Test"
                                    required
                                    maxLength={150}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    disabled={createLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Token Prefix</label>
                                <input
                                    type="text"
                                    value={newPrefix}
                                    onChange={(e) => setNewPrefix(e.target.value.toUpperCase())}
                                    placeholder="A"
                                    maxLength={10}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    disabled={createLoading}
                                />
                                <p className="mt-1 text-xs text-gray-500">Appears before token numbers, e.g. A1, A2, B1...</p>
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
                                    disabled={createLoading || !newName.trim()}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {createLoading ? "Creating..." : "Create Queue"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
