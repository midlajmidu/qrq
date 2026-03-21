"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import type { StaffMember, StaffCreate, StaffUpdate } from "@/types/api";
import { useAuth } from "@/hooks/useAuth";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 350;

type ToastType = "success" | "error";
interface ToastMessage { id: number; type: ToastType; msg: string; }

function Toast({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-[13.5px] font-medium pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200 ${t.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-red-50 text-red-800 border border-red-100"}`}>
                    {t.type === "success"
                        ? <svg className="w-[18px] h-[18px] text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                        : <svg className="w-[18px] h-[18px] text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    }
                    {t.msg}
                    <button onClick={() => onDismiss(t.id)} className="ml-2 text-current opacity-50 hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
            ))}
        </div>
    );
}

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
  slate:      "#64748b", slateBg: "#f8fafc",
};

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');

  .ov { font-family: 'Inter', sans-serif; color: ${C.text}; -webkit-font-smoothing: antialiased; }
  .card { background: ${C.cardBg}; border: 1px solid ${C.border}; border-radius: 14px; box-shadow: 0 0 0 1px rgba(0,0,0,.02), 0 1px 2px rgba(0,0,0,.03), 0 2px 8px rgba(0,0,0,.025); transition: box-shadow .25s cubic-bezier(.4,0,.2,1), border-color .25s ease; }
  .card:hover { box-shadow: 0 0 0 1px rgba(0,0,0,.03), 0 4px 12px rgba(0,0,0,.06), 0 8px 28px rgba(0,0,0,.04); border-color: ${C.borderHov}; }
  .ov-sel { appearance: none; background: #ffffff; border: 1px solid #e2e8f0; color: #0f172a; border-radius: 8px; padding: 9px 34px 9px 12px; font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif; cursor: pointer; min-width: 152px; box-shadow: 0 1px 2px rgba(0,0,0,.03); transition: all .2s cubic-bezier(.4,0,.2,1); }
  .ov-sel:hover:not(:disabled) { border-color: #cbd5e1; background: #f8fafc; box-shadow: 0 2px 4px rgba(0,0,0,.04); }
  .ov-sel:focus { outline: none; border-color: #818cf8; box-shadow: 0 0 0 3px rgba(129,140,248,.15), 0 1px 2px rgba(0,0,0,.03); background: #ffffff; }
  .ov-sel:disabled { opacity: .4; cursor: not-allowed; }
  .qa-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; font-size: 13px; font-weight: 600; font-family: 'Inter', sans-serif; color: #ffffff; background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%); border-radius: 10px; cursor: pointer; text-decoration: none; box-shadow: 0 1px 3px rgba(37,99,235,0.2), 0 1px 2px rgba(0,0,0,.06), inset 0 1px 0 rgba(255,255,255,0.1); transition: all .22s ease; border: 1px solid transparent; }
  .qa-btn:hover { background: linear-gradient(180deg, #1d4ed8 0%, #1e40af 100%); transform: translateY(-0.5px); box-shadow: 0 4px 6px rgba(37,99,235,0.3); }
  .icon-badge { display: flex; align-items: center; justify-content: center; border-radius: 11px; flex-shrink: 0; }
  .pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 99px; font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
  .pg-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; font-size: 12.5px; font-weight: 500; font-family: 'Inter', sans-serif; color: ${C.textSub}; background: ${C.cardBg}; border: 1px solid ${C.border}; border-radius: 10px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,.04); transition: all .22s ease; }
  .pg-btn:hover:not(:disabled) { border-color: ${C.brandBorder}; color: ${C.brand}; background: ${C.brandLight}; box-shadow: 0 2px 6px ${C.brandGlow}; }
  .pg-btn:disabled { opacity: .3; cursor: not-allowed; }
  .tnum { font-variant-numeric: tabular-nums; }
  .qtable { width: 100%; border-collapse: collapse; text-align: left; }
  .qtable th { padding: 12px 16px; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: ${C.textMuted}; border-bottom: 1px solid ${C.border}; background: linear-gradient(180deg, #fafbfd, ${C.slateBg}); font-family: 'Inter', sans-serif; }
  .qtable td { padding: 14px 16px; font-size: 13.5px; font-weight: 500; color: ${C.text}; border-bottom: 1px solid ${C.borderLight}; }
  .qtable tbody tr { transition: background .12s ease; }
  .qtable tbody tr:hover td { background: #f8f9ff; }
`;

function StatusBadge({ active }: { active: boolean }) {
    if (active) {
        return <span className="pill" style={{ background: C.greenBg, color: C.green, border: `1px solid ${C.greenBorder}` }}>Active</span>;
    }
    return <span className="pill" style={{ background: C.slateBg, color: C.textSub, border: `1px solid ${C.border}` }}>Inactive</span>;
}

function RoleBadge({ role }: { role: string }) {
    if (role === "admin") {
        return <span className="pill" style={{ background: C.blueBg, color: C.blue, border: `1px solid ${C.blueBorder}` }}>Admin</span>;
    }
    return <span className="pill" style={{ background: C.slateBg, color: C.textSub, border: `1px solid ${C.border}` }}>Staff</span>;
}

function TableSkeleton() {
    return (
        <>
            {[...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                    <td style={{ padding: '16px' }}><div style={{ height: 16, background: C.borderLight, borderRadius: 4, width: 160 }} /></td>
                    <td style={{ padding: '16px' }}><div style={{ height: 20, background: C.borderLight, borderRadius: 99, width: 64 }} /></td>
                    <td style={{ padding: '16px' }}><div style={{ height: 20, background: C.borderLight, borderRadius: 99, width: 56 }} /></td>
                    <td style={{ padding: '16px' }}><div style={{ height: 16, background: C.borderLight, borderRadius: 4, width: 96 }} /></td>
                    <td style={{ padding: '16px' }}></td>
                </tr>
            ))}
        </>
    );
}

function StaffModal({ mode, member, onClose, onSaved }: { mode: "create" | "edit"; member?: StaffMember; onClose: () => void; onSaved: (m: StaffMember) => void; }) {
    const isEdit = mode === "edit";
    const [email, setEmail] = useState(member?.email ?? "");
    const [isActive, setIsActive] = useState(member?.is_active ?? true);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNew, setConfirmNew] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [fieldError, setFieldError] = useState<string | null>(null);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    const validate = (): string | null => {
        if (!email) return "Email is required.";
        if (!isEdit) {
            if (password.length < 8) return "Password must be at least 8 characters.";
            if (password !== confirmPassword) return "Passwords do not match.";
        } else if (newPassword) {
            if (newPassword.length < 8) return "New password must be at least 8 characters.";
            if (newPassword !== confirmNew) return "New passwords do not match.";
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const err = validate();
        if (err) { setFieldError(err); return; }
        setFieldError(null);
        setIsSaving(true);
        try {
            let result: StaffMember;
            if (isEdit && member) {
                const update: StaffUpdate = {};
                if (email !== member.email) update.email = email;
                if (isActive !== member.is_active) update.is_active = isActive;
                if (newPassword) update.new_password = newPassword;
                result = await api.updateStaff(member.id, update);
            } else {
                result = await api.createStaff({ email, password });
            }
            onSaved(result);
        } catch (err) {
            setFieldError(err instanceof ApiError ? err.detail : "An error occurred.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-[420px] bg-white rounded-[20px] shadow-[0_20px_40px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.02)] overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-[#fafbfe]">
                    <h2 className="text-[17px] font-extrabold text-[#0f172a] tracking-tight">{isEdit ? "Edit Staff" : "Add Staff"}</h2>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-[#0f172a] hover:bg-slate-100 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5" noValidate>
                    {fieldError && <div className="bg-red-50 text-red-700 text-[13px] font-medium p-3 rounded-xl border border-red-100 flex items-start gap-2"><svg className="w-[18px] h-[18px] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{fieldError}</div>}
                    <div>
                        <label className="block text-[10.5px] font-bold text-[#64748b] uppercase tracking-[0.08em] mb-2">Email Address <span className="text-red-500">*</span></label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={isSaving} placeholder="jane@clinic.com" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[14px] text-[#0f172a] font-medium bg-[#fafbfe] hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all placeholder:text-slate-400/80" />
                    </div>
                    {isEdit && (
                        <div className="flex items-center justify-between py-1">
                            <span className="text-[14px] font-bold text-[#0f172a]">Account Status</span>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-500">{isActive ? "Active" : "Inactive"}</span>
                                <button type="button" role="switch" aria-checked={isActive} onClick={() => setIsActive(!isActive)} disabled={isSaving} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${isActive ? "bg-indigo-600" : "bg-slate-300"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-6" : "translate-x-1"}`} /></button>
                            </div>
                        </div>
                    )}
                    {!isEdit && (
                        <>
                            <hr className="border-slate-100" />
                            <div>
                                <label className="block text-[10.5px] font-bold text-[#64748b] uppercase tracking-[0.08em] mb-2 flex items-center justify-between"><span>Password <span className="text-red-500">*</span></span><span className="text-slate-400 font-medium normal-case tracking-normal">min 8 char</span></label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={isSaving} placeholder="••••••••" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[14px] text-[#0f172a] font-medium bg-[#fafbfe] hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all placeholder:text-slate-400/80" />
                            </div>
                            <div>
                                <label className="block text-[10.5px] font-bold text-[#64748b] uppercase tracking-[0.08em] mb-2">Confirm Password <span className="text-red-500">*</span></label>
                                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required disabled={isSaving} placeholder="••••••••" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[14px] text-[#0f172a] font-medium bg-[#fafbfe] hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all placeholder:text-slate-400/80" />
                            </div>
                        </>
                    )}
                    {isEdit && (
                        <>
                            <hr className="border-slate-100" />
                            <p className="text-[10.5px] font-bold text-[#64748b] uppercase tracking-[0.08em]">Reset Password <span className="font-medium tracking-normal normal-case text-slate-400 lowercase">(optional)</span></p>
                            <div>
                                <label className="block text-[10.5px] font-bold text-[#64748b] uppercase tracking-[0.08em] mb-2">New Password</label>
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={isSaving} placeholder="Leave blank to keep current" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[14px] text-[#0f172a] font-medium bg-[#fafbfe] hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all placeholder:text-slate-400/80" />
                            </div>
                            {newPassword && (
                                <div>
                                    <label className="block text-[10.5px] font-bold text-[#64748b] uppercase tracking-[0.08em] mb-2">Confirm New Password</label>
                                    <input type="password" value={confirmNew} onChange={e => setConfirmNew(e.target.value)} disabled={isSaving} placeholder="••••••••" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[14px] text-[#0f172a] font-medium bg-[#fafbfe] hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all placeholder:text-slate-400/80" />
                                </div>
                            )}
                        </>
                    )}
                    <div className="flex gap-3 pt-3">
                        <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 px-4 py-2.5 text-[13.5px] font-semibold text-[#64748b] bg-white border border-slate-200 hover:bg-slate-50 hover:text-[#0f172a] rounded-xl transition-all">Cancel</button>
                        <button type="submit" disabled={isSaving} className="flex-[1.5] px-4 py-2.5 text-[13.5px] font-semibold text-white bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border border-transparent rounded-xl disabled:opacity-50 transition-all shadow-[0_1px_3px_rgba(37,99,235,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]">{isSaving ? "Saving..." : isEdit ? "Save Changes" : "Create Staff"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ConfirmDeactivateModal({ member, onClose, onConfirm, isLoading }: { member: StaffMember; onClose: () => void; onConfirm: () => void; isLoading: boolean; }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={!isLoading ? onClose : undefined} />
            <div className="relative w-full max-w-[400px] bg-white rounded-[20px] shadow-[0_20px_40px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.02)] p-7 animate-in fade-in zoom-in duration-200">
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0 border border-red-100">
                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                        <h2 className="text-[18px] font-extrabold text-[#0f172a] tracking-tight">Deactivate Staff?</h2>
                        <p className="text-[13.5px] text-slate-500 mt-1 leading-relaxed">This user will immediately lose access to the dashboard.</p>
                    </div>
                </div>
                <div className="bg-[#fafbfe] rounded-xl px-4 py-3 border border-slate-100 my-6 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]"><span className="font-bold text-[#0f172a] text-[13.5px]">{member.email}</span></div>
                <div className="flex gap-3">
                    <button onClick={onClose} disabled={isLoading} className="flex-1 px-4 py-2.5 text-[13.5px] font-semibold text-[#64748b] bg-white border border-slate-200 hover:bg-slate-50 hover:text-[#0f172a] rounded-xl transition-all">Cancel</button>
                    <button onClick={onConfirm} disabled={isLoading} className="flex-[1.5] px-4 py-2.5 text-[13.5px] font-semibold text-white bg-red-500 hover:bg-red-600 border border-transparent rounded-xl disabled:opacity-50 transition-all shadow-[0_1px_3px_rgba(239,68,68,0.2)]">{isLoading ? "Wait..." : "Deactivate"}</button>
                </div>
            </div>
        </div>
    );
}

function Pagination({ total, limit, offset, onChange }: { total: number; limit: number; offset: number; onChange: (o: number) => void }) {
    const current = Math.floor(offset / limit) + 1;
    const pages = Math.max(1, Math.ceil(total / limit));
    if (pages <= 1) return null;
    return (
        <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${C.borderLight}` }}>
            <p className="text-[13px] font-medium text-[#475569]">Showing <span className="font-bold text-[#0f172a]">{offset + 1}</span> to <span className="font-bold text-[#0f172a]">{Math.min(offset + limit, total)}</span> of <span className="font-bold text-[#0f172a]">{total}</span></p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => onChange(offset - limit)} disabled={offset === 0} className="pg-btn"><svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg> Prev</button>
                <div className="hidden sm:flex items-center gap-1.5 px-2">
                    {[...Array(Math.min(pages, 5))].map((_, i) => {
                        const p = i + 1;
                        return <button key={p} onClick={() => onChange((p - 1) * limit)} className={`w-8 h-8 rounded-lg text-[13px] font-semibold transition-all ${p === current ? "bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[0_1px_2px_rgba(37,99,235,0.2)]" : "text-slate-500 hover:bg-slate-100 hover:text-blue-700"}`}>{p}</button>;
                    })}
                </div>
                <button onClick={() => onChange(offset + limit)} disabled={offset + limit >= total} className="pg-btn">Next <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
            </div>
        </div>
    );
}

export default function StaffPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    const [members, setMembers] = useState<StaffMember[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [offset, setOffset] = useState(0);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [editMember, setEditMember] = useState<StaffMember | null>(null);
    const [deactivateMember, setDeactivateMember] = useState<StaffMember | null>(null);
    const [isDeactivating, setIsDeactivating] = useState(false);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const toastId = useRef(0);

    const toast = useCallback((type: ToastType, msg: string) => {
        const id = ++toastId.current;
        setToasts(prev => [...prev, { id, type, msg }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    const dismissToast = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);

    const loadStaff = useCallback(async (opts?: { search?: string; status?: typeof statusFilter; offset?: number }) => {
        setLoading(true); setLoadError(null);
        try {
            const activeFilter = (opts?.status ?? statusFilter) === "all" ? undefined : (opts?.status ?? statusFilter) === "active";
            const res = await api.listStaff({ search: opts?.search ?? debouncedSearch, is_active: activeFilter, limit: PAGE_SIZE, offset: opts?.offset ?? offset });
            setMembers(res.items); setTotal(res.total);
        } catch (err) {
            setLoadError(err instanceof ApiError ? err.detail : "Failed to load staff.");
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, statusFilter, offset]);

    useEffect(() => { loadStaff(); }, [debouncedSearch, statusFilter, offset]); // eslint-disable-line

    const handleSearchChange = (val: string) => {
        setSearch(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => { setDebouncedSearch(val); setOffset(0); }, DEBOUNCE_MS);
    };

    const handleFilterChange = (f: "all" | "active" | "inactive") => { setStatusFilter(f); setOffset(0); };

    const handleSaved = useCallback((saved: StaffMember) => {
        if (editMember) { setMembers(prev => prev.map(m => m.id === saved.id ? saved : m)); toast("success", "Staff member updated successfully."); } else { setMembers(prev => [saved, ...prev]); setTotal(t => t + 1); toast("success", `${saved.email} has been added to your team.`); }
        setShowCreate(false); setEditMember(null);
    }, [editMember, toast]);

    const handleDeactivate = useCallback(async () => {
        if (!deactivateMember) return;
        setIsDeactivating(true);
        try {
            const updated = await api.deactivateStaff(deactivateMember.id);
            setMembers(prev => prev.map(m => m.id === updated.id ? updated : m)); setDeactivateMember(null); toast("success", `${updated.email} has been deactivated.`);
        } catch (err) { toast("error", err instanceof ApiError ? err.detail : "Failed to deactivate staff member."); } finally { setIsDeactivating(false); }
    }, [deactivateMember, toast]);

    const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    return (
        <>
            <style>{STYLES}</style>
            <Toast toasts={toasts} onDismiss={dismissToast} />
            {showCreate && <StaffModal mode="create" onClose={() => setShowCreate(false)} onSaved={handleSaved} />}
            {editMember && <StaffModal mode="edit" member={editMember} onClose={() => setEditMember(null)} onSaved={handleSaved} />}
            {deactivateMember && <ConfirmDeactivateModal member={deactivateMember} onClose={() => setDeactivateMember(null)} onConfirm={handleDeactivate} isLoading={isDeactivating} />}

            <div className="ov">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                    
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <div className="icon-badge" style={{ background: C.brandLight, color: C.brand, width: 28, height: 28 }}>
                                    <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                                <span style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '.06em', color: C.brand, textTransform: 'uppercase' }}>Organization Settings</span>
                            </div>
                            <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-.02em', color: C.text, margin: '0 0 6px 0' }}>Staff Management</h1>
                            <p style={{ fontSize: '14px', color: C.textSub, margin: 0, maxWidth: '500px', lineHeight: 1.5 }}>Add and manage team members who can access the dashboard.</p>
                        </div>
                        {isAdmin && (
                            <button onClick={() => setShowCreate(true)} className="qa-btn" style={{ height: 42 }}>
                                <svg width={18} height={18} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Add Member
                            </button>
                        )}
                    </div>

                    {/* Table Card */}
                    <div className="card">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: '20px 24px', borderBottom: `1px solid ${C.borderLight}` }}>
                            <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
                                <svg width={16} height={16} fill="none" stroke={C.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                                <input type="search" value={search} onChange={e => handleSearchChange(e.target.value)} placeholder="Search staff..." className="ov-sel" style={{ width: '100%', paddingLeft: 40 }} />
                            </div>
                            <div style={{ position: 'relative' }}>
                                <select value={statusFilter} onChange={e => handleFilterChange(e.target.value as "all" | "active" | "inactive")} className="ov-sel">
                                    <option value="all">All Statuses</option>
                                    <option value="active">Active Only</option>
                                    <option value="inactive">Inactive Only</option>
                                </select>
                                <svg width={14} height={14} fill="none" stroke={C.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><polyline points="6 9 12 15 18 9"/></svg>
                            </div>
                            <button onClick={() => loadStaff()} disabled={loading} className="pg-btn" style={{ padding: '0 16px', height: '40px' }} aria-label="Refresh">
                                <svg width={16} height={16} className={loading ? "animate-spin" : ""} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                            </button>
                        </div>
                        {loadError && (
                            <div role="alert" className="m-5 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-[13.5px] flex items-center justify-between">
                                {loadError}
                                <button onClick={() => loadStaff()} className="underline font-semibold hover:text-red-800">Retry</button>
                            </div>
                        )}
                        <div style={{ overflowX: 'auto' }}>
                            <table className="qtable">
                                <thead>
                                    <tr><th>Email</th><th>Role</th><th>Status</th><th>Joined</th>{isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}</tr>
                                </thead>
                                <tbody>
                                    {loading ? <TableSkeleton /> : members.length === 0 ? (
                                        <tr>
                                            <td colSpan={isAdmin ? 5 : 4} style={{ padding: '60px 24px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.slateBg, display: 'flex', alignItems: 'center', justifyItems: 'center', border: `1px solid ${C.border}` }}>
                                                        <svg width={24} height={24} fill="none" stroke={C.textMuted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ margin: 'auto' }}><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '15px', fontWeight: 600, color: C.text, marginBottom: 4 }}>{debouncedSearch ? `No staff matching "${debouncedSearch}"` : "No staff found"}</div>
                                                        <div style={{ fontSize: '13.5px', color: C.textSub }}>{debouncedSearch ? "Try checking for typos." : "Your organization doesn't have any staff added yet."}</div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : members.map(m => (
                                        <tr key={m.id} className="trow group">
                                            <td style={{ fontWeight: 600, color: C.text }}>{m.email}</td>
                                            <td><RoleBadge role={m.role} /></td>
                                            <td><StatusBadge active={m.is_active} /></td>
                                            <td className="tnum" style={{ color: C.textSub }}>{fmt(m.created_at)}</td>
                                            {isAdmin && (
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setEditMember(m)} style={{ padding: 6, color: C.textMuted, borderRadius: 8, transition: 'all .2s' }} className="hover:bg-blue-50 hover:text-blue-600"><svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
                                                        <button onClick={() => setDeactivateMember(m)} disabled={!m.is_active} style={{ padding: 6, color: C.textMuted, borderRadius: 8, transition: 'all .2s', opacity: m.is_active ? 1 : 0.3 }} className="hover:bg-red-50 hover:text-red-600 focus:outline-none"><svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination total={total} limit={PAGE_SIZE} offset={offset} onChange={setOffset} />
                    </div>
                </div>
            </div>
        </>
    );
}
