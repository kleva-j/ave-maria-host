import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/use-cases/index.ts",
    "src/ports/index.ts",
    "src/services/index.ts"
  ],
  format: ["esm"],
  dts: true,
  clean: true,
});
