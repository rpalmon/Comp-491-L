"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  addDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
}

interface SavedQuiz {
  id: string;
  summaryTitle: string;
  questions: QuizQuestion[];
  userAnswers: number[];
  score: number;
  total: number;
  percentage: number;
  createdAt: Date;
}

type HistoryState = "list" | "detail" | "retaking" | "retake-results";

export default function QuizHistory() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<SavedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<SavedQuiz | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [historyState, setHistoryState] = useState<HistoryState>("list");

  // Retake state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [retakeAnswers, setRetakeAnswers] = useState<(number | null)[]>([]);
  const [savingRetake, setSavingRetake] = useState(false);
  const [retakeSaved, setRetakeSaved] = useState(false);

  // Fetch quizzes
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "quizzes"),
      where("userId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        summaryTitle: d.data().summaryTitle,
        questions: d.data().questions,
        userAnswers: d.data().userAnswers,
        score: d.data().score,
        total: d.data().total,
        percentage: d.data().percentage,
        createdAt: d.data().createdAt?.toDate() || new Date(),
      }));
      docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setQuizzes(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const scoreColor = (pct: number) => {
    if (pct >= 80) return { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", tag: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" };
    if (pct >= 50) return { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", tag: "bg-amber-500/15 text-amber-400 border-amber-500/25" };
    return { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", tag: "bg-red-500/15 text-red-400 border-red-500/25" };
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(id);
    try {
      await deleteDoc(doc(db, "quizzes", id));
      if (selectedQuiz?.id === id) {
        setSelectedQuiz(null);
        setHistoryState("list");
      }
    } catch { /* silent */ } finally {
      setDeleting(null);
    }
  };

  const handleStartRetake = () => {
    if (!selectedQuiz) return;
    setCurrentQuestion(0);
    setRetakeAnswers(new Array(selectedQuiz.questions.length).fill(null));
    setRetakeSaved(false);
    setHistoryState("retaking");
  };

  const handleRetakeAnswer = (optionIndex: number) => {
    setRetakeAnswers((prev) => {
      const next = [...prev];
      next[currentQuestion] = optionIndex;
      return next;
    });
  };

  const handleRetakeNext = () => {
    if (!selectedQuiz) return;
    if (currentQuestion < selectedQuiz.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setHistoryState("retake-results");
    }
  };

  const getRetakeScore = () => {
    if (!selectedQuiz) return { correct: 0, total: 0, percentage: 0 };
    const correct = selectedQuiz.questions.reduce(
      (acc, q, i) => acc + (retakeAnswers[i] === q.correctIndex ? 1 : 0),
      0
    );
    return {
      correct,
      total: selectedQuiz.questions.length,
      percentage: Math.round((correct / selectedQuiz.questions.length) * 100),
    };
  };

  const handleSaveRetake = async () => {
    if (!selectedQuiz || !user) return;
    setSavingRetake(true);
    try {
      const { correct, total, percentage } = getRetakeScore();
      await addDoc(collection(db, "quizzes"), {
        userId: user.uid,
        summaryTitle: selectedQuiz.summaryTitle,
        questions: selectedQuiz.questions,
        userAnswers: retakeAnswers.filter((a): a is number => a !== null),
        score: correct,
        total,
        percentage,
        createdAt: serverTimestamp(),
      });
      setRetakeSaved(true);
    } catch { /* silent */ } finally {
      setSavingRetake(false);
    }
  };

  const goBackToList = () => {
    setSelectedQuiz(null);
    setHistoryState("list");
    setRetakeSaved(false);
  };

  // ═══════════ RETAKING STATE ═══════════
  if (historyState === "retaking" && selectedQuiz) {
    const q = selectedQuiz.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / selectedQuiz.questions.length) * 100;
    const isLast = currentQuestion === selectedQuiz.questions.length - 1;
    const hasAnswered = retakeAnswers[currentQuestion] !== null;

    return (
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <button
          onClick={() => setHistoryState("detail")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Quit retake
        </button>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">
              Question <span className="text-white font-semibold">{currentQuestion + 1}</span> of {selectedQuiz.questions.length}
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

        {/* Question */}
        <div className="glass-card neon-box rounded-2xl p-8 mb-6 animate-fadeIn">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs px-3 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25 font-bold">
              Q{currentQuestion + 1}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-white leading-relaxed">{q.question}</h2>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-8">
          {q.options.map((option, i) => {
            const isSelected = retakeAnswers[currentQuestion] === i;
            return (
              <button
                key={i}
                onClick={() => handleRetakeAnswer(i)}
                className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-300 hover:scale-[1.01] ${
                  isSelected
                    ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                    isSelected ? "bg-purple-500 text-white" : "bg-white/[0.06] text-gray-400"
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className={`text-sm leading-relaxed ${isSelected ? "text-white" : "text-gray-300"}`}>{option}</span>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleRetakeNext}
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

  // ═══════════ RETAKE RESULTS STATE ═══════════
  if (historyState === "retake-results" && selectedQuiz) {
    const { correct, total, percentage } = getRetakeScore();
    const colors = scoreColor(percentage);

    return (
      <div className="max-w-2xl mx-auto">
        {/* Score */}
        <div className={`glass-card rounded-2xl p-10 text-center mb-10 border ${colors.border} ${colors.bg} shadow-xl animate-fadeInUp`}>
          <div className={`text-6xl font-black mb-2 ${colors.text}`} style={{ textShadow: "0 0 30px currentColor" }}>
            {correct}/{total}
          </div>
          <div className={`text-2xl font-bold mb-3 ${colors.text}`}>{percentage}%</div>
          <p className="text-gray-400">
            {percentage >= 80 ? "Excellent! You've improved!" : percentage >= 50 ? "Getting better! Keep practicing." : "Keep at it! Review the material and try again."}
          </p>
        </div>

        {/* Question review */}
        <div className="space-y-4 mb-10">
          <h3 className="text-lg font-semibold text-white mb-4">Review Answers</h3>
          {selectedQuiz.questions.map((q, qi) => {
            const userAnswer = retakeAnswers[qi];
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
                      <div key={oi} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm border ${
                        isCorrectOption ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : isWrongPick ? "border-red-500/30 bg-red-500/10 text-red-300"
                        : "border-white/[0.04] text-gray-600"
                      }`}>
                        <span className={`font-bold text-xs ${isCorrectOption ? "text-emerald-400" : isWrongPick ? "text-red-400" : "text-gray-700"}`}>
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <span>{option}</span>
                        {isCorrectOption && <svg className="w-4 h-4 ml-auto text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        {isWrongPick && <svg className="w-4 h-4 ml-auto text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Save retake */}
        <div className="mb-6">
          {retakeSaved ? (
            <div className="flex items-center justify-center gap-3 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-fadeIn">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-400 font-medium">Saved to Quiz History</span>
            </div>
          ) : (
            <button
              onClick={handleSaveRetake}
              disabled={savingRetake}
              className={`group relative w-full py-3.5 rounded-xl font-semibold overflow-hidden transition-all duration-300 flex items-center justify-center gap-3 ${
                savingRetake ? "bg-white/[0.05] text-gray-400 cursor-not-allowed" : "text-white hover:scale-[1.01]"
              }`}
            >
              {!savingRetake && <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600" />}
              {!savingRetake && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />}
              <span className="relative flex items-center gap-3">
                {savingRetake ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                ) : (
                  <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg> Save This Attempt</>
                )}
              </span>
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleStartRetake}
            className="flex-1 py-4 text-gray-300 font-semibold glass rounded-xl hover:bg-white/[0.06] transition-all"
          >
            Try Again
          </button>
          <button
            onClick={goBackToList}
            className="group relative flex-1 py-4 text-white font-semibold rounded-xl overflow-hidden transition-all hover:scale-[1.01]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-violet-600" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative">Back to History</span>
          </button>
        </div>
      </div>
    );
  }

  // ═══════════ DETAIL VIEW ═══════════
  if (historyState === "detail" && selectedQuiz) {
    const colors = scoreColor(selectedQuiz.percentage);

    return (
      <div className="max-w-2xl mx-auto animate-fadeIn">
        {/* Back */}
        <button
          onClick={goBackToList}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to history
        </button>

        {/* Score */}
        <div className={`glass-card rounded-2xl p-8 text-center mb-8 border ${colors.border} ${colors.bg}`}>
          <p className="text-gray-400 text-sm mb-2">{selectedQuiz.summaryTitle}</p>
          <div className={`text-5xl font-black mb-1 ${colors.text}`} style={{ textShadow: "0 0 25px currentColor" }}>
            {selectedQuiz.score}/{selectedQuiz.total}
          </div>
          <div className={`text-xl font-bold mb-1 ${colors.text}`}>{selectedQuiz.percentage}%</div>
          <p className="text-gray-500 text-xs">{formatDate(selectedQuiz.createdAt)}</p>
        </div>

        {/* Question review */}
        <div className="space-y-4 mb-10">
          <h3 className="text-lg font-semibold text-white mb-4">Question Review</h3>
          {selectedQuiz.questions.map((q, qi) => {
            const userAnswer = selectedQuiz.userAnswers[qi];
            const isCorrect = userAnswer === q.correctIndex;
            return (
              <div key={qi} className="glass-card rounded-xl p-6" style={{ animationDelay: `${qi * 60}ms` }}>
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
                      <div key={oi} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm border ${
                        isCorrectOption ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : isWrongPick ? "border-red-500/30 bg-red-500/10 text-red-300"
                        : "border-white/[0.04] text-gray-600"
                      }`}>
                        <span className={`font-bold text-xs ${isCorrectOption ? "text-emerald-400" : isWrongPick ? "text-red-400" : "text-gray-700"}`}>
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <span>{option}</span>
                        {isCorrectOption && <svg className="w-4 h-4 ml-auto text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        {isWrongPick && <svg className="w-4 h-4 ml-auto text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleStartRetake}
            className="group relative flex-1 py-4 text-white font-semibold rounded-xl overflow-hidden transition-all hover:scale-[1.01]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-violet-600" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Retake Quiz
            </span>
          </button>
          <button
            onClick={(e) => handleDelete(selectedQuiz.id, e)}
            disabled={deleting === selectedQuiz.id}
            className="flex-1 py-4 text-red-400 font-semibold glass rounded-xl hover:bg-red-500/10 hover:border-red-500/20 transition-all border border-transparent"
          >
            {deleting === selectedQuiz.id ? (
              <span className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" /> Deleting...</span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ═══════════ LIST VIEW ═══════════
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Quiz History</h1>
            <p className="text-gray-500 text-sm">Review past quizzes and retake them to improve your score</p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-2xl shimmer-loading border border-white/[0.04]" />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        /* Empty */
        <div className="text-center py-20">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/15 to-violet-500/15 rounded-3xl blur-2xl" />
            <div className="relative w-24 h-24 glass rounded-3xl flex items-center justify-center text-5xl">
              📋
            </div>
          </div>
          <h2 className="text-xl font-semibold text-white mb-3">No quiz history yet</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Generate a quiz from the Quiz Generator tab, complete it, and save it to see it here.
          </p>
        </div>
      ) : (
        /* Quiz grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map((quiz) => {
            const colors = scoreColor(quiz.percentage);
            return (
              <div
                key={quiz.id}
                onClick={() => { setSelectedQuiz(quiz); setHistoryState("detail"); }}
                className="group relative glass-card rounded-2xl p-6 text-left cursor-pointer"
              >
                {/* Top gradient */}
                <div className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r ${
                  quiz.percentage >= 80 ? "from-emerald-500/40 to-teal-500/40"
                  : quiz.percentage >= 50 ? "from-amber-500/40 to-orange-500/40"
                  : "from-red-500/40 to-pink-500/40"
                } opacity-0 group-hover:opacity-100 transition-opacity`} />

                {/* Score badge + date */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wide ${colors.tag}`}>
                    {quiz.score}/{quiz.total} &middot; {quiz.percentage}%
                  </span>
                  <span className="text-gray-600 text-xs">{formatDate(quiz.createdAt)}</span>
                </div>

                {/* Title */}
                <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-purple-300 transition-colors line-clamp-1">
                  {quiz.summaryTitle}
                </h3>

                {/* Info */}
                <p className="text-gray-500 text-sm">
                  {quiz.total} questions &middot; {quiz.score} correct
                </p>

                {/* Bottom */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06]">
                  <span className={`text-xs font-medium ${colors.text}`}>
                    {quiz.percentage >= 80 ? "Excellent" : quiz.percentage >= 50 ? "Good" : "Needs Practice"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDelete(quiz.id, e)}
                      disabled={deleting === quiz.id}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      {deleting === quiz.id ? (
                        <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                    <svg className="w-4 h-4 text-gray-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
