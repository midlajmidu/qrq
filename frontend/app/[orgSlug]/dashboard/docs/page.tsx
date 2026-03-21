"use client";

import React, { useState } from "react";
import Link from "next/link";
import { getToken, getCurrentUser } from "@/lib/auth";

const C = {
  pageBg:      "#f0f2f5",
  cardBg:      "#ffffff",
  border:      "#e2e5ec",
  borderHov:   "#bfc6d4",
  borderLight: "#eaecf1",
  text:        "#0c1524",
  textSub:     "#46556a",
  textMuted:   "#8694a8",
  brand:       "#2f54eb",
  brandLight:  "#eff3ff",
  brandBorder: "#adc0fd",
  blue:        "#3b82f6",
  blueBg:      "#eff6ff",
  blueBorder:  "#bfdbfe",
  green:       "#059669",
  greenBg:     "#ecfdf5",
  greenBorder: "#6ee7b7",
  amber:       "#b45309",
  amberBg:     "#fffbeb",
  amberBorder: "#fcd34d",
  red:         "#dc2626",
  redBg:       "#fef2f2",
  redBorder:   "#fca5a5",
  purple:      "#6d28d9",
  purpleBg:    "#f5f3ff",
  purpleBorder:"#c4b5fd",
  slate:       "#64748b",
  slateBg:     "#f7f8fb",
};

export default function DocumentationPage() {
  const user = getCurrentUser();
  const dashBase = user?.org_slug
    ? `/${user.org_slug}/dashboard`
    : "/dashboard";

  const STYLES =
    `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap');

    .ov {
      font-family: 'Inter', sans-serif;
      color: ` + C.text + `;
      background: ` + C.pageBg + `;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Cards ── */
    .card {
      background: ` + C.cardBg + `;
      border: 1px solid ` + C.border + `;
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(15,23,42,.05), 0 4px 16px rgba(15,23,42,.04);
      transition: box-shadow .2s ease, border-color .2s ease, transform .2s ease;
    }
    .card:hover {
      box-shadow: 0 4px 20px rgba(15,23,42,.09), 0 1px 4px rgba(15,23,42,.05);
      border-color: ` + C.borderHov + `;
    }

    /* ── Icon badge ── */
    .icon-badge {
      display: flex; align-items: center; justify-content: center;
      border-radius: 10px; flex-shrink: 0;
    }

    /* ── Pills / tags ── */
    .pill {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 99px;
      font-size: 10px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
    }

    /* ── Buttons ── */
    .qa-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 7px;
      padding: 9px 20px; font-size: 13px; font-weight: 600;
      font-family: 'Inter', sans-serif;
      color: #fff;
      background: ` + C.brand + `;
      border: none; border-radius: 10px; cursor: pointer; text-decoration: none;
      box-shadow: 0 1px 2px rgba(47,84,235,.25), 0 3px 10px rgba(47,84,235,.2), inset 0 1px 0 rgba(255,255,255,.14);
      transition: all .16s ease;
      letter-spacing: -.01em;
    }
    .qa-btn:hover:not(:disabled) {
      background: #2448d6;
      box-shadow: 0 2px 6px rgba(47,84,235,.32), 0 6px 20px rgba(47,84,235,.22);
      transform: translateY(-1px);
    }

    .qa-btn-outline {
      display: inline-flex; align-items: center; justify-content: center; gap: 7px;
      padding: 9px 18px; font-size: 13px; font-weight: 500;
      font-family: 'Inter', sans-serif;
      color: ` + C.textSub + `; background: ` + C.cardBg + `; border: 1px solid ` + C.border + `;
      border-radius: 10px; cursor: pointer; text-decoration: none; transition: all .16s ease;
      letter-spacing: -.01em;
    }
    .qa-btn-outline:hover:not(:disabled) {
      border-color: ` + C.borderHov + `; background: ` + C.slateBg + `; color: ` + C.text + `;
      box-shadow: 0 2px 8px rgba(15,23,42,.07);
    }

    /* ── Sidebar nav ── */
    .doc-nav-item {
      display: flex; align-items: center; gap: 10px; padding: 8px 12px;
      font-size: 13.5px; font-weight: 500; color: ` + C.textSub + `;
      border-radius: 10px; cursor: pointer; border: 1px solid transparent;
      transition: all .14s ease; width: 100%; text-align: left; background: transparent;
      font-family: 'Inter', sans-serif;
    }
    .doc-nav-item:hover { background: ` + C.slateBg + `; color: ` + C.text + `; }
    .doc-nav-item[data-active="true"] {
      background: ` + C.brandLight + `; color: ` + C.brand + `;
      border-color: ` + C.brandBorder + `; font-weight: 600;
    }

    /* ── Prose ── */
    .prose p { margin: 0 0 16px 0; line-height: 1.72; color: ` + C.textSub + `; font-size: 14px; }
    .prose strong { color: ` + C.text + `; font-weight: 600; }
    .prose h3 {
      font-size: 15px; font-weight: 700; color: ` + C.text + `;
      margin: 28px 0 12px 0; letter-spacing: -.02em;
      display: flex; align-items: center; gap: 10px;
    }
    .prose h3::after {
      content: ''; flex: 1; height: 1px;
      background: linear-gradient(90deg, ` + C.border + ` 0%, transparent 100%);
    }
    .prose h4 {
      font-size: 10.5px; font-weight: 700; color: ` + C.textMuted + `;
      margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: .1em;
    }
    .prose ol { padding-left: 0; margin-bottom: 24px; list-style: none; counter-reset: step; }
    .prose ol li {
      font-size: 14px; color: ` + C.textSub + `; line-height: 1.65; margin-bottom: 10px;
      display: flex; gap: 12px; align-items: flex-start; counter-increment: step;
    }
    .prose ol li::before {
      content: counter(step);
      display: flex; align-items: center; justify-content: center;
      min-width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
      background: ` + C.brandLight + `; border: 1px solid ` + C.brandBorder + `;
      color: ` + C.brand + `; font-size: 11px; font-weight: 700; margin-top: 1px;
    }
    .prose code {
      font-family: 'Fira Code', monospace; font-size: 11.5px;
      background: ` + C.slateBg + `; color: ` + C.brand + `;
      padding: 2px 7px; border-radius: 5px; border: 1px solid ` + C.border + `;
      font-weight: 500;
    }

    /* ── Parameter Tables ── */
    .param-table {
      width: 100%; border-collapse: separate; border-spacing: 0;
      margin: 14px 0 24px 0; border: 1px solid ` + C.border + `;
      border-radius: 12px; overflow: hidden;
    }
    .param-table th {
      background: ` + C.slateBg + `; padding: 10px 16px; text-align: left;
      font-size: 10px; font-weight: 700; color: ` + C.textMuted + `;
      text-transform: uppercase; letter-spacing: .1em; border-bottom: 1px solid ` + C.border + `;
      font-family: 'Fira Code', monospace;
    }
    .param-table td {
      padding: 13px 16px; border-bottom: 1px solid ` + C.borderLight + `;
      font-size: 13.5px; color: ` + C.textSub + `; vertical-align: middle; line-height: 1.5;
    }
    .param-table tr:last-child td { border-bottom: none; }
    .param-table tr:hover td { background: ` + C.slateBg + `; }
    .param-table td strong { color: ` + C.text + `; font-weight: 600; }

    /* ── Label ── */
    .lbl {
      font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
      color: ` + C.textMuted + `; font-family: 'Fira Code', monospace;
      display: block; margin-bottom: 8px;
    }

    /* ── Callout ── */
    .callout {
      display: flex; gap: 14px; align-items: flex-start; padding: 16px 20px;
      border-radius: 12px; margin-bottom: 20px;
    }
    .callout-icon { flex-shrink: 0; margin-top: 1px; }
    .callout-title { display: block; font-weight: 700; font-size: 13px; margin-bottom: 4px; }
    .callout-body { font-size: 13px; line-height: 1.65; opacity: .85; }

    /* ── Metric cards ── */
    .metric-card {
      padding: 18px 20px; border-radius: 12px;
      border: 1px solid ` + C.border + `; background: ` + C.cardBg + `;
      transition: box-shadow .2s ease, border-color .2s ease;
    }
    .metric-card:hover {
      border-color: ` + C.borderHov + `;
      box-shadow: 0 4px 14px rgba(15,23,42,.07);
    }

    /* ── Status pulse ── */
    @keyframes statusPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
    .status-dot { animation: statusPulse 2.5s ease-in-out infinite; }

    @keyframes fadeSlide {
      from { opacity: 0; transform: translateY(7px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .section-anim { animation: fadeSlide .26s cubic-bezier(.22,1,.36,1) both; }
  `;

  /* ─────────────────────────────────── helpers ─────────────────────────────────── */
  const Callout = ({ icon, title, body, bg, borderColor, textColor }: any) => (
    <div
      className="callout"
      style={{ background: bg, border: `1px solid ${borderColor}` }}
    >
      <span className="callout-icon" style={{ color: textColor }}>
        {icon}
      </span>
      <div>
        <span className="callout-title" style={{ color: textColor }}>
          {title}
        </span>
        <span className="callout-body" style={{ color: textColor }}>
          {body}
        </span>
      </div>
    </div>
  );

  /* ─────────────────────────────────── sections ─────────────────────────────────── */
  const DOCS_SECTIONS = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: (
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      color: C.amber,
      bg: C.amberBg,
      border: C.amberBorder,
      content: (
        <div className="prose section-anim">
          <p>
            Welcome to your <strong>Q4Queue Dashboard</strong>. Our platform
            makes it incredibly simple to organize waiting customers, call them
            to counters, and broadcast wait times via QR codes and TV screens.
          </p>

          <h3>Initial Setup</h3>
          <p>
            Setting up your very first operational queue takes less than a
            minute. Let's walk through the steps to get your reception desk
            running.
          </p>

          <ol>
            <li>
              <strong>Navigate to Queues:</strong> Click on "Queues" in your
              left sidebar.
            </li>
            <li>
              <strong>Create a Queue:</strong> Hit the "Create Queue" button.
              Choose an identifiable name like "General Check-in" or "Pharmacy
              Wait".
            </li>
            <li>
              <strong>Set a Prefix:</strong> Ensure you assign a clear token
              prefix (like <code>MED-</code> or <code>A-</code>). This makes
              tokens easy to distinguish visually.
            </li>
            <li>
              <strong>Activate:</strong> Turn the Queue on. It is now live to
              the public and staff can manipulate the tokens.
            </li>
          </ol>

          <Callout
            bg={C.amberBg}
            borderColor={C.amberBorder}
            textColor={C.amber}
            icon={
              <svg
                width={16}
                height={16}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            title="What happens next?"
            body="Once your queue is active, you don't need any complex hardware! The queue is immediately accessible via the QR code. Customers just point their smartphone cameras and join instantly."
          />
        </div>
      ),
    },
    {
      id: "customer-flow",
      title: "Calling & Skipping",
      icon: (
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      color: C.blue,
      bg: C.blueBg,
      border: C.blueBorder,
      content: (
        <div className="prose section-anim">
          <p>
            After your queue is running and customers start scanning the QR
            Code, they will populate your <strong>Waiting Array</strong>. As a
            staff member, your job is to guide these tokens securely through the
            flow.
          </p>

          <h3>Core Actions</h3>
          <p>
            Navigate into your active Queue page. In the center Console, you
            will utilize the following primary actions:
          </p>

          <table className="param-table">
            <thead>
              <tr>
                <th>Action Target</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Call Next</strong>
                </td>
                <td>
                  Pulls the oldest waiting customer from the matrix and flashes
                  the token on all linked TV Displays with a chime.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Skip Customer</strong>
                </td>
                <td>
                  If a customer is not present after calling, use Skip. The
                  customer token is pushed to the History log as "Skipped" and
                  the pipeline unblocks immediately.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Force Call (Manual)</strong>
                </td>
                <td>
                  If a customer loses their phone or needs to be jumped ahead,
                  staff can enter an explicit Token ID to manually override the
                  sequence array and call them.
                </td>
              </tr>
            </tbody>
          </table>

          <Callout
            bg={C.blueBg}
            borderColor={C.blueBorder}
            textColor={C.blue}
            icon={
              <svg
                width={16}
                height={16}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            title="Public Announcements"
            body="Use the broadcast input box on the Queue page to type custom messages. These displays dynamically across the bottom bar of all connected TV displays (e.g., 'Counter 3 is currently closed')."
          />
        </div>
      ),
    },
    {
      id: "permissions",
      title: "Staff & Permissions",
      icon: (
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      color: C.green,
      bg: C.greenBg,
      border: C.greenBorder,
      content: (
        <div className="prose section-anim">
          <p>
            Your team is the operational backbone of Q4Queue. You can seamlessly
            add staff members securely through the dashboard so they can call
            customers on their own mobile devices.
          </p>

          <h3>Inviting Team Members</h3>
          <p>
            Navigate to the <strong>Staff</strong> tab in your dashboard
            sidebar. Click on "Add New Staff" and enter their credentials. An
            email logic flow ensures they can login securely under your
            organization.
          </p>

          <table className="param-table">
            <thead>
              <tr>
                <th>Role Types</th>
                <th>Capabilities</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span
                    className="pill"
                    style={{ background: C.slateBg, color: C.textSub, border: `1px solid ${C.border}` }}
                  >
                    Admin
                  </span>
                </td>
                <td>
                  Has total control over generating new queues, modifying
                  settings, wiping logs, and deleting other team members.
                </td>
              </tr>
              <tr>
                <td>
                  <span
                    className="pill"
                    style={{
                      background: C.greenBg,
                      color: C.green,
                      border: `1px solid ${C.greenBorder}`,
                    }}
                  >
                    Staff
                  </span>
                </td>
                <td>
                  Can view queues, call clients, and skip customers. They cannot
                  view analytical metrics or create new queues.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    },
    {
      id: "tv-displays",
      title: "QR Codes & TV Displays",
      icon: (
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
      color: C.brand,
      bg: C.brandLight,
      border: C.brandBorder,
      content: (
        <div className="prose section-anim">
          <p>
            Empower your reception by running high-fidelity visuals. Point any
            physical iPad, Smart TV, or printed flyer at your Queue routing URL.
          </p>

          <h3>The QR Flyer</h3>
          <p>
            Inside an active Queue page, you will notice a large QR Code widget.
            Users just point their iOS or Android camera at that pixel code.
            Print this and tape it to a stand at your front desk!
          </p>

          <h3>Smart TV Pairing</h3>
          <p>
            To cast the "Now Serving" board natively to your Waiting Room TV,
            follow this logic:
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              padding: 16,
              background: C.slateBg,
              borderRadius: 10,
              border: `1px solid ${C.borderLight}`,
            }}
          >
            <div style={{ fontSize: 13, color: C.textSub }}>
              1. Open the built-in Web Browser application on your Smart TV.
            </div>
            <div style={{ fontSize: 13, color: C.textSub }}>
              2. Navigate to the <strong>Public Directory Link</strong> found at
              the bottom of your Queue page.
            </div>
            <div style={{ fontSize: 13, color: C.textSub }}>
              3. Maximize the window into Full-Screen Mode.
            </div>
          </div>

          <Callout
            bg={C.brandLight}
            borderColor={C.brandBorder}
            textColor={C.brand}
            icon={
              <svg
                width={16}
                height={16}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            }
            title="Auto-Refresh Protection"
            body="All TVs will auto-retry polling indefinitely during Wi-Fi drops. You do not need to manually refresh broken screens."
          />
        </div>
      ),
    },
    {
      id: "analytics",
      title: "Reading Analytics",
      icon: (
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      color: C.purple,
      bg: C.purpleBg,
      border: C.purpleBorder,
      content: (
        <div className="prose section-anim">
          <p>
            Understanding your service speed helps you plan resourcing and
            staffing. Q4Queue passively collects timing profiles into structured
            metrics.
          </p>

          <h3>Core Metrics Explained</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 12,
              marginTop: 20,
              marginBottom: 28,
            }}
          >
            {[
              {
                label: "Average Wait Time",
                desc: "The total duration a customer waited between tapping 'Join Queue' on their phone and when your staff clicked 'Call Next'.",
                icon: (
                  <svg
                    width={18}
                    height={18}
                    fill="none"
                    stroke={C.purple}
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" d="M12 6v6l4 2" />
                  </svg>
                ),
                border: C.purpleBorder,
                bg: C.purpleBg,
              },
              {
                label: "Total Served",
                desc: "A pure integer representing how many individual tokens were successfully funneled through the service arrays by your staff today.",
                icon: (
                  <svg
                    width={18}
                    height={18}
                    fill="none"
                    stroke={C.green}
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ),
                border: C.greenBorder,
                bg: C.greenBg,
              },
            ].map((m) => (
              <div
                key={m.label}
                className="card"
                style={{
                  padding: "16px 20px",
                  border: `1px solid ${C.borderLight}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  {m.icon}
                  <span
                    style={{ fontWeight: 700, fontSize: 13, color: C.text }}
                  >
                    {m.label}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: C.textSub,
                    lineHeight: 1.55,
                  }}
                >
                  {m.desc}
                </p>
              </div>
            ))}
          </div>

          <Callout
            bg={C.purpleBg}
            borderColor={C.purpleBorder}
            textColor={C.purple}
            icon={
              <svg
                width={16}
                height={16}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            title="Archival History Logs"
            body="Navigate to the Dashboard root or click 'History' from the sidebar to retrieve complete CSV data for past months."
          />
        </div>
      ),
    },
  ];

  const [activeSection, setActiveSection] = useState(DOCS_SECTIONS[0].id);
  const activeData =
    DOCS_SECTIONS.find((s) => s.id === activeSection) || DOCS_SECTIONS[0];

  return (
    <>
      <style>{STYLES}</style>
      <div className="ov min-h-[100vh] pb-16">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            maxWidth: 1040,
            margin: "0 auto",
            paddingTop: 20,
          }}
        >
          {/* ── Header ── */}
          <header
            style={{
              position: "relative",
              overflow: "hidden",
              padding: "40px 40px",
              borderRadius: 16,
              background: "#ffffff",
              border: `1px solid ${C.border}`,
              boxShadow:
                "0 1px 3px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.02)",
            }}
          >
            {/* top brand accent stripe */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, ${C.brand} 0%, #6385f7 60%, ${C.blue} 100%)`,
            }} />

            <div
              style={{
                position: "relative",
                zIndex: 10,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 20,
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <div
                    className="icon-badge"
                    style={{
                      background: C.brandLight,
                      color: C.brand,
                      width: 34,
                      height: 34,
                      border: `1px solid ${C.brandBorder}`,
                    }}
                  >
                    <svg
                      width={16}
                      height={16}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                  <span
                    className="pill"
                    style={{
                      background: C.brandLight,
                      color: C.brand,
                      border: `1px solid ${C.brandBorder}`,
                    }}
                  >
                    TUTORIAL
                  </span>
                </div>
                <h1
                  style={{
                    fontSize: "28px",
                    fontWeight: 800,
                    letterSpacing: "-.03em",
                    color: C.text,
                    margin: "0 0 8px 0",
                  }}
                >
                  User Manual
                </h1>
                <p
                  style={{
                    fontSize: "14px",
                    color: C.textSub,
                    margin: 0,
                    maxWidth: "440px",
                    lineHeight: 1.65,
                  }}
                >
                  Learn how to master your Q4Queue dashboard, organize waiting
                  customers, and broadcast live waiting times.
                </p>
              </div>

              {/* Quick links */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <Link
                  href={`${dashBase}/settings`}
                  className="qa-btn"
                  style={{ fontSize: 13, padding: "8px 16px" }}
                >
                  <svg
                    width={14}
                    height={14}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Customize Settings
                </Link>
              </div>
            </div>

            {/* decorative gradient blobs */}
            <div
              style={{
                position: "absolute",
                top: -80,
                right: -40,
                width: 320,
                height: 320,
                background: `radial-gradient(circle, ${C.brandLight} 0%, transparent 70%)`,
                pointerEvents: "none",
                opacity: 0.6,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -120,
                right: 180,
                width: 240,
                height: 240,
                background: `radial-gradient(circle, ${C.blueBg} 0%, transparent 70%)`,
                pointerEvents: "none",
                opacity: 0.5,
              }}
            />
          </header>

          {/* ── Body: sidebar + content ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(220px, 256px) 1fr",
              gap: 24,
              alignItems: "start",
            }}
          >
            {/* Sidebar */}
            <aside
              style={{
                position: "sticky",
                top: 24,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div className="card" style={{ padding: "6px" }}>
                <span
                  className="lbl"
                  style={{ padding: "12px 12px 6px 12px" }}
                >
                  Guides & Documentation
                </span>
                <nav
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  {DOCS_SECTIONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(s.id)}
                      className="doc-nav-item"
                      data-active={activeSection === s.id}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 26,
                          height: 26,
                          borderRadius: 7,
                          flexShrink: 0,
                          background:
                            activeSection === s.id ? s.bg : "transparent",
                          color: activeSection === s.id ? s.color : C.textMuted,
                          transition: "all .2s ease",
                        }}
                      >
                        {s.icon}
                      </span>
                      {s.title}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Support actions */}
              <div className="card" style={{ padding: 18 }}>
                <span className="lbl" style={{ marginBottom: 10 }}>
                  Need Help?
                </span>
                <p
                  style={{
                    fontSize: 12.5,
                    color: C.textSub,
                    margin: "0 0 14px 0",
                    lineHeight: 1.55,
                  }}
                >
                  Our concierge team is directly available for on-boarding.
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <a
                    href="mailto:support@q4queue.com"
                    className="qa-btn-outline"
                    style={{
                      fontSize: 12,
                      padding: "8px 12px",
                      justifyContent: "center",
                      width: "100%",
                    }}
                  >
                    <svg
                      width={14}
                      height={14}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Contact Support
                  </a>
                </div>
              </div>

              {/* Status indicator */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: `1px solid ${C.greenBorder}`,
                  background: C.greenBg,
                }}
              >
                <span
                  className="status-dot"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: C.green,
                    flexShrink: 0,
                    boxShadow: `0 0 0 2px rgba(5,150,105,.18)`,
                  }}
                />
                <span
                  style={{ fontSize: 12, color: "#065f46", fontWeight: 600 }}
                >
                  All systems operational
                </span>
              </div>
            </aside>

            {/* Main content */}
            <main>
              <div
                className="card"
                style={{
                  padding: "40px 44px",
                  minHeight: 560,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* color accent strip */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: 4,
                    background: `linear-gradient(90deg, ${activeData.color}, ${activeData.color}55)`,
                    borderRadius: "16px 16px 0 0",
                  }}
                />

                {/* section header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    marginBottom: 28,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: activeData.bg,
                      border: `1px solid ${activeData.border}`,
                      color: activeData.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: `0 2px 8px ${activeData.color}22`,
                    }}
                  >
                    {React.cloneElement(
                      activeData.icon as React.ReactElement<any>,
                      { width: 22, height: 22 },
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2
                      style={{
                        fontSize: 24,
                        fontWeight: 800,
                        color: C.text,
                        margin: 0,
                        letterSpacing: "-.02em",
                      }}
                    >
                      {activeData.title}
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: C.textMuted,
                        marginTop: 4,
                        fontWeight: 500,
                        fontFamily: "'Fira Code', monospace",
                        letterSpacing: "0.03em",
                      }}
                    >
                      Guide{" "}
                      {DOCS_SECTIONS.findIndex((s) => s.id === activeSection) +
                        1}{" "}
                      of {DOCS_SECTIONS.length}
                    </p>
                  </div>
                  {/* section progress dots */}
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    {DOCS_SECTIONS.map((s) => {
                      const isActive = s.id === activeSection;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setActiveSection(s.id)}
                          style={{
                            width: isActive ? 22 : 6,
                            height: 6,
                            borderRadius: 99,
                            padding: 0,
                            border: "none",
                            background: isActive ? activeData.color : C.borderLight,
                            cursor: "pointer",
                            transition: "all .3s cubic-bezier(.22,1,.36,1)",
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* divider */}
                <div style={{
                  height: 1,
                  marginBottom: 28,
                  background: `linear-gradient(90deg, ${C.border} 0%, transparent 80%)`,
                }} />

                {activeData.content}
              </div>

              {/* Footer nav */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 20,
                  padding: "0 4px",
                }}
              >
                {(() => {
                  const idx = DOCS_SECTIONS.findIndex(
                    (s) => s.id === activeSection,
                  );
                  const prev = DOCS_SECTIONS[idx - 1];
                  const next = DOCS_SECTIONS[idx + 1];
                  return (
                    <>
                      {prev ? (
                        <button
                          onClick={() => setActiveSection(prev.id)}
                          className="qa-btn-outline"
                          style={{
                            fontSize: 12.5,
                            padding: "8px 16px",
                            gap: 8,
                          }}
                        >
                          <svg
                            width={14}
                            height={14}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                          {prev.title}
                        </button>
                      ) : (
                        <span />
                      )}
                      {next ? (
                        <button
                          onClick={() => setActiveSection(next.id)}
                          className="qa-btn-outline"
                          style={{
                            fontSize: 12.5,
                            padding: "8px 16px",
                            gap: 8,
                          }}
                        >
                          {next.title}
                          <svg
                            width={14}
                            height={14}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      ) : (
                        <span />
                      )}
                    </>
                  );
                })()}
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}