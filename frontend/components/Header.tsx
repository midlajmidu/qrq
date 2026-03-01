"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function Header() {
    const { user, logout } = useAuth();

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30" role="banner">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
                <div className="flex justify-between h-16 items-center">
                    <Link href="/dashboard" className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1 -ml-1" aria-label="qrq Dashboard">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center" aria-hidden="true">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <span className="text-lg font-bold tracking-tight text-gray-900">qrq</span>
                    </Link>

                    <div className="flex items-center gap-4">
                        {user && (
                            <span className="text-sm text-gray-500 hidden sm:block" aria-label={`Role: ${user.role}`}>
                                <span className="font-medium text-gray-700">{user.role}</span>
                            </span>
                        )}
                        <button
                            onClick={logout}
                            aria-label="Sign out"
                            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </nav>
        </header>
    );
}
