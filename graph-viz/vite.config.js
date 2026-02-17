import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.js"),
      name: "GraphViz",
      fileName: "graph-viz",
      formats: ["iife"],
    },
    outDir: "../docs/assets/graph",
    emptyOutDir: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        // IIFE 단일 파일로 번들
        inlineDynamicImports: true,
      },
    },
  },
});
