import { describe, expect, it, vi } from "vitest";
import {
  ClubId as ClubIdSchema,
  SaveId as SaveIdSchema,
  type ClubId,
  type SaveId,
} from "@cm-clone/contracts";
import { bindRouter, navigate } from "../../../src/renderer/navigation/adapter.js";
import {
  CAREER_G_BINDINGS,
  CAREER_SCREEN_TYPES,
  resolveDestination,
} from "../../../src/renderer/navigation/destinations.js";
import { NAV_SECTIONS } from "../../../src/renderer/navigation/nav-config.js";
import { decodeClubId } from "../../../src/renderer/navigation/params.js";

const save = (id: string): SaveId => SaveIdSchema.make(id);
const club = (id: string): ClubId => ClubIdSchema.make(id);

describe("ticket 03 — the club-scoped club staff route", () => {
  it("resolves to the staff path carrying both the save and the target club", () => {
    expect(
      resolveDestination({
        type: "clubStaff",
        saveId: save("save-1"),
        clubId: club("club-7"),
      }),
    ).toEqual({
      to: "/career/$saveId/club/$clubId/staff",
      params: { saveId: save("save-1"), clubId: club("club-7") },
    });
  });

  it("keeps the two clubs apart — one destination per target, never a shared one", () => {
    const saveId = save("save-1");
    const first = resolveDestination({ type: "clubStaff", saveId, clubId: club("a") });
    const second = resolveDestination({ type: "clubStaff", saveId, clubId: club("b") });
    expect(first).not.toEqual(second);
  });

  it("passes both parameters through the adapter to the router", () => {
    const navigateSpy = vi.fn();
    bindRouter({
      navigate: navigateSpy,
      history: { back: () => undefined, forward: () => undefined, canGoBack: () => false },
    } as never);

    navigate({ type: "clubStaff", saveId: save("s1"), clubId: club("c1") });

    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/career/$saveId/club/$clubId/staff",
      params: { saveId: save("s1"), clubId: club("c1") },
    });
  });
});

describe("ticket 03 — club staff is a drill-down, not a career screen", () => {
  it("has no `g` binding", () => {
    const bound = Object.values(CAREER_G_BINDINGS).map((build) => build(save("x")).type);
    expect(bound).not.toContain("clubStaff");
  });

  it("is not one of the persistent career screens", () => {
    expect(CAREER_SCREEN_TYPES as readonly string[]).not.toContain("clubStaff");
  });

  it("appears nowhere in the navbar's sections or items", () => {
    const offered = new Set<string>();
    for (const section of NAV_SECTIONS) {
      offered.add(section.defaultDestination);
      for (const item of section.items) offered.add(item.destination);
    }
    expect(offered.has("clubStaff")).toBe(false);
  });
});

describe("ticket 03 — clubId decoding stops at structure", () => {
  it("decodes a well-formed club id", () => {
    const decoded = decodeClubId("club-7");
    expect(decoded).toEqual({ _tag: "Success", success: club("club-7") });
  });

  it("rejects only the empty parameter", () => {
    expect(decodeClubId("")._tag).toBe("Malformed");
  });

  // The load-bearing intent: a club id that is perfectly well-formed but names no club in the
  // save must NOT be a route error. It has to reach the screen so the RPC's club-not-found
  // failure is what the manager sees — the route never validates the club id itself (ticket 03).
  it("accepts a well-formed id that names no club, leaving existence to the RPC", () => {
    expect(decodeClubId("no-such-club")).toEqual({
      _tag: "Success",
      success: club("no-such-club"),
    });
  });
});