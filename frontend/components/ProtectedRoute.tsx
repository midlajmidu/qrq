"use client";

import { useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && !isLoading && !isAuthenticated) {
            router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
    }, [mounted, isAuthenticated, isLoading, router, pathname]);

    if (!mounted || isLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return <>{children}</>;
}
