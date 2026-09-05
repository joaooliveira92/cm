import { Schema } from "effect";
import { STATURE_TIERS } from "@cm-clone/shared";

import { ClubId } from "./ids.js";

export const StatureTierSchema = Schema.Literals(STATURE_TIERS);

/**
 * A foreground/background pair. Crosses the wire as a pair because contrast is a property of the
 * pair, never of either colour alone — see `clubColours.ts` in `@cm-clone/shared`.
 *
 * The values are CSS colours, unvalidated beyond being strings. Validating hex here would reject
 * the `rgb()`/`oklch()` forms a future pack may legitimately author, and the renderer's failure
 * mode for a malformed colour is an unpainted surface, not a crash.
 */
export class ColourPairView extends Schema.Class<ColourPairView>("ColourPairView")({
  foreground: Schema.String,
  background: Schema.String,
}) {}

/** A club's colours, already resolved through the save's content pack (or its id-derived fallback).
 *  `primary` and `secondary` are always present; the last two ranks are usually null. */
export class ClubColoursView extends Schema.Class<ClubColoursView>("ClubColoursView")({
  primary: ColourPairView,
  secondary: ColourPairView,
  tertiary: Schema.NullOr(ColourPairView),
  quaternary: Schema.NullOr(ColourPairView),
}) {}

export class ClubSummary extends Schema.Class<ClubSummary>("ClubSummary")({
  id: ClubId,
  name: Schema.String,
  statureTier: StatureTierSchema,
}) {}

export class ClubNotFoundError extends Schema.TaggedError<ClubNotFoundError>()("ClubNotFoundError", {
  id: ClubId,
}) {}
