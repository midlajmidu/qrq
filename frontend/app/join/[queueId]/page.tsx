"use client";

import React, { use, useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import { useQueueSocket } from "@/hooks/useQueueSocket";
import ConnectionBadge from "@/components/ConnectionBadge";
import type { JoinResponse, TokenStatus } from "@/types/api";

interface PageProps {
    params: Promise<{ queueId: string }>;
}

const STORAGE_PREFIX = "fc_join_";

function saveJoinData(queueId: string, data: JoinResponse) {
    try {
        sessionStorage.setItem(`${STORAGE_PREFIX}${queueId}`, JSON.stringify(data));
    } catch { /* SSR or storage unavailable */ }
}

function loadJoinData(queueId: string): JoinResponse | null {
    try {
        const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${queueId}`);
        if (raw) return JSON.parse(raw) as JoinResponse;
    } catch { /* ignore */ }
    return null;
}

export default function JoinQueuePage({ params }: PageProps) {
    const { queueId } = use(params);

    const { state: live, status: wsStatus } = useQueueSocket(queueId);

    const [joinData, setJoinData] = useState<JoinResponse | null>(null);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(false);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    // Init Audio and check session storage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const enabled = sessionStorage.getItem("sound_enabled") === "true";
            setSoundEnabled(enabled);

            // Initialize audio object. It won't play until user interacts.
            const audio = new Audio("/sounds/mixkit-confirmation-tone-2867.wav");
            audio.preload = "auto";
            audio.volume = 1.0;
            audioRef.current = audio;
        }
    }, []);

    const handleEnableSound = useCallback(() => {
        if (audioRef.current) {
            // Unlocking autoplay with a quick play/pause
            audioRef.current.play().then(() => {
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                }
            }).catch(() => { /* ignore */ });
        }

        sessionStorage.setItem("sound_enabled", "true");
        setSoundEnabled(true);
    }, []);

    // Restore from session on mount
    useEffect(() => {
        const saved = loadJoinData(queueId);
        if (saved) setJoinData(saved);
    }, [queueId]);

    const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);

    // Fetch exact status on live update or when joinData changes
    useEffect(() => {
        let mounted = true;
        const fetchStatus = async () => {
            if (!joinData?.token_number) return;

            let newStatus: TokenStatus | null = null;

            // Check recent_tokens first
            if (live?.recent_tokens) {
                const recent = live.recent_tokens.find((t: { token_number: number; status: TokenStatus }) => t.token_number === joinData.token_number);
                if (recent) {
                    newStatus = recent.status;
                }
            }

            if (!newStatus && live?.current_serving === joinData.token_number) {
                newStatus = "serving";
            }

            try {
                if (!newStatus) {
                    const res = await api.getPublicToken(queueId, joinData.token_number);
                    newStatus = res.status;
                }
            } catch (err) {
                // ignore
            }

            if (newStatus && mounted) {
                setTokenStatus(newStatus);

                // --- Audio Alert Logic ---
                if (typeof window !== "undefined") {
                    const storageKey = `fc_audio_stage_${queueId}`;
                    const lastStage = sessionStorage.getItem(storageKey);

                    if (newStatus !== lastStage) {
                        sessionStorage.setItem(storageKey, newStatus);

                        // Play sound ONLY when transitioning into 'serving', and only if enabled
                        if (newStatus === "serving" && lastStage !== "serving" && soundEnabled && audioRef.current) {
                            audioRef.current.currentTime = 0;
                            audioRef.current.play().catch(() => { /* Autoplay might still block if interaction was reset */ });
                        }
                    }
                }
            }
        };

        fetchStatus();

        return () => { mounted = false; };
    }, [queueId, joinData?.token_number, live]);

    const handleJoin = useCallback(async () => {
        setIsJoining(true);
        setError(null);
        try {
            const data = await api.joinQueue(queueId);
            setJoinData(data);
            saveJoinData(queueId, data);
            setTokenStatus("waiting");
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setError(err.detail);
            } else {
                setError("Failed to get a ticket. Please try again.");
            }
        } finally {
            setIsJoining(false);
        }
    }, [queueId]);

    // Derived: compute live position
    const myNumber = joinData?.token_number ?? null;
    const serving = live?.current_serving ?? 0;

    // Status interpretation
    const actualStatus = tokenStatus || "waiting";
    const isMyTurn = actualStatus === "serving";
    const isDone = actualStatus === "done";
    const isSkipped = actualStatus === "skipped";
    const isDeleted = actualStatus === "deleted";

    // Fallback if status doesn't match current state temporarily
    const alreadyServed = isDone || isSkipped || isDeleted || (myNumber !== null && myNumber < serving && actualStatus !== "waiting");

    const peopleAhead = myNumber !== null && actualStatus === "waiting" && myNumber > serving ? myNumber - serving - 1 : 0;
    const isNext = peopleAhead === 0 && actualStatus === "waiting" && myNumber !== null;

    const queueClosed = live?.is_active === false;
    const queueName = live?.queue_name || "Queue";
    const prefix = live?.prefix || joinData?.queue_prefix || "";

    // Position message
    let positionMessage = "";
    if (myNumber !== null) {
        if (isMyTurn) positionMessage = "It's your turn! Please proceed.";
        else if (isDeleted) positionMessage = "Your token was removed.";
        else if (isSkipped) positionMessage = "Your token was skipped.";
        else if (alreadyServed) positionMessage = "Your token has been served.";
        else if (isNext) positionMessage = "You are next!";
        else if (peopleAhead === 1) positionMessage = "1 person ahead of you";
        else positionMessage = `${peopleAhead} people ahead of you`;
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 px-6 py-7 text-center text-white relative">
                    <div className="absolute top-3 right-3">
                        <ConnectionBadge status={wsStatus} />
                    </div>

                    <h1 className="text-2xl font-extrabold mb-1">{queueName}</h1>
                    <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest">
                        {queueClosed ? "Currently Closed" : "Now Serving"}
                    </p>

                    <div className="mt-4 text-6xl font-black tabular-nums tracking-tight py-4 bg-white/10 rounded-xl border border-white/20" aria-live="polite" aria-atomic="true" aria-label={`Currently serving token ${prefix}${serving}`}>
                        {prefix}{serving}
                    </div>

                    <div className="mt-3 flex justify-center gap-6 text-xs text-blue-200">
                        <span>Waiting: <strong className="text-white">{live?.waiting_count ?? "—"}</strong></span>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {error && (
                        <div role="alert" className="bg-red-50 text-red-700 text-sm font-medium p-3 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    {joinData ? (
                        /* Ticket Card */
                        <div className="space-y-4">
                            {!soundEnabled && (
                                <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl border border-indigo-200 text-center flex flex-col items-center gap-2">
                                    <p className="text-sm font-medium">Want sound alerts when it&amp;s your turn?</p>
                                    <button onClick={handleEnableSound} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                        Enable Sound Alerts
                                    </button>
                                </div>
                            )}

                            {/* Status banner */}
                            {isMyTurn && (
                                <div role="alert" className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border-2 border-emerald-300 text-center font-bold text-lg animate-pulse">
                                    🎉 It&apos;s your turn! Please proceed.
                                </div>
                            )}

                            {isNext && !isMyTurn && (
                                <div role="status" className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-200 text-center font-bold text-base">
                                    ⏳ You are next! Get ready.
                                </div>
                            )}

                            {isSkipped && !isDone && !isMyTurn && !isDeleted && (
                                <div className="bg-amber-50 text-amber-600 p-4 rounded-xl border border-amber-200 text-center text-sm">
                                    Your token was skipped. Please see the receptionist.
                                </div>
                            )}

                            {isDeleted && !isDone && !isMyTurn && (
                                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-center text-sm">
                                    Your token has been removed from the waiting list.
                                </div>
                            )}

                            {alreadyServed && !isSkipped && !isDeleted && (
                                <div className="bg-gray-50 text-gray-600 p-4 rounded-xl border border-gray-200 text-center text-sm">
                                    Your token has already been served. Thank you for visiting!
                                </div>
                            )}

                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center shadow-inner" aria-label="Your ticket information">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                                    Your Ticket
                                </p>
                                <div className={`text-7xl font-black tabular-nums mb-2 ${isMyTurn ? "text-emerald-600" : alreadyServed ? "text-gray-400" : "text-blue-700"}`}>
                                    {prefix}{myNumber}
                                </div>

                                {/* Position message */}
                                <p aria-live="polite" className={`text-sm font-semibold mb-4 ${isMyTurn ? "text-emerald-600" : isNext ? "text-blue-600" : alreadyServed ? "text-gray-400" : "text-gray-600"}`}>
                                    {positionMessage}
                                </p>

                                <div className="flex bg-white rounded-lg border border-gray-100 divide-x divide-gray-100 overflow-hidden text-sm shadow-sm">
                                    <div className="flex-1 py-3">
                                        <p className="text-gray-400 font-semibold text-[10px] uppercase tracking-wider">Ahead</p>
                                        <p className="text-2xl font-bold text-gray-900 mt-0.5 tabular-nums">
                                            {alreadyServed ? "—" : isMyTurn ? "0" : peopleAhead}
                                        </p>
                                    </div>
                                    <div className="flex-1 py-3">
                                        <p className="text-gray-400 font-semibold text-[10px] uppercase tracking-wider">Status</p>
                                        <p className={`text-sm font-bold mt-1 ${isMyTurn ? "text-emerald-600" : isSkipped ? "text-amber-500" : alreadyServed ? "text-gray-400" : isNext ? "text-blue-600" : "text-amber-600"}`}>
                                            {isMyTurn ? "YOUR TURN" : isSkipped ? "Skipped" : alreadyServed ? "Served" : isNext ? "NEXT" : "Waiting"}
                                        </p>
                                    </div>
                                    <div className="flex-1 py-3">
                                        <p className="text-gray-400 font-semibold text-[10px] uppercase tracking-wider">Serving</p>
                                        <p className="text-2xl font-bold text-gray-900 mt-0.5 tabular-nums">{prefix}{serving}</p>
                                    </div>
                                </div>
                            </div>

                            <p className="text-center text-xs text-gray-400 leading-relaxed">
                                This page updates automatically. No need to refresh.
                            </p>

                            {/* Reconnecting indicator */}
                            {wsStatus === "reconnecting" && (
                                <div role="status" className="text-center text-xs text-amber-600 flex items-center justify-center gap-1.5 py-2">
                                    <span className="w-3 h-3 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" aria-hidden="true" />
                                    Reconnecting to live updates...
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Join Button */
                        <div className="text-center space-y-5">
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Tap the button below to get your ticket number and start tracking your position in real-time.
                            </p>
                            <button
                                onClick={handleJoin}
                                disabled={isJoining || queueClosed}
                                aria-label={queueClosed ? "Queue is closed" : "Take a token"}
                                className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl text-lg shadow-lg hover:shadow-xl hover:bg-blue-700 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
                            >
                                {isJoining ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                                        Getting Ticket...
                                    </span>
                                ) : queueClosed ? (
                                    "Queue is Closed"
                                ) : (
                                    "Take a Token"
                                )}
                            </button>
                            {queueClosed && (
                                <p className="text-sm text-amber-600 font-medium">
                                    This queue is currently not accepting new customers.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
