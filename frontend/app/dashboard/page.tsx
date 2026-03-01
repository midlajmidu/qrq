"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { QueueResponse } from "@/types/api";
import QueueCard from "@/components/QueueCard";
import CreateQueueModal from "@/components/CreateQueueModal";

export default function DashboardPage() {
    const [queues, setQueues] = useState<QueueResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const loadQueues = useCallback(async () => {
        try {
            const data = await api.listQueues();
            setQueues(data);
            setError(null);
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Failed to load queues");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadQueues();
    }, [loadQueues]);

    return (
        <div className="space-y-6">
            {/* Title row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Your Queues</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Create, manage, and monitor all your service lines.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    aria-label="Create new queue"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    New Queue
                </button>
            </div>

            {/* Error */}
            {error && (
                <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-sm">
                    {error}
                    <button onClick={loadQueues} className="ml-2 underline font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded" aria-label="Retry loading queues">Retry</button>
                </div>
            )}

            {/* Loading */}
            {isLoading ? (
                <div className="text-center py-20" role="status" aria-label="Loading queues">
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto" aria-hidden="true" />
                    <p className="mt-4 text-sm text-gray-500">Loading queues...</p>
                </div>
            ) : queues.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 text-center py-16 px-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">No queues yet</h3>
                    <p className="text-sm text-gray-500 mb-6">Create your first service queue to start managing customers.</p>
                    <button
                        onClick={() => setShowCreate(true)}
                        aria-label="Create first queue"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Create First Queue
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-label="Queue list">
                    {queues.map((q) => (
                        <div key={q.id} role="listitem">
                            <QueueCard queue={q} onToggled={loadQueues} />
                        </div>
                    ))}
                </div>
            )}

            <CreateQueueModal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                onCreated={loadQueues}
            />
        </div>
    );
}
