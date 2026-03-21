"use client";

import { use, useState, useCallback, useRef, useEffect } from "react";
import React from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useQueueSocket } from "@/hooks/useQueueSocket";
import { getToken, getCurrentUser } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import ConnectionBadge from "@/components/ConnectionBadge";
import ConfirmModal from "@/components/ConfirmModal";
import QueueQRCode from "@/components/QueueQRCode";
import type { RecentToken, WaitingToken, QueueResponse } from "@/types/api";

const C = {
  pageBg:     "#f7f8fa",
  cardBg:     "#ffffff",
  border:     "#e8eaef",
  borderHov:  "#c4ccd8",
  borderLight:"#f1f2f5",
  text:       "#0f1729",
  textSub:    "#475569",
  textMuted:  "#8b95a9",
  brand:      "#4f46e5",
  brandLight: "#eef2ff",
  brandBorder:"#c7d2fe",
  brandGlow:  "rgba(79,70,229,.10)",
  blue:       "#3b82f6", blueBg: "#eff6ff",   blueBorder: "#bfdbfe",
  green:      "#10b981", greenBg: "#ecfdf5",   greenBorder:"#a7f3d0",
  amber:      "#f59e0b", amberBg: "#fffbeb",   amberBorder:"#fde68a",
  red:        "#ef4444", redBg:   "#fef2f2",   redBorder:  "#fecaca",
  purple:     "#a855f7", purpleBg:"#faf5ff",  purpleBorder:"#e9d5ff",
  slate:      "#64748b", slateBg: "#f8fafc",
};

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  .ov { font-family: 'Inter', sans-serif; color: ${C.text}; -webkit-font-smoothing: antialiased; }
  .card { background: ${C.cardBg}; border: 1px solid ${C.border}; border-radius: 14px; box-shadow: 0 0 0 1px rgba(0,0,0,.02), 0 1px 2px rgba(0,0,0,.03), 0 2px 8px rgba(0,0,0,.025); transition: box-shadow .25s ease, border-color .25s ease; }
  .card:hover { box-shadow: 0 0 0 1px rgba(0,0,0,.03), 0 4px 12px rgba(0,0,0,.06), 0 8px 28px rgba(0,0,0,.04); border-color: ${C.borderHov}; }
  
  .ov-sel { width: 100%; padding: 12px 14px; font-size: 13.5px; color: ${C.text}; background: #ffffff; border: 1px solid ${C.border}; border-radius: 10px; transition: all .2s ease; box-shadow: 0 1px 2px rgba(0,0,0,.03); }
  .ov-sel:hover:not(:disabled) { border-color: #cbd5e1; background: #f8fafc; box-shadow: 0 2px 4px rgba(0,0,0,.04); }
  .ov-sel:focus { outline: none; border-color: #818cf8; box-shadow: 0 0 0 3px rgba(129,140,248,.15), 0 1px 2px rgba(0,0,0,.03); background: #ffffff; }
  
  .qa-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 20px; font-size: 13.5px; font-weight: 600; font-family: 'Inter', sans-serif; color: #ffffff; background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%); border: 1px solid transparent; border-radius: 10px; cursor: pointer; text-decoration: none; box-shadow: 0 1px 3px rgba(37,99,235,0.2), 0 1px 2px rgba(0,0,0,.06), inset 0 1px 0 rgba(255,255,255,0.1); transition: all .22s ease; }
  .qa-btn:hover:not(:disabled) { background: linear-gradient(180deg, #1d4ed8 0%, #1e40af 100%); transform: translateY(-0.5px); box-shadow: 0 4px 6px rgba(37,99,235,0.3); }
  .qa-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }

  .qa-btn-outline { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 20px; font-size: 13.5px; font-weight: 600; font-family: 'Inter', sans-serif; color: ${C.text}; background: #ffffff; border: 1px solid ${C.border}; border-radius: 10px; cursor: pointer; text-decoration: none; box-shadow: 0 1px 2px rgba(0,0,0,.04); transition: all .22s ease; }
  .qa-btn-outline:hover:not(:disabled) { border-color: ${C.borderHov}; background: ${C.slateBg}; box-shadow: 0 2px 4px rgba(0,0,0,.06); }
  .qa-btn-outline:disabled { opacity: .4; cursor: not-allowed; }

  .qtable { width: 100%; border-collapse: collapse; text-align: left; }
  .qtable th { padding: 12px 16px; font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: ${C.textMuted}; border-bottom: 1px solid ${C.border}; background: linear-gradient(180deg, #ffffff, ${C.slateBg}); font-family: 'Inter', sans-serif; }
  .qtable td { padding: 14px 16px; font-size: 13.5px; font-weight: 500; color: ${C.text}; border-bottom: 1px solid ${C.borderLight}; transition: background .12s ease; }
  .qtable tbody tr:hover td { background: #f8f9ff; }

  .pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 99px; font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
  .tnum { font-variant-numeric: tabular-nums; }
  .lbl { font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: ${C.textMuted}; font-family: 'Inter', sans-serif; display: block; margin-bottom: 8px; }
`;

interface PageProps {
    params: Promise<{ queueId: string }>;
}

export default function QueueDetailPage({ params }: PageProps) {
    const { queueId } = use(params);
    const token = getToken();
    const user = getCurrentUser();
    const isStaff = user?.role === "staff";
    const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";
    const { toast } = useToast();

    const { state, status } = useQueueSocket(queueId, { token: token || undefined });

    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [inviteNumber, setInviteNumber] = useState("");
    const [removeNumber, setRemoveNumber] = useState("");
    const [tokenToRemove, setTokenToRemove] = useState<{ id: string, number: number } | null>(null);
    const [announcementInput, setAnnouncementInput] = useState("");
    const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
    const [waitingSearch, setWaitingSearch] = useState("");
    const [recentSearch, setRecentSearch] = useState("");
    const [waitingPage, setWaitingPage] = useState(1);
    const [recentPage, setRecentPage] = useState(1);
    const PAGE_SIZE = 10;
    const router = useRouter();

    const filteredWaiting = React.useMemo(() => {
        if (!state?.waiting_tokens) return [];
        const filtered = waitingSearch
            ? state.waiting_tokens.filter(t =>
                String(t.token_number).includes(waitingSearch) ||
                t.customer_name?.toLowerCase().includes(waitingSearch.toLowerCase()) ||
                t.customer_phone?.includes(waitingSearch)
            )
            : state.waiting_tokens;
        return filtered;
    }, [state?.waiting_tokens, waitingSearch]);

    const paginatedWaiting = React.useMemo(() => {
        const start = (waitingPage - 1) * PAGE_SIZE;
        return filteredWaiting.slice(start, start + PAGE_SIZE);
    }, [filteredWaiting, waitingPage]);

    const filteredRecent = React.useMemo(() => {
        if (!state?.recent_tokens) return [];
        const filtered = recentSearch
            ? state.recent_tokens.filter(t =>
                String(t.token_number).includes(recentSearch) ||
                t.customer_name?.toLowerCase().includes(recentSearch.toLowerCase()) ||
                t.customer_phone?.includes(recentSearch)
            )
            : state.recent_tokens;
        return filtered;
    }, [state?.recent_tokens, recentSearch]);

    const paginatedRecent = React.useMemo(() => {
        const start = (recentPage - 1) * PAGE_SIZE;
        return filteredRecent.slice(start, start + PAGE_SIZE);
    }, [filteredRecent, recentPage]);

    React.useEffect(() => { setWaitingPage(1); }, [waitingSearch]);
    React.useEffect(() => { setRecentPage(1); }, [recentSearch]);

    const [initialQueue, setInitialQueue] = useState<QueueResponse | null>(null);

    const lastActionRef = useRef(0);
    const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        api.getQueue(queueId)
            .then(setInitialQueue)
            .catch(() => {});
    }, [queueId]);

    const isDisabled = actionLoading !== null;

    const setErrorWithTimer = useCallback((msg: string) => {
        setActionError(msg);
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => setActionError(null), 5000);
    }, []);

    const performAction = useCallback(async (
        actionName: string,
        fn: () => Promise<unknown>,
        successMsg?: string
    ) => {
        const now = Date.now();
        if (now - lastActionRef.current < 400) return;
        lastActionRef.current = now;

        setActionLoading(actionName);
        setActionError(null);
        try {
            await fn();
            if (successMsg) toast(successMsg, "success");
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setErrorWithTimer(err.detail);
                toast(err.detail, "error");
            } else {
                setErrorWithTimer("Action failed. Please try again.");
                toast("Action failed. Please try again.", "error");
            }
        } finally {
            setActionLoading(null);
        }
    }, [toast, setErrorWithTimer]);

    const handleNext = useCallback(async () => {
        const prefix = state?.prefix ?? "";
        await performAction("next", async () => {
            const res = await api.callNext(queueId, "done");
            if ("message" in res) {
                toast(res.message, "info");
            } else {
                toast(`${prefix}${res.serving} is now serving`, "success");
            }
        });
    }, [performAction, queueId, state?.prefix, toast]);

    const handleSkip = useCallback(() => setShowSkipConfirm(true), []);
    const handleConfirmSkip = useCallback(async () => {
        setShowSkipConfirm(false);
        const prefix = state?.prefix ?? "";
        await performAction("skip", async () => {
            const res = await api.callNext(queueId, "skipped");
            if ("message" in res) {
                toast(res.message, "info");
            } else {
                toast(`${prefix}${res.serving} is now serving`, "success");
            }
        });
    }, [performAction, queueId, state?.prefix, toast]);

    const handleReset = useCallback(async () => {
        setResetting(true);
        setActionError(null);
        try {
            await api.resetQueue(queueId);
            toast("Queue reset successfully", "success");
            setShowResetConfirm(false);
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to reset queue");
            setShowResetConfirm(false);
        } finally {
            setResetting(false);
        }
    }, [queueId, toast]);

    const handleDelete = useCallback(async () => {
        setDeleting(true);
        setActionError(null);
        try {
            await api.deleteQueue(queueId);
            toast("Queue deleted successfully", "success");
            router.push(`${dashBase}/queues`);
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to delete queue");
            setShowDeleteConfirm(false);
        } finally {
            setDeleting(false);
        }
    }, [queueId, router, dashBase, toast]);

    const [showAddForm, setShowAddForm] = useState(false);
    const [addName, setAddName] = useState("");
    const [addPhone, setAddPhone] = useState("");
    const [addAge, setAddAge] = useState("");

    const handleAddCustomer = useCallback(async () => {
        const phoneDigits = addPhone.replace(/\D/g, "");
        if (!addName.trim() || phoneDigits.length !== 10) {
            toast("Please enter name and 10 digit phone number", "error");
            return;
        }
        setActionLoading("add");
        setActionError(null);
        try {
            const res = await api.adminJoin(queueId, {
                name: addName.trim(),
                phone: phoneDigits,
                age: addAge ? parseInt(addAge, 10) : undefined,
            });
            toast(`Token ${state?.prefix || ""}${res.token_number} created`, "success");
            setShowAddForm(false);
            setAddName(""); setAddPhone(""); setAddAge("");
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to add customer");
        } finally {
            setActionLoading(null);
        }
    }, [queueId, addName, addPhone, addAge, state?.prefix, toast]);

    const handleInvite = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteNumber) return;
        const num = parseInt(inviteNumber, 10);
        if (isNaN(num)) return;

        setActionLoading("invite");
        setActionError(null);
        try {
            await api.serveSpecificToken(queueId, num);
            toast(`Token ${state?.prefix || ""}${num} is now serving`, "success");
            setInviteNumber("");
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to invite token: it might not exist.");
        } finally {
            setActionLoading(null);
        }
    }, [queueId, inviteNumber, state?.prefix, toast]);

    const handleRemoveByNumber = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        setActionError(null);
        if (!removeNumber) return;
        const num = parseInt(removeNumber, 10);
        if (isNaN(num)) return;

        const t = state?.waiting_tokens?.find((tk) => tk.token_number === num);
        if (!t) {
            setActionError(`Token ${state?.prefix || ""}${num} is not currently waiting.`);
            return;
        }

        setTokenToRemove({ id: t.id, number: t.token_number });
        setRemoveNumber("");
    }, [removeNumber, state?.waiting_tokens, state?.prefix]);

    const handleConfirmRemove = useCallback(async () => {
        if (!tokenToRemove) return;
        setActionLoading("remove");
        setActionError(null);
        try {
            await api.removeToken(tokenToRemove.id);
            toast(`Token ${state?.prefix || ""}${tokenToRemove.number} removed`, "success");
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to remove token");
        } finally {
            setActionLoading(null);
            setTokenToRemove(null);
        }
    }, [tokenToRemove, state?.prefix, toast]);

    useEffect(() => {
        if (!isEditingAnnouncement) {
            setAnnouncementInput(state?.announcement ?? initialQueue?.announcement ?? "");
        }
    }, [state?.announcement, initialQueue?.announcement, isEditingAnnouncement]);

    const handleUpdateAnnouncement = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading("announcement");
        setActionError(null);
        try {
            await api.updateQueueAnnouncement(queueId, announcementInput.trim());
            toast("Announcement updated", "success");
            setIsEditingAnnouncement(false);
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to update announcement");
        } finally {
            setActionLoading(null);
        }
    }, [queueId, announcementInput, toast]);

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
            if (showSkipConfirm) return;
            if (e.key === "Enter" && !isDisabled) {
                e.preventDefault(); handleNext();
            }
            if ((e.key === "s" || e.key === "S") && !isDisabled) {
                e.preventDefault(); handleSkip();
            }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isDisabled, handleNext, handleSkip, showSkipConfirm, state?.current_serving]);

    useEffect(() => {
        return () => { if (errorTimerRef.current) clearTimeout(errorTimerRef.current); };
    }, []);

    return (
        <>
            <style>{STYLES}</style>
            <div className="ov min-h-screen">
                <main style={{ paddingBottom: 64 }}>
                    
                    {/* Header Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Link
                                    href={`${dashBase}/queues`}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.borderLight}`, background: C.cardBg, color: C.textSub, transition: 'all .2s ease' }}
                                    className="hover:border-[#c4ccd8] hover:bg-[#f8fafc] hover:text-[#0f1729]"
                                >
                                    <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                                </Link>
                                <div>
                                    <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: '0 0 4px 0', letterSpacing: '-.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {state?.queue_name || initialQueue?.name || "Loading..."}
                                        <ConnectionBadge status={status} />
                                    </h1>
                                    <p style={{ margin: 0, fontSize: 13, color: C.textSub, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        Prefix: <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: C.text }}>{state?.prefix || initialQueue?.prefix || "—"}</span>
                                        <span style={{ color: C.borderHov }}>•</span>
                                        {(state?.is_active ?? initialQueue?.is_active) ? (
                                            <span style={{ color: C.green, fontWeight: 700 }}>Active Platform</span>
                                        ) : (
                                            <span style={{ color: C.red, fontWeight: 700 }}>Inactive State</span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {!isStaff && (
                                    <button 
                                        onClick={() => setShowResetConfirm(true)} 
                                        disabled={isDisabled || resetting} 
                                        className="qa-btn-outline" 
                                        style={{ padding: '8px 16px', fontSize: 12.5 }}
                                    >
                                        <span style={{ color: C.amber, display: 'flex' }}><svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></span>
                                        Force Reset
                                    </button>
                                )}
                                {!isStaff && (
                                    <button 
                                        onClick={() => setShowDeleteConfirm(true)} 
                                        className="qa-btn" 
                                        style={{ background: 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 1px 3px rgba(220,38,38,0.2), inset 0 1px 0 rgba(255,255,255,0.1)', padding: '8px 16px', fontSize: 12.5 }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)'; }}
                                    >
                                        Drop Queue
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Top Banner Alert System */}
                        {actionError && (
                            <div style={{ padding: '14px 16px', background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 10, color: C.red, fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn .2s ease' }}>
                                <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                {actionError}
                            </div>
                        )}
                        {status === "disconnected" && (
                            <div style={{ padding: '14px 16px', background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 10, color: '#b45309', fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                Connection lost. Retrying synchronization frames.
                            </div>
                        )}
                        {status === "reconnecting" && (
                            <div style={{ padding: '14px 16px', background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 10, color: C.blue, fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="animate-spin" style={{ width: 14, height: 14, border: '2px solid transparent', borderTopColor: C.blue, borderRadius: '50%' }} />
                                Rebinding WebSocket streams...
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 32, marginTop: 32 }}>
                        
                        {/* Major Console (Left Column) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            
                            {/* The Stage */}
                            <div className="card" style={{ padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)', width: 400, height: 200, background: `radial-gradient(circle, ${C.brandLight} 0%, rgba(255,255,255,0) 70%)`, pointerEvents: 'none' }} />
                                
                                <span className="lbl" style={{ marginBottom: 16 }}>Currently Serving</span>
                                <div className="tnum" style={{ fontSize: '110px', fontWeight: 900, color: C.brand, letterSpacing: '-0.04em', lineHeight: 1, padding: '24px 0', textShadow: `0 8px 32px ${C.brandGlow}` }}>
                                    {state?.prefix || ""}{state?.current_serving || 0}
                                </div>

                                {state?.serving_details && (
                                    <div style={{ animation: 'fadeIn .4s ease', marginTop: 16 }}>
                                        <p style={{ fontSize: 28, fontWeight: 800, color: C.text, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>{state.serving_details.customer_name}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: 14, color: C.textSub, fontWeight: 500 }}>
                                            {state.serving_details.customer_age != null && <span>Age: {state.serving_details.customer_age}</span>}
                                            {state.serving_details.customer_age != null && <span style={{ color: C.borderHov }}>•</span>}
                                            <span style={{ fontFamily: "'JetBrains Mono', monospace", color: C.text }}>{state.serving_details.customer_phone}</span>
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, marginTop: 40, padding: '10px 24px', background: C.slateBg, borderRadius: 99, border: `1px solid ${C.borderLight}`, fontSize: 13, fontWeight: 600 }}>
                                    <span style={{ color: C.textSub }}>Waiting <span style={{ color: C.text, marginLeft: 4 }}>{state?.waiting_count ?? 0}</span></span>
                                    <span style={{ color: C.borderHov }}>|</span>
                                    <span style={{ color: C.textSub }}>Issued <span style={{ color: C.text, marginLeft: 4 }}>{state?.total_issued ?? 0}</span></span>
                                </div>
                            </div>

                            {/* Core Action Triggers */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
                                <button className="qa-btn" onClick={handleNext} disabled={isDisabled} style={{ padding: '24px 16px', flexDirection: 'column', gap: 6, fontSize: 15, height: '100%' }}>
                                    {actionLoading === "next" ? (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="animate-spin" style={{ width: 16, height: 16, border: '2px solid transparent', borderTopColor: '#fff', borderRadius: '50%' }} /> Executing</span>
                                    ) : (
                                        <>Call Next <span style={{ fontSize: 11, color: '#93c5fd', fontWeight: 500 }}>(Enter)</span></>
                                    )}
                                </button>
                                
                                <button className="qa-btn-outline" onClick={handleSkip} disabled={isDisabled} style={{ padding: '24px 16px', flexDirection: 'column', gap: 6, fontSize: 15, height: '100%', borderColor: C.amberBorder, color: '#b45309', background: C.amberBg }}>
                                    {actionLoading === "skip" ? "Skipping..." : <>Skip Token <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 500 }}>(S)</span></>}
                                </button>

                                <button className="qa-btn-outline" onClick={() => performAction("done", async () => { const res = await api.callNext(queueId, "done"); if ("message" in res) toast(res.message, "info"); else toast(`${state?.prefix || ""}${res.serving} is serving`, "success"); })} disabled={isDisabled} style={{ padding: '24px 16px', flexDirection: 'column', gap: 6, fontSize: 15, height: '100%', borderColor: C.greenBorder, color: '#047857', background: C.greenBg }}>
                                    {actionLoading === "done" ? "Completing..." : "Done & Next"}
                                </button>
                            </div>

                            {/* Tactical Overrides */}
                            <div className="card" style={{ padding: 24 }}>
                                <span className="lbl" style={{ marginBottom: 20 }}>Tactical Overrides</span>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                                    
                                    {/* Manual Injection */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Admin Injection (Walk-in)</span>
                                        {!showAddForm ? (
                                            <button onClick={() => setShowAddForm(true)} disabled={isDisabled} className="qa-btn-outline" style={{ padding: '8px 16px', fontSize: 12.5, width: '100%' }}>
                                                Inject Customer
                                            </button>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                <input type="text" value={addName} onChange={e => setAddName(e.target.value)} placeholder="Full Name" className="ov-sel" style={{ padding: '8px 12px', fontSize: 12.5 }} />
                                                <input type="tel" value={addPhone} onChange={e => setAddPhone(e.target.value)} placeholder="Phone" className="ov-sel" style={{ padding: '8px 12px', fontSize: 12.5 }} />
                                                <input type="number" value={addAge} onChange={e => setAddAge(e.target.value)} placeholder="Age" className="ov-sel" style={{ padding: '8px 12px', fontSize: 12.5 }} />
                                                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                                    <button onClick={handleAddCustomer} disabled={!addName.trim() || !addPhone.trim() || actionLoading === "add" || isDisabled} className="qa-btn" style={{ padding: '6px 0', fontSize: 12, flex: 1 }}>{actionLoading === "add" ? "..." : "Push"}</button>
                                                    <button onClick={() => { setShowAddForm(false); setAddName(""); setAddPhone(""); setAddAge(""); }} className="qa-btn-outline" style={{ padding: '6px 0', fontSize: 12, flex: 1 }}>Abort</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Force Call */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Force Execute Call</span>
                                        <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8 }}>
                                            <input type="number" min="1" value={inviteNumber} onChange={e => setInviteNumber(e.target.value)} placeholder="Token ID" disabled={isDisabled || actionLoading === "invite"} className="ov-sel" style={{ padding: '8px 12px', fontSize: 12.5 }} />
                                            <button type="submit" disabled={!inviteNumber || isDisabled || actionLoading === "invite"} className="qa-btn" style={{ padding: '8px 16px', fontSize: 12.5 }}>Call</button>
                                        </form>
                                    </div>

                                    {/* Force Purge */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Purge Token from Array</span>
                                        <form onSubmit={handleRemoveByNumber} style={{ display: 'flex', gap: 8 }}>
                                            <input type="number" min="1" value={removeNumber} onChange={e => setRemoveNumber(e.target.value)} placeholder="Token ID" disabled={isDisabled || actionLoading === "remove"} className="ov-sel" style={{ padding: '8px 12px', fontSize: 12.5 }} />
                                            <button type="submit" disabled={!removeNumber || isDisabled || actionLoading === "remove"} className="qa-btn-outline" style={{ padding: '8px 16px', fontSize: 12.5, borderColor: C.redBorder, color: '#dc2626', background: C.redBg }}>Drop</button>
                                        </form>
                                    </div>

                                </div>
                            </div>

                            {/* Master Public Announcement broadcast */}
                            <div className="card" style={{ padding: 24 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <span className="lbl" style={{ margin: 0 }}>Public Announcement Board (Displays on screens)</span>
                                    {(state?.announcement || initialQueue?.announcement) && !isEditingAnnouncement && (
                                        <span className="pill" style={{ background: C.greenBg, color: C.green }}>Transmitting</span>
                                    )}
                                </div>
                                {isEditingAnnouncement ? (
                                    <form onSubmit={handleUpdateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <textarea value={announcementInput} onChange={e => setAnnouncementInput(e.target.value)} placeholder="Broadcast delay or info..." disabled={isDisabled || actionLoading === "announcement"} className="ov-sel" style={{ minHeight: 80, resize: 'none' }} />
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button type="submit" disabled={isDisabled || actionLoading === "announcement"} className="qa-btn" style={{ fontSize: 12.5, padding: '8px 24px' }}>Commit Broadcast</button>
                                            <button type="button" onClick={() => setIsEditingAnnouncement(false)} disabled={isDisabled || actionLoading === "announcement"} className="qa-btn-outline" style={{ fontSize: 12.5, padding: '8px 24px' }}>Cancel</button>
                                        </div>
                                    </form>
                                ) : (
                                    <div>
                                        {(state?.announcement ?? initialQueue?.announcement) ? (
                                            <div style={{ padding: 16, background: C.slateBg, borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, color: C.textSub, whiteSpace: 'pre-wrap', lineHeight: 1.6, marginBottom: 12 }}>
                                                {state?.announcement ?? initialQueue?.announcement}
                                            </div>
                                        ) : (
                                            <p style={{ fontSize: 13, color: C.textSub, opacity: 0.6, margin: '0 0 16px 0', fontStyle: 'italic' }}>No active network broadcast.</p>
                                        )}
                                        <button onClick={() => setIsEditingAnnouncement(true)} disabled={isDisabled} className="qa-btn-outline" style={{ padding: '8px 16px', fontSize: 12.5 }}>
                                            {(state?.announcement ?? initialQueue?.announcement) ? "Update Transmission" : "Draft Broadcast"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* List Column (Right) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {!isStaff && (
                                <QueueQRCode queueId={queueId} queueName={state?.queue_name || "Queue"} isCollapsible={true} />
                            )}

                            {/* Waiting Array */}
                            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.borderLight}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                        <span className="lbl" style={{ margin: 0, color: C.text }}>Waiting Array</span>
                                        <span className="pill" style={{ background: C.brandLight, color: C.brand }}>{state?.waiting_count ?? 0} Listed</span>
                                    </div>
                                    <input type="text" placeholder="Search array matrix..." value={waitingSearch} onChange={e => setWaitingSearch(e.target.value)} className="ov-sel" style={{ padding: '8px 12px', fontSize: 12.5 }} />
                                </div>
                                <div style={{ overflowY: 'auto', maxHeight: 380 }}>
                                    {paginatedWaiting.length > 0 ? (
                                        <table className="qtable">
                                            <tbody>
                                                {paginatedWaiting.map(t => (
                                                    <tr key={t.id} className="group">
                                                        <td style={{ padding: '12px 24px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                    <div className="tnum" style={{ fontSize: 16, fontWeight: 800, color: C.text, width: 44 }}>{state?.prefix || ""}{t.token_number}</div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <span style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{t.customer_name || "Anonymous"}</span>
                                                                        <span style={{ fontSize: 11, fontWeight: 500, color: C.textSub, fontFamily: "'JetBrains Mono', monospace" }}>{t.customer_phone || "No Relay"}</span>
                                                                    </div>
                                                                </div>
                                                                <button onClick={() => setTokenToRemove({ id: t.id, number: t.token_number })} className="qa-btn" style={{ padding: '4px 8px', fontSize: 10, background: C.redBg, color: C.red, boxShadow: 'none', opacity: 0, pointerEvents: 'none' }} onMouseEnter={(e) => { e.currentTarget.style.background = C.redBorder; }} onMouseLeave={(e) => { e.currentTarget.style.background = C.redBg; }} aria-label="Drop" title="Drop token">Drop</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div style={{ padding: 48, textAlign: 'center' }}>
                                            <p style={{ fontSize: 13.5, color: C.textMuted, fontWeight: 500, margin: 0 }}>Array empty. Zero entities waiting.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* History Archive */}
                            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.borderLight}` }}>
                                    <span className="lbl" style={{ margin: '0 0 16px 0', color: C.text }}>Terminal Archive</span>
                                    <input type="text" placeholder="Search historical logs..." value={recentSearch} onChange={e => setRecentSearch(e.target.value)} className="ov-sel" style={{ padding: '8px 12px', fontSize: 12.5 }} />
                                </div>
                                <div style={{ overflowY: 'auto', maxHeight: 380 }}>
                                    {paginatedRecent.length > 0 ? (
                                        <table className="qtable">
                                            <tbody>
                                                {paginatedRecent.map((t, i) => (
                                                    <RecentTokenRow key={`${t.token_number}-${i}`} token={t} prefix={state?.prefix || ""} />
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div style={{ padding: 48, textAlign: 'center' }}>
                                            <p style={{ fontSize: 13.5, color: C.textMuted, fontWeight: 500, margin: 0 }}>Cache empty. No logs recovered.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </main>
            </div>

            <ConfirmModal isOpen={showSkipConfirm} title="Bypass Entity?" message={`Executing bypass on token ${state?.prefix || ""}${state?.current_serving || 0}. Entity will be flagged as skipped.`} confirmLabel="Execute Bypass" confirmVariant="danger" onConfirm={handleConfirmSkip} onCancel={() => setShowSkipConfirm(false)} isLoading={actionLoading === "skip"} />
            <ConfirmModal isOpen={showDeleteConfirm} title="Drop Architecture" message={`Initiate destructive wipe on "${state?.queue_name || "queue"}". All metrics dissolved.`} confirmLabel="Initialize Wipe" confirmVariant="danger" onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} isLoading={deleting} />
            <ConfirmModal isOpen={showResetConfirm} title="Flush State Array" message={`Flush variables for "${state?.queue_name || "queue"}". Sequence registers revert to 0.`} confirmLabel="Execute Flush" confirmVariant="danger" onConfirm={handleReset} onCancel={() => setShowResetConfirm(false)} isLoading={resetting} />
            <ConfirmModal isOpen={!!tokenToRemove} title="Drop External Entity" message={`Purge ${state?.prefix || ""}${tokenToRemove?.number} off sequence array?`} confirmLabel="Execute Drop" confirmVariant="danger" onConfirm={handleConfirmRemove} onCancel={() => setTokenToRemove(null)} isLoading={actionLoading === "remove"} />
        </>
    );
}

const RecentTokenRow = React.memo(function RecentTokenRow({ token: t, prefix }: { token: RecentToken; prefix: string; }) {
    const STATUS_UI: Record<string, { bg: string, color: string }> = {
        serving: { bg: C.blueBg, color: C.blue },
        done: { bg: C.greenBg, color: C.green },
        skipped: { bg: C.slateBg, color: C.textSub },
        deleted: { bg: C.redBg, color: C.red },
        waiting: { bg: C.amberBg, color: C.amber }
    };
    const s = STATUS_UI[t.status] || STATUS_UI.skipped;

    return (
        <tr className="trow">
            <td style={{ padding: '12px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="tnum" style={{ fontSize: 16, fontWeight: 800, color: C.text, width: 44 }}>{prefix}{t.token_number}</div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{t.customer_name || "Anonymous"}</span>
                            <span style={{ fontSize: 11, fontWeight: 500, color: C.textSub, fontFamily: "'JetBrains Mono', monospace" }}>{t.served_at ? new Date(t.served_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                        </div>
                    </div>
                    <span className="pill" style={{ background: s.bg, color: s.color, border: `1px solid ${C.border}` }}>{t.status}</span>
                </div>
            </td>
        </tr>
    );
});
