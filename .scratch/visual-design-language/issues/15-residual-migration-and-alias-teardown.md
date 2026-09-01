# 15: Residual screen migration and alias-layer teardown

**What to build:** every remaining `slate-*` call site across the renderer — fixtures, tactics, season summary, league-table content, the boot and save-list chrome, and all miscellaneous screens — renames onto the semantic tokens under the stable palette, in shared-layer-first order then screen-by-screen, deleting each `--color-slate-*` alias as its last user renames. The `no-slate-class-name` lint baseline shrinks with each batch; the work is done when the alias layer and the lint baseline both reach zero and no `slate-` reference remains in the renderer. The visible palette never changes during this ticket — the tokens are stable and the aliases already resolve to them — so the migration is invisible and pure source-level residue removal, with `check:all` green at every step.

The slice's edge promise: this is the contract teardown of the wide refactor. Every surface already renders the adopted palette (ticket 08's alias layer); this ticket removes the mechanical scaffolding that made that possible without changing what any surface looks like. Callers observe no render change whatsoever — the only observable is that `slate-` vanishes from the source and the guard keeps it gone.

**Decisions:**

(none — contract teardown of the ticket-08 migration; the migration strategy it completes is the token-adoption decision, which ticket 08 already realized. When each renames batch lands, fold any reusable pattern into the token-adoption skill note rather than re-deciding the mechanism.)

**Blocked by:** 09 — Career chrome, season readout, and Continue; 10 — Dense shared-table layer and the player-status vocabulary; 11 — Create-career surface — fields and the pre-career chrome band; 12 — Unified modal anatomy across overlays; 13 — Text-led empty and error grammar; 14 — Match-day visual language on the shared tokens. (Each of those renamed its demonstrated surfaces and deleted the aliases it was the last user of; this ticket sweeps every surface none of them touched.)

**Status:** ready-for-agent

- [ ] No `slate-` reference remains anywhere in the renderer source, in any class position.
- [ ] The full `--color-slate-*` alias layer is deleted — every alias was removed as its last user renamed, never before.
- [ ] The `no-slate-class-name` baseline registry is zero; the rule remains live and the clean repository passes `pnpm check:all` with it enforced.
- [ ] A human visual pass at each batch confirms no surface changed appearance during the teardown (the palette was stable; this ticket removed scaffolding only).
- [ ] `pnpm check:all` is green at the final commit, with the alias layer and the lint baseline both at zero.