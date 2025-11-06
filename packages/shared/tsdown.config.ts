import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/schemas/index.ts",
    "src/errors/index.ts",
    "src/types/index.ts"
  ],
  format: ["esm"],
  dts: true,
  clean: true,
});
