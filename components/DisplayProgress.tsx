"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

interface ProgressStats {
  totalQuizzes: number;
  averageScore: number;
  totalSummaries: number;
  totalFlashcards: number;
}

interface ScoreTrendPoint {
  date: string;
  score: number;
}

interface RecentQuiz {
  id: string;
  summaryTitle: string;
  score: number;
  total: number;
  percentage: number;
  createdAt: Date;
}

interface RecentFlashcard {
  id: string;
  summaryTitle: string;
  cardCount: number;
  createdAt: Date;
}

interface ProgressData {
  stats: ProgressStats;
  scoreTrend: ScoreTrendPoint[];
  recentQuiz: RecentQuiz | null;
  recentFlashcard: RecentFlashcard | null;
}

export default function DisplayProgress() {
  const { user } = useAuth();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    const fetchProgressData = async () => {
      try {
        // Get all quizzes for the user
        const quizzesQuery = query(
          collection(db, "quizzes"),
          where("userId", "==", user.uid),
        );
        const quizzesSnapshot = await getDocs(quizzesQuery);

        // Get all flashcards for the user
        const flashcardsQuery = query(
          collection(db, "flashcards"),
          where("userId", "==", user.uid),
        );
        const flashcardsSnapshot = await getDocs(flashcardsQuery);

        // Get all summaries for the user
        const summariesQuery = query(
          collection(db, "summaries"),
          where("userId", "==", user.uid),
        );
        const summariesSnapshot = await getDocs(summariesQuery);

        // Calculate stats
        const quizzes = quizzesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as (RecentQuiz & { createdAt: Date })[];

        const totalQuizzes = quizzes.length;
        const averageScore =
          totalQuizzes > 0
            ? Math.round(
                quizzes.reduce((sum, quiz) => sum + quiz.percentage, 0) /
                  totalQuizzes,
              )
            : 0;

        const totalFlashcards = flashcardsSnapshot.docs.length;
        const totalSummaries = summariesSnapshot.docs.length;

        // Get score trend (last 20 quizzes, sorted by date)
        const scoreTrend = quizzes
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .slice(-20)
          .map((quiz) => ({
            date: quiz.createdAt.toISOString().split("T")[0], // YYYY-MM-DD format
            score: quiz.percentage,
          }));

        // Get recently done quiz (most recent)
        const recentQuizQuery = query(
          collection(db, "quizzes"),
          where("userId", "==", user.uid),
        );
        const recentQuizSnapshot = await getDocs(recentQuizQuery);
        const recentQuiz = (recentQuizSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          }))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ||
          null) as RecentQuiz | null;

        // Get recently done flashcard set (most recent)
        const recentFlashcardQuery = query(
          collection(db, "flashcards"),
          where("userId", "==", user.uid),
        );
        const recentFlashcardSnapshot = await getDocs(recentFlashcardQuery);
        const recentFlashcard = (recentFlashcardSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          }))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ||
          null) as RecentFlashcard | null;

        setData({
          stats: {
            totalQuizzes,
            averageScore,
            totalSummaries,
            totalFlashcards,
          },
          scoreTrend,
          recentQuiz,
          recentFlashcard,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load progress data",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProgressData();
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Progress Dashboard
              </h1>
              <p className="text-gray-500 text-sm">
                Loading your study statistics...
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-6 shimmer-loading">
              <div className="h-4 bg-white/10 rounded mb-2"></div>
              <div className="h-8 bg-white/10 rounded mb-1"></div>
              <div className="h-4 bg-white/10 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-3xl blur-2xl" />
          <div className="relative w-24 h-24 glass rounded-3xl flex items-center justify-center text-5xl">
            ⚠️
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">
          Error Loading Progress
        </h2>
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const ScoreChart = ({ trend }: { trend: ScoreTrendPoint[] }) => {
    if (trend.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No quiz data available yet
        </div>
      );
    }

    const maxScore = 100;
    const minScore = 0;
    const chartHeight = 200;
    const chartWidth = 400;
    const padding = 40;

    const points = trend
      .map((point, index) => {
        const x =
          padding + (index / (trend.length - 1)) * (chartWidth - 2 * padding);
        const y =
          padding +
          ((maxScore - point.score) / (maxScore - minScore || 1)) *
            (chartHeight - 2 * padding);
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((score) => {
            const y =
              padding +
              ((maxScore - score) / (maxScore - minScore || 1)) *
                (chartHeight - 2 * padding);
            return (
              <g key={score}>
                <line
                  x1={padding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-gray-500"
                  fontSize="10"
                >
                  {score}%
                </text>
              </g>
            );
          })}

          {/* Chart line */}
          <polyline
            points={points}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {trend.map((point, index) => {
            const x =
              padding +
              (index / (trend.length - 1)) * (chartWidth - 2 * padding);
            const y =
              padding +
              ((maxScore - point.score) / (maxScore - minScore || 1)) *
                (chartHeight - 2 * padding);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill="#8b5cf6"
                className="hover:r-6 transition-all cursor-pointer"
              />
            );
          })}

          {/* Date labels */}
          {trend.map((point, index) => {
            const x =
              padding +
              (index / (trend.length - 1)) * (chartWidth - 2 * padding);
            return (
              <text
                key={`date-${index}`}
                x={x}
                y={chartHeight + 25}
                textAnchor="middle"
                className="fill-gray-500"
                fontSize="10"
              >
                {new Date(point.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </text>
            );
          })}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Progress Dashboard
            </h1>
            <p className="text-gray-500 text-sm">
              Track your study progress and performance
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/20 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-widest">
                Total Quizzes
              </p>
              <p className="text-2xl font-bold text-white">
                {data.stats.totalQuizzes}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-widest">
                Average Score
              </p>
              <p className="text-2xl font-bold text-white">
                {data.stats.averageScore}%
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-widest">
                Total Summaries
              </p>
              <p className="text-2xl font-bold text-white">
                {data.stats.totalSummaries}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-widest">
                Total Flashcards
              </p>
              <p className="text-2xl font-bold text-white">
                {data.stats.totalFlashcards}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Score Trend Chart */}
      <div className="glass-card rounded-2xl p-6 mb-10">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Score Trend</h2>
          <p className="text-gray-500 text-sm">
            Your quiz performance over time
          </p>
        </div>
        <ScoreChart trend={data.scoreTrend} />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Quiz */}
        <div className="glass-card rounded-2xl p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              Recent Quiz
            </h3>
            <div className="h-[1px] w-12 bg-gradient-to-r from-violet-500 to-transparent rounded-full" />
          </div>
          {data.recentQuiz ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Score</span>
                <span className="text-lg font-bold text-white">
                  {data.recentQuiz.percentage}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Questions</span>
                <span className="text-white">
                  {data.recentQuiz.score}/{data.recentQuiz.total}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Topic</span>
                <span className="text-white text-sm max-w-[200px] truncate">
                  {data.recentQuiz.summaryTitle}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Date</span>
                <span className="text-white text-sm">
                  {formatDate(data.recentQuiz.createdAt)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No quizzes completed yet
            </p>
          )}
        </div>

        {/* Recent Flashcards */}
        <div className="glass-card rounded-2xl p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              Recent Flashcards
            </h3>
            <div className="h-[1px] w-12 bg-gradient-to-r from-amber-500 to-transparent rounded-full" />
          </div>
          {data.recentFlashcard ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Cards</span>
                <span className="text-lg font-bold text-white">
                  {data.recentFlashcard.cardCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Topic</span>
                <span className="text-white text-sm max-w-[200px] truncate">
                  {data.recentFlashcard.summaryTitle}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Date</span>
                <span className="text-white text-sm">
                  {formatDate(data.recentFlashcard.createdAt)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No flashcards created yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
