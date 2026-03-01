"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export default function LoginPage() {
    const { login, isLoading, error } = useAuth();
    const [orgSlug, setOrgSlug] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login({ organization_slug: orgSlug, email, password });
        } catch {
            // Error is handled in useAuth hook
        }
    }, [login, orgSlug, email, password]);

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1" aria-label="Go to home page">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center" aria-hidden="true">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 mt-4">Sign in to qrq</h1>
                    <p className="text-sm text-gray-500 mt-1">Enter your credentials to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4" noValidate>
                    {error && (
                        <div role="alert" className="bg-red-50 text-red-700 text-sm font-medium p-3 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="org-slug" className="block text-sm font-medium text-gray-700 mb-1">Organization Slug</label>
                        <input
                            id="org-slug"
                            type="text"
                            value={orgSlug}
                            onChange={(e) => setOrgSlug(e.target.value)}
                            placeholder="your-org"
                            required
                            autoComplete="organization"
                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@clinic.com"
                            required
                            autoComplete="email"
                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                            disabled={isLoading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !orgSlug || !email || !password}
                        aria-label="Sign in"
                        className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                                Signing in...
                            </span>
                        ) : (
                            "Sign in"
                        )}
                    </button>
                </form>
            </div>
        </main>
    );
}
