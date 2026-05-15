"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import SummaryRenderer from "@/components/SummaryRenderer";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";

interface Summary {
  id: string;
  title: string;
  content: string;
  mode: string;
  createdAt: Date;
}

export default function SavedSummaries() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "summaries"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        content: doc.data().content,
        mode: doc.data().mode,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
      docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setSummaries(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(id);
    try {
      await deleteDoc(doc(db, "summaries", id));
      if (selectedSummary?.id === id) setSelectedSummary(null);
    } catch {
      // silently fail
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getPreview = (content: string) => {
    const clean = content.replace(/[#*_\->`]/g, "").trim();
    return clean.length > 120 ? clean.slice(0, 120) + "..." : clean;
  };

  const getModeColor = (mode: string) => {
    return mode === "notes"
      ? { bg: "from-violet-500/20 to-purple-500/20", border: "border-violet-500/30", tag: "bg-violet-500/15 text-violet-400 border-violet-500/25", glow: "violet" }
      : { bg: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/30", tag: "bg-blue-500/15 text-blue-400 border-blue-500/25", glow: "blue" };
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-2xl shimmer-loading border border-white/[0.04]" />
          ))}
        </div>
      </div>
    );
  }

  // Full summary view
  if (selectedSummary) {
    return (
      <div className="max-w-4xl mx-auto animate-fadeIn">
        <button
          onClick={() => setSelectedSummary(null)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to summaries
        </button>

        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/[0.06] bg-gradient-to-r from-violet-500/5 to-transparent">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-3">{selectedSummary.title}</h2>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wide ${getModeColor(selectedSummary.mode).tag}`}>
                    {selectedSummary.mode === "notes" ? "Notes" : "Summary"}
                  </span>
                  <span className="text-gray-500 text-sm">{formatDate(selectedSummary.createdAt)}</span>
                </div>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(selectedSummary.content)}
                className="flex items-center gap-2 px-4 py-2 text-sm glass hover:bg-white/[0.08] text-gray-300 rounded-lg transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                Copy
              </button>
            </div>
          </div>
          <div className="p-8 sm:p-10">
            <SummaryRenderer content={selectedSummary.content} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">My Summaries</h1>
            <p className="text-gray-500 text-sm">All your saved summaries and notes in one place</p>
          </div>
        </div>
      </div>

      {summaries.length === 0 ? (
        <div className="text-center py-20">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/15 to-blue-500/15 rounded-3xl blur-2xl" />
            <div className="relative w-24 h-24 glass rounded-3xl flex items-center justify-center text-5xl">
              📝
            </div>
          </div>
          <h2 className="text-xl font-semibold text-white mb-3">No summaries yet</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Upload a document or paste text in the Upload tab, then save the result to see it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summaries.map((summary) => {
            const colors = getModeColor(summary.mode);
            return (
              <div
                key={summary.id}
                onClick={() => setSelectedSummary(summary)}
                className="group relative glass-card rounded-2xl p-6 cursor-pointer"
              >
                {/* Top gradient accent on hover */}
                <div className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r ${colors.bg} opacity-0 group-hover:opacity-100 transition-opacity`} />

                {/* Tag + date */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wide ${colors.tag}`}>
                    {summary.mode === "notes" ? "Notes" : "Summary"}
                  </span>
                  <span className="text-gray-600 text-xs">{formatDate(summary.createdAt)}</span>
                </div>

                {/* Title */}
                <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-violet-200 transition-colors line-clamp-1">
                  {summary.title}
                </h3>

                {/* Preview */}
                <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">
                  {getPreview(summary.content)}
                </p>

                {/* Bottom row */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06]">
                  <span className="text-gray-600 text-xs flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {summary.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDelete(summary.id, e)}
                      disabled={deleting === summary.id}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      {deleting === summary.id ? (
                        <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                    <svg className="w-4 h-4 text-gray-600 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
