import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/database/index.ts",
    "src/payment/index.ts",
    "src/notifications/index.ts",
    "src/external-apis/index.ts"
  ],
  format: ["esm"],
  dts: true,
  clean: true,
});
