"use client";

import { useEffect, ReactNode } from "react";
import { ToastProvider } from "@/components/Toast";
import { initGlobalErrorHandlers } from "@/lib/logger";

export default function ClientProviders({ children }: { children: ReactNode }) {
    useEffect(() => {
        initGlobalErrorHandlers();
    }, []);

    return (
        <ToastProvider>
            {children}
        </ToastProvider>
    );
}
