"use client";

import { useState } from "react";
import SummaryRenderer from "@/components/SummaryRenderer";

export default function VideoPage() {
    const [transcript, setTranscript] = useState("");
    const [summary, setSummary] = useState("");
    const [url, setUrl] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const handleSummarize = async () => {
        // validation
        if (!transcript && !url && !file) {
            alert("Please upload a file, paste a link, or enter transcript");
            return;
        }

        const formData = new FormData();

        if (file) {
            formData.append("file", file);
        }

        if (url) {
            formData.append("url", url);
        }

        if (transcript) {
            formData.append("transcript", transcript);
        }

        const res = await fetch("/api/video-summarize", {
            method: "POST",
            body: formData,
        });

        const data = await res.json();
        setSummary(data.summary || data.message);
    };

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-2xl font-bold mb-4 text-center">
                Video Summarizer
            </h1>

            {/* FILE UPLOAD */}
            <input
                type="file"
                accept="video/mp4"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mb-4 w-full"
            />

            {/* OR */}
            <p className="text-center text-gray-400 mb-2">OR</p>

            {/* YOUTUBE LINK */}
            <input
                type="text"
                placeholder="Paste YouTube link..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full p-2 border rounded mb-4"
            />

            {/* OR */}
            <p className="text-center text-gray-400 mb-2">OR</p>

            {/* TRANSCRIPT */}
            <textarea
                className="w-full p-2 border rounded mb-4"
                placeholder="Paste video transcript here..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
            />

            {/* BUTTON */}
            <button
                onClick={handleSummarize}
                className="bg-purple-500 text-white px-4 py-2 rounded w-full"
            >
                Generate Summary
            </button>

            {/* OUTPUT */}
            {summary && (
                <div className="mt-10 glass-card rounded-2xl overflow-hidden animate-fadeInUp">
                    <div className="flex items-center gap-3 p-6 border-b border-white/[0.06] bg-gradient-to-r from-purple-500/5 to-transparent">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white">Video Summary</h3>
                    </div>
                    <div className="p-8 sm:p-10">
                        <SummaryRenderer content={summary} />
                    </div>
                </div>
            )}
        </div>
    );
}