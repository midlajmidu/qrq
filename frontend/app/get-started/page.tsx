"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function GetStartedPage() {
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        orgName: "",
        companyType: "",
        email: "",
        phone: "",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);

        // PLACE YOUR GOOGLE APPS SCRIPT URL HERE
        const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxo9rC-b7e0DlAZI4Xr5NozIw8WPIEBK-ZTdkdPYE1EpQefQcAlIEDoe8lIQBSro_xZ/exec";

        try {
            // Sending as text/plain to avoid CORS preflight issues with Apps Script
            // The script handles the JSON parsing on its end
            await fetch(SCRIPT_URL, {
                method: "POST",
                mode: "no-cors",
                headers: {
                    "Content-Type": "text/plain",
                },
                body: JSON.stringify(formData),
            });

            // Because we use no-cors, we won't get a standard response object
            // but we assume success if no network error occurred
            setSubmitted(true);
        } catch (error) {
            console.error("Submission error:", error);
            setSubmitError("Failed to submit details. Please try again or contact support.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
            <div className="w-full max-w-md">
                {submitted ? (
                    <>
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-gray-900">Request Received</h1>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center space-y-6">
                            <div className="pb-6 border-b border-gray-100">
                                <Link href="/" className="inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1" aria-label="Go to home page">
                                    <Image src="/assets/q4queue-logocropp.png" alt="q4queue Logo" width={150} height={48} className="h-10 w-auto object-contain" />
                                </Link>
                            </div>

                            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-semibold text-gray-900">Thank You!</h2>
                            <p className="text-gray-600">
                                We have received your details. We will contact you soon.
                            </p>
                            <div className="pt-6">
                                <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
                                    Return to Home
                                </Link>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-gray-900">Get Started</h1>
                            <p className="text-gray-500 mt-2">Tell us a bit about your organization.</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-8">
                            <div className="text-center pb-6 border-b border-gray-100">
                                <Link href="/" className="inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1" aria-label="Go to home page">
                                    <Image src="/assets/q4queue-logocropp.png" alt="q4queue Logo" width={150} height={48} className="h-10 w-auto object-contain" />
                                </Link>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                                    <input
                                        id="orgName"
                                        name="orgName"
                                        type="text"
                                        required
                                        value={formData.orgName}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                                        placeholder="e.g. Acme Corp"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="companyType" className="block text-sm font-medium text-gray-700 mb-1">Company Type</label>
                                    <select
                                        id="companyType"
                                        name="companyType"
                                        required
                                        value={formData.companyType}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors bg-white"
                                    >
                                        <option value="" disabled>Select a type...</option>
                                        <option value="clinic">Clinic / Hospital</option>
                                        <option value="retail">Retail Store</option>
                                        <option value="restaurant">Restaurant / Cafe</option>
                                        <option value="bank">Bank / Financial Institution</option>
                                        <option value="government">Government Office</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                                        placeholder="you@example.com"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number (Optional)</label>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                                        placeholder="+1 (555) 000-0000"
                                    />
                                </div>

                                {submitError && (
                                    <p className="text-sm text-red-600 text-center">{submitError}</p>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-2.5 mt-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Submitting...
                                        </>
                                    ) : (
                                        "Submit Details"
                                    )}
                                </button>
                            </form>

                            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                                <p className="text-sm text-gray-600">
                                    Already have an account?{" "}
                                    <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium ml-1">
                                        Log in
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
