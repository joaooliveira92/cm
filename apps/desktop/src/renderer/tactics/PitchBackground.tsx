/**
 * The pitch's own drawing, in a 68 × 100 box stretched to whatever box the pitch element has.
 * Decorative, and behind every marker, because the slot list laid over it is what a screen reader
 * reads. Both pitches draw it: `FormationPitch` under the editable eleven, `OverviewPitch` under the
 * saved one.
 *
 * The markings are a 105 × 68 m pitch to Law 1's measurements, scaled into the lines `pitchLayout`
 * places markers inside: touchlines at 2 and 66, goal lines at 2 and 98.
 */

const LEFT = 2;
const TOP = 2;
const WIDTH = 64;
const LENGTH = 96;
const MID_X = LEFT + WIDTH / 2;
const MID_Y = TOP + LENGTH / 2;

/** Metres to box units, across and along the pitch. */
const SX = WIDTH / 68;
const SY = LENGTH / 105;

const CIRCLE = 9.15;
const SPOT_RADIUS = 0.35;

const box = (widthM: number, depthM: number) => ({ halfWidth: (widthM / 2) * SX, depth: depthM * SY });
const PENALTY_AREA = box(40.32, 16.5);
const GOAL_AREA = box(18.32, 5.5);
const GOAL = { halfWidth: (7.32 / 2) * SX, depth: 1.4 };
const PENALTY_SPOT = 11 * SY;
/** Where the 9.15 m arc round the penalty spot meets the penalty area's front edge. */
const ARC_HALF_CHORD = Math.sqrt(CIRCLE ** 2 - (16.5 - 11) ** 2) * SX;
const CORNER = 1;

/** One end's markings, drawn for the top goal; `dir` is 1 there and -1 for the bottom one. */
const End = ({ goalLine, dir }: { readonly goalLine: number; readonly dir: 1 | -1 }) => {
  const edge = (depth: number) => goalLine + dir * depth;
  const area = ({ halfWidth, depth }: { readonly halfWidth: number; readonly depth: number }) =>
    `M${MID_X - halfWidth},${goalLine} V${edge(depth)} H${MID_X + halfWidth} V${goalLine}`;
  const front = edge(PENALTY_AREA.depth);
  return (
    <>
      <path d={area(PENALTY_AREA)} />
      <path d={area(GOAL_AREA)} />
      <path
        d={`M${MID_X - ARC_HALF_CHORD},${front} A${CIRCLE * SX},${CIRCLE * SY} 0 0 ${dir === 1 ? 0 : 1} ${MID_X + ARC_HALF_CHORD},${front}`}
      />
      <path d={area({ halfWidth: GOAL.halfWidth, depth: -GOAL.depth })} strokeOpacity="0.9" />
      <ellipse cx={MID_X} cy={edge(PENALTY_SPOT)} rx={SPOT_RADIUS} ry={SPOT_RADIUS} fill="var(--color-pitch-line)" stroke="none" />
      {([-1, 1] as const).map((side) => {
        const x = side === -1 ? LEFT : LEFT + WIDTH;
        return (
          <path
            key={side}
            d={`M${x},${edge(CORNER * SY)} A${CORNER * SX},${CORNER * SY} 0 0 ${side === dir ? 1 : 0} ${x - side * CORNER * SX},${goalLine}`}
          />
        );
      })}
    </>
  );
};

export const PitchBackground = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 68 100"
    preserveAspectRatio="none"
    className="absolute inset-0 size-full [&_*]:[vector-effect:non-scaling-stroke]"
    fill="none"
    stroke="var(--color-pitch-line)"
    strokeWidth="1.5"
    strokeLinejoin="miter"
  >
    <rect x={LEFT} y={TOP} width={WIDTH} height={LENGTH} />
    <line x1={LEFT} y1={MID_Y} x2={LEFT + WIDTH} y2={MID_Y} />
    <ellipse cx={MID_X} cy={MID_Y} rx={CIRCLE * SX} ry={CIRCLE * SY} />
    <ellipse cx={MID_X} cy={MID_Y} rx={SPOT_RADIUS * 1.2} ry={SPOT_RADIUS * 1.2} fill="var(--color-pitch-line)" stroke="none" />
    <End goalLine={TOP} dir={1} />
    <End goalLine={TOP + LENGTH} dir={-1} />
  </svg>
);
