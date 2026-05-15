"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

interface Flashcard {
  front: string;
  back: string;
}

interface Summary {
  id: string;
  title: string;
  content: string;
  mode: string;
  createdAt: Date;
}

type FlashState = "select" | "configure" | "loading" | "studying" | "done";

export default function FlashcardGenerator() {
  const { user } = useAuth();

  const [flashState, setFlashState] = useState<FlashState>("select");
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [cardCount, setCardCount] = useState<number>(5);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState("");
  const [dots, setDots] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch summaries
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
      setLoadingSummaries(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Animated dots
  useEffect(() => {
    if (flashState !== "loading") return;
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(interval);
  }, [flashState]);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const getPreview = (content: string) => {
    const clean = content.replace(/[#*_\->`]/g, "").trim();
    return clean.length > 100 ? clean.slice(0, 100) + "..." : clean;
  };

  const getModeTag = (mode: string) =>
    mode === "notes"
      ? "bg-violet-500/15 text-violet-400 border-violet-500/25"
      : "bg-blue-500/15 text-blue-400 border-blue-500/25";

  const handleGenerate = async () => {
    if (!selectedSummary) return;
    setFlashState("loading");
    setError("");
    try {
      const res = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: selectedSummary.content, cardCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate flashcards");
      setCards(data.deck.cards);
      setCurrentCard(0);
      setFlipped(false);
      setFlashState("studying");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setFlashState("configure");
    }
  };

  const handleSave = async () => {
    if (!cards.length || !user || !selectedSummary) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "flashcards"), {
        userId: user.uid,
        summaryTitle: selectedSummary.title,
        cards,
        cardCount: cards.length,
        createdAt: serverTimestamp(),
      });
      setSaved(true);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (currentCard < cards.length - 1) {
      setFlipped(false);
      setTimeout(() => setCurrentCard((p) => p + 1), 150);
    } else {
      setFlashState("done");
    }
  };

  const goPrev = () => {
    if (currentCard > 0) {
      setFlipped(false);
      setTimeout(() => setCurrentCard((p) => p - 1), 150);
    }
  };

  // ═══════════ SELECT ═══════════
  if (flashState === "select") {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Flashcard Generator</h1>
              <p className="text-gray-500 text-sm">Select a summary to create flashcards from</p>
            </div>
          </div>
        </div>

        {loadingSummaries ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 rounded-2xl shimmer-loading border border-white/[0.04]" />
            ))}
          </div>
        ) : summaries.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 to-orange-500/15 rounded-3xl blur-2xl" />
              <div className="relative w-24 h-24 glass rounded-3xl flex items-center justify-center text-5xl">⚡</div>
            </div>
            <h2 className="text-xl font-semibold text-white mb-3">No summaries yet</h2>
            <p className="text-gray-500 max-w-md mx-auto">Upload and save a summary first, then come back to generate flashcards.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summaries.map((summary) => (
              <div
                key={summary.id}
                onClick={() => { setSelectedSummary(summary); setCardCount(5); setError(""); setSaved(false); setFlashState("configure"); }}
                className="group relative glass-card rounded-2xl p-6 text-left cursor-pointer"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-amber-500/40 to-orange-500/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wide ${getModeTag(summary.mode)}`}>
                    {summary.mode === "notes" ? "Notes" : "Summary"}
                  </span>
                  <span className="text-gray-600 text-xs">{formatDate(summary.createdAt)}</span>
                </div>
                <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-amber-300 transition-colors line-clamp-1">{summary.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">{getPreview(summary.content)}</p>
                <div className="flex items-center justify-end mt-4 pt-3 border-t border-white/[0.06]">
                  <span className="text-xs text-gray-600 group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                    Create flashcards
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ═══════════ CONFIGURE ═══════════
  if (flashState === "configure") {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => { setFlashState("select"); setSelectedSummary(null); setError(""); }}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to summaries
        </button>

        <div className="glass rounded-xl p-5 mb-8 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold truncate">{selectedSummary?.title}</p>
            <p className="text-gray-500 text-xs">{selectedSummary?.mode === "notes" ? "Notes" : "Summary"} &middot; {selectedSummary && formatDate(selectedSummary.createdAt)}</p>
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">How many flashcards?</label>
          <div className="grid grid-cols-3 gap-4">
            {[3, 5, 8].map((count) => (
              <button
                key={count}
                onClick={() => setCardCount(count)}
                className={`group relative p-6 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] text-center ${
                  cardCount === count ? "border-amber-500 bg-amber-500/5" : "border-white/[0.06] hover:border-white/[0.15] bg-white/[0.02]"
                }`}
              >
                <div className="text-4xl font-black text-white mb-1" style={cardCount === count ? { textShadow: "0 0 20px rgba(245,158,11,0.4)" } : {}}>
                  {count}
                </div>
                <p className="text-gray-500 text-xs">{count === 3 ? "Quick" : count === 5 ? "Standard" : "Deep Dive"}</p>
                {cardCount === count && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6 animate-fadeIn">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          className="group relative w-full py-4 text-white font-semibold rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity" />
          <span className="relative flex items-center justify-center gap-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            Generate {cardCount} Flashcards
          </span>
        </button>
      </div>
    );
  }

  // ═══════════ LOADING ═══════════
  if (flashState === "loading") {
    return (
      <div className="max-w-2xl mx-auto py-16">
        <div className="glass rounded-3xl p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="relative">
            <div className="relative w-20 h-20 mx-auto mb-8">
              <div className="absolute inset-0 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
              <div className="absolute inset-2 border-4 border-orange-500/10 border-b-orange-500/40 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Creating flashcards{dots}</h2>
            <p className="text-gray-400">Generating {cardCount} cards from &ldquo;{selectedSummary?.title}&rdquo;</p>
            <div className="mt-8 mx-auto max-w-xs">
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ backgroundSize: "200% 100%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════ STUDYING ═══════════
  if (flashState === "studying" && cards.length > 0) {
    const card = cards[currentCard];
    const isLast = currentCard === cards.length - 1;

    return (
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">
              Card <span className="text-white font-semibold">{currentCard + 1}</span> of {cards.length}
            </span>
            <span className="text-sm text-amber-400 font-medium">{Math.round(((currentCard + 1) / cards.length) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 transition-all duration-500"
              style={{ width: `${((currentCard + 1) / cards.length) * 100}%`, boxShadow: "0 0 10px rgba(245,158,11,0.3)" }}
            />
          </div>
        </div>

        {/* Flashcard with flip */}
        <div
          onClick={() => setFlipped(!flipped)}
          className="relative cursor-pointer mb-8 group"
          style={{ perspective: "1000px" }}
        >
          <div
            className="relative w-full transition-transform duration-500"
            style={{
              transformStyle: "preserve-3d",
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* Front */}
            <div
              className="w-full glass-card neon-box rounded-2xl p-10 min-h-[280px] flex flex-col items-center justify-center text-center"
              style={{ backfaceVisibility: "hidden" }}
            >
              <span className="text-[10px] px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 font-bold uppercase tracking-wide mb-6">
                Front — tap to flip
              </span>
              <p className="text-2xl font-bold text-white leading-relaxed">{card.front}</p>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 w-full glass-card rounded-2xl p-10 min-h-[280px] flex flex-col items-center justify-center text-center border border-amber-500/20 bg-amber-500/[0.03]"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <span className="text-[10px] px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold uppercase tracking-wide mb-6">
                Answer — tap to flip back
              </span>
              <p className="text-xl text-gray-200 leading-relaxed">{card.back}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <button
            onClick={goPrev}
            disabled={currentCard === 0}
            className={`flex-1 py-4 font-semibold glass rounded-xl transition-all flex items-center justify-center gap-2 ${
              currentCard === 0 ? "opacity-30 cursor-not-allowed text-gray-500" : "text-gray-300 hover:bg-white/[0.06]"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
          <button
            onClick={goNext}
            className="group relative flex-1 py-4 text-white font-semibold rounded-xl overflow-hidden transition-all hover:scale-[1.01]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-600" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative flex items-center justify-center gap-2">
              {isLast ? "Finish" : "Next"}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={isLast ? "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M9 5l7 7-7 7"} />
              </svg>
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ═══════════ DONE ═══════════
  if (flashState === "done") {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Completion card */}
        <div className="glass-card rounded-2xl p-10 text-center mb-8 border border-amber-500/20 bg-amber-500/[0.03] animate-fadeInUp">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">Deck Complete!</h2>
          <p className="text-gray-400">You&apos;ve gone through all {cards.length} flashcards from &ldquo;{selectedSummary?.title}&rdquo;</p>
        </div>

        {/* Save */}
        <div className="mb-6">
          {saved ? (
            <div className="flex items-center justify-center gap-3 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-fadeIn">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-400 font-medium">Saved to My Flashcards</span>
            </div>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className={`group relative w-full py-3.5 rounded-xl font-semibold overflow-hidden transition-all duration-300 flex items-center justify-center gap-3 ${
                saving ? "bg-white/[0.05] text-gray-400 cursor-not-allowed" : "text-white hover:scale-[1.01]"
              }`}
            >
              {!saving && <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600" />}
              {!saving && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />}
              <span className="relative flex items-center gap-3">
                {saving ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                ) : (
                  <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg> Save Flashcards</>
                )}
              </span>
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => { setCurrentCard(0); setFlipped(false); setFlashState("studying"); }}
            className="flex-1 py-4 text-gray-300 font-semibold glass rounded-xl hover:bg-white/[0.06] transition-all"
          >
            Study Again
          </button>
          <button
            onClick={() => { setCards([]); setSelectedSummary(null); setSaved(false); setError(""); setFlashState("select"); }}
            className="group relative flex-1 py-4 text-white font-semibold rounded-xl overflow-hidden transition-all hover:scale-[1.01]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-600" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative">New Deck</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
}
