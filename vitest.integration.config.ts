import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Integration tests: exercise the real data layer against DynamoDB Local
// (`docker compose up -d`). Run with `npm run test:integration`. They manage
// their own isolated table, so they never touch dev-seeded data.
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "@": new URL(".", import.meta.url).pathname
    }
  },
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.integration.test.ts"],
    setupFiles: ["./tests/integration-setup.ts"],
    // Talking to a real DB: give hooks room and keep files serial so tests that
    // share the isolated table can't race each other.
    hookTimeout: 30000,
    testTimeout: 30000,
    fileParallelism: false
  }
});
