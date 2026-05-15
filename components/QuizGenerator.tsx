"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";

interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
}

interface Quiz {
  questions: QuizQuestion[];
}

interface Summary {
  id: string;
  title: string;
  content: string;
  mode: string;
  createdAt: Date;
}

type QuizState = "select" | "configure" | "loading" | "taking" | "results";

export default function QuizGenerator() {
  const { user } = useAuth();

  const [quizState, setQuizState] = useState<QuizState>("select");
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
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

  // Animated dots for loading
  useEffect(() => {
    if (quizState !== "loading") return;
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(interval);
  }, [quizState]);

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

  const handleSelectSummary = (summary: Summary) => {
    setSelectedSummary(summary);
    setQuestionCount(5);
    setError("");
    setQuizState("configure");
  };

  const handleGenerateQuiz = async () => {
    if (!selectedSummary) return;
    setQuizState("loading");
    setError("");
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: selectedSummary.content,
          questionCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate quiz");
      setQuiz(data.quiz);
      setSelectedAnswers(new Array(data.quiz.questions.length).fill(null));
      setCurrentQuestion(0);
      setQuizState("taking");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setQuizState("configure");
    }
  };

  const handleSelectAnswer = (optionIndex: number) => {
    setSelectedAnswers((prev) => {
      const next = [...prev];
      next[currentQuestion] = optionIndex;
      return next;
    });
  };

  const handleNext = () => {
    if (!quiz) return;
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setQuizState("results");
    }
  };

  const handleSaveQuiz = async () => {
    if (!quiz || !user || !selectedSummary) return;
    setSaving(true);
    try {
      const { correct, total, percentage } = getScore();
      await addDoc(collection(db, "quizzes"), {
        userId: user.uid,
        summaryTitle: selectedSummary.title,
        questions: quiz.questions,
        userAnswers: selectedAnswers.filter((a): a is number => a !== null),
        score: correct,
        total,
        percentage,
        createdAt: serverTimestamp(),
      });
      setSaved(true);
    } catch {
      setError("Failed to save quiz. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getScore = () => {
    if (!quiz) return { correct: 0, total: 0, percentage: 0 };
    const correct = quiz.questions.reduce(
      (acc, q, i) => acc + (selectedAnswers[i] === q.correctIndex ? 1 : 0),
      0
    );
    return {
      correct,
      total: quiz.questions.length,
      percentage: Math.round((correct / quiz.questions.length) * 100),
    };
  };

  const scoreColor = (pct: number) => {
    if (pct >= 80) return { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", glow: "shadow-emerald-500/10" };
    if (pct >= 50) return { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", glow: "shadow-amber-500/10" };
    return { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", glow: "shadow-red-500/10" };
  };

  // ═══════════ SELECT STATE ═══════════
  if (quizState === "select") {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Quiz Generator</h1>
              <p className="text-gray-500 text-sm">Select a summary to generate a quiz from</p>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loadingSummaries ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 rounded-2xl shimmer-loading border border-white/[0.04]" />
            ))}
          </div>
        ) : summaries.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/15 to-violet-500/15 rounded-3xl blur-2xl" />
              <div className="relative w-24 h-24 glass rounded-3xl flex items-center justify-center text-5xl">
                📝
              </div>
            </div>
            <h2 className="text-xl font-semibold text-white mb-3">No summaries yet</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Upload and save a summary first in the Upload tab, then come back here to generate quizzes from it.
            </p>
          </div>
        ) : (
          /* Summary grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summaries.map((summary) => (
              <button
                key={summary.id}
                onClick={() => handleSelectSummary(summary)}
                className="group relative glass-card rounded-2xl p-6 text-left cursor-pointer"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-purple-500/40 to-violet-500/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wide ${getModeTag(summary.mode)}`}>
                    {summary.mode === "notes" ? "Notes" : "Summary"}
                  </span>
                  <span className="text-gray-600 text-xs">{formatDate(summary.createdAt)}</span>
                </div>
                <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-purple-300 transition-colors line-clamp-1">
                  {summary.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">
                  {getPreview(summary.content)}
                </p>
                <div className="flex items-center justify-end mt-4 pt-3 border-t border-white/[0.06]">
                  <span className="text-xs text-gray-600 group-hover:text-purple-400 transition-colors flex items-center gap-1.5">
                    Generate quiz
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ═══════════ CONFIGURE STATE ═══════════
  if (quizState === "configure") {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => { setQuizState("select"); setSelectedSummary(null); setError(""); }}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to summaries
        </button>

        {/* Selected summary info */}
        <div className="glass rounded-xl p-5 mb-8 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold truncate">{selectedSummary?.title}</p>
            <p className="text-gray-500 text-xs">
              {selectedSummary?.mode === "notes" ? "Notes" : "Summary"} &middot; {selectedSummary && formatDate(selectedSummary.createdAt)}
            </p>
          </div>
        </div>

        {/* Question count picker */}
        <div className="mb-8">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
            How many questions?
          </label>
          <div className="grid grid-cols-3 gap-4">
            {[3, 5, 8].map((count) => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                className={`group relative p-6 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] text-center ${
                  questionCount === count
                    ? "border-purple-500 bg-purple-500/5"
                    : "border-white/[0.06] hover:border-white/[0.15] bg-white/[0.02]"
                }`}
              >
                <div className="text-4xl font-black text-white mb-1" style={questionCount === count ? { textShadow: "0 0 20px rgba(168,85,247,0.4)" } : {}}>
                  {count}
                </div>
                <p className="text-gray-500 text-xs">
                  {count === 3 ? "Quick" : count === 5 ? "Standard" : "Deep Dive"}
                </p>
                {questionCount === count && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6 animate-fadeIn">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerateQuiz}
          className="group relative w-full py-4 text-white font-semibold rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity" />
          <span className="relative flex items-center justify-center gap-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Generate {questionCount}-Question Quiz
          </span>
        </button>
      </div>
    );
  }

  // ═══════════ LOADING STATE ═══════════
  if (quizState === "loading") {
    return (
      <div className="max-w-2xl mx-auto py-16">
        <div className="glass rounded-3xl p-16 text-center relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />

          <div className="relative">
            {/* Spinner */}
            <div className="relative w-20 h-20 mx-auto mb-8">
              <div className="absolute inset-0 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
              <div className="absolute inset-2 border-4 border-violet-500/10 border-b-violet-500/40 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Generating your quiz{dots}</h2>
            <p className="text-gray-400">
              Creating {questionCount} questions from &ldquo;{selectedSummary?.title}&rdquo;
            </p>

            {/* Shimmer bar */}
            <div className="mt-8 mx-auto max-w-xs">
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-purple-500 via-violet-500 to-purple-500 animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ backgroundSize: "200% 100%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════ TAKING STATE ═══════════
  if (quizState === "taking" && quiz) {
    const q = quiz.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
    const isLast = currentQuestion === quiz.questions.length - 1;
    const hasAnswered = selectedAnswers[currentQuestion] !== null;

    return (
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">
              Question <span className="text-white font-semibold">{currentQuestion + 1}</span> of {quiz.questions.length}
            </span>
            <span className="text-sm text-purple-400 font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-violet-500 to-blue-500 transition-all duration-500"
              style={{ width: `${progress}%`, boxShadow: "0 0 10px rgba(139,92,246,0.3)" }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="glass-card neon-box rounded-2xl p-8 mb-6 animate-fadeIn">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs px-3 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25 font-bold">
              Q{currentQuestion + 1}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-white leading-relaxed">
            {q.question}
          </h2>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-8">
          {q.options.map((option, i) => {
            const isSelected = selectedAnswers[currentQuestion] === i;
            return (
              <button
                key={i}
                onClick={() => handleSelectAnswer(i)}
                className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-300 hover:scale-[1.01] ${
                  isSelected
                    ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                    isSelected
                      ? "bg-purple-500 text-white"
                      : "bg-white/[0.06] text-gray-400"
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className={`text-sm leading-relaxed ${isSelected ? "text-white" : "text-gray-300"}`}>
                    {option}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Next / Results button */}
        <button
          onClick={handleNext}
          disabled={!hasAnswered}
          className={`group relative w-full py-4 text-white font-semibold rounded-xl overflow-hidden transition-all duration-300 ${
            hasAnswered ? "hover:scale-[1.01] active:scale-[0.99]" : "opacity-40 cursor-not-allowed"
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600" />
          {hasAnswered && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />}
          <span className="relative flex items-center justify-center gap-2">
            {isLast ? "See Results" : "Next Question"}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={isLast ? "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"} />
            </svg>
          </span>
        </button>
      </div>
    );
  }

  // ═══════════ RESULTS STATE ═══════════
  if (quizState === "results" && quiz) {
    const { correct, total, percentage } = getScore();
    const colors = scoreColor(percentage);

    return (
      <div className="max-w-2xl mx-auto">
        {/* Score card */}
        <div className={`glass-card rounded-2xl p-10 text-center mb-10 border ${colors.border} ${colors.bg} shadow-xl ${colors.glow} animate-fadeInUp`}>
          <div className={`text-6xl font-black mb-2 ${colors.text}`} style={{ textShadow: "0 0 30px currentColor" }}>
            {correct}/{total}
          </div>
          <div className={`text-2xl font-bold mb-3 ${colors.text}`}>{percentage}%</div>
          <p className="text-gray-400">
            {percentage >= 80 ? "Excellent work! You've mastered this material." : percentage >= 50 ? "Good effort! Review the ones you missed." : "Keep studying! Review the material and try again."}
          </p>
        </div>

        {/* Question review */}
        <div className="space-y-4 mb-10">
          <h3 className="text-lg font-semibold text-white mb-4">Review Answers</h3>
          {quiz.questions.map((q, qi) => {
            const userAnswer = selectedAnswers[qi];
            const isCorrect = userAnswer === q.correctIndex;

            return (
              <div key={qi} className="glass-card rounded-xl p-6 animate-fadeInUp" style={{ animationDelay: `${qi * 80}ms` }}>
                <div className="flex items-start gap-3 mb-4">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${isCorrect ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                    {isCorrect ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                  </div>
                  <p className="text-white font-medium text-sm leading-relaxed">{q.question}</p>
                </div>
                <div className="space-y-2 ml-10">
                  {q.options.map((option, oi) => {
                    const isCorrectOption = oi === q.correctIndex;
                    const isUserPick = oi === userAnswer;
                    const isWrongPick = isUserPick && !isCorrectOption;

                    return (
                      <div
                        key={oi}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm border ${
                          isCorrectOption
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : isWrongPick
                            ? "border-red-500/30 bg-red-500/10 text-red-300"
                            : "border-white/[0.04] text-gray-600"
                        }`}
                      >
                        <span className={`font-bold text-xs ${isCorrectOption ? "text-emerald-400" : isWrongPick ? "text-red-400" : "text-gray-700"}`}>
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <span>{option}</span>
                        {isCorrectOption && (
                          <svg className="w-4 h-4 ml-auto text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        )}
                        {isWrongPick && (
                          <svg className="w-4 h-4 ml-auto text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Save Quiz */}
        <div className="mb-6">
          {saved ? (
            <div className="flex items-center justify-center gap-3 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-fadeIn">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-400 font-medium">Saved to Quiz History</span>
            </div>
          ) : (
            <button
              onClick={handleSaveQuiz}
              disabled={saving}
              className={`group relative w-full py-3.5 rounded-xl font-semibold overflow-hidden transition-all duration-300 flex items-center justify-center gap-3 ${
                saving ? "bg-white/[0.05] text-gray-400 cursor-not-allowed" : "text-white hover:scale-[1.01]"
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
                    Save to Quiz History
                  </>
                )}
              </span>
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => {
              setCurrentQuestion(0);
              setSelectedAnswers(new Array(quiz.questions.length).fill(null));
              setSaved(false);
              setQuizState("taking");
            }}
            className="flex-1 py-4 text-gray-300 font-semibold glass rounded-xl hover:bg-white/[0.06] transition-all"
          >
            Retake Quiz
          </button>
          <button
            onClick={() => {
              setQuiz(null);
              setSelectedSummary(null);
              setSelectedAnswers([]);
              setCurrentQuestion(0);
              setError("");
              setSaved(false);
              setQuizState("select");
            }}
            className="group relative flex-1 py-4 text-white font-semibold rounded-xl overflow-hidden transition-all hover:scale-[1.01]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-violet-600" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative">New Quiz</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
}
