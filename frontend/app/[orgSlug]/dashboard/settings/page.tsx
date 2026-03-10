"use client";

import React, { useState, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import type { OrganizationSettingsResponse } from "@/types/api";

export default function SettingsPage() {
    // Clinic Info State
    const [settings, setSettings] = useState<OrganizationSettingsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingInfo, setIsSavingInfo] = useState(false);

    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [phone, setPhone] = useState("");

    const [infoSuccess, setInfoSuccess] = useState<string | null>(null);
    const [infoError, setInfoError] = useState<string | null>(null);

    // Password State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
    const [pwdError, setPwdError] = useState<string | null>(null);

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await api.getOrganizationSettings();
                setSettings(data);
                setName(data.name);
                setAddress(data.address || "");
                setPhone(data.phone_number || "");
            } catch (err) {
                setInfoError(err instanceof ApiError ? err.detail : "Failed to load settings.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSaveInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setInfoSuccess(null);
        setInfoError(null);
        setIsSavingInfo(true);

        try {
            const data = await api.updateOrganizationSettings({
                name,
                address: address || null,
                phone_number: phone || null,
            });
            setSettings(data);
            setInfoSuccess("Settings updated successfully");
        } catch (err) {
            setInfoError(err instanceof ApiError ? err.detail : "Failed to update settings.");
        } finally {
            setIsSavingInfo(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwdSuccess(null);
        setPwdError(null);

        if (newPassword !== confirmPassword) {
            setPwdError("New passwords do not match.");
            return;
        }

        setIsSavingPassword(true);

        try {
            await api.changePassword({
                current_password: currentPassword,
                new_password: newPassword,
            });
            setPwdSuccess("Password changed successfully");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            setPwdError(err instanceof ApiError ? err.detail : "Failed to change password.");
        } finally {
            setIsSavingPassword(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center mt-20">
                <span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Organization Settings</h1>

            {/* Clinic Information Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">Clinic Information</h2>
                    <p className="text-sm text-gray-500 mt-1">Update your organization&apos;s contact details.</p>
                </div>

                <form onSubmit={handleSaveInfo} className="p-6 space-y-6">
                    {infoSuccess && (
                        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm border border-emerald-100">
                            {infoSuccess}
                        </div>
                    )}
                    {infoError && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-100">
                            {infoError}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm text-gray-900"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm text-gray-900"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <textarea
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm text-gray-900"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Slug (Read-only)</label>
                            <input
                                type="text"
                                disabled
                                value={settings?.slug || ""}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email (Read-only)</label>
                            <input
                                type="email"
                                disabled
                                value={settings?.email || ""}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={isSavingInfo || !name.trim()}
                            className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg text-sm hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 transition-all shadow-sm"
                        >
                            {isSavingInfo ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Change Password Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
                    <p className="text-sm text-gray-500 mt-1">Update your admin account password.</p>
                </div>

                <form onSubmit={handleUpdatePassword} className="p-6 space-y-6">
                    {pwdSuccess && (
                        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm border border-emerald-100">
                            {pwdSuccess}
                        </div>
                    )}
                    {pwdError && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-100">
                            {pwdError}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                            <div className="relative">
                                <input
                                    type={showCurrent ? "text" : "password"}
                                    required
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm text-gray-900 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showCurrent ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <div className="relative">
                                <input
                                    type={showNew ? "text" : "password"}
                                    required
                                    minLength={8}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm text-gray-900 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showNew ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    required
                                    minLength={8}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm text-gray-900 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirm ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-start pt-2">
                        <button
                            type="submit"
                            disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
                            className="px-5 py-2.5 bg-gray-900 text-white font-medium rounded-lg text-sm hover:bg-gray-800 focus:ring-4 focus:ring-gray-900/20 disabled:opacity-50 transition-all shadow-sm"
                        >
                            {isSavingPassword ? "Updating Password..." : "Update Password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
