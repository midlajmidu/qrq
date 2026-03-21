"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { SessionResponse, QueueResponse, TokenHistoryItem, AnalyticsOverview } from "@/types/api";

function formatDate(dateStr: string): string {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function formatTime(isoStr: string | null): string {
    if (!isoStr) return "—";
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Design Tokens ────────────────────────────────────────────────
const C = {
  // bg
  pageBg:     "#f7f8fa",
  cardBg:     "#ffffff",
  cardBgAlt:  "#fbfcfd",
  // borders
  border:     "#e8eaef",
  borderHov:  "#c4ccd8",
  borderLight:"#f1f2f5",
  // text
  text:       "#0f1729",
  textSub:    "#475569",
  textMuted:  "#8b95a9",
  // brand
  brand:      "#4f46e5",
  brandDark:  "#4338ca",
  brandLight: "#eef2ff",
  brandBorder:"#c7d2fe",
  brandGlow:  "rgba(79,70,229,.10)",
  // semantic – slightly muted for calm feel
  blue:       "#3b82f6", blueBg: "#eff6ff",   blueBorder: "#bfdbfe",
  green:      "#10b981", greenBg: "#ecfdf5",   greenBorder:"#a7f3d0",
  amber:      "#f59e0b", amberBg: "#fffbeb",   amberBorder:"#fde68a",
  red:        "#ef4444", redBg:   "#fef2f2",   redBorder:  "#fecaca",
  violet:     "#7c3aed", violetBg:"#f5f3ff",
  slate:      "#64748b", slateBg: "#f8fafc",
};

// ─── Global Styles ────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  .ov {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: ${C.text};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* ── Card ── */
  .card {
    background: ${C.cardBg};
    border: 1px solid ${C.border};
    border-radius: 14px;
    box-shadow:
      0 0 0 1px rgba(0,0,0,.02),
      0 1px 2px rgba(0,0,0,.03),
      0 2px 8px rgba(0,0,0,.025);
    transition: box-shadow .25s cubic-bezier(.4,0,.2,1), border-color .25s ease;
  }
  .card:hover {
    box-shadow:
      0 0 0 1px rgba(0,0,0,.03),
      0 4px 12px rgba(0,0,0,.06),
      0 8px 28px rgba(0,0,0,.04);
    border-color: ${C.borderHov};
  }

  /* ── Metric card lift ── */
  .metric-card { position: relative; }
  .metric-card::before {
    content: '';
    position: absolute; inset: 0;
    border-radius: 14px;
    opacity: 0;
    transition: opacity .25s cubic-bezier(.4,0,.2,1);
    box-shadow: 0 8px 32px rgba(79,70,229,.10);
    pointer-events: none;
  }
  .metric-card:hover { transform: none; }
  .metric-card:hover::before { opacity: 1; }

  /* ── Select ── */
  .ov-sel {
    appearance: none;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    color: #0f172a;
    border-radius: 8px;
    padding: 9px 34px 9px 12px;
    font-size: 13px; font-weight: 500;
    font-family: 'Inter', sans-serif;
    cursor: pointer; min-width: 172px;
    box-shadow: 0 1px 2px rgba(0,0,0,.03);
    transition: all .2s cubic-bezier(.4,0,.2,1);
  }
  .ov-sel:hover:not(:disabled) {
    border-color: #cbd5e1;
    background: #f8fafc;
    box-shadow: 0 2px 4px rgba(0,0,0,.04);
  }
  .ov-sel:focus {
    outline: none;
    border-color: #818cf8;
    box-shadow: 0 0 0 3px rgba(129,140,248,.15), 0 1px 2px rgba(0,0,0,.03);
    background: #ffffff;
  }
  .ov-sel:disabled { opacity: .4; cursor: not-allowed; }

  /* ── Quick Action btn ── */
  .qa-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 9px 16px; font-size: 12.5px; font-weight: 500;
    font-family: 'Inter', sans-serif; color: ${C.textSub};
    background: ${C.cardBg}; border: 1px solid ${C.border};
    border-radius: 10px; cursor: pointer; text-decoration: none;
    box-shadow: 0 1px 2px rgba(0,0,0,.04);
    transition: all .22s ease;
  }
  .qa-btn:hover {
    border-color: ${C.brandBorder}; color: ${C.brand};
    background: ${C.brandLight};
    box-shadow: 0 2px 8px ${C.brandGlow};
  }

  /* ── Icon badge ── */
  .icon-badge {
    display: flex; align-items: center; justify-content: center;
    border-radius: 11px; flex-shrink: 0;
  }

  /* ── Badge chip ── */
  .chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 8px;
    font-size: 10.5px; font-weight: 600; letter-spacing: .03em; text-transform: uppercase;
    font-family: 'Inter', sans-serif;
  }

  /* ── Pill ── */
  .pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 99px;
    font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
  }

  /* ── Table row ── */
  .trow { transition: background .2s ease, transform .2s ease, box-shadow .2s ease; }
  .trow:hover { background: linear-gradient(90deg, #f8f9ff, #fbfcfe); }

  /* ── Pagination btn ── */
  .pg-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 16px; font-size: 12.5px; font-weight: 500;
    font-family: 'Inter', sans-serif; color: ${C.textSub};
    background: ${C.cardBg}; border: 1px solid ${C.border};
    border-radius: 10px; cursor: pointer;
    box-shadow: 0 1px 2px rgba(0,0,0,.04);
    transition: all .22s ease;
  }
  .pg-btn:hover:not(:disabled) {
    border-color: ${C.brandBorder}; color: ${C.brand};
    background: ${C.brandLight};
    box-shadow: 0 2px 6px ${C.brandGlow};
  }
  .pg-btn:disabled { opacity: .3; cursor: not-allowed; }

  /* ── Mono ── */
  .mono { font-family: 'JetBrains Mono', 'Geist Mono', monospace; }

  /* ── Label ── */
  .lbl {
    font-size: 10.5px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase;
    color: ${C.textMuted};
    font-family: 'Inter', sans-serif;
  }

  /* ── Card header strip ── */
  .card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 24px; border-bottom: 1px solid ${C.border};
    background: linear-gradient(180deg, #fafbfd 0%, ${C.cardBg} 100%);
    border-radius: 14px 14px 0 0;
  }

  /* ── Per-Queue Table (Reused for History) ── */
  .qtable { width: 100%; border-collapse: collapse; text-align: left; }
  .qtable th {
    padding: 12px 16px; font-size: 11px; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase;
    color: ${C.textMuted}; border-bottom: 1px solid ${C.border};
    background: linear-gradient(180deg, #fafbfd, ${C.slateBg});
    font-family: 'Inter', sans-serif;
  }
  .qtable td { padding: 14px 16px; font-size: 13px; font-weight: 500; color: ${C.text}; border-bottom: 1px solid ${C.borderLight}; }
  .qtable tbody tr { transition: background .12s ease; }
  .qtable tbody tr:hover td { background: #f8f9ff; }

  /* ── Tabular Nums ── */
  .tnum { font-variant-numeric: tabular-nums; }
`;

export default function HistoryPage() {
    // Filters
    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [queues, setQueues] = useState<QueueResponse[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string>("");
    const [selectedQueueId, setSelectedQueueId] = useState<string>("");

    // Data
    const [history, setHistory] = useState<TokenHistoryItem[]>([]);
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const PAGE_SIZE = 20;

    // Load initial sessions
    useEffect(() => {
        api.listSessions(100, 0).then(res => {
            const data = res.items;
            setSessions(data || []);
            if (data?.length > 0 && !selectedSessionId) {
                setSelectedSessionId(data[0].id);
            }
        }).finally(() => setIsLoading(false));
    }, [selectedSessionId]);

    // Load queues when session changes
    useEffect(() => {
        if (selectedSessionId) {
            api.listSessionQueues(selectedSessionId, 100, 0).then(res => {
                const data = res.items;
                setQueues(data || []);
                setSelectedQueueId(""); // Reset queue selection
                setPage(1); // Reset to first page
            });
        }
    }, [selectedSessionId]);

    const loadHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const [historyData, overviewData] = await Promise.all([
                api.getHistory({
                    sessionId: selectedSessionId || undefined,
                    queueId: selectedQueueId || undefined,
                    limit: PAGE_SIZE,
                    offset: (page - 1) * PAGE_SIZE
                }),
                api.getOverview(selectedSessionId || undefined, selectedQueueId || undefined)
            ]);
            setHistory(historyData.items);
            setTotal(historyData.total);
            setOverview(overviewData);
        } catch (err) {
            console.error("Failed to load history", err);
        } finally {
            setIsLoading(false);
        }
    }, [selectedSessionId, selectedQueueId, page]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    return (
        <>
            <style>{STYLES}</style>
            <div className="ov">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {/* ── Header ── */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div className="icon-badge" style={{ background: C.brandLight, color: C.brand, width: 28, height: 28 }}>
                                <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <span style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '.06em', color: C.brand, textTransform: 'uppercase' }}>
                                Unified Logs
                            </span>
                        </div>
                        <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-.02em', color: C.text, margin: '0 0 6px 0' }}>
                            Queue History
                        </h1>
                        <p style={{ fontSize: '14px', color: C.textSub, margin: 0, maxWidth: '500px', lineHeight: 1.5 }}>
                            Review past sessions, tokens, and detailed performance metrics.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div>
                            <div className="lbl" style={{ marginBottom: 6, paddingLeft: 2 }}>Session</div>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={selectedSessionId}
                                    onChange={(e) => setSelectedSessionId(e.target.value)}
                                    className="ov-sel"
                                >
                                    <option value="">All Sessions</option>
                                    {sessions.map(s => (
                                        <option key={s.id} value={s.id}>{formatDate(s.session_date)} {s.title ? `(${s.title})` : ""}</option>
                                    ))}
                                </select>
                                <svg width={14} height={14} fill="none" stroke={C.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                    <polyline points="6 9 12 15 18 9"/>
                                </svg>
                            </div>
                        </div>

                        <div>
                            <div className="lbl" style={{ marginBottom: 6, paddingLeft: 2 }}>Queue</div>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={selectedQueueId}
                                    onChange={(e) => setSelectedQueueId(e.target.value)}
                                    className="ov-sel"
                                    disabled={!selectedSessionId}
                                >
                                    <option value="">All Queues</option>
                                    {queues.map(q => (
                                        <option key={q.id} value={q.id}>{q.name}</option>
                                    ))}
                                </select>
                                <svg width={14} height={14} fill="none" stroke={C.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                    <polyline points="6 9 12 15 18 9"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Overview Stats ── */}
                {overview && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                        <StatCard title="Total Served" value={overview.status_counts.served} icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" color="green" />
                        <StatCard title="Total Missed" value={overview.status_counts.cancelled} icon="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" color="red" />
                        <StatCard title="Avg. Wait Time" value={overview.timings.avg_waiting_time} icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" color="amber" />
                        <StatCard title="Avg. Service Time" value={overview.timings.avg_served_time} icon="M13 10V3L4 14h7v7l9-11h-7z" color="brand" />
                    </div>
                )}

                {/* ── Table Area ── */}
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width={16} height={16} fill="none" stroke={C.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>
                            <h2 style={{ fontSize: '14px', fontWeight: 600, color: C.text, margin: 0 }}>Historical Tokens</h2>
                        </div>
                        <div className="lbl tnum">
                            {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, total)} OF {total}
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="qtable">
                            <thead>
                                <tr>
                                    <th>Token</th>
                                    <th>Customer</th>
                                    <th>Queue</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Served</th>
                                    <th>Completed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && history.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: C.textMuted }}>
                                            Loading history...
                                        </td>
                                    </tr>
                                ) : history.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: '48px' }}>
                                            <div style={{ color: C.textMuted, fontSize: '14px', fontWeight: 500 }}>No history found</div>
                                            <div style={{ color: C.textMuted, fontSize: '13px', marginTop: '4px' }}>Try adjusting your applied filters.</div>
                                        </td>
                                    </tr>
                                ) : (
                                    history.map((item) => (
                                        <tr key={item.id}>
                                            <td style={{ fontWeight: 700, color: C.text }}>
                                                {item.queue_prefix}{item.token_number}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600, color: C.text }}>{item.customer_name}</div>
                                                <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>
                                                    {item.customer_phone}{item.customer_age ? ` • ${item.customer_age}y` : ""}
                                                </div>
                                            </td>
                                            <td style={{ color: C.textSub }}>{item.queue_name}</td>
                                            <td><StatusBadge status={item.status} /></td>
                                            <td className="tnum" style={{ color: C.textSub }}>{formatTime(item.created_at)}</td>
                                            <td className="tnum" style={{ color: C.textSub }}>{formatTime(item.served_at)}</td>
                                            <td className="tnum" style={{ color: C.textSub }}>{formatTime(item.completed_at)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Bottom Strip */}
                    {total > PAGE_SIZE && (
                        <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', borderTop: `1px solid ${C.borderLight}` }}>
                            <button
                                className="pg-btn"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                                Previous
                            </button>
                            <button
                                className="pg-btn"
                                onClick={() => setPage(p => p + 1)}
                                disabled={page * PAGE_SIZE >= total}
                            >
                                Next
                                <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </>
    );
}

function StatCard({ title, value, icon, color = "blue" }: { title: string; value: string | number; icon: string; color?: keyof typeof C }) {
    // Dynamic color references based on token
    const cPrimary     = C[color as keyof typeof C] || C.blue;
    const cBg          = C[`${color}Bg` as keyof typeof C] || C.blueBg;
    const cBorder      = C[`${color}Border` as keyof typeof C] || C.blueBorder;

    return (
        <div className="card metric-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                    <div className="lbl" style={{ marginBottom: '6px' }}>{title}</div>
                    <div className="tnum" style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-.02em', color: C.text, lineHeight: 1 }}>
                        {value}
                    </div>
                </div>
                <div className="icon-badge" style={{ width: 38, height: 38, background: cBg, color: cPrimary, border: `1px solid ${cBorder}` }}>
                    <svg width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d={icon} />
                    </svg>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const s = status.toLowerCase();
    
    let cBg = C.slateBg, cText = C.textSub, cBorder = C.border;
    if (s === "done")         { cBg = C.greenBg; cText = C.green; cBorder = C.greenBorder; }
    else if (s === "serving") { cBg = C.blueBg;  cText = C.blue;  cBorder = C.blueBorder; }
    else if (s === "waiting") { cBg = C.amberBg; cText = C.amber; cBorder = C.amberBorder; }
    else if (s === "deleted") { cBg = C.redBg;   cText = C.red;   cBorder = C.redBorder; }

    return (
        <span className="pill" style={{ background: cBg, color: cText, border: `1px solid ${cBorder}` }}>
            {status}
        </span>
    );
}
