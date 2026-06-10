"use client";
// SVG city illustration for the VCB Digibank home hero.
// Approximates the Sample_UI/IMG_0074 cityscape: cyan sky, layered green
// buildings, vegetation, aircraft.  All art is pure SVG — no image assets.
export function CityHero() {
  return (
    <svg
      viewBox="0 0 390 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", marginBottom: -3 }}
      aria-hidden
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2e8abf" />
          <stop offset="45%" stopColor="#52aad6" />
          <stop offset="100%" stopColor="#8dcfed" />
        </linearGradient>
        <linearGradient id="bld_bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5aadbc" />
          <stop offset="100%" stopColor="#3d8a9a" />
        </linearGradient>
        <linearGradient id="bld_mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f9060" />
          <stop offset="100%" stopColor="#157048" />
        </linearGradient>
        <linearGradient id="bld_fg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#135c38" />
          <stop offset="100%" stopColor="#0a4028" />
        </linearGradient>
        <radialGradient id="sunglow" cx="72%" cy="18%" r="28%">
          <stop offset="0%" stopColor="rgba(255,245,180,0.45)" />
          <stop offset="100%" stopColor="rgba(255,245,180,0)" />
        </radialGradient>
        <linearGradient id="tree1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2dc46a" />
          <stop offset="100%" stopColor="#1aaa52" />
        </linearGradient>
        <linearGradient id="tree2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#18a04c" />
          <stop offset="100%" stopColor="#108038" />
        </linearGradient>
      </defs>

      {/* ── Sky ── */}
      <rect width="390" height="220" fill="url(#sky)" />
      <ellipse cx="282" cy="38" rx="90" ry="55" fill="url(#sunglow)" />

      {/* ── Clouds ── */}
      <g fill="rgba(255,255,255,0.72)">
        <ellipse cx="68" cy="36" rx="36" ry="11" />
        <ellipse cx="85" cy="30" rx="24" ry="9" />
        <ellipse cx="50" cy="34" rx="18" ry="7" />

        <ellipse cx="268" cy="22" rx="32" ry="10" />
        <ellipse cx="283" cy="16" rx="20" ry="8" />
        <ellipse cx="252" cy="20" rx="16" ry="6" />
      </g>

      {/* ── Aircraft / spaceship (upper-left) ── */}
      <g transform="translate(38, 52) rotate(-8)" fill="white" opacity="0.9">
        <ellipse cx="0" cy="0" rx="18" ry="5" />
        <polygon points="10,-5 20,0 10,5" />
        <polygon points="-6,-6 -12,-11 -4,-6" />
        <polygon points="-6,6 -12,11 -4,6" />
        <ellipse cx="-4" cy="0" rx="5" ry="3" fill="#aaeeff" opacity="0.8" />
      </g>

      {/* ══ Background buildings (far, pale teal) ══ */}
      <path
        fill="url(#bld_bg)"
        opacity="0.65"
        d="
          M0,220 L0,92
          L30,92 L30,75 L45,75 L45,62 L60,62 L60,75 L72,75
          L72,60 L88,60 L88,72 L100,72
          L100,58 L116,58 L116,48 L132,48 L132,58 L145,58
          L145,44 L162,44 L162,56 L175,56
          L175,42 L192,42 L192,52 L206,52
          L206,38 L224,38 L224,50 L240,50
          L240,44 L255,44 L255,56 L268,56
          L268,48 L284,48 L284,60 L298,60
          L298,52 L314,52 L314,62 L328,62
          L328,55 L345,55 L345,68 L360,68
          L360,78 L376,78 L376,90 L390,90 L390,220
          Z
        "
      />

      {/* ══ Mid buildings (green) ══ */}
      <path
        fill="url(#bld_mid)"
        d="
          M0,220 L0,108
          L25,108 L25,94 L40,94 L40,82 L56,82 L56,92 L68,92
          L68,78 L85,78 L85,88 L99,88
          L99,74 L116,74 L116,84 L130,84
          L130,70 L148,70 L148,80 L162,80
          L162,66 L180,66 L180,76 L195,76
          L195,62 L214,62 L214,72 L228,72
          L228,68 L244,68 L244,78 L258,78
          L258,68 L274,68 L274,80 L290,80
          L290,70 L307,70 L307,82 L322,82
          L322,74 L338,74 L338,86 L354,86
          L354,94 L370,94 L370,104 L390,104 L390,220
          Z
        "
      />

      {/* ══ Foreground buildings (dark green) ══ */}
      <path
        fill="url(#bld_fg)"
        d="
          M0,220 L0,128
          L22,128 L22,114 L38,114 L38,102 L55,102 L55,112 L68,112
          L68,100 L86,100 L86,110 L100,110
          L100,96 L118,96 L118,106 L134,106
          L134,92 L152,92 L152,102 L168,102
          L168,88 L188,88 L188,98 L205,98
          L205,84 L225,84 L225,94 L242,94
          L242,102 L258,102 L258,90 L274,90
          L274,100 L290,100 L290,88 L308,88
          L308,98 L325,98 L325,108 L340,108
          L340,98 L356,98 L356,110 L372,110
          L372,120 L390,120 L390,220
          Z
        "
      />

      {/* ── Building window accents (mid layer dots) ── */}
      <g fill="rgba(255,255,200,0.22)">
        {[110, 148, 195, 244, 307].map((bx) =>
          [80, 88, 96, 104].map((by) => (
            <rect key={`w${bx}${by}`} x={bx + 4} y={by} width={8} height={5} rx={1} />
          ))
        )}
      </g>

      {/* ── Trees foreground layer 1 (bright) ── */}
      <g fill="url(#tree1)">
        {[18, 58, 110, 162, 212, 260, 310, 358].map((tx, i) => (
          <ellipse key={`t1${i}`} cx={tx} cy={168} rx={24 + (i % 3) * 4} ry={18 + (i % 2) * 3} />
        ))}
      </g>

      {/* ── Trees foreground layer 2 (shadow, darker) ── */}
      <g fill="url(#tree2)">
        {[18, 58, 110, 162, 212, 260, 310, 358].map((tx, i) => (
          <ellipse key={`t2${i}`} cx={tx} cy={176} rx={24 + (i % 3) * 4} ry={12} />
        ))}
      </g>

      {/* ── Ground strip ── */}
      <rect x="0" y="188" width="390" height="32" fill="#0e5232" />
      <rect x="0" y="188" width="390" height="4" fill="rgba(40,180,90,0.3)" />
    </svg>
  );
}
