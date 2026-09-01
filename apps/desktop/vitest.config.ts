import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
    reporter: process.env.VERBOSE ? "verbose" : "dot",
  },
});
