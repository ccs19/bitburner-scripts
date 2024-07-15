/* eslint-env node */
import { defineConfig } from "viteburner";
import { resolve } from "path";
export default defineConfig({
  /** basic vite configs */
  resolve: {
    alias: {
      /** path to your source code */
      "@": resolve(__dirname, "scripts"),
      "/scripts": resolve(__dirname, "scripts"),
    },
  },
  build: { minify: false },
  /** viteburner configs */
  viteburner: {
    watch: [{ pattern: "scripts/**/*.{js,script,txt,json}" }],
  },
});
