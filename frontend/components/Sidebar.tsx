"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function Sidebar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const isAdmin = user?.role === "admin";

    const navLinkCls = (href: string) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
            ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        }`;

    const iconCls = (href: string) =>
        `w-5 h-5 transition-colors ${pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
            ? "text-white"
            : "text-gray-400 group-hover:text-gray-600"
        }`;

    return (
        <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-hidden shadow-sm">
            {/* Logo Section */}
            <div className="p-6 border-b border-gray-100">
                <Link href="/dashboard" className="flex items-center gap-3 group focus:outline-none">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-100 group-hover:scale-105 transition-transform" aria-hidden="true">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-black tracking-tight text-gray-900 leading-none">qrq</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Queue Manager</span>
                    </div>
                </Link>
            </div>

            {/* Navigation Section */}
            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto" aria-label="Main Navigation">
                <Link href="/dashboard" className={`${navLinkCls("/dashboard")} group`}>
                    <svg className={iconCls("/dashboard")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>Queues</span>
                </Link>

                {isAdmin && (
                    <>
                        <Link href="/dashboard/staff" className={`${navLinkCls("/dashboard/staff")} group`}>
                            <svg className={iconCls("/dashboard/staff")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Staff</span>
                        </Link>
                        <Link href="/dashboard/settings" className={`${navLinkCls("/dashboard/settings")} group`}>
                            <svg className={iconCls("/dashboard/settings")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Settings</span>
                        </Link>
                    </>
                )}
            </nav>

            {/* Bottom Section */}
            <div className="p-4 border-top bg-gray-50/50">
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold">
                            {user?.email?.[0].toUpperCase() || "U"}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-gray-900 truncate">{user?.email || "User"}</span>
                            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{user?.role}</span>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="mb-4 px-1">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Organization Email</p>
                            <p className="text-[11px] text-gray-600 truncate font-medium">{user?.email}</p>
                        </div>
                    )}

                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-red-200"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </div>
        </aside>
    );
}
