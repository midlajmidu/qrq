"use client";

import React, { useState, useRef, useEffect } from "react";
import { api, ApiError } from "@/lib/api";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;  // trigger queue list refresh
}

export default function CreateQueueModal({ isOpen, onClose, onCreated }: Props) {
    const [name, setName] = useState("");
    const [prefix, setPrefix] = useState("A");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setName("");
            setPrefix("A");
            setError(null);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape" && isOpen) onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);
        setError(null);
        try {
            await api.createQueue({ name: name.trim(), prefix: prefix.trim() || "A" });
            onCreated();
            onClose();
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setError(err.detail);
            } else {
                setError("Failed to create queue. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Queue</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Queue Name</label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. General Consultation"
                            required
                            maxLength={150}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Token Prefix</label>
                        <input
                            type="text"
                            value={prefix}
                            onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                            placeholder="A"
                            maxLength={10}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            disabled={isLoading}
                        />
                        <p className="mt-1 text-xs text-gray-500">Appears before token numbers, e.g. A1, A2, B1...</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 justify-end pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !name.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Creating..." : "Create Queue"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
