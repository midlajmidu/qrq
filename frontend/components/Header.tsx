"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function Header() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const isAdmin = user?.role === "admin";

    const navLinkCls = (href: string) =>
        `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${pathname === href || pathname.startsWith(href + "/")
            ? "bg-blue-50 text-blue-700"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        }`;

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30" role="banner">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
                <div className="flex justify-between h-16 items-center">
                    {/* Logo */}
                    <div className="flex items-center gap-6">
                        <Link href="/dashboard" className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1 -ml-1" aria-label="qrq Dashboard">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center" aria-hidden="true">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <span className="text-lg font-bold tracking-tight text-gray-900">qrq</span>
                        </Link>

                        {/* Navigation links */}
                        <div className="hidden sm:flex items-center gap-1">
                            <Link href="/dashboard" className={navLinkCls("/dashboard")}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                Queues
                            </Link>

                            {isAdmin && (
                                <Link href="/dashboard/staff" className={navLinkCls("/dashboard/staff")}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Staff
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Right side */}
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
