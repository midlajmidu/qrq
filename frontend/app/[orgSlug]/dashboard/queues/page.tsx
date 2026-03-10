"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function QueuesRedirect() {
    const router = useRouter();
    const { user } = useAuth();

    useEffect(() => {
        const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";
        router.replace(`${dashBase}/sessions`);
    }, [user, router]);

    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500 font-medium">Redirecting to Sessions...</p>
            </div>
        </div>
    );
}
