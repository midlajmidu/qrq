import { ReactNode } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 flex">
                <Sidebar />
                <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">
                    {children}
                </main>
            </div>
        </ProtectedRoute>
    );
}
