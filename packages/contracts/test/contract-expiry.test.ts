import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { AppRpcs, ContractExpiryPlayerView, ContractExpiryScreenView } from "../src/index.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toStrictEqual(wire);
};

describe("ContractExpiryPlayerView", () => {
  it("roundtrips a populated player", () => {
    roundTrip(ContractExpiryPlayerView, {
      playerId: "player_eng_42",
      firstName: "John",
      lastName: "Smith",
      wage: 52000,
      yearsRemaining: 0,
    });
  });

  it("roundtrips a player with minimal values", () => {
    roundTrip(ContractExpiryPlayerView, {
      playerId: "p1",
      firstName: "A",
      lastName: "B",
      wage: 5000,
      yearsRemaining: 0,
    });
  });
});

describe("ContractExpiryScreenView", () => {
  it("roundtrips with players", () => {
    roundTrip(ContractExpiryScreenView, {
      players: [
        {
          playerId: "player_eng_42",
          firstName: "John",
          lastName: "Smith",
          wage: 52000,
          yearsRemaining: 0,
        },
        {
          playerId: "player_eng_99",
          firstName: "Jane",
          lastName: "Doe",
          wage: 44000,
          yearsRemaining: 0,
        },
      ],
      squadSize: 17,
    });
  });

  it("roundtrips with an empty list", () => {
    roundTrip(ContractExpiryScreenView, { players: [], squadSize: 16 });
  });

  it("rejects a negative or fractional squad size", () => {
    const decode = Schema.decodeUnknownSync(ContractExpiryScreenView);
    expect(() => decode({ players: [], squadSize: -1 })).toThrow();
    expect(() => decode({ players: [], squadSize: 1.5 })).toThrow();
  });
});

describe("getContractExpiryScreen RPC", () => {
  it("roundtrips the payload", () => {
    roundTrip(AppRpcs.getContractExpiryScreen.payload, { saveId: "s1" });
  });

  it("roundtrips the success view", () => {
    roundTrip(AppRpcs.getContractExpiryScreen.success, {
      players: [
        {
          playerId: "player_eng_42",
          firstName: "John",
          lastName: "Smith",
          wage: 52000,
          yearsRemaining: 0,
        },
      ],
      squadSize: 16,
    });
  });

  it("roundtrips the error", () => {
    roundTrip(AppRpcs.getContractExpiryScreen.error, {
      _tag: "SaveNotFoundError",
      id: "s1",
    });
  });
});