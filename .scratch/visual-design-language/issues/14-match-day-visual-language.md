# 14: Match-day visual language on the shared tokens

**What to build:** a live match renders inside the same career chrome and token system as every other career screen — no breakout shell, no sidebar, no chrome change — so match day feels like the career rather than a separate product. The distinct lane is the content region only; the one match-only element is the scoreboard surface token family; every other surface (background, panels, text, buttons, status colors) is shared, keeping one palette by construction. The stadium is a CSS-only wash built from existing tokens — a gradient wash under the panel-dark overlay — with no image dependency; when an image asset ever exists, it injects *under* the overlay, which is the kept seam. The scoreboard is the neutral chrome-band, white-score-box pattern, rendering from club name and score alone. During a live match the chrome's temporal cluster shows the match readout and career Continue is unavailable; at full time the same cluster returns to the season readout + Continue. The commentary feed keeps a minute gutter and incident colours drawn from the shared danger/warning/success status tokens, so incident types read within one palette. Possession, incidents, and fixture panels stay unbuilt until the engine exposes their data — no visual guesses at schema; no prototype component code is salvaged, and the QWERTY feed's emoji stay confined to commentary.

The slice's edge promise: match day is a career tab inside the career chrome, so the shell and its temporal cluster are already owned; this ticket renders the match content region against the shared tokens. Callers observe no new engine data, no image asset, and no salvage — only the scoreboard token family is match-specific.

**Decisions:**

- **Match day renders inside the career chrome on the shared token system; the only match-only element is the scoreboard surface; the stadium is a CSS-only wash (image deferred under the overlay); a neutral chrome-band scoreboard; the chrome's cluster shows the match readout during a live match and returns to the season readout + Continue at full time; the feed keeps a minute gutter and incident colors from the shared status tokens; possession/incidents/fixture panels are deferred on engine data; no prototype component code salvaged.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-31-match-day-visual-language.md).

**Blocked by:** 08 — Token foundation, alias-first repaint, and the slate guard (match day consumes the shared token system); 09 — Career chrome, season readout, and Continue (the temporal cluster this ticket toggles between match readout and season readout + Continue is built there).

**Status:** ready-for-agent

- [ ] Match day renders inside the career chrome on the shared token system — no breakout shell, no sidebar, no chrome change; the only match-only elements are the scoreboard surface tokens.
- [ ] The stadium is a CSS-only wash from existing tokens (gradient wash under the panel-dark overlay) with no image dependency; the image seam (inject *under* the overlay) is documented for when an asset exists.
- [ ] The scoreboard is the neutral chrome-band, white-score-box pattern rendering from club name and score alone.
- [ ] During a live match the chrome's temporal cluster shows the match readout and career Continue is unavailable; at full time it returns to the season readout + Continue.
- [ ] The commentary feed has a minute gutter and incident colours from the shared danger/warning/success status tokens.
- [ ] Possession, incidents, and fixture panels remain unbuilt; no prototype component code is salvaged.
- [ ] `pnpm check:all` is green at this commit.