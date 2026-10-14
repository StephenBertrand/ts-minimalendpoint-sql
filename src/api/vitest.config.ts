import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    hookTimeout: 180_000,
    testTimeout: 60_000,
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
  },
});
