/**
 * Defuse a jsdom/nwsapi selector-engine recursion that hangs any test opening a
 * Base UI popup.
 *
 * nwsapi resolves the host-state pseudo-classes (`:fullscreen`, `:modal`,
 * `:open`, `:closed`) by probing for a *native* selector engine via
 * `matchesNative`. Under jsdom there is no native engine: the probe falls
 * through to `Element.prototype.matches`, which is nwsapi itself, so
 * `isFullscreen` -> `matches(':fullscreen')` -> `isFullscreen` recurses. nwsapi
 * catches the resulting RangeError and returns false rather than failing, so the
 * recursion re-runs exponentially instead of aborting -- one `:modal` query
 * costs ~200k `:fullscreen` matches. Base UI evaluates `:modal` when a popup
 * opens, which turned a two-assertion Select test into a 45-second stall.
 *
 * Fixed in neither nwsapi 2.2.26 nor 2.2.27, so the guard lives here. It only
 * short-circuits *re-entrant* probes for those four pseudo-classes, which are
 * exactly the internal ones nwsapi cannot answer under jsdom; a direct
 * `element.matches(':open')` from test code still resolves normally.
 */
const HOST_STATE_PSEUDO_CLASSES = new Set([":fullscreen", ":modal", ":open", ":closed"])

// This file is a setup file for every suite in the package, including the
// node-environment ones that have no DOM at all, so it has to no-op there.
const hasDom = typeof Element !== "undefined"

const originalMatches = hasDom ? Element.prototype.matches : undefined

let depth = 0

// `matches` is declared with type-predicate overloads, so the guard is assigned
// through the base signature rather than reimplementing them.
if (originalMatches !== undefined) {
  Element.prototype.matches = function matches(this: Element, selectors: string): boolean {
    if (depth > 0 && HOST_STATE_PSEUDO_CLASSES.has(selectors)) return false
    depth += 1
    try {
      return originalMatches.call(this, selectors)
    } finally {
      depth -= 1
    }
  } as typeof Element.prototype.matches
}
