// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SQUAD_COLUMN_PREFERENCES,
  loadSquadColumnPreferences,
  reconcileColumnPreferences,
  resetSquadColumnPreferences,
  saveSquadColumnPreferences,
  SQUAD_PREFERENCES_STORAGE_KEY,
} from "../../../src/renderer/table/columnPreferences.js";
import {
  isSquadPresetId,
  SQUAD_ALL_COLUMN_IDS,
  SQUAD_IDENTITY_COLUMN_ID,
  SQUAD_PRESETS,
  SQUAD_PROTECTED_COLUMN_IDS,
  SQUAD_STATUS_COLUMN_ID,
  toggleColumn,
} from "../../../src/renderer/table/features/visibility.js";

const memoryStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: (index) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
};

afterEach(() => {
  window.localStorage.clear();
});

describe("AC-27 — Squad column-preference reconciliation (runs on every load/restart)", () => {
  it("unknown/removed column ids are silently dropped", () => {
    const reconciled = reconcileColumnPreferences(
      { visibleColumnIds: ["name", "passing", "tackling", "ghostColumn", 42] },
      SQUAD_ALL_COLUMN_IDS,
    );
    expect(reconciled.visibleColumnIds).not.toContain("ghostColumn");
    expect(reconciled.visibleColumnIds).not.toContain(42);
    expect(reconciled.visibleColumnIds).toContain("name");
    expect(reconciled.visibleColumnIds).toContain("passing");
  });

  it("Name and Status are always visible and pinned, even when a stored blob hides them", () => {
    const reconciled = reconcileColumnPreferences(
      { visibleColumnIds: ["age", "overall"], pinnedColumnIds: [] },
      SQUAD_ALL_COLUMN_IDS,
    );
    expect(reconciled.visibleColumnIds[0]).toBe(SQUAD_IDENTITY_COLUMN_ID);
    expect(reconciled.visibleColumnIds).toContain(SQUAD_STATUS_COLUMN_ID);
    expect(reconciled.visibleColumnIds).toContain("age");
    // Order is load-bearing: the pinned sticky offsets are summed left to right.
    expect(reconciled.pinnedColumnIds).toEqual([...SQUAD_PROTECTED_COLUMN_IDS]);
  });

  it("a pinned column that is not visible is re-added to the visible set", () => {
    const reconciled = reconcileColumnPreferences(
      { visibleColumnIds: ["name"], pinnedColumnIds: ["name", "pace"] },
      SQUAD_ALL_COLUMN_IDS,
    );
    expect(reconciled.visibleColumnIds).toContain("pace");
    expect(reconciled.pinnedColumnIds).toEqual([...SQUAD_PROTECTED_COLUMN_IDS, "pace"]);
  });

  it("nothing surviving the drop falls back to the full column universe", () => {
    const reconciled = reconcileColumnPreferences(
      { visibleColumnIds: ["totally", "gone"], pinnedColumnIds: [] },
      SQUAD_ALL_COLUMN_IDS,
    );
    expect(reconciled.visibleColumnIds).toEqual([...SQUAD_ALL_COLUMN_IDS]);
  });

  it("a malformed blob (not an object / garbage JSON) tolerates to default at startup", () => {
    expect(reconcileColumnPreferences("junk", SQUAD_ALL_COLUMN_IDS).visibleColumnIds).toEqual([
      ...SQUAD_ALL_COLUMN_IDS,
    ]);
  });

  it("a known preset id survives; an unknown one is cleared back to null (a hand-toggled view is no longer a preset)", () => {
    expect(
      reconcileColumnPreferences(
        { visibleColumnIds: [], pinnedColumnIds: [], activePresetId: "physical" },
        SQUAD_ALL_COLUMN_IDS,
      ).activePresetId,
    ).toBe("physical");
    expect(
      reconcileColumnPreferences(
        { visibleColumnIds: [], pinnedColumnIds: [], activePresetId: "oldPreset" },
        SQUAD_ALL_COLUMN_IDS,
      ).activePresetId,
    ).toBeNull();
  });

  it("stored non-array fields are read defensively", () => {
    const reconciled = reconcileColumnPreferences({ visibleColumnIds: "nope" }, SQUAD_ALL_COLUMN_IDS);
    expect(reconciled.visibleColumnIds).toEqual([...SQUAD_ALL_COLUMN_IDS]);
  });
});

describe("AC-27 — preferences persist to local storage, loaded through the reconcile on every restore", () => {
  const storage = memoryStorage();

  it("save then load round-trips through the reconciled shape", () => {
    saveSquadColumnPreferences(
      { visibleColumnIds: ["name", "age"], pinnedColumnIds: ["name"], activePresetId: "overview" },
      storage,
    );
    expect(loadSquadColumnPreferences(storage).visibleColumnIds).toEqual([
      "name",
      "status",
      "age",
    ]);
  });

  it("a corrupt blob falls back to defaults without throwing", () => {
    storage.setItem(SQUAD_PREFERENCES_STORAGE_KEY, "{not json");
    expect(loadSquadColumnPreferences(storage)).toEqual(DEFAULT_SQUAD_COLUMN_PREFERENCES);
  });

  it("reset removes the stored blob and restores defaults", () => {
    saveSquadColumnPreferences(
      { visibleColumnIds: [], pinnedColumnIds: [], activePresetId: null },
      storage,
    );
    expect(resetSquadColumnPreferences(storage)).toEqual(DEFAULT_SQUAD_COLUMN_PREFERENCES);
    expect(loadSquadColumnPreferences(storage)).toEqual(DEFAULT_SQUAD_COLUMN_PREFERENCES);
  });
});

describe("AC-27 — column visibility is Squad-only vocabulary", () => {
  it("the identity column is in every shipped preset (a preset can never hide Name)", () => {
    for (const preset of SQUAD_PRESETS) {
      expect(preset.visibleColumnIds).toContain(SQUAD_IDENTITY_COLUMN_ID);
    }
  });

  it("isSquadPresetId admits exactly the shipped presets", () => {
    for (const preset of SQUAD_PRESETS) expect(isSquadPresetId(preset.id)).toBe(true);
    expect(isSquadPresetId("custom")).toBe(false);
  });

  it("toggleColumn flips a column on/off; the identity column is protected by the checkbox being disabled", () => {
    expect(toggleColumn(["name", "age"], "age")).toEqual(["name"]);
    expect(toggleColumn(["name"], "pace")).toEqual(["name", "pace"]);
  });
});