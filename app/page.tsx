"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/context/AuthContext";
import StarField from "@/components/StarField";
import FloatingShapes from "@/components/FloatingShapes";

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("revealed");
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

// Typewriter hook
function useTypewriter(words: string[], typingSpeed = 100, deletingSpeed = 60, pauseTime = 2000) {
  const [text, setText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setText(currentWord.substring(0, text.length + 1));
        if (text === currentWord) {
          setTimeout(() => setIsDeleting(true), pauseTime);
        }
      } else {
        setText(currentWord.substring(0, text.length - 1));
        if (text === "") {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % words.length);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);

    return () => clearTimeout(timeout);
  }, [text, wordIndex, isDeleting, words, typingSpeed, deletingSpeed, pauseTime]);

  return text;
}

// Animated counter hook
function useCounter(target: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(!startOnView);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.unobserve(el); } },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [startOnView]);

  useEffect(() => {
    if (!started) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [started, target, duration]);

  return { count, ref };
}

// 3D Tilt card handler
function useTiltCard() {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiltX = ((y - centerY) / centerY) * -8;
    const tiltY = ((x - centerX) / centerX) * 8;
    el.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;
    el.style.setProperty("--shine-x", `${(x / rect.width) * 100}%`);
    el.style.setProperty("--shine-y", `${(y / rect.height) * 100}%`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";
  }, []);

  return { ref, handleMouseMove, handleMouseLeave };
}

export default function Home() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const { user, loading } = useAuth();
  const router = useRouter();

  const openSignup = () => { setAuthMode("signup"); setAuthOpen(true); };
  const openLogin = () => { setAuthMode("login"); setAuthOpen(true); };

  const featuresRef = useReveal();
  const howRef = useReveal();
  const ctaRef = useReveal();
  const statsRef = useReveal();

  const typedText = useTypewriter(
    ["not harder.", "with AI.", "for real.", "and retain."],
    90, 50, 2500
  );

  const stat1 = useCounter(10, 2000);
  const stat2 = useCounter(99, 2000);
  const stat3 = useCounter(40, 2000);
  const stat4 = useCounter(5, 1500);

  useEffect(() => {
    if (!loading && user) router.push("/dashboard");
  }, [user, loading, router]);

  return (
    <div className="min-h-screen noise-overlay relative">
      {/* Interactive Star Constellation Canvas */}
      <StarField />

      {/* Floating 3D Geometric Shapes */}
      <FloatingShapes />

      {/* Aurora blobs on top */}
      <div className="aurora-bg" style={{ zIndex: 1 }}>
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
      </div>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-40 pb-28 sm:pt-52 sm:pb-40 px-6 overflow-hidden z-10">
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.015)_1px,transparent_1px)] bg-[size:72px_72px] pointer-events-none mask-fade" />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2 mb-10 rounded-full glass neon-box text-sm text-gray-300 animate-fadeInUp">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            Built for students, by students
          </div>

          {/* Main heading with typewriter */}
          <h1 className="text-5xl sm:text-7xl lg:text-[5.5rem] font-bold tracking-tight leading-[1.05] mb-8 animate-fadeInUp animation-delay-100">
            <span className="text-white neon-text">Study smarter,</span>
            <br />
            <span className="gradient-text-shimmer text-5xl sm:text-7xl lg:text-[5.5rem]">
              {typedText}
            </span>
            <span className="typewriter-cursor" />
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-14 leading-relaxed animate-fadeInUp animation-delay-200">
            Drop in your lecture notes and let AI summarize them, generate
            quizzes, create study games, and help you actually remember what
            you learned.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fadeInUp animation-delay-300">
            <button
              onClick={openSignup}
              className="magnetic-btn group relative w-full sm:w-auto px-12 py-5 text-base font-bold text-white rounded-2xl transition-all overflow-hidden hover:scale-[1.03] active:scale-[0.97]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 transition-all" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {/* Shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {/* Outer neon glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
              <span className="relative flex items-center justify-center gap-2.5">
                Start studying for free
                <svg className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </button>
            <Link
              href="/about"
              className="group w-full sm:w-auto px-10 py-5 text-base font-semibold text-gray-300 glass neon-box rounded-2xl hover:text-white transition-all duration-300"
            >
              <span className="flex items-center justify-center gap-2">
                See how it works
                <svg className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                </svg>
              </span>
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-20 flex items-center justify-center gap-8 animate-fadeInUp animation-delay-400">
            <div className="flex -space-x-3">
              {["bg-blue-500", "bg-violet-500", "bg-purple-500", "bg-pink-500", "bg-cyan-500"].map((color, i) => (
                <div key={i} className={`w-10 h-10 rounded-full ${color} border-2 border-gray-950 flex items-center justify-center text-white text-xs font-bold shadow-lg animate-float`} style={{ animationDelay: `${i * 0.2}s` }}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-1">Loved by students everywhere</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Glow Divider ═══ */}
      <div className="relative z-10 px-6">
        <div className="max-w-4xl mx-auto glow-divider" />
      </div>

      {/* ═══════════════ STATS — Orbital Rings ═══════════════ */}
      <section className="relative py-28 px-6 z-10 overflow-hidden">
        {/* Section background pulse */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-violet-600/[0.03] rounded-full blur-[150px] animate-pulse" style={{ animationDuration: "4s" }} />
        </div>

        <div ref={statsRef} className="relative max-w-6xl mx-auto reveal-section">
          {/* Section heading */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 rounded-full glass neon-box text-sm text-gray-400">
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              By The Numbers
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Trusted by <span className="gradient-text neon-text">students worldwide</span>
            </h2>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { ref: stat1.ref, count: stat1.count, suffix: "K+", label: "Notes Processed", percent: 80, color1: "#4f8fff", color2: "#06b6d4", icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg> },
              { ref: stat2.ref, count: stat2.count, suffix: "%", label: "Accuracy Rate", percent: 99, color1: "#8b5cf6", color2: "#a855f7", icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
              { ref: stat3.ref, count: stat3.count, suffix: "%", label: "Better Retention", percent: 40, color1: "#ec4899", color2: "#f43f5e", icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" /></svg> },
              { ref: stat4.ref, count: stat4.count, suffix: "s", label: "Average Speed", percent: 95, color1: "#f59e0b", color2: "#f97316", icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg> },
            ].map((stat, i) => (
              <div key={stat.label} ref={stat.ref} className={`feature-card feature-card-${i}`}>
                <div className="group relative flex flex-col items-center text-center">
                  {/* Orbital ring container */}
                  <div className="relative w-44 h-44 mb-6">
                    {/* Outer rotating dashed ring */}
                    <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: `${18 + i * 4}s` }}>
                      <svg viewBox="0 0 180 180" className="w-full h-full">
                        <circle cx="90" cy="90" r="86" fill="none" stroke={stat.color1} strokeWidth="0.5" strokeDasharray="4 6" opacity="0.3" />
                      </svg>
                    </div>

                    {/* Animated progress arc */}
                    <div className="absolute inset-2">
                      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                        <defs>
                          <linearGradient id={`grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={stat.color1} />
                            <stop offset="100%" stopColor={stat.color2} />
                          </linearGradient>
                        </defs>
                        {/* Background track */}
                        <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                        {/* Progress arc */}
                        <circle
                          cx="80" cy="80" r="72"
                          fill="none"
                          stroke={`url(#grad-${i})`}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${(stat.percent / 100) * 452} 452`}
                          className="transition-all duration-[2s] ease-out"
                          style={{ filter: `drop-shadow(0 0 6px ${stat.color1})` }}
                        />
                      </svg>
                    </div>

                    {/* Inner glow ring */}
                    <div className="absolute inset-5 rounded-full" style={{ background: `radial-gradient(circle, ${stat.color1}08 0%, transparent 70%)` }} />

                    {/* Orbiting dot */}
                    <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: `${6 + i * 2}s` }}>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5 w-2.5 h-2.5 rounded-full" style={{ background: stat.color1, boxShadow: `0 0 10px ${stat.color1}, 0 0 20px ${stat.color1}` }} />
                    </div>

                    {/* Second orbiting dot (opposite direction) */}
                    <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: `${10 + i * 3}s`, animationDirection: "reverse" }}>
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-0.5 w-1.5 h-1.5 rounded-full" style={{ background: stat.color2, boxShadow: `0 0 8px ${stat.color2}` }} />
                    </div>

                    {/* Center content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      {/* Icon with glow */}
                      <div className="mb-2 transition-all duration-500 group-hover:scale-125" style={{ color: stat.color1, filter: `drop-shadow(0 0 8px ${stat.color1})` }}>
                        {stat.icon}
                      </div>
                      {/* Number */}
                      <div className="text-4xl font-black text-white transition-all duration-500 group-hover:scale-110" style={{ textShadow: `0 0 20px ${stat.color1}60, 0 0 40px ${stat.color1}30` }}>
                        {stat.count}<span className="text-2xl" style={{ color: stat.color1 }}>{stat.suffix}</span>
                      </div>
                    </div>

                    {/* Hover pulse ring */}
                    <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: `0 0 30px ${stat.color1}15, inset 0 0 30px ${stat.color1}08` }} />
                  </div>

                  {/* Label */}
                  <div className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                    {stat.label}
                  </div>

                  {/* Bottom accent line */}
                  <div className="mt-3 h-[2px] w-0 group-hover:w-16 transition-all duration-500 rounded-full" style={{ background: `linear-gradient(90deg, ${stat.color1}, ${stat.color2})`, boxShadow: `0 0 8px ${stat.color1}40` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Glow Divider ═══ */}
      <div className="relative z-10 px-6">
        <div className="max-w-4xl mx-auto glow-divider" />
      </div>

      {/* ═══════════════ FEATURES — 3D Tilt Cards ═══════════════ */}
      <section className="relative py-28 px-6 z-10">
        <div ref={featuresRef} className="max-w-6xl mx-auto reveal-section">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full glass neon-box text-sm text-gray-400">
              <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Powerful Features
            </div>
            <h2 className="text-4xl sm:text-6xl font-bold text-white mb-5">
              Everything you need to{" "}
              <span className="gradient-text neon-text">ace your classes</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              One place for all your study tools. Upload your notes and we handle the rest.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Smart Summaries", desc: "Paste your lecture notes and get clean, organized summaries highlighting key concepts.", iconBg: "bg-blue-500/15 text-blue-400", gradient: "from-blue-500/20 to-cyan-500/20", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg> },
              { title: "Auto Quizzes", desc: "Instantly generate quizzes from your notes. Multiple choice, true/false, and more.", iconBg: "bg-violet-500/15 text-violet-400", gradient: "from-violet-500/20 to-purple-500/20", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg> },
              { title: "Study Games", desc: "Turn boring notes into interactive games like flashcard battles and matching challenges.", iconBg: "bg-purple-500/15 text-purple-400", gradient: "from-purple-500/20 to-pink-500/20", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.421 48.421 0 01-4.163-.3c.186 1.613.466 3.2.836 4.752a48.046 48.046 0 016.672.002c.37-1.553.65-3.14.836-4.754a48.421 48.421 0 01-4.163.3.64.64 0 01-.657-.643v0z" /></svg> },
              { title: "Instant Flashcards", desc: "Your notes become flashcards in one click. Review them anywhere, anytime.", iconBg: "bg-amber-500/15 text-amber-400", gradient: "from-amber-500/20 to-orange-500/20", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg> },
              { title: "AI Explanations", desc: "Ask AI to break down complex concepts in simple terms with real examples.", iconBg: "bg-emerald-500/15 text-emerald-400", gradient: "from-emerald-500/20 to-teal-500/20", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg> },
              { title: "Progress Tracking", desc: "See how much you've studied, track quiz scores, and watch yourself improve.", iconBg: "bg-rose-500/15 text-rose-400", gradient: "from-rose-500/20 to-pink-500/20", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg> },
            ].map((feature, index) => {
              return (
                <TiltFeatureCard key={feature.title} feature={feature} index={index} />
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ Glow Divider ═══ */}
      <div className="relative z-10 px-6">
        <div className="max-w-4xl mx-auto glow-divider" />
      </div>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section className="relative py-32 px-6 overflow-hidden z-10">
        <div className="absolute inset-0 mesh-bg" />

        <div ref={howRef} className="relative max-w-6xl mx-auto reveal-section">
          <div className="text-center mb-24">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full glass neon-box text-sm text-gray-400">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              Simple Process
            </div>
            <h2 className="text-4xl sm:text-6xl font-bold mb-5">
              <span className="gradient-text neon-text">How it works</span>
            </h2>
            <p className="text-gray-400 text-xl">Three simple steps to academic success</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            {/* Animated connector lines */}
            <div className="hidden md:block absolute top-20 left-[20%] right-[20%] h-[2px] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-purple-500/20" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500 animate-flow-line" />
            </div>

            {/* Pulsing dots */}
            <div className="hidden md:block absolute top-20 left-[calc(20%-5px)] w-3 h-3 rounded-full bg-blue-500 animate-pulse-dot shadow-[0_0_10px_rgba(79,143,255,0.5)]" />
            <div className="hidden md:block absolute top-20 left-[calc(50%-5px)] w-3 h-3 rounded-full bg-violet-500 animate-pulse-dot animation-delay-200 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
            <div className="hidden md:block absolute top-20 right-[calc(20%-5px)] w-3 h-3 rounded-full bg-purple-500 animate-pulse-dot animation-delay-300 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />

            {[
              { step: "01", title: "Upload your notes", desc: "Paste or upload your lecture notes, slides, or any study material.", gradient: "from-blue-500 to-cyan-500", icon: <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg> },
              { step: "02", title: "AI does the work", desc: "We summarize, create quizzes, flashcards, and study games.", gradient: "from-violet-500 to-purple-500", icon: <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg> },
              { step: "03", title: "Study & crush it", desc: "Review summaries, play games, take quizzes, and ace your exam.", gradient: "from-purple-500 to-pink-500", icon: <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" /></svg> },
            ].map((item, i) => (
              <div key={item.step} className={`group text-center how-step how-step-${i} relative`}>
                <div className="relative">
                  {/* Step icon with neon glow */}
                  <div className="relative inline-block mb-10">
                    <div className={`absolute -inset-3 bg-gradient-to-br ${item.gradient} rounded-3xl blur-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-500`} />
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} rounded-2xl animate-pulse-ring opacity-20`} />
                    <div className={`relative flex items-center justify-center h-28 w-28 rounded-2xl bg-gradient-to-br ${item.gradient} shadow-2xl transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`} style={{ boxShadow: `0 0 40px rgba(139,92,246,0.2)` }}>
                      {item.icon}
                    </div>
                    <div className="absolute -bottom-3 -right-3 bg-gray-950 rounded-lg px-3 py-1 border border-white/10 text-xs font-bold text-violet-400 neon-box">
                      {item.step}
                    </div>
                  </div>

                  <h3 className="text-white font-bold text-xl mb-3 group-hover:neon-text transition-all duration-300">
                    {item.title}
                  </h3>
                  <p className="text-gray-400 text-base leading-relaxed group-hover:text-gray-300 transition-colors duration-300 max-w-xs mx-auto">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Glow Divider ═══ */}
      <div className="relative z-10 px-6">
        <div className="max-w-4xl mx-auto glow-divider" />
      </div>

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="relative py-32 px-6 overflow-hidden z-10">
        <div ref={ctaRef} className="relative max-w-3xl mx-auto reveal-section">
          <div className="relative glass iridescent rounded-3xl p-14 sm:p-20 text-center overflow-hidden">
            {/* Scan lines */}
            <div className="scan-lines absolute inset-0 rounded-3xl" />

            {/* Decorative orbs */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl animate-morph" style={{ animationDuration: "12s" }} />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl animate-morph" style={{ animationDelay: "6s", animationDuration: "15s" }} />

            <div className="relative z-10">
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-5">
                Stop re-reading.{" "}
                <span className="gradient-text-shimmer neon-text">Start retaining.</span>
              </h2>
              <p className="text-gray-400 text-lg mb-12 max-w-xl mx-auto">
                Join thousands of students who are studying smarter with Summarize.
                It&apos;s free to get started.
              </p>
              <button
                onClick={openSignup}
                className="magnetic-btn group relative inline-block px-14 py-5 text-base font-bold text-white rounded-2xl transition-all overflow-hidden hover:scale-[1.03] active:scale-[0.97]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
                <span className="relative">Create your free account</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="relative z-10 border-t border-white/[0.04] py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg blur-md opacity-40" />
              <div className="relative h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs">
                S
              </div>
            </div>
            <span className="text-sm text-gray-600">&copy; 2026 Summarize</span>
          </div>
          <div className="flex gap-8">
            <Link href="/about" className="text-sm text-gray-500 hover:text-gray-300 transition-colors animated-underline">About</Link>
            <button onClick={openLogin} className="text-sm text-gray-500 hover:text-gray-300 transition-colors animated-underline">Log In</button>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultMode={authMode} />
    </div>
  );
}

// 3D Tilt Feature Card Component
function TiltFeatureCard({ feature, index }: { feature: { title: string; desc: string; iconBg: string; gradient: string; icon: React.ReactNode }; index: number }) {
  const { ref, handleMouseMove, handleMouseLeave } = useTiltCard();

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative glass-card holo-shimmer neon-box rounded-2xl p-8 feature-card feature-card-${index}`}
      style={{ transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease, background 0.4s ease, border-color 0.4s ease", transformStyle: "preserve-3d" }}
    >
      {/* Tilt shine overlay */}
      <div className="tilt-shine" />

      {/* Hover gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500`} />

      <div className="relative" style={{ transform: "translateZ(20px)" }}>
        <div className={`h-14 w-14 rounded-xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${feature.iconBg}`} style={{ boxShadow: "0 0 20px rgba(139,92,246,0.1)" }}>
          {feature.icon}
        </div>
        <h3 className="text-white font-bold text-lg mb-3 group-hover:neon-text transition-all">
          {feature.title}
        </h3>
        <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors">
          {feature.desc}
        </p>
      </div>
    </div>
  );
}
