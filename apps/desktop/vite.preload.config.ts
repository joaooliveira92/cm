import path from "node:path";
import { builtinModules } from "node:module";
import { defineConfig } from "vite";

export default defineConfig({
  ssr: {
    // Inline our own workspace TS source (Node can't `require` a raw .ts
    // main entry), but leave real npm deps like `effect` external so they
    // load through Node's normal CJS module wrapper at runtime instead of
    // being flattened into this script's top-level scope.
    noExternal: ["@cm-clone/contracts"],
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/preload"),
    emptyOutDir: true,
    ssr: true,
    lib: {
      entry: path.resolve(import.meta.dirname, "src/preload/index.ts"),
      formats: ["cjs"],
      fileName: () => "index.cjs",
    },
    rollupOptions: {
      external: ["electron", ...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
    },
    minify: false,
  },
});
