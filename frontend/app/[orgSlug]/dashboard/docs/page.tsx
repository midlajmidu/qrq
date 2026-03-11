"use client";

import React, { useState } from "react";

const DOCS_SECTIONS = [
    {
        id: "getting-started",
        title: "Getting Started",
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        ),
        color: "text-amber-500",
        bg: "bg-amber-50",
        content: (
            <div className="space-y-4">
                <p>Welcome to <strong>Q4Queue</strong>! Our platform is designed to make service management seamless and efficient. To get started, you&apos;ll first want to create a service queue.</p>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                    <h4 className="font-bold text-slate-900 mb-2">The Quick Start Flow:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
                        <li>Navigate to <strong>Manage Queues</strong> in the sidebar.</li>
                        <li>Click <strong>&quot;New Queue&quot;</strong> and give your service a name (e.g., &quot;Consultation Room A&quot;).</li>
                        <li>Set a unique <strong>Prefix</strong> (e.g., &quot;MED&quot; or &quot;SERV&quot;) to identify your tokens.</li>
                        <li>Activate your queue to start accepting digital joiners.</li>
                    </ol>
                </div>
            </div>
        )
    },
    {
        id: "queue-management",
        title: "Queue Management",
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
        ),
        color: "text-blue-500",
        bg: "bg-blue-50",
        content: (
            <div className="space-y-4">
                <p>Queues are the core of the system. Each queue operates independently with its own token counter and status.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-blue-100 bg-white">
                        <span className="font-bold text-blue-900 block mb-1">Active State</span>
                        <p className="text-sm text-slate-500">Only active queues appear on public joining pages. You can toggle this any time for maintenance.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-blue-100 bg-white">
                        <span className="font-bold text-blue-900 block mb-1">Auto-Resets</span>
                        <p className="text-sm text-slate-500">Resetting a queue clears all active tokens and restarts numbering from #1. Perfect for new shifts.</p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "token-flow",
        title: "Token Lifecycle",
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
        ),
        color: "text-indigo-500",
        bg: "bg-indigo-50",
        content: (
            <div className="space-y-4">
                <p>Tokens move through various statuses as they are processed by your staff.</p>
                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="w-20 flex-shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Waiting</div>
                        <p className="text-sm text-slate-600">Initial state when a customer joins. They are visible in the queue management list.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-20 flex-shrink-0 text-[10px] font-black uppercase tracking-widest text-blue-500 mt-1">Serving</div>
                        <p className="text-sm text-slate-600">The customer currently being attended to. Their info appears at the top of the dashboard.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-20 flex-shrink-0 text-[10px] font-black uppercase tracking-widest text-green-500 mt-1">Done</div>
                        <p className="text-sm text-slate-600">Service completed. The token is stored for your end-of-day analytics.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-20 flex-shrink-0 text-[10px] font-black uppercase tracking-widest text-red-500 mt-1">Skipped</div>
                        <p className="text-sm text-slate-600">Use this if a customer is not present when called. Keeps the flow moving.</p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "sharing",
        title: "QR & Public Access",
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
        ),
        color: "text-purple-500",
        bg: "bg-purple-50",
        content: (
            <div className="space-y-4">
                <p>Every queue has a <strong>Public QR Code</strong> and a <strong>Digital Display</strong> URL.</p>
                <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 px-2">
                    <li><strong>Customer Join:</strong> Print the QR code so customers can join the queue from their own smartphones.</li>
                    <li><strong>Live Display:</strong> Open the &quot;Display URL&quot; on a large TV or tablet in your waiting room to show live updates.</li>
                </ul>
            </div>
        )
    }
];

export default function DocumentationPage() {
    const [activeSection, setActiveSection] = useState(DOCS_SECTIONS[0].id);

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <header className="relative overflow-hidden bg-slate-900 rounded-3xl p-10 text-white shadow-2xl shadow-slate-200">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="max-w-xl text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                            Knowledge Base
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Documentation</h1>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            Everything you need to know about managing your service flow with <strong>Q4Queue</strong>. Learn best practices and technical details.
                        </p>
                    </div>
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                        <svg className="w-24 h-24 text-blue-500 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                </div>

                {/* Abstract background graphics */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-purple-600/10 blur-[80px] rounded-full" />
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Navigation Sidebar */}
                <nav className="lg:col-span-4 sticky top-24">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 space-y-1">
                        {DOCS_SECTIONS.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left ${activeSection === section.id
                                    ? `${section.bg} ${section.color} shadow-sm font-bold ring-1 ring-inset ring-current/10`
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                    }`}
                            >
                                <span className={activeSection === section.id ? "scale-110 transition-transform" : "opacity-70"}>
                                    {section.icon}
                                </span>
                                <span className="text-sm">{section.title}</span>
                                {activeSection === section.id && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-current" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="mt-6 p-6 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-dashed border-slate-200">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Community</h4>
                        <p className="text-sm text-slate-600 mb-4 italic">&quot;Q4Queue has reduced our patient wait anxiety by 40%.&quot;</p>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">DR</div>
                            <span className="text-xs font-medium text-slate-500">Dr. Sarah Jensen</span>
                        </div>
                    </div>
                </nav>

                {/* Content Area */}
                <main className="lg:col-span-8">
                    {DOCS_SECTIONS.map((section) => (
                        <div
                            key={section.id}
                            className={`transition-all duration-500 ${activeSection === section.id ? "opacity-100 translate-y-0" : "sr-only opacity-0 translate-y-4"}`}
                        >
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8 md:p-12 overflow-hidden relative">
                                {/* Large faint icon in background */}
                                <div className={`absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 p-12 ${section.color} opacity-[0.03] scale-[3] pointer-events-none`}>
                                    {section.icon}
                                </div>

                                <div className="relative z-10">
                                    <header className="flex items-center gap-4 mb-8">
                                        <div className={`${section.bg} ${section.color} p-4 rounded-2xl shadow-inner`}>
                                            {section.icon}
                                        </div>
                                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{section.title}</h2>
                                    </header>

                                    <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
                                        {section.content}
                                    </div>

                                    <footer className="mt-12 pt-8 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className={`w-8 h-8 rounded-full border-2 border-white ring-1 ring-slate-100 ${section.bg} flex items-center justify-center text-[10px] ${section.color} font-bold`}>
                                                    U{i}
                                                </div>
                                            ))}
                                            <div className="pl-4 text-xs text-slate-400 self-center">Updated 2 days ago</div>
                                        </div>
                                        <button className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest flex items-center gap-1 group">
                                            Share Section
                                            <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                        </button>
                                    </footer>
                                </div>
                            </div>
                        </div>
                    ))}
                </main>
            </div>
        </div>
    );
}
