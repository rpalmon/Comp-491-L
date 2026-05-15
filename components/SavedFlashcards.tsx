"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, deleteDoc, doc } from "firebase/firestore";

interface Flashcard {
  front: string;
  back: string;
}

interface SavedDeck {
  id: string;
  summaryTitle: string;
  cards: Flashcard[];
  cardCount: number;
  createdAt: Date;
}

type DeckState = "list" | "studying";

export default function SavedFlashcards() {
  const { user } = useAuth();
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeck, setSelectedDeck] = useState<SavedDeck | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deckState, setDeckState] = useState<DeckState>("list");
  const [currentCard, setCurrentCard] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "flashcards"),
      where("userId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        summaryTitle: d.data().summaryTitle,
        cards: d.data().cards,
        cardCount: d.data().cardCount,
        createdAt: d.data().createdAt?.toDate() || new Date(),
      }));
      docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setDecks(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(id);
    try {
      await deleteDoc(doc(db, "flashcards", id));
      if (selectedDeck?.id === id) { setSelectedDeck(null); setDeckState("list"); }
    } catch { /* silent */ } finally {
      setDeleting(null);
    }
  };

  const handleStudy = (deck: SavedDeck) => {
    setSelectedDeck(deck);
    setCurrentCard(0);
    setFlipped(false);
    setDeckState("studying");
  };

  const goNext = () => {
    if (!selectedDeck) return;
    if (currentCard < selectedDeck.cards.length - 1) {
      setFlipped(false);
      setTimeout(() => setCurrentCard((p) => p + 1), 150);
    }
  };

  const goPrev = () => {
    if (currentCard > 0) {
      setFlipped(false);
      setTimeout(() => setCurrentCard((p) => p - 1), 150);
    }
  };

  // ═══════════ STUDYING ═══════════
  if (deckState === "studying" && selectedDeck) {
    const card = selectedDeck.cards[currentCard];
    const isLast = currentCard === selectedDeck.cards.length - 1;

    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => { setDeckState("list"); setSelectedDeck(null); }}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to decks
        </button>

        {/* Deck title */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">{selectedDeck.summaryTitle}</h2>
          <p className="text-gray-500 text-sm">{selectedDeck.cardCount} cards &middot; {formatDate(selectedDeck.createdAt)}</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">
              Card <span className="text-white font-semibold">{currentCard + 1}</span> of {selectedDeck.cards.length}
            </span>
            <span className="text-sm text-amber-400 font-medium">{Math.round(((currentCard + 1) / selectedDeck.cards.length) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 transition-all duration-500"
              style={{ width: `${((currentCard + 1) / selectedDeck.cards.length) * 100}%`, boxShadow: "0 0 10px rgba(245,158,11,0.3)" }}
            />
          </div>
        </div>

        {/* Card flip */}
        <div
          onClick={() => setFlipped(!flipped)}
          className="relative cursor-pointer mb-8"
          style={{ perspective: "1000px" }}
        >
          <div
            className="relative w-full transition-transform duration-500"
            style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
          >
            <div
              className="w-full glass-card neon-box rounded-2xl p-10 min-h-[280px] flex flex-col items-center justify-center text-center"
              style={{ backfaceVisibility: "hidden" }}
            >
              <span className="text-[10px] px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 font-bold uppercase tracking-wide mb-6">
                Front — tap to flip
              </span>
              <p className="text-2xl font-bold text-white leading-relaxed">{card.front}</p>
            </div>
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

        {/* Nav */}
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
            onClick={isLast ? () => { setDeckState("list"); setSelectedDeck(null); } : goNext}
            className="group relative flex-1 py-4 text-white font-semibold rounded-xl overflow-hidden transition-all hover:scale-[1.01]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-600" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative flex items-center justify-center gap-2">
              {isLast ? "Done" : "Next"}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={isLast ? "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M9 5l7 7-7 7"} />
              </svg>
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ═══════════ LIST ═══════════
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">My Flashcards</h1>
            <p className="text-gray-500 text-sm">Your saved flashcard decks — tap to study</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-2xl shimmer-loading border border-white/[0.04]" />
          ))}
        </div>
      ) : decks.length === 0 ? (
        <div className="text-center py-20">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 to-orange-500/15 rounded-3xl blur-2xl" />
            <div className="relative w-24 h-24 glass rounded-3xl flex items-center justify-center text-5xl">🎴</div>
          </div>
          <h2 className="text-xl font-semibold text-white mb-3">No flashcards yet</h2>
          <p className="text-gray-500 max-w-md mx-auto">Generate flashcards from the Flashcards tab, study them, and save to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {decks.map((deck) => (
            <div
              key={deck.id}
              onClick={() => handleStudy(deck)}
              className="group relative glass-card rounded-2xl p-6 text-left cursor-pointer"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-amber-500/40 to-orange-500/40 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wide bg-amber-500/15 text-amber-400 border-amber-500/25">
                  {deck.cardCount} cards
                </span>
                <span className="text-gray-600 text-xs">{formatDate(deck.createdAt)}</span>
              </div>

              <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-amber-300 transition-colors line-clamp-1">
                {deck.summaryTitle}
              </h3>

              <p className="text-gray-500 text-sm">
                {deck.cards[0]?.front.slice(0, 60)}...
              </p>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06]">
                <span className="text-xs text-gray-600 group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347" />
                  </svg>
                  Study now
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(deck.id, e)}
                    disabled={deleting === deck.id}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                  >
                    {deleting === deck.id ? (
                      <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                  <svg className="w-4 h-4 text-gray-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
