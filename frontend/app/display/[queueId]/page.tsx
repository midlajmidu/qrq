"use client";

import React, { use, useState, useEffect, useCallback, useRef } from "react";
import { useQueueSocket } from "@/hooks/useQueueSocket";
import { playQueueSound } from "@/utils/playSound";
import type { RecentToken } from "@/types/api";

interface PageProps {
    params: Promise<{ queueId: string }>;
}

export default function DisplayQueuePage({ params }: PageProps) {
    const { queueId } = use(params);
    const { state, status } = useQueueSocket(queueId);

    const prefix = state?.prefix || "";
    const serving = state?.current_serving || 0;
    const queueName = state?.queue_name || "Loading...";
    const waiting = state?.waiting_count ?? 0;
    const recentTokens = state?.recent_tokens || [];

    const nextUp = recentTokens
        .filter((t: RecentToken) => t.status === "serving" || t.status === "done")
        .map((t: RecentToken) => t.token_number)
        .slice(0, 5);

    // ── Audio Alert Logic ──
    const [soundEnabled, setSoundEnabled] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const previousServingRef = useRef<number | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const enabled = localStorage.getItem("display_sound_enabled") === "true";
            setSoundEnabled(enabled);

            // Pre-warm the audio context by loading the ringtone
            const audio = new Audio("/sounds/ringtone-you-would-be-glad-to-know.mp3");
            audio.preload = "auto";
            audio.volume = 1.0;
            audioRef.current = audio;
        }
    }, []);

    const handleEnableSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.play().then(() => {
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                }
            }).catch(() => { /* ignore */ });
        }

        localStorage.setItem("display_sound_enabled", "true");
        setSoundEnabled(true);
    }, []);

    useEffect(() => {
        if (!state) return;

        if (state.current_serving !== 0 && previousServingRef.current !== null && state.current_serving !== previousServingRef.current) {
            if (soundEnabled && audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => {/* ignore autoplay block */ });
            }
        }

        if (state.current_serving !== 0) {
            previousServingRef.current = state.current_serving;
        }
    }, [state, soundEnabled]);

    // CSS key-based flash animation
    const servingKey = `serving-${serving}`;

    return (
        <main className="h-screen bg-gray-950 flex flex-col text-white overflow-hidden select-none" aria-label="Queue display">
            {/* Connection & Auth Controls */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-3" aria-live="polite">
                {!soundEnabled && (
                    <button
                        onClick={handleEnableSound}
                        className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                    >
                        Enable Sound
                    </button>
                )}
                <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${status === "connected"
                    ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                    : status === "reconnecting"
                        ? "border-amber-500/30 text-amber-400 bg-amber-500/10 animate-pulse"
                        : "border-red-500/30 text-red-400 bg-red-500/10"
                    }`}>
                    {status === "connected" ? "● Live" : status === "reconnecting" ? "● Reconnecting" : "● Offline"}
                </div>
            </div>

            {/* Queue Name — fixed height */}
            <div className="text-center pt-6 pb-2 shrink-0" style={{ minHeight: "5rem" }}>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white/90 truncate px-8">
                    {queueName}
                </h1>
                {state && !state.is_active && (
                    <p className="mt-1 text-xl font-bold text-red-400 uppercase tracking-widest">
                        Queue Closed
                    </p>
                )}
            </div>

            {/* Main Content — fills remaining space */}
            <div className="flex-1 flex items-center justify-center px-6 lg:px-8 min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 w-full max-w-7xl items-stretch h-full max-h-[80vh]">

                    {/* NOW SERVING — fixed dimensions, no layout shift */}
                    <div className="lg:col-span-3 flex flex-col items-center justify-center relative">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                            <div className="w-[400px] h-[400px] lg:w-[500px] lg:h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
                        </div>

                        <div
                            key={servingKey}
                            className="serving-flash relative bg-gray-900/80 backdrop-blur border-2 border-blue-500/20 rounded-[2rem] lg:rounded-[2.5rem] p-8 sm:p-10 lg:p-14 w-full max-w-2xl text-center"
                            style={{ minHeight: "20rem" }}
                        >
                            <p className="text-blue-400 text-xl md:text-2xl lg:text-3xl font-extrabold uppercase tracking-[0.25em] mb-4 lg:mb-6">
                                Now Serving
                            </p>
                            <div
                                className="text-8xl sm:text-[10rem] lg:text-[14rem] font-black leading-none tabular-nums tracking-tighter text-white"
                                aria-live="assertive"
                                aria-atomic="true"
                                aria-label={`Now serving token ${prefix}${serving}`}
                            >
                                {prefix}{serving}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel */}
                    <div className="lg:col-span-2 flex flex-col gap-4 lg:gap-6 justify-center">
                        {/* Waiting Count */}
                        <div className="bg-gray-900/60 backdrop-blur border border-gray-800/50 rounded-2xl p-4 lg:p-6 text-center shrink-0" style={{ minHeight: "6rem" }}>
                            <p className="text-gray-500 text-xs lg:text-sm font-bold uppercase tracking-widest mb-1 lg:mb-2">Waiting</p>
                            <p className="text-4xl md:text-5xl lg:text-6xl font-black text-white tabular-nums" aria-label={`${waiting} people waiting`}>{waiting}</p>
                        </div>

                        {/* Recent Served */}
                        <div className="bg-gray-900/60 backdrop-blur border border-gray-800/50 rounded-2xl p-4 lg:p-6 overflow-hidden flex-1 min-h-0">
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3 lg:mb-4 text-center">
                                Recently Called
                            </p>
                            {nextUp.length > 0 ? (
                                <div className="space-y-2 overflow-hidden">
                                    {nextUp.map((num, i) => (
                                        <div
                                            key={`${num}-${i}`}
                                            className={`text-center py-2 lg:py-2.5 rounded-xl text-xl md:text-2xl lg:text-3xl font-bold tabular-nums ${i === 0
                                                ? "bg-blue-600/20 text-blue-300 border border-blue-500/20"
                                                : "bg-gray-800/50 text-gray-400"
                                                }`}
                                        >
                                            {prefix}{num}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-600 text-sm py-4">No tokens called yet</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer — fixed position */}
            <div className="text-center py-3 text-gray-700 text-xs font-medium tracking-wider shrink-0">
                qrq • Queue Management System
            </div>
        </main>
    );
}
