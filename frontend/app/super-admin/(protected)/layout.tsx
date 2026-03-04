import { ReactNode } from "react";
import SuperAdminRoute from "@/components/SuperAdminRoute";
import Header from "@/components/Header";

export default function SuperAdminProtectedLayout({ children }: { children: ReactNode }) {
    return (
        <SuperAdminRoute>
            <div className="min-h-screen bg-slate-900 flex flex-col">
                <Header />
                <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
                    {children}
                </main>
            </div>
        </SuperAdminRoute>
    );
}
