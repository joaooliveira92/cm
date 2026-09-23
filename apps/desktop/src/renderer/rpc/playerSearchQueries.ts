/**
 * getPlayerSearch — `["save", saveId]`, `["squad", saveId]`.
 *
 * Player Search (Screen 119, ticket 11): every Player in the save that matches the committed
 * query, figures read by the human club's Scouting Progress. Two nested families keyed by
 * string — save, then the serialized query — for the same `MutableHashMap` reference-comparison
 * reason the report reads are.
 *
 * Reactive on the squad key beside the save key: a completed transfer moves a Player between
 * clubs, which changes the club a result names and the exact figures the manager may read, and an
 * advance (the save key) is what moves every scout's progress.
 *
 * Split out of `queries.ts` along the file-length seam: the query-key serializer is 90 lines of
 * its own, and the module stays under the 600-line ceiling.
 */
import type { PlayerSearchQuery, SaveId } from "@cm-clone/contracts";
import { Atom } from "effect/unstable/reactivity";
import { call } from "./call.js";
import { managementReadPolicy } from "./policy.js";
import { saveKey, squadKey } from "./queries.js";

/**
 * A Player Search query, serialized to the string key a search atom is keyed on. Field order is
 * fixed and empty/absent filters are omitted, so two form states that search for the same things
 * always name the same atom — `MutableHashMap` hashing works on strings, and the committed search
 * is frozen into the key, so the results never re-read just because the form was typed on.
 */
const playerSearchQueryKey = (query: PlayerSearchQuery): string => {
  const parts: string[] = [];
  const push = (name: string, value: string | number | undefined): void => {
    if (value === undefined || value === "") return;
    parts.push(`${name}=${encodeURIComponent(String(value))}`);
  };
  push("name", query.name);
  push("minAge", query.minAge);
  push("maxAge", query.maxAge);
  push("position", query.position);
  push("nationality", query.nationality);
  push("clubName", query.clubName);
  return parts.join("&");
};

/** The inverse of `playerSearchQueryKey` — the atom's key is what the RPC payload is built from.
 *  Pairs are decoded into a fresh query object; a field that was never serialized stays unset. */
const parsePlayerSearchQuery = (key: string): PlayerSearchQuery => {
  let name: string | undefined;
  let minAge: number | undefined;
  let maxAge: number | undefined;
  let position: PlayerSearchQuery["position"];
  let nationality: string | undefined;
  let clubName: string | undefined;
  for (const pair of key.split("&")) {
    if (pair === "") continue;
    const eq = pair.indexOf("=");
    const field = eq === -1 ? pair : pair.slice(0, eq);
    const value = decodeURIComponent(eq === -1 ? "" : pair.slice(eq + 1));
    switch (field) {
      case "name":
        name = value;
        break;
      case "minAge":
        minAge = Number(value);
        break;
      case "maxAge":
        maxAge = Number(value);
        break;
      case "position":
        position = value as NonNullable<PlayerSearchQuery["position"]>;
        break;
      case "nationality":
        nationality = value;
        break;
      case "clubName":
        clubName = value;
        break;
    }
  }
  return {
    ...(name !== undefined ? { name } : {}),
    ...(minAge !== undefined ? { minAge } : {}),
    ...(maxAge !== undefined ? { maxAge } : {}),
    ...(position !== undefined ? { position } : {}),
    ...(nationality !== undefined ? { nationality } : {}),
    ...(clubName !== undefined ? { clubName } : {}),
  };
};

const searchesForSave = Atom.family((saveId: SaveId) =>
  Atom.family((queryKey: string) =>
    managementReadPolicy(
      Atom.make(call("getPlayerSearch", { saveId, query: parsePlayerSearchQuery(queryKey) })).pipe(
        Atom.withReactivity([saveKey(saveId), squadKey(saveId)]),
      ),
    ),
  ),
);

export const playerSearchAtom = (saveId: SaveId, query: PlayerSearchQuery) =>
  searchesForSave(saveId)(playerSearchQueryKey(query));