"use client";

import React, { useEffect, useRef, useCallback } from "react";

interface Props {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: "danger" | "primary";
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmLabel = "Confirm",
    confirmVariant = "danger",
    onConfirm,
    onCancel,
    isLoading = false,
}: Props) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);

    // Auto-focus cancel button when opened
    useEffect(() => {
        if (isOpen) {
            // Small delay to ensure DOM is ready
            const timer = setTimeout(() => cancelRef.current?.focus(), 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") onCancel();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, onCancel]);

    // Focus trap: Tab cycles only within modal
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key !== "Tab" || !dialogRef.current) return;

        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
            "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }, []);

    if (!isOpen) return null;

    const btnColor = confirmVariant === "danger"
        ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
        : "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-message"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />

            {/* Panel */}
            <div
                ref={dialogRef}
                onKeyDown={handleKeyDown}
                className="relative bg-white rounded-xl shadow-2xl max-w-sm w-full p-6"
            >
                <h3 id="modal-title" className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p id="modal-message" className="text-sm text-gray-600 mb-6">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button
                        ref={cancelRef}
                        onClick={onCancel}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        aria-label="Cancel"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 ${btnColor}`}
                        aria-label={confirmLabel}
                    >
                        {isLoading ? "Processing..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
