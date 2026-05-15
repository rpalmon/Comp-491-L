"use client";

import { useEffect, useRef } from "react";
import StarField from "@/components/StarField";
import FloatingShapes from "@/components/FloatingShapes";

export default function AboutPage() {
  const missionRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          }
        });
      },
      { threshold: 0.1 }
    );

    if (missionRef.current) observer.observe(missionRef.current);
    if (teamRef.current) observer.observe(teamRef.current);

    return () => observer.disconnect();
  }, []);

  const team = [
    { name: "Novali Plascencia", gradient: "from-blue-400 to-cyan-400", icon: "N" },
    { name: "Emilia Mahmoodi", gradient: "from-violet-400 to-purple-400", icon: "E" },
    { name: "Andy Moughalian", gradient: "from-pink-400 to-rose-400", icon: "A" },
    { name: "Roee Palmon", gradient: "from-orange-400 to-amber-400", icon: "R" },
    { name: "Christian Rusanovsky", gradient: "from-emerald-400 to-teal-400", icon: "C" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden noise-overlay" style={{ background: "#050510" }}>
      {/* Interactive backgrounds */}
      <StarField />
      <FloatingShapes />
      <div className="aurora-bg" style={{ zIndex: 1 }}>
        <div className="aurora-blob aurora-blob-1" style={{ opacity: 0.08 }} />
        <div className="aurora-blob aurora-blob-2" style={{ opacity: 0.06 }} />
        <div className="aurora-blob aurora-blob-3" style={{ opacity: 0.05 }} />
      </div>

      <div className="relative z-10 pt-32 pb-20 px-6">
        {/* Glow divider at top */}
        <div className="max-w-4xl mx-auto glow-divider mb-20 opacity-0" />
        {/* Hero Section */}
        <div className="max-w-5xl mx-auto text-center mb-28">
          <div className="inline-block mb-8">
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full glass text-sm text-gray-300 animate-fadeInUp">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              Built by students, for students
            </div>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight animate-fadeInUp animation-delay-100">
            About{" "}
            <span className="gradient-text-shimmer">SummArIze</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed animate-fadeInUp animation-delay-200">
            We&apos;re students who understand the struggle. Here&apos;s our story.
          </p>
        </div>

        {/* Mission Section */}
        <div ref={missionRef} className="max-w-4xl mx-auto mb-32 reveal-section">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/10 via-violet-600/10 to-purple-600/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500" />
            <div className="relative glass iridescent neon-box rounded-3xl p-10 md:p-14 overflow-hidden">
              {/* Decorative gradient */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-500/5 to-transparent rounded-bl-full" />

              <div className="relative">
                <div className="flex items-start gap-4 mb-8">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-3">Our Mission</h2>
                    <div className="w-20 h-[3px] bg-gradient-to-r from-violet-500 to-blue-500 rounded-full" />
                  </div>
                </div>

                <div className="space-y-6 text-gray-300 text-lg leading-relaxed">
                  <p>
                    In a world where <span className="text-white font-semibold">attention spans are shrinking</span> and information overload is the norm,
                    traditional studying methods just don&apos;t cut it anymore. We&apos;ve been there&mdash;staring at pages of notes,
                    struggling to stay focused, and cramming the night before exams.
                  </p>
                  <p>
                    That&apos;s why we built <span className="gradient-text font-semibold">SummArIze</span>.
                    We believe we&apos;ve found a solution that makes studying not just easier, but actually <span className="text-white font-semibold">engaging</span>.
                    By combining AI-powered summarization with interactive games, quizzes, and flashcards,
                    we&apos;re transforming boring study sessions into productive, focused learning experiences.
                  </p>
                  <p>
                    Our goal is simple: <span className="text-white font-semibold">help students learn more in less time</span>,
                    retain information better, and actually enjoy the process.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div ref={teamRef} className="max-w-5xl mx-auto reveal-section">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full glass text-sm text-gray-400">
              <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              The Team
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Meet the <span className="gradient-text">Founders</span></h2>
            <p className="text-gray-400 text-lg">Five students united by a mission to revolutionize studying</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {team.map((member, i) => (
              <div
                key={member.name}
                className={`group relative team-card team-card-${i}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${member.gradient} opacity-0 group-hover:opacity-10 rounded-2xl blur-xl transition-all duration-500`} />
                <div className="relative h-full glass-card holo-shimmer neon-box rounded-2xl p-6 hover:border-white/[0.15]">
                  <div className="flex flex-col items-center text-center h-full justify-center">
                    {/* Avatar */}
                    <div className="relative mb-5">
                      <div className={`absolute -inset-1 bg-gradient-to-br ${member.gradient} rounded-2xl blur-sm opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />
                      <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${member.gradient} flex items-center justify-center text-white text-2xl font-bold transform group-hover:rotate-6 group-hover:scale-110 transition-all duration-500 shadow-lg`}>
                        {member.icon}
                      </div>
                    </div>
                    <h3 className="text-white font-bold mb-1 text-sm group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all duration-300">
                      {member.name}
                    </h3>
                    <p className="text-gray-500 text-xs">Co-Founder</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-3xl mx-auto text-center mt-32">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/15 to-purple-600/15 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500" />
            <div className="relative glass rounded-3xl p-12 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-blue-500/5" />
              <div className="relative">
                <h3 className="text-3xl font-bold text-white mb-4">
                  Ready to transform your <span className="gradient-text">study game</span>?
                </h3>
                <p className="text-gray-400 text-lg mb-8">
                  Join us in making studying smarter, not harder.
                </p>
                <a
                  href="/"
                  className="group/btn relative inline-block px-10 py-4 text-white font-semibold rounded-xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-violet-600 rounded-xl blur-lg opacity-0 group-hover/btn:opacity-30 transition-opacity" />
                  <span className="relative">Get Started Free</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
