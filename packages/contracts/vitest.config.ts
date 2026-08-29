import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    passWithNoTests: true,
    reporter: process.env.VERBOSE ? "verbose" : "dot",
  },
});