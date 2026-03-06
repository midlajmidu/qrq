"use client";

import React, { useEffect, useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";

interface QueueQRCodeProps {
    queueId: string;
    queueName: string;
}

export default function QueueQRCode({ queueId, queueName }: QueueQRCodeProps) {
    const [joinUrl, setJoinUrl] = useState("");
    const qrRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        setJoinUrl(`${baseUrl}/join/${queueId}`);
    }, [queueId]);

    const handleCopy = () => {
        if (joinUrl) {
            navigator.clipboard.writeText(joinUrl);
            alert("Join URL copied to clipboard!");
        }
    };

    const handleDownload = () => {
        const canvas = qrRef.current?.querySelector("canvas");
        if (canvas) {
            const url = canvas.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = url;
            a.download = `Queue_${queueName}_QR.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    if (!joinUrl) return null;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col items-center">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Queue QR Code</h2>
            <p className="text-sm text-gray-500 mb-4 text-center">
                Scan to join the <span className="font-semibold text-gray-700">{queueName}</span> queue
            </p>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4 flex justify-center w-full" ref={qrRef}>
                <QRCodeCanvas
                    value={joinUrl}
                    size={220}
                    level={"H"}
                    includeMargin={true}
                />
            </div>

            <p className="text-xs text-blue-600 mb-4 truncate w-full max-w-[250px] text-center" title={joinUrl}>
                {joinUrl}
            </p>

            <div className="flex gap-3 w-full">
                <button
                    onClick={handleCopy}
                    className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 font-medium text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                    Copy Link
                </button>
                <button
                    onClick={handleDownload}
                    className="flex-1 py-2 px-3 bg-blue-50 text-blue-700 font-medium text-sm rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                    Download QR
                </button>
            </div>
        </div>
    );
}
