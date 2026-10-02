/**
 * The pitch's own drawing, in a 68 × 100 box stretched to whatever box the pitch element has.
 * Decorative, and behind every marker, because the slot list laid over it is what a screen reader
 * reads. Both pitches draw it: `FormationPitch` under the editable eleven, `OverviewPitch` under the
 * saved one.
 */
export const PitchBackground = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 68 100"
    preserveAspectRatio="none"
    className="absolute inset-0 size-full [&_*]:[vector-effect:non-scaling-stroke]"
    fill="none"
    stroke="var(--color-pitch-line)"
    strokeWidth="1.5"
  >
    <rect x="2" y="2" width="64" height="96" />
    <line x1="2" y1="50" x2="66" y2="50" />
    <circle cx="34" cy="50" r="7" />
    <rect x="15" y="2" width="38" height="15" />
    <rect x="25" y="2" width="18" height="5" />
    <rect x="30" y="0.6" width="8" height="1.4" />
    <rect x="15" y="83" width="38" height="15" />
    <rect x="25" y="93" width="18" height="5" />
    <rect x="30" y="98" width="8" height="1.4" />
  </svg>
);
