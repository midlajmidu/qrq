"use client";

import React from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { QueueResponse } from "@/types/api";
import ConfirmModal from "@/components/ConfirmModal";

interface Props {
    queue: QueueResponse;
    onToggled: () => void;
}

const QueueCard = React.memo(function QueueCard({ queue, onToggled }: Props) {
    const [toggling, setToggling] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [err, setErr] = React.useState<string | null>(null);

    const handleToggle = async () => {
        setToggling(true);
        setErr(null);
        try {
            await api.toggleQueue(queue.id, !queue.is_active);
            onToggled();
        } catch (e: unknown) {
            if (e instanceof ApiError) setErr(e.detail);
            else setErr("Failed to toggle queue");
        } finally {
            setToggling(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        setErr(null);
        try {
            await api.deleteQueue(queue.id);
            onToggled(); // Refresh the list
        } catch (e: unknown) {
            if (e instanceof ApiError) setErr(e.detail);
            else setErr("Failed to delete queue");
            setShowDeleteConfirm(false);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-900 truncate">{queue.name}</h3>
                    <span className={`shrink-0 ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${queue.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {queue.is_active ? "Active" : "Inactive"}
                    </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-50 rounded-lg py-2">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Prefix</p>
                        <p className="text-lg font-bold text-gray-900">{queue.prefix}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg py-2">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Serving</p>
                        <p className="text-lg font-bold text-blue-600">{queue.current_token_number}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg py-2">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Status</p>
                        <p className="text-lg font-bold text-gray-900">{queue.is_active ? "Open" : "Closed"}</p>
                    </div>
                </div>

                {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
            </div>

            <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-3 flex items-center gap-2">
                <Link
                    href={`/dashboard/queues/${queue.id}`}
                    className="flex-1 text-center text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 py-1.5 rounded-lg transition-colors"
                >
                    Manage
                </Link>
                <button
                    onClick={handleToggle}
                    disabled={toggling || deleting}
                    className={`flex-1 text-center text-sm font-medium py-1.5 rounded-lg transition-colors disabled:opacity-50 ${queue.is_active ? "text-amber-700 bg-amber-50 hover:bg-amber-100" : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"}`}
                >
                    {toggling ? "..." : queue.is_active ? "Pause" : "Activate"}
                </button>
                <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={toggling || deleting}
                    className="flex text-center justify-center items-center text-sm font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-red-700 bg-red-50 hover:bg-red-100"
                    aria-label="Delete Queue"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Delete Queue"
                message={`Are you sure you want to permanently delete the queue "${queue.name}"? All associated tokens and data will be lost forever.`}
                confirmLabel="Delete"
                confirmVariant="danger"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                isLoading={deleting}
            />
        </div>
    );
});

export default QueueCard;
