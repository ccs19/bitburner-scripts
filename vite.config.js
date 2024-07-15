/* eslint-env node */
import { defineConfig } from "viteburner";
import { resolve } from "path";
export default defineConfig({
  /** basic vite configs */
  resolve: {
    alias: {
      /** path to your source code */
      "@": resolve(__dirname, "src"),
      "/src": resolve(__dirname, "src"),
    },
  },
  build: { minify: false },
  /** viteburner configs */
  viteburner: {
    watch: [{ pattern: "src/**/*.{js,script,txt,json}" }],
  },
});
