"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";

/**
 * SuperAdminRoute
 * Renders children only for authenticated super admins.
 * - Not logged in → /super-admin/login
 * - Logged in but not super_admin → /dashboard (regular admin)
 */
export default function SuperAdminRoute({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        setMounted(true);
        const authed = isAuthenticated();

        if (!authed) {
            console.warn("[SuperAdminRoute] Not authenticated, redirecting to login");
            router.replace("/super-admin/login");
            return;
        }

        const user = getCurrentUser();
        if (!user) {
            console.warn("[SuperAdminRoute] Authenticated but no user payload found");
            router.replace("/super-admin/login");
            return;
        }

        if (user.role === "super_admin") {
            setAllowed(true);
        } else {
            console.warn(`[SuperAdminRoute] Unauthorized role: ${user.role}, redirecting to /dashboard`);
            router.replace("/dashboard");
        }
    }, [router]);

    if (!mounted || !allowed) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="w-10 h-10 border-4 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
            </div>
        );
    }

    return <>{children}</>;
}
