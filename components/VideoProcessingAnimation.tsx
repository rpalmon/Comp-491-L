"use client";

import { useEffect, useState } from "react";

const STAGES = [
  { icon: "🔗", text: "Fetching video data...", sub: "Connecting to source" },
  { icon: "📝", text: "Extracting transcript...", sub: "Pulling spoken content" },
  { icon: "🧠", text: "AI is analysing...", sub: "Understanding the video" },
  { icon: "✨", text: "Crafting your summary...", sub: "Distilling key ideas" },
  { icon: "🎯", text: "Polishing the result...", sub: "Almost there" },
];

const FACTS = [
  "The average YouTube video is 7 minutes long.",
  "AI can process an hour of speech in seconds.",
  "Visual content is processed 60,000× faster than text.",
  "Summarising a lecture boosts recall by up to 40%.",
  "The brain retains structured notes far better than raw transcripts.",
];

export default function VideoProcessingAnimation() {
  const [stage, setStage] = useState(0);
  const [fact, setFact] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const id = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setFact((f) => (f + 1) % FACTS.length), 4500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? "" : d + ".")), 400);
    return () => clearInterval(id);
  }, []);

  const current = STAGES[stage];
  const progress = ((stage + 1) / STAGES.length) * 100;

  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="relative overflow-hidden rounded-3xl glass p-12">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Ambient orbs */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" />
        <div
          className="absolute bottom-0 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px] animate-pulse"
          style={{ animationDelay: "1s" }}
        />

        {/* Floating particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              background:
                i % 2 === 0 ? "rgba(168, 85, 247, 0.4)" : "rgba(79, 143, 255, 0.4)",
              left: `${10 + i * 7.5}%`,
              top: `${20 + ((i * 13) % 60)}%`,
              animation: `float-up ${3 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}

        <div className="relative z-10 flex flex-col items-center">
          {/* Icon */}
          <div className="relative mb-10">
            <div className="absolute -inset-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-[2rem] blur-xl animate-pulse" />
            <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-purple-500/15 to-blue-500/15 border border-white/10 flex items-center justify-center shadow-2xl shadow-purple-500/10">
              <span className="text-6xl">{current.icon}</span>
            </div>
            {/* Orbiting dots */}
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute w-2.5 h-2.5 rounded-full"
                style={{
                  background: i === 0 ? "#a855f7" : i === 1 ? "#4f8fff" : "#8b5cf6",
                  animation: `orbit ${2 + i * 0.5}s linear infinite`,
                  animationDelay: `${i * 0.7}s`,
                  top: "50%",
                  left: "50%",
                  opacity: 0.7,
                  boxShadow: `0 0 8px ${i === 0 ? "#a855f7" : i === 1 ? "#4f8fff" : "#8b5cf6"}`,
                }}
              />
            ))}
          </div>

          {/* Stage label */}
          <h2 className="text-2xl font-bold text-white mb-2 transition-all duration-500">
            {current.text}
          </h2>
          <p className="text-gray-400 mb-10">
            {current.sub}
            {dots}
          </p>

          {/* Progress bar */}
          <div className="w-full max-w-md mb-10">
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 transition-all duration-1000"
                style={{
                  width: `${progress}%`,
                  backgroundSize: "200% 100%",
                  animation: "shimmer 2s linear infinite",
                }}
              />
            </div>
            <div className="flex justify-between mt-3">
              {STAGES.map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                    i <= stage
                      ? "bg-purple-500 scale-110 shadow-sm shadow-purple-500/50"
                      : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Fun fact */}
          <div className="px-6 py-4 rounded-xl glass max-w-md">
            <p className="text-[10px] text-purple-400 uppercase tracking-widest mb-1.5 font-bold">
              Did you know?
            </p>
            <p className="text-gray-400 text-sm transition-all duration-500">
              {FACTS[fact]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
