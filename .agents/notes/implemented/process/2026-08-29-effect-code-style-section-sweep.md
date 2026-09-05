# Agent Note: Effect v4 code-style section — full sweep, and the two findings that touch this repo

Status: implemented

## Problem

Continuation of [2026-08-29-effect-code-style-guidelines.md](2026-08-29-effect-code-style-guidelines.md), which covered only the `guidelines` page. Read the remaining five pages of the v4 Code Style section (`dual`, `branded-types`, `pattern-matching`, `do`, `control-flow`), fetched via the `…/<page>.md` route.

The question was the same: is any of this new to the repo, and does any of it apply to code we have.

## What the five pages say

- **`dual`** — most Effect functions ship two overloads. Data-last (`Effect.map(f)`) composes with `pipe`; data-first (`Effect.map(effect, f)`) applies directly. Identical results; the doc explicitly declines to prefer one, calling it a readability choice.
- **`branded-types`** — TypeScript is structural, so `type UserId = number` and `type ProductId = number` are interchangeable. `Brand.Brand<"Tag">` intersects a unique-symbol tag to separate them. `Brand.nominal<T>()` brands with no runtime check; `Brand.make<T>(predicate)` validates and throws `BrandError` (with non-throwing `.option`/`.result`/`.is`); `Brand.all(A, B)` composes constructors, with the type recovered via `Brand.Brand.FromConstructor<typeof C>`.
- **`pattern-matching`** — `effect/Match`. Build with `Match.type<T>()` or `Match.value(x)`; branch with `Match.when` (literal, object shape, or predicate), `Match.not`, `Match.tag` (multiple tags per branch); close with `Match.exhaustive`, `Match.orElse`, `Match.option`, or `Match.result`. `Match.withReturnType<T>()` pins every branch's return type but **must be first in the pipeline** or it silently stops enforcing.
- **`do`** — three escalating answers to pipe-nesting: raw nested `pipe`, then `Effect.Do` + `Effect.bind`/`Effect.let`, then `Effect.gen`. The page ends on `Effect.gen` as "the most concise and convenient solution".
- **`control-flow`** — plain JS `if` works inside `Effect.gen`. Beyond that: `Effect.when(conditionEffect)` → `Option<A>`; `Effect.zip`/`zipWith` (sequential unless `{ concurrent: true }`); `Effect.whileLoop`; `Effect.forEach` (`concurrency`, `{ discard: true }`); `Effect.all` over tuple/iterable/struct/record, short-circuiting unless `{ mode: "result" }`.

Three upstream rough edges, recorded so a future re-read doesn't waste time on them: the branded-types page still heads its validation section `### refined` while documenting `Brand.make`; the control-flow page's two `whileLoop` examples use plain `Effect.gen` while-loops and never call `Effect.whileLoop`; and `Match.result`'s prose says the failure carries "no match" while its example returns `Result.fail({ role: "viewer" })` — the input value. All three are now recorded in the source note itself.

## Decision

Three things came out of this sweep. All have shipped.

**The source note needed correcting, not replacing.** All five pages were already captured in [`effect-v4-code-style.md`](../../../skills/effect-code/references/effect-report/effect-v4-code-style.md) — its header names exactly these five pages and sections 2–6 cover them. The first read of this note concluded "nothing stale"; a closer re-read against the live pages found seven genuine gaps, all in `branded-types` and `pattern-matching`: `Brand.make`'s non-throwing `.option`/`.result`/`.is`, `Brand.Brand.FromConstructor`, the `Match.withReturnType` ordering rule, `Match.nonEmptyString` and `Match.record`, `Match.tag`'s `_tag` hard-wiring, and what `Match.result`'s failure actually carries. Corrected in place; hash moved `87d438351c` → `4124be9360`.

**`SKILL.md` carried none of the section.** Grepping the skill for `Match`, `Brand`, `data-first`, `data-last`, `Effect.Do`, or `zip` returned zero hits. Closed by the ordinary self-maintenance pass, which picked `code-style` on gap 200 and took it 0 → 90.

**Two findings applied to code we actually have**, and both are fixed:

1. **Every domain ID in the contracts was an unbranded `Schema.String`.** 57 lines across [`rpc.ts`](../../../../packages/contracts/src/rpc.ts) and [`schemas.ts`](../../../../packages/contracts/src/schemas.ts) declared `saveId`, `matchId`, `selectedClubId`, `opponentClubId`, `playerId` and friends as bare `Schema.String`. `startMatch`'s payload took `saveId` and `opponentClubId` adjacently and transposing them was not a type error anywhere — exactly the failure the branded-types page opens with. Shipped as [2026-08-29-branded-domain-ids.md](../architecture/2026-08-29-branded-domain-ids.md).
2. **`collectPlayerIds` had a `default:` branch that defeated exhaustiveness.** [match.ts](../../../../apps/desktop/src/main/match.ts) switched on `event._tag` and fell through to `default: return [event.playerId]`, so a `MatchEvent` variant without a `playerId` would compile clean and fail at runtime. Now every case is listed explicitly with no `default:`. The only other `_tag` switch, in [commentary.ts:148](../../../../packages/game-engine/src/match/commentary.ts#L148), returns from every case with no `default` and was already exhaustive — left alone.

Nothing else in the section demanded action. Tacit usage remains at zero. The `dual` guidance is a preference the docs decline to make normative, so it went into `SKILL.md` inside the existing `## Structure: two spellings, pick one per region` rather than as a rule of its own.

## Alternatives considered

- **Rewrite both `_tag` switches with `Match`.** Rejected. A `switch` on `_tag` where every case returns is already exhaustiveness-checked by TypeScript; `commentary.ts` gets nothing from `Match` but a new import and an unfamiliar idiom in a module deliberately kept dependency-light. Only the `default:` in `match.ts` was a genuine hole, and it closed without adopting `Match` at all. This distinction is now written into `SKILL.md`'s `## Branching with Match`.
- **Brand the IDs via a `.scratch/` ticket rather than directly.** This note deferred finding 1 as too large — every RPC payload, both contract files, every decode site — with the `Schema`-brand-vs-`Brand.nominal` question unresolved. Done directly instead, once a spike showed the true blast radius was 41 files and the `Schema.brand` answer was clear. The deferral was the right call *at the time this note was written*; it stopped being right once the sizing was cheap to get.
- **Fold this into the companion note.** Rejected: that note is scoped to one page and states its scope. Two notes that cross-link keep each one's claim checkable against its own source.
- **Add an `effect-lint` rule banning `default:` in `_tag` switches.** Rejected: one occurrence, and the rule cannot distinguish a lazy `default` from a legitimate catch-all over an open union.

## Consequences

1. `SKILL.md` gained `## Branding domain types` and `## Branching with Match` as new sections; `## Structure`, `## Running at the edge`, and `## Gotchas` absorbed the rest. `code-style` scored 90, with the shortfall itemised in the registry row rather than rounded up to a false "done".
2. Both risks this note flagged were handled by fencing rather than prose, which is stronger than what the note asked for. `electron-runmain-exception` keeps the distilled `runMain` guidance from contradicting the entry-point decision. `schema-brand-over-brand-module` records this repo's `Schema.brand` preference, which the source note does not cover at all. `Match.withReturnType`'s must-be-first constraint is stated with its silent-failure consequence attached, since the note was explicit that stating it without the caveat is worse than omitting it.
3. The partial-branding risk did not materialise: the ID change went in whole. Every contract ID field is branded, and the decode boundary is uniform, so there is no unbranded remainder that reads as deliberate.
4. Acceptance criterion "`effect-v4-code-style.md` stays byte-identical" was **not met, deliberately** — the source was corrected before distilling rather than distilled as-was. The other half of that criterion (touch the `Source hash seen` row only if the file moves) was honoured.
5. The next self-maintenance pick is `concurrency` (gap 200). Its registry row already warns that the `performance-judgement` fence covers ground that pass must write around.
