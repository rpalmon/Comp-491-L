"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
}

interface Summary {
  id: string;
  title: string;
  content: string;
  mode: string;
  createdAt: Date;
}

interface Pipe {
  x: number;
  topH: number;
  passed: boolean;
}

type GameState = "select" | "loading" | "ready" | "countdown" | "playing" | "question" | "gameover";

// ─── Game constants ───
const CANVAS_W = 480;
const CANVAS_H = 640;
const BIRD_SIZE = 22;
const GRAVITY = 0.45;
const FLAP_FORCE = -7.5;
const PIPE_W = 52;
const PIPE_GAP = 160;
const PIPE_SPEED = 2.5;
const PIPE_SPAWN_INTERVAL = 110; // frames

export default function FlappyStudy() {
  const { user } = useAuth();

  // Data
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>("select");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [error, setError] = useState("");
  const [dots, setDots] = useState("");
  const [countdownNum, setCountdownNum] = useState(3);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<"correct" | "wrong" | null>(null);
  const [lives, setLives] = useState(0);

  // Game refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const birdRef = useRef({ y: CANVAS_H / 2, velocity: 0 });
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const frameRef = useRef(0);
  const animRef = useRef<number>(0);
  const gameActiveRef = useRef(false);

  // Fetch summaries
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "summaries"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id, title: doc.data().title, content: doc.data().content,
        mode: doc.data().mode, createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
      docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setSummaries(docs);
      setLoadingSummaries(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Loading dots
  useEffect(() => {
    if (gameState !== "loading") return;
    const interval = setInterval(() => setDots((d) => (d.length >= 3 ? "" : d + ".")), 400);
    return () => clearInterval(interval);
  }, [gameState]);

  // Generate questions
  const handleSelectSummary = async (summary: Summary) => {
    setSelectedSummary(summary);
    setGameState("loading");
    setError("");
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: summary.content, questionCount: 8 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate questions");
      setQuestions(data.quiz.questions);
      setQuestionIndex(0);
      setGameState("ready");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setGameState("select");
    }
  };

  // ─── Game Logic ───
  const resetGame = useCallback(() => {
    birdRef.current = { y: CANVAS_H / 2, velocity: 0 };
    pipesRef.current = [];
    scoreRef.current = 0;
    frameRef.current = 0;
    setScore(0);
    setLives(questions.length);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswerResult(null);
    setCurrentQuestion(null);
  }, [questions.length]);

  const startGame = useCallback(() => {
    resetGame();
    setCountdownNum(3);
    setGameState("countdown");
  }, [resetGame]);

  const flap = useCallback(() => {
    if (gameState === "playing" && gameActiveRef.current) {
      birdRef.current.velocity = FLAP_FORCE;
    }
  }, [gameState]);

  // Countdown timer
  useEffect(() => {
    if (gameState !== "countdown") return;
    if (countdownNum <= 0) {
      gameActiveRef.current = true;
      setGameState("playing");
      return;
    }
    const timer = setTimeout(() => setCountdownNum((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [gameState, countdownNum]);

  // Draw countdown on canvas
  useEffect(() => {
    if (gameState !== "countdown") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw static scene
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Stars
    ctx.fillStyle = "rgba(139,92,246,0.15)";
    for (let i = 0; i < 30; i++) {
      const sx = (i * 137) % CANVAS_W;
      const sy = (i * 97) % CANVAS_H;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // Ground
    ctx.strokeStyle = "rgba(139,92,246,0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H - 2);
    ctx.lineTo(CANVAS_W, CANVAS_H - 2);
    ctx.stroke();

    // Bird (stationary)
    const bx = 80;
    const by = CANVAS_H / 2;
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 15;
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(bx + BIRD_SIZE / 2, by + BIRD_SIZE / 2, BIRD_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Eye
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(bx + BIRD_SIZE / 2 + 4, by + BIRD_SIZE / 2 - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(bx + BIRD_SIZE / 2 + 5, by + BIRD_SIZE / 2 - 3, 2, 0, Math.PI * 2);
    ctx.fill();
    // Beak
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(bx + BIRD_SIZE, by + BIRD_SIZE / 2);
    ctx.lineTo(bx + BIRD_SIZE + 8, by + BIRD_SIZE / 2 + 2);
    ctx.lineTo(bx + BIRD_SIZE, by + BIRD_SIZE / 2 + 5);
    ctx.fill();

    // Countdown number
    const display = countdownNum > 0 ? String(countdownNum) : "GO!";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${countdownNum > 0 ? 96 : 72}px system-ui`;

    // Glow
    ctx.shadowColor = countdownNum > 0 ? "rgba(139,92,246,0.8)" : "rgba(16,185,129,0.8)";
    ctx.shadowBlur = 30;
    ctx.fillStyle = countdownNum > 0 ? "#8b5cf6" : "#10b981";
    ctx.fillText(display, CANVAS_W / 2, CANVAS_H / 2 - 60);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.font = "16px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText("Get ready...", CANVAS_W / 2, CANVAS_H / 2);
  }, [gameState, countdownNum]);

  // Keyboard / touch
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (gameState === "ready") startGame();
        else if (gameState === "playing") flap();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, startGame, flap]);

  // Handle collision → show question
  const triggerQuestion = useCallback(() => {
    if (questionIndex >= questions.length) {
      // No questions left → game over
      gameActiveRef.current = false;
      setScore(scoreRef.current);
      setHighScore((h) => Math.max(h, scoreRef.current));
      setGameState("gameover");
      return;
    }
    gameActiveRef.current = false;
    setCurrentQuestion(questions[questionIndex]);
    setSelectedAnswer(null);
    setAnswerResult(null);
    setGameState("question");
  }, [questionIndex, questions]);

  // Answer a question
  const handleAnswer = (optionIdx: number) => {
    if (answerResult !== null || !currentQuestion) return;
    setSelectedAnswer(optionIdx);

    if (optionIdx === currentQuestion.correctIndex) {
      setAnswerResult("correct");
      // Resume after short delay — remove the colliding pipe
      setTimeout(() => {
        setQuestionIndex((prev) => prev + 1);
        setLives((prev) => prev - 1);
        // Remove the pipe that caused collision (first one the bird is near)
        const bird = birdRef.current;
        pipesRef.current = pipesRef.current.filter(
          (p) => !(p.x < 120 + BIRD_SIZE && p.x + PIPE_W > 80)
        );
        // Push bird to safe position
        bird.velocity = FLAP_FORCE * 0.8;
        if (bird.y < 50) bird.y = 100;
        if (bird.y > CANVAS_H - 50) bird.y = CANVAS_H - 150;
        gameActiveRef.current = true;
        setGameState("playing");
        setCurrentQuestion(null);
      }, 800);
    } else {
      setAnswerResult("wrong");
      setTimeout(() => {
        gameActiveRef.current = false;
        setScore(scoreRef.current);
        setHighScore((h) => Math.max(h, scoreRef.current));
        setGameState("gameover");
        setCurrentQuestion(null);
      }, 1000);
    }
  };

  // ─── Game Loop ───
  useEffect(() => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      if (!gameActiveRef.current) return;

      const bird = birdRef.current;
      const pipes = pipesRef.current;

      // Physics
      bird.velocity += GRAVITY;
      bird.y += bird.velocity;

      // Floor/ceiling
      if (bird.y < 0) { bird.y = 0; bird.velocity = 0; }
      if (bird.y + BIRD_SIZE > CANVAS_H) {
        gameActiveRef.current = false;
        setScore(scoreRef.current);
        setHighScore((h) => Math.max(h, scoreRef.current));
        setGameState("gameover");
        return;
      }

      // Spawn pipes
      frameRef.current++;
      if (frameRef.current % PIPE_SPAWN_INTERVAL === 0) {
        const minTop = 60;
        const maxTop = CANVAS_H - PIPE_GAP - 60;
        const topH = Math.random() * (maxTop - minTop) + minTop;
        pipes.push({ x: CANVAS_W, topH, passed: false });
      }

      // Move pipes & check collision
      const birdX = 80;
      let collision = false;

      for (let i = pipes.length - 1; i >= 0; i--) {
        const p = pipes[i];
        p.x -= PIPE_SPEED;

        // Remove off-screen
        if (p.x + PIPE_W < 0) { pipes.splice(i, 1); continue; }

        // Score
        if (!p.passed && p.x + PIPE_W < birdX) {
          p.passed = true;
          scoreRef.current++;
          setScore(scoreRef.current);
        }

        // Collision
        if (
          birdX + BIRD_SIZE > p.x && birdX < p.x + PIPE_W &&
          (bird.y < p.topH || bird.y + BIRD_SIZE > p.topH + PIPE_GAP)
        ) {
          collision = true;
        }
      }

      if (collision) {
        triggerQuestion();
        return;
      }

      // ─── DRAW ───
      // Background
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Stars
      ctx.fillStyle = "rgba(139,92,246,0.15)";
      for (let i = 0; i < 30; i++) {
        const sx = (i * 137 + frameRef.current * 0.2) % CANVAS_W;
        const sy = (i * 97) % CANVAS_H;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Ground line
      ctx.strokeStyle = "rgba(139,92,246,0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_H - 2);
      ctx.lineTo(CANVAS_W, CANVAS_H - 2);
      ctx.stroke();

      // Pipes
      for (const p of pipes) {
        // Top pipe
        const topGrad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
        topGrad.addColorStop(0, "#2d1b69");
        topGrad.addColorStop(0.5, "#4c1d95");
        topGrad.addColorStop(1, "#2d1b69");
        ctx.fillStyle = topGrad;
        ctx.fillRect(p.x, 0, PIPE_W, p.topH);

        // Top pipe cap
        ctx.fillStyle = "#7c3aed";
        ctx.fillRect(p.x - 3, p.topH - 16, PIPE_W + 6, 16);
        ctx.shadowColor = "#7c3aed";
        ctx.shadowBlur = 8;
        ctx.fillRect(p.x - 3, p.topH - 16, PIPE_W + 6, 2);
        ctx.shadowBlur = 0;

        // Bottom pipe
        const bottomY = p.topH + PIPE_GAP;
        ctx.fillStyle = topGrad;
        ctx.fillRect(p.x, bottomY, PIPE_W, CANVAS_H - bottomY);

        // Bottom pipe cap
        ctx.fillStyle = "#7c3aed";
        ctx.fillRect(p.x - 3, bottomY, PIPE_W + 6, 16);
        ctx.shadowColor = "#7c3aed";
        ctx.shadowBlur = 8;
        ctx.fillRect(p.x - 3, bottomY + 14, PIPE_W + 6, 2);
        ctx.shadowBlur = 0;
      }

      // Bird body
      const bx = birdX;
      const by = bird.y;
      // Glow
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 15;
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(bx + BIRD_SIZE / 2, by + BIRD_SIZE / 2, BIRD_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Eye
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(bx + BIRD_SIZE / 2 + 4, by + BIRD_SIZE / 2 - 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(bx + BIRD_SIZE / 2 + 5, by + BIRD_SIZE / 2 - 3, 2, 0, Math.PI * 2);
      ctx.fill();
      // Beak
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.moveTo(bx + BIRD_SIZE, by + BIRD_SIZE / 2);
      ctx.lineTo(bx + BIRD_SIZE + 8, by + BIRD_SIZE / 2 + 2);
      ctx.lineTo(bx + BIRD_SIZE, by + BIRD_SIZE / 2 + 5);
      ctx.fill();
      // Wing
      const wingAngle = Math.sin(frameRef.current * 0.15) * 0.3;
      ctx.fillStyle = "#fbbf24";
      ctx.save();
      ctx.translate(bx + BIRD_SIZE / 2 - 6, by + BIRD_SIZE / 2);
      ctx.rotate(wingAngle);
      ctx.fillRect(-8, -3, 10, 6);
      ctx.restore();

      // Score display
      ctx.fillStyle = "#fff";
      ctx.font = "bold 32px system-ui";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(139,92,246,0.5)";
      ctx.shadowBlur = 10;
      ctx.fillText(String(scoreRef.current), CANVAS_W / 2, 50);
      ctx.shadowBlur = 0;

      // Lives indicator
      ctx.font = "14px system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.textAlign = "left";
      const livesLeft = questions.length - questionIndex;
      ctx.fillText(`Extra lives: ${livesLeft}`, 12, 28);

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, triggerQuestion, questions.length, questionIndex]);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const getPreview = (content: string) => {
    const clean = content.replace(/[#*_\->`]/g, "").trim();
    return clean.length > 100 ? clean.slice(0, 100) + "..." : clean;
  };
  const getModeTag = (mode: string) =>
    mode === "notes" ? "bg-violet-500/15 text-violet-400 border-violet-500/25" : "bg-blue-500/15 text-blue-400 border-blue-500/25";

  // ═══════════ SELECT ═══════════
  if (gameState === "select") {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20 flex items-center justify-center text-xl">
              🎮
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Flappy Study</h1>
              <p className="text-gray-500 text-sm">Play Flappy Bird — answer questions to survive pipe hits!</p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="glass rounded-xl p-5 mb-8">
          <div className="flex items-start gap-3">
            <div className="text-lg mt-0.5">💡</div>
            <div className="text-sm text-gray-400 leading-relaxed">
              <span className="text-white font-medium">How it works:</span> Pick a summary to generate study questions.
              Fly the bird through pipes. When you hit a pipe, answer a question correctly to keep going.
              Wrong answer = game over. <span className="text-amber-400">Space/tap to flap!</span>
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
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/15 to-emerald-500/15 rounded-3xl blur-2xl" />
              <div className="relative w-24 h-24 glass rounded-3xl flex items-center justify-center text-5xl">🎮</div>
            </div>
            <h2 className="text-xl font-semibold text-white mb-3">No summaries yet</h2>
            <p className="text-gray-500 max-w-md mx-auto">Upload and save a summary first to play Flappy Study.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summaries.map((summary) => (
              <div
                key={summary.id}
                onClick={() => handleSelectSummary(summary)}
                className="group relative glass-card rounded-2xl p-6 text-left cursor-pointer"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-green-500/40 to-emerald-500/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wide ${getModeTag(summary.mode)}`}>
                    {summary.mode === "notes" ? "Notes" : "Summary"}
                  </span>
                  <span className="text-gray-600 text-xs">{formatDate(summary.createdAt)}</span>
                </div>
                <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-green-300 transition-colors line-clamp-1">{summary.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">{getPreview(summary.content)}</p>
                <div className="flex items-center justify-end mt-4 pt-3 border-t border-white/[0.06]">
                  <span className="text-xs text-gray-600 group-hover:text-green-400 transition-colors flex items-center gap-1.5">
                    Play now
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
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

  // ═══════════ LOADING ═══════════
  if (gameState === "loading") {
    return (
      <div className="max-w-2xl mx-auto py-16">
        <div className="glass rounded-3xl p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-green-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="relative">
            <div className="relative w-20 h-20 mx-auto mb-8">
              <div className="absolute inset-0 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">🎮</div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Preparing your game{dots}</h2>
            <p className="text-gray-400">Generating questions from &ldquo;{selectedSummary?.title}&rdquo;</p>
            <div className="mt-8 mx-auto max-w-xs">
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ backgroundSize: "200% 100%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════ READY ═══════════
  if (gameState === "ready") {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <button
          onClick={() => { setGameState("select"); setSelectedSummary(null); }}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to summaries
        </button>

        <div className="glass rounded-3xl p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5" />
          <div className="relative">
            <div className="text-6xl mb-6">🐦</div>
            <h2 className="text-3xl font-bold text-white mb-3">Ready to Play?</h2>
            <p className="text-gray-400 mb-2">Playing with: <span className="text-white font-medium">{selectedSummary?.title}</span></p>
            <p className="text-gray-500 text-sm mb-8">{questions.length} questions loaded as extra lives</p>

            <div className="glass rounded-xl p-4 mb-8 max-w-sm mx-auto text-left">
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-center gap-2"><span className="text-amber-400">Space/Tap</span> — Flap</div>
                <div className="flex items-center gap-2"><span className="text-red-400">Hit pipe</span> — Answer a question</div>
                <div className="flex items-center gap-2"><span className="text-emerald-400">Correct</span> — Keep playing!</div>
                <div className="flex items-center gap-2"><span className="text-red-400">Wrong</span> — Game over</div>
              </div>
            </div>

            <button
              onClick={startGame}
              className="group relative px-12 py-4 text-white font-bold rounded-xl overflow-hidden transition-all hover:scale-[1.03] active:scale-[0.97]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity" />
              <span className="relative flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                Start Game
              </span>
            </button>
            <p className="text-gray-600 text-xs mt-4">or press Space</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════ COUNTDOWN + PLAYING + QUESTION + GAMEOVER ═══════════
  return (
    <div className="max-w-[520px] mx-auto">
      <div className="relative">
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onClick={() => {
            if (gameState === "playing") flap();
          }}
          className="w-full rounded-2xl border border-white/[0.08] cursor-pointer"
          style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}`, imageRendering: "pixelated" }}
        />

        {/* Question Overlay */}
        {gameState === "question" && currentQuestion && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-2xl flex items-center justify-center p-6 animate-fadeIn">
            <div className="w-full max-w-sm">
              <div className="text-center mb-5">
                <span className="text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 font-bold uppercase">
                  Answer to survive!
                </span>
              </div>
              <p className="text-white font-semibold text-center mb-6 leading-relaxed">{currentQuestion.question}</p>
              <div className="space-y-2.5">
                {currentQuestion.options.map((opt, i) => {
                  const isSelected = selectedAnswer === i;
                  const isCorrect = answerResult !== null && i === currentQuestion.correctIndex;
                  const isWrong = answerResult === "wrong" && isSelected;

                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(i)}
                      disabled={answerResult !== null}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all text-sm ${
                        isCorrect ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                        : isWrong ? "border-red-500 bg-red-500/15 text-red-300"
                        : isSelected ? "border-purple-500 bg-purple-500/10 text-white"
                        : "border-white/[0.08] bg-white/[0.03] text-gray-300 hover:border-white/[0.2] hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-bold text-xs w-6 h-6 rounded flex items-center justify-center ${
                          isCorrect ? "bg-emerald-500 text-white"
                          : isWrong ? "bg-red-500 text-white"
                          : isSelected ? "bg-purple-500 text-white"
                          : "bg-white/[0.08] text-gray-500"
                        }`}>
                          {isCorrect ? "✓" : isWrong ? "✗" : String.fromCharCode(65 + i)}
                        </span>
                        {opt}
                      </div>
                    </button>
                  );
                })}
              </div>
              {answerResult === "correct" && (
                <p className="text-center text-emerald-400 font-medium mt-4 animate-fadeIn">Correct! Resuming...</p>
              )}
              {answerResult === "wrong" && (
                <p className="text-center text-red-400 font-medium mt-4 animate-fadeIn">Wrong answer! Game over...</p>
              )}
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === "gameover" && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-2xl flex items-center justify-center p-6 animate-fadeIn">
            <div className="text-center w-full max-w-sm">
              <div className="text-5xl mb-4">💀</div>
              <h2 className="text-3xl font-black text-white mb-2">Game Over</h2>
              <div className="flex items-center justify-center gap-6 mb-6">
                <div>
                  <div className="text-4xl font-black text-amber-400" style={{ textShadow: "0 0 20px rgba(245,158,11,0.4)" }}>{score}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Score</div>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div>
                  <div className="text-4xl font-black text-violet-400" style={{ textShadow: "0 0 20px rgba(139,92,246,0.4)" }}>{highScore}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Best</div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={startGame}
                  className="group relative w-full py-3.5 text-white font-semibold rounded-xl overflow-hidden transition-all hover:scale-[1.01]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative">Play Again</span>
                </button>
                <button
                  onClick={() => { setGameState("select"); setSelectedSummary(null); }}
                  className="w-full py-3.5 text-gray-300 font-semibold glass rounded-xl hover:bg-white/[0.06] transition-all"
                >
                  Change Summary
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
