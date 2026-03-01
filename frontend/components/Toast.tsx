"use client";

import { useState, useCallback, createContext, useContext, ReactNode } from "react";

// ── Types ────────────────────────────────────────────────────────
type ToastVariant = "success" | "error" | "info" | "warning";

interface Toast {
    id: number;
    message: string;
    variant: ToastVariant;
}

interface ToastContextValue {
    toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => { } });

export function useToast() {
    return useContext(ToastContext);
}

// ── Variant styles ───────────────────────────────────────────────
const variantClasses: Record<ToastVariant, string> = {
    success: "bg-emerald-600 text-white",
    error: "bg-red-600 text-white",
    info: "bg-blue-600 text-white",
    warning: "bg-amber-500 text-white",
};

// ── Provider ─────────────────────────────────────────────────────
let _id = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, variant: ToastVariant = "success") => {
        const id = ++_id;
        setToasts((prev) => [...prev.slice(-4), { id, message, variant }]); // max 5
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
    }, []);

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            {children}

            {/* Toast container — fixed bottom right */}
            <div
                aria-live="polite"
                aria-atomic="true"
                className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-full"
            >
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        role="status"
                        className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${variantClasses[t.variant]} animate-in slide-in-from-bottom-2 fade-in duration-200`}
                    >
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
