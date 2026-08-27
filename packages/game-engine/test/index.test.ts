import { it } from "@effect/vitest";
import { strictEqual } from "node:assert";
import { Effect } from "effect";
import { ping } from "../src/index.js";

it.effect("ping resolves to pong", () =>
  Effect.gen(function* () {
    const result = yield* ping;
    strictEqual(result, "pong");
  }),
);
