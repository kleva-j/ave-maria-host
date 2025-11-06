import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/entities/index.ts",
    "src/value-objects/index.ts",
    "src/repositories/index.ts",
    "src/services/index.ts"
  ],
  format: ["esm"],
  dts: true,
  clean: true,
});
