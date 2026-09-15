import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.{ts,tsx}"],
    setupFiles: ["./test/setup/nwsapi-recursion-guard.ts"],
    passWithNoTests: true,
    reporters: [process.env.VERBOSE ? "verbose" : "dot"],
  },
});
