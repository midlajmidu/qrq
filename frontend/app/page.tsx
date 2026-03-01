"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-200">
          <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
          qrq
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-lg mx-auto leading-relaxed">
          Real-time queue management for modern clinics, hospitals, and service counters.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Go to Dashboard →
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
