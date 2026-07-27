/**
 * Full-viewport football pitch backdrop: alternating mowed-grass stripes
 * plus faint pitch line markings (halfway line, center circle, penalty
 * boxes). Fixed and non-interactive, sits behind all content at low
 * opacity so it reads as texture/atmosphere rather than competing with
 * the UI.
 */
export default function PitchBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-pitch-950">
      {/* mowed-grass stripes */}
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #1a2921 0px, #1a2921 90px, #16221b 90px, #16221b 180px)",
        }}
      />

      {/* radial floodlight glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(34,197,94,0.14), transparent 60%), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(34,197,94,0.08), transparent 60%)",
        }}
      />

      {/* pitch line markings */}
      <svg
        className="absolute left-1/2 top-0 h-full w-[1400px] max-w-none -translate-x-1/2 opacity-[0.15]"
        viewBox="0 0 1400 1600"
        preserveAspectRatio="xMidYMin slice"
        fill="none"
      >
        <rect x="20" y="20" width="1360" height="1560" rx="4" stroke="#7ee2a8" strokeWidth="3" />
        <line x1="20" y1="800" x2="1380" y2="800" stroke="#7ee2a8" strokeWidth="3" />
        <circle cx="700" cy="800" r="160" stroke="#7ee2a8" strokeWidth="3" />
        <circle cx="700" cy="800" r="5" fill="#7ee2a8" />
        {/* top penalty box */}
        <rect x="410" y="20" width="580" height="260" stroke="#7ee2a8" strokeWidth="3" />
        <rect x="550" y="20" width="300" height="100" stroke="#7ee2a8" strokeWidth="3" />
        <path d="M 550 280 A 160 160 0 0 0 850 280" stroke="#7ee2a8" strokeWidth="3" />
        {/* bottom penalty box */}
        <rect x="410" y="1320" width="580" height="260" stroke="#7ee2a8" strokeWidth="3" />
        <rect x="550" y="1480" width="300" height="100" stroke="#7ee2a8" strokeWidth="3" />
        <path d="M 550 1320 A 160 160 0 0 1 850 1320" stroke="#7ee2a8" strokeWidth="3" />
      </svg>

      {/* fade to solid at the bottom so long pages stay readable */}
      <div className="absolute inset-0 bg-hero-fade" />
    </div>
  );
}
