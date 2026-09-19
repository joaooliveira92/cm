import { existsSync, statSync } from "node:fs";
import path from "node:path";
import type { BadgeAdapter } from "./adapter.js";
import { footballLogosAdapter } from "./football-logos.js";
import { describeFailure, importClubBadges } from "./import.js";

const ADAPTERS: Readonly<Record<string, () => BadgeAdapter>> = {
  "football-logos": () => footballLogosAdapter(),
};

const USAGE = `usage: import-club-badges <source-dir> --adapter <${Object.keys(ADAPTERS).join(" | ")}>`;

export interface CliEnvironment {
  readonly libraryDir: string;
  readonly referencedKeys: ReadonlySet<string>;
  /** The directory a relative `<source-dir>` resolves against. */
  readonly cwd?: string;
  readonly log: (line: string) => void;
  readonly error: (line: string) => void;
}

const parseArgs = (
  argv: ReadonlyArray<string>,
): { readonly source: string; readonly adapter: string } | undefined => {
  const positional: Array<string> = [];
  let adapter: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--adapter") {
      adapter = argv[index + 1];
      index += 1;
    } else if (arg !== undefined && arg !== "--") {
      positional.push(arg);
    }
  }
  const [source, ...rest] = positional;
  return source === undefined || adapter === undefined || rest.length > 0 ? undefined : { source, adapter };
};

/** `import-club-badges <source-dir> --adapter <name>`. Returns the process exit code. */
export const runCli = (argv: ReadonlyArray<string>, env: CliEnvironment): number => {
  const args = parseArgs(argv);
  if (args === undefined) {
    env.error(USAGE);
    return 1;
  }

  const makeAdapter = Object.hasOwn(ADAPTERS, args.adapter) ? ADAPTERS[args.adapter] : undefined;
  if (makeAdapter === undefined) {
    env.error(`import-club-badges: unknown adapter "${args.adapter}". ${USAGE}`);
    return 1;
  }

  const sourceDir = path.resolve(env.cwd ?? process.cwd(), args.source);
  if (!existsSync(sourceDir) || !statSync(sourceDir).isDirectory()) {
    env.error(`import-club-badges: source directory not found: ${sourceDir}`);
    return 1;
  }

  const outcome = importClubBadges({
    sourceDir,
    libraryDir: env.libraryDir,
    adapter: makeAdapter(),
    referencedKeys: env.referencedKeys,
  });
  if (outcome._tag === "Failed") {
    env.error(`import-club-badges: ${describeFailure(outcome.failure)}`);
    env.error("import-club-badges: stopped before writing anything.");
    return 1;
  }

  const { added, replaced, removed } = outcome.report;
  env.log(`import-club-badges: ${args.adapter} -> ${env.libraryDir}`);
  for (const [label, keys] of [
    ["added", added],
    ["replaced", replaced],
    ["removed", removed],
  ] as const) {
    env.log(`${label} (${keys.length})${keys.length > 0 ? ":" : ""}`);
    for (const key of keys) env.log(`  ${key}`);
  }
  return 0;
};
