import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// Default (`npm test`): pure unit tests only. Integration tests
// (`*.integration.test.ts`) need a live DynamoDB Local and run via
// `npm run test:integration` (vitest.integration.config.ts) so this suite stays
// fast and offline.
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": new URL(".", import.meta.url).pathname
    }
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    exclude: [...configDefaults.exclude, "**/*.integration.test.ts"]
  }
});
