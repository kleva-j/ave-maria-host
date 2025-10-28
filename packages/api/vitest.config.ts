import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    exclude: ["node_modules", "dist"],
    testTimeout: 10000, // 10 seconds for integration tests
    hookTimeout: 10000, // 10 seconds for setup/teardown
  },
  resolve: {
    alias: {
      "@host/api": "./src",
      "@host/db": "../db/src",
      "@host/auth": "../auth/src",
    },
  },
});
