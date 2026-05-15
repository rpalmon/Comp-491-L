"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import ProcessingAnimation from "@/components/ProcessingAnimation";
import SavedSummaries from "@/components/SavedSummaries";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import StarField from "@/components/StarField";
import QuizGenerator from "@/components/QuizGenerator";
import QuizHistory from "@/components/QuizHistory";
import FlashcardGenerator from "@/components/FlashcardGenerator";
import SavedFlashcards from "@/components/SavedFlashcards";
import FlappyStudy from "@/components/FlappyStudy";
import VideoProcessingAnimation from "@/components/VideoProcessingAnimation";
import StudyPlans from "@/components/StudyPlans";
import DisplayProgress from "@/components/DisplayProgress";
import SummaryRenderer from "@/components/SummaryRenderer";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("upload");
  const [uploadType, setUploadType] = useState<"summary" | "video">("summary");
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center noise-overlay" style={{ background: "#050510" }}>
        <div className="text-center">
          <div className="relative">
            <div className="w-14 h-14 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mx-auto" />
            <div className="absolute inset-0 w-14 h-14 border-4 border-blue-500/10 border-b-blue-500/40 rounded-full animate-spin mx-auto" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <p className="text-gray-400 mt-4">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const features = [
    { id: "upload", icon: "📤", title: "Upload", badge: null },
    { id: "summary", icon: "📝", title: "My Summaries", badge: null },
    { id: "video", icon: "🎥", title: "Video Summarizer", badge: null },
    { id: "quiz", icon: "❓", title: "Quiz Generator", badge: null },
    { id: "quiz-history", icon: "📋", title: "Quiz History", badge: null },
    { id: "flashcards", icon: "🎴", title: "Flashcards", badge: null },
    { id: "saved-flashcards", icon: "📖", title: "My Flashcards", badge: null },
    { id: "plans", icon: "📅", title: "Study Plans", badge: null },
    { id: "progress", icon: "📊", title: "Progress", badge: null },
    { id: "games", icon: "🎮", title: "Flappy Study", badge: null },
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) { setFile(droppedFile); setError(""); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) { setFile(selected); setError(""); }
  };

  const handleProcess = async () => {
    if (!file && !text.trim()) {
      setError("Please upload a file or paste some text.");
      return;
    }
    setProcessing(true);
    setError("");
    setResult("");
    setSaved(false);
    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      if (text.trim()) formData.append("text", text.trim());
      formData.append("mode", "summary");
      const res = await fetch("/api/summarize", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResult(data.result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!result || !user) return;
    setSaving(true);
    try {
      let title = "Untitled Summary";
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const titleRes = await fetch("/api/generate-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: result }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await titleRes.json();
        if (data.title) title = data.title;
      } catch { /* use default */ }

      await addDoc(collection(db, "summaries"), {
        userId: user.uid,
        title,
        content: result,
        mode: "summary",
        createdAt: serverTimestamp(),
      });
      setSaved(true);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen noise-overlay relative" style={{ background: "#050510" }}>
      {/* Interactive star field background */}
      <StarField />
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="absolute top-0 left-0 w-[600px] h-[400px] bg-blue-600/[0.04] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-violet-600/[0.04] rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 flex pt-[72px]">
        {/* Left Sidebar */}
        <div className="hidden lg:block w-72 border-r border-white/[0.06] bg-gradient-to-b from-white/[0.015] to-transparent min-h-[calc(100vh-72px)]">
          <div className="sticky top-[72px] px-5 py-8">
            <div className="mb-8">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3 px-1">
                Tools
              </h3>
              <div className="h-[2px] w-10 bg-gradient-to-r from-violet-500 to-transparent rounded-full" />
            </div>
            <nav className="space-y-1">
              {features.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => setActiveTab(feature.id)}
                  className={`group w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative ${activeTab === feature.id
                    ? "bg-gradient-to-r from-violet-500/15 to-blue-500/10 text-white border border-violet-500/20 shadow-lg shadow-violet-500/5"
                    : "text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${activeTab === feature.id
                      ? "bg-gradient-to-br from-violet-500/25 to-blue-500/25 scale-110"
                      : "bg-white/[0.03] group-hover:bg-white/[0.08]"
                      }`}>
                      <span className="text-lg">{feature.icon}</span>
                    </div>
                    <span className="font-medium">{feature.title}</span>
                  </div>
                  {feature.badge && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-bold uppercase tracking-wide">
                      {feature.badge}
                    </span>
                  )}
                  {activeTab === feature.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-gradient-to-b from-violet-500 to-blue-500 rounded-r-full" />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-strong border-t border-white/[0.08] px-4 py-2">
          <div className="flex items-center justify-around">
            {features.slice(0, 5).map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveTab(f.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${activeTab === f.id ? "text-violet-400" : "text-gray-500"
                  }`}
              >
                <span className="text-lg">{f.icon}</span>
                <span className="text-[10px] font-medium">{f.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 px-6 lg:px-10 py-8 pb-24 lg:pb-8">
          {activeTab === "upload" ? (
            processing ? (
              <ProcessingAnimation />
            ) : (
              <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white">Upload Content</h1>
                      <p className="text-gray-500 text-sm">Upload your study materials to get started</p>
                    </div>
                  </div>
                </div>

                {/* Upload Area */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative rounded-2xl transition-all duration-500 cursor-pointer overflow-hidden ${dragActive
                    ? "border-2 border-violet-500 bg-violet-500/5 scale-[1.01]"
                    : file
                      ? "border-2 border-emerald-500/40 bg-emerald-500/5"
                      : "border-2 border-dashed border-white/10 hover:border-violet-500/30 hover:bg-white/[0.02]"
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Inner gradient glow */}
                  <div className={`absolute inset-0 transition-opacity duration-500 ${dragActive ? "opacity-100" : "opacity-0"}`}>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px]" />
                  </div>

                  <div className="relative p-14 text-center">
                    <div className="mb-6">
                      <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-4xl transition-all duration-300 ${file
                        ? "bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border border-emerald-500/20"
                        : "bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-white/10"
                        }`}>
                        {file ? (
                          <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-10 h-10 text-violet-400 animate-float-gentle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        )}
                      </div>
                    </div>
                    {file ? (
                      <>
                        <h3 className="text-xl font-semibold text-white mb-1">{file.name}</h3>
                        <p className="text-gray-400 mb-6">{(file.size / 1024).toFixed(1)} KB</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                          className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-xl transition-all border border-red-500/20 hover:border-red-500/30"
                        >
                          Remove File
                        </button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-xl font-semibold text-white mb-2">Drop your files here</h3>
                        <p className="text-gray-400 mb-6">or click to browse from your device</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          className="group relative px-7 py-3 text-white font-medium rounded-xl overflow-hidden transition-all hover:scale-[1.02]"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-blue-600" />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                          <span className="relative">Choose File</span>
                        </button>
                        <p className="text-gray-600 text-sm mt-4">PDF, DOCX, TXT, MD</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 my-8">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <span className="text-gray-600 text-xs font-bold tracking-widest uppercase">Or paste text</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>

                {/* Text Area */}
                <div className="mb-8">
                  <textarea
                    value={text}
                    onChange={(e) => { setText(e.target.value); setError(""); }}
                    placeholder="Paste your lecture notes, study material, or any text here..."
                    className="w-full h-48 px-6 py-5 bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] focus:border-violet-500/40 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/15 transition-all resize-none input-glow"
                  />
                </div>

                {/* Mode Selection */}
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Processing mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { type: "summary" as const, icon: "📝", title: "Summary", desc: "Key takeaways", color: "blue", border: "border-blue-500", bg: "bg-blue-500/5" },
                      { type: "video" as const, icon: "🎥", title: "Video", desc: "Video content", color: "purple", border: "border-purple-500", bg: "bg-purple-500/5" },
                    ].map((mode) => (
                      <button
                        key={mode.type}
                        onClick={() => setUploadType(mode.type)}
                        className={`group relative p-6 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] ${uploadType === mode.type
                          ? `${mode.border} ${mode.bg}`
                          : "border-white/[0.06] hover:border-white/[0.15] bg-white/[0.02]"
                          }`}
                      >
                        <div className="text-3xl mb-3">{mode.icon}</div>
                        <h4 className="text-white font-semibold mb-1">{mode.title}</h4>
                        <p className="text-gray-500 text-xs">{mode.desc}</p>
                        {uploadType === mode.type && (
                          <div className={`absolute top-3 right-3 w-5 h-5 rounded-full bg-${mode.color}-500 flex items-center justify-center`}>
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fadeIn">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      {error}
                    </div>
                  )}

                  {/* Process button */}
                  <button
                    onClick={handleProcess}
                    disabled={processing}
                    className={`group relative w-full py-4 text-white font-semibold rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] ${processing ? "opacity-70 cursor-not-allowed" : ""
                      }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-blue-600 to-violet-600 bg-[length:200%_100%] group-hover:animate-[shimmer_2s_linear_infinite]" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-blue-600 rounded-xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity" />
                    <span className="relative flex items-center justify-center gap-3">
                      {processing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing with Claude...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                          </svg>
                          Process Content
                        </>
                      )}
                    </span>
                  </button>
                </div>

                {/* Result */}
                {result && (
                  <div className="mt-10 glass-card rounded-2xl overflow-hidden animate-fadeInUp">
                    <div className="flex items-center justify-between p-6 border-b border-white/[0.06] bg-gradient-to-r from-violet-500/5 to-transparent">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white">
                          Summary
                        </h3>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(result)}
                        className="flex items-center gap-2 px-4 py-2 text-sm glass hover:bg-white/[0.08] text-gray-300 rounded-lg transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                        </svg>
                        Copy
                      </button>
                    </div>
                    <div className="p-8 sm:p-10">
                      <SummaryRenderer content={result} />
                    </div>

                    {/* Save */}
                    <div className="p-6 pt-0">
                      <div className="pt-5 border-t border-white/[0.06]">
                        {saved ? (
                          <div className="flex items-center justify-center gap-3 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-fadeIn">
                            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-emerald-400 font-medium">Saved to My Summaries</span>
                            <button
                              onClick={() => setActiveTab("summary")}
                              className="text-emerald-300 underline underline-offset-2 hover:text-emerald-200 text-sm ml-2"
                            >
                              View
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`group relative w-full py-3.5 rounded-xl font-semibold overflow-hidden transition-all duration-300 flex items-center justify-center gap-3 ${saving
                              ? "bg-white/[0.05] text-gray-400 cursor-not-allowed"
                              : "text-white hover:scale-[1.01]"
                              }`}
                          >
                            {!saving && <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600" />}
                            {!saving && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />}
                            <span className="relative flex items-center gap-3">
                              {saving ? (
                                <>
                                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                  </svg>
                                  Save to My Summaries
                                </>
                              )}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          ) : activeTab === "summary" ? (
            <SavedSummaries />
          ) : activeTab === "video" ? (
            processing ? (
              <VideoProcessingAnimation />
            ) : (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-4">
                Video Summarizer
              </h2>

              <p className="text-gray-400 mb-6">
                Upload a video file or paste a YouTube link to generate a summary.
              </p>

              {/* YouTube URL Input */}
              <input
                type="text"
                placeholder="Paste YouTube link..."
                className="w-full p-4 mb-4 rounded-xl bg-white/5 border border-white/10 text-white"
                onChange={(e) => setText(e.target.value)}
              />

              {/* Video Upload */}
              <input
                type="file"
                accept="video/*"
                className="mb-4 text-white"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) setFile(selected);
                }}
              />

              {/* Submit Button */}
              <button
                onClick={async () => {
                  if (!file && !text) {
                    setError("Upload video or paste link");
                    return;
                  }

                  setProcessing(true);
                  setError("");
                  setResult("");

                  try {
                    const formData = new FormData();
                    if (file) formData.append("file", file);
                    if (text) formData.append("url", text);

                    const res = await fetch("/api/video-summarize", {
                      method: "POST",
                      body: formData,
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);

                    setResult(data.summary);
                  } catch (err: any) {
                    setError(err.message);
                  } finally {
                    setProcessing(false);
                  }
                }}
                className="bg-purple-600 px-6 py-3 rounded-xl text-white"
              >
                Generate Summary
              </button>

              {/* Result */}
              {result && (
                <div className="mt-10 glass-card rounded-2xl overflow-hidden animate-fadeInUp">
                  <div className="flex items-center justify-between p-6 border-b border-white/[0.06] bg-gradient-to-r from-purple-500/5 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-white">
                        Video Summary
                      </h3>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(result)}
                      className="flex items-center gap-2 px-4 py-2 text-sm glass hover:bg-white/[0.08] text-gray-300 rounded-lg transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                      </svg>
                      Copy
                    </button>
                  </div>
                  <div className="p-8 sm:p-10">
                    <SummaryRenderer content={result} />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-red-400 mt-4">{error}</p>
              )}
            </div>
            )
          ) : activeTab === "quiz" ? (
              <QuizGenerator />
            ) : activeTab === "quiz-history" ? (
              <QuizHistory />
            ) : activeTab === "flashcards" ? (
              <FlashcardGenerator />
            ) : activeTab === "saved-flashcards" ? (
              <SavedFlashcards />
            ) : activeTab === "plans" ? (
              <StudyPlans />
            ) : activeTab === "progress" ? (
              <DisplayProgress />
            ) : activeTab === "games" ? (
              <FlappyStudy />
            ) : (
              <div className="max-w-4xl mx-auto text-center py-20">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-blue-500/20 rounded-3xl blur-2xl" />
                  <div className="relative w-24 h-24 glass rounded-3xl flex items-center justify-center text-5xl">
                    🚧
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">
                  Coming Soon
                </h2>
                <p className="text-gray-400 max-w-md mx-auto">
                  This feature is currently under development. Stay tuned for updates!
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}