"use client";

export default function FloatingShapes() {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
      {/* Rotating wireframe cube */}
      <div className="absolute top-[15%] right-[12%] animate-float-shape" style={{ animationDuration: "20s" }}>
        <div className="w-16 h-16 animate-spin-slow opacity-[0.07]" style={{ animationDuration: "25s" }}>
          <svg viewBox="0 0 100 100" fill="none" stroke="rgba(139,92,246,1)" strokeWidth="1">
            <polygon points="25,10 75,10 90,40 75,90 25,90 10,40" />
            <line x1="25" y1="10" x2="75" y2="90" />
            <line x1="75" y1="10" x2="25" y2="90" />
            <line x1="10" y1="40" x2="90" y2="40" />
          </svg>
        </div>
      </div>

      {/* Floating ring */}
      <div className="absolute top-[60%] left-[8%] animate-float-shape" style={{ animationDuration: "18s", animationDelay: "3s" }}>
        <div className="w-20 h-20 animate-spin-slow opacity-[0.06]" style={{ animationDuration: "30s", animationDirection: "reverse" }}>
          <svg viewBox="0 0 100 100" fill="none" stroke="rgba(79,143,255,1)" strokeWidth="1.5">
            <circle cx="50" cy="50" r="40" />
            <circle cx="50" cy="50" r="30" />
            <line x1="50" y1="10" x2="50" y2="90" />
            <line x1="10" y1="50" x2="90" y2="50" />
          </svg>
        </div>
      </div>

      {/* Triangle */}
      <div className="absolute top-[35%] left-[85%] animate-float-shape" style={{ animationDuration: "22s", animationDelay: "5s" }}>
        <div className="w-14 h-14 animate-spin-slow opacity-[0.05]" style={{ animationDuration: "35s" }}>
          <svg viewBox="0 0 100 100" fill="none" stroke="rgba(236,72,153,1)" strokeWidth="1.5">
            <polygon points="50,5 95,90 5,90" />
            <polygon points="50,30 78,78 22,78" />
          </svg>
        </div>
      </div>

      {/* Diamond */}
      <div className="absolute top-[75%] right-[20%] animate-float-shape" style={{ animationDuration: "16s", animationDelay: "8s" }}>
        <div className="w-12 h-12 animate-spin-slow opacity-[0.06]" style={{ animationDuration: "20s", animationDirection: "reverse" }}>
          <svg viewBox="0 0 100 100" fill="none" stroke="rgba(6,182,212,1)" strokeWidth="1.5">
            <polygon points="50,5 95,50 50,95 5,50" />
            <line x1="50" y1="5" x2="50" y2="95" />
            <line x1="5" y1="50" x2="95" y2="50" />
          </svg>
        </div>
      </div>

      {/* Small circle cluster - top left */}
      <div className="absolute top-[20%] left-[20%] animate-float-shape" style={{ animationDuration: "24s", animationDelay: "2s" }}>
        <div className="w-10 h-10 opacity-[0.05]">
          <svg viewBox="0 0 100 100" fill="none" stroke="rgba(168,85,247,1)" strokeWidth="1">
            <circle cx="30" cy="30" r="20" />
            <circle cx="70" cy="70" r="20" />
            <circle cx="70" cy="30" r="10" />
            <circle cx="30" cy="70" r="10" />
          </svg>
        </div>
      </div>

      {/* Cross / Plus */}
      <div className="absolute top-[50%] right-[40%] animate-float-shape" style={{ animationDuration: "19s", animationDelay: "7s" }}>
        <div className="w-8 h-8 animate-spin-slow opacity-[0.04]" style={{ animationDuration: "40s" }}>
          <svg viewBox="0 0 100 100" fill="none" stroke="rgba(139,92,246,1)" strokeWidth="2">
            <line x1="50" y1="10" x2="50" y2="90" />
            <line x1="10" y1="50" x2="90" y2="50" />
          </svg>
        </div>
      </div>

      {/* Large morphing gradient blob - hero area */}
      <div className="absolute top-[5%] left-[30%] w-[500px] h-[500px] opacity-[0.07]">
        <div className="w-full h-full bg-gradient-to-br from-violet-600 via-blue-600 to-purple-600 animate-morph" style={{ animationDuration: "15s" }} />
      </div>

      {/* Secondary blob */}
      <div className="absolute top-[50%] right-[10%] w-[350px] h-[350px] opacity-[0.05]">
        <div className="w-full h-full bg-gradient-to-br from-pink-600 via-violet-600 to-cyan-600 animate-morph" style={{ animationDuration: "20s", animationDelay: "5s" }} />
      </div>
    </div>
  );
}
