"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { api } from "@/lib/api";
import type { AnalyticsOverview, SessionResponse, QueueResponse } from "@/types/api";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

// ─── Helpers ─────────────────────────────────────────────────────
function timeToSeconds(t: string): number {
  const p = t.split(":").map(Number);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return p[0] || 0;
}
function formatDuration(t: string): string {
  const s = timeToSeconds(t);
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), sec = s % 60;
  if (m < 60) return sec ? `${m}m ${sec}s` : `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function statusLabel(act: { number: number; status: string; queue: string }): string {
  const map: Record<string, string> = {
    waiting: `#${act.number} joined ${act.queue}`,
    serving: `#${act.number} called to service`,
    done:    `#${act.number} service completed`,
    skipped: `#${act.number} cancelled`,
    deleted: `#${act.number} cancelled`,
  };
  return map[act.status] ?? `#${act.number} — ${act.status}`;
}

// ─── SVG Icon primitives ──────────────────────────────────────────
type IconProps = { size?: number; color?: string; strokeWidth?: number };

const Icons = {
  BarChart3: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
    </svg>
  ),
  Users: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Clock: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  CheckCircle2: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
    </svg>
  ),
  XCircle: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
    </svg>
  ),
  Play: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
    </svg>
  ),
  PlusCircle: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>
    </svg>
  ),
  UserPlus: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>
    </svg>
  ),
  QrCode: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>
    </svg>
  ),
  Download: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
    </svg>
  ),
  ArrowRight: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
    </svg>
  ),
  ArrowLeft: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
    </svg>
  ),
  ChevronDown: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  ),
  ChevronRight: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
  Megaphone: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 19-9-9 19-2-8-8-2z"/>
    </svg>
  ),
  Zap: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
    </svg>
  ),
  Activity: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  TrendingUp: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  ),
  TrendingDown: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>
    </svg>
  ),
  AlertTriangle: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>
    </svg>
  ),
  AlertCircle: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
    </svg>
  ),
  Clipboard: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    </svg>
  ),
  Radio: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
    </svg>
  ),
  RefreshCw: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
    </svg>
  ),
  Settings2: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>
    </svg>
  ),
  Wifi: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" x2="12.01" y1="20" y2="20"/>
    </svg>
  ),
  BarChart2: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>
    </svg>
  ),
  CheckSquare: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  Filter: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  ),
  X: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
    </svg>
  ),
  Table2: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
    </svg>
  ),
};

// ─── Design Tokens ────────────────────────────────────────────────
const C = {
  // bg
  pageBg:     "#f0f2f5",
  cardBg:     "#ffffff",
  // borders
  border:     "#e4e8ef",
  borderHov:  "#c7d0dd",
  // text
  text:       "#0d1117",
  textSub:    "#4b5563",
  textMuted:  "#9ca3af",
  // brand
  brand:      "#4f46e5",
  brandLight: "#eef2ff",
  brandBorder:"#c7d2fe",
  // semantic
  blue:       "#2563eb", blueBg: "#eff6ff",
  green:      "#059669", greenBg: "#ecfdf5",
  amber:      "#d97706", amberBg: "#fffbeb",
  red:        "#dc2626", redBg:   "#fef2f2",
  violet:     "#7c3aed", violetBg:"#f5f3ff",
  slate:      "#64748b", slateBg: "#f8fafc",
};

// ─── Global Styles ────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500;600&display=swap');

  .ov { font-family: 'Geist', sans-serif; color: ${C.text}; }

  /* ── Card ── */
  .card {
    background: ${C.cardBg};
    border: 1px solid ${C.border};
    border-radius: 12px;
    box-shadow: 0 1px 2px rgba(0,0,0,.04), 0 1px 4px rgba(0,0,0,.03);
    transition: box-shadow .18s ease, border-color .18s ease, transform .18s ease;
  }
  .card:hover {
    box-shadow: 0 4px 20px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04);
    border-color: ${C.borderHov};
  }

  /* ── Metric card lift ── */
  .metric-card:hover { transform: translateY(-1px); }

  /* ── Select ── */
  .ov-sel {
    appearance: none; background: ${C.cardBg};
    border: 1px solid ${C.border}; color: ${C.text};
    border-radius: 8px; padding: 8px 32px 8px 11px;
    font-size: 13px; font-weight: 500; font-family: 'Geist', sans-serif;
    cursor: pointer; min-width: 168px;
    box-shadow: 0 1px 2px rgba(0,0,0,.04);
    transition: border-color .15s, box-shadow .15s;
  }
  .ov-sel:focus   { outline: none; border-color: ${C.brand}; box-shadow: 0 0 0 3px rgba(79,70,229,.1); }
  .ov-sel:disabled{ opacity: .42; cursor: not-allowed; }

  /* ── Quick Action btn ── */
  .qa-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 13px; font-size: 12.5px; font-weight: 500;
    font-family: 'Geist', sans-serif; color: ${C.textSub};
    background: ${C.cardBg}; border: 1px solid ${C.border};
    border-radius: 8px; cursor: pointer; text-decoration: none;
    box-shadow: 0 1px 2px rgba(0,0,0,.04);
    transition: all .15s;
  }
  .qa-btn:hover { border-color: ${C.brandBorder}; color: ${C.brand}; background: ${C.brandLight}; box-shadow: 0 2px 8px rgba(79,70,229,.1); }

  /* ── Icon badge ── */
  .icon-badge {
    display: flex; align-items: center; justify-content: center;
    border-radius: 10px; flex-shrink: 0;
  }

  /* ── Badge chip ── */
  .chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 9px; border-radius: 6px;
    font-size: 10.5px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase;
    font-family: 'Geist', sans-serif;
  }

  /* ── Pill ── */
  .pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 2px 8px; border-radius: 99px;
    font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  }

  /* ── Table row ── */
  .trow { transition: background .1s; }
  .trow:hover { background: #fafbfc; }

  /* ── Pagination btn ── */
  .pg-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; font-size: 12px; font-weight: 500;
    font-family: 'Geist', sans-serif; color: ${C.textSub};
    background: ${C.cardBg}; border: 1px solid ${C.border};
    border-radius: 8px; cursor: pointer;
    box-shadow: 0 1px 2px rgba(0,0,0,.04);
    transition: all .15s;
  }
  .pg-btn:hover:not(:disabled) { border-color: ${C.brandBorder}; color: ${C.brand}; background: ${C.brandLight}; }
  .pg-btn:disabled { opacity: .35; cursor: not-allowed; }

  /* ── Mono ── */
  .mono { font-family: 'Geist Mono', monospace; }

  /* ── Label ── */
  .lbl { font-size: 10.5px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; color: ${C.textMuted}; }

  /* ── Progress bar ── */
  .bar-fill { height: 100%; border-radius: 99px; transition: width .75s cubic-bezier(.4,0,.2,1); }

  /* ── Shimmer ── */
  .shimmer {
    border-radius: 8px;
    background: linear-gradient(90deg, #f1f4f8 0%, #e8ecf2 50%, #f1f4f8 100%);
    background-size: 200% 100%;
    animation: sh 1.4s ease-in-out infinite;
  }
  @keyframes sh { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  /* ── Live pulse ── */
  .live-dot { animation: ldot 2.2s ease-in-out infinite; }
  @keyframes ldot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.7)} }

  /* ── Fade in ── */
  .fade-in { animation: fin .28s ease both; }
  @keyframes fin { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }

  /* ── Section separator ── */
  .section-label {
    font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    color: ${C.textMuted}; display: flex; align-items: center; gap: 8px;
  }
  .section-label::after {
    content:''; flex:1; height:1px; background: ${C.border};
  }

  /* ── View more link arrow anim ── */
  .view-more:hover .arr { transform: translateX(3px); }
  .arr { transition: transform .15s; display: inline-flex; }

  /* ── Refresh spin ── */
  .spin { animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Auto-refresh bar ── */
  .refresh-bar {
    display: flex; align-items: center; gap: 10px;
    padding: 7px 14px;
    background: ${C.cardBg}; border: 1px solid ${C.border};
    border-radius: 9px; font-size: 12px; color: ${C.textMuted};
    box-shadow: 0 1px 2px rgba(0,0,0,.04);
  }

  /* ── Hourly bar ── */
  .hbar { transition: opacity .15s; }
  .hbar:hover { opacity: .75; cursor: default; }

  /* ── Tabular Nums ── */
  .tnum { font-variant-numeric: tabular-nums; }

  /* ── Feed Filter Tabs ── */
  .feed-tabs { display: flex; gap: 6px; padding: 4px; background: ${C.slateBg}; border: 1px solid ${C.border}; border-radius: 8px; width: fit-content; }
  .feed-tab {
    display: flex; align-items: center; gap: 6px; padding: 6px 12px;
    font-size: 13px; font-weight: 500; color: ${C.textSub};
    border: none; background: transparent; border-radius: 5px; cursor: pointer; transition: all .15s;
    font-family: inherit;
  }
  .feed-tab:hover { color: ${C.text}; }
  .feed-tab.active { background: #fff; color: ${C.text}; box-shadow: 0 1px 3px rgba(0,0,0,.08); font-weight: 600; }
  .feed-tab .badge {
    background: ${C.border}; color: ${C.textSub}; font-size: 11px; font-weight: 600;
    padding: 2px 6px; border-radius: 12px;
  }
  .feed-tab.active .badge { background: ${C.brandLight}; color: ${C.brand}; }

  /* ── Activity Drawer ── */
  .drawer-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,.2);
    backdrop-filter: blur(2px); z-index: 100;
    animation: fadeIn .2s ease-out forwards;
  }
  .drawer-panel {
    position: fixed; top: 0; right: 0; bottom: 0; width: 400px;
    background: ${C.cardBg}; box-shadow: -4px 0 24px rgba(0,0,0,.1);
    z-index: 101; display: flex; flex-direction: column;
    animation: slideLeft .2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  @keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
  .drawer-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px; border-bottom: 1px solid ${C.border};
  }
  .drawer-body { flex: 1; overflow-y: auto; padding: 24px; }

  /* ── Per-Queue Table ── */
  .qtable { width: 100%; border-collapse: collapse; text-align: left; }
  .qtable th { padding: 12px 16px; font-size: 12px; font-weight: 600; color: ${C.textSub}; border-bottom: 1px solid ${C.border}; background: ${C.slateBg}; }
  .qtable td { padding: 14px 16px; font-size: 13px; font-weight: 500; color: ${C.text}; border-bottom: 1px solid ${C.border}; }
  .qtable tbody tr:hover td { background: #f8fafc; }
  
  /* ── Metric Skeleton ── */
  .card-skeleton .shim {
    background: #e2e8f0; border-radius: 4px; overflow: hidden; position: relative;
  }
  .card-skeleton .shim::after {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

// ════════════════════════════════════════════════════════════════
export default function OverviewPage() {
  const [overview, setOverview]           = useState<AnalyticsOverview | null>(null);
  const [prevOverview, setPrevOverview]   = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading]         = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const { user }    = useAuth();
  const dashBase    = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";

  const [sessions, setSessions]               = useState<SessionResponse[]>([]);
  const [queues, setQueues]                   = useState<QueueResponse[]>([]);
  const [liveQueues, setLiveQueues]           = useState<QueueResponse[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedQueue, setSelectedQueue]     = useState("");
  const [recentPage, setRecentPage]           = useState(1);
  const LIMIT = 10;

  // ── New State ─────────────────────────────────────────────────
  const [feedFilter, setFeedFilter]           = useState<"all" | "waiting" | "serving" | "done">("all");
  const [drawerAct, setDrawerAct]             = useState<any | null>(null);

  // ── Auto-refresh & abort ──────────────────────────────────────
  const abortRef        = useRef<AbortController | null>(null);
  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const REFRESH_SECS    = 20;
  const [autoRefresh, setAutoRefresh]     = useState(true);
  const [lastUpdated, setLastUpdated]     = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo]       = useState(0);
  const [isRefreshing, setIsRefreshing]   = useState(false); // silent background refresh

  const loadData = useCallback(async (silent = false) => {
    // Cancel any previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await api.getOverview(
        selectedSession || undefined, selectedQueue || undefined,
        LIMIT, (recentPage - 1) * LIMIT,
        { signal: controller.signal }
      );
      // Ignore if this request was aborted (a newer one is in flight)
      if (controller.signal.aborted) return;
      setOverview(data);
      setLastUpdated(new Date());
      setSecondsAgo(0);
    } catch (e: unknown) {
      if ((e as { name?: string })?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Failed to load overview data");
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [selectedSession, selectedQueue, recentPage]);

  useEffect(() => {
    api.listSessions(100, 0).then(res => {
      setSessions(res.items);
      if (res.items.length >= 2)
        api.getOverview(res.items[1].id, undefined, 0, 0).then(setPrevOverview).catch(() => {});
      if (res.items.length >= 1)
        api.listSessionQueues(res.items[0].id, 100, 0).then(r => setLiveQueues(r.items)).catch(() => {});
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedSession) {
      api.listSessionQueues(selectedSession, 100, 0).then(r => setQueues(r.items)).catch(() => setQueues([]));
    } else { setQueues([]); setSelectedQueue(""); }
    setRecentPage(1);
  }, [selectedSession]);

  useEffect(() => { loadData(); }, [loadData, recentPage]);

  // ── Auto-refresh interval ─────────────────────────────────────
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!autoRefresh) return;
    intervalRef.current = setInterval(() => loadData(true), REFRESH_SECS * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, loadData]);

  // ── "Updated Ns ago" ticker ───────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      if (lastUpdated) setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  const insights = useMemo(() => {
    if (!overview) return null;
    const hourly = overview.charts?.hourly || [];
    const busiestHour = hourly.length ? hourly.reduce((mx, h) => h.visits > mx.visits ? h : mx, hourly[0]) : null;
    const maxVisits = hourly.length ? Math.max(...hourly.map(h => h.visits)) : 0;
    return {
      busiestHour: busiestHour?.hour ?? "—",
      busiestVisits: busiestHour?.visits ?? 0,
      longestWait: overview.timings?.max_waiting_time || "00:00:00",
      avgService:  overview.timings?.avg_served_time  || "00:00:00",
      peakWaiting: overview.status_counts?.waiting ?? 0,
      hourly,
      maxVisits,
    };
  }, [overview]);

  const updatedLabel = lastUpdated
    ? secondsAgo < 5  ? "Just now"
    : secondsAgo < 60 ? `${secondsAgo}s ago`
    : `${Math.floor(secondsAgo / 60)}m ago`
    : null;

  const mkTrend = (cur: number, prev?: number) => {
    if (!prev) return null;
    const d = cur - prev; if (!d) return null;
    return { up: d > 0, pct: Math.abs(Math.round((d / prev) * 100)) };
  };

  const wAvg = timeToSeconds(overview?.timings?.avg_waiting_time || "0");
  const wMax = timeToSeconds(overview?.timings?.max_waiting_time || "0");
  const sAvg = timeToSeconds(overview?.timings?.avg_served_time  || "0");
  const sMax = timeToSeconds(overview?.timings?.max_served_time  || "0");
  const wPct = wMax ? Math.round((wAvg / wMax) * 100) : 0;
  const sPct = sMax ? Math.round((sAvg / sMax) * 100) : 0;

  const queueStats = useMemo(() => {
    if (!overview?.recent_activity) return [];
    const map = new Map<string, { queue: string; waiting: number; served: number; total: number }>();
    for (const act of overview.recent_activity) {
      if (!map.has(act.queue)) map.set(act.queue, { queue: act.queue, waiting: 0, served: 0, total: 0 });
      const entry = map.get(act.queue)!;
      entry.total++;
      if (act.status === "waiting") entry.waiting++;
      if (act.status === "done" || act.status === "serving") entry.served++;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [overview]);

  const totalV = overview?.status_counts?.total ?? 0;
  const servedV = overview?.status_counts?.served ?? 0;
  const completionRate = totalV > 0 ? Math.round((servedV / totalV) * 100) : 0;
  const crColor = completionRate >= 90 ? C.green : (completionRate >= 75 ? C.amber : C.red);
  const crBg    = completionRate >= 90 ? C.greenBg : (completionRate >= 75 ? C.amberBg : C.redBg);
  const crBorder= completionRate >= 90 ? "#a7f3d0" : (completionRate >= 75 ? "#fde68a" : "#fecaca");
  const wWarn = wMax >= wAvg * 2 && wAvg > 0;
  const sWarn = sMax >= sAvg * 2 && sAvg > 0;
  const activeQueues = liveQueues.filter(q => q.is_active);

  // ── Global drawer escape ──────────────────────────────
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerAct(null); };
    if (drawerAct) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [drawerAct]);

  return (
    <>
      <style>{STYLES}</style>
      <div className="ov" style={{ minHeight: "100vh", background: C.pageBg, paddingBottom: 64 }}>

        {/* Top brand bar */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${C.brand} 0%, #818cf8 50%, #06b6d4 100%)` }} />

        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px 0" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

            {/* ══ HEADER CARD ═══════════════════════════════════════ */}
            <div className="card" style={{ padding: "24px 28px", position: "relative", overflow: "hidden" }}>
              {/* geometric accent top-right */}
              <div aria-hidden style={{
                position: "absolute", top: 0, right: 0, width: 240, height: 140,
                background: `radial-gradient(ellipse at 100% 0%, ${C.brandLight} 0%, transparent 70%)`,
                pointerEvents: "none",
              }} />
              <svg aria-hidden style={{ position: "absolute", top: 12, right: 20, opacity: .06, pointerEvents: "none" }}
                width="120" height="90" viewBox="0 0 120 90" fill="none">
                <circle cx="90" cy="0" r="60" fill={C.brand} />
                <circle cx="30" cy="90" r="40" fill={C.brand} />
              </svg>

              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
                {/* Left: title */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10 }}>
                    {/* brand icon */}
                    <div className="icon-badge" style={{ width: 38, height: 38, background: `linear-gradient(135deg, ${C.brand}, #818cf8)`, boxShadow: `0 3px 10px rgba(79,70,229,.3)` }}>
                      <Icons.BarChart3 size={18} color="#fff" strokeWidth={2} />
                    </div>
                    <div>
                      <span className="lbl" style={{ color: C.brand }}>Analytics Dashboard</span>
                    </div>
                  </div>
                  <h1 style={{ fontSize: "clamp(20px,2.4vw,26px)", fontWeight: 800, color: C.text, letterSpacing: "-.035em", lineHeight: 1.15, margin: 0 }}>
                    Organization Overview
                  </h1>
                  <p style={{ marginTop: 5, fontSize: 13.5, color: C.textSub, maxWidth: 430, lineHeight: 1.65, marginBottom: 0 }}>
                    Real-time performance metrics across all queues and sessions.
                  </p>
                </div>

                {/* Right: filters */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
                  {[
                    {
                      lbl: "Session", val: selectedSession, set: setSelectedSession, dis: false,
                      opts: <>
                        <option value="">All Sessions</option>
                        {sessions.map(s => (
                          <option key={s.id} value={s.id}>
                            {new Date(s.session_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {s.title ? ` — ${s.title}` : ""}
                          </option>
                        ))}
                      </>,
                    },
                    {
                      lbl: "Queue", val: selectedQueue, set: setSelectedQueue, dis: !selectedSession,
                      opts: <>
                        <option value="">All Queues</option>
                        {queues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                      </>,
                    },
                  ].map(f => (
                    <div key={f.lbl} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span className="lbl">{f.lbl}</span>
                      <div style={{ position: "relative" }}>
                        <select value={f.val} onChange={e => f.set(e.target.value)} disabled={f.dis} className="ov-sel">
                          {f.opts}
                        </select>
                        <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                          <Icons.ChevronDown size={13} color={C.textMuted} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ══ QUICK ACTIONS ════════════════════════════════════ */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div className="section-label" style={{ flex: 1 }}>Quick Actions</div>

                {/* ── Auto-refresh bar ── */}
                <div className="refresh-bar" style={{ marginLeft: 16, flexShrink: 0 }}>
                  {/* live indicator */}
                  {autoRefresh && !isRefreshing && (
                    <span className="live-dot" style={{ display: "block", width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                  )}
                  {isRefreshing && (
                    <span className="spin" style={{ display: "inline-flex" }}>
                      <Icons.RefreshCw size={12} color={C.brand} />
                    </span>
                  )}
                  {/* updated label */}
                  {updatedLabel && (
                    <span style={{ color: C.textMuted, fontSize: 11.5 }}>
                      Updated <strong style={{ color: C.textSub, fontWeight: 600 }}>{updatedLabel}</strong>
                    </span>
                  )}
                  {/* divider */}
                  <span style={{ width: 1, height: 12, background: C.border, flexShrink: 0 }} />
                  {/* manual refresh */}
                  <button
                    onClick={() => loadData(false)}
                    disabled={isLoading}
                    title="Refresh now"
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", fontSize: 11.5, fontWeight: 600, color: C.textSub, background: "transparent", border: "none", borderRadius: 6, cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? .4 : 1, transition: "color .15s", fontFamily: "'Geist',sans-serif" }}
                    onMouseEnter={e => (e.currentTarget.style.color = C.brand)}
                    onMouseLeave={e => (e.currentTarget.style.color = C.textSub)}
                  >
                    <span className={isLoading ? "spin" : ""} style={{ display: "inline-flex" }}>
                      <Icons.RefreshCw size={11} color="currentColor" />
                    </span>
                    Refresh
                  </button>
                  {/* divider */}
                  <span style={{ width: 1, height: 12, background: C.border, flexShrink: 0 }} />
                  {/* auto-refresh toggle */}
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
                    <span
                      role="switch"
                      aria-checked={autoRefresh}
                      onClick={() => setAutoRefresh(v => !v)}
                      style={{
                        display: "inline-block", width: 28, height: 16, borderRadius: 99,
                        background: autoRefresh ? C.brand : C.border,
                        position: "relative", transition: "background .2s", flexShrink: 0,
                      }}
                    >
                      <span style={{
                        position: "absolute", top: 2, left: autoRefresh ? 14 : 2,
                        width: 12, height: 12, borderRadius: "50%", background: "#fff",
                        transition: "left .2s", boxShadow: "0 1px 2px rgba(0,0,0,.2)",
                      }} />
                    </span>
                    <span style={{ fontSize: 11.5, color: C.textMuted, whiteSpace: "nowrap" }}>
                      Auto ({REFRESH_SECS}s)
                    </span>
                  </label>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[
                  { label: "Start Session",   Icon: Icons.Play,      href: `${dashBase}/sessions` },
                  { label: "Create Queue",    Icon: Icons.PlusCircle, href: `${dashBase}/queues`   },
                  { label: "Add Staff",       Icon: Icons.UserPlus,  href: `${dashBase}/staff`    },
                  { label: "Generate QR",     Icon: Icons.QrCode,    href: `${dashBase}/queues`   },
                  { label: "Download Report", Icon: Icons.Download,  href: `${dashBase}/history`  },
                ].map(a => (
                  <Link key={a.label} href={a.href} className="qa-btn">
                    <a.Icon size={13} color="currentColor" />
                    {a.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* ══ ERROR ════════════════════════════════════════════ */}
            {error && (
              <div role="alert" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: C.redBg, border: `1px solid #fecaca`, color: "#b91c1c", padding: "12px 18px", borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, fontWeight: 500 }}>
                  <Icons.AlertCircle size={16} color="#ef4444" /> {error}
                </div>
                <button onClick={() => loadData(false)} style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "6px 12px", background: "#fff", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 7, cursor: "pointer", fontFamily: "'Geist',sans-serif" }}>
                  <Icons.RefreshCw size={12} color="currentColor" /> Retry
                </button>
              </div>
            )}

            {/* ══ METRIC CARDS ═════════════════════════════════════ */}
            <div>
              <div className="section-label" style={{ marginBottom: 12 }}>Key Metrics</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
                <MetricCard
                  label="Visitors Today"       value={overview?.status_counts?.total     ?? 0}
                  Icon={Icons.Users}           trend={mkTrend(overview?.status_counts?.total ?? 0, prevOverview?.status_counts?.total)}
                  color={C.brand}             bg={C.brandLight}     border={C.brandBorder}
                  valueColor={C.brand}         isLoading={isLoading}
                />
                <MetricCard
                  label="Waiting Now"           value={overview?.status_counts?.waiting   ?? 0}
                  Icon={Icons.Clock}           trend={mkTrend(overview?.status_counts?.waiting ?? 0, prevOverview?.status_counts?.waiting)}
                  color={C.blue}              bg={C.blueBg}         border="#bfdbfe"
                  valueColor={C.blue}          pulse isLoading={isLoading}
                />
                <MetricCard
                  label="Served Today"          value={overview?.status_counts?.served    ?? 0}
                  Icon={Icons.CheckCircle2}    trend={mkTrend(overview?.status_counts?.served ?? 0, prevOverview?.status_counts?.served)}
                  color={C.green}             bg={C.greenBg}        border="#a7f3d0"
                  valueColor={C.green}         isLoading={isLoading}
                />
                <MetricCard
                  label="Cancelled / No-show"   value={overview?.status_counts?.cancelled ?? 0}
                  Icon={Icons.XCircle}         trend={mkTrend(overview?.status_counts?.cancelled ?? 0, prevOverview?.status_counts?.cancelled)}
                  color={C.slate}             bg={C.slateBg}        border={C.border}
                  valueColor={C.textSub}       muted isLoading={isLoading}
                />
                <MetricCard
                  label="Completion Rate"       value={completionRate} suffix="%"
                  Icon={Icons.CheckSquare}     trend={null}
                  color={crColor}             bg={crBg}             border={crBorder}
                  valueColor={crColor}         isLoading={isLoading}
                />
              </div>
            </div>

            {/* ══ HOURLY TRAFFIC CHART ═════════════════════════════ */}
            {insights && insights.hourly.length > 0 && (
              <div className="card" style={{ overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 22px", borderBottom: `1px solid ${C.border}`, background: "#fafbfc" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="icon-badge" style={{ width: 30, height: 30, background: C.brandLight }}>
                      <Icons.BarChart2 size={14} color={C.brand} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Hourly Traffic</span>
                    <span className="chip" style={{ background: C.amberBg, color: "#92400e", border: "1px solid #fde68a" }}>
                      <Icons.Zap size={9} color={C.amber} />
                      Peak {insights.busiestHour}
                    </span>
                  </div>
                  <span className="lbl">{insights.hourly.length} hours · {insights.hourly.reduce((s, h) => s + h.visits, 0)} total visits</span>
                </div>
                <HourlyChart hourly={insights.hourly} maxVisits={insights.maxVisits} accentColor={C.brand} peakHour={insights.busiestHour} />
              </div>
            )}

            {/* ══ LIVE QUEUES ══════════════════════════════════════ */}
            {activeQueues.length > 0 && (
              <div className="card" style={{ overflow: "hidden" }}>
                {/* header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 22px", borderBottom: `1px solid ${C.border}`, background: "#fafbfc" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="icon-badge" style={{ width: 30, height: 30, background: "#ecfdf5" }}>
                      <Icons.Radio size={14} color={C.green} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Live Queue Status</span>
                    <span className="live-dot" style={{ display: "block", width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                  </div>
                  <Link href={`${dashBase}/queues`} className="view-more" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: C.brand, background: C.brandLight, border: `1px solid ${C.brandBorder}`, padding: "5px 12px", borderRadius: 8, textDecoration: "none" }}>
                    Manage <span className="arr"><Icons.ArrowRight size={12} color="currentColor" /></span>
                  </Link>
                </div>
                {/* grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: "1px", background: C.border }}>
                  {activeQueues.map(q => (
                    <div key={q.id} style={{ background: "#fff", padding: "18px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.name}</span>
                        <span className="pill" style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" }}>Active</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                        {[
                          { lbl: "Serving", val: q.current_token_number ? `${q.prefix}${q.current_token_number}` : "—",     col: C.brand },
                          { lbl: "Next",    val: q.current_token_number ? `${q.prefix}${q.current_token_number + 1}` : "—", col: C.text  },
                          { lbl: "Prefix",  val: q.prefix || "—",                                                             col: C.textMuted },
                        ].map(item => (
                          <div key={item.lbl}>
                            <span className="lbl" style={{ display: "block", marginBottom: 3 }}>{item.lbl}</span>
                            <span className="mono" style={{ fontSize: 20, fontWeight: 600, color: item.col }}>{item.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ TIMING PANELS ════════════════════════════════════ */}
            <div>
              <div className="section-label" style={{ marginBottom: 12 }}>Timing Analysis</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
                <TimingPanel
                  title="Wait Times"    warning={wWarn}
                  avg={overview?.timings?.avg_waiting_time || "00:00:00"}
                  max={overview?.timings?.max_waiting_time || "00:00:00"}
                  barPct={wPct}
                  iconBg={C.blueBg}     iconColor={C.blue}   barColor={wWarn ? C.amber : C.blue}
                  Icon={Icons.Clock}
                />
                <TimingPanel
                  title="Service Times" warning={sWarn}
                  avg={overview?.timings?.avg_served_time || "00:00:00"}
                  max={overview?.timings?.max_served_time || "00:00:00"}
                  barPct={sPct}
                  iconBg={C.greenBg}    iconColor={C.green}  barColor={sWarn ? C.amber : C.green}
                  Icon={Icons.CheckCircle2}
                />
              </div>
            </div>

            {/* ══ INSIGHTS ═════════════════════════════════════════ */}
            {insights && (
              <div>
                <div className="section-label" style={{ marginBottom: 12 }}>Performance Insights</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(188px,1fr))", gap: 14 }}>
                  <InsightCard label="Busiest Hour"      value={insights.busiestHour}                 sub={`${insights.busiestVisits} visitors`} Icon={Icons.Zap}          iconBg={C.amberBg}  iconColor={C.amber}  />
                  <InsightCard label="Longest Wait"      value={formatDuration(insights.longestWait)}  sub="recorded today"    Icon={Icons.Clock}         iconBg={C.redBg}    iconColor={C.red}    />
                  <InsightCard label="Avg Service Time"  value={formatDuration(insights.avgService)}   sub="per visitor"       Icon={Icons.Activity}      iconBg={C.violetBg} iconColor={C.violet} />
                  <InsightCard label="Currently Waiting" value={String(insights.peakWaiting)}          sub="in all queues"     Icon={Icons.Users}         iconBg={C.blueBg}   iconColor={C.blue}   />
                </div>
              </div>
            )}

            {/* ══ QUEUE BREAKDOWN TABLE ═════════════════════════════ */}
            {queueStats.length > 0 && (
              <div className="card" style={{ overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 22px", borderBottom: `1px solid ${C.border}`, background: "#fafbfc" }}>
                  <div className="icon-badge" style={{ width: 30, height: 30, background: C.brandLight }}>
                    <Icons.Table2 size={14} color={C.brand} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Queue Breakdown</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="qtable">
                    <thead>
                      <tr>
                        <th style={{ paddingLeft: 22 }}>Queue Name</th>
                        <th style={{ textAlign: "right", width: 100 }}>Served</th>
                        <th style={{ textAlign: "right", width: 100 }}>Waiting</th>
                        <th style={{ textAlign: "right", width: 100, paddingRight: 22 }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queueStats.map(qs => (
                        <tr key={qs.queue} className="fade-in">
                          <td style={{ paddingLeft: 22 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.border }} />
                              {qs.queue}
                            </div>
                          </td>
                          <td className="tnum" style={{ textAlign: "right", color: C.green }}>{qs.served}</td>
                          <td className="tnum" style={{ textAlign: "right", color: C.amber }}>{qs.waiting}</td>
                          <td className="tnum" style={{ textAlign: "right", fontWeight: 700, paddingRight: 22 }}>{qs.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══ ACTIVITY FEED ════════════════════════════════════ */}
            <div className="card" style={{ overflow: "hidden" }}>
              {/* header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 22px", borderBottom: `1px solid ${C.border}`, background: "#fafbfc" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="icon-badge" style={{ width: 30, height: 30, background: C.brandLight }}>
                    <Icons.Activity size={14} color={C.brand} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Recent Activity</span>
                  <span className="live-dot" style={{ display: "block", width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                </div>
                <Link href={`${dashBase}/history`} className="view-more" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: C.brand, background: C.brandLight, border: `1px solid ${C.brandBorder}`, padding: "5px 12px", borderRadius: 8, textDecoration: "none" }}>
                  View all <span className="arr"><Icons.ArrowRight size={12} color="currentColor" /></span>
                </Link>
              </div>

              {isLoading ? (
                <div style={{ padding: "22px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {[88, 70, 79, 63, 75].map((w, i) => (
                    <div key={i} className="shimmer" style={{ height: 54, width: `${w}%` }} />
                  ))}
                </div>
              ) : overview?.recent_activity?.length ? (
                <>
                  {/* feed filters */}
                  <div style={{ padding: "12px 22px", borderBottom: `1px solid ${C.border}`, background: "#fff" }}>
                    <div className="feed-tabs">
                      {[
                        { id: "all",     lbl: "All",     icon: Icons.Filter,      count: overview.recent_activity.length },
                        { id: "waiting", lbl: "Waiting", icon: Icons.Clock,       count: overview.recent_activity.filter(a => a.status === "waiting").length },
                        { id: "serving", lbl: "Serving", icon: Icons.Megaphone,   count: overview.recent_activity.filter(a => a.status === "serving").length },
                        { id: "done",    lbl: "Done",    icon: Icons.CheckCircle2, count: overview.recent_activity.filter(a => a.status === "done").length },
                      ].map(t => (
                        <button
                          key={t.id}
                          className={`feed-tab ${feedFilter === t.id ? "active" : ""}`}
                          onClick={() => setFeedFilter(t.id as any)}
                        >
                          <t.icon size={13} color="currentColor" />
                          {t.lbl}
                          <span className="badge tnum">{t.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* column headers */}
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: "0 16px", padding: "9px 22px", borderBottom: `1px solid ${C.border}`, background: "#fafbfc" }}>
                    {["Event", "Details", "Status", "Time"].map((h, i) => (
                      <span key={h} className="lbl" style={{ textAlign: i >= 2 ? "center" : "left" }}>{h}</span>
                    ))}
                  </div>

                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {overview.recent_activity.filter(a => feedFilter === "all" || a.status === feedFilter).map((act, idx) => {
                      const cfgMap: Record<string, { Icon: (p: IconProps) => React.ReactNode; iconBg: string; iconColor: string; chipBg: string; chipColor: string; chipBorder: string; dot: string }> = {
                        waiting: { Icon: Icons.Clock,     iconBg: C.amberBg, iconColor: C.amber, chipBg: C.amberBg, chipColor: "#92400e", chipBorder: "#fde68a", dot: C.amber },
                        serving: { Icon: Icons.Megaphone, iconBg: C.blueBg,  iconColor: C.blue,  chipBg: C.blueBg,  chipColor: "#1e40af", chipBorder: "#bfdbfe", dot: C.blue  },
                        done:    { Icon: Icons.CheckCircle2, iconBg: C.greenBg, iconColor: C.green, chipBg: C.greenBg, chipColor: "#065f46", chipBorder: "#a7f3d0", dot: C.green },
                      };
                      const cfg = cfgMap[act.status] ?? { Icon: Icons.XCircle, iconBg: C.slateBg, iconColor: C.slate, chipBg: C.slateBg, chipColor: C.textSub, chipBorder: C.border, dot: C.textMuted };

                      return (
                        <li
                          key={idx}
                          className="trow fade-in"
                          onClick={() => setDrawerAct(act)}
                          style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: "0 16px", alignItems: "center", padding: "12px 22px", borderBottom: `1px solid #f4f6f8`, animationDelay: `${idx * 15}ms`, cursor: "pointer" }}
                        >
                          {/* icon */}
                          <div className="icon-badge" style={{ width: 36, height: 36, background: cfg.iconBg }}>
                            <cfg.Icon size={15} color={cfg.iconColor} />
                          </div>
                          {/* message */}
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {statusLabel(act)}
                            </p>
                            <p style={{ margin: "2px 0 0", fontSize: 11.5, color: C.textMuted }}>{act.queue}</p>
                          </div>
                          {/* status chip */}
                          <div style={{ display: "flex", justifyContent: "center" }}>
                            <span className="chip" style={{ background: cfg.chipBg, color: cfg.chipColor, border: `1px solid ${cfg.chipBorder}` }}>
                              <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
                              {act.status}
                            </span>
                          </div>
                          {/* time */}
                          <span className="mono" style={{ fontSize: 12, color: C.textMuted, textAlign: "right", minWidth: 44 }}>
                            {new Date(act.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  {/* pagination */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 22px", borderTop: `1px solid ${C.border}`, background: "#fafbfc" }}>
                    <button onClick={() => setRecentPage(p => Math.max(1, p - 1))} disabled={recentPage === 1 || isLoading} className="pg-btn">
                      <Icons.ArrowLeft size={13} color="currentColor" /> Previous
                    </button>
                    <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, color: C.textMuted, letterSpacing: ".06em" }}>
                      Page {recentPage}
                    </span>
                    <button onClick={() => setRecentPage(p => p + 1)} disabled={(overview?.recent_activity?.length || 0) < LIMIT || isLoading} className="pg-btn">
                      Next <Icons.ArrowRight size={13} color="currentColor" />
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "56px 0" }}>
                  <div className="icon-badge" style={{ width: 52, height: 52, background: C.slateBg }}>
                    <Icons.Clipboard size={24} color={C.textMuted} />
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: C.textSub, fontWeight: 500 }}>No recent activity detected.</p>
                  <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>Activity will appear here once your session begins.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ══ ACTIVITY DRAWER ════════════════════════════════════════ */}
      {drawerAct && (
        <>
          <div className="drawer-backdrop" onClick={() => setDrawerAct(null)} />
          <div className="drawer-panel" role="dialog" aria-modal="true">
            <div className="drawer-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Interaction Details</h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textSub }}>{drawerAct.queue}</p>
              </div>
              <button
                onClick={() => setDrawerAct(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: 4, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }}
                onMouseEnter={e => (e.currentTarget.style.color = C.text)}
                onMouseLeave={e => (e.currentTarget.style.color = C.textMuted)}
              >
                <Icons.X size={20} color="currentColor" />
              </button>
            </div>
            
            <div className="drawer-body">
              {/* Top Banner */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 20, background: C.slateBg, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: C.brandLight, color: C.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, fontFamily: "'Geist Mono',monospace" }}>
                  {drawerAct.token_number}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: C.textSub, marginBottom: 4 }}>Current Status</div>
                  <span className="chip" style={{ background: "#fff", border: `1px solid ${C.border}`, fontSize: 13, padding: "4px 10px" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: drawerAct.status === "serving" ? C.blue : (drawerAct.status === "waiting" ? C.amber : C.green), display: "inline-block" }} />
                    <span style={{ textTransform: "capitalize" }}>{drawerAct.status}</span>
                  </span>
                </div>
              </div>

              {/* Vertical Timeline */}
              <div className="section-label" style={{ marginBottom: 16 }}>Timeline</div>
              
              <div style={{ position: "relative", paddingLeft: 12 }}>
                {/* Connector line */}
                <div style={{ position: "absolute", left: 16, top: 12, bottom: 12, width: 2, background: C.border }} />

                {[
                  { lbl: "Token Issued", time: drawerAct.time, active: true },
                  { lbl: "Waiting in Queue", time: drawerAct.time, active: ["waiting", "serving", "done"].includes(drawerAct.status) },
                  { lbl: "Currently Serving", time: drawerAct.status === "serving" || drawerAct.status === "done" ? drawerAct.time : null, active: ["serving", "done"].includes(drawerAct.status) },
                  { lbl: "Service Completed", time: drawerAct.status === "done" ? drawerAct.time : null, active: drawerAct.status === "done" }
                ].map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 16, position: "relative", marginBottom: 24, opacity: step.active ? 1 : 0.4 }}>
                    {/* Dot */}
                    <div style={{ position: "relative", zIndex: 2, width: 10, height: 10, borderRadius: "50%", background: step.active ? C.brand : C.pageBg, border: `2px solid ${step.active ? "#fff" : C.border}`, outline: `2px solid ${step.active ? C.brandLight : "transparent"}`, marginTop: 4 }} />
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{step.lbl}</div>
                      <div className="mono tnum" style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                        {step.time ? new Date(step.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </>
      )}

    </>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════

function MetricCard({ label, value, Icon, trend, color, bg, border, valueColor, pulse, muted, isLoading, suffix = "" }: {
  label: string; value: number;
  Icon: (p: IconProps) => React.ReactNode;
  trend: { up: boolean; pct: number } | null;
  color: string; bg: string; border: string; valueColor: string;
  pulse?: boolean; muted?: boolean; isLoading?: boolean; suffix?: string;
}) {
  if (isLoading) {
    return (
      <div className="card card-skeleton" style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div className="shim" style={{ width: "60%", height: 16 }} />
          <div className="shim" style={{ width: 34, height: 34, borderRadius: "50%" }} />
        </div>
        <div className="shim" style={{ width: "40%", height: 32, marginTop: 4 }} />
        <div className="shim" style={{ width: "80%", height: 12, marginTop: 8 }} />
      </div>
    );
  }

  return (
    <div className="card metric-card" style={{ padding: "20px 22px", position: "relative", overflow: "hidden", cursor: "default" }}>
      {/* corner tint */}
      <div aria-hidden style={{ position: "absolute", top: 0, right: 0, width: 90, height: 90, background: `radial-gradient(circle at 100% 0%, ${bg}, transparent 70%)`, pointerEvents: "none", borderRadius: "0 12px 0 0" }} />

      {/* label + icon row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span className="lbl" style={{ color: muted ? C.textMuted : C.textSub }}>{label}</span>
        <div className="icon-badge" style={{ width: 34, height: 34, background: bg, border: `1px solid ${border}`, position: "relative" }}>
          {pulse && (
            <span className="live-dot" style={{ position: "absolute", inset: -2, borderRadius: 12, border: `2px solid ${color}`, opacity: .35 }} />
          )}
          <Icon size={15} color={color} />
        </div>
      </div>

      {/* value */}
      <span className="mono tnum" style={{ display: "block", fontSize: 40, fontWeight: 600, color: muted ? C.textMuted : valueColor, letterSpacing: "-.04em", lineHeight: 1 }}>
        {value.toLocaleString()}{suffix}
      </span>

      {/* colored bottom bar */}
      <div style={{ marginTop: 16, height: 3, borderRadius: 99, background: bg, overflow: "hidden" }}>
        <div style={{ height: "100%", width: muted ? "18%" : "65%", background: color, borderRadius: 99, opacity: muted ? .5 : .75 }} />
      </div>

      {/* trend */}
      {trend ? (
        <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, color: trend.up ? C.green : C.red }}>
          {trend.up ? <Icons.TrendingUp size={12} color="currentColor" /> : <Icons.TrendingDown size={12} color="currentColor" />}
          <span className="tnum">{trend.pct}%</span> <span style={{ color: C.textMuted, fontWeight: 400, marginLeft: 2 }}>vs last session</span>
        </div>
      ) : (
        <div style={{ marginTop: 9, height: 18 }} />
      )}
    </div>
  );
}

function TimingPanel({ title, avg, max, barPct, warning, iconBg, iconColor, barColor, Icon }: {
  title: string; avg: string; max: string; barPct: number; warning: boolean;
  iconBg: string; iconColor: string; barColor: string;
  Icon: (p: IconProps) => React.ReactNode;
}) {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* panel header */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 20px", borderBottom: `1px solid ${C.border}`, background: "#fafbfc" }}>
        <div className="icon-badge" style={{ width: 34, height: 34, background: iconBg }}>
          <Icon size={16} color={iconColor} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{title}</span>
        {warning && (
          <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "#92400e", background: C.amberBg, border: "1px solid #fde68a", padding: "3px 10px", borderRadius: 99 }}>
            <Icons.AlertTriangle size={11} color={C.amber} /> High variance
          </div>
        )}
      </div>

      <div style={{ padding: "18px 20px" }}>
        {/* avg / max split */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginBottom: 18 }}>
          <div style={{ paddingRight: 18, borderRight: `1px solid ${C.border}` }}>
            <span className="lbl" style={{ display: "block", marginBottom: 5 }}>Average</span>
            <span className="mono" style={{ display: "block", fontSize: 22, fontWeight: 600, color: C.text, letterSpacing: "-.01em" }}>{avg}</span>
            <span style={{ display: "block", marginTop: 3, fontSize: 12, color: C.textMuted }}>{formatDuration(avg)}</span>
          </div>
          <div style={{ paddingLeft: 18 }}>
            <span className="lbl" style={{ display: "block", marginBottom: 5 }}>Maximum</span>
            <span className="mono" style={{ display: "block", fontSize: 22, fontWeight: 600, color: C.text, letterSpacing: "-.01em" }}>{max}</span>
            <span style={{ display: "block", marginTop: 3, fontSize: 12, color: C.textMuted }}>{formatDuration(max)}</span>
          </div>
        </div>

        {/* progress */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span className="lbl">Avg / Max ratio</span>
          <span className="mono" style={{ fontSize: 10.5, fontWeight: 600, color: C.textMuted }}>{barPct}%</span>
        </div>
        <div style={{ background: "#f0f2f5", borderRadius: 99, overflow: "hidden", height: 6 }}>
          <div className="bar-fill" style={{ width: `${barPct}%`, background: barColor }} />
        </div>
      </div>
    </div>
  );
}

function InsightCard({ label, value, sub, Icon, iconBg, iconColor }: {
  label: string; value: string; sub: string;
  Icon: (p: IconProps) => React.ReactNode;
  iconBg: string; iconColor: string;
}) {
  return (
    <div className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 13 }}>
      <div className="icon-badge" style={{ width: 38, height: 38, background: iconBg, flexShrink: 0 }}>
        <Icon size={16} color={iconColor} />
      </div>
      <div style={{ minWidth: 0 }}>
        <span className="lbl" style={{ display: "block", marginBottom: 4 }}>{label}</span>
        <span className="mono" style={{ display: "block", fontSize: 24, fontWeight: 600, color: C.text, letterSpacing: "-.025em", lineHeight: 1 }}>{value}</span>
        <span style={{ display: "block", marginTop: 4, fontSize: 11.5, color: C.textMuted }}>{sub}</span>
      </div>
    </div>
  );
}

// ── Hourly Traffic Chart ─────────────────────────────────────────
function HourlyChart({ hourly, maxVisits, accentColor, peakHour }: {
  hourly: { hour: string; visits: number }[];
  maxVisits: number;
  accentColor: string;
  peakHour: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Layout constants — compact fixed height
  const BAR_H   = 52;   // max bar fill height
  const BAR_W   = 10;   // bar width
  const GAP     = 6;    // gap between bars
  const STRIDE  = BAR_W + GAP;
  const PAD_L   = 4;
  const PAD_T   = 16;   // room for peak label above tallest bar
  const PAD_B   = 20;   // room for hour label below
  const totalW  = PAD_L + hourly.length * STRIDE - GAP + PAD_L;
  const totalH  = PAD_T + BAR_H + PAD_B;

  const activeIdx = hoveredIdx;

  return (
    <div style={{ padding: "12px 22px 14px" }}>
      {/* Chart + right-side tooltip */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>

        {/* SVG chart — fixed aspect, no stretching */}
        <div style={{ flex: 1, minWidth: 0, overflowX: "auto" }}>
          <svg
            width="100%"
            viewBox={`0 0 ${totalW} ${totalH}`}
            preserveAspectRatio="xMinYMid meet"
            style={{ display: "block", height: 88, minWidth: hourly.length * 14 }}
          >
            {hourly.map((h, i) => {
              const x       = PAD_L + i * STRIDE;
              const rawH    = maxVisits > 0 ? (h.visits / maxVisits) * BAR_H : 0;
              const fillH   = rawH > 0 ? Math.max(3, Math.round(rawH)) : 2;
              const y       = PAD_T + BAR_H - fillH;
              const isPeak  = h.hour === peakHour;
              const isHov   = hoveredIdx === i;
              const barFill = isPeak
                ? accentColor
                : isHov
                ? "#818cf8"
                : "#dde3f8";
              // Show every 3rd label to avoid clutter, always show peak
              const showLabel = isPeak || i % 3 === 0;

              return (
                <g
                  key={h.hour}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{ cursor: "default" }}
                >
                  {/* track */}
                  <rect
                    x={x} y={PAD_T} width={BAR_W} height={BAR_H}
                    rx={3} fill="#f0f2f5"
                  />
                  {/* fill bar */}
                  <rect
                    x={x} y={y} width={BAR_W} height={fillH}
                    rx={3} fill={barFill}
                  />
                  {/* peak count above bar */}
                  {isPeak && (
                    <text
                      x={x + BAR_W / 2} y={y - 3}
                      textAnchor="middle" dominantBaseline="auto"
                      style={{ fontSize: 8, fontWeight: 700, fill: accentColor, fontFamily: "'Geist Mono',monospace" }}
                    >
                      {h.visits}
                    </text>
                  )}
                  {/* hovered count above non-peak bars */}
                  {isHov && !isPeak && h.visits > 0 && (
                    <text
                      x={x + BAR_W / 2} y={y - 3}
                      textAnchor="middle" dominantBaseline="auto"
                      style={{ fontSize: 8, fontWeight: 600, fill: "#818cf8", fontFamily: "'Geist Mono',monospace" }}
                    >
                      {h.visits}
                    </text>
                  )}
                  {/* hour label — selective */}
                  {showLabel && (
                    <text
                      x={x + BAR_W / 2} y={PAD_T + BAR_H + 13}
                      textAnchor="middle" dominantBaseline="auto"
                      style={{
                        fontSize: 8,
                        fill: isPeak ? accentColor : C.textMuted,
                        fontWeight: isPeak ? 700 : 400,
                        fontFamily: "'Geist',sans-serif",
                      }}
                    >
                      {h.hour}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Stat panel on the right */}
        <div style={{
          flexShrink: 0, width: 130,
          background: C.pageBg, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: "10px 14px",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          {activeIdx !== null ? (
            // Hovered hour detail
            <>
              <span className="lbl" style={{ color: C.textMuted }}>Selected</span>
              <div>
                <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: hourly[activeIdx].hour === peakHour ? accentColor : C.text, letterSpacing: "-.03em" }}>
                  {hourly[activeIdx].visits}
                </span>
                <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 4 }}>visits</span>
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: C.textSub }}>{hourly[activeIdx].hour}</span>
              {hourly[activeIdx].hour === peakHour && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "#92400e", background: C.amberBg, border: "1px solid #fde68a", padding: "2px 7px", borderRadius: 99 }}>
                  <Icons.Zap size={8} color={C.amber} /> Peak
                </span>
              )}
            </>
          ) : (
            // Default summary
            <>
              <span className="lbl" style={{ color: C.textMuted }}>Peak hour</span>
              <div>
                <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: accentColor, letterSpacing: "-.03em" }}>
                  {hourly.find(h => h.hour === peakHour)?.visits ?? 0}
                </span>
                <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 4 }}>visits</span>
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: C.textSub }}>{peakHour}</span>
              <div style={{ marginTop: 2, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                <span className="lbl" style={{ color: C.textMuted, display: "block", marginBottom: 3 }}>Total today</span>
                <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                  {hourly.reduce((s, h) => s + h.visits, 0)}
                </span>
              </div>
            </>
          )}
        </div>

      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: C.textMuted }}>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: accentColor }} />
          Peak hour
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: C.textMuted }}>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#dde3f8" }} />
          Other hours
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: C.textMuted }}>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#818cf8" }} />
          Hover
        </div>
      </div>
    </div>
  );
}