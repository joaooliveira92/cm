import type { JSX } from "react";

import type { SvgGlobeRefs } from "./useSvgGlobe.js";

export interface GlobeShellProps {
  readonly refs: SvgGlobeRefs;
}

// The static D3 globe `<svg>` skeleton shared by both variants. The rAF loop
// (owned by useSvgGlobe) draws into the refs' element groups each frame.
export function GlobeShell({ refs }: GlobeShellProps): JSX.Element {
  return (
    <div ref={refs.containerRef} className="absolute inset-0 overflow-hidden">
      <svg
        ref={refs.svgRef}
        className="h-full w-full"
        style={{ touchAction: "none" }}
        role="img"
        aria-label="World map"
      >
        <defs>
          <radialGradient id="svg-globe-ocean" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#0e1622" />
            <stop offset="100%" stopColor="#0a0f18" />
          </radialGradient>
          <radialGradient id="svg-globe-atmosphere" cx="50%" cy="50%" r="52%">
            <stop offset="88%" stopColor="#38bdf8" stopOpacity="0" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.3" />
          </radialGradient>
        </defs>
        <circle ref={refs.atmosphereRef} fill="url(#svg-globe-atmosphere)" />
        <circle
          ref={refs.oceanRef}
          fill="url(#svg-globe-ocean)"
          stroke="#38bdf8"
          strokeOpacity={0.5}
          strokeWidth={1}
        />
        <g
          ref={refs.gratRef}
          fill="none"
          stroke="#38bdf8"
          strokeOpacity={0.25}
          strokeWidth={0.6}
          strokeDasharray="2 3"
        />
        <g ref={refs.landRef} fill="#1d2b20" stroke="#c89b3c" strokeWidth={1.25} />
        <g ref={refs.pinRef} />
        <g ref={refs.ringRef} className="svg-globe-ring-group" />
      </svg>
      <style>{`
        .svg-globe-ring {
          animation: svg-globe-ring-pulse 1.6s ease-out infinite;
        }
        @keyframes svg-globe-ring-pulse {
          0% { transform: scale(1) rotate(0deg); opacity: 1; }
          100% { transform: scale(2.6) rotate(20deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .svg-globe-ring { animation: none; opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
