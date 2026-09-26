import { CONTENT_PACKS } from "@cm-clone/shared";
import { runCli } from "./club-badges/cli.js";
import { CLUB_BADGE_LIBRARY_DIR } from "./club-badges/manifest.js";

/**
 * The only way club badges enter the library:
 *
 *   pnpm import-club-badges <source-dir> --adapter football-logos
 *
 * Copies the dump's newest badge per club into `src/renderer/assets/club-badges/<nation>/`, rewrites
 * the manifest, and prints the keys added, replaced and removed. It exits non-zero, having written
 * nothing, when it can't place a league folder, meets a key collision its adapter's override table
 * doesn't resolve, or would remove a key a content pack maps a club to.
 */
process.exitCode = runCli(process.argv.slice(2), {
  libraryDir: CLUB_BADGE_LIBRARY_DIR,
  referencedKeys: new Set(CONTENT_PACKS.flatMap((pack) => Object.values(pack.clubBadges))),
  // pnpm runs a package script from the package directory; INIT_CWD is where the command was typed.
  cwd: process.env.INIT_CWD ?? process.cwd(),
  log: (line) => process.stdout.write(`${line}\n`),
  error: (line) => process.stderr.write(`${line}\n`),
});
