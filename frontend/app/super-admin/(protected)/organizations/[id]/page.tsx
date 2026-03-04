"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { OrgDetailExtended } from "@/types/api";

function Stat({ label, value, icon }: { label: string; value: string | number; icon: string }) {
    return (
        <div className="bg-slate-900/60 rounded-xl border border-slate-700/50 p-4 flex items-center gap-4">
            <div className="w-9 h-9 bg-violet-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4.5 h-4.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
                </svg>
            </div>
            <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
                <p className="text-lg font-bold text-white">{value}</p>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="py-3 flex items-start gap-4 border-b border-slate-700/40 last:border-0">
            <span className="text-sm text-slate-500 w-36 flex-shrink-0 pt-0.5">{label}</span>
            <span className="text-sm text-white font-medium break-all">{children}</span>
        </div>
    );
}

function SkeletonDetail() {
    return (
        <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700 rounded w-56" />
            <div className="h-4 bg-slate-700 rounded w-40" />
            <div className="grid grid-cols-2 gap-4 mt-6">
                {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-700 rounded-xl" />)}
            </div>
        </div>
    );
}

export default function OrgDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orgId = params.id as string;

    const [org, setOrg] = useState<OrgDetailExtended | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!orgId) return;
        setLoading(true);
        api.getOrganizationDetail(orgId)
            .then(setOrg)
            .catch(err => setError(err instanceof ApiError ? err.detail : "Failed to load organization."))
            .finally(() => setLoading(false));
    }, [orgId]);

    const fmt = (iso: string) => new Date(iso).toLocaleString("en-US", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });

    return (
        <div className="max-w-2xl space-y-6">
            {/* Back */}
            <button
                onClick={() => router.push("/super-admin")}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
            >
                <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Organizations
            </button>

            {loading && <SkeletonDetail />}

            {error && (
                <div role="alert" className="bg-red-500/10 text-red-400 p-4 rounded-xl border border-red-500/20">
                    {error}
                </div>
            )}

            {org && !loading && (
                <>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white">{org.name}</h1>
                            <p className="text-sm font-mono text-slate-400 mt-0.5">{org.slug}</p>
                        </div>
                        <span className={`mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold flex-shrink-0 ${org.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                            <span className={`w-2 h-2 rounded-full ${org.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
                            {org.is_active ? "Active" : "Inactive"}
                        </span>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <Stat label="Total Users" value={org.total_users}
                            icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <Stat label="Admin Users" value={org.total_admins}
                            icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                    </div>

                    {/* Detail card */}
                    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-xl">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Organization Details</h2>
                        <div className="divide-y divide-slate-700/40">
                            <Field label="ID"><span className="font-mono text-xs text-slate-300">{org.id}</span></Field>
                            <Field label="Name">{org.name}</Field>
                            <Field label="Slug"><span className="font-mono text-violet-400">{org.slug}</span></Field>
                            <Field label="Status">
                                <span className={org.is_active ? "text-emerald-400" : "text-red-400"}>
                                    {org.is_active ? "Active" : "Inactive"}
                                </span>
                            </Field>
                            <Field label="Created">{fmt(org.created_at)}</Field>
                            <Field label="Total Users">{org.total_users}</Field>
                            <Field label="Admin Users">{org.total_admins}</Field>
                            <Field label="Regular Users">{org.total_users - org.total_admins}</Field>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push("/super-admin")}
                            className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
                        >
                            ← Back to List
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
