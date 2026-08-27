import path from "node:path";
import { builtinModules } from "node:module";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/main"),
    emptyOutDir: true,
    ssr: true,
    lib: {
      entry: path.resolve(import.meta.dirname, "src/main/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: ["electron", "node:sqlite", ...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
    },
    minify: false,
  },
});
