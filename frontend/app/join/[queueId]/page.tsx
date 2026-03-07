"use client";

import React, { use, useState, useEffect, useCallback, useRef } from "react";
import { api, ApiError } from "@/lib/api";
import { useQueueSocket } from "@/hooks/useQueueSocket";
import { playQueueSound } from "@/utils/playSound";
import {
    requestNotificationPermission,
    notificationPermissionGranted,
    getNotificationsEnabled,
    setNotificationsEnabled,
    checkAndNotifyMilestone,
    freshMilestoneState,
    type MilestoneState,
} from "@/utils/queueNotifications";
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
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // ── Notification state ────────────────────────────────────────
    const [notifEnabled, setNotifEnabled] = useState(false);
    const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");

    // Tracks which milestone alerts have already fired to prevent repeats
    const triggeredRef = useRef<MilestoneState>(freshMilestoneState());
    // Whether user has interacted (unlocks autoplay)
    const interactedRef = useRef(false);

    // ── Customer form state ──────────────────────────────────────
    const [customerName, setCustomerName] = useState("");
    const [customerAge, setCustomerAge] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");

    const isFormValid = customerName.trim().length > 0 && customerPhone.trim().length > 0;

    // Init Audio + read stored preferences on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const enabled = sessionStorage.getItem("sound_enabled") === "true";
            setSoundEnabled(enabled);

            const audio = new Audio("/sounds/ringtone-you-would-be-glad-to-know.mp3");
            audio.preload = "auto";
            audio.volume = 1.0;
            audioRef.current = audio;

            // Read stored notification preference
            const notifOn = getNotificationsEnabled();
            setNotifEnabled(notifOn);

            // Read current permission state
            if ("Notification" in window) {
                setNotifPermission(Notification.permission);
            }
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
        sessionStorage.setItem("sound_enabled", "true");
        setSoundEnabled(true);
        interactedRef.current = true; // unlock autoplay milestone alerts
    }, []);

    // ── Notification permission + toggle handler ──────────────────
    const handleEnableNotifications = useCallback(async () => {
        // If already denied, inform the user
        if (notifPermission === "denied") return;

        const granted = await requestNotificationPermission();
        setNotifPermission(granted ? "granted" : "denied");

        if (granted) {
            setNotificationsEnabled(true);
            setNotifEnabled(true);
            interactedRef.current = true;
        }
    }, [notifPermission]);

    const handleToggleNotifications = useCallback(() => {
        const next = !notifEnabled;
        setNotificationsEnabled(next);
        setNotifEnabled(next);
        if (next) interactedRef.current = true;
    }, [notifEnabled]);

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
            if (!joinData?.token_number || !joinData?.session_id) return;

            // Session isolation check: if queue session changed, this token is expired.
            if (live?.session_id && live.session_id !== joinData.session_id) {
                if (mounted) {
                    setTokenStatus("deleted");
                    setError("This queue session has ended. Your token is no longer valid.");
                }
                return; // Stop processing, token is from old session
            }

            let newStatus: TokenStatus | null = null;

            if (live?.recent_tokens) {
                const recent = live.recent_tokens.find(
                    (t: { token_number: number; status: TokenStatus }) =>
                        t.token_number === joinData.token_number
                );
                if (recent) newStatus = recent.status;
            }

            if (!newStatus && live?.current_serving === joinData.token_number) {
                newStatus = "serving";
            }

            try {
                if (!newStatus) {
                    const res = await api.getPublicToken(queueId, joinData.token_number);
                    if (res.session_id !== joinData.session_id) {
                        if (mounted) {
                            newStatus = "deleted";
                            setError("This queue session has ended. Your token is no longer valid.");
                        }
                    } else {
                        newStatus = res.status;
                    }
                }
            } catch (err: unknown) {
                if (err instanceof ApiError && err.status === 404) {
                    if (mounted) {
                        newStatus = "deleted";
                        setError("This queue session has ended. Your token was removed.");
                    }
                }
            }

            if (newStatus && mounted) {
                setTokenStatus(newStatus);

                if (typeof window !== "undefined") {
                    const storageKey = `fc_audio_stage_${queueId}`;
                    const lastStage = sessionStorage.getItem(storageKey);

                    if (newStatus !== lastStage) {
                        sessionStorage.setItem(storageKey, newStatus);
                        if (newStatus === "serving" && lastStage !== "serving" && soundEnabled && audioRef.current) {
                            audioRef.current.currentTime = 0;
                            audioRef.current.play().catch(() => { /* block */ });
                        }
                    }
                }
            }
        };

        fetchStatus();
        return () => { mounted = false; };
    }, [queueId, joinData?.token_number, live]);

    const handleJoin = useCallback(async () => {
        if (!isFormValid) return;
        setIsJoining(true);
        setError(null);
        try {
            const data = await api.joinQueue(queueId, {
                name: customerName.trim(),
                age: customerAge ? parseInt(customerAge, 10) : undefined,
                phone: customerPhone.trim(),
            });
            setJoinData(data);
            saveJoinData(queueId, data);
            setTokenStatus("waiting");
            // User just interacted — unlock milestone autoplay
            interactedRef.current = true;
            // Reset milestone triggers for this new token
            triggeredRef.current = { five: false, two: false, turn: false };
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setError(err.detail);
            } else {
                setError("Failed to get a ticket. Please try again.");
            }
        } finally {
            setIsJoining(false);
        }
    }, [queueId, customerName, customerAge, customerPhone, isFormValid]);

    // Derived: compute live position
    const myNumber = joinData?.token_number ?? null;
    const serving = live?.current_serving ?? 0;

    const actualStatus = tokenStatus || "waiting";
    const isMyTurn = actualStatus === "serving";
    const isDone = actualStatus === "done";
    const isSkipped = actualStatus === "skipped";
    const isDeleted = actualStatus === "deleted";

    const alreadyServed = isDone || isSkipped || isDeleted || (myNumber !== null && myNumber < serving && actualStatus !== "waiting");
    const peopleAhead = myNumber !== null && actualStatus === "waiting" && myNumber > serving ? myNumber - serving - 1 : 0;
    const isNext = peopleAhead === 0 && actualStatus === "waiting" && myNumber !== null;

    // ── Remaining-count milestone: sound + browser notification ────
    useEffect(() => {
        if (!joinData?.token_number || !live?.current_serving || !joinData?.session_id) return;
        if (!interactedRef.current) return; // needs prior user interaction

        // Session isolation check: Do not fire alerts for old sessions
        if (live?.session_id && live.session_id !== joinData.session_id) return;

        const remaining = joinData.token_number - live.current_serving;

        // Sound (fires if soundEnabled)
        if (soundEnabled) {
            if (remaining <= 0 && !triggeredRef.current.turn) {
                playQueueSound();
            } else if (remaining <= 2 && remaining > 0 && !triggeredRef.current.two) {
                playQueueSound();
            } else if (remaining <= 5 && remaining > 2 && !triggeredRef.current.five) {
                playQueueSound();
            }
        }

        // Browser notification + sound via utility (handles its own enabled check)
        checkAndNotifyMilestone(joinData.token_number, live.current_serving, triggeredRef.current);

    }, [joinData?.token_number, joinData?.session_id, live?.current_serving, live?.session_id, soundEnabled]);

    const queueClosed = live?.is_active === false;
    const queueName = live?.queue_name || "Queue";
    const prefix = live?.prefix || joinData?.queue_prefix || "";

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
                        /* ── Ticket Card ── */
                        <div className="space-y-4">
                            {/* ── Alert Settings Card ── */}
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
                                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Alert Settings</p>

                                {/* Sound toggle */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🔔</span>
                                        <div>
                                            <p className="text-sm font-medium text-indigo-900">Sound Alerts</p>
                                            <p className="text-xs text-indigo-500">Plays ringtone at milestones</p>
                                        </div>
                                    </div>
                                    {soundEnabled ? (
                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">ON</span>
                                    ) : (
                                        <button
                                            onClick={handleEnableSound}
                                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition"
                                        >
                                            Enable
                                        </button>
                                    )}
                                </div>

                                {/* Browser notification toggle */}
                                <div className="flex items-center justify-between border-t border-indigo-200 pt-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">📱</span>
                                        <div>
                                            <p className="text-sm font-medium text-indigo-900">Push Notifications</p>
                                            <p className="text-xs text-indigo-500">Browser alerts at 5, 2, and 0</p>
                                        </div>
                                    </div>
                                    {notifPermission === "denied" ? (
                                        <span className="text-xs font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">Blocked</span>
                                    ) : notifPermission === "granted" ? (
                                        <button
                                            onClick={handleToggleNotifications}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${notifEnabled ? "bg-indigo-600" : "bg-gray-300"}`}
                                            role="switch"
                                            aria-checked={notifEnabled}
                                            aria-label="Toggle push notifications"
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${notifEnabled ? "translate-x-6" : "translate-x-1"}`} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleEnableNotifications}
                                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition"
                                        >
                                            Allow
                                        </button>
                                    )}
                                </div>
                            </div>

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
                                    {error ? error : "Your token has been removed from the waiting list."}
                                </div>
                            )}
                            {alreadyServed && !isSkipped && !isDeleted && (
                                <div className="bg-gray-50 text-gray-600 p-4 rounded-xl border border-gray-200 text-center text-sm">
                                    Your token has already been served. Thank you for visiting!
                                </div>
                            )}

                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center shadow-inner" aria-label="Your ticket information">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Your Ticket</p>
                                <div className={`text-7xl font-black tabular-nums mb-2 ${isMyTurn ? "text-emerald-600" : alreadyServed ? "text-gray-400" : "text-blue-700"}`}>
                                    {prefix}{myNumber}
                                </div>

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

                            {wsStatus === "reconnecting" && (
                                <div role="status" className="text-center text-xs text-amber-600 flex items-center justify-center gap-1.5 py-2">
                                    <span className="w-3 h-3 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" aria-hidden="true" />
                                    Reconnecting to live updates...
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ── Customer Form + Join Button ── */
                        <div className="space-y-5">
                            {/* Info text */}
                            <p className="text-gray-500 text-sm leading-relaxed text-center">
                                Fill in your details below to get your ticket number and track your position in real-time.
                            </p>

                            {/* Customer info form */}
                            <div className="space-y-3">
                                {/* Name */}
                                <div>
                                    <label htmlFor="customer-name" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="customer-name"
                                        type="text"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="John Doe"
                                        required
                                        autoComplete="name"
                                        disabled={isJoining || queueClosed}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                                    />
                                </div>

                                {/* Age */}
                                <div>
                                    <label htmlFor="customer-age" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Age <span className="text-gray-400 font-normal normal-case">(optional)</span>
                                    </label>
                                    <input
                                        id="customer-age"
                                        type="number"
                                        min="0"
                                        max="150"
                                        value={customerAge}
                                        onChange={(e) => setCustomerAge(e.target.value)}
                                        placeholder="32"
                                        autoComplete="off"
                                        disabled={isJoining || queueClosed}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                                    />
                                </div>

                                {/* Phone */}
                                <div>
                                    <label htmlFor="customer-phone" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Phone Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="customer-phone"
                                        type="tel"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        placeholder="+91 99999 99999"
                                        required
                                        autoComplete="tel"
                                        disabled={isJoining || queueClosed}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            {/* Take Token button */}
                            <button
                                onClick={handleJoin}
                                disabled={isJoining || queueClosed || !isFormValid}
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
                                <p className="text-sm text-amber-600 font-medium text-center">
                                    This queue is currently not accepting new customers.
                                </p>
                            )}

                            {!isFormValid && !queueClosed && (
                                <p className="text-xs text-gray-400 text-center">
                                    Please fill in your name and phone number to continue.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
